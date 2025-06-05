const { BudgetItem } = require('../data');

const defaultItems = [
  // SYSTEM TYPE
  { category: "System Type", name: "ATU Fuji 500 gal", marca: "Fuji", capacity: "500 gal", description: "Incluye todo lo que ...", unitPrice: 1000, supplierName: "", supplierLocation: "" },
  { category: "System Type", name: "ATU Fuji 700 gal", marca: "Fuji", capacity: "700 gal", description: "Incluye todo lo que ...", unitPrice: 2000, supplierName: "", supplierLocation: "" },
  { category: "System Type", name: "ATU Fuji 1000 gal", marca: "Fuji", capacity: "1000 gal", description: "Incluye todo lo que ...", unitPrice: 3000, supplierName: "", supplierLocation: "" },
  { category: "System Type", name: "ATU Infiltrator 500 gal", marca: "Infiltrator", capacity: "500 gal", description: "Incluye todo lo que ...", unitPrice: 1500, supplierName: "", supplierLocation: "" },
  { category: "System Type", name: "ATU Infiltrator 750 gal", marca: "Infiltrator", capacity: "750 gal", description: "Incluye todo lo que ...", unitPrice: 2500, supplierName: "", supplierLocation: "" },
  { category: "System Type", name: "ATU Infiltrator 1000 gal", marca: "Infiltrator", capacity: "1000 gal", description: "Incluye todo lo que ...", unitPrice: 3500, supplierName: "", supplierLocation: "" },
  { category: "System Type", name: "REGULAR Infiltrator 1060 gal", marca: "Infiltrator", capacity: "1060 gal", description: "Incluye todo lo que ...", unitPrice: 2800, supplierName: "", supplierLocation: "" },
  { category: "System Type", name: "REGULAR Infiltrator 1250 gal", marca: "Infiltrator", capacity: "1250 gal", description: "Incluye todo lo que ...", unitPrice: 3500, supplierName: "", supplierLocation: "" },
  { category: "System Type", name: "REGULAR Infiltrator 1530 gal", marca: "Infiltrator", capacity: "1530 gal", description: "Incluye todo lo que ...", unitPrice: 4500, supplierName: "", supplierLocation: "" },

 
  // SISTEMA CHAMBERS
  { category: "Sistema Chambers", name: "Chamber ARC 24", marca: "", capacity: "", description: "Incluye todo lo que ...", unitPrice: 1000, supplierName: "", supplierLocation: "" },
  { category: "Sistema Chambers", name: "Chamber Low Profile", marca: "", capacity: "", description: "Incluye todo lo que ...", unitPrice: 2000, supplierName: "", supplierLocation: "" },

  // PUMP
  { category: "Pump", name: "Tanque 300 gal", marca: "", capacity: "300 gal", description: "Incluye todo lo que ...", unitPrice: 100, supplierName: "", supplierLocation: "" },
  { category: "Pump", name: "Tanque 500 gal", marca: "", capacity: "500 gal", description: "Incluye todo lo que ...", unitPrice: 50, supplierName: "", supplierLocation: "" },

  // MATERIALES
  { category: "Materiales", name: "Arena 4", marca: "", capacity: "4", description: "Incluye todo lo que ...", unitPrice: 100, supplierName: "", supplierLocation: "" },
  { category: "Materiales", name: "Arena Standard", marca: "", capacity: "0", description: "Incluye todo lo que ...", unitPrice: 0, supplierName: "", supplierLocation: "" },
  { category: "Materiales", name: "Arena All included 7", marca: "", capacity: "All included 7", description: "Incluye todo lo que ...", unitPrice: 1000, supplierName: "", supplierLocation: "" },

  // INSPECTION
  { category: "Inspection", name: "Inspection Inicial and fee healt department", marca: "Privada", capacity: "", description: "Incluye todo lo que ...", unitPrice: 200, supplierName: "", supplierLocation: "" },
  { category: "Inspection", name: "Inspection Inicial and fee healt department", marca: "Health Department", capacity: "", description: "Incluye todo lo que ...", unitPrice: 200, supplierName: "", supplierLocation: "" },

  // LABOR
  { category: "Labor Fee", name: "ZURCHER CONSTRUCTION", marca: "", capacity: "", description: "Incluye todo lo que ...", unitPrice: 6000, supplierName: "", supplierLocation: "" },
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