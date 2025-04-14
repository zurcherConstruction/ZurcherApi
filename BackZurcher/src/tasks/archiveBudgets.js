const fs = require("fs");
const path = require("path");
const { Budget } = require("../data"); // Asegúrate de importar tu modelo de Budget
const { format, parseISO, isSameMonth } = require("date-fns");

const archiveBudgets = async () => {
  try {
    // Obtener la fecha actual
    const currentDate = new Date();

    // Obtener presupuestos que no sean del mes actual
    const budgets = await Budget.findAll();
    const oldBudgets = budgets.filter((budget) => {
      const budgetDate = parseISO(budget.date);
      return !isSameMonth(budgetDate, currentDate);
    });

    // Archivar presupuestos antiguos
    oldBudgets.forEach((budget) => {
      const budgetDate = parseISO(budget.date);
      const folderName = format(budgetDate, "MMMM-yyyy"); // Nombre de la carpeta (ej: "April-2025")
      const folderPath = path.join(__dirname, "archives", folderName);

      // Crear la carpeta si no existe
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      // Guardar el presupuesto en un archivo JSON dentro de la carpeta
      const filePath = path.join(folderPath, `budget-${budget.idBudget}.json`);
      fs.writeFileSync(filePath, JSON.stringify(budget, null, 2));
    });

    console.log("Presupuestos archivados correctamente.");
  } catch (error) {
    console.error("Error al archivar presupuestos:", error);
  }
};

archiveBudgets();