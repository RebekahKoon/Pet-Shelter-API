const express = require('express')
const session = require('express-session')
const cookieParser = require('cookie-parser')

const app = express()

const bodyParser = require('body-parser')

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(cookieParser())
app.use(session({ secret: 'SuperSecret', resave: true, saveUninitialized: true }))

app.enable('trust proxy')

app.set('views', __dirname + '/views')
app.engine('html', require('ejs').renderFile)
app.set('view engine', 'ejs')

app.use('/', require('./index'))

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`)
})
