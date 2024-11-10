import 'dotenv/config'

export default {
  client: 'pg',
  connection: {
    host: 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  },
  migrations: {
    directory: './migrations'
  }
}
