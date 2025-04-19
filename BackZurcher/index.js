const { app, server } = require("./src/app.js"); // Importar tanto app como server
const { conn } = require("./src/data");
const { PORT } = require("./src/config/envs.js");
require("dotenv").config();

const gracefulShutdown = (signal) => {
  console.log(`${signal} received. Starting graceful shutdown`);
  server.close(() => {
    console.log('HTTP server closed');
    conn.close().then(() => {
      console.log('Database connection closed');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Sincronizar todos los modelos
conn.sync({ alter: true }).then(async () => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor escuchando en el puerto: ${PORT} 🚀`);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Database connected successfully');
  });
}).catch(error => {
  console.error('Error starting server:', error);
});

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});
