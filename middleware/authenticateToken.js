import { auth } from 'express-oauth2-jwt-bearer'

const authenticateToken = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_URL,
  tokenSigningAlg: 'RS256'
})

export default authenticateToken
