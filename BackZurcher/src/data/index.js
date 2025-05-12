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
  DB_DEPLOY
  } = require('../config/envs');
//-------------------------------- CONFIGURACION PARA TRABAJAR LOCALMENTE-----------------------------------
// const sequelize = new Sequelize(
//   `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
//   {
//     logging: false, // set to console.log to see the raw SQL queries
//     native: false, // lets Sequelize know we can use pg-native for ~30% more speed
//   }
// );
//-------------------------------------CONFIGURACION PARA EL DEPLOY---------------------------------------------------------------------
const sequelize = new Sequelize(DB_DEPLOY , {
      logging: false, // set to console.log to see the raw SQL queries
      native: false, // lets Sequelize know we can use pg-native for ~30% more speed
      timezone: 'America/New_York'
    }
  );

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
const { Staff, Permit, Income, SystemType, Expense, Budget, Work, Material, Inspection, Notification, InstallationDetail, MaterialSet, Image, Receipt, NotificationApp, BudgetItem, BudgetLineItem, FinalInvoice, WorkExtraItem } = sequelize.models;

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
  foreignKey: 'idWork',
  as: 'incomes',
});
Income.belongsTo(Work, {
  foreignKey: 'idWork',
  as: 'work',
});

Work.hasMany(Expense, {
  foreignKey: 'idWork',
  as: 'expenses',
});
Expense.belongsTo(Work, {
  foreignKey: 'idWork',
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

Income.belongsTo(Staff, { as: 'Staff', foreignKey: 'staffId' });
Expense.belongsTo(Staff, { as: 'Staff', foreignKey: 'staffId' });


//---------------------------------------------------------------------------------//
module.exports = {
  ...sequelize.models, // para poder importar los modelos así: const { Product, User } = require('./db.js');
  conn: sequelize, // para importart la conexión { conn } = require('./db.js');
}; //  // para importart la conexión { conn } = require('./db.js');