const express = require('express')
const bodyParser = require('body-parser')
const api = require('./api')

const router = express.Router()
router.use(bodyParser.json())

const BOAT = 'Boat'
const LOAD = 'Load'

/**
 * Route in order to create a new boat and insert it into the datastore.
 * If the body of the request is missing either the boat's name, type,
 * or length, the boat will not be created. After successful creation,
 * the boat information will be displayed to the user.
 */
router.post('/', async function (req, res) {
  // Not all information passed through the body
  if (!req.body.name || !req.body.type || !req.body.length) {
    res
      .status(400)
      .send({ Error: 'The request object is missing at least one of the required attributes' })
  } else if (
    typeof req.body.name !== 'string' ||
    typeof req.body.type !== 'string' ||
    typeof req.body.length !== 'number'
  ) {
    // Data type for one of the values is incorrect
    res.status(403).send({ Error: 'The data type for at least one of the values is incorrect' })
  } else {
    const data = { name: req.body.name, type: req.body.type, length: req.body.length, loads: [] }

    // Creating the new entity
    const entity = await api.post_entity(BOAT, data)

    // Get boat information
    const boat = await api.get_entity_by_id(BOAT, entity.id)
    boat[0].id = entity.id
    boat[0].self = req.protocol + '://' + req.get('host') + req.originalUrl + '/' + entity.id

    res.status(201).json(boat[0])
  }
})

/**
 * Route to get all boat entries within the datastore. Each boat's
 * information will be displayed to the user.
 */
router.get('/', async function (req, res) {
  const boats = await api.get_entities(BOAT, req)

  // Adding URL to each boat
  boats.items.map((boat) => {
    boat.self = req.protocol + '://' + req.get('host') + req.baseUrl + '/' + boat.id

    // Adding URLs for the loads of each boat
    boat.loads.map((load) => {
      load.self = req.protocol + '://' + req.get('host') + '/loads/' + load.id
    })
  })

  // Decode URL for next page
  if (boats.next) {
    decodeURIComponent(boats.next)
  }

  res.status(200).json(boats)
})

/**
 * Route to get a boat entry by ID. The boat's ID will be passed in through a
 * request parameter. If the boat cannot be found, then an error will be displayed.
 */
router.get('/:boat_id', async function (req, res) {
  const boat = await api.get_entity_by_id(BOAT, req.params.boat_id)

  if (boat[0] === undefined) {
    // Boat cannot be found
    res.status(404).send({ Error: 'No boat with this boat_id exists' })
  } else {
    boat[0].id = req.params.boat_id
    boat[0].self = req.protocol + '://' + req.get('host') + req.originalUrl

    // Adding URLs for the boat's loads
    boat[0].loads.map((load) => {
      load.self = req.protocol + '://' + req.get('host') + '/loads/' + load.id
    })

    res.status(200).json(boat[0])
  }
})

/**
 * Route to get the loads held by a boat. The boat's ID will be passed in through
 * a request parameter. If the boat cannot be found, then an error will be displayed.
 */
router.get('/:boat_id/loads', async function (req, res) {
  const boat = await api.get_entity_by_id(BOAT, req.params.boat_id)

  if (boat[0] === undefined) {
    // Boat cannot be found
    res.status(404).send({ Error: 'No boat with this boat_id exists' })
  } else {
    // Adding URL for each load
    boat[0].loads.map((load) => {
      load.self = req.protocol + '://' + req.get('host') + '/loads/' + load.id
    })

    res.status(200).json(boat[0].loads)
  }
})

/**
 * Route to delete a boat from the datastore using the boat's ID, which will be
 * passed in through a request parameter. If the boat could not be found, then
 * an error will be displayed. Any loads on the boat will be unloaded.
 */
