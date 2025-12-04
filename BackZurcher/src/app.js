const express = require('express');
const session = require('express-session');
const morgan = require('morgan');
const routes = require('./routes');
const cors = require('cors');
const compression = require('compression'); // 🆕 Compresión HTTP
const path = require('path');
const { passport } = require('./passport');
const { JWT_SECRET_KEY } = require('./config/envs');
const authRoutes = require('./routes/authRoutes');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
// ⚠️ DESHABILITADO: El cron de archivado ahora es manual o se activa con variable de entorno
// // require('./tasks/cronJobs');
const { errorHandler } = require('./middleware/error');
// ⚠️ DESHABILITADO: Los items ahora se cargan/descargan vía Excel en budgetitems
// const { seedBudgetItems } = require('./utils/items');

const app = express();
const server = http.createServer(app); // Crear el servidor HTTP
const io = new Server(server, {
  cors: {
    origin: '*', // Cambia esto según el dominio de tu frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

const createUploadDirectories = () => {
  const directories = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/budgets'),
    path.join(__dirname, '../uploads/change_orders'),
    path.join(__dirname, '../uploads/final_invoices'),
    path.join(__dirname, '../uploads/temp')
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Directorio creado: ${dir}`);
    }
  });
};

// Ejecutar la creación de directorios
createUploadDirectories();
// Middleware para compartir `io` en toda la aplicación
app.set('io', io);

// Configuración de eventos de Socket.IO
const connectedUsers = {}; // Objeto para almacenar los usuarios conectados

io.on("connection", (socket) => {
  //console.log("Usuario conectado:", socket.id);

  // Escuchar el evento "join" para asociar el staffId con el socket.id
  socket.on("join", (staffId) => {
    connectedUsers[staffId] = socket.id; // Asociar el staffId con el socket.id
    //console.log(`Usuario con staffId ${staffId} conectado con socket.id ${socket.id}`);
  });

  // Eliminar al usuario del objeto cuando se desconecta
  socket.on("disconnect", () => {
    const staffId = Object.keys(connectedUsers).find(
      (key) => connectedUsers[key] === socket.id
    );
    if (staffId) {
      delete connectedUsers[staffId];
      //console.log(`Usuario con staffId ${staffId} desconectado`);
    }
  });
});

// Middlewares
app.use(express.json({ limit: "10mb" })); // Cambia "10mb" según tus necesidades
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// 🚀 Compresión HTTP - Reduce respuestas hasta 70%
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,       // Balance entre velocidad y compresión (1-9)
  threshold: 1024 // Solo comprimir responses > 1KB
}));

app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads/budgets', (req, res, next) => {
  if (req.path.endsWith('.pdf')) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline'); // Para vista previa en navegador
  }
  next();
}, express.static(path.join(__dirname, '../uploads/budgets')));
app.use(morgan('dev'));
app.use(passport.initialize());


// Session

// ==== CORS CONFIGURACIÓN ====
const allowedOrigins = [
  'https://www.zurcherseptic.com', // Producción
  'http://localhost:5173', // Desarrollo local Vite
  'http://localhost:3000', // Desarrollo local React
  'http://localhost:5174', // Vite puerto alternativo
  'http://localhost:8081', // Expo Web
  'http://127.0.0.1:5173', // Localhost alternativo
  'http://127.0.0.1:3000',  // Localhost alternativo
  'http://127.0.0.1:8081'  // Expo Web alternativo
];

app.use(cors({
  origin: function(origin, callback){
    // Permitir requests sin origin (como Postman) o si está en la lista
    if(!origin || allowedOrigins.indexOf(origin) !== -1){
      callback(null, true)
    }else{
      callback(new Error('No permitido por CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma'], // ✅ Agregados Cache-Control y Pragma
}));

// CORS Headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*'); 
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
  next();
});


// ⚠️ DESHABILITADO: Ya no se usa seed automático de items
// Los items ahora se gestionan manualmente vía Excel en la interfaz de budgetitems
// Si necesitas ejecutar un seed manual, crea un script separado y ejecútalo con node

// Routes
app.use('/', routes);
//app.use('/auth', authRoutes);

// Not Found Middleware
app.use('*', (req, res) => {
  res.status(404).send({
    error: true,
    message: 'Not found',
  });
});



app.use(errorHandler);

module.exports =  { app, server, io };
//viendo que paso