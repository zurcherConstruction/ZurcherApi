const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_DEPLOY, {
  logging: false,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  }
});

async function fixMisclassified() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔧 CORRECCIÓN DE EXPENSES MAL CLASIFICADOS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await sequelize.authenticate();
    console.log('✅ Conectado a Railway\n');

    // Identificar SOLO el expense que es un pago (pago parcial de tarjeta)
    const [suspiciousExpenses] = await sequelize.query(`
      SELECT 
        "idExpense",
        date,
        amount,
        vendor,
        notes,
        "paymentStatus"
      FROM "Expenses"
      WHERE "paymentMethod" = 'Chase Credit Card'
      AND LOWER(notes) LIKE '%pago parcial de tarjeta%'
      ORDER BY date DESC;
    `);

    if (suspiciousExpenses.length === 0) {
      console.log('✅ No hay expenses mal clasificados\n');
      await transaction.commit();
      process.exit(0);
    }

    console.log(`⚠️  ${suspiciousExpenses.length} expense(s) mal clasificado(s):\n`);
    suspiciousExpenses.forEach((exp, idx) => {
      console.log(`${idx + 1}. ${exp.date} - $${parseFloat(exp.amount).toFixed(2)}`);
      console.log(`   Notes: ${exp.notes}`);
      console.log(`   ID: ${exp.idExpense}`);
      console.log('');
    });

    console.log('🔄 Estos expenses deberían ser PAGOS (SupplierInvoices)\n');
    console.log('⏳ Esperando 3 segundos antes de corregir...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Para cada expense mal clasificado:
    // 1. Crear SupplierInvoice como payment
    // 2. Eliminar el Expense
    
    for (const exp of suspiciousExpenses) {
      console.log(`📝 Procesando: ${exp.notes} ($${parseFloat(exp.amount).toFixed(2)})`);
      
      // 1. Crear SupplierInvoice
      const [newInvoice] = await sequelize.query(`
        INSERT INTO "SupplierInvoices" (
          "idSupplierInvoice",
          "invoiceNumber",
          vendor,
          "issueDate",
          "dueDate",
          "totalAmount",
          notes,
          "paymentStatus",
          "transactionType",
          "isCreditCard",
          "createdAt",
          "updatedAt"
        ) VALUES (
          gen_random_uuid(),
          'CC-PAYMENT-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'),
          'Chase Credit Card',
          '${exp.date}',
          '${exp.date}',
          ${exp.amount},
          '${exp.notes || 'Pago de tarjeta Chase'}',
          'paid',
          'payment',
          true,
          NOW(),
          NOW()
        )
        RETURNING "idSupplierInvoice", "invoiceNumber";
      `, { transaction });

      console.log(`   ✅ SupplierInvoice creado: ${newInvoice[0].invoiceNumber}`);

      // 2. Eliminar Expense
      await sequelize.query(`
        DELETE FROM "Expenses"
        WHERE "idExpense" = '${exp.idExpense}';
      `, { transaction });

      console.log(`   ✅ Expense eliminado\n`);
    }

    await transaction.commit();

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`🎉 ${suspiciousExpenses.length} expense(s) corregido(s)`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Verificar balance después
    const [newBalance] = await sequelize.query(`
      SELECT 
        SUM(amount - "paidAmount") as balance
      FROM "Expenses"
      WHERE "paymentMethod" = 'Chase Credit Card';
    `);

    console.log(`💰 Nuevo balance: $${parseFloat(newBalance[0].balance || 0).toFixed(2)}`);
    console.log(`   (Antes: $127,961.64)\n`);

    process.exit(0);

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixMisclassified();
