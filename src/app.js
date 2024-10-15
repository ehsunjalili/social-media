const express = require('express');
const path = require('path');
const flash = require('express-flash');
const session = require('express-session');
const cookieParser = require('cookie-parser');


const { setHraders } = require('./middlewares/headers');
const {errorHandler} = require('./middlewares/errorHandler')

const app = express()

//* BodyParser
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(express.json({ limit: '50mb' }))

//* Require routes
const homeRoutes = require('./modules/home/home.routes')
const authRoutes = require('./modules/auth/auth.routes')
const postRoutes = require('./modules/post/post.routes')
const pageRoutes = require('./modules/pages/page.routes')
const userRoutes = require('./modules/users/user.routes')
const exploreRoutes = require('./modules/explore/explore.routes')
const apiDocRoutes = require('./modules/apiDoc/swagger.routes');

//* CookieParser
app.use(cookieParser())

//* Cors Policy
app.use(setHraders)

//* Express flash
app.use(session({
    secret: 'Secret Key',
    resave: false,
    saveUninitialized: false
}))
app.use(flash())

//* Static Folders
app.use(express.static(path.join(__dirname, '..', 'public')))
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/fonts', express.static(path.join(__dirname, 'public/fonts')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

//* Template Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

//* Routes
app.use('/', homeRoutes)
app.use('/auth', authRoutes)
app.use('/posts', postRoutes)
app.use('/pages', pageRoutes)
app.use('/users', userRoutes)
app.use('/explore',exploreRoutes)
app.use('/api-doc', apiDocRoutes)

//* 404 Error Handler
app.use((req, res) => {
    return res.render('404')
})

app.use(errorHandler)

module.exports = app
