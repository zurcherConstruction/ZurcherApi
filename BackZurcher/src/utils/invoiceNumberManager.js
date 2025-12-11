/**
 * 🧮 GESTOR DE NUMERACIÓN UNIFICADA DE INVOICES
 * 
 * Este módulo gestiona la numeración secuencial compartida entre:
 * - Budget Invoices (presupuestos aprobados/convertidos)
 * - Final Invoices (facturas finales de trabajos completados)
 * 
 * Garantiza que NO haya duplicados y que la numeración sea consecutiva
 * sin importar el tipo de invoice.
 */

const { Budget, FinalInvoice, conn } = require('../data');
const { Op } = require('sequelize');

/**
 * Obtiene el siguiente número de invoice disponible
 * Consulta AMBAS tablas (Budgets y FinalInvoices) para encontrar el máximo
 * 
 * @param {Object} transaction - Transacción de Sequelize (opcional pero recomendado)
 * @returns {Promise<number>} - Siguiente número de invoice disponible
 */
async function getNextInvoiceNumber(transaction = null) {
  try {
    // 🚀 OPTIMIZACIÓN: Usar MAX() directo en lugar de ORDER BY + LIMIT
    const [budgetResult, finalInvoiceResult] = await Promise.all([
      // 1. MAX de Budget invoiceNumbers
      Budget.findOne({
        attributes: [[conn.fn('MAX', conn.col('invoiceNumber')), 'maxInvoice']],
        where: {
          invoiceNumber: { [Op.not]: null }
        },
        raw: true,
        transaction
      }),
      // 2. MAX de FinalInvoice invoiceNumbers  
      FinalInvoice.findOne({
        attributes: [[conn.fn('MAX', conn.col('invoiceNumber')), 'maxInvoice']],
        where: {
          invoiceNumber: { [Op.not]: null }
        },
        raw: true,
        transaction
      })
    ]);

    // 3. Comparar ambos y tomar el mayor
    const budgetMax = budgetResult?.maxInvoice || 0;
    const finalInvoiceMax = finalInvoiceResult?.maxInvoice || 0;
    const currentMax = Math.max(budgetMax, finalInvoiceMax);

    // 4. Retornar el siguiente número
    const nextNumber = currentMax + 1;

    console.log(`📊 Numeración de Invoices:`, {
      lastBudgetInvoice: budgetMax,
      lastFinalInvoice: finalInvoiceMax,
      currentMax,
      nextNumber
    });

    return nextNumber;

  } catch (error) {
    console.error('❌ Error obteniendo siguiente número de invoice:', error);
    throw new Error(`Error al obtener número de invoice: ${error.message}`);
  }
}

/**
 * Obtiene estadísticas de la numeración de invoices
 * Útil para auditoría y debugging
 * 
 * @returns {Promise<Object>} - Estadísticas de numeración
 */
async function getInvoiceNumberStats() {
  try {
    const [budgetStats, finalInvoiceStats] = await Promise.all([
      // Estadísticas de Budget Invoices
      Budget.findAll({
        where: {
          invoiceNumber: { [Op.not]: null }
        },
        attributes: [
          [conn.fn('COUNT', conn.col('invoiceNumber')), 'count'],
          [conn.fn('MIN', conn.col('invoiceNumber')), 'min'],
          [conn.fn('MAX', conn.col('invoiceNumber')), 'max']
        ],
        raw: true
      }),
      
      // Estadísticas de Final Invoices
      FinalInvoice.findAll({
        where: {
          invoiceNumber: { [Op.not]: null }
        },
        attributes: [
          [conn.fn('COUNT', conn.col('invoiceNumber')), 'count'],
          [conn.fn('MIN', conn.col('invoiceNumber')), 'min'],
          [conn.fn('MAX', conn.col('invoiceNumber')), 'max']
        ],
        raw: true
      })
    ]);

    const budgetData = budgetStats[0] || { count: 0, min: null, max: null };
    const finalInvoiceData = finalInvoiceStats[0] || { count: 0, min: null, max: null };

    return {
      budgetInvoices: {
        count: parseInt(budgetData.count) || 0,
        min: budgetData.min,
        max: budgetData.max
      },
      finalInvoices: {
        count: parseInt(finalInvoiceData.count) || 0,
        min: finalInvoiceData.min,
        max: finalInvoiceData.max
      },
      total: (parseInt(budgetData.count) || 0) + (parseInt(finalInvoiceData.count) || 0),
      currentMax: Math.max(budgetData.max || 0, finalInvoiceData.max || 0),
      nextAvailable: Math.max(budgetData.max || 0, finalInvoiceData.max || 0) + 1
    };

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de invoices:', error);
    throw error;
  }
}

/**
 * Valida que un número de invoice no esté duplicado
 * 
 * @param {number} invoiceNumber - Número a validar
 * @param {Object} transaction - Transacción de Sequelize (opcional)
 * @returns {Promise<boolean>} - true si está disponible, false si está duplicado
 */
async function isInvoiceNumberAvailable(invoiceNumber, transaction = null) {
  try {
    const [budgetExists, finalInvoiceExists] = await Promise.all([
      Budget.findOne({
        where: { invoiceNumber },
        attributes: ['idBudget'],
        transaction
      }),
      FinalInvoice.findOne({
        where: { invoiceNumber },
        attributes: ['id'],
        transaction
      })
    ]);

    const isAvailable = !budgetExists && !finalInvoiceExists;

    if (!isAvailable) {
      console.warn(`⚠️ Invoice Number ${invoiceNumber} ya está en uso:`, {
        usedInBudget: !!budgetExists,
        usedInFinalInvoice: !!finalInvoiceExists
      });
    }

    return isAvailable;

  } catch (error) {
    console.error('❌ Error validando disponibilidad de invoice number:', error);
    throw error;
  }
}

module.exports = {
  getNextInvoiceNumber,
  getInvoiceNumberStats,
  isInvoiceNumberAvailable
};
