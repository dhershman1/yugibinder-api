import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import authenticateToken from '../middleware/authenticateToken.js'

const saltRounds = 10
const TOKEN_EXPIRATION_THRESHOLD = 10 * 60 // 10 minutes in seconds
const router = express.Router()

// Routes for user interactions like registering and logging in/out
router.post('/register', async (req, res) => {
  /**
   * Validates the username and password in the request body and inserts a new user into the database.
   * Redirects the user to the home page after successful registration.
   * @param {Object} req - The request object.
   * @param {Object} req.db - The database connection.
   * @param {Object} req.body - The body of the request.
   * @param {string} req.body.username - The username to validate and insert into the database.
   * @param {string} req.body.password - The password to validate and insert into the database.
   * @param {Object} res - The response object.
   * @returns {Promise<void>} A promise that resolves when the user is successfully registered.
   */
  const usernameRegex = /^[a-zA-Z0-9_-]+$/
  const passwordRegex = process.env.NODE_ENV === 'production'
    ? /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/
    : /^.{8,}$/ // for testing purposes
  const { username, password } = req.body

  if (!usernameRegex.test(username)) {
    return res.status(400).json({
      error: 'Invalid username. Only alphanumeric characters, underscores, and hyphens are allowed.'
    })
  }

  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      error: 'Invalid password. Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one digit, and one special character.'
    })
  }

  try {
    const [userId] = await req.db('users').insert({
      username,
      password: await bcrypt.hash(password, saltRounds),
      role: 'user'
    }).returning('id')

    req.session.username = username
    req.session.isAuthenticated = true

    // Generate a JWT token
    const token = jwt.sign(
      { id: userId, username, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Token expires in 1 hour
    )

    res.json({ token })
  } catch (err) {
    req.log.error(err, 'Error registering user')
    return res.status(500).json({ error: 'Something went wrong registering the user' })
  }
})

router.post('/refresh', (req, res) => {
  /**
   * Refreshes the JWT token by generating a new token with the same payload.
   * @param {Object} req - The request object.
   * @param {Object} req.user - The user object from the JWT payload.
   * @param {Object} res - The response object.
   * @returns {void}
   */

  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access denied' })
  }

  const decodedToken = jwt.decode(token)

  if (!decodedToken) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  const { id, username, role, exp } = decodedToken
  const currentTime = Math.floor(Date.now() / 1000)

  // Check if the token is about to expire within the threshold
  if (exp - currentTime < TOKEN_EXPIRATION_THRESHOLD) {
    // Generate a new token
    const newToken = jwt.sign(
      { id, username, role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Token expires in 1 hour
    )

    return res.json({ token: newToken })
  }

  res.json({ token: req.cookies.token })
})

router.post('/login', async (req, res) => {
  /**
   * Retrieves a user from the database based on the provided username in the request body.
   *
   * @param {Object} req - The request object.
   * @param {Object} req.db - The database connection.
   * @param {Object} req.body - The body of the request.
   * @param {string} req.body.username - The username to search for in the database.
   * @returns {Promise<Object|null>} A promise that resolves to the found user object or null if no user is found.
   */
  try {
    const foundUser = await req.db('users').select().where('username', req.body.username).first()

    if (foundUser && await bcrypt.compare(req.body.password, foundUser.password)) {
      const token = jwt.sign(
        { id: foundUser.id, user: foundUser.username, role: foundUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' } // Token expires in 1 hour
      )

      req.session.username = foundUser.username
      req.session.isAuthenticated = true
      res.json({ token })
    } else {
      res.status(401).json({ error: 'Invalid username or password' })
    }
  } catch (err) {
    req.log.error(err, 'Error logging in')
    res.status(500).json({ error: 'Something went wrong logging in' })
  }
})

router.post('/logout', authenticateToken, (req, res) => {
  /**
   * Destroys the session and redirects the user to the home page.
   */
  req.session.destroy()
  res.clearCookie('token')

  res.redirect('/')
})

export default router
