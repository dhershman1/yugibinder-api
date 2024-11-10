import knex from 'knex'

const dbMiddleware = (options) => {
  const db = knex(options)

  return (req, _, next) => {
    req.db = db
    next()
  }
}

export default dbMiddleware
