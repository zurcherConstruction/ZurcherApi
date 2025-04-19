require("dotenv").config();
const { app, server } = require("./src/app.js");
const { conn } = require("./src/data");
const { PORT } = require("./src/config/envs.js");

// Enhanced graceful shutdown with timeout
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Set a timeout for force shutdown
  const forceShutdown = setTimeout(() => {
    console.error('Forceful shutdown initiated after timeout');
    process.exit(1);
  }, 10000);

  try {
    // Close server first
    await new Promise((resolve) => {
      server.close(resolve);
      console.log('HTTP server closed');
    });

    // Then close database
    await conn.close();
    console.log('Database connection closed');

    clearTimeout(forceShutdown);
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Startup sequence
const startServer = async () => {
  try {
    // Connect and sync database
    await conn.sync({ alter: true });
    console.log('Database synchronized successfully');

    // Start server
    await new Promise((resolve) => {
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server listening on port: ${PORT} 🚀`);
        console.log('Environment:', process.env.NODE_ENV);
        console.log('Database connected successfully');
        resolve();
      });
    });

    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Global error handlers
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (error) => {
      console.error('Unhandled Rejection:', error);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();
