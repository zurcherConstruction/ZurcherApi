const express = require('express');
const session = require('express-session');
const morgan = require('morgan');
const routes = require('./routes');
const cors = require('cors');
const path = require('path');
const { passport } = require('./passport');
const { JWT_SECRET_KEY } = require('./config/envs');
const authRoutes = require('./routes/authRoutes');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
require('./tasks/cronJobs');
const { errorHandler } = require('./middleware/error');
const { seedBudgetItems } = require('./utils/items');

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
  console.log("Usuario conectado:", socket.id);

  // Escuchar el evento "join" para asociar el staffId con el socket.id
  socket.on("join", (staffId) => {
    connectedUsers[staffId] = socket.id; // Asociar el staffId con el socket.id
    console.log(`Usuario con staffId ${staffId} conectado con socket.id ${socket.id}`);
  });

  // Eliminar al usuario del objeto cuando se desconecta
  socket.on("disconnect", () => {
    const staffId = Object.keys(connectedUsers).find(
      (key) => connectedUsers[key] === socket.id
    );
    if (staffId) {
      delete connectedUsers[staffId];
      console.log(`Usuario con staffId ${staffId} desconectado`);
    }
  });
});

// Middlewares
app.use(express.json({ limit: "10mb" })); // Cambia "10mb" según tus necesidades
app.use(express.urlencoded({ limit: "10mb", extended: true }));
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
app.use(cors({
  origin: '*', // Permitir cualquier origen
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'], // Métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Encabezados permitidos
  credentials: true, // Permitir el uso de credenciales
}));

// CORS Headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); 
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE', 'PATCH');
  next();
});

// **AQUÍ AGREGAR LA INICIALIZACIÓN DE LA BASE DE DATOS**
const initializeDatabase = async () => {
  try {
    console.log('🔄 Inicializando items por defecto...');
    await seedBudgetItems(false); // false para modo silencioso
    console.log('✅ Inicialización completada');
  } catch (error) {
    console.error('❌ Error al inicializar items por defecto:', error);
    // No detener el servidor
  }
};

// Ejecutar la inicialización
initializeDatabase();

// Routes
app.use('/', routes);
app.use('/auth', authRoutes);

// Not Found Middleware
app.use('*', (req, res) => {
  res.status(404).send({
    error: true,
    message: 'Not found',
  });
});



app.use(errorHandler);

// Configuración de Socket.IO
io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  // Escuchar eventos personalizados
  socket.on('join', (staffId) => {
    console.log(`Usuario con ID ${staffId} se unió a la sala`);
    socket.join(staffId); // Unir al usuario a una sala específica basada en su ID
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
  });
});

module.exports =  { app, server, io };