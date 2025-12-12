'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verificar si la tabla ya existe
    const [tables] = await queryInterface.sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'SupplierInvoiceWorks'
      );
    `);
    
    if (tables[0].exists) {
      console.log('⚠️  Tabla SupplierInvoiceWorks ya existe, omitiendo creación');
      return;
    }

    // Crear tabla SupplierInvoiceWorks
    await queryInterface.createTable('SupplierInvoiceWorks', {
      idSupplierInvoiceWork: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
      },
      supplierInvoiceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'SupplierInvoices',
          key: 'idSupplierInvoice'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      workId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Works',
          key: 'idWork'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Agregar índice único para evitar duplicados
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "SupplierInvoiceWorks_unique" 
      ON "SupplierInvoiceWorks" ("supplierInvoiceId", "workId")
    `);

    // Agregar índices para mejorar performance
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "supplier_invoice_works_supplier_id" 
      ON "SupplierInvoiceWorks" ("supplierInvoiceId")
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "supplier_invoice_works_work_id" 
      ON "SupplierInvoiceWorks" ("workId")
    `);

    console.log('✅ Tabla SupplierInvoiceWorks creada exitosamente');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('SupplierInvoiceWorks');
    console.log('✅ Tabla SupplierInvoiceWorks eliminada');
  }
};
