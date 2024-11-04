import express from 'express'
import axios from 'axios'

const router = express.Router()

router.get('/top', async (_, res) => {
  const response = await axios.get(
    'https://db.ygoprodeck.com/api/v7/cardinfo.php?num=20&offset=0&sort=random&cachebust'
  )

  res.json(response.data.data)
})

router.get('/random', async (req, res) => {
  const response = await axios.get('https://db.ygoprodeck.com/api/v7/randomcard.php')

  res.json(response.data.data[0])
})

export default router
