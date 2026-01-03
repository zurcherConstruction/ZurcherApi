#!/usr/bin/env node

const { sequelize, FixedExpense, FixedExpensePayment, Staff } = require('../src/data');

async function viewFixedExpenses() {
  try {
    console.log('\n📊 CONECTANDO A LA BASE DE DATOS...\n');
    
    // 1️⃣ VER TODOS LOS GASTOS FIJOS
    console.log('═'.repeat(100));
    console.log('1️⃣  TODOS LOS GASTOS FIJOS CON DETALLES');
    console.log('═'.repeat(100));
    
    const allExpenses = await FixedExpense.findAll({
      include: [
        {
          model: Staff,
          as: 'createdBy',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (allExpenses.length === 0) {
      console.log('❌ No hay gastos fijos registrados\n');
    } else {
      allExpenses.forEach((expense, index) => {
        const formatDate = (date) => {
          if (!date) return 'N/A';
          if (typeof date === 'string') return date;
          return date.toLocaleDateString ? date.toLocaleDateString() : String(date);
        };
        
        console.log(`\n${index + 1}. ${expense.name}`);
        console.log(`   ID: ${expense.idFixedExpense}`);
        console.log(`   Descripción: ${expense.description || 'N/A'}`);
        console.log(`   Categoría: ${expense.category}`);
        console.log(`   Frecuencia: ${expense.frequency}`);
        console.log(`   Monto Total: $${expense.totalAmount}`);
        console.log(`   Monto Pagado: $${expense.paidAmount}`);
        console.log(`   Monto Pendiente: $${expense.totalAmount - expense.paidAmount}`);
        console.log(`   Estado: ${expense.paymentStatus}`);
        console.log(`   Próximo Vencimiento: ${formatDate(expense.nextDueDate)}`);
        console.log(`   Activo: ${expense.isActive ? '✅ Sí' : '❌ No'}`);
        console.log(`   Creado por: ${expense.createdBy?.name || 'N/A'}`);
        console.log(`   Fecha de creación: ${formatDate(expense.createdAt)}`);
      });
    }

    // 2️⃣ RESUMEN POR CATEGORÍA
    console.log('\n\n' + '═'.repeat(100));
    console.log('2️⃣  RESUMEN POR CATEGORÍA');
    console.log('═'.repeat(100));

    const categorySummary = await sequelize.query(`
      SELECT 
        "category",
        COUNT(*) AS "totalExpenses",
        SUM("totalAmount")::numeric AS "totalAmount",
        SUM("paidAmount")::numeric AS "totalPaid",
        (SUM("totalAmount") - SUM("paidAmount"))::numeric AS "totalPending",
        COUNT(CASE WHEN "paymentStatus" = 'paid' THEN 1 END) AS "paidCount",
        COUNT(CASE WHEN "paymentStatus" = 'unpaid' THEN 1 END) AS "unpaidCount",
        COUNT(CASE WHEN "paymentStatus" = 'partial' THEN 1 END) AS "partialCount"
      FROM "FixedExpenses"
      WHERE "isActive" = true
      GROUP BY "category"
      ORDER BY "totalAmount" DESC
    `, { type: sequelize.QueryTypes.SELECT });

    if (categorySummary.length === 0) {
      console.log('❌ No hay categorías con gastos activos\n');
    } else {
      console.log('\nCategoría | Gastos | Total | Pagado | Pendiente | Pagos | Impagos | Parciales');
      console.log('─'.repeat(100));
      categorySummary.forEach(cat => {
        console.log(
          `${String(cat.category).padEnd(15)} | ${String(cat.totalExpenses).padEnd(6)} | ` +
          `$${String(cat.totalAmount).padEnd(10)} | $${String(cat.totalPaid).padEnd(8)} | ` +
          `$${String(cat.totalPending).padEnd(9)} | ${String(cat.paidCount).padEnd(5)} | ` +
          `${String(cat.unpaidCount).padEnd(7)} | ${cat.partialCount}`
        );
      });
    }

    // 3️⃣ RESUMEN GENERAL
    console.log('\n\n' + '═'.repeat(100));
    console.log('3️⃣  RESUMEN GENERAL');
    console.log('═'.repeat(100));

    const generalSummary = await sequelize.query(`
      SELECT 
        COUNT(*) AS "totalFixedExpenses",
        COUNT(CASE WHEN "isActive" = true THEN 1 END) AS "activeExpenses",
        COUNT(CASE WHEN "isActive" = false THEN 1 END) AS "inactiveExpenses",
        SUM("totalAmount")::numeric AS "totalCommitment",
        SUM("paidAmount")::numeric AS "totalPaid",
        (SUM("totalAmount") - SUM("paidAmount"))::numeric AS "totalPending",
        COUNT(CASE WHEN "paymentStatus" = 'paid' THEN 1 END) AS "fullyPaidCount",
        COUNT(CASE WHEN "paymentStatus" = 'partial' THEN 1 END) AS "partiallyPaidCount",
        COUNT(CASE WHEN "paymentStatus" = 'unpaid' THEN 1 END) AS "unpaidCount"
      FROM "FixedExpenses"
    `, { type: sequelize.QueryTypes.SELECT });

    if (generalSummary.length > 0) {
      const summary = generalSummary[0];
      console.log(`\nTotal de Gastos Fijos: ${summary.totalFixedExpenses}`);
      console.log(`  ✅ Activos: ${summary.activeExpenses}`);
      console.log(`  ❌ Inactivos: ${summary.inactiveExpenses}`);
      console.log(`\nMonto Total Comprometido: $${summary.totalCommitment || 0}`);
      console.log(`Monto Total Pagado: $${summary.totalPaid || 0}`);
      console.log(`Monto Total Pendiente: $${summary.totalPending || 0}`);
      console.log(`\nEstados:`);
      console.log(`  💰 Completamente Pagados: ${summary.fullyPaidCount}`);
      console.log(`  ⚠️  Pagos Parciales: ${summary.partiallyPaidCount}`);
      console.log(`  ❌ Impagos: ${summary.unpaidCount}`);
    }

    // 4️⃣ PRÓXIMOS VENCIMIENTOS
    console.log('\n\n' + '═'.repeat(100));
    console.log('4️⃣  PRÓXIMOS VENCIMIENTOS (próximos 30 días)');
    console.log('═'.repeat(100));

    const upcomingDue = await sequelize.query(`
      SELECT 
        "idFixedExpense",
        "name",
        "totalAmount"::numeric,
        "nextDueDate",
        "paymentStatus",
        "frequency",
        (CURRENT_DATE - "nextDueDate") AS "daysOverdue"
      FROM "FixedExpenses"
      WHERE "isActive" = true 
        AND "nextDueDate" <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY "nextDueDate" ASC
    `, { type: sequelize.QueryTypes.SELECT });

    if (upcomingDue.length === 0) {
      console.log('\n✅ No hay vencimientos en los próximos 30 días\n');
    } else {
      console.log('\nGasto | Monto | Vencimiento | Estado | Días Vencido | Frecuencia');
      console.log('─'.repeat(100));
      upcomingDue.forEach(due => {
        const daysOverdue = Math.floor(due.daysOverdue) || 0;
        const status = due.paymentStatus === 'paid' ? '✅' : due.paymentStatus === 'partial' ? '⚠️ ' : '❌';
        const dueDate = typeof due.nextDueDate === 'string' ? due.nextDueDate : (due.nextDueDate?.toLocaleDateString ? due.nextDueDate.toLocaleDateString() : String(due.nextDueDate));
        console.log(
          `${due.name.padEnd(20)} | $${String(due.totalAmount).padEnd(8)} | ` +
          `${dueDate.padEnd(11)} | ${status} ${due.paymentStatus.padEnd(7)} | ` +
          `${daysOverdue > 0 ? `⚠️ ${daysOverdue}` : '✅ OK'} | ${due.frequency}`
        );
      });
    }

    // 5️⃣ GASTOS CON PAGOS
    console.log('\n\n' + '═'.repeat(100));
    console.log('5️⃣  GASTOS CON HISTORIAL DE PAGOS');
    console.log('═'.repeat(100));

    const expensesWithPayments = await FixedExpense.findAll({
      include: [
        {
          model: FixedExpensePayment,
          as: 'payments',
          required: false,
          include: [
            {
              model: Staff,
              as: 'createdBy',
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      where: { isActive: true },
      order: [
        ['createdAt', 'DESC'],
        ['payments', 'paymentDate', 'DESC']
      ]
    });

    const expensesWithPaymentList = expensesWithPayments.filter(e => e.payments && e.payments.length > 0);

    if (expensesWithPaymentList.length === 0) {
      console.log('\n❌ No hay gastos fijos con pagos registrados\n');
    } else {
      expensesWithPaymentList.forEach((expense, index) => {
        const formatDate = (date) => {
          if (!date) return 'N/A';
          if (typeof date === 'string') return date;
          return date.toLocaleDateString ? date.toLocaleDateString() : String(date);
        };
        
        console.log(`\n${index + 1}. ${expense.name}`);
        console.log(`   Total: $${expense.totalAmount} | Pagado: $${expense.paidAmount} | Estado: ${expense.paymentStatus}`);
        expense.payments.forEach((payment, pIdx) => {
          console.log(`   ${pIdx + 1}. Pago de $${payment.amount} el ${formatDate(payment.paymentDate)}`);
          console.log(`      Período: ${formatDate(payment.periodStart)} - ${formatDate(payment.periodEnd)}`);
          console.log(`      Método: ${payment.paymentMethod} | Creado por: ${payment.createdBy?.name || 'N/A'}`);
        });
      });
    }

    console.log('\n\n✅ REPORTE COMPLETADO\n');

  } catch (error) {
    console.error('❌ Error al consultar datos:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

viewFixedExpenses();
