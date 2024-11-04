import express from 'express'
import cors from 'cors'
import session from 'express-session'
import logger from 'pino-http'

import cardsRouter from './routes/cards.js'

const app = express()

const PORT = process.env.PORT || 3001
const SECRET = process.env.APP_SECRET || 'supercoolsecret'

app.use(cors())
app.use(express.urlencoded())
app.use(express.json())
app.use(logger())
app.use(
  session({
    secret: SECRET,
    resave: false,
    saveUninitialized: true
  })
)

app.use('/cards', cardsRouter)

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
