/**
 * 🔄 MIGRACIÓN: Agregar invoiceNumber a FinalInvoices
 * 
 * Esta migración agrega el campo invoiceNumber a la tabla FinalInvoices
 * y sincroniza la numeración con la tabla Budgets para tener una
 * numeración unificada de invoices en todo el sistema.
 * 
 * Fecha: 12 de Octubre, 2025
 */

const { Sequelize } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🚀 Iniciando migración: Agregar invoiceNumber a FinalInvoices...');

    // 1. Verificar si la columna ya existe
    const tableDescription = await queryInterface.describeTable('FinalInvoices');
    
    if (tableDescription.invoiceNumber) {
      console.log('⚠️ La columna invoiceNumber ya existe en FinalInvoices. Saltando...');
      return;
    }

    // 2. Agregar columna invoiceNumber
    console.log('📝 Agregando columna invoiceNumber a FinalInvoices...');
    await queryInterface.addColumn('FinalInvoices', 'invoiceNumber', {
      type: Sequelize.INTEGER,
      allowNull: true, // Permitir NULL inicialmente para migración
      unique: true
    });
    console.log('✅ Columna invoiceNumber agregada a FinalInvoices');

    // 3. Crear índice único (por si acaso no se creó automáticamente)
    try {
      await queryInterface.addIndex('FinalInvoices', ['invoiceNumber'], {
        unique: true,
        name: 'final_invoices_invoice_number_unique'
      });
      console.log('✅ Índice único creado para invoiceNumber en FinalInvoices');
    } catch (error) {
      console.log('⚠️ Índice único ya existe o no pudo crearse:', error.message);
    }

    // 4. Obtener el máximo invoiceNumber actual de Budgets
    const [maxBudgetInvoice] = await queryInterface.sequelize.query(`
      SELECT MAX("invoiceNumber") as max_invoice 
      FROM "Budgets" 
      WHERE "invoiceNumber" IS NOT NULL
    `);

    const startingNumber = (maxBudgetInvoice[0]?.max_invoice || 0) + 1;
    console.log(`📊 Último invoice en Budgets: ${maxBudgetInvoice[0]?.max_invoice || 0}`);
    console.log(`🔢 Comenzando numeración de FinalInvoices desde: ${startingNumber}`);

    // 5. Asignar invoiceNumbers a FinalInvoices existentes
    const [existingFinalInvoices] = await queryInterface.sequelize.query(`
      SELECT id 
      FROM "FinalInvoices" 
      WHERE "invoiceNumber" IS NULL 
      ORDER BY "invoiceDate" ASC, "createdAt" ASC
    `);

    if (existingFinalInvoices.length > 0) {
      console.log(`📋 Asignando invoiceNumbers a ${existingFinalInvoices.length} facturas finales existentes...`);
      
      let currentNumber = startingNumber;
      for (const finalInvoice of existingFinalInvoices) {
        await queryInterface.sequelize.query(`
          UPDATE "FinalInvoices" 
          SET "invoiceNumber" = :invoiceNumber 
          WHERE id = :id
        `, {
          replacements: {
            invoiceNumber: currentNumber,
            id: finalInvoice.id
          }
        });
        
        console.log(`  ✅ FinalInvoice ${finalInvoice.id} → Invoice #${currentNumber}`);
        currentNumber++;
      }
      
      console.log(`✅ ${existingFinalInvoices.length} facturas finales numeradas (${startingNumber} a ${currentNumber - 1})`);
    } else {
      console.log('ℹ️ No hay facturas finales existentes para numerar');
    }

    // 6. Agregar comentario a la columna
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN "FinalInvoices"."invoiceNumber" IS 'Número de Invoice unificado compartido con tabla Budgets. Numeración secuencial única.'
    `);

    console.log('✅ Migración completada: invoiceNumber agregado a FinalInvoices');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Revirtiendo migración: Eliminar invoiceNumber de FinalInvoices...');

    // Eliminar índice
    try {
      await queryInterface.removeIndex('FinalInvoices', 'final_invoices_invoice_number_unique');
      console.log('✅ Índice eliminado');
    } catch (error) {
      console.log('⚠️ Error eliminando índice:', error.message);
    }

    // Eliminar columna
    await queryInterface.removeColumn('FinalInvoices', 'invoiceNumber');
    console.log('✅ Columna invoiceNumber eliminada de FinalInvoices');
  }
};
