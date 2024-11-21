import express from 'express'
import authenticateToken from '../middleware/authenticateToken.js'
import schemaValidation from '../middleware/schemaValidation.js'
import * as binderSchemas from './schemas/binders.js'

const router = express()

async function getBinderThumbnail (binder, db) {
  const thumbnail = await db('binder_images').where('id', binder.thumbnail).first()

  if (!thumbnail) {
    return binder
  }

  binder.thumbnail = {
    id: thumbnail.id,
    url: `https://imgs.yugibinder.com/binders/${thumbnail.s3_key}`
  }

  return binder
}

router.get('/', async (req, res) => {
  const { limit, offset, order, sort = 'asc', attribute, tags, ...filters } = req.query

  try {
    let query = req.db('binders')
      .leftJoin('binder_tags', 'binders.id', 'binder_tags.binder_id')
      .leftJoin('tags', 'binder_tags.tag_id', 'tags.id')
      .leftJoin('users', 'binders.created_by', 'users.auth0_id')
      .select('binders.*', req.db.raw('ARRAY_AGG(tags.title) as tags'), 'users.username')
      .groupBy('binders.id', 'users.username')

    // Apply filters
    Object.keys(filters).forEach((key) => {
      query = query.where(`binders.${key}`, filters[key])
    })

    // Apply tag filtering
    if (tags) {
      const tagsArray = tags.split(',')
      query = query.whereIn('tags.title', tagsArray)
    }

    // Apply ordering
    if (order) {
      query = query.orderBy(order, sort)
    }

    // Apply attribute filtering
    if (attribute) {
      query = query.where('binders.attribute', attribute)
    }

    // Apply limit and offset
    if (limit) {
      query = query.limit(parseInt(limit, 10))
    }
    if (offset) {
      query = query.offset(parseInt(offset, 10))
    }

    const binders = await query

    // Fetch all tags for each binder
    const results = await Promise.all(binders.map(async (binder) => {
      const allTags = await req.db('tags')
        .join('binder_tags', 'tags.id', 'binder_tags.tag_id')
        .where('binder_tags.binder_id', binder.id)
        .select('tags.title')
      binder.tags = allTags.map(tag => tag.title)
      return getBinderThumbnail(binder, req.db)
    }))

    res.json(results)
  } catch (error) {
    req.log.error(error, 'Error fetching binders with query parameters')
    res.status(500).json({ error: 'Something went wrong fetching binders' })
  }
})

/**
 * Fetch binders created by the authenticated user
 */
router.get('/mine', authenticateToken, async (req, res) => {
  const userId = req.auth.payload.sub

  try {
    const binders = await req.db('binders')
      .leftJoin('binder_tags', 'binders.id', 'binder_tags.binder_id')
      .leftJoin('tags', 'binder_tags.tag_id', 'tags.id')
      .leftJoin('users', 'binders.created_by', 'users.auth0_id')
      .select('binders.*', req.db.raw('ARRAY_AGG(tags.title) as tags'), 'users.username')
      .groupBy('binders.id', 'users.username')
      .where('users.auth0_id', userId)

    // Get binder thumbnails
    const results = await Promise.all(binders.map(async (binder) => {
      return getBinderThumbnail(binder, req.db)
    }))

    res.json(results)
  } catch (error) {
    req.log.error(error, 'Error fetching binders created by user')
    res.status(500).json({ error: 'Something went wrong fetching binders created by user' })
  }
})

router.get('/random', async (req, res) => {
  const randomBinder = await req.db('binders')
    .leftJoin('binder_tags', 'binders.id', 'binder_tags.binder_id')
    .leftJoin('tags', 'binder_tags.tag_id', 'tags.id')
    .leftJoin('users', 'binders.created_by', 'users.auth0_id')
    .select('binders.*', req.db.raw('ARRAY_AGG(tags.title) as tags'), 'users.username')
    .groupBy('binders.id', 'users.username')
    .orderByRaw('RANDOM()')
    .limit(1)
    .first()

  if (!randomBinder) {
    return res.status(404).json({ error: 'No binders found' })
  }

  // Update the views column
  await req.db('binders').where({ id: randomBinder.id }).increment('views', 1)

  const response = await getBinderThumbnail(randomBinder, req.db)

  res.json(response)
})

router.get('/:id', async (req, res) => {
  const { id } = req.params
  const { full } = req.query

  try {
    const tagsAgg = full === 'yes'
      ? req.db.raw('ARRAY_AGG(json_build_object(\'id\', tags.id, \'title\', tags.title)) as tags')
      : req.db.raw('ARRAY_AGG(tags.title) as tags')

    const binder = await req.db('binders')
      .leftJoin('binder_tags', 'binders.id', 'binder_tags.binder_id')
      .leftJoin('tags', 'binder_tags.tag_id', 'tags.id')
      .leftJoin('users', 'binders.created_by', 'users.auth0_id')
      .select('binders.*', tagsAgg, 'users.username')
      .groupBy('binders.id', 'users.username')
      .where('binders.id', id)
      .first()

    if (!binder) {
      return res.status(404).json({ error: 'Binder not found' })
    }

    // Update the views column
    await req.db('binders').where({ id }).increment('views', 1)

    const cardCount = await req.db('cards_in_binders')
      .where('binder_id', id)
      .count('id as count')
      .first()

    binder.cardCount = cardCount.count

    const response = await getBinderThumbnail(binder, req.db)

    res.json(response)
  } catch (error) {
    req.log.error(error, 'Error fetching binder')
    res.status(500).json({ error: 'Something went wrong fetching binder' })
  }
})

