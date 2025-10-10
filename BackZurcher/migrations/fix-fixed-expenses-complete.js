/**
 * Migración: Recrear tabla FixedExpenses de forma segura (COMPLETA)
 * 
 * Esta migración es segura para ejecutar en producción:
 * - Verifica si la tabla existe
 * - Verifica si tiene las columnas correctas
 * - Solo recrea si es necesario
 * - No elimina datos si la tabla está correcta
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Verificando y corrigiendo tabla FixedExpenses...\n');

    try {
      // 1. Verificar si la tabla existe
      const [tables] = await queryInterface.sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'FixedExpenses';
      `);

      const tableExists = tables.length > 0;

      if (!tableExists) {
        console.log('📝 La tabla FixedExpenses no existe. Se creará automáticamente por Sequelize.');
        console.log('✅ No se requiere acción.');
        return;
      }

      console.log('📊 La tabla FixedExpenses existe. Verificando estructura...');

      // 2. Verificar columnas existentes
      const [columns] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'FixedExpenses'
        ORDER BY column_name;
      `);

      const columnNames = columns.map(c => c.column_name);
      const hasCategoryColumn = columnNames.includes('category');
      const hasPaymentMethodColumn = columnNames.includes('paymentMethod');

      console.log('📋 Columnas críticas:');
      console.log(`   - category: ${hasCategoryColumn ? '✅' : '❌'}`);
      console.log(`   - paymentMethod: ${hasPaymentMethodColumn ? '✅' : '❌'}`);

      // 3. Si la tabla está correcta, no hacer nada
      if (hasCategoryColumn && hasPaymentMethodColumn) {
        console.log('\n✅ La tabla está correcta. No se requiere acción.');
        return;
      }

      // 4. Si la tabla está incompleta, recrearla
      console.log('\n⚠️  La tabla está incompleta. Recreando...');

      // 4.1. Contar registros
      const [countResult] = await queryInterface.sequelize.query(`
        SELECT COUNT(*) as count FROM "FixedExpenses";
      `);
      const recordCount = parseInt(countResult[0].count);

      if (recordCount > 0) {
        console.log(`⚠️  ADVERTENCIA: Se perderán ${recordCount} registros incompletos.`);
      }

      // 4.2. Eliminar tabla
      console.log('🗑️  Eliminando tabla incompleta...');
      await queryInterface.dropTable('FixedExpenses');

      // 4.3. Eliminar ENUMs
      console.log('🗑️  Limpiando ENUMs...');
      await queryInterface.sequelize.query(`
        DROP TYPE IF EXISTS "enum_FixedExpenses_frequency" CASCADE;
        DROP TYPE IF EXISTS "enum_FixedExpenses_paymentMethod" CASCADE;
        DROP TYPE IF EXISTS "enum_FixedExpenses_category" CASCADE;
      `);

      // 4.4. Crear ENUMs
      console.log('📝 Creando ENUMs...');
      await queryInterface.sequelize.query(`
        CREATE TYPE "enum_FixedExpenses_frequency" AS ENUM ('monthly', 'biweekly', 'weekly', 'quarterly', 'semiannual', 'annual', 'one_time');
        CREATE TYPE "enum_FixedExpenses_paymentMethod" AS ENUM ('Cap Trabajos Septic', 'Capital Proyectos Septic', 'Chase Bank', 'AMEX', 'Chase Credit Card', 'Cheque', 'Transferencia Bancaria', 'Efectivo', 'Zelle', 'Tarjeta Débito', 'PayPal', 'Otro');
        CREATE TYPE "enum_FixedExpenses_category" AS ENUM ('Renta', 'Servicios', 'Seguros', 'Salarios', 'Equipamiento', 'Software/Subscripciones', 'Mantenimiento Vehicular', 'Combustible', 'Impuestos', 'Contabilidad/Legal', 'Marketing', 'Telefonía', 'Otros');
      `);

      // 4.5. Crear tabla completa
      console.log('📝 Creando tabla FixedExpenses completa...');
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

      console.log('✅ Tabla FixedExpenses recreada correctamente con todas las columnas');

    } catch (error) {
      console.error('❌ Error:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('FixedExpenses');
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_FixedExpenses_frequency" CASCADE;
      DROP TYPE IF EXISTS "enum_FixedExpenses_paymentMethod" CASCADE;
      DROP TYPE IF EXISTS "enum_FixedExpenses_category" CASCADE;
    `);
  }
};
