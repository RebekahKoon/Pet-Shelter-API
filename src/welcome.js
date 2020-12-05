const express = require('express')
const bodyParser = require('body-parser')

const router = express.Router()
router.use(bodyParser.json())

/**
 * Route to render the index page of the website.
 */
router.get('/', function (req, res) {
  res.render('../templates/index.html')
})

module.exports = router
