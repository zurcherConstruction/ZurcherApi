/**
 * Migración: Recrear tabla FixedExpenses correctamente
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Limpiando y recreando tabla FixedExpenses...\n');

    try {
      // 1. Eliminar tabla si existe
      console.log('🗑️  Eliminando tabla FixedExpenses si existe...');
      await queryInterface.dropTable('FixedExpenses').catch(() => {
        console.log('   ℹ️  Tabla no existía');
      });

      // 2. Eliminar ENUMs si existen
      console.log('🗑️  Limpiando ENUMs antiguos...');
      await queryInterface.sequelize.query(`
        DROP TYPE IF EXISTS "enum_FixedExpenses_frequency" CASCADE;
        DROP TYPE IF EXISTS "enum_FixedExpenses_paymentMethod" CASCADE;
        DROP TYPE IF EXISTS "enum_FixedExpenses_category" CASCADE;
      `);

      // 3. Crear ENUMs (exactamente como en el modelo)
      console.log('📝 Creando ENUMs...');
      await queryInterface.sequelize.query(`
        CREATE TYPE "enum_FixedExpenses_frequency" AS ENUM ('monthly', 'biweekly', 'weekly', 'quarterly', 'semiannual', 'annual', 'one_time');
        CREATE TYPE "enum_FixedExpenses_paymentMethod" AS ENUM ('Cap Trabajos Septic', 'Capital Proyectos Septic', 'Chase Bank', 'AMEX', 'Chase Credit Card', 'Cheque', 'Transferencia Bancaria', 'Efectivo', 'Zelle', 'Tarjeta Débito', 'PayPal', 'Otro');
        CREATE TYPE "enum_FixedExpenses_category" AS ENUM ('Renta', 'Servicios', 'Seguros', 'Salarios', 'Equipamiento', 'Software/Subscripciones', 'Mantenimiento Vehicular', 'Combustible', 'Impuestos', 'Contabilidad/Legal', 'Marketing', 'Telefonía', 'Otros');
      `);

      // 4. Crear tabla completa
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
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        frequency: {
          type: Sequelize.ENUM('monthly', 'biweekly', 'weekly', 'quarterly', 'semiannual', 'annual', 'one_time'),
          allowNull: false,
          defaultValue: 'monthly',
        },
        category: {
          type: Sequelize.ENUM('Renta', 'Servicios', 'Seguros', 'Salarios', 'Equipamiento', 'Software/Subscripciones', 'Mantenimiento Vehicular', 'Combustible', 'Impuestos', 'Contabilidad/Legal', 'Marketing', 'Telefonía', 'Otros'),
          allowNull: false,
        },
        paymentMethod: {
          type: Sequelize.ENUM('Cap Trabajos Septic', 'Capital Proyectos Septic', 'Chase Bank', 'AMEX', 'Chase Credit Card', 'Cheque', 'Transferencia Bancaria', 'Efectivo', 'Zelle', 'Tarjeta Débito', 'PayPal', 'Otro'),
          allowNull: false,
        },
        paymentAccount: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        startDate: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        endDate: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        nextDueDate: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        autoCreateExpense: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        vendor: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        accountNumber: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        createdByStaffId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'Staffs',
            key: 'id'
          }
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

      console.log('✅ Tabla FixedExpenses creada correctamente');

    } catch (error) {
      console.error('❌ Error:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('FixedExpenses');
  }
};
