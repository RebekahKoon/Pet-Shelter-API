const express = require('express')
const bodyParser = require('body-parser')

const api = require('./api')
const validation = require('./validation')
const jwt_info = require('../jwt')

const router = express.Router()
router.use(bodyParser.json())

const SHELTER = 'Shelter'
const PET = 'Pet'

/**
 * Route to create a shelter. The creation of a shelter is a protected endpoint.
 * If all data is valid, then the shelter will be created.
 */
router.post('/', jwt_info.checkJwt, jwt_info.invalid_jwt, async function (req, res) {
  const response_data = await validation.validation_check(req, 'post', SHELTER)

  if (!response_data.valid) {
    // Data not valid
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

    // Getting shelter information
    const shelter = await api.get_entity_by_id(SHELTER, entity.id)
    shelter[0].id = entity.id
    shelter[0].self = req.protocol + '://' + req.get('host') + req.originalUrl + '/' + entity.id

    res.status(201).json(shelter[0])
  }
})

/**
 * Route to get a shelter through the shelter's ID sent through the request parameter.
 * This is a protected endpoint. If the jwt entered matches the shelter's owner, then
 * the shelter's information will be displayed.
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

    // Finding url for each pet in the shelter
    shelter[0].pets.map((pet) => {
      pet.self = req.protocol + '://' + req.get('host') + '/pets/' + pet.id
    })

    res.status(200).json(shelter[0])
  }
})

/**
 * Route to get all shelters that belong to a user. This is a protected endpoint.
 */
router.get('/', jwt_info.checkJwt, jwt_info.invalid_jwt, async function (req, res) {
  const accepts = req.accepts(['application/json'])
  if (!accepts) {
    res.status(406).json({ Error: 'application/json is the only supported content type' })
  } else {
    var shelters = await api.get_entities_pagination(SHELTER, req)
    // Getting all shelters to count the total number of shelters in Datastore
    var total_shelters = await api.get_entities(SHELTER)

    // Finding URL of each shelter belonging the the user
    shelters.items.map((shelter) => {
      shelter.self = req.protocol + '://' + req.get('host') + '/shelters/' + shelter.id

      // Finding URL of each pet in the shelter
      shelter.pets.map((pet) => {
        pet.self = req.protocol + '://' + req.get('host') + '/pets/' + pet.id
      })
    })

    total_shelters = total_shelters.filter((shelter) => shelter.owner === req.user.sub)

    // Total shelters in Datastore
    shelters['Total shelters'] = total_shelters.length

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
 * Route to delete a shelter. This is a protected endpoint. The shelter will be
 * deleted if the shelter exists and belongs to the user making the request.
 */
router.delete('/:shelter_id', jwt_info.checkJwt, jwt_info.invalid_jwt, async function (req, res) {
  const shelter = await api.get_entity_by_id(SHELTER, req.params.shelter_id)

  if (shelter[0] === undefined) {
    res.status(403).json({ Error: 'No shelter with this shelter_id exists' })
  } else if (shelter[0].owner !== req.user.sub) {
    res.status(403).json({ Error: 'This shelter belongs to someone else' })
  } else {
    // Any pets will be removed from the shelter when shelter is deleted
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
 * Route to edit one or more of a shelter's attributes. This is a protected endpoint.
 * The shelter will be edited if the shelter exists, valid data was entered, and the
 *  shelter belongs to the user making the request.
 */
router.patch('/:shelter_id', jwt_info.checkJwt, jwt_info.invalid_jwt, async function (req, res) {
  const shelter = await api.get_entity_by_id(SHELTER, req.params.shelter_id)

  if (shelter[0] === undefined) {
    res.status(403).json({ Error: 'No shelter with this shelter_id exists' })
  } else {
    const response_data = await validation.validation_check(req, 'patch', SHELTER)

    if (!response_data.valid) {
      // Data not valid
      res.status(response_data.code).json({ Error: response_data.message })
    } else if (shelter[0].owner !== req.user.sub) {
      res.status(403).json({ Error: 'This shelter belongs to someone else' })
    } else {
      // Editing shelter data
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

      // Finding url for each pet in the shelter
      edited_shelter[0].pets.map((pet) => {
        pet.self = req.protocol + '://' + req.get('host') + '/pets/' + pet.id
      })

      res.status(303).set('Location', shelter_url).json(edited_shelter[0])
    }
  }
})

/**
 * Route to edit all of a shelter's attributes. This is a protected endpoint. The shelter
 * will be edited if the shelter exists, valid data was entered, and the shelter belongs
 * to the user making the request.
 */
router.put('/:shelter_id', jwt_info.checkJwt, jwt_info.invalid_jwt, async function (req, res) {
  const shelter = await api.get_entity_by_id(SHELTER, req.params.shelter_id)

  if (shelter[0] === undefined) {
    res.status(403).json({ Error: 'No shelter with this shelter_id exists' })
  } else {
    const response_data = await validation.validation_check(req, 'put', SHELTER)

    if (!response_data.valid) {
      // Data not valid
      res.status(response_data.code).json({ Error: response_data.message })
    } else if (shelter[0].owner !== req.user.sub) {
      res.status(403).json({ Error: 'This shelter belongs to someone else' })
    } else {
      // Editing shelter data
      var edited_shelter_data = {
        name: req.body.name,
        address: req.body.address,
        capacity: req.body.capacity,
        owner: shelter[0].owner,
        pets: shelter[0].pets,
      }

      const edit_data = await api.edit_entity(SHELTER, req.params.shelter_id, edited_shelter_data)
      const edited_shelter = await api.get_entity_by_id(SHELTER, req.params.shelter_id)

      const shelter_url = req.protocol + '://' + req.get('host') + req.originalUrl
      edited_shelter[0].id = req.params.shelter_id
      edited_shelter[0].self = shelter_url

      // Finding url for each pet in the shelter
      edited_shelter[0].pets.map((pet) => {
        pet.self = req.protocol + '://' + req.get('host') + '/pets/' + pet.id
      })

      res.status(303).set('Location', shelter_url).json(edited_shelter[0])
    }
  }
})

/**
 * Route to put a pet within a shelter. This is a protected endpoint. The pet
 * will be put in the shelter if both the pet and shelter exist, the shelter
 * belongs to the user making the request, and the pet is not in a shelter.
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
      // Adding pet to shelter
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
 * Pet to remove a pet from a shelter. This is a protected endpoint. The pet will
 * be removed if both the pet and shelter exist, the shelter belongs to the user
 * making the request, and the pet is in the shelter.
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
      // Removing pet from shelter
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
