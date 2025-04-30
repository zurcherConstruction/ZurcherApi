const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { format, parseISO } = require('date-fns'); // Para formatear fechas

// Helper para formatear fechas o devolver N/A
const formatDateDDMMYYYY = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    // parseISO maneja strings como '2025-04-29T19:01:03.311Z' o '2025-04-29'
    const dateObj = parseISO(dateString);
    return format(dateObj, 'dd-MM-yyyy');
  } catch (e) {
    console.error("Error formateando fecha:", dateString, e);
    return 'Invalid Date';
  }
};

// Función para generar y guardar el PDF del presupuesto
async function generateAndSaveBudgetPDF(budgetData) {
  return new Promise((resolve, reject) => {
    try {
      // --- 1. Preparar Datos ---
      const {
        idBudget, date, expirationDate, applicantName, propertyAddress,
        Permit, lineItems = [], subtotalPrice, discountDescription, discountAmount,
        totalPrice, initialPaymentPercentage, initialPayment, generalNotes
      } = budgetData;

      const formattedDate = formatDateDDMMYYYY(date);
      const formattedExpirationDate = formatDateDDMMYYYY(expirationDate);

      // --- 2. Configurar PDF ---
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const pdfPath = path.join(uploadsDir, `budget_${idBudget}.pdf`);
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // --- CONSTANTES DE DISEÑO ---
      const pageMargin = 50;
      const contentWidth = doc.page.width - pageMargin * 2;
      const logoPath = path.join(__dirname, '../assets/logo.png'); // Ruta al logo

      // --- 3. Contenido del PDF ---

      // === SECCIÓN ENCABEZADO ===
      const headerStartY = pageMargin;
      const headerRightX = doc.page.width - pageMargin - 150; // Para info derecha

      // Logo
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, pageMargin, headerStartY, { width: 50 }); // Ajusta el tamaño si es necesario
      } else {
        console.warn(`Logo no encontrado en: ${logoPath}`);
      }

      // Información de la Empresa (al lado o debajo del logo)
      const companyInfoX = pageMargin + 60; // Espacio a la derecha del logo
      doc.fontSize(10).font('Helvetica-Bold').text("Zurcher Construction", companyInfoX, headerStartY + 5); // Ajusta Y para alinear
      doc.font('Helvetica').fontSize(9);
      doc.text("Septic Tank Division - CFC1433240", companyInfoX, doc.y);
      doc.text("zurcherseptic@gmail.com", companyInfoX, doc.y);
      doc.text("+1 (407) 419-4495", companyInfoX, doc.y);

      // Información del Presupuesto (derecha)
      doc.fontSize(12).font('Helvetica-Bold').text(`Budget #: ${idBudget}`, headerRightX, headerStartY + 5, { width: 150, align: 'right' });
      doc.font('Helvetica').fontSize(10);
      doc.text(`Date: ${formattedDate}`, headerRightX, doc.y, { width: 150, align: 'right' });
      doc.text(`Expiration Date: ${formattedExpirationDate}`, headerRightX, doc.y, { width: 150, align: 'right' });

      // Línea separadora
      doc.moveDown(3); // Más espacio antes de la línea
      const lineY = doc.y;
      doc.moveTo(pageMargin, lineY).lineTo(doc.page.width - pageMargin, lineY).strokeColor("#cccccc").stroke(); // Línea gris claro
      doc.moveDown(1);

      // === SECCIÓN INFO CLIENTE ===
      doc.fontSize(11).font('Helvetica-Bold').text('Customer Information:', pageMargin, doc.y);
      doc.font('Helvetica').fontSize(10);
      doc.text(`Name: ${applicantName || 'N/A'}`);
      doc.text(`Property Address: ${propertyAddress || 'N/A'}`);
      if (Permit) {
        doc.text(`Permit #: ${Permit.permitNumber || 'N/A'}`);
        doc.text(`Lot: ${Permit.lot || 'N/A'}, Block: ${Permit.block || 'N/A'}`);
      }
      doc.moveDown(2);

      // === SECCIÓN TABLA DE ITEMS ===
      doc.fontSize(12).font('Helvetica-Bold').text('Budget Items', { underline: true });
      doc.moveDown(0.5);
      // Cabeceras (ajustadas para mejor distribución)
      const tableTop = doc.y;
      const itemX = pageMargin;
      const qtyX = pageMargin + contentWidth * 0.55;
      const unitPriceX = pageMargin + contentWidth * 0.70;
      const totalX = pageMargin + contentWidth * 0.85;
      const tableHeaderRightEdge = doc.page.width - pageMargin;

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Item / Description', itemX, tableTop, { width: qtyX - itemX - 10 });
      doc.text('Qty', qtyX, tableTop, { width: unitPriceX - qtyX - 10, align: 'right' });
      doc.text('Unit Price', unitPriceX, tableTop, { width: totalX - unitPriceX - 10, align: 'right' });
      doc.text('Line Total', totalX, tableTop, { width: tableHeaderRightEdge - totalX, align: 'right' });
      doc.font('Helvetica');
      doc.moveDown();
      const tableBottomLineY = doc.y;
      doc.moveTo(itemX, tableBottomLineY).lineTo(tableHeaderRightEdge, tableBottomLineY).strokeColor("#cccccc").stroke();
      doc.moveDown(0.5);

      // Filas (con parseo y formato corregido)
      lineItems.forEach(item => {
        const y = doc.y;
        const quantityNum = parseFloat(item.quantity);
        const unitPriceNum = parseFloat(item.unitPrice);
        const lineTotalNum = parseFloat(item.lineTotal);

        // *** CONVERTIR NOMBRE A MAYÚSCULAS AQUÍ ***
        const itemNameUpperCase = (item.name || 'N/A').toUpperCase();
        doc.fontSize(9).text(itemNameUpperCase, itemX, y, { width: qtyX - itemX - 10 });
        // *** FIN CAMBIO ***


        doc.fontSize(9).text(item.name || 'N/A', itemX, y, { width: qtyX - itemX - 10 });
        if (item.notes) {
          doc.fontSize(8).fillColor('grey').text(item.notes, itemX + 5, doc.y, { width: qtyX - itemX - 15 });
          doc.fillColor('black');
        }
        doc.fontSize(9).text(!isNaN(quantityNum) ? quantityNum.toFixed(2) : '0.00', qtyX, y, { width: unitPriceX - qtyX - 10, align: 'right' });
        doc.text(`$${!isNaN(unitPriceNum) ? unitPriceNum.toFixed(2) : '0.00'}`, unitPriceX, y, { width: totalX - unitPriceX - 10, align: 'right' });
        doc.text(`$${!isNaN(lineTotalNum) ? lineTotalNum.toFixed(2) : '0.00'}`, totalX, y, { width: tableHeaderRightEdge - totalX, align: 'right' });
        doc.moveDown(item.notes ? 1.5 : 1);
      });

      // Línea antes de totales
      const finalItemsY = doc.y;
      doc.moveTo(unitPriceX - 10, finalItemsY).lineTo(tableHeaderRightEdge, finalItemsY).strokeColor("#cccccc").stroke();
      doc.moveDown(0.5);

      // === SECCIÓN TOTALES === (Alineada a la derecha)
      // *** NUEVAS CONSTANTES PARA ALINEACIÓN ***
      const totalsLabelStartX = pageMargin + contentWidth * 0.60; // Donde empiezan las etiquetas
      const totalsValueStartX = pageMargin + contentWidth * 0.80; // Donde empiezan los valores
      const totalsRightEdge = doc.page.width - pageMargin;       // Borde derecho final
      const labelWidth = totalsValueStartX - totalsLabelStartX - 5; // Ancho para etiquetas (con 5pt de espacio)
      const valueWidth = totalsRightEdge - totalsValueStartX;      // Ancho para valores
      // *** FIN NUEVAS CONSTANTES ***
      doc.fontSize(10);

      // --- Subtotal ---
      let currentY = doc.y; // Guardar Y actual
      const subtotalNum = parseFloat(subtotalPrice);
      doc.text(`Subtotal:`, totalsLabelStartX, currentY, { width: labelWidth, align: 'right' });
      doc.text(`$${!isNaN(subtotalNum) ? subtotalNum.toFixed(2) : '0.00'}`, totalsValueStartX, currentY, { width: valueWidth, align: 'right' });
      doc.moveDown(0.5);

      // --- Discount (si existe) ---
      const discountNum = parseFloat(discountAmount);
      if (discountNum > 0) {
        currentY = doc.y; // Guardar Y actual
        doc.text(`Discount (${discountDescription || ''}):`, totalsLabelStartX, currentY, { width: labelWidth, align: 'right' });
        doc.text(`-$${discountNum.toFixed(2)}`, totalsValueStartX, currentY, { width: valueWidth, align: 'right' });
        doc.moveDown(0.5);
      }

      // --- Total ---
      currentY = doc.y; // Guardar Y actual
      const totalNum = parseFloat(totalPrice);
      doc.font('Helvetica-Bold'); // Total en negrita
      doc.text(`Total:`, totalsLabelStartX, currentY, { width: labelWidth, align: 'right' });
      doc.text(`$${!isNaN(totalNum) ? totalNum.toFixed(2) : '0.00'}`, totalsValueStartX, currentY, { width: valueWidth, align: 'right' });
      doc.font('Helvetica'); // Volver a normal
      doc.moveDown(0.5);

      // --- Pago Inicial ---
      currentY = doc.y; // Guardar Y actual
      const initialPaymentNum = parseFloat(initialPayment);
      // Etiqueta del Pago Inicial (puede ser larga, ajustar si es necesario)
      doc.text(`Initial Payment (${initialPaymentPercentage || 60}%):`, totalsLabelStartX, currentY, { width: labelWidth, align: 'right' });
      doc.text(`$${!isNaN(initialPaymentNum) ? initialPaymentNum.toFixed(2) : '0.00'}`, totalsValueStartX, currentY, { width: valueWidth, align: 'right' });
      doc.moveDown(2); // Espacio después de los totales

      // === SECCIÓN NOTAS GENERALES ===
      if (generalNotes) {
        doc.fontSize(10).font('Helvetica-Bold').text('General Notes:', pageMargin, doc.y, { underline: true });
        doc.font('Helvetica');
        doc.moveDown(0.5);
        doc.text(generalNotes, pageMargin, doc.y, { width: contentWidth });
        doc.moveDown(1.5);
      }

      // === SECCIÓN INFORMACIÓN DE PAGO ===
      doc.fontSize(10).font('Helvetica-Bold').text('Payment Information:', pageMargin, doc.y, { underline: true });
      doc.font('Helvetica');
      doc.moveDown(0.5);
      doc.text("Bank: Bank of America", pageMargin, doc.y);
      doc.text("Routing #: 063100277", pageMargin, doc.y);
      doc.text("Account #: 898138399808", pageMargin, doc.y);
      doc.text("Zelle Email: zurcherconstruction.fl@gmail.com", pageMargin, doc.y);
      doc.moveDown(1.5);

      // === SECCIÓN TÉRMINOS Y CONDICIONES ===
      const termsAndConditionsText = `Terms and Conditions Acceptance Agreement for the Installation of a Septic System\nConsidering that: The Provider is engaged in the installation of septic systems and offers its services in accordance with applicable legal and technical regulations. The Client is interested in contracting the service for the installation of a septic system on the property located at ${propertyAddress || '[Property Address Not Specified]'}. Both parties wish to establish the terms and conditions under which the service will be provided.\nThey agree as follows:\nAcceptance of the Terms and Conditions The Client declares to have read, understood, and accepted the terms and conditions set forth in this agreement. Acceptance of these terms is mandatory for the provision of the septic system installation service.`;
      doc.fontSize(10).font('Helvetica-Bold').text('Terms and Conditions:', pageMargin, doc.y, { underline: true });
      doc.font('Helvetica').fontSize(8); // Letra más pequeña para términos
      doc.moveDown(0.5);
      doc.text(termsAndConditionsText, pageMargin, doc.y, {
        width: contentWidth,
        align: 'justify' // Justificar texto
      });
      doc.moveDown(1.5);


      // === PIE DE PÁGINA (Simple) ===
      const pageBottom = doc.page.height - pageMargin + 10; // Un poco más arriba del margen
      doc.fontSize(8).fillColor('grey').text('Thank you for your business! | Zurcher Construction', pageMargin, pageBottom, {
         align: 'center',
         width: contentWidth
      });


      // --- 4. Finalizar PDF ---
      doc.end();

      // --- 5. Resolver Promesa ---
      stream.on('finish', () => {
        console.log(`PDF generado y guardado exitosamente en: ${pdfPath}`);
        resolve(pdfPath);
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