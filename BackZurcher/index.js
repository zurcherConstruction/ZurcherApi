const { app, server } = require("./src/app.js"); // Importar tanto app como server
const { conn } = require("./src/data");
const { PORT } = require("./src/config/envs.js");
const { startSignatureCheckCron } = require("./src/services/checkPendingSignatures.js");
const { startFixedExpensesCron } = require("./src/services/autoGenerateFixedExpenses.js");

require("dotenv").config();

// Sincronizar todos los modelos
// NOTA: Usa alter: true solo cuando cambies modelos, luego vuelve a false
const syncOptions = process.env.DB_SYNC_ALTER === 'true' ? { alter: true } : { force: false };

conn.sync(syncOptions).then(async () => {
  server.listen(PORT, () => { // Usar server.listen en lugar de app.listen
    console.log(`🚀 Servidor escuchando en el puerto: ${PORT} 🚀`);
    if (syncOptions.alter) {
      console.log('⚠️ MODO ALTER ACTIVADO - El servidor puede tardar más en iniciar');
    }
    startSignatureCheckCron(); // Iniciar el cron para verificar firmas pendientes
    startFixedExpensesCron(); // Iniciar el cron para auto-generar gastos fijos vencidos
  });
}).catch((error) => {
  console.error('❌ Error al sincronizar la base de datos:', error);
  process.exit(1);
});

