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

// Initialize express and create HTTP server
const app = express();
const server = http.createServer(app);

// Environment-aware origins
const RAILWAY_DOMAIN = 'zurcherapi.up.railway.app';
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production' 
  ? [
      `https://${RAILWAY_DOMAIN}`,
      'https://zurcher-api-9526.vercel.app'
    ]
  : ['http://localhost:5173', 'http://localhost:3000'];

// CORS configuration
const corsOptions = {
  origin: function(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      debug(`Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  allowEIO3: true,
  // Railway-specific settings
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none'
  }
});

// Connected users tracking
const connectedUsers = new Map();

// Socket.IO error handling and connection management
io.engine.on("connection_error", (err) => {
  debug("Socket.IO connection error:", {
    code: err.code,
    message: err.message,
    time: new Date().toISOString()
  });
});

io.on("connection", (socket) => {
  debug(`New socket connection: ${socket.id}`);

  socket.on("join", (staffId) => {
    if (!staffId) return;
    
    connectedUsers.set(staffId, socket.id);
    debug(`Staff ${staffId} connected with socket ${socket.id}`);
    
    socket.emit('joined', { 
      staffId, 
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  socket.on("disconnect", (reason) => {
    debug(`Socket ${socket.id} disconnected. Reason: ${reason}`);
    
    for (const [staffId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(staffId);
        debug(`Staff ${staffId} disconnected`);
        break;
      }
    }
  });

  socket.on("error", (error) => {
    debug("Socket error:", {
      socketId: socket.id,
      error: error.message
    });
  });
});

// Make io and connected users available throughout the app
app.set('io', io);
app.set('connectedUsers', connectedUsers);

// Essential middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(passport.initialize());

// Ensure uploads directory exists
const uploadsPath = path.join(__dirname, '../uploads');
!fs.existsSync(uploadsPath) && fs.mkdirSync(uploadsPath, { recursive: true });

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await conn.authenticate()
      .then(() => 'connected')
      .catch(err => {
        debug('Database error:', err);
        return 'disconnected';
      });

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      socket_connections: io.engine.clientsCount,
      connected_users: Array.from(connectedUsers.keys()),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      node_version: process.version,
      env: process.env.NODE_ENV
    });
  } catch (error) {
    debug('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Routes
app.use('/', routes);
app.use('/auth', authRoutes);

// Error handling
app.use('*', (req, res) => {
  res.status(404).json({ error: true, message: 'Not found' });
});

app.use((err, req, res, next) => {
  debug('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    path: req.path,
    method: req.method
  });

  res.status(err.statusCode || 500).json({
    error: true,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message
  });
});

module.exports = { 
  app, 
  server, 
  io 
};