/**
 * Script de migración para reparar budgets con pago inicial pero sin Work/Income
 * 
 * Este script busca budgets que:
 * 1. Tienen paymentProofAmount (pago inicial cargado)
 * 2. NO tienen Work asociado
 * 3. Crea el Work + Income + Receipt correspondiente
 * 
 * Uso: node fix-missing-works-incomes.js [--dry-run]
 */

require('dotenv').config();
const { Budget, Work, Income, Receipt, conn } = require('./src/data');
const { Op } = require('sequelize');

const DRY_RUN = process.argv.includes('--dry-run');

async function fixMissingWorksAndIncomes() {
  console.log('🔍 Buscando budgets con pago inicial pero sin Work asociado...\n');
  
  if (DRY_RUN) {
    console.log('⚠️  MODO DRY-RUN: Solo se mostrarán los cambios, NO se aplicarán\n');
  }

  const transaction = await conn.transaction();

  try {
    // 1. Buscar budgets con paymentProofAmount pero sin Work
    const budgetsWithPayment = await Budget.findAll({
      where: {
        paymentProofAmount: {
          [Op.ne]: null,
          [Op.gt]: 0
        }
      },
      attributes: [
        'idBudget', 
        'paymentProofAmount', 
        'paymentProofMethod',
        'paymentInvoice',
        'paymentProofType',
        'propertyAddress',
        'status',
        'initialPayment',
        'createdAt'
      ],
      order: [['idBudget', 'ASC']]
    });

    console.log(`📊 Total de budgets con pago inicial: ${budgetsWithPayment.length}\n`);

    const budgetsToFix = [];

    // 2. Verificar cuáles NO tienen Work
    for (const budget of budgetsWithPayment) {
      const existingWork = await Work.findOne({
        where: { idBudget: budget.idBudget }
      });

      if (!existingWork) {
        budgetsToFix.push(budget);
      }
    }

    console.log(`🔧 Budgets que necesitan reparación: ${budgetsToFix.length}\n`);

    if (budgetsToFix.length === 0) {
      console.log('✅ No hay budgets que reparar. Todos tienen Work asociado.\n');
      await transaction.rollback();
      return;
    }

    // 3. Mostrar lista de budgets a reparar
    console.log('📋 Lista de budgets a reparar:\n');
    budgetsToFix.forEach((budget, index) => {
      console.log(`${index + 1}. Budget #${budget.idBudget}`);
      console.log(`   Dirección: ${budget.propertyAddress}`);
      console.log(`   Monto pago: $${budget.paymentProofAmount}`);
      console.log(`   Método: ${budget.paymentProofMethod || 'No especificado'}`);
      console.log(`   Estado: ${budget.status}`);
      console.log(`   Fecha carga: ${budget.createdAt.toLocaleDateString()}`);
      console.log('');
    });

    if (DRY_RUN) {
      console.log('⚠️  DRY-RUN: No se aplicarán cambios. Ejecuta sin --dry-run para reparar.\n');
      await transaction.rollback();
      return;
    }

    // 4. Confirmar antes de proceder
    console.log(`\n⚠️  Se crearán Work + Income + Receipt para ${budgetsToFix.length} budgets`);
    console.log('Presiona Ctrl+C para cancelar o espera 5 segundos para continuar...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🚀 Iniciando reparación...\n');

    let successCount = 0;
    let errorCount = 0;

    // 5. Reparar cada budget
    for (const budget of budgetsToFix) {
      try {
        const amountForIncome = parseFloat(budget.paymentProofAmount);
        const now = new Date();
        const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        console.log(`📝 Reparando Budget #${budget.idBudget}...`);

        // Crear Work
        const newWork = await Work.create({
          propertyAddress: budget.propertyAddress,
          status: 'pending',
          idBudget: budget.idBudget,
          notes: `Work creado por script de migración - pago inicial registrado previamente`,
          initialPayment: amountForIncome,
          staffId: null // Sistema
        }, { transaction });

        console.log(`   ✅ Work creado: ${newWork.idWork}`);

        // Crear Income
        const newIncome = await Income.create({
          date: localDate,
          amount: amountForIncome,
          typeIncome: 'Factura Pago Inicial Budget',
          notes: `Pago inicial recuperado por script de migración para Budget #${budget.idBudget}`,
          workId: newWork.idWork,
          staffId: null, // Sistema
          paymentMethod: budget.paymentProofMethod || null,
          verified: false
        }, { transaction });

        console.log(`   ✅ Income creado: ${newIncome.idIncome} - $${amountForIncome}`);

        // Crear Receipt si hay comprobante
        if (budget.paymentInvoice) {
          // Extraer public_id del URL de Cloudinary
          const urlParts = budget.paymentInvoice.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const folderIndex = urlParts.indexOf('payment_proofs');
          const publicId = folderIndex !== -1 
            ? `payment_proofs/${fileName}` 
            : fileName;

          await Receipt.create({
            relatedModel: 'Income',
            relatedId: newIncome.idIncome,
            type: 'Factura Pago Inicial Budget',
            notes: `Comprobante recuperado por script de migración para Budget #${budget.idBudget}`,
            fileUrl: budget.paymentInvoice,
            publicId: publicId,
            mimeType: budget.paymentProofType === 'pdf' ? 'application/pdf' : 'image/jpeg',
            originalName: `payment_proof_${budget.idBudget}`,
            staffId: null
          }, { transaction });

          console.log(`   ✅ Receipt creado para Income: ${newIncome.idIncome}`);
        }

        successCount++;
        console.log(`   ✅ Budget #${budget.idBudget} reparado exitosamente\n`);

      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error reparando Budget #${budget.idBudget}:`, error.message);
        console.log('');
      }
    }

    // 6. Commit de la transacción
    await transaction.commit();

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE REPARACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Reparados exitosamente: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📋 Total procesados: ${budgetsToFix.length}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await conn.close();
  }
}

// Ejecutar el script
fixMissingWorksAndIncomes()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
