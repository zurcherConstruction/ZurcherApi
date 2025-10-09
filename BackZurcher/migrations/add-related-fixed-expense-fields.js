/**
 * Migración: Agregar campos relacionados a Fixed Expenses en la tabla Expenses
 * 
 * Propósito:
 * - Agregar relatedFixedExpenseId: Para rastrear qué Fixed Expense generó este Expense
 * - Agregar vendor: Nombre del proveedor/beneficiario del gasto
 * 
 * Uso: node run-migration.js add-related-fixed-expense-fields
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('� Iniciando migración: add-related-fixed-expense-fields');
    
    try {
      // Verificar si las columnas ya existen
      const tableDescription = await queryInterface.describeTable('Expenses');
      
      // 1. Agregar relatedFixedExpenseId si no existe
      if (!tableDescription.relatedFixedExpenseId) {
        console.log('➕ Agregando columna relatedFixedExpenseId a Expenses...');
        await queryInterface.addColumn('Expenses', 'relatedFixedExpenseId', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'FixedExpenses',
            key: 'idFixedExpense'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Referencia al gasto fijo que generó este expense'
        });
        console.log('✅ Columna relatedFixedExpenseId agregada correctamente');
      } else {
        console.log('⏭️  Columna relatedFixedExpenseId ya existe, saltando...');
      }

      // 2. Agregar vendor si no existe
      if (!tableDescription.vendor) {
        console.log('➕ Agregando columna vendor a Expenses...');
        await queryInterface.addColumn('Expenses', 'vendor', {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Nombre del proveedor/beneficiario del gasto'
        });
        console.log('✅ Columna vendor agregada correctamente');
      } else {
        console.log('⏭️  Columna vendor ya existe, saltando...');
      }

      console.log('\n✅ Migración completada exitosamente!');
      console.log('\n📊 Resumen:');
      console.log('   - relatedFixedExpenseId: Para rastrear gastos generados desde Fixed Expenses');
      console.log('   - vendor: Para almacenar nombre del proveedor/beneficiario');
      console.log('\n💡 Ahora puedes generar Expenses automáticamente desde Fixed Expenses');

    } catch (error) {
      console.error('\n❌ Error durante la migración:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Revirtiendo migración: add-related-fixed-expense-fields');
    
    try {
      console.log('📝 Eliminando columnas agregadas...');
      
      await queryInterface.removeColumn('Expenses', 'relatedFixedExpenseId');
      console.log('✅ Columna relatedFixedExpenseId eliminada');
      
      await queryInterface.removeColumn('Expenses', 'vendor');
      console.log('✅ Columna vendor eliminada');

      console.log('✅ Reversión completada');
    } catch (error) {
      console.error('❌ Error revirtiendo migración:', error);
      throw error;
    }
  }
};

