const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const url = require('url')

const jwtInfo = require('../jwt')

const router = express.Router()
router.use(bodyParser.json())

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
  request(data, (error, response, body) => {
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
router.get('/token', function (req, res) {
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

  request(data, (error, response, body) => {
    const token = body.id_token ? body.id_token : 'Incorrect user information. Please try again.'
    const accepts = req.accepts(['application/json', 'text/html'])

    if (accepts === 'application/json') {
      res.status(200).json({ Token: token })
    } else if (accepts === 'text/html') {
      res.render('../templates/user.html', {
        token: token,
      })
    } else {
      res.status(406).send({ Error: 'application/json is the only supported content type' })
    }
  })
})

module.exports = router
