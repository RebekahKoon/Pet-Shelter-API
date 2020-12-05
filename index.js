/**
 * Sources used:
 * https://www.npmjs.com/package/jwt-decode
 * http://classes.engr.oregonstate.edu/eecs/perpetual/cs493-400/modules/7-more-security/3-node-authorization/
 * https://auth0.com/docs/quickstart/backend/nodejs#validate-access-tokens
 * https://www.npmjs.com/package/express-jwt
 * https://github.com/gothinkster/node-express-realworld-example-app/blob/master/routes/auth.js
 * https://auth0.com/docs/api/authentication
 * https://stackoverflow.com/questions/4529586/render-basic-html-view
 * https://stackoverflow.com/questions/45017717/getting-http-post-form-data-in-node-js
 * https://www.tutorialspoint.com/expressjs/expressjs_sessions.htm
 * https://github.com/auth0/express-jwt
 */

const router = (module.exports = require('express').Router())

router.use('/', require('./src/welcome'))
router.use('/account', require('./src/account'))
router.use('/shelters', require('./src/shelters'))
router.use('/pets', require('./src/pets'))
