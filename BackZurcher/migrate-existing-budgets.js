/**
 * 🔄 SCRIPT DE MIGRACIÓN PARA BUDGETS EXISTENTES
 * 
 * Este script actualiza los budgets existentes que ya tienen comprobante de pago
 * para asegurar que tengan Work, Income y Receipt creados correctamente.
 * 
 * EJECUTAR DESPUÉS DEL DEPLOYMENT Y BACKUP
 */

const { Budget, Work, Income, Receipt, Permit, conn } = require('./src/data');
const { Op } = require('sequelize');

async function migrateBudgetsWithPaymentProof() {
  console.log('🚀 Iniciando migración de budgets con comprobante de pago...\n');
  
  const transaction = await conn.transaction();
  
  try {
    // 1. Buscar todos los budgets que tienen comprobante de pago pero NO están en 'approved'
    const budgetsToUpdate = await Budget.findAll({
      where: {
        paymentInvoice: { [Op.ne]: null },
        status: { [Op.ne]: 'approved' }
      },
      transaction
    });

    console.log(`📊 Encontrados ${budgetsToUpdate.length} budgets con comprobante pero sin aprobar\n`);

    let updatedCount = 0;
    let worksCreated = 0;
    let incomesCreated = 0;
    let receiptsCreated = 0;

    for (const budget of budgetsToUpdate) {
      console.log(`\n--- Procesando Budget #${budget.idBudget} ---`);
      console.log(`   Cliente: ${budget.applicantName}`);
      console.log(`   Dirección: ${budget.propertyAddress}`);
      console.log(`   Status actual: ${budget.status} → approved`);

      // 1. Actualizar status a 'approved'
      await budget.update({ status: 'approved' }, { transaction });
      updatedCount++;

      // 2. Verificar si ya tiene Work
      let work = await Work.findOne({
        where: { idBudget: budget.idBudget },
        transaction
      });

      if (!work) {
        console.log(`   ✨ Creando Work...`);
        const permit = await Permit.findByPk(budget.PermitIdPermit, { transaction });
        
        work = await Work.create({
          propertyAddress: budget.propertyAddress || 'Dirección no especificada',
          applicantName: budget.applicantName || 'Cliente no especificado',
          applicantEmail: permit?.applicantEmail || null,
          idBudget: budget.idBudget,
          status: 'pending',
          startDate: new Date(),
          idPermit: budget.PermitIdPermit
        }, { transaction });

        worksCreated++;
        console.log(`   ✅ Work creado: #${work.idWork}`);
      } else {
        console.log(`   ℹ️  Work ya existe: #${work.idWork}`);
      }

      // 3. Verificar si ya tiene Income
      let income = await Income.findOne({
        where: {
          workId: work.idWork,
          typeIncome: 'Factura Pago Inicial Budget'
        },
        transaction
      });

      if (!income) {
        console.log(`   ✨ Creando Income...`);
        const amount = budget.paymentProofAmount || budget.initialPayment;
        
        income = await Income.create({
          amount: amount,
          date: new Date(),
          typeIncome: 'Factura Pago Inicial Budget',
          notes: `Pago inicial para Budget #${budget.idBudget} (migración)`,
          workId: work.idWork,
          paymentMethod: budget.paymentProofMethod || null,
          verified: false
        }, { transaction });

        incomesCreated++;
        console.log(`   ✅ Income creado: #${income.idIncome} ($${amount})`);
      } else {
        console.log(`   ℹ️  Income ya existe: #${income.idIncome}`);
      }

      // 4. Verificar si ya tiene Receipt
      if (budget.paymentInvoice) {
        let receipt = await Receipt.findOne({
          where: {
            relatedModel: 'Income',
            relatedId: income.idIncome
          },
          transaction
        });

        if (!receipt) {
          console.log(`   ✨ Creando Receipt...`);
          
          // Extraer public_id del URL de Cloudinary
          const publicId = budget.paymentInvoice.split('/').slice(-2).join('/').split('.')[0];
          
          receipt = await Receipt.create({
            relatedModel: 'Income',
            relatedId: income.idIncome,
            type: 'income',
            notes: `Comprobante de pago inicial para Budget #${budget.idBudget} (migración)`,
            fileUrl: budget.paymentInvoice,
            publicId: publicId,
            mimeType: budget.paymentProofType === 'pdf' ? 'application/pdf' : 'image/jpeg',
            originalName: `comprobante_pago_inicial_${budget.idBudget}.pdf`
          }, { transaction });

          receiptsCreated++;
          console.log(`   ✅ Receipt creado: #${receipt.idReceipt}`);
        } else {
          console.log(`   ℹ️  Receipt ya existe: #${receipt.idReceipt}`);
        }
      }
    }

    await transaction.commit();

    console.log('\n\n' + '='.repeat(60));
    console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log(`📊 Estadísticas:`);
    console.log(`   - Budgets actualizados a 'approved': ${updatedCount}`);
    console.log(`   - Works creados: ${worksCreated}`);
    console.log(`   - Incomes creados: ${incomesCreated}`);
    console.log(`   - Receipts creados: ${receiptsCreated}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ ERROR EN LA MIGRACIÓN:', error);
    console.error('\nLa transacción fue revertida. No se realizaron cambios.\n');
    throw error;
  }
}

// Ejecutar migración
migrateBudgetsWithPaymentProof()
  .then(() => {
    console.log('✅ Script de migración finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
