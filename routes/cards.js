import express from 'express'
import axios from 'axios'

const router = express.Router()

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

router.get('/', async (req, res) => {
  const query = req.query
  const queryString = Object.keys(query)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
    .join('&')

  if (Date.now() - cache.query.timestamp < CACHE_EXPIRATION) {
    return res.json(cache.query.data)
  }

  try {
    const response = await axios.get(`https://db.ygoprodeck.com/api/v7/cardinfo.php?${queryString}`)

    cache.query = {
      data: response.data.data,
      timestamp: Date.now()
    }

    res.json(response.data.data)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching data from external API' })
  }
})

router.get('/top', async (req, res) => {
  try {
    const records = await req.db('cards').select().orderBy('views', 'desc').limit(20)

    res.json(records)
  } catch (error) {
    req.log.error(error, 'Error fetching top 20 cards')
    res.status(500).json({ error: 'Something went wrong fetching top 20 cards' })
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

    // Store the response in cache with a timestamp
    cache[id] = {
      data: card,
      timestamp: Date.now()
    }

    res.json(card)
  } catch (error) {
    req.log.error(error, 'Error fetching card, or updating views')
    res.status(500).json({ error: 'Something went wrong fetching this card' })
  }
})

router.get('/random', async (req, res) => {
  try {
    const randomCard = await req.db('cards').orderByRaw('RANDOM()').limit(1).first()

    res.json(randomCard)
  } catch (error) {
    req.log.error(error, 'Error fetching random card')
    res.status(500).json({ error: 'Something went wrong fetching a random card' })
  }
})

export default router
