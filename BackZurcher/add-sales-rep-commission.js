const { conn } = require('./src/data');

async function addSalesRepCommissionColumn() {
  try {
    console.log('🔍 Verificando si la columna salesRepCommission existe...');
    
    const [results] = await conn.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Staffs' 
      AND column_name = 'salesRepCommission'
    `);

    if (results.length > 0) {
      console.log('✅ La columna salesRepCommission ya existe.');
      return;
    }

    console.log('📝 Agregando columna salesRepCommission a la tabla Staffs...');
    
    await conn.query(`
      ALTER TABLE "Staffs" 
      ADD COLUMN "salesRepCommission" DECIMAL(10, 2) DEFAULT NULL
    `);

    console.log('✅ Columna salesRepCommission agregada exitosamente.');
    
    // Opcional: Actualizar los sales_rep existentes con comisión por defecto de 500
    console.log('📝 Actualizando sales_rep existentes con comisión por defecto de $500...');
    
    const [updateResult] = await conn.query(`
      UPDATE "Staffs" 
      SET "salesRepCommission" = 500.00 
      WHERE role = 'sales_rep' 
      AND "salesRepCommission" IS NULL
    `);

    console.log(`✅ ${updateResult.affectedRows || 0} sales_rep actualizados con comisión por defecto.`);
    
  } catch (error) {
    console.error('❌ Error al agregar columna salesRepCommission:', error);
    throw error;
  } finally {
    await conn.close();
  }
}

addSalesRepCommissionColumn();
