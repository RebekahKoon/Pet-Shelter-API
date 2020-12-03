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

/**
 *
 */
router.get('/:pet_id', async function (req, res) {
  const pet = await api.get_entity_by_id(PET, req.params.pet_id)
  const accepts = req.accepts(['application/json'])

  if (pet[0] === undefined) {
    res.status(404).json({ Error: 'No pet with this pet_id exists' })
  } else if (!accepts) {
    res.status(406).json({ Error: 'application/json is the only supported content type' })
  } else {
    pet[0].id = req.params.pet_id
    pet[0].self = req.protocol + '://' + req.get('host') + req.originalUrl

    res.status(200).json(pet[0])
  }
})

module.exports = router
