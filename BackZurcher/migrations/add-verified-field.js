/**
 * Migración: Agregar campo 'verified' a las tablas Incomes y Expenses
 * 
 * Propósito:
 * - Permite marcar ingresos y gastos como verificados/revisados
 * - Útil para control financiero y auditoría
 * - Ayuda a identificar transacciones pendientes de revisión
 * 
 * Cambios:
 * 1. Agrega columna 'verified' (BOOLEAN, DEFAULT false) a tabla Incomes
 * 2. Agrega columna 'verified' (BOOLEAN, DEFAULT false) a tabla Expenses
 * 
 * Autor: Sistema de Migraciones
 * Fecha: Octubre 2025
 */

const { Sequelize } = require('sequelize');

async function up(queryInterface, SequelizeTypes) {
  console.log('\n🚀 Iniciando migración: Agregar campo verified a Incomes y Expenses\n');
  
  const transaction = await queryInterface.sequelize.transaction();

  try {
    // ============================================
    // 1. AGREGAR COLUMNA 'verified' A INCOMES
    // ============================================
    console.log('📋 Paso 1: Verificando columna verified en tabla Incomes...');
    
    const incomesTableInfo = await queryInterface.describeTable('Incomes', { transaction });
    
    if (!incomesTableInfo.verified) {
      console.log('   ➕ Agregando columna verified a Incomes...');
      
      await queryInterface.addColumn(
        'Incomes',
        'verified',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Indica si el ingreso ha sido verificado/revisado por el equipo de finanzas'
        },
        { transaction }
      );
      
      console.log('   ✅ Columna verified agregada a Incomes exitosamente');
    } else {
      console.log('   ⏭️  Columna verified ya existe en Incomes');
    }

    // ============================================
    // 2. AGREGAR COLUMNA 'verified' A EXPENSES
    // ============================================
    console.log('\n📋 Paso 2: Verificando columna verified en tabla Expenses...');
    
    const expensesTableInfo = await queryInterface.describeTable('Expenses', { transaction });
    
    if (!expensesTableInfo.verified) {
      console.log('   ➕ Agregando columna verified a Expenses...');
      
      await queryInterface.addColumn(
        'Expenses',
        'verified',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Indica si el gasto ha sido verificado/revisado por el equipo de finanzas'
        },
        { transaction }
      );
      
      console.log('   ✅ Columna verified agregada a Expenses exitosamente');
    } else {
      console.log('   ⏭️  Columna verified ya existe en Expenses');
    }

    // ============================================
    // COMMIT DE LA TRANSACCIÓN
    // ============================================
    await transaction.commit();
    
    console.log('\n✅ Migración completada exitosamente!');
    console.log('\n📊 Resumen de cambios:');
    console.log('   • Columna verified agregada a Incomes (BOOLEAN, default: false)');
    console.log('   • Columna verified agregada a Expenses (BOOLEAN, default: false)');
    console.log('\n💡 Beneficios:');
    console.log('   • Control financiero mejorado');
    console.log('   • Seguimiento de transacciones revisadas');
    console.log('   • Identificación visual de items pendientes de revisión');
    console.log('   • Auditoría y trazabilidad de verificaciones\n');

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ Error durante la migración:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

async function down(queryInterface, SequelizeTypes) {
  console.log('\n🔄 Iniciando rollback: Eliminar campo verified de Incomes y Expenses\n');
  
  const transaction = await queryInterface.sequelize.transaction();

  try {
    // ============================================
    // 1. ELIMINAR COLUMNA 'verified' DE INCOMES
    // ============================================
    console.log('📋 Paso 1: Verificando columna verified en Incomes...');
    
    const incomesTableInfo = await queryInterface.describeTable('Incomes', { transaction });
    
    if (incomesTableInfo.verified) {
      console.log('   ➖ Eliminando columna verified de Incomes...');
      await queryInterface.removeColumn('Incomes', 'verified', { transaction });
      console.log('   ✅ Columna verified eliminada de Incomes');
    } else {
      console.log('   ⏭️  Columna verified no existe en Incomes');
    }

    // ============================================
    // 2. ELIMINAR COLUMNA 'verified' DE EXPENSES
    // ============================================
    console.log('\n📋 Paso 2: Verificando columna verified en Expenses...');
    
    const expensesTableInfo = await queryInterface.describeTable('Expenses', { transaction });
    
    if (expensesTableInfo.verified) {
      console.log('   ➖ Eliminando columna verified de Expenses...');
      await queryInterface.removeColumn('Expenses', 'verified', { transaction });
      console.log('   ✅ Columna verified eliminada de Expenses');
    } else {
      console.log('   ⏭️  Columna verified no existe en Expenses');
    }

    // ============================================
    // COMMIT DE LA TRANSACCIÓN
    // ============================================
    await transaction.commit();
    
    console.log('\n✅ Rollback completado exitosamente!');
    console.log('   • Columna verified eliminada de Incomes');
    console.log('   • Columna verified eliminada de Expenses\n');

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ Error durante el rollback:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

module.exports = { up, down };
