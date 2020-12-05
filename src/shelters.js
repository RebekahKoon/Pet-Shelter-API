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
router.post('/', jwt_info.checkJwt, jwt_info.invalid_jwt, async function (req, res) {
  const response_data = await api.validation_check(req, 'post', SHELTER)

  if (!response_data.valid) {
    res.status(response_data.code).json({ Error: response_data.message })
  } else {
    const data = {
      name: req.body.name,
      address: req.body.address,
      capacity: req.body.capacity,
      owner: req.user.sub,
      pets: [],
    }

    const entity = await api.post_entity(SHELTER, data)

    const shelter = await api.get_entity_by_id(SHELTER, entity.id)
    shelter[0].id = entity.id
    shelter[0].self = req.protocol + '://' + req.get('host') + req.originalUrl + '/' + entity.id

    res.status(201).json(shelter[0])
  }
})

/**
 *
 */
router.get('/:shelter_id', jwt_info.checkJwt, jwt_info.invalid_jwt, async function (req, res) {
  const shelter = await api.get_entity_by_id(SHELTER, req.params.shelter_id)
  const accepts = req.accepts(['application/json'])

  if (shelter[0] === undefined) {
    res.status(403).json({ Error: 'No shelter with this shelter_id exists' })
  } else if (!accepts) {
    res.status(406).json({ Error: 'application/json is the only supported content type' })
  } else if (shelter[0].owner !== req.user.sub) {
    res.status(403).json({ Error: 'This shelter belongs to someone else' })
  } else {
    shelter[0].id = req.params.shelter_id
    shelter[0].self = req.protocol + '://' + req.get('host') + req.originalUrl

    shelter[0].pets.map((pet) => {
      pet.self = req.protocol + '://' + req.get('host') + '/pets/' + pet.id
    })

    res.status(200).json(shelter[0])
  }
})

/**
 *
 */
router.get('/', jwt_info.checkJwt, jwt_info.invalid_jwt, async function (req, res) {
  const accepts = req.accepts(['application/json'])
  if (!accepts) {
    res.status(406).json({ Error: 'application/json is the only supported content type' })
  } else {
    var shelters = await api.get_entities_pagination(SHELTER, req)

    shelters.items.map((shelter) => {
      shelter.self = req.protocol + '://' + req.get('host') + '/shelters/' + shelter.id

      shelter.pets.map((pet) => {
        pet.self = req.protocol + '://' + req.get('host') + '/pets/' + pet.id
      })
    })

    if (shelters.next) {
      decodeURIComponent(shelters.next)
    }

    res.status(200).json(shelters)
  }
})

/**
 * Delete route is not supported on the root shelters URL. An error message will
 * be displayed if an attempt to delete is made.
 */
router.delete('/', function (req, res) {
  res.set('Accept', 'GET, POST')
  res.status(405).json({ Error: 'You cannot use DELETE on the root URL' })
})

/**
 * Put route is not supported on the root shelters URL. An error message will
 * be displayed if an attempt to put is made.
 */
router.put('/', function (req, res) {
  res.set('Accept', 'GET, POST')
  res.status(405).json({ Error: 'You cannot use PUT on the root URL' })
})

/**
 * Patch route is not supported on the root shelters URL. An error message will
 * be displayed if an attempt to put is made.
 */
router.patch('/', function (req, res) {
  res.set('Accept', 'GET, POST')
  res.status(405).json({ Error: 'You cannot use PATCH on the root URL' })
})

/**
 *
 */
router.delete('/:shelter_id', jwt_info.checkJwt, jwt_info.invalid_jwt, async function (req, res) {
  const shelter = await api.get_entity_by_id(SHELTER, req.params.shelter_id)

  if (shelter[0] === undefined) {
    res.status(403).json({ Error: 'No shelter with this shelter_id exists' })
  } else if (shelter[0].owner !== req.user.sub) {
    res.status(403).json({ Error: 'This shelter belongs to someone else' })
  } else {
    if (shelter[0].pets.length !== 0) {
      shelter[0].pets.map(async (entity) => {
        const pet = await api.get_entity_by_id(PET, entity.id)

        pet[0].shelter = {}
        const edited_pet = await api.edit_entity(PET, entity.id, pet[0])
      })
    }

    const deleted_shelter = await api.delete_entity(SHELTER, req.params.shelter_id)
    res.status(204).end()
  }
})

