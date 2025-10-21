const { app, server } = require("./src/app.js"); // Importar tanto app como server
const { conn } = require("./src/data");
const { PORT } = require("./src/config/envs.js");
const { startSignatureCheckCron } = require("./src/services/checkPendingSignatures.js");
const { startFixedExpensesCron } = require("./src/services/autoGenerateFixedExpenses.js");

require("dotenv").config();

// Sincronizar todos los modelos
conn.sync({ alter: true }).then(async () => {
  server.listen(PORT, () => { // Usar server.listen en lugar de app.listen
    console.log(`🚀 Servidor escuchando en el puerto: ${PORT} 🚀`);
    startSignatureCheckCron(); // Iniciar el cron para verificar firmas pendientes
    startFixedExpensesCron(); // Iniciar el cron para auto-generar gastos fijos vencidos
  });
});

