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
 * Finds one page of 5 entities of the specified kind in the datastore.
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

module.exports = {
  post_entity,
  get_entities,
  get_entities_pagination,
  get_entity_by_id,
  delete_entity,
  edit_entity,
}
