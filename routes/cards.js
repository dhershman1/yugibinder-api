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
  }
}
const CACHE_EXPIRATION = 10 * 60 * 1000 // 10 minutes

router.get('/top', async (_, res) => {
  // Check if the repsonse is already cahced and not expired
  if (Date.now() - cache.top.timestamp < CACHE_EXPIRATION) {
    return res.json(cache.top.data)
  }

  try {
    const response = await axios.get(
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?num=20&offset=0&sort=random&cachebust'
    )

    cache.top = {
      data: response.data.data,
      timestamp: Date.now()
    }

    res.json(response.data.data)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching data from external API' })
  }
})

router.get('/:id', async (req, res) => {
  const { id } = req.params

  // Check if the response is already cached and not expired
  if (cache[id] && Date.now() - cache[id].timestamp < CACHE_EXPIRATION) {
    return res.json(cache[id].data)
  }
  try {
    const response = await axios.get(`https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${id}`)

    // Store the response in cache with a timestamp
    cache[id] = {
      data: response.data.data[0],
      timestamp: Date.now()
    }

    res.json(response.data.data[0])
  } catch (error) {
    res.status(500).json({ error: 'Error fetching data from external API' })
  }
})

router.get('/random', async (req, res) => {
  const response = await axios.get('https://db.ygoprodeck.com/api/v7/randomcard.php')

  res.json(response.data.data[0])
})

export default router
