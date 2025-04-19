// 1. Core dependencies
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const debug = require('debug')('app:server');

// 2. Application dependencies
const routes = require('./routes');
const authRoutes = require('./routes/authRoutes');
const { passport } = require('./passport');
const { JWT_SECRET_KEY } = require('./config/envs');
require('./tasks/cronJobs');

// 3. Initialize express and server
const app = express();
const server = http.createServer(app);

// 4. Configuration constants
const RAILWAY_DOMAIN = 'zurcherapi.up.railway.app';
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production' 
  ? [
      `https://${RAILWAY_DOMAIN}`,
      'https://zurcher-api-9526.vercel.app'
    ]
  : ['http://localhost:5173', 'http://localhost:3000'];

// 5. CORS configuration
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

// 6. Core middleware (before Socket.IO)
app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(passport.initialize());

// 7. Socket.IO setup
const io = new Server(server, {
  cors: corsOptions,
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  allowEIO3: true,
  cookie: {
    name: 'io',
    path: '/',
    httpOnly: true,
    sameSite: 'none',
    secure: process.env.NODE_ENV === 'production'
  },
  allowUpgrades: true,
  serveClient: false,
  maxHttpBufferSize: 1e8
});

// 8. Socket.IO state management
const connectedUsers = new Map();

// 9. Socket.IO error handling
io.engine.on("connection_error", (err) => {
  debug("Socket.IO connection error:", {
    code: err.code,
    message: err.message,
    time: new Date().toISOString()
  });
});

// 10. Socket.IO connection handling
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

// 11. Make Socket.IO available to routes
app.set('io', io);
app.set('connectedUsers', connectedUsers);

// 12. Static files middleware
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 13. Ensure uploads directory exists
const uploadsPath = path.join(__dirname, '../uploads');
!fs.existsSync(uploadsPath) && fs.mkdirSync(uploadsPath, { recursive: true });

// 14. HTTPS redirect middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

// 15. Health check endpoint
app.get('/health', async (req, res) => {
  try {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      socket_connections: io.engine.clientsCount || 0,
      connected_users: Array.from(connectedUsers.keys()),
      uptime: process.uptime(),
      headers: req.headers,
      secure: req.secure,
      protocol: req.protocol,
      env: process.env.NODE_ENV,
      port: process.env.PORT
    });
  } catch (error) {
    debug('Health check error:', error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// 16. Main routes
app.use('/', routes);
app.use('/auth', authRoutes);

// 17. Error handling middleware
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

// 18. Export modules
module.exports = { 
  app, 
  server, 
  io 
};