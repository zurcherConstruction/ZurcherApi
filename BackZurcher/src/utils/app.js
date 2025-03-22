const express = require('express');
const session = require('express-session');
const morgan = require('morgan');
const routes = require('./routes');
const cors = require('cors');
const path = require('path');
const { passport } = require('./passport');
const { JWT_SECRET_KEY } = require('./config/envs');
const { errorHandler } = require('./middleware/errorHandler');


const app = express();
app.use(errorHandler);
// Middlewares
app.use(express.json()); // Solo este para manejar JSON
app.use(express.urlencoded({ extended: true }));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(cors());
app.use(morgan('dev'));
app.use(passport.initialize());


// Session
app.use(cors({
  origin: 'http://localhost:5173', // Permitir solicitudes desde este origen
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'], // Métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Encabezados permitidos
  credentials: true, // Permitir el uso de credenciales
}));

// CORS Headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); 
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  next();
});

// Routes
app.use('/', routes);

// Not Found Middleware
app.use('*', (req, res) => {
  res.status(404).send({
    error: true,
    message: 'Not found',
  });
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).send({
    error: true,
    message: err.message,
  });
});

module.exports = app;
