/**
 * MIGRACIÓN: Agregar campo paymentMethod a Income y Expense
 * 
 * Este script agrega el campo 'paymentMethod' (método/cuenta de pago) 
 * a las tablas Incomes y Expenses para rastrear cómo se recibió o pagó el dinero.
 * 
 * Ejemplos de valores:
 * - "Zelle"
 * - "Cash"
 * - "Check #1234"
 * - "Bank Transfer - Chase"
 * - "Credit Card - Visa"
 * - "PayPal"
 * - "Wire Transfer"
 * 
 * Fecha: Octubre 2025
 */

const { QueryInterface, DataTypes } = require('sequelize');

module.exports = {
  /**
   * Ejecutar la migración
   * @param {QueryInterface} queryInterface 
   */
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🚀 Iniciando migración: Agregar campo paymentMethod...\n');

      // ============================================================
      // 1. AGREGAR paymentMethod A INCOMES
      // ============================================================
      console.log('📝 Paso 1: Verificando columna paymentMethod en Incomes...');
      
      const [incomeColumns] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Incomes' 
        AND column_name = 'paymentMethod';
      `, { transaction });

      if (incomeColumns.length === 0) {
        await queryInterface.addColumn('Incomes', 'paymentMethod', {
          type: DataTypes.STRING,
          allowNull: true,
          comment: 'Método de pago o cuenta por la que ingresó el dinero'
        }, { transaction });
        console.log('   ✅ Agregada columna "paymentMethod" a Incomes');
      } else {
        console.log('   ⏭️  Columna "paymentMethod" ya existe en Incomes');
      }

      // ============================================================
      // 2. AGREGAR paymentMethod A EXPENSES
      // ============================================================
      console.log('\n📝 Paso 2: Verificando columna paymentMethod en Expenses...');
      
      const [expenseColumns] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Expenses' 
        AND column_name = 'paymentMethod';
      `, { transaction });

      if (expenseColumns.length === 0) {
        await queryInterface.addColumn('Expenses', 'paymentMethod', {
          type: DataTypes.STRING,
          allowNull: true,
          comment: 'Método de pago o cuenta por la que se realizó el gasto'
        }, { transaction });
        console.log('   ✅ Agregada columna "paymentMethod" a Expenses');
      } else {
        console.log('   ⏭️  Columna "paymentMethod" ya existe en Expenses');
      }

      // ============================================================
      // COMMIT DE LA TRANSACCIÓN
      // ============================================================
      await transaction.commit();
      console.log('\n✅ ¡Migración completada exitosamente!');
      console.log('\n📊 Resumen:');
      console.log('   • Incomes: Agregado campo "paymentMethod"');
      console.log('   • Expenses: Agregado campo "paymentMethod"');
      console.log('\n💡 Ahora puedes registrar el método de pago para cada transacción:');
      console.log('   Ejemplos: Zelle, Cash, Check #1234, Bank Transfer - Chase, etc.');
      console.log('\n✨ La base de datos está lista para rastrear métodos de pago.\n');

    } catch (error) {
      await transaction.rollback();
      console.error('\n❌ Error durante la migración:', error);
      throw error;
    }
  },

  /**
   * Revertir la migración
   * @param {QueryInterface} queryInterface 
   */
  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('⏪ Revirtiendo migración: Eliminar campo paymentMethod...\n');

      // ============================================================
      // ELIMINAR COLUMNAS
      // ============================================================
      console.log('📝 Eliminando columna paymentMethod de Incomes...');
      try {
        await queryInterface.removeColumn('Incomes', 'paymentMethod', { transaction });
        console.log('   ✅ Eliminada columna "paymentMethod" de Incomes');
      } catch (error) {
        console.log('   ⏭️  Columna "paymentMethod" no existe en Incomes');
      }

      console.log('\n📝 Eliminando columna paymentMethod de Expenses...');
      try {
        await queryInterface.removeColumn('Expenses', 'paymentMethod', { transaction });
        console.log('   ✅ Eliminada columna "paymentMethod" de Expenses');
      } catch (error) {
        console.log('   ⏭️  Columna "paymentMethod" no existe en Expenses');
      }

      await transaction.commit();
      console.log('\n✅ Rollback completado exitosamente.\n');

    } catch (error) {
      await transaction.rollback();
      console.error('\n❌ Error durante el rollback:', error);
      throw error;
    }
  }
};
