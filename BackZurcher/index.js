require("dotenv").config();
const { app, server, io } = require("./src/app.js");
const { conn } = require("./src/data");

const PORT = process.env.PORT || 3001;

// Basic health check route
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
    await conn.authenticate();
    console.log('Database connection test successful');

    await conn.sync({ alter: true });
    console.log('Database synchronized successfully');

    return new Promise((resolve, reject) => {
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server listening on port: ${PORT} 🚀`);
        console.log('Environment:', process.env.NODE_ENV);
        console.log('Node version:', process.version);
        console.log('Memory usage:', process.memoryUsage());
        resolve();
      });

      server.on('error', reject);
    });
  } catch (error) {
    console.error('Failed to start server:', {
      error: error.message,
      stack: error.stack,
      time: new Date().toISOString()
    });
    throw error; // Let the outer catch handle it
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

    // Close services in order
    await Promise.all([
      // Close Socket.IO
      new Promise(resolve => {
        io.close(() => {
          console.log('Socket.IO connections closed');
          resolve();
        });
      }),
      // Close HTTP server
      new Promise(resolve => {
        server.close(() => {
          console.log('HTTP server closed');
          resolve();
        });
      }),
      // Close database
      conn.close().then(() => {
        console.log('Database connection closed');
      })
    ]);

    clearTimeout(timeout);
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Signal handlers
['SIGTERM', 'SIGINT'].forEach(signal => {
  process.on(signal, () => gracefulShutdown(signal));
});

// Start the application
startServer().catch(error => {
  console.error('Startup error:', error);
  process.exit(1);
});