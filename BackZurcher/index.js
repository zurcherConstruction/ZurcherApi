require("dotenv").config();
const { app, server, io } = require("./src/app.js");
const { conn } = require("./src/data");

// Use Railway's PORT environment variable
const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Server is running',
    port: PORT,
    env: process.env.NODE_ENV
  });
});

// Startup sequence
const startServer = async () => {
  try {
    // Test database connection first
    await conn.authenticate();
    console.log('Database connection test successful');

    // Sync database
    await conn.sync({ alter: true });
    console.log('Database synchronized successfully');

    // Start server with explicit host binding
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server listening on port: ${PORT} 🚀`);
      console.log('Environment:', process.env.NODE_ENV);
      console.log('Node version:', process.version);
      console.log('Memory usage:', process.memoryUsage());
    });

    // Register shutdown handlers
    ['SIGTERM', 'SIGINT'].forEach(signal => {
      process.on(signal, () => gracefulShutdown(signal));
    });

  } catch (error) {
    console.error('Failed to start server:', {
      error: error.message,
      stack: error.stack,
      time: new Date().toISOString()
    });
    process.exit(1);
  }
};

// Enhanced graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`${signal} received at ${new Date().toISOString()}`);
  
  try {
    const timeout = setTimeout(() => {
      console.error('Forceful shutdown after timeout');
      process.exit(1);
    }, 5000);

    io.close(() => {
      console.log('Socket.IO connections closed');
    
    server.close(() => {
      console.log('HTTP server closed');
      conn.close().then(() => {
        console.log('Database connection closed');
        clearTimeout(timeout);
        process.exit(0);
      });
    });
  });
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the application
startServer().catch(error => {
  console.error('Startup error:', error);
  process.exit(1);
});
