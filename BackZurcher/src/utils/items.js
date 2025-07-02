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
  { category: "Sistema Chambers", name: "CHAMBERS", marca: "", capacity: "", description: "INFILTRATOR Q4+EQ36 LP QUICK4 PLUS EQLZR 36 LOW PROFILE CHAMBER", unitPrice: 29.76, supplierName: "", supplierLocation: "" },
  { category: "Sistema Chambers", name: "CHAMBERS", marca: "", capacity: "", description: "INFILTRATOR Q4+EQ36 LP QUICK4 PLUS EQLZR 36 ARC 24 CHAMBER", unitPrice: 2000, supplierName: "", supplierLocation: "" },

  // PUMP
  { category: "Pump", name: "PUMP TANK LIFT STATION", marca: "", capacity: "300 gal", description: "TANK 300 GAL", unitPrice: 100, supplierName: "", supplierLocation: "" },
  { category: "Pump", name: "PUMP TANK LIFT STATION", marca: "", capacity: "500 gal", description: "TANK 500 GAL", unitPrice: 50, supplierName: "", supplierLocation: "" },

  // MATERIALES
  { category: "Sand", name: "SAND TRUCK", marca: "", capacity: "7 ALL INCLUDED", description: "LOADS SAND INCLUDED", unitPrice: 1500, supplierName: "", supplierLocation: "" },
  { category: "Sand", name: "SAND TRUCK", marca: "", capacity: "0", description: "", unitPrice: 0, supplierName: "", supplierLocation: "" },
  { category: "Sand", name: "SAND TRUCK", marca: "", capacity: "4", description: "4 SAND INCLUDED", unitPrice: 1000, supplierName: "", supplierLocation: "" },

  { category: "Accesorios", name: "HYDRAPRO 4", marca: "", capacity: "", description: "HYDRAPRO 4 HXH S&D D3304 1/4 SHORT BEND 90 EQUALS P204 NV3304", unitPrice: 15, supplierName: "", supplierLocation: "" },
  { category: "Accesorios", name: "HYDRAPRO 4 ", marca: "", capacity: "", description: "HYDRAPRO 4 HXHXH S&D D3034 STRAIGHT TEE EQUALS P104 NV804", unitPrice: 10, supplierName: "", supplierLocation: "" },
  { category: "Accesorios", name: "4x10 3034", marca: "", capacity: "", description: "4X10 3034 SDR35 PVC BOE PLAS PIPE", unitPrice: 12, supplierName: "", supplierLocation: "" },

  // INSPECTION
  { category: "Inspection", name: "PRIVATE INSPECTION", marca: "", capacity: "", description: "FIRST & FINAL INSPECTION", unitPrice: 500, supplierName: "", supplierLocation: "" },
  { category: "Inspection", name: "PRIVATE INSPECTION", marca: "", capacity: "", description: "FIRST INSPECTION", unitPrice: 200, supplierName: "", supplierLocation: "" },
  { category: "Inspection", name: "PRIVATE INSPECTION", marca: "", capacity: "", description: "FINAL INSPECTION", unitPrice: 300, supplierName: "", supplierLocation: "" },
  { category: "Inspection", name: "HEALTH DEPARTMENT INSPECTION", marca: "", capacity: "", description: "FIRST INSPECTION", unitPrice: 200, supplierName: "", supplierLocation: "" },
  { category: "Inspection", name: "HEALTH DEPARTMENT INSPECTION", marca: "", capacity: "", description: "FINAL INSPECTION", unitPrice: 200, supplierName: "", supplierLocation: "" },

  // LABOR
  { category: "Labor Fee", name: "ZURCHER CONSTRUCTION", marca: "", capacity: "", description: "", unitPrice: 6000, supplierName: "", supplierLocation: "" },
 
  { category: "Rock", name: "ROCK REMOVAL", marca: "", capacity: "", description: "INCLUDED AT NO ADDITIONALCOST IF REQUIRED DURING INSTALLATION", unitPrice: 0, supplierName: "", supplierLocation: "" },
  { category: "Dirt", name: "DIR TRUCK FOR COVER", marca: "", capacity: "", description: "LOADS OF DIRT INCLUDED", unitPrice: 0, supplierName: "", supplierLocation: "" },
  { category: "Kit", name: "INFILTRATOR KIT", marca: "", capacity: "", description: "ECOPOD-NX IM 1530 RESIDENTIAL WASTEWATER TREATMENT SYSTEM", unitPrice: 0, supplierName: "", supplierLocation: "" },

  { category: "MATERIALES", imageUrl:"https://res.cloudinary.com/dt4ah1jmy/image/upload/v1751459910/Captura_de_pantalla_2025-07-02_093318_jmmamp.png", name: "10747", marca: "", capacity: "", description: "HYDRAPRO 4 HXH S&D D3304 1/4 SHORT BEND 90 EQUALS P204 NV3304", unitPrice: 4.29, supplierName: "", supplierLocation: "" },
  { category: "MATERIALES", imageUrl:"https://res.cloudinary.com/dt4ah1jmy/image/upload/v1751459910/Captura_de_pantalla_2025-07-02_093326_yakcjx.png", name: "10757", marca: "", capacity: "", description: "HYDRAPRO 4 HXHXH S&D D3034 STRAIGHT TEE EQUALS P104 NV804", unitPrice: 4.89, supplierName: "", supplierLocation: "" },
  { category: "MATERIALES", imageUrl:"https://res.cloudinary.com/dt4ah1jmy/image/upload/v1751459910/Captura_de_pantalla_2025-07-02_093333_opymib.png", name: "13161", marca: "", capacity: "", description: "4X10 3034 SDR35 PVC BOE PLAS PIPE", unitPrice: 17.20, supplierName: "", supplierLocation: "" },
  { category: "MATERIALES", imageUrl:"https://res.cloudinary.com/dt4ah1jmy/image/upload/v1751459910/Captura_de_pantalla_2025-07-02_093340_a168sa.png", name: "10772", marca: "", capacity: "", description: "HYDRAPRO 4X3 SEWER HUBXDWV HUB D3034 ADPT CPLG EQUALS P655NV2043", unitPrice: 4.32, supplierName: "", supplierLocation: "" },
  { category: "MATERIALES", imageUrl:"https://res.cloudinary.com/dt4ah1jmy/image/upload/v1751459910/Captura_de_pantalla_2025-07-02_093348_cejhvg.png", name: "484655", marca: "", capacity: "", description: "INFILTRATOR SNAPRIS-B2412 24X12 BLK SNAP RISER W/ 10-PACKSSS-1210HEX SCREWS", unitPrice: 59.86, supplierName: "", supplierLocation: "" },
  { category: "MATERIALES", imageUrl:"https://res.cloudinary.com/dt4ah1jmy/image/upload/v1751459910/Captura_de_pantalla_2025-07-02_093355_zbqo0a.png", name: "10764", marca: "", capacity: "", description: "HYDRAPRO 4 HXHXH S&D D3034 2WAY CO TEE EQUALS P1004 NV2204", unitPrice: 13.98, supplierName: "", supplierLocation: "" },
  { category: "MATERIALES", imageUrl:"https://res.cloudinary.com/dt4ah1jmy/image/upload/v1751459910/Captura_de_pantalla_2025-07-02_093410_ewhp7l.png", name: "10765", marca: "", capacity: "", description: "HYDRAPRO 4 HXHXHXH S&D D3034 CROSS EQUALS P179 NV1304", unitPrice: 19.57, supplierName: "", supplierLocation: "" },
  { category: "MATERIALES", imageUrl:"https://res.cloudinary.com/dt4ah1jmy/image/upload/v1751459911/Captura_de_pantalla_2025-07-02_093416_h8stcy.png", name: "362724", marca: "", capacity: "", description: "INFILTRATOR IM1530P/2 1530GAL DBL COMP SEPTIC TANK", unitPrice: 1841.88, supplierName: "", supplierLocation: "" },
  { category: "MATERIALES", imageUrl:"", name: "655711", marca: "", capacity: "", description: "DELTA TREATMENT E50-NXIM15302210LW NSF245 ECOPOD WITH AIRBLOWER AND CONTROL PANEL", unitPrice: 3368.71, supplierName: "", supplierLocation: "" },
  { category: "MATERIALES", imageUrl:"https://res.cloudinary.com/dt4ah1jmy/image/upload/v1751459910/Captura_de_pantalla_2025-07-02_093427_pko6qz.png", name: "258311", marca: "", capacity: "", description: "INFILTRATOR Q4+EQ36LP QUICK4 PLUS EQLZR 36 LOW PROFILE CHAMBER", unitPrice: 29.76, supplierName: "", supplierLocation: "" },
  { category: "MATERIALES", imageUrl:"https://res.cloudinary.com/dt4ah1jmy/image/upload/v1751459911/Captura_de_pantalla_2025-07-02_093445_d25zh2.png", name: "258314", marca: "", capacity: "", description: "INFILTRATOR Q4+E QUICK4 PLUS FLAT END CAP", unitPrice: 10.78, supplierName: "", supplierLocation: "" },
  { category: "MATERIALES", imageUrl:"https://res.cloudinary.com/dt4ah1jmy/image/upload/v1751459911/Captura_de_pantalla_2025-07-02_093451_iygsxt.png", name: "321838", marca: "", capacity: "", description: "INFILTRATOR 2412BD3-PP ARC 24 CHAMBERS", unitPrice: 39.51, supplierName: "", supplierLocation: "" },
  { category: "MATERIALES", imageUrl:"https://res.cloudinary.com/dt4ah1jmy/image/upload/v1751459911/Captura_de_pantalla_2025-07-02_093458_x7nlx2.png", name: "321838", marca: "", capacity: "", description: "*X* INFILTRATOR 240BD ARC 24 STD END CAP", unitPrice: 12.60, supplierName: "", supplierLocation: "" },
  { category: "MATERIALES", imageUrl:"https://res.cloudinary.com/dt4ah1jmy/image/upload/v1751459912/Captura_de_pantalla_2025-07-02_093504_tjuxbd.png", name: "639043", marca: "", capacity: "", description: "INFILTRATOR CM1060P/2 1060G 2 COMP SEPTIC TANK", unitPrice: 1297.77, supplierName: "", supplierLocation: "" },
  { category: "MATERIALES", imageUrl:"https://res.cloudinary.com/dt4ah1jmy/image/upload/v1751459913/Captura_de_pantalla_2025-07-02_093510_hamnh1.png", name: "654662", marca: "", capacity: "", description: "INFILTRATOR IM300P SING COMP SEPTIC TANK C4 IM300P/1/11-P11", unitPrice: 483.21, supplierName: "", supplierLocation: "" },
  { category: "MATERIALES", imageUrl:"https://res.cloudinary.com/dt4ah1jmy/image/upload/v1751459913/Captura_de_pantalla_2025-07-02_093519_qjqatt.png", name: "486754", marca: "", capacity: "", description: "INFIWATE IMLID-2400 IM 24IN RISER LID GRN", unitPrice: 55.86, supplierName: "", supplierLocation: "" },
  { category: "MATERIALES", imageUrl:"https://res.cloudinary.com/dt4ah1jmy/image/upload/v1751459913/Captura_de_pantalla_2025-07-02_093529_cu1tmd.png", name: "484655", marca: "", capacity: "", description: "INFILTRATOR SNAPRIS-B2412 24X12 BLK SNAP RISER W/ 10-PACKSSS-1210HEX SCREWS", unitPrice: 59.86, supplierName: "", supplierLocation: "" },
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