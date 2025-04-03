const cron = require("node-cron");
const archiveBudgets = require("./archiveBudgets");

// Configurar la tarea para ejecutarse al inicio de cada mes
cron.schedule("0 0 1 * *", () => {
  console.log("Ejecutando tarea de archivado de presupuestos...");
  archiveBudgets();
});

console.log("Tarea programada para archivar presupuestos configurada.");