const { conn } = require('./src/data');

/**
 * Script para verificar la estructura de la tabla Budgets en producción
 */

async function checkBudgetsTableStructure() {
  try {
    await conn.authenticate();
    console.log('✅ Conectado a la base de datos de PRODUCCIÓN\n');
    console.log('🔍 Verificando estructura de la tabla Budgets...\n');
    console.log('═'.repeat(80));
    
    // Obtener TODAS las columnas de la tabla Budgets
    const [columns] = await conn.query(`
      SELECT 
        column_name, 
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'Budgets'
      ORDER BY ordinal_position;
    `);
    
    console.log(`\n📋 COLUMNAS DE LA TABLA BUDGETS (${columns.length} columnas):\n`);
    
    columns.forEach((col, i) => {
      const num = String(i + 1).padStart(2);
      const name = col.column_name.padEnd(35);
      const type = col.data_type.padEnd(25);
      const nullable = col.is_nullable === 'YES' ? '✓ NULL' : '✗ NOT NULL';
      
      console.log(`${num}. ${name} ${type} ${nullable}`);
    });
    
    // Buscar columnas relacionadas con firmas
    console.log('\n═'.repeat(80));
    console.log('\n🔍 COLUMNAS RELACIONADAS CON FIRMAS:\n');
    
    const signatureColumns = columns.filter(c => 
      c.column_name.toLowerCase().includes('sign') || 
      c.column_name.toLowerCase().includes('signature')
    );
    
    if (signatureColumns.length > 0) {
      signatureColumns.forEach(col => {
        console.log(`✓ ${col.column_name.padEnd(35)} | ${col.data_type}`);
      });
    } else {
      console.log('❌ No se encontraron columnas relacionadas con firmas');
    }
    
    // Buscar columnas relacionadas con PDFs/documentos
    console.log('\n═'.repeat(80));
    console.log('\n📄 COLUMNAS RELACIONADAS CON PDFs/DOCUMENTOS:\n');
    
    const pdfColumns = columns.filter(c => 
      c.column_name.toLowerCase().includes('pdf') || 
      c.column_name.toLowerCase().includes('path') ||
      c.column_name.toLowerCase().includes('document') ||
      c.column_name.toLowerCase().includes('file')
    );
    
    if (pdfColumns.length > 0) {
      pdfColumns.forEach(col => {
        console.log(`✓ ${col.column_name.padEnd(35)} | ${col.data_type}`);
      });
    } else {
      console.log('❌ No se encontraron columnas relacionadas con PDFs');
    }
    
    // Verificar columnas específicas que buscamos
    console.log('\n═'.repeat(80));
    console.log('\n🎯 VERIFICACIÓN DE COLUMNAS ESPECÍFICAS:\n');
    
    const columnasAVerificar = [
      'signatureMethod',
      'signNowDocumentId',
      'signedBudgetPath',
      'manualSignaturePath',
      'paymentInvoice',
      'isLegacy',
      'status'
    ];
    
    columnasAVerificar.forEach(nombreCol => {
      const existe = columns.some(c => c.column_name === nombreCol);
      const icon = existe ? '✅' : '❌';
      console.log(`${icon} ${nombreCol.padEnd(30)} ${existe ? 'EXISTE' : 'NO EXISTE'}`);
    });
    
    console.log('\n═'.repeat(80));
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
  } finally {
    await conn.close();
    console.log('\n✅ Conexión cerrada');
    process.exit(0);
  }
}

checkBudgetsTableStructure();
