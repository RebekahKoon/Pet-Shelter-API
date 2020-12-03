const express = require('express')
const bodyParser = require('body-parser')
const api = require('./api')

const router = express.Router()
router.use(bodyParser.json())

const BOAT = 'Boat'
const LOAD = 'Load'

/**
 * Route to add a load to the datastore. If the body of the request is
 * missing any attributes, then an error message appears.
 */
router.post('/', async function (req, res) {
  if (!req.body.weight || !req.body.content || !req.body.delivery_date) {
    res
      .status(400)
      .send({ Error: 'The request object is missing at least one of the required attributes' })
  } else if (
    // Data type for one of the values is incorrect
    typeof req.body.weight !== 'number' ||
    typeof req.body.content !== 'string' ||
    typeof req.body.delivery_date !== 'string'
  ) {
    res.status(403).send({ Error: 'The data type for at least one of the values is incorrect' })
  } else {
    const data = {
      weight: req.body.weight,
      content: req.body.content,
      delivery_date: req.body.delivery_date,
      carrier: {},
    }

    const entity = await api.post_entity(LOAD, data)

    // Getting load data to display
    const load = await api.get_entity_by_id(LOAD, entity.id)
    load[0].id = entity.id
    load[0].self = req.protocol + '://' + req.get('host') + req.originalUrl + '/' + entity.id

    res.status(201).json(load[0])
  }
})

/**
 * Route to get all loads in the datastore. The loads are displayed
 * 3 loads per page. If there are any more loads within the datastore,
 * then a URL will be provided for the next page.
 */
router.get('/', async function (req, res) {
  const loads = await api.get_entities(LOAD, req)

  // Getting URL for each load
  loads.items.map((load) => {
    load.self = req.protocol + '://' + req.get('host') + '/loads/' + load.id

    // If load has a carrier, gets the URL for the carrier
    if (Object.keys(load.carrier).length !== 0) {
      load.carrier.self = req.protocol + '://' + req.get('host') + '/boats/' + load.carrier.id
    }
  })

  // Decode URL for next page
  if (loads.next) {
    decodeURIComponent(loads.next)
  }

  res.status(200).json(loads)
})

/**
 * Route to get a load using the load ID passed through the request parameter.
 * If not found, an error message is displayed.
 */
router.get('/:load_id', async function (req, res) {
  const load = await api.get_entity_by_id(LOAD, req.params.load_id)

  if (load[0] === undefined) {
    // Load not found
    res.status(404).send({ Error: 'No load with this load_id exists' })
  } else {
    load[0].id = req.params.load_id
    load[0].self = req.protocol + '://' + req.get('host') + req.originalUrl

    // If load has a carrier, gets the URL for the carrier
    if (Object.keys(load[0].carrier).length !== 0) {
      load[0].carrier.self = req.protocol + '://' + req.get('host') + '/boats/' + load[0].carrier.id
    }

    res.status(200).json(load[0])
  }
})

/**
 * Route to delete a load from the datastore. If not found with the load ID
 * passed through the parameter of the request, then an error message is
 * displayed. Otherwise, if a boat is carrying the load, then the load
 * is taken off of the boat and the load is deleted.
 */
router.delete('/:load_id', async function (req, res) {
  const load = await api.get_entity_by_id(LOAD, req.params.load_id)

  if (load[0] === undefined) {
    // Load not found
    res.status(404).send({ Error: 'No load with this load_id exists' })
  } else {
    // If the load is on a boat, takes the load off the boat
    if (Object.keys(load[0].carrier).length !== 0) {
      const boat = await api.get_entity_by_id(BOAT, load[0].carrier.id)

      // Remove load that will be deleted from boat's loads
      const boat_loads = boat[0].loads.filter((load) => {
        return load.id !== req.params.load_id
      })

      const boat_data = {
        name: boat[0].name,
        type: boat[0].type,
        length: boat[0].length,
        loads: boat_loads,
      }
      const edited_boat = await api.edit_entity(BOAT, load[0].carrier.id, boat_data)
    }

    const deleted_load = await api.delete_entity(LOAD, req.params.load_id)
    res.status(204).end()
  }
})

module.exports = router
