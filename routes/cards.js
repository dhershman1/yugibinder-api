import express from 'express'

const router = express.Router()

// Replace this cache with a more robust solution like Redis
const cache = {
  top: {
    data: null,
    timestamp: 0
  },
  random: {
    data: null,
    timestamp: 0
  },
  query: {
    data: null,
    timestamp: 0
  }
}
const CACHE_EXPIRATION = 10 * 60 * 1000 // 10 minutes
const URL = process.env.NODE_ENV === 'production' ? 'https://yugibinder.com' : 'http://localhost:3000'

function convertImgIDToURL (card) {
  card.card_images = card.card_images.map((id) => {
    return {
      id,
      normal: `https://imgs.yugibinder.com/cards/normal/${id}.jpg`,
      small: `https://imgs.yugibinder.com/cards/small/${id}.jpg`
    }
  })

  return card
}

router.get('/', async (req, res) => {
  const { limit = 10, offset = 0, order, sort = 'asc', attribute, ...filters } = req.query

  try {
    const totalRecords = await req.db('cards').count('* as count').first()
    const totalCount = totalRecords.count

    // Calculate the total number of pages
    const totalPages = Math.ceil(totalCount / limit)

    // Fetch the Paginated results
    let query = req.db('cards')

    // Apply filters
    Object.keys(filters).forEach((key) => {
      query = query.where(key, filters[key])
    })

    // Apply ordering
    if (order) {
      query = query.orderBy(order, sort)
    }

    // Apply attribute filtering
    if (attribute) {
      query = query.where('attribute', attribute)
    }

    // Apply limit and offset
    query = query.limit(parseInt(limit, 10)).offset(parseInt(offset, 10))
    const currentPage = Math.floor(offset / limit) + 1

    const results = (await query).map(convertImgIDToURL)

    res.json({
      results,
      pagination: {
        totalRecords: totalCount,
        totalPages,
        currentPage,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      }
    })
  } catch (error) {
    req.log.error(error, 'Error fetching cards with query parameters')
    res.status(500).json({ error: 'Something went wrong fetching cards' })
  }
})

router.get('/top', async (req, res) => {
  try {
    const records = await req.db('cards').select().whereNot({ type: 'Token' }).orderBy('views', 'desc').limit(20)

    res.json(records)
  } catch (error) {
    req.log.error(error, 'Error fetching top 20 cards')
    res.status(500).json({ error: 'Something went wrong fetching top 20 cards' })
  }
})

router.get('/random', async (req, res) => {
  const { limit = 1 } = req.query
  try {
    const randomCards = await req.db('cards').whereNot({ type: 'Token' }).orderByRaw('RANDOM()').limit(limit)

    // Update the views column
    await Promise.all(randomCards.map(async (randomCard) => {
      await req.db('cards').where({ id: randomCard.id }).increment('views', 1)
    }))

    // Convert the card image IDs to URLs
    randomCards.forEach((card) => {
      card.card_url = `${URL}/cards/${card.id}`

      card = convertImgIDToURL(card)
    })

    res.json(randomCards)
  } catch (error) {
    req.log.error(error, 'Error fetching random card')
    res.status(500).json({ error: 'Something went wrong fetching a random card' })
  }
})

router.get('/:id', async (req, res) => {
  const { id } = req.params

  // Check if the response is already cached and not expired
  if (cache[id] && Date.now() - cache[id].timestamp < CACHE_EXPIRATION) {
    return res.json(cache[id].data)
  }
  try {
    const card = await req.db('cards').where({ id }).first()

    // Update the views column
    await req.db('cards').where({ id }).increment('views', 1)

    const cardImgUpdated = convertImgIDToURL(card)
    // Store the response in cache with a timestamp
    cache[id] = {
      data: cardImgUpdated,
      timestamp: Date.now()
    }

    res.json(cardImgUpdated)
  } catch (error) {
    req.log.error(error, 'Error fetching card, or updating views')
    res.status(500).json({ error: 'Something went wrong fetching this card' })
  }
})

router.post('/move', async (req, res) => {
  const { cards } = req.body

  try {
    await Promise.all(cards.map(async (card) => {
      const { cardId, binderId, position } = card
      const dbCard = await req.db('cards_in_binders').where({ card_id: cardId, binder_id: binderId }).first()

      if (dbCard) {
        await req.db('cards_in_binders').where({ card_id: cardId, binder_id: binderId }).update({ position })
      } else {
        await req.db('cards_in_binders').insert({ card_id: cardId, binder_id: binderId, position })
      }
    }))

    res.json({ message: 'Card(s) moved successfully' })
  } catch (error) {
    req.log.error(error, 'Error moving card')
    res.status(500).json({ error: 'Something went wrong moving the card' })
  }
})

export default router
