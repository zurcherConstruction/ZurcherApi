const { Pool } = require('pg');
require('dotenv').config();
//PARA EJECUTAR Y REVISAR INVOICE CON NAN (node fix-nan-invoices.js)
// Detectar si es producción (Railway) o local
const isProduction = process.env.DB_DEPLOY && process.env.DB_DEPLOY.startsWith('postgresql://');

const pool = isProduction
  ? new Pool({
      connectionString: process.env.DB_DEPLOY,
      ssl: {
        rejectUnauthorized: false
      }
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });

const fixNaNInvoices = async () => {
  const client = await pool.connect();
  
  try {
    // Verificar conexión
    const { rows: dbInfo } = await client.query('SELECT current_database() as db');
    const env = isProduction ? '☁️  RAILWAY (PRODUCCIÓN)' : '💻 LOCAL (DESARROLLO)';
    
    console.log(`\n🔌 Conectado a: ${env}`);
    console.log(`📊 Base de datos: ${dbInfo[0].db}\n`);
    
    console.log('🔍 === BUSCANDO INVOICES CON PROBLEMAS ===\n');
    
    // 1. Buscar invoices con paidAmount NULL, NaN o inconsistente
    // EXCLUIR pagos de tarjetas de crédito (CC-PAYMENT, AMEX-PAYMENT)
    const { rows: problematicInvoices } = await client.query(`
      SELECT 
        si."idSupplierInvoice",
        si."invoiceNumber",
        si."vendor",
        si."totalAmount",
        si."paidAmount",
        si."paymentStatus",
        COALESCE(SUM(e."amount"), 0) as "calculatedPaid"
      FROM "SupplierInvoices" si
      LEFT JOIN "Expenses" e ON e."supplierInvoiceItemId" = si."idSupplierInvoice"
      WHERE 
        si."invoiceNumber" NOT LIKE 'CC-PAYMENT-%'
        AND si."invoiceNumber" NOT LIKE 'AMEX-PAYMENT-%'
      GROUP BY si."idSupplierInvoice"
      HAVING 
        si."paidAmount" IS NULL 
        OR si."paidAmount" != si."paidAmount"  -- NaN check (NaN != NaN en SQL)
        OR ABS(si."paidAmount" - COALESCE(SUM(e."amount"), 0)) > 0.01
      ORDER BY si."createdAt" DESC
    `);
    
    console.log(`📋 Encontrados ${problematicInvoices.length} invoices con problemas:\n`);
    
    if (problematicInvoices.length === 0) {
      console.log('✅ No hay invoices con problemas!');
      return;
    }
    
    // Separar NaN de otros problemas
    const nanInvoices = problematicInvoices.filter(inv => 
      inv.paidAmount === null || inv.paidAmount !== inv.paidAmount || isNaN(parseFloat(inv.paidAmount))
    );
    
    const otherProblems = problematicInvoices.filter(inv => 
      inv.paidAmount !== null && inv.paidAmount === inv.paidAmount && !isNaN(parseFloat(inv.paidAmount))
    );
    
    // Mostrar lista de invoices con NaN
    if (nanInvoices.length > 0) {
      console.log('🔴 INVOICES CON NaN (NECESITAN CORRECCIÓN):');
      nanInvoices.forEach((inv, i) => {
        console.log(`\n${i + 1}. Invoice #${inv.invoiceNumber || 'Sin número'}`);
        console.log(`   Proveedor: ${inv.vendor}`);
        console.log(`   Total: $${parseFloat(inv.totalAmount).toFixed(2)}`);
        console.log(`   Pagado registrado: $${inv.paidAmount || 'NULL/NaN'}`);
        console.log(`   Pagado real (suma expenses): $${parseFloat(inv.calculatedPaid).toFixed(2)}`);
        console.log(`   Estado actual: ${inv.paymentStatus}`);
      });
      console.log('');
    }
    
    // Mostrar otros problemas (solo informativo)
    if (otherProblems.length > 0) {
      console.log('\n⚠️  OTROS PROBLEMAS (NO SE CORREGIRÁN):');
      otherProblems.forEach((inv, i) => {
        console.log(`\n${i + 1}. Invoice #${inv.invoiceNumber || 'Sin número'}`);
        console.log(`   Proveedor: ${inv.vendor}`);
        console.log(`   Total: $${parseFloat(inv.totalAmount).toFixed(2)}`);
        console.log(`   Pagado registrado: $${parseFloat(inv.paidAmount).toFixed(2)}`);
        console.log(`   Pagado real (suma expenses): $${parseFloat(inv.calculatedPaid).toFixed(2)}`);
        console.log(`   Diferencia: $${Math.abs(parseFloat(inv.paidAmount) - parseFloat(inv.calculatedPaid)).toFixed(2)}`);
        console.log(`   Estado actual: ${inv.paymentStatus}`);
        console.log(`   💡 Revisar manualmente`);
      });
      console.log('');
    }
    
    if (nanInvoices.length === 0) {
      console.log('✅ No hay invoices con NaN para corregir!');
      return;
    }
    
    // Preguntar si quiere arreglar SOLO los NaN
    console.log(`🔧 ¿Corregir ${nanInvoices.length} invoice(s) con NaN? (presiona CTRL+C para cancelar, ENTER para continuar)`);
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
    console.log('\n🔧 === CORRIGIENDO INVOICES ===\n');
    
    await client.query('BEGIN');
    
    let fixed = 0;
    
    // Solo corregir invoices con NaN
    for (const inv of nanInvoices) {
      const totalAmount = parseFloat(inv.totalAmount);
      const calculatedPaid = parseFloat(inv.calculatedPaid);
      
      // Determinar estado correcto
      let newStatus;
      if (calculatedPaid === 0) {
        newStatus = 'pending';
      } else if (calculatedPaid >= totalAmount) {
        newStatus = 'paid';
      } else {
        newStatus = 'partial';
      }
      
      // Actualizar invoice
      await client.query(`
        UPDATE "SupplierInvoices"
        SET 
          "paidAmount" = $1,
          "paymentStatus" = $2
        WHERE "idSupplierInvoice" = $3
      `, [calculatedPaid, newStatus, inv.idSupplierInvoice]);
      
      console.log(`✅ Invoice #${inv.invoiceNumber}: $${inv.paidAmount || 'NULL'} → $${calculatedPaid.toFixed(2)} (${newStatus})`);
      fixed++;
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ ${fixed} invoices corregidos exitosamente!`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
    console.log('\n🎉 Proceso completado\n');
  }
};

fixNaNInvoices();
