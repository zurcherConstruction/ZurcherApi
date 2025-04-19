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
const debug = require('debug')('app:server');
require('./tasks/cronJobs');

const app = express();
const server = http.createServer(app);

// Define allowed origins first
const ALLOWED_ORIGINS = [
  'https://zurcher-api-9526.vercel.app',
  'http://localhost:5173'
];

// Configure CORS - Move this before any route handlers
const corsOptions = {
  origin: function(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin); // Debug log
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Apply CORS middleware early
app.use(cors(corsOptions));

// Configure Socket.IO with matching CORS settings
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket.IO error handling
io.engine.on("connection_error", (err) => {
  console.error("Socket.IO connection error:", {
    req: err.req?.url,
    code: err.code,
    message: err.message
  });
});

// Middlewares - Order matters!
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(morgan('dev'));
app.use(passport.initialize());

// Create uploads directory if it doesn't exist
const uploadsPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await conn.authenticate()
      .then(() => 'connected')
      .catch((err) => {
        console.error('Database error:', err);
        return 'disconnected';
      });

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      socket_connections: io?.engine?.clientsCount || 0,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      node_version: process.version,
      env: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join", (staffId) => {
    connectedUsers[staffId] = socket.id;
    console.log(`Staff ${staffId} connected with socket ${socket.id}`);
  });

  socket.on("disconnect", () => {
    const staffId = Object.keys(connectedUsers).find(
      (key) => connectedUsers[key] === socket.id
    );
    if (staffId) {
      delete connectedUsers[staffId];
      console.log(`Staff ${staffId} disconnected`);
    }
  });
});

// Routes
app.use('/', routes);
app.use('/auth', authRoutes);

// Error Handling Middleware
app.use('*', (req, res) => {
  res.status(404).json({
    error: true,
    message: 'Not found'
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    path: req.path,
    method: req.method
  });

  res.status(err.statusCode || 500).json({
    error: true,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

module.exports = { app, server, io };