/**
 *
 */
router.patch('/:shelter_id', jwt_info.checkJwt, jwt_info.invalid_jwt, async function (req, res) {
  const shelter = await api.get_entity_by_id(SHELTER, req.params.shelter_id)

  if (shelter[0] === undefined) {
    res.status(403).json({ Error: 'No shelter with this shelter_id exists' })
  } else {
    const response_data = await api.validation_check(req, 'patch', SHELTER)

    if (!response_data.valid) {
      res.status(response_data.code).json({ Error: response_data.message })
    } else if (shelter[0].owner !== req.user.sub) {
      res.status(403).json({ Error: 'This shelter belongs to someone else' })
    } else {
      var edited_shelter_data = {
        name: req.body.name ? req.body.name : shelter[0].name,
        address: req.body.address ? req.body.address : shelter[0].address,
        capacity: req.body.capacity ? req.body.capacity : shelter[0].capacity,
        owner: shelter[0].owner,
        pets: shelter[0].pets,
      }

      const edit_data = await api.edit_entity(SHELTER, req.params.shelter_id, edited_shelter_data)
      const edited_shelter = await api.get_entity_by_id(SHELTER, req.params.shelter_id)

      const shelter_url = req.protocol + '://' + req.get('host') + req.originalUrl
      edited_shelter[0].id = req.params.shelter_id
      edited_shelter[0].self = shelter_url

      res.status(303).set('Location', shelter_url).json(edited_shelter[0])
    }
  }
})

/**
 *
 */
router.put(
  '/:shelter_id/pets/:pet_id',
  jwt_info.checkJwt,
  jwt_info.invalid_jwt,
  async function (req, res) {
    const shelter = await api.get_entity_by_id(SHELTER, req.params.shelter_id)
    const pet = await api.get_entity_by_id(PET, req.params.pet_id)

    if (shelter[0] === undefined) {
      res.status(403).json({ Error: 'No shelter with this shelter_id exists' })
    } else if (pet[0] === undefined) {
      res.status(404).json({ Error: 'No pet with this pet_id exists' })
    } else if (shelter[0].owner !== req.user.sub) {
      res.status(403).json({ Error: 'This shelter belongs to someone else' })
    } else if (Object.keys(pet[0].shelter).length !== 0) {
      res.status(403).json({ Error: 'This pet is already in a shelter' })
    } else {
      shelter[0].pets.push({
        id: req.params.pet_id,
        name: pet[0].name,
      })

      pet[0].shelter = {
        id: req.params.shelter_id,
        name: shelter[0].name,
      }

      pet[0].adopted = false

      const edited_shelter = await api.edit_entity(SHELTER, req.params.shelter_id, shelter[0])
      const edited_pet = await api.edit_entity(PET, req.params.pet_id, pet[0])

      res.status(204).end()
    }
  }
)

/**
 *
 */
router.delete(
  '/:shelter_id/pets/:pet_id',
  jwt_info.checkJwt,
  jwt_info.invalid_jwt,
  async function (req, res) {
    const shelter = await api.get_entity_by_id(SHELTER, req.params.shelter_id)
    const pet = await api.get_entity_by_id(PET, req.params.pet_id)

    if (shelter[0] === undefined) {
      res.status(403).json({ Error: 'No shelter with this shelter_id exists' })
    } else if (pet[0] === undefined) {
      res.status(404).json({ Error: 'No pet with this pet_id exists' })
    } else if (shelter[0].owner !== req.user.sub) {
      res.status(403).json({ Error: 'This shelter belongs to someone else' })
    } else if (pet[0].shelter.id !== req.params.shelter_id) {
      res.status(403).json({ Error: 'The pet is not in this shelter' })
    } else {
      shelter[0].pets = shelter[0].pets.filter((pet) => pet.id !== req.params.pet_id)

      pet[0].shelter = {}
      pet[0].adopted = true

      const edited_shelter = await api.edit_entity(SHELTER, req.params.shelter_id, shelter[0])
      const edited_pet = await api.edit_entity(PET, req.params.pet_id, pet[0])

      res.status(204).end()
    }
  }
)

module.exports = router