router.delete('/:boat_id', async function (req, res) {
  const boat = await api.get_entity_by_id(BOAT, req.params.boat_id)

  if (boat[0] === undefined) {
    // Boat not found in datastore
    res.status(404).send({ Error: 'No boat with this boat_id exists' })
  } else {
    // Taking off any loads from the boat
    if (boat[0].loads.length !== 0) {
      for (let i = 0; i < boat[0].loads.length; i++) {
        const load = await api.get_entity_by_id(LOAD, boat[0].loads[i].id)

        const data = {
          weight: load[0].weight,
          content: load[0].content,
          delivery_date: load[0].delivery_date,
          carrier: {},
        }
        const edited_load = await api.edit_entity(LOAD, boat[0].loads[i].id, data)
      }
    }

    const deleted_boat = await api.delete_entity(BOAT, req.params.boat_id)
    res.status(204).end()
  }
})

/**
 * Route to assign a load to a boat. If the boat or load cannot be found
 * or the load is already assigned to a boat, then error messages will
 * be displayed. Otherwise, the boat and load data will be updated to
 * reflect the boat carrying the load.
 */
router.put('/:boat_id/loads/:load_id', async function (req, res) {
  const boat = await api.get_entity_by_id(BOAT, req.params.boat_id)
  const load = await api.get_entity_by_id(LOAD, req.params.load_id)

  if (boat[0] === undefined || load[0] === undefined) {
    // Could not find boat or load
    res.status(404).send({ Error: 'The boat and/or load does not exit' })
  } else if (Object.keys(load[0].carrier).length !== 0) {
    // Load assigned to a different boat
    res.status(403).send({ Error: 'The load is already assigned to a boat' })
  } else {
    // Adding load to the boat's list of loads
    const boat_loads = boat[0].loads
    boat_loads.push({
      id: req.params.load_id,
      content: load[0].content,
    })
    const boat_data = {
      name: boat[0].name,
      type: boat[0].type,
      length: boat[0].length,
      loads: boat_loads,
    }

    // Adding carrier to load
    const load_carrier = { id: req.params.boat_id, name: boat[0].name }
    const load_data = {
      weight: load[0].weight,
      content: load[0].content,
      delivery_date: load[0].delivery_date,
      carrier: load_carrier,
    }

    const edited_boat = await api.edit_entity(BOAT, req.params.boat_id, boat_data)
    const edited_carrier = await api.edit_entity(LOAD, req.params.load_id, load_data)

    res.status(204).end()
  }
})

/**
 * Route to unload a load from a boat. If the boat or load could not be found
 * or the load is on a different boat, then error messages will be displayed.
 * Otherwise, the data for the boat and load will be updated to reflect that
 * the load is not on the boat.
 */
router.delete('/:boat_id/loads/:load_id', async function (req, res) {
  const boat = await api.get_entity_by_id(BOAT, req.params.boat_id)
  const load = await api.get_entity_by_id(LOAD, req.params.load_id)

  if (boat[0] === undefined || load[0] === undefined) {
    // Boat or load could not be found
    res.status(404).send({ Error: 'The boat and/or load does not exit' })
  } else {
    // Determine if load is on the boat
    const load_in_boat = boat[0].loads.map((load) => {
      if (load.id === req.params.load_id) {
        return load
      }
    })

    if (load_in_boat.length === 0) {
      // Load not on boat
      res.status(403).send({ Error: 'The load is not on this boat' })
    } else {
      // Take load off of the boat
      const boat_loads = boat[0].loads.filter((load) => {
        return load.id !== req.params.load_id
      })

      // New boat data
      const boat_data = {
        name: boat[0].name,
        type: boat[0].type,
        length: boat[0].length,
        loads: boat_loads,
      }

      // New load data
      const load_data = {
        weight: load[0].weight,
        content: load[0].content,
        delivery_date: load[0].delivery_date,
        carrier: {},
      }

      const edited_boat = await api.edit_entity(BOAT, req.params.boat_id, boat_data)
      const edited_carrier = await api.edit_entity(LOAD, req.params.load_id, load_data)

      res.status(204).end()
    }
  }
})

module.exports = router
