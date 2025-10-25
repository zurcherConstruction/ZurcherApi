const cron = require("node-cron");
const archiveBudgets = require("./archiveBudgets");

// Solo activar el cron si la variable de entorno lo indica
if (process.env.ENABLE_AUTO_ARCHIVE === 'true') {
  // Configurar la tarea para ejecutarse al inicio de cada mes
  cron.schedule("0 0 1 * *", () => {
    console.log("⏰ [CRON] Ejecutando tarea de archivado de presupuestos...");
    archiveBudgets();
  });
  console.log("✅ Tarea programada para archivar presupuestos configurada (se ejecuta el día 1 de cada mes a las 00:00).");
} else {
  console.log("ℹ️ Auto-archivado de presupuestos DESHABILITADO. Activa con ENABLE_AUTO_ARCHIVE=true");
}

// Exportar función para ejecución manual
module.exports = { archiveBudgets };