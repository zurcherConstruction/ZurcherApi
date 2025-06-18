// ...existing code...
//const originalPdfGenerator = require('../pdfGenerator');
const { generateAndSaveChangeOrderPDF } = require('./changeOrderPdfGenerator');
const { generateAndSaveFinalInvoicePDF } = require('./finalInvoicePdfGenerator');
const { generateAndSaveBudgetPDF } = require('./budgetPdfGenerator');
module.exports = {
  generateAndSaveBudgetPDF,
  generateAndSaveFinalInvoicePDF, // ✅ USAR EL NUEVO
  generateAndSaveChangeOrderPDF
};