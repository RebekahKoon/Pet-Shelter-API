const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const url = require('url')

const api = require('./api')
const jwtInfo = require('../jwt')

const router = express.Router()
router.use(bodyParser.json())

const USER = 'User'

/**
 * Route for a user to create an account for auth0. If the
 * user already has an account, then a new account will
 * not be created. Regardless of whether or not the new
 * account is created, the user will be redirected to the
 * page which displays the user's token.
 */
router.post('/', async function (req, res, next) {
  req.session.username = req.body.username
  req.session.password = req.body.password
  const domain = jwtInfo.DOMAIN

  // Information to create new account
  const data = {
    method: 'POST',
    url: `https://${domain}/dbconnections/signup`,
    headers: { 'content-type': 'application/json' },
    body: {
      email: req.session.username,
      password: req.session.password,
      username: req.session.username,
      connection: jwtInfo.CONNECTION,
      client_id: jwtInfo.CLIENT_ID,
    },
    json: true,
  }

  // Sending data to create account
  request(data, async (error, response, body) => {
    if (body.name !== 'BadRequestError') {
      req.session.auth0_id = 'auth0|' + body._id

      const user_data = {
        email: body.email,
        auth0_id: req.session.auth0_id,
      }

      const entity = await api.post_entity(USER, user_data)
    }

    // Redirect to display token
    res.redirect(
      url.format({
        pathname: '/account/token',
      })
    )
  })
})

/**
 * Route to display the token of the user with a matching
 * username and password. If the user information entered
 * was incorrect, then an error message is displayed. The
 * page that displays user information is then rendered.
 */
router.get('/token', async function (req, res) {
  const username = req.body.username ? req.body.username : req.session.username
  const password = req.body.password ? req.body.password : req.session.password

  const domain = jwtInfo.DOMAIN

  // Information to login to account
  var data = {
    method: 'POST',
    url: `https://${domain}/oauth/token`,
    headers: { 'content-type': 'application/json' },
    body: {
      grant_type: 'password',
      username: username,
      password: password,
      client_id: jwtInfo.CLIENT_ID,
      client_secret: jwtInfo.CLIENT_SECRET,
    },
    json: true,
  }

  request(data, async (error, response, body) => {
    const token = body.id_token ? body.id_token : 'Incorrect user information. Please try again.'
    const accepts = req.accepts(['application/json', 'text/html'])

    if (accepts === 'application/json') {
      const users = await api.get_entities(USER)
      const user = users.find((user) => user.email === username)

      res.status(200).json({ Token: token, 'Auth0 ID': user.auth0_id })
    } else if (accepts === 'text/html') {
      const auth0_id = req.session.auth0_id

      res.render('../templates/user.html', {
        token: token,
        auth0_id: auth0_id,
      })
    } else {
      res.status(406).send({ Error: 'application/json is the only supported content type' })
    }
  })
})

module.exports = router
