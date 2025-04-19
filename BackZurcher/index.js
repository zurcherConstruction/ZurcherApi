const { app, server } = require("./src/app.js"); // Importar tanto app como server
const { conn } = require("./src/data");
const { PORT } = require("./src/config/envs.js");
require("dotenv").config();

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
