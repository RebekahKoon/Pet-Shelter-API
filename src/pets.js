const express = require('express')
const bodyParser = require('body-parser')

const api = require('./api')
const jwt_info = require('../jwt')

const router = express.Router()
router.use(bodyParser.json())

const SHELTER = 'Shelter'
const PET = 'Pet'

/**
 *
 */
router.post('/', async function (req, res) {
  const response_data = await api.validation_check(req, 'post', PET)

  if (!response_data.valid) {
    res.status(response_data.code).json({ Error: response_data.message })
  } else {
    const data = {
      name: req.body.name,
      species: req.body.species,
      age: req.body.age,
      adopted: false,
      shelter: {},
    }

    const entity = await api.post_entity(PET, data)

    const pet = await api.get_entity_by_id(PET, entity.id)
    pet[0].id = entity.id
    pet[0].self = req.protocol + '://' + req.get('host') + req.originalUrl + '/' + entity.id

    res.status(201).json(pet[0])
  }
})

module.exports = router
