const express = require('express')
const bodyParser = require('body-parser')

const api = require('./api')
const validation = require('./validation')

const router = express.Router()
router.use(bodyParser.json())

const SHELTER = 'Shelter'
const PET = 'Pet'

/**
 * Route to create a pet. This is an unprotected route. The pet will be
 * added to Datastore if the data is valid.
 */
router.post('/', async function (req, res) {
  const response_data = await validation.validation_check(req, 'post', PET)

  if (!response_data.valid) {
    // Data not valid
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
 * Route to get a pet using the pet's ID from the request parameter. This is an
 * unprotected endpoint. The pet's information will be returned if the pet exists.
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

    // Adding the URL of a pet's shelter
    if (Object.keys(pet[0].shelter).length !== 0) {
      pet[0].shelter.self =
        req.protocol + '://' + req.get('host') + '/shelters/' + pet[0].shelter.id
    }

    res.status(200).json(pet[0])
  }
})

/**
 * Route to get all pets within Datastore. This is an unprotected endpoint.
 */
router.get('/', async function (req, res) {
  const accepts = req.accepts(['application/json'])

  if (!accepts) {
    res.status(406).json({ Error: 'application/json is the only supported content type' })
  } else {
    const pets = await api.get_entities_pagination(PET, req)
    const total_pets = await api.get_entities(PET)

    // Adding URL for each pet
    pets.items.map((pet) => {
      pet.self = req.protocol + '://' + req.get('host') + '/pets/' + pet.id

      // Adding shelter URL of each pet in a shelter
      if (Object.keys(pet.shelter).length !== 0) {
        pet.shelter.self = req.protocol + '://' + req.get('host') + '/shelters/' + pet.shelter.id
      }
    })

    if (pets.next) {
      decodeURIComponent(pets.next)
    }

    pets['Total pets'] = total_pets.length

    res.status(200).json(pets)
  }
})

/**
 * Delete route is not supported on the root pets URL. An error message will
 * be displayed if an attempt to delete is made.
 */
router.delete('/', function (req, res) {
  res.set('Accept', 'GET, POST')
  res.status(405).json({ Error: 'You cannot use DELETE on the root URL' })
})

/**
 * Put route is not supported on the root pets URL. An error message will
 * be displayed if an attempt to put is made.
 */
router.put('/', function (req, res) {
  res.set('Accept', 'GET, POST')
  res.status(405).json({ Error: 'You cannot use PUT on the root URL' })
})

/**
 * Patch route is not supported on the root pets URL. An error message will
 * be displayed if an attempt to put is made.
 */
router.patch('/', function (req, res) {
  res.set('Accept', 'GET, POST')
  res.status(405).json({ Error: 'You cannot use PATCH on the root URL' })
})

/**
 * Route to delete a pet. This is an unprotected endpoint. If the pet belongs
 * to a shelter, then it will be removed from the shelter.
 */
router.delete('/:pet_id', async function (req, res) {
  const pet = await api.get_entity_by_id(PET, req.params.pet_id)

  if (pet[0] === undefined) {
    res.status(404).json({ Error: 'No pet with this pet_id exists' })
  } else {
    // Removing pet from shelter if in a shelter
    if (Object.keys(pet[0].shelter).length !== 0) {
      const shelter = await api.get_entity_by_id(SHELTER, pet[0].shelter.id)

      // Removing pet
      shelter[0].pets = shelter[0].pets.filter((pet) => pet.id !== req.params.pet_id)

      const edited_shelter = await api.edit_entity(SHELTER, pet[0].shelter.id, shelter[0])
    }

    const deleted_pet = await api.delete_entity(PET, req.params.pet_id)
    res.status(204).end()
  }
})

/**
 * Route to edit one or more of a pet's attributes. This is an unprotected endpoint.
 * The pet will be edited if all data is valid and the pet exists.
 */
router.patch('/:pet_id', async function (req, res) {
  const pet = await api.get_entity_by_id(PET, req.params.pet_id)

  if (pet[0] === undefined) {
    res.status(404).json({ Error: 'No pet with this pet_id exists' })
  } else {
    const response_data = await validation.validation_check(req, 'patch', PET)

    if (!response_data.valid) {
      // Data not valid
      res.status(response_data.code).json({ Error: response_data.message })
    } else {
      // Editing pet data
      const edited_pet_data = {
        name: req.body.name ? req.body.name : pet[0].name,
        species: req.body.species ? req.body.species : pet[0].species,
        age: req.body.age ? req.body.age : pet[0].age,
        shelter: pet[0].shelter,
        adopted: pet[0].adopted,
      }

      const edit_data = await api.edit_entity(PET, req.params.pet_id, edited_pet_data)
      const edited_pet = await api.get_entity_by_id(PET, req.params.pet_id)

      const pet_url = req.protocol + '://' + req.get('host') + req.originalUrl
      edited_pet[0].id = req.params.pet_id
      edited_pet[0].self = pet_url

      // Adding the URL of a pet's shelter
      if (Object.keys(edited_pet[0].shelter).length !== 0) {
        pet[0].shelter.self =
          req.protocol + '://' + req.get('host') + '/shelters/' + pet[0].shelter.id
      }

      res.status(303).set('Location', pet_url).json(edited_pet[0])
    }
  }
})

/**
 * Route to edit all of a pet's attributes. This is an unprotected endpoint.
 * The pet will be edited if all data is valid and the pet exists.
 */
router.put('/:pet_id', async function (req, res) {
  const pet = await api.get_entity_by_id(PET, req.params.pet_id)

  if (pet[0] === undefined) {
    res.status(404).json({ Error: 'No pet with this pet_id exists' })
  } else {
    const response_data = await validation.validation_check(req, 'put', PET)

    if (!response_data.valid) {
      // Data not valid
      res.status(response_data.code).json({ Error: response_data.message })
    } else {
      // Editing pet data
      const edited_pet_data = {
        name: req.body.name,
        species: req.body.species,
        age: req.body.age,
        shelter: pet[0].shelter,
        adopted: pet[0].adopted,
      }

      const edit_data = await api.edit_entity(PET, req.params.pet_id, edited_pet_data)
      const edited_pet = await api.get_entity_by_id(PET, req.params.pet_id)

      const pet_url = req.protocol + '://' + req.get('host') + req.originalUrl
      edited_pet[0].id = req.params.pet_id
      edited_pet[0].self = pet_url

      // Adding the URL of a pet's shelter
      if (Object.keys(edited_pet[0].shelter).length !== 0) {
        pet[0].shelter.self =
          req.protocol + '://' + req.get('host') + '/shelters/' + pet[0].shelter.id
      }

      res.status(303).set('Location', pet_url).json(edited_pet[0])
    }
  }
})

module.exports = router
