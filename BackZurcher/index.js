const { app, server } = require("./src/app.js"); // Importar tanto app como server
const { conn } = require("./src/data");
const { PORT } = require("./src/config/envs.js");
const { startSignatureCheckCron } = require("./src/services/checkPendingSignatures.js");
const { startFixedExpensesCron } = require("./src/services/autoGenerateFixedExpenses.js");
const { startBudgetRemindersCron } = require("./src/services/checkBudgetReminders.js");

require("dotenv").config();

// 🚀 OPTIMIZACIÓN: Solo hacer sync() si la variable ENABLE_DB_SYNC está en true
// Esto acelera enormemente el arranque del servidor
const shouldSync = process.env.ENABLE_DB_SYNC === 'true';

if (shouldSync) {
  console.log('⚠️ DB_SYNC activado - El servidor tardará más en iniciar');
  const syncOptions = process.env.DB_SYNC_ALTER === 'true' ? { alter: true } : { force: false };
  
  conn.sync(syncOptions).then(async () => {
    startServer();
  }).catch((error) => {
    console.error('❌ Error al sincronizar la base de datos:', error);
    process.exit(1);
  });
} else {
  // 🚀 Inicio rápido: Solo verificar conexión sin sync
  conn.authenticate()
    .then(() => {
      console.log('✅ Conexión a base de datos verificada');
      startServer();
    })
    .catch((error) => {
      console.error('❌ Error al conectar con la base de datos:', error);
      process.exit(1);
    });
}

function startServer() {
  server.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en el puerto: ${PORT} 🚀`);
    startSignatureCheckCron(); // Iniciar el cron para verificar firmas pendientes
    startFixedExpensesCron(); // Iniciar el cron para auto-generar gastos fijos vencidos
    startBudgetRemindersCron(); // Iniciar el cron para recordatorios de budget
  });
}

