require('dotenv').config();
const { Sequelize } = require('sequelize');

const fs = require('fs');
const path = require('path');
const {
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_DEPLOY,
  NODE_ENV
  } = require('../config/envs');

//-------------------------------- CONFIGURACION UNIFICADA (LOCAL Y DEPLOY) -----------------------------------
// Usar DB_DEPLOY si existe (Railway/Producción), sino usar configuración local
const sequelize = DB_DEPLOY 
  ? new Sequelize(DB_DEPLOY, {
      logging: false,
      native: false,
      timezone: 'America/New_York',
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      dialectOptions: {
        ssl: NODE_ENV === 'production' ? { require: true, rejectUnauthorized: false } : false
      }
    })
  : new Sequelize(
      `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
      {
        logging: false,
        native: false,
        pool: {
          max: 10,
          min: 0,
          acquire: 30000,
          idle: 10000
        },
        dialectOptions: {
          statement_timeout: 30000, // ⏰ Aumentado a 30 segundos para permitir sync() de Sequelize
        }
      }
    );

console.log(`📊 Base de datos: ${DB_DEPLOY ? 'RAILWAY (Producción)' : 'LOCAL (Desarrollo)'}`);

const basename = path.basename(__filename);

const modelDefiners = [];

// Leemos todos los archivos de la carpeta Models, los requerimos y agregamos al arreglo modelDefiners
fs.readdirSync(path.join(__dirname, '/models'))
  .filter(
    (file) =>
      file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js'
  )
  .forEach((file) => {
    modelDefiners.push(require(path.join(__dirname, '/models', file)));
  });

// Injectamos la conexion (sequelize) a todos los modelos
modelDefiners.forEach((model) => model(sequelize));
// Capitalizamos los nombres de los modelos ie: product => Product
let entries = Object.entries(sequelize.models);
let capsEntries = entries.map((entry) => [
  entry[0][0].toUpperCase() + entry[0].slice(1),
  entry[1],
]);
sequelize.models = Object.fromEntries(capsEntries);

// En sequelize.models están todos los modelos importados como propiedades
// Para relacionarlos hacemos un destructuring
const { Staff, Permit, Income, ChangeOrder, Expense, Budget, Work, Material, Inspection, Notification, InstallationDetail, MaterialSet, Image, Receipt, NotificationApp, BudgetItem, BudgetLineItem, FinalInvoice, WorkExtraItem, MaintenanceVisit, MaintenanceMedia, ContactFile, ContactRequest, FixedExpense, FixedExpensePayment, SupplierInvoice, SupplierInvoiceItem, SupplierInvoiceWork, SupplierInvoiceExpense, BudgetNote, WorkNote, WorkStateHistory } = sequelize.models;

ContactRequest.hasMany(ContactFile, { foreignKey: 'contactRequestId', as: 'files' });
ContactFile.belongsTo(ContactRequest, { foreignKey: 'contactRequestId' });

// Relaciones
Permit.hasMany(Work, { foreignKey: 'propertyAddress', sourceKey: 'propertyAddress' });
Work.belongsTo(Permit, { foreignKey: 'propertyAddress', targetKey: 'propertyAddress' });

// Permit.hasMany(Budget, { foreignKey: 'propertyAddress', sourceKey: 'propertyAddress' });
// Budget.belongsTo(Permit, { foreignKey: 'propertyAddress', targetKey: 'propertyAddress' });

Work.hasMany(Material, { foreignKey: 'workId' });
Material.belongsTo(Work, { foreignKey: 'workId' });

Staff.hasMany(Material, { foreignKey: 'staffId' });
Material.belongsTo(Staff, { foreignKey: 'staffId' });

Work.hasMany(Inspection, { foreignKey: 'workId', as: 'inspections' }); // 'inspections' como alias
Inspection.belongsTo(Work, { foreignKey: 'workId' });

Staff.hasMany(Work, { foreignKey: 'staffId' });
Work.belongsTo(Staff, { foreignKey: 'staffId' });

// Relaciones entre Staff y Income/Expense
Staff.hasMany(Income, { foreignKey: 'staffId', as: 'incomes' });
Income.belongsTo(Staff, { foreignKey: 'staffId', as: 'Staff' });

Staff.hasMany(Expense, { foreignKey: 'staffId', as: 'expenses' });
Expense.belongsTo(Staff, { foreignKey: 'staffId', as: 'Staff' });

// Work.belongsTo(Budget, { foreignKey: 'idBudget', as: 'budget' });
// Budget.hasMany(Work, { foreignKey: 'idBudget' });
// Relación entre Staff y Notification
Notification.belongsTo(Staff, { as: "sender", foreignKey: "senderId" });
Staff.hasMany(Notification, { as: "sentNotifications", foreignKey: "senderId" });

Notification.hasMany(Notification, { as: "responses", foreignKey: "parentId" });
Notification.belongsTo(Notification, { as: "parent", foreignKey: "parentId" });

Work.hasMany(InstallationDetail, { foreignKey: 'idWork', as: 'installationDetails' });
InstallationDetail.belongsTo(Work, { foreignKey: 'idWork', as: 'work' });

Work.hasMany(Image, { foreignKey: 'idWork', as: 'images' });
Image.belongsTo(Work, { foreignKey: 'idWork', as: 'work' });

MaterialSet.hasMany(Material, { foreignKey: 'materialSetId' });
Material.belongsTo(MaterialSet, { foreignKey: 'materialSetId' });
// Relación entre Work y MaterialSet
Work.hasMany(MaterialSet, { foreignKey: 'workId', as: 'MaterialSets' });
MaterialSet.belongsTo(Work, { foreignKey: 'workId', as: 'Work' });

// Relación lógica con Inspection
Inspection.hasMany(Receipt, { foreignKey: 'relatedId', constraints: false, scope: { relatedModel: 'Inspection' } });
Receipt.belongsTo(Inspection, { foreignKey: 'relatedId', constraints: false });

// Relación lógica con MaterialSet
MaterialSet.hasMany(Receipt, { foreignKey: 'relatedId', constraints: false, scope: { relatedModel: 'MaterialSet' } });
Receipt.belongsTo(MaterialSet, { foreignKey: 'relatedId', constraints: false });

// Relación entre Work y Receipt
Work.hasMany(Receipt, { foreignKey: 'relatedId', constraints: false, scope: { relatedModel: 'Work' } });
Receipt.belongsTo(Work, { foreignKey: 'relatedId', constraints: false });

//Relaciones Work, Income, Expense
Work.hasMany(Income, {
  foreignKey: 'workId', // CAMBIO: 'idWork' -> 'workId'
  as: 'incomes',
});
Income.belongsTo(Work, {
  foreignKey: 'workId', // CAMBIO: 'idWork' -> 'workId'
  as: 'work',
});

Work.hasMany(Expense, {
  foreignKey: 'workId', // CAMBIO: 'idWork' -> 'workId'
  as: 'expenses',
});
Expense.belongsTo(Work, {
  foreignKey: 'workId', // CAMBIO: 'idWork' -> 'workId'
  as: 'work',
});
// Relación entre Staff y NotificationApp
NotificationApp.belongsTo(Staff, { as: 'sender', foreignKey: 'senderId' });
Staff.hasMany(NotificationApp, { as: 'notifications', foreignKey: 'staffId' }); // <-- FK diferente
NotificationApp.hasMany(NotificationApp, { as: 'responses', foreignKey: 'parentId' });
NotificationApp.belongsTo(NotificationApp, { as: 'parent', foreignKey: 'parentId' });


// --- NUEVAS RELACIONES PARA BUDGET ITEMS ---

// Un Budget tiene muchas BudgetLineItems
Budget.hasMany(BudgetLineItem, {
  foreignKey: 'budgetId', // La clave foránea en BudgetLineItem que apunta a Budget
  as: 'lineItems'         // Alias para usar al incluir BudgetLineItems en consultas de Budget
});

// Una BudgetLineItem pertenece a un Budget
BudgetLineItem.belongsTo(Budget, {
  foreignKey: 'budgetId'
});

// Un BudgetItem (del catálogo) puede estar en muchas BudgetLineItems (en diferentes presupuestos)
BudgetItem.hasMany(BudgetLineItem, {
  foreignKey: 'budgetItemId' // La clave foránea en BudgetLineItem que apunta a BudgetItem
});

// Una BudgetLineItem pertenece a un BudgetItem (referencia al item del catálogo)
BudgetLineItem.belongsTo(BudgetItem, {
  foreignKey: 'budgetItemId',
  as: 'itemDetails'       // Alias para usar al incluir detalles del BudgetItem en consultas de BudgetLineItem
});

// filepath: c:\Users\yaniz\Documents\ZurcherApi\BackZurcher\src\data\index.js
// ...
Permit.hasMany(Budget, { foreignKey: 'PermitIdPermit' });
Budget.belongsTo(Permit, { foreignKey: 'PermitIdPermit' });

// Permit.hasMany(Work, { foreignKey: 'idPermit' });
// Work.belongsTo(Permit, { foreignKey: 'idPermit' });


Budget.hasOne(Work, { foreignKey: 'idBudget' }); // O hasMany si un budget puede tener varios works
Work.belongsTo(Budget, { foreignKey: 'idBudget', as: 'budget' });

// Relación Budget - Staff (para vendedores/sales_rep)
Budget.belongsTo(Staff, {
  foreignKey: 'createdByStaffId',
  as: 'createdByStaff'
});
Staff.hasMany(Budget, {
  foreignKey: 'createdByStaffId',
  as: 'budgetsCreated'
});

// ...
// Relación lógica con Income
Income.hasMany(Receipt, { foreignKey: 'relatedId', constraints: false, scope: { relatedModel: 'Income' }, as: 'Receipts' }); // Añadir alias
Receipt.belongsTo(Income, { foreignKey: 'relatedId', constraints: false });

// Relación lógica con Expense
Expense.hasMany(Receipt, { foreignKey: 'relatedId', constraints: false, scope: { relatedModel: 'Expense' }, as: 'Receipts' }); // Añadir alias
Receipt.belongsTo(Expense, { foreignKey: 'relatedId', constraints: false });

// Un Work tiene una FinalInvoice
Work.hasOne(FinalInvoice, {
  foreignKey: 'workId', // La clave foránea en FinalInvoice que apunta a Work
  as: 'finalInvoice'    // Alias para incluir FinalInvoice en consultas de Work
});
// Una FinalInvoice pertenece a un Work
FinalInvoice.belongsTo(Work, {
  foreignKey: 'workId'
});

// Un Budget tiene una FinalInvoice (opcional, pero útil para referencia)
Budget.hasOne(FinalInvoice, {
  foreignKey: 'budgetId', // La clave foránea en FinalInvoice que apunta a Budget
  as: 'finalInvoice'
});
// Una FinalInvoice pertenece a un Budget
FinalInvoice.belongsTo(Budget, {
  foreignKey: 'budgetId'
});

// Una FinalInvoice tiene muchos WorkExtraItems
FinalInvoice.hasMany(WorkExtraItem, {
  foreignKey: 'finalInvoiceId', // La clave foránea en WorkExtraItem que apunta a FinalInvoice
  as: 'extraItems'         // Alias para incluir WorkExtraItems en consultas de FinalInvoice
});
// Un WorkExtraItem pertenece a una FinalInvoice
WorkExtraItem.belongsTo(FinalInvoice, {
  foreignKey: 'finalInvoiceId'
});

// --- RELACIONES PARA CHANGE ORDER ---
Work.hasMany(ChangeOrder, {
  foreignKey: 'workId', // La clave foránea en ChangeOrder que apunta a Work
  as: 'changeOrders'    // Alias para usar al incluir ChangeOrders en consultas de Work
});
ChangeOrder.belongsTo(Work, {
  foreignKey: 'workId',
  as: 'work'             // Alias para usar al incluir Work en consultas de ChangeOrder
});

//mantenimiento
Work.hasMany(MaintenanceVisit, {
  foreignKey: 'workId',
  as: 'maintenanceVisits'
});
MaintenanceVisit.belongsTo(Work, {
  foreignKey: 'workId',
  as: 'work'
});

MaintenanceVisit.hasMany(MaintenanceMedia, {
  foreignKey: 'maintenanceVisitId',
  as: 'mediaFiles'
});
MaintenanceMedia.belongsTo(MaintenanceVisit, {
  foreignKey: 'maintenanceVisitId',
  as: 'maintenanceVisit'
});
// Dentro del método associate si lo usas, o después de definir el modelo
MaintenanceVisit.belongsTo(Staff, { // <--- CAMBIO AQUÍ: Usa 'Staff' directamente
  foreignKey: 'staffId', 
  as: 'assignedStaff' 
});

// MaintenanceVisit también puede tener un completedByStaff
MaintenanceVisit.belongsTo(Staff, {
  foreignKey: 'completed_by_staff_id',
  as: 'completedByStaff'
});

// Un Staff puede tener muchas MaintenanceVisits asignadas
Staff.hasMany(MaintenanceVisit, { // <--- CAMBIO AQUÍ: Usa 'MaintenanceVisit' directamente
  foreignKey: 'staffId', 
  as: 'maintenanceVisitsAssigned' 
});

// --- RELACIONES PARA GASTOS FIJOS (FIXED EXPENSES) ---
Staff.hasMany(FixedExpense, {
  foreignKey: 'createdByStaffId',
  as: 'fixedExpensesCreated'
});
FixedExpense.belongsTo(Staff, {
  foreignKey: 'createdByStaffId',
  as: 'createdBy'
});

// --- RELACIONES PARA SUPPLIER INVOICES (INVOICES DE PROVEEDORES) ---

// Un SupplierInvoice tiene muchos Items
SupplierInvoice.hasMany(SupplierInvoiceItem, {
  foreignKey: 'supplierInvoiceId',
  as: 'items'
});
SupplierInvoiceItem.belongsTo(SupplierInvoice, {
  foreignKey: 'supplierInvoiceId',
  as: 'invoice'
});

// 🆕 Un SupplierInvoice puede estar vinculado a múltiples Works (para auto-generar gastos al pagar)
SupplierInvoice.belongsToMany(Work, {
  through: SupplierInvoiceWork,
  foreignKey: 'supplierInvoiceId',
  otherKey: 'workId',
  as: 'linkedWorks'
});
Work.belongsToMany(SupplierInvoice, {
  through: SupplierInvoiceWork,
  foreignKey: 'workId',
  otherKey: 'supplierInvoiceId',
  as: 'supplierInvoices'
});

// Un SupplierInvoiceItem puede estar asociado a un Work (opcional)
Work.hasMany(SupplierInvoiceItem, {
  foreignKey: 'workId',
  as: 'supplierInvoiceItems'
});
SupplierInvoiceItem.belongsTo(Work, {
  foreignKey: 'workId',
  as: 'work'
});

// Un SupplierInvoiceItem puede estar vinculado a un Expense existente
Expense.hasOne(SupplierInvoiceItem, {
  foreignKey: 'relatedExpenseId',
  as: 'invoiceItem'
});
SupplierInvoiceItem.belongsTo(Expense, {
  foreignKey: 'relatedExpenseId',
  as: 'relatedExpense'
});

// Un Expense puede estar vinculado a un SupplierInvoiceItem (cuando se paga vía invoice)
SupplierInvoiceItem.hasOne(Expense, {
  foreignKey: 'supplierInvoiceItemId',
  as: 'expense'
});
Expense.belongsTo(SupplierInvoiceItem, {
  foreignKey: 'supplierInvoiceItemId',
  as: 'paidViaInvoiceItem'
});

// 🆕 RELACIONES ENTRE FixedExpense Y SupplierInvoiceItem
// Un SupplierInvoiceItem puede estar vinculado a un FixedExpense existente
FixedExpense.hasOne(SupplierInvoiceItem, {
  foreignKey: 'relatedFixedExpenseId',
  as: 'invoiceItem'
});
SupplierInvoiceItem.belongsTo(FixedExpense, {
  foreignKey: 'relatedFixedExpenseId',
  as: 'relatedFixedExpense'
});

// Un FixedExpense puede estar vinculado a un SupplierInvoiceItem (cuando se paga vía invoice)
SupplierInvoiceItem.hasOne(FixedExpense, {
  foreignKey: 'supplierInvoiceItemId',
  as: 'fixedExpense'
});
FixedExpense.belongsTo(SupplierInvoiceItem, {
  foreignKey: 'supplierInvoiceItemId',
  as: 'paidViaInvoiceItem'
});

// 🆕 FixedExpense tiene muchos pagos parciales
FixedExpense.hasMany(FixedExpensePayment, {
  foreignKey: 'fixedExpenseId',
  as: 'payments'
});
FixedExpensePayment.belongsTo(FixedExpense, {
  foreignKey: 'fixedExpenseId',
  as: 'fixedExpense'
});

// 🆕 Cada pago parcial puede generar un Expense
Expense.hasOne(FixedExpensePayment, {
  foreignKey: 'expenseId',
  as: 'relatedPayment'
});
FixedExpensePayment.belongsTo(Expense, {
  foreignKey: 'expenseId',
  as: 'generatedExpense'
});

// 🆕 Un Staff puede registrar pagos parciales
Staff.hasMany(FixedExpensePayment, {
  foreignKey: 'createdByStaffId',
  as: 'fixedExpensePaymentsCreated'
});
FixedExpensePayment.belongsTo(Staff, {
  foreignKey: 'createdByStaffId',
  as: 'createdBy'
});


// Un SupplierInvoice fue creado por un Staff
Staff.hasMany(SupplierInvoice, {
  foreignKey: 'createdByStaffId',
  as: 'supplierInvoicesCreated'
});
SupplierInvoice.belongsTo(Staff, {
  foreignKey: 'createdByStaffId',
  as: 'createdBy'
});

// Relación polimórfica con Receipt (para adjuntar comprobantes PDF del invoice)
SupplierInvoice.hasMany(Receipt, { 
  foreignKey: 'relatedId', 
  constraints: false, 
  scope: { relatedModel: 'SupplierInvoice' },
  as: 'Receipts'
});
Receipt.belongsTo(SupplierInvoice, { 
  foreignKey: 'relatedId', 
  constraints: false 
});

// 🆕 --- RELACIONES PARA VINCULAR SUPPLIER INVOICES CON EXPENSES EXISTENTES ---

// Relación muchos a muchos: Un SupplierInvoice puede pagar múltiples Expenses
// y un Expense puede estar vinculado a múltiples SupplierInvoices (pago parcial)
SupplierInvoice.belongsToMany(Expense, {
  through: SupplierInvoiceExpense,
  foreignKey: 'supplierInvoiceId',
  otherKey: 'expenseId',
  as: 'linkedExpenses'
});
Expense.belongsToMany(SupplierInvoice, {
  through: SupplierInvoiceExpense,
  foreignKey: 'expenseId',
  otherKey: 'supplierInvoiceId',
  as: 'supplierInvoices'
});

// Relaciones directas con la tabla intermedia
SupplierInvoiceExpense.belongsTo(SupplierInvoice, {
  foreignKey: 'supplierInvoiceId',
  as: 'invoice'
});
SupplierInvoiceExpense.belongsTo(Expense, {
  foreignKey: 'expenseId',
  as: 'expense'
});
SupplierInvoiceExpense.belongsTo(Staff, {
  foreignKey: 'linkedByStaffId',
  as: 'linkedBy'
});

// --- RELACIONES PARA BUDGET NOTES (SEGUIMIENTO DE PRESUPUESTOS) ---

// Un Budget tiene muchas BudgetNotes (notas de seguimiento)
Budget.hasMany(BudgetNote, {
  foreignKey: 'budgetId',
  as: 'notes'
});
BudgetNote.belongsTo(Budget, {
  foreignKey: 'budgetId',
  as: 'budget'
});

// Un Staff puede crear muchas BudgetNotes
Staff.hasMany(BudgetNote, {
  foreignKey: 'staffId',
  as: 'budgetNotes'
});
BudgetNote.belongsTo(Staff, {
  foreignKey: 'staffId',
  as: 'author'
});

// --- RELACIONES PARA WORK NOTES (SEGUIMIENTO DE OBRAS) ---

// Un Work tiene muchas WorkNotes (notas de seguimiento)
Work.hasMany(WorkNote, {
  foreignKey: 'workId',
  as: 'workNotes' // Cambiado de 'notes' a 'workNotes' para evitar conflicto con el campo notes del modelo
});
WorkNote.belongsTo(Work, {
  foreignKey: 'workId',
  as: 'work'
});

// Un Staff puede crear muchas WorkNotes
Staff.hasMany(WorkNote, {
  foreignKey: 'staffId',
  as: 'workNotes'
});
WorkNote.belongsTo(Staff, {
  foreignKey: 'staffId',
  as: 'author'
});

// --- RELACIONES PARA WORK STATE HISTORY (HISTORIAL DE CAMBIOS DE ESTADO) ---

// Un Work tiene muchos registros de WorkStateHistory
Work.hasMany(WorkStateHistory, {
  foreignKey: 'workId',
  as: 'stateHistory'
});
WorkStateHistory.belongsTo(Work, {
  foreignKey: 'workId',
  as: 'work'
});

// Un Staff puede haber realizado muchos cambios de estado
Staff.hasMany(WorkStateHistory, {
  foreignKey: 'changedBy',
  as: 'stateChanges'
});
WorkStateHistory.belongsTo(Staff, {
  foreignKey: 'changedBy',
  as: 'changedByStaff'
});


//---------------------------------------------------------------------------------//
module.exports = {
  ...sequelize.models, // para poder importar los modelos así: const { Product, User } = require('./db.js');
  conn: sequelize, // para importart la conexión { conn } = require('./db.js');
  sequelize,
 
}; //  // para importart la conexión { conn } = require('./db.js');