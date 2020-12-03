const jwt = require('express-jwt')
const jwksRsa = require('jwks-rsa')

const CLIENT_ID = 'WCGaB4tfa0tw1vGnoed4niNr3UN07hn7'
const CLIENT_SECRET = 'XZ5BfCoPxpFrv6fTlZGu4FZC96965qUBt4SM64VFgjNH7G0D3PsxvUpAYlUDD4Lb'
const DOMAIN = 'cs-493-hw7.us.auth0.com'
const CONNECTION = 'Username-Password-Authentication'

jwt_secret = jwksRsa.expressJwtSecret({
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
  jwksUri: `https://${DOMAIN}/.well-known/jwks.json`,
})

// Check validity of jwt
const checkJwt = jwt({
  secret: jwt_secret,
  // Validate the audience and the issuer.
  issuer: `https://${DOMAIN}/`,
  algorithms: ['RS256'],
})

/**
 * Function that sends a status of 401 if the user did not
 * enter a valid jwt.
 * @param {Error message} err
 * @param {Request} req
 * @param {Response} res
 * @param {Next} next
 */
function invalid_jwt(err, req, res, next) {
  if (err.name === 'UnauthorizedError') {
    res.status(401).send({ Error: 'JWT is missing or invalid' })
    return
  }
  next()
}

module.exports = {
  checkJwt,
  CLIENT_ID,
  CLIENT_SECRET,
  DOMAIN,
  invalid_jwt,
  CONNECTION,
}
