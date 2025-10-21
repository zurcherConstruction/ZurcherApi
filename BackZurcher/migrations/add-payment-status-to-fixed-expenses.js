/**
 * Migración: Agregar campos de estado de pago a FixedExpenses
 * 
 * Agrega los mismos campos que Expenses para unificar el manejo de pagos
 * a través de supplier invoices
 */

const { Sequelize } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Crear ENUM para paymentStatus (verificar si no existe)
      const enumExists = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'enum_FixedExpenses_paymentStatus'
        ) as exists;
      `, { transaction, type: queryInterface.sequelize.QueryTypes.SELECT });

      if (!enumExists[0].exists) {
        await queryInterface.sequelize.query(
          `CREATE TYPE "enum_FixedExpenses_paymentStatus" AS ENUM ('unpaid', 'paid', 'paid_via_invoice');`,
          { transaction }
        );
      }

      // 2. Agregar campo paymentStatus
      await queryInterface.addColumn(
        'FixedExpenses',
        'paymentStatus',
        {
          type: Sequelize.ENUM('unpaid', 'paid', 'paid_via_invoice'),
          allowNull: false,
          defaultValue: 'unpaid',
          comment: 'Estado de pago del gasto fijo: unpaid (no pagado), paid (pagado directo), paid_via_invoice (pagado vía invoice)'
        },
        { transaction }
      );

      // 3. Agregar campo paidDate (fecha en que se pagó)
      await queryInterface.addColumn(
        'FixedExpenses',
        'paidDate',
        {
          type: Sequelize.DATEONLY,
          allowNull: true,
          comment: 'Fecha en que se pagó el gasto fijo'
        },
        { transaction }
      );

      // 4. Agregar campo supplierInvoiceItemId (vinculación con invoice de proveedor)
      await queryInterface.addColumn(
        'FixedExpenses',
        'supplierInvoiceItemId',
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'SupplierInvoiceItems',
            key: 'idItem'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Item de factura de proveedor que incluye este gasto fijo'
        },
        { transaction }
      );

      await transaction.commit();
      console.log('✅ Migración completada: Campos de pago agregados a FixedExpenses');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en migración:', error);
      throw error;
    }
  },

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Eliminar columnas en orden inverso
      await queryInterface.removeColumn('FixedExpenses', 'supplierInvoiceItemId', { transaction });
      await queryInterface.removeColumn('FixedExpenses', 'paidDate', { transaction });
      await queryInterface.removeColumn('FixedExpenses', 'paymentStatus', { transaction });

      // Eliminar ENUM type
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_FixedExpenses_paymentStatus";',
        { transaction }
      );

      await transaction.commit();
      console.log('✅ Rollback completado: Campos de pago removidos de FixedExpenses');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error en rollback:', error);
      throw error;
    }
  }
};
