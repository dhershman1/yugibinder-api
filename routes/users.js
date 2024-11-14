import express from 'express'

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

export default router
