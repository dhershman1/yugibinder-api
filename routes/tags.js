import express from 'express'
import authenticateToken from '../middleware/authenticateToken.js'

const router = express.Router()

router.get('/', authenticateToken, async (req, res) => {
  const tags = await req.db('tags')

  res.json(tags)
})

export default router
