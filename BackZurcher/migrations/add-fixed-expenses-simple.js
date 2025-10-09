const { Sequelize } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🚀 Iniciando migración: add-fixed-expenses-simple');
    
    try {
      // 1. Agregar 'Gasto Fijo' al ENUM de Expenses.typeExpense
      console.log('📝 Agregando "Gasto Fijo" a Expenses.typeExpense...');
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_Expenses_typeExpense" ADD VALUE IF NOT EXISTS 'Gasto Fijo';
      `);
      console.log('✅ "Gasto Fijo" agregado a Expenses.typeExpense');

      // 2. Agregar 'Gasto Fijo' al ENUM de Receipts.type
      console.log('📝 Agregando "Gasto Fijo" a Receipts.type...');
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_Receipts_type" ADD VALUE IF NOT EXISTS 'Gasto Fijo';
      `);
      console.log('✅ "Gasto Fijo" agregado a Receipts.type');

      // 3. Eliminar tabla FixedExpenses si existe (para evitar conflictos)
      console.log('📝 Eliminando tabla FixedExpenses existente si la hay...');
      await queryInterface.dropTable('FixedExpenses').catch(() => {
        console.log('ℹ️  Tabla FixedExpenses no existía, continuando...');
      });

      // 4. Crear tabla FixedExpenses
      console.log('📝 Creando tabla FixedExpenses...');
      await queryInterface.createTable('FixedExpenses', {
        idFixedExpense: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
          comment: 'Nombre del gasto fijo (ej: "Alquiler Oficina", "Seguro Vehículo")'
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Descripción detallada del gasto fijo'
        },
        amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          comment: 'Monto del gasto fijo'
        },
        frequency: {
          type: Sequelize.ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one-time'),
          allowNull: false,
          defaultValue: 'monthly',
          comment: 'Frecuencia del gasto'
        },
        paymentMethod: {
          type: Sequelize.ENUM(
            'Cap Trabajos Septic',
            'Capital Proyectos Septic',
            'Chase Bank',
            'AMEX',
            'Chase Credit Card',
            'Cheque',
            'Transferencia Bancaria',
            'Efectivo',
            'Zelle',
            'Tarjeta Débito',
            'PayPal',
            'Otro'
          ),
          allowNull: true,
          comment: 'Método de pago predeterminado'
        },
        paymentDetails: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Detalles del método de pago'
        },
        category: {
          type: Sequelize.ENUM(
            'Alquiler',
            'Servicios Públicos',
            'Seguros',
            'Salarios',
            'Suscripciones',
            'Mantenimiento',
            'Impuestos',
            'Otro'
          ),
          allowNull: false,
          defaultValue: 'Otro',
          comment: 'Categoría del gasto fijo'
        },
        nextDueDate: {
          type: Sequelize.DATEONLY,
          allowNull: true,
          comment: 'Próxima fecha de vencimiento'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Indica si el gasto fijo está activo'
        },
        autoGenerate: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Si es true, genera automáticamente el gasto en Expenses'
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Notas adicionales'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
        }
      });
      console.log('✅ Tabla FixedExpenses creada exitosamente');

      console.log('✅ Migración completada exitosamente');
    } catch (error) {
      console.error('❌ Error en la migración:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Revirtiendo migración: add-fixed-expenses-simple');
    
    try {
      // 1. Eliminar tabla FixedExpenses
      console.log('📝 Eliminando tabla FixedExpenses...');
      await queryInterface.dropTable('FixedExpenses');
      console.log('✅ Tabla FixedExpenses eliminada');

      // Nota: No se pueden eliminar valores de un ENUM en PostgreSQL fácilmente
      // Se necesitaría recrear todo el ENUM, lo cual es muy riesgoso
      console.log('⚠️  Los valores agregados a los ENUMs no se pueden eliminar fácilmente');
      console.log('⚠️  Esto no afecta la funcionalidad del sistema');

      console.log('✅ Reversión completada');
    } catch (error) {
      console.error('❌ Error revirtiendo migración:', error);
      throw error;
    }
  }
};
