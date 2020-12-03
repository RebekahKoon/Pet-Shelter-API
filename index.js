const router = (module.exports = require('express').Router())

router.use('/shelters', require('./src/shelters'))
router.use('/pets', require('./src/pets'))
