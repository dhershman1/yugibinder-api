import express from 'express'

const router = express()

async function getBinderThumbnail (binder, db) {
  const thumbnail = await db('binder_images').where('id', binder.thumbnail).first()

  binder.thumbnail = `https://imgs.yugibinder.com/binders/${thumbnail.image_s3_key}`

  return binder
}

router.get('/', async (req, res) => {
  const { limit, offset, order, sort = 'asc', attribute, tags, ...filters } = req.query

  try {
    let query = req.db('binders')
      .leftJoin('binder_tags', 'binders.id', 'binder_tags.binder_id')
      .leftJoin('tags', 'binder_tags.tag_id', 'tags.id')
      .select('binders.*', req.db.raw('ARRAY_AGG(tags.title) as tags'))
      .groupBy('binders.id')

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

router.get('/random', async (req, res) => {
  const randomBinder = await req.db('binders')
    .leftJoin('binder_tags', 'binders.id', 'binder_tags.binder_id')
    .leftJoin('tags', 'binder_tags.tag_id', 'tags.id')
    .select('binders.*', req.db.raw('ARRAY_AGG(tags.title) as tags'))
    .groupBy('binders.id')
    .orderByRaw('RANDOM()')
    .limit(1)
    .first()
  const response = await getBinderThumbnail(randomBinder, req.db)

  res.json(response)
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

router.delete('/:id', async (req, res) => {
  const { id } = req.params

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