router.get('/:id/cards', async (req, res) => {
  const { id } = req.params
  const { limit, offset, order, sort = 'asc', attribute, ...filters } = req.query

  try {
    let query = req.db('cards_in_binders')
      .join('cards', 'cards_in_binders.card_id', 'cards.id')
      .where('binder_id', id)
      .select('cards.*', 'cards_in_binders.rarity', 'cards_in_binders.edition')

    // Apply filters
    Object.keys(filters).forEach((key) => {
      query = query.where(`cards.${key}`, filters[key])
    })

    // Apply attribute filtering
    if (attribute) {
      query = query.where('cards.attribute', attribute)
    }

    // Apply ordering
    if (order) {
      query = query.orderBy(order, sort)
    }

    // Apply limit and offset
    if (limit) {
      query = query.limit(parseInt(limit, 10))
    }
    if (offset) {
      query = query.offset(parseInt(offset, 10))
    }

    const cards = await query

    res.json(cards)
  } catch (error) {
    req.log.error(error, 'Error fetching cards in binder')
    res.status(500).json({ error: 'Something went wrong fetching cards in binder' })
  }
})

router.post('/create', authenticateToken, async (req, res) => {
  const { name, description, thumbnail, tags } = req.body

  try {
    const [binder] = await req.db('binders')
      .insert({ name, thumbnail, description, created_by: req.auth.payload.sub })
      .returning('*')

    if (tags) {
      await req.db('binder_tags').insert(tags.slice(0, 10).map((tag) => ({ binder_id: binder.id, tag_id: tag.id })))
    }

    res.json(binder)
  } catch (error) {
    req.log.error(error, 'Error creating binder')
    res.status(500).json({ error: 'Something went wrong creating binder' })
  }
})

router.post('/:binderId/card/:cardId', authenticateToken, async (req, res) => {
  const { rarity = 'common', edition = 'unlimited' } = req.body ?? {}
  const { binderId, cardId } = req.params

  try {
    // Make sure that the user adding this card is the owner of the binder
    const binder = await req.db('binders').where('id', binderId).first()

    if (binder.created_by !== req.auth.payload.sub) {
      return res.status(403).json({ error: 'You do not have permission to add cards to this binder' })
    }

    await req.db('cards_in_binders').insert({ binder_id: binderId, card_id: cardId, rarity, edition })

    res.json({ message: 'Card added to binder' })
  } catch (error) {
    req.log.error(error, 'Error adding card to binder')
    res.status(500).json({ error: 'Something went wrong adding card to binder' })
  }
})

router.post('/', async (req, res) => {
  const { name, description, thumbnail, tags } = req.body

  try {
    const [binder] = await req.db('binders')
      .insert({ name, thumbnail, description })
      .returning('*')

    if (tags) {
      const tagIds = await req.db('tags').whereIn('title', tags).select('id')

      await req.db('binder_tags').insert(tagIds.map((tag) => ({ binder_id: binder.id, tag_id: tag.id })))
    }

    res.json(binder)
  } catch (error) {
    req.log.error(error, 'Error creating binder')
    res.status(500).json({ error: 'Something went wrong creating binder' })
  }
})

/**
 * Update a binder
 * @param {string} id - The ID of the binder
 */
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params

  try {
  // Make sure that the user adding this card is the owner of the binder
    const binder = await req.db('binders').where('id', id).first()

    if (binder.created_by !== req.auth.payload.sub) {
      return res.status(403).json({ error: 'You do not have permission to add cards to this binder' })
    }
    const tags = req.body.tags.slice(0, 10)

    // Delete all tags for this binder
    await req.db('binder_tags').where('binder_id', id).del()

    // Insert new tags for this binder
    await req.db('binder_tags').insert(tags.map((tag) => ({ binder_id: binder.id, tag_id: tag.id })))

    // Update the binders fields
    await req.db('binders').where('id', id).update({
      name: req.body.name,
      description: req.body.description,
      thumbnail: req.body.thumbnail,
      updated_at: new Date().toISOString()
    })

    res.json({ message: 'Binder updated' })
  } catch (error) {
    req.log.error(error, 'Error updating binder')
    res.status(500).json({ error: 'Something went wrong updating binder' })
  }
})

/**
 * Update a card in a binder
 * @param {string} binderId - The ID of the binder
 * @param {string} cardId - The ID of the card
 */
router.put('/:binderId/card/:cardId', authenticateToken, async (req, res) => {})

/**
 * Delete a binder
 * @param {string} id - The ID of the binder
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params

  // Make sure that the user deleting this binder is the owner of the binder
  const binder = await req.db('binders').where('id', id).first()

  if (binder.created_by !== req.auth.payload.sub) {
    return res.status(403).json({ error: 'You do not have permission to delete this binder' })
  }

  try {
    await req.db.transaction(async (trx) => {
      // Delete related tags
      await trx('binder_tags').where('binder_id', id).del()

      // Delete related cards
      await trx('cards_in_binders').where('binder_id', id).del()

      // Delete the binder
      await trx('binders').where('id', id).del()
    })

    res.json({ message: 'Binder and all related references deleted' })
  } catch (error) {
    req.log.error(error, 'Error deleting binder')
    res.status(500).json({ error: 'Something went wrong deleting binder' })
  }
})

export default router
