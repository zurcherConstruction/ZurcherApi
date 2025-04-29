const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns'); // Para formatear fechas

// Función para generar y guardar el PDF del presupuesto
async function generateAndSaveBudgetPDF(budgetData) {
  return new Promise((resolve, reject) => {
    try {
      // --- 1. Preparar Datos ---
      const {
        idBudget,
        date,
        expirationDate,
        applicantName,
        propertyAddress,
        Permit, // Asume que Permit está incluido
        lineItems, // Asume que lineItems están incluidos
        subtotalPrice,
        discountDescription,
        discountAmount,
        totalPrice,
        initialPaymentPercentage,
        initialPayment,
        generalNotes
      } = budgetData;

      // --- 2. Configurar PDF ---
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      // Asegurar que la carpeta 'uploads' exista
      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Definir ruta del archivo
      const pdfPath = path.join(uploadsDir, `budget_${idBudget}.pdf`);

      // Pipe el output al archivo
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // --- 3. Contenido del PDF (Ejemplo Básico - ¡AJUSTA A TU DISEÑO!) ---

      // Encabezado
      doc.fontSize(20).text('ZURCHER CONSTRUCTION - Budget', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`Budget #: ${idBudget}`, { align: 'right' });
      doc.text(`Date: ${date ? format(new Date(date), 'MM/dd/yyyy') : 'N/A'}`, { align: 'right' });
      doc.text(`Expiration: ${expirationDate ? format(new Date(expirationDate), 'MM/dd/yyyy') : 'N/A'}`, { align: 'right' });
      doc.moveDown();

      // Información del Cliente y Propiedad
      doc.text(`Applicant: ${applicantName || 'N/A'}`);
      doc.text(`Property Address: ${propertyAddress || 'N/A'}`);
      if (Permit) {
        doc.text(`Permit #: ${Permit.permitNumber || 'N/A'}`);
        doc.text(`Lot: ${Permit.lot || 'N/A'}, Block: ${Permit.block || 'N/A'}`);
      }
      doc.moveDown();

      // Tabla de Items (Ejemplo simple)
      doc.fontSize(14).text('Budget Items', { underline: true });
      doc.moveDown(0.5);

      // Cabeceras de tabla
      const tableTop = doc.y;
      const itemX = 50;
      const qtyX = 300;
      const unitPriceX = 370;
      const totalX = 460;

      doc.fontSize(10).text('Item / Description', itemX, tableTop);
      doc.text('Qty', qtyX, tableTop, { width: 60, align: 'right' });
      doc.text('Unit Price', unitPriceX, tableTop, { width: 80, align: 'right' });
      doc.text('Line Total', totalX, tableTop, { width: 90, align: 'right' });
      doc.moveDown();
      const tableBottom = doc.y;
      doc.moveTo(itemX, tableBottom).lineTo(totalX + 90, tableBottom).stroke(); // Línea bajo cabeceras
      doc.moveDown(0.5);

      // Filas de la tabla
      (lineItems || []).forEach(item => {
        const y = doc.y;
        const quantityNum = parseFloat(item.quantity);
        const unitPriceNum = parseFloat(item.unitPrice); // Asegurar también unitPrice
        const lineTotalNum = parseFloat(item.lineTotal); // Asegurar también lineTotal

        doc.fontSize(9).text(item.name || 'N/A', itemX, y, { width: qtyX - itemX - 10 });
        doc.fontSize(9).text(item.name || 'N/A', itemX, y, { width: qtyX - itemX - 10 });
        if (item.notes) {
          doc.fontSize(8).fillColor('grey').text(item.notes, itemX + 5, doc.y, { width: qtyX - itemX - 15 });
          doc.fillColor('black'); // Reset color
        }
         // Usar los números parseados
         doc.fontSize(9).text(
            !isNaN(quantityNum) ? quantityNum.toFixed(2) : '0.00', // <-- CORREGIDO
            qtyX, y, { width: 60, align: 'right' }
        );
        doc.text(
            `$${!isNaN(unitPriceNum) ? unitPriceNum.toFixed(2) : '0.00'}`, // <-- CORREGIDO
            unitPriceX, y, { width: 80, align: 'right' }
        );
        doc.text(
            `$${!isNaN(lineTotalNum) ? lineTotalNum.toFixed(2) : '0.00'}`, // <-- CORREGIDO
            totalX, y, { width: 90, align: 'right' }
        );
        doc.moveDown(item.notes ? 1.5 : 1);
      });


      // Línea antes de totales
      const finalItemsY = doc.y;
      doc.moveTo(unitPriceX - 10, finalItemsY).lineTo(totalX + 90, finalItemsY).stroke();
      doc.moveDown(0.5);

      // Totales
      doc.fontSize(10);

     // *** CORRECCIÓN: Parsear a número ANTES de toFixed ***
      const subtotalNum = parseFloat(subtotalPrice);
      doc.text(`Subtotal:`, unitPriceX - 10, doc.y, { width: 80, align: 'left' });
      doc.text(
          `$${!isNaN(subtotalNum) ? subtotalNum.toFixed(2) : '0.00'}`, // <-- CORREGIDO
          totalX, doc.y, { width: 90, align: 'right' }
      );
      doc.moveDown(0.5);

      const discountNum = parseFloat(discountAmount); // <-- CORREGIDO
      if (discountNum > 0) {
        doc.text(`Discount (${discountDescription || ''}):`, unitPriceX - 10, doc.y, { width: 80, align: 'left' });
        doc.text(
            `-$${discountNum.toFixed(2)}`, // <-- CORREGIDO (toFixed funciona bien con números)
            totalX, doc.y, { width: 90, align: 'right' }
        );
        doc.moveDown(0.5);
      }


      doc.font('Helvetica-Bold');
      const totalNum = parseFloat(totalPrice); // <-- CORREGIDO
      doc.text(`Total:`, unitPriceX - 10, doc.y, { width: 80, align: 'left' });
      doc.text(
          `$${!isNaN(totalNum) ? totalNum.toFixed(2) : '0.00'}`, // <-- CORREGIDO
          totalX, doc.y, { width: 90, align: 'right' }
      );
      doc.font('Helvetica');
      doc.moveDown();

       // Pago Inicial (AQUÍ TAMBIÉN CORRECCIÓN)
       const initialPaymentNum = parseFloat(initialPayment); // <-- CORREGIDO
       doc.fontSize(10).text(
           `Initial Payment (${initialPaymentPercentage || 60}%): $${!isNaN(initialPaymentNum) ? initialPaymentNum.toFixed(2) : '0.00'}`, // <-- CORREGIDO
       );
       doc.moveDown();
 

      // Notas Generales
      if (generalNotes) {
        doc.fontSize(10).text('General Notes:', { underline: true });
        doc.moveDown(0.5);
        doc.text(generalNotes);
        doc.moveDown();
      }

      // Pie de página (ejemplo)
      doc.fontSize(8).text('Thank you for your business!', 50, doc.page.height - 50, { align: 'center', width: doc.page.width - 100 });

      // --- 4. Finalizar PDF ---
      doc.end();

      // --- 5. Resolver Promesa ---
      stream.on('finish', () => {
        console.log(`PDF generado y guardado exitosamente en: ${pdfPath}`);
        resolve(pdfPath); // Devuelve la ruta del archivo guardado
      });

      stream.on('error', (err) => {
        console.error("Error al escribir el stream del PDF:", err);
        reject(err);
      });

    } catch (error) {
      console.error("Error dentro de generateAndSaveBudgetPDF:", error);
      reject(error);
    }
  });
}

module.exports = { generateAndSaveBudgetPDF };