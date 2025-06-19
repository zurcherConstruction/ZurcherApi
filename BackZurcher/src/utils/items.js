const { BudgetItem } = require('../data');

const defaultItems = [
  // SYSTEM TYPE
  { category: "System Type", name: "TANK ATU 500 GDP", marca: "Fuji", capacity: "500 gal", description: "FUJI IM1530P/2, 500GAL DBL COMP,  SEPTIC TANK", unitPrice: 1000, supplierName: "", supplierLocation: "" },
  { category: "System Type", name: "TANK ATU 700 GDP", marca: "Fuji", capacity: "700 gal", description: "FUJI IM1530P/2, 700GAL DBL COMP,  SEPTIC TANK", unitPrice: 2000, supplierName: "", supplierLocation: "" },
  { category: "System Type", name: "TANK ATU 1000 GDP", marca: "Fuji", capacity: "1000 gal", description: "FUJI IM1530P/2, 1000GAL DBL COMP,  SEPTIC TANK", unitPrice: 3000, supplierName: "", supplierLocation: "" },
  { category: "System Type", name: "TANK ATU 500 GDP", marca: "Infiltrator", capacity: "500 gal", description: "INFILTRATOR IM1530P/2, 500GAL DBL COMP,  SEPTIC TANK", unitPrice: 1500, supplierName: "", supplierLocation: "" },
  { category: "System Type", name: "TANK ATU 750 GDP", marca: "Infiltrator", capacity: "750 gal", description: "INFILTRATOR IM1530P/2, 750GAL DBL COMP,  SEPTIC TANK", unitPrice: 2500, supplierName: "", supplierLocation: "" },
  { category: "System Type", name: "TANK ATU 1000 GDP", marca: "Infiltrator", capacity: "1000 gal", description: "INFILTRATOR IM1530P/2, 1000GAL DBL COMP,  SEPTIC TANK", unitPrice: 3500, supplierName: "", supplierLocation: "" },
  { category: "System Type", name: "TANK REGULAR 1060 GDP", marca: "Infiltrator", capacity: "1060 gal", description: "INFILTRATOR IM1530P/2, 1060GAL DBL COMP,  SEPTIC TANK", unitPrice: 2800, supplierName: "", supplierLocation: "" },
  { category: "System Type", name: "TANK REGULAR 1250 GDP", marca: "Infiltrator", capacity: "1250 gal", description: "INFILTRATOR IM1530P/2, 1250GAL DBL COMP,  SEPTIC TANK", unitPrice: 3500, supplierName: "", supplierLocation: "" },
  { category: "System Type", name: "TANK REGULAR 1530 GDP", marca: "Infiltrator", capacity: "1530 gal", description: "INFILTRATOR IM1530P/2, 1530GAL DBL COMP,  SEPTIC TANK", unitPrice: 4500, supplierName: "", supplierLocation: "" },

 
  // SISTEMA CHAMBERS
  { category: "Sistema Chambers", name: "CHAMBERS", marca: "", capacity: "", description: "INFILTRATOR Q4+EQ36 LP QUICK4 PLUS EQLZR 36 LOW PROFILE CHAMBER", unitPrice: 1000, supplierName: "", supplierLocation: "" },
  { category: "Sistema Chambers", name: "CHAMBERS", marca: "", capacity: "", description: "INFILTRATOR Q4+EQ36 LP QUICK4 PLUS EQLZR 36 ARC 24 CHAMBER", unitPrice: 2000, supplierName: "", supplierLocation: "" },

  // PUMP
  { category: "Pump", name: "PUMP TANK LIFT STATION", marca: "", capacity: "300 gal", description: "TANK 300 GAL", unitPrice: 100, supplierName: "", supplierLocation: "" },
  { category: "Pump", name: "PUMP TANK LIFT STATION", marca: "", capacity: "500 gal", description: "TANK 500 GAL", unitPrice: 50, supplierName: "", supplierLocation: "" },

  // MATERIALES
  { category: "Sand", name: "SAND TRUCK", marca: "", capacity: "7 ALL INCLUDED", description: "LOADS SAND INCLUDED", unitPrice: 1500, supplierName: "", supplierLocation: "" },
  { category: "Sand", name: "SAND TRUCK", marca: "", capacity: "0", description: "", unitPrice: 0, supplierName: "", supplierLocation: "" },
  { category: "Sand", name: "SAND TRUCK", marca: "", capacity: "4", description: "4 SAND INCLUDED", unitPrice: 1000, supplierName: "", supplierLocation: "" },

  // INSPECTION
  { category: "Inspection", name: "PRIVATE INSPECTION", marca: "", capacity: "", description: "FIRST & FINAL INSPECTION", unitPrice: 500, supplierName: "", supplierLocation: "" },
  { category: "Inspection", name: "PRIVATE INSPECTION", marca: "", capacity: "", description: "FIRST INSPECTION", unitPrice: 200, supplierName: "", supplierLocation: "" },
  { category: "Inspection", name: "PRIVATE INSPECTION", marca: "", capacity: "", description: "FINAL INSPECTION", unitPrice: 300, supplierName: "", supplierLocation: "" },
  { category: "Inspection", name: "HEALTH DEPARTMENT INSPECTION", marca: "", capacity: "", description: "FIRST INSPECTION", unitPrice: 200, supplierName: "", supplierLocation: "" },
  { category: "Inspection", name: "HEALTH DEPARTMENT INSPECTION", marca: "", capacity: "", description: "FINAL INSPECTION", unitPrice: 200, supplierName: "", supplierLocation: "" },

  // LABOR
  { category: "Labor Fee", name: "LABOR FEE", marca: "", capacity: "", description: "ZURCHER CONSTRUCTION", unitPrice: 6000, supplierName: "", supplierLocation: "" },
 
  { category: "Rock", name: "ROCK REMOVAL", marca: "", capacity: "", description: "INCLUDED AT NO ADDITIONALCOST IF REQUIRED DURING INSTALLATION", unitPrice: 0, supplierName: "", supplierLocation: "" },
  { category: "Cover", name: "DIR TRUCK FOR COVER", marca: "", capacity: "", description: "LOADS OF DIRT INCLUDED", unitPrice: 0, supplierName: "", supplierLocation: "" },
  { category: "Excavation", name: "EXCAVATION", marca: "", capacity: "", description: "EXCAVATION DRAINFIELD", unitPrice: 0, supplierName: "", supplierLocation: "" },
  { category: "Kit", name: "INFILTRATOR KIT", marca: "", capacity: "", description: "ECOPOD-NX IM 1530 RESIDENTIAL WASTEWATER TREATMENT SYSTEM", unitPrice: 0, supplierName: "", supplierLocation: "" },
];

const seedBudgetItems = async (verbose = true) => {
  try {
    if (verbose) console.log('🌱 Verificando BudgetItems...');
    
    // Verificar si ya existen items (para evitar duplicados)
    const existingItems = await BudgetItem.count();
    
    if (existingItems > 0) {
      if (verbose) {
        console.log(`⚠️  Ya existen ${existingItems} items en la base de datos.`);
        console.log('💡 Si deseas recargar los items por defecto, ejecuta: npm run seed:reset');
      }
      return { message: 'Items ya existen', count: existingItems };
    }

    // Crear todos los items por defecto
    const createdItems = await BudgetItem.bulkCreate(defaultItems);
    console.log(`✅ Se crearon ${createdItems.length} items por defecto.`);
    
    return { message: 'Items creados', count: createdItems.length };
  } catch (error) {
    console.error('❌ Error al verificar/crear BudgetItems:', error);
    throw error;
  }
};

const resetAndSeedBudgetItems = async () => {
  try {
    console.log('🔄 Reseteando y recargando BudgetItems...');
    
    // Eliminar todos los items existentes
    await BudgetItem.destroy({ where: {}, force: true });
    console.log('🗑️  Items existentes eliminados.');
    
    // Crear los items por defecto
    const createdItems = await BudgetItem.bulkCreate(defaultItems);
    console.log(`✅ Se recrearon ${createdItems.length} items por defecto.`);
    
    return { message: 'Items reseteados y creados', count: createdItems.length };
  } catch (error) {
    console.error('❌ Error al resetear BudgetItems:', error);
    throw error;
  }
};

module.exports = {
  seedBudgetItems,
  resetAndSeedBudgetItems,
  defaultItems
};