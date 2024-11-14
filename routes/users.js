import express from 'express'
import authenticateToken from '../middleware/authenticateToken.js'

const router = express.Router()

// TODO: This will need the authenticateToken middleware
router.post('/registerUser', async (req, res) => {
  try {
    const { username, auth0Id } = req.body

    // Validate the incoming data
    if (!auth0Id || !username) {
      return res.status(400).json({ error: 'auth0Id and username are required' })
    }

    await req.db.transaction(async trx => {
      const existingUser = await trx('users').where({ auth0_id: auth0Id }).first()

      if (existingUser) {
        await trx('users').where({ auth0_id: auth0Id }).update({ username })
      } else {
        await trx('users').insert({ auth0_id: auth0Id, username })
      }
    })

    res.status(201).json({ message: 'User registered successfully' })
  } catch (error) {
    req.log.error(error, 'Error registering user')
    res.status(500).json({ error: 'Something went wrong registering the user' })
  }
})

router.get('/username', authenticateToken, async (req, res) => {
  if (req.session.user) {
    return res.json({ username: req.session.user })
  }

  try {
    const user = await req.db('users').where({ auth0_id: req.auth.payload.sub }).first()

    if (user) {
      req.session.user = user.username
      return res.json({ username: user.username })
    }

    res.status(404).json({ error: 'User not found' })
  } catch (error) {
    req.log.error(error, 'Error fetching user')
    res.status(500).json({ error: 'Something went wrong fetching the user' })
  }
})

export default router
