const ds = require('../datastore')
const datastore = ds.datastore

const SHELTER = 'Shelter'
const PET = 'Pet'

/**
 * Adds a new entity to the datastore for the specified kind
 * of entity.
 * @param {kind of entity} kind
 * @param {data for the entry} data
 * @returns {key for the entry} key
 */
function post_entity(kind, data) {
  const key = datastore.key(kind)

  return datastore.save({ key: key, data: data }).then(() => {
    return key
  })
}

/**
 * Finds an entity in the datastore based on its kind and ID.
 * @param {kind of entity} kind
 * @param {entity ID} id
 * @returns {entity key} key
 */
function get_entity_by_id(kind, id) {
  const key = datastore.key([kind, parseInt(id, 10)])

  return datastore.get(key)
}

/**
 * Gets all entities of the specified kind in the datastore.
 * @param {kind of entities} kind
 * @returns {all entities of the specified kind} entities
 */
function get_entities(kind) {
  const query = datastore.createQuery(kind)

  return datastore.runQuery(query).then((entities) => {
    return entities[0].map(ds.fromDatastore)
  })
}

/**
 * Finds one page of 3 entities of the specified kind in the datastore.
 * If any more entities are in the datastore, then a URL is provided
 * for the next page.
 * @param {kind of entities} kind
 * @param {request} req
 * @returns {all entities of the specified kind} entities
 */
function get_entities_pagination(kind, req) {
  var query =
    kind === SHELTER
      ? datastore.createQuery(kind).filter('owner', '=', req.user.sub).limit(5)
      : datastore.createQuery(kind).limit(5)

  const results = {}

  // Getting cursor
  if (Object.keys(req.query).includes('cursor')) {
    query = query.start(req.query.cursor)
  }

  // Getting entities from Datastore
  return datastore.runQuery(query).then((entities) => {
    results.items = entities[0].map(ds.fromDatastore)

    // Get URL for next page
    if (entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS) {
      results.next =
        req.protocol +
        '://' +
        req.get('host') +
        req.baseUrl +
        `?cursor=${encodeURIComponent(entities[1].endCursor)}`
    }

    return results
  })
}

/**
 * Deletes an entity in the datastore based on its kind and ID.
 * @param {kind of entity} kind
 * @param {entity ID} id
 * @returns {entity key} key
 */
function delete_entity(kind, id) {
  const key = datastore.key([kind, parseInt(id, 10)])

  return datastore.delete(key)
}

/**
 * Edits an entity in the datastore based on its kind and ID.
 * Updates using the data passed through the function.
 * @param {kind of entity} kind
 * @param {entity ID} id
 * @param {entity data to be updated} data
 * @returns updated entity
 */
function edit_entity(kind, id, data) {
  const key = datastore.key([kind, parseInt(id, 10)])

  return datastore.save({ key: key, data: data })
}

/**
 * Checks if the information inputted by the user if valid.
 * @param {request sent by user} req
 * @param {functionality being validated} functionality
 * @returns whether the request is valid and data to be sent back to user
 */
async function validation_check(req, functionality, entity) {
  var response_data
  const accepts = req.accepts(['application/json'])
  const received = req.get('content-type')

  if (received !== 'application/json') {
    // User send data in unsupported format
    response_data = validation_response(false, 415, 'Server only accepts application/json data')
  } else if (!accepts) {
    // User requests unsupported content type
    response_data = validation_response(
      false,
      406,
      'application/json is the only supported content type'
    )
  } else if (req.body.id) {
    response_data = validation_response(false, 403, 'The ID attribute cannot be changed')
  } else if (
    (req.body.name && typeof req.body.name !== 'string') ||
    (req.body.address && typeof req.body.address !== 'string') ||
    (req.body.capacity && typeof req.body.capacity !== 'number') ||
    (req.body.species && typeof req.body.species !== 'string') ||
    (req.body.age && typeof req.body.age !== 'number')
  ) {
    // Datatype incorrect for one of the attributes
    response_data = validation_response(
      false,
      400,
      'The data type for at least one of the values is incorrect'
    )
  } else if (
    entity === PET &&
    (/[^a-z.\s']/gi.test(req.body.name) || /[^a-z.\s']/gi.test(req.body.species))
  ) {
    // Invalid character
    response_data = validation_response(false, 400, 'An invalid character was entered')
  } else if (
    (functionality === 'post' &&
      entity === SHELTER &&
      (!req.body.name || !req.body.address || !req.body.capacity)) ||
    (functionality === 'post' &&
      entity === PET &&
      (!req.body.name || !req.body.species || !req.body.age))
  ) {
    // Missing one of the required attributes
    response_data = validation_response(
      false,
      400,
      'The request object is missing at least one of the required attributes'
    )
  } else {
    // Determine if any invalid attributes were entered
    const attributes = Object.keys(req.body)
    const invalid_attributes = attributes.filter((attribute) => {
      if (
        entity === SHELTER &&
        attribute !== 'name' &&
        attribute !== 'address' &&
        attribute !== 'capacity'
      ) {
        return attribute
      } else if (
        entity === PET &&
        attribute !== 'name' &&
        attribute !== 'species' &&
        attribute !== 'age'
      ) {
        return attribute
      }
    })

    // Determine if name is unique
    var unique_name
    if (entity === SHELTER && req.body.name) {
      unique_name = await is_unique(req.body.name, entity)
    }

    if (invalid_attributes.length !== 0) {
      response_data = validation_response(
        false,
        400,
        'An attribute not part of an entity was entered'
      )
    } else if (entity === SHELTER && req.body.name && !unique_name) {
      response_data = validation_response(false, 403, 'The name of the shelter is not unique')
    } else if (
      (req.body.name && req.body.name.length > 50) ||
      (req.body.address && req.body.address.length > 50) ||
      (req.body.species && req.body.species.length > 50)
    ) {
      // Name or type is over the character limit
      response_data = validation_response(
        false,
        400,
        'String attributes can be no longer than 50 characters'
      )
    } else if (
      (req.body.capacity && (req.body.capacity < 1 || req.body.capacity > 500)) ||
      (req.body.age && (req.body.age < 1 || req.body.age > 25))
    ) {
      var message
      if (req.body.capacity) {
        message = 'A shelter’s capacity must be in the range of 1 to 500'
      } else {
        message = 'A pet’s age must be in the range of 0 to 25'
      }

      // Length not in required range
      response_data = validation_response(false, 400, message)
    } else {
      response_data = {
        valid: true,
      }
    }
  }

  return response_data
}

/**
 * Creates an object of information about the status of
 * a request that will be sent to the user.
 * @param {boolean} is_valid
 * @param {status code number} code
 * @param {message to user} message
 * @returns Object containing response data
 */
function validation_response(is_valid, code, message) {
  const response_data = {
    valid: is_valid,
    code: code,
    message: message,
  }

  return response_data
}

/**
 * Determines if the requested name attribute for an entity
 * is unique across all of the entities of that type within
 * the Datastore.
 * @param {attribute to be checked} name
 * @param {entity type} type
 */
async function is_unique(name, type) {
  const items = await get_entities(type)

  // Determine if there is a matching name within Datastore
  const matching_name = items.filter((item) => {
    if (item.name === name) {
      return item
    }
  })

  if (matching_name.length !== 0) {
    return false
  } else {
    return true
  }
}

module.exports = {
  post_entity,
  get_entities,
  get_entities_pagination,
  get_entity_by_id,
  delete_entity,
  edit_entity,
  validation_check,
}
