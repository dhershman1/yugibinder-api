import express from 'express'
import cors from 'cors'
import session from 'express-session'
import pino from 'pino-http'
import cookieParser from 'cookie-parser'
import csurf from '@dr.pogodin/csurf'
import 'dotenv/config'

// Routes
import cardsRouter from './routes/cards.js'
import bindersRouter from './routes/binders.js'
import userRouter from './routes/users.js'
import tagsRouter from './routes/tags.js'
// Middleware
import db from './middleware/db.js'
import errorHandler from './middleware/errorHandler.js'

const app = express()

const PORT = process.env.PORT || 3001
const SECRET = process.env.APP_SECRET || 'supercoolsecret'

app.use(pino())
app.use(cookieParser())
app.use(cors())
app.use(errorHandler)
app.use(express.urlencoded())
app.use(express.json())
app.use(
  session({
    secret: SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
  })
)
app.use(csurf({ cookie: true }))
// Middleware to set the CSRF token as a cookie
app.use((req, res, next) => {
  res.cookie('XSRF-TOKEN', req.csrfToken(), { httpOnly: false, secure: process.env.NODE_ENV === 'production' })
  next()
})

if (process.env.DATABASE_URL || process.env.NODE_ENV === 'production') {
  app.use(
    db({
      client: 'pg',
      connection: process.env.DATABASE_URL,
      searchPath: ['public']
    })
  )
} else {
  app.use(
    db({
      client: 'pg',
      searchPath: ['public'],
      connection: {
        port: process.env.DB_PORT,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS
      }
    })
  )
}

app.use('/cards', cardsRouter)
app.use('/binders', bindersRouter)
app.use('/tags', tagsRouter)
app.use(userRouter)

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
