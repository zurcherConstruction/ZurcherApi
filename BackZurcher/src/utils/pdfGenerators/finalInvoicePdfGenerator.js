const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Importar desde archivos compartidos
const {
  pageMargin,
  primaryColor,
  whiteColor,
  textColor,
  lightGrayColor
} = require('./shared/constants');

const { formatDateDDMMYYYY } = require('./shared/helpers');
const { addStandardPageFooter } = require('./shared/components');

async function generateAndSaveFinalInvoicePDF(invoiceData) {
  return new Promise(async (resolve, reject) => {
    try {
      //console.log('🎯 USANDO EL NUEVO GENERADOR DE FINAL INVOICE');
      
      // --- 1. Preparar Datos con estructura corregida ---
      const {
        id: invoiceId,
        invoiceDate,
        originalBudgetTotal,
        initialPaymentMade,
        subtotalExtras,
        finalAmountDue,
        status: invoiceStatus,
        paymentDate,
        Work: workData, // ✅ CORRECTO: Work con W mayúscula
        extraItems = []
      } = invoiceData;

      console.log('🔍 workData después de destructuring:', workData ? 'ENCONTRADO' : 'NO ENCONTRADO');

      if (!workData) {
        throw new Error('No se encontraron datos de trabajo (Work) en la factura');
      }

      const {
        propertyAddress,
        budget: budgetData, // ✅ CORRECTO: budget con b minúscula
        changeOrders = []
      } = workData;

      //console.log('🏠 propertyAddress:', propertyAddress);
      //console.log('📊 budgetData:', budgetData ? 'ENCONTRADO' : 'NO ENCONTRADO');

      // ✅ OBTENER DATOS DEL CLIENTE
      const clientName = budgetData?.applicantName || "Valued Customer";
      const clientEmail = budgetData?.Permit?.applicantEmail || budgetData?.applicantEmail;
      const companyName = budgetData?.companyName;

      const formattedInvoiceDate = formatDateDDMMYYYY(invoiceDate);
      const formattedPaymentDate = formatDateDDMMYYYY(paymentDate);
      const invoiceNumber = `INV-${invoiceId?.toString().substring(0, 8)}`;

      //console.log('👤 clientName:', clientName);
     // console.log('📧 clientEmail:', clientEmail);

      // --- 2. Configurar PDF ---
      const doc = new PDFDocument({ margin: pageMargin, size: 'A4' });
      const uploadsDir = path.join(__dirname, '../../uploads/final_invoices');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      
      const pdfPath = path.join(uploadsDir, `final_invoice_${invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      const contentWidth = doc.page.width - pageMargin * 2;

      // --- 3. Contenido del PDF ---

      // === ENCABEZADO ===
      const logoPath = path.join(__dirname, '../../assets/logo.png');
      const headerHeight = 100;
      doc.save();
      doc.rect(0, 0, doc.page.width, headerHeight).fill(primaryColor);
      
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, pageMargin, 20, { height: 60 });
      }
      
      doc.fontSize(20).fillColor(whiteColor).font('Helvetica-Bold')
        .text('FINAL INVOICE', pageMargin + 200, 35, { align: 'right', width: contentWidth - 200 });
      doc.restore();

      doc.fillColor(textColor);

      // === INFORMACIÓN DE LA EMPRESA ===
      let currentY = headerHeight + 20;
      doc.fontSize(12).font('Helvetica-Bold')
        .text('ZURCHER CONSTRUCTION LLC.', pageMargin, currentY);
      currentY += doc.currentLineHeight();
      doc.font('Helvetica')
        .text('9837 Clear Cloud Aly', pageMargin, currentY);
      currentY += doc.currentLineHeight();
      doc.text('Winter Garden 34787', pageMargin, currentY);
      currentY += doc.currentLineHeight();
      doc.text('+1 (407) 419-4495', pageMargin, currentY);
      currentY += doc.currentLineHeight();
      doc.text('zurcherseptic@gmail.com', pageMargin, currentY);
      const leftColumnEndY = currentY;

      // === INFORMACIÓN DEL INVOICE ===
      currentY = headerHeight + 20;
      const rightInfoX = doc.page.width - pageMargin - 200;
      doc.fontSize(12).font('Helvetica-Bold')
        .text(`Invoice #: ${invoiceNumber}`, rightInfoX, currentY, { width: 200, align: 'right' });
      currentY += doc.currentLineHeight();
      doc.font('Helvetica')
        .text(`Date: ${formattedInvoiceDate}`, rightInfoX, currentY, { width: 200, align: 'right' });
      currentY += doc.currentLineHeight();
      
      if (invoiceStatus === 'paid' && paymentDate) {
        doc.text(`Payment Date: ${formattedPaymentDate}`, rightInfoX, currentY, { width: 200, align: 'right' });
      }
      
      const rightColumnEndY = currentY;
      currentY = Math.max(leftColumnEndY, rightColumnEndY) + 30;

      // === INFORMACIÓN DEL CLIENTE ===
      doc.fontSize(12).font('Helvetica-Bold')
        .text('BILL TO:', pageMargin, currentY);
      currentY += doc.currentLineHeight() + 5;
      doc.font('Helvetica');
      
      if (companyName) {
        doc.text(companyName.toUpperCase(), pageMargin, currentY);
        currentY += doc.currentLineHeight();
      }
      doc.text(clientName, pageMargin, currentY);
      currentY += doc.currentLineHeight();
      doc.text(propertyAddress, pageMargin, currentY);
      if (clientEmail) {
        currentY += doc.currentLineHeight();
        doc.text(clientEmail, pageMargin, currentY);
      }
      currentY += 30;

      // === TABLA DE ÍTEMS ===
      const tableStartY = currentY;
      const rowHeight = 25;
      
      // Encabezados de tabla
      doc.fontSize(12).font('Helvetica-Bold');
      doc.rect(pageMargin, tableStartY, contentWidth, rowHeight).fill(lightGrayColor);
      doc.fillColor(textColor);
      
      const descX = pageMargin + 10;
      const qtyX = pageMargin + contentWidth - 200;
      const rateX = pageMargin + contentWidth - 120;
      const amountX = pageMargin + contentWidth - 80;
      
      doc.text('DESCRIPTION', descX, tableStartY + 8);
      doc.text('QTY', qtyX, tableStartY + 8, { width: 50, align: 'center' });
      doc.text('RATE', rateX, tableStartY + 8, { width: 60, align: 'right' });
      doc.text('AMOUNT', amountX, tableStartY + 8, { width: 70, align: 'right' });
      
      currentY = tableStartY + rowHeight;

      // === ÍTEMS DE LA FACTURA ===
      doc.font('Helvetica').fontSize(11);
      
      // Item principal del trabajo
      const mainItemDesc = `Septic System Installation - ${propertyAddress}`;
      const mainItemAmount = parseFloat(originalBudgetTotal || 0);
      
      doc.text(mainItemDesc, descX, currentY + 5, { width: contentWidth - 220 });
      doc.text('1', qtyX, currentY + 5, { width: 50, align: 'center' });
      doc.text(`$${mainItemAmount.toFixed(2)}`, rateX, currentY + 5, { width: 60, align: 'right' });
      doc.text(`$${mainItemAmount.toFixed(2)}`, amountX, currentY + 5, { width: 70, align: 'right' });
      currentY += rowHeight;

      // Ítems adicionales (extraItems)
      if (extraItems && extraItems.length > 0) {
        extraItems.forEach(item => {
          const itemAmount = parseFloat(item.lineTotal || 0);
          const itemQty = parseFloat(item.quantity || 1);
          const itemRate = parseFloat(item.unitPrice || 0);
          
          doc.text(item.description || 'Additional Item', descX, currentY + 5, { width: contentWidth - 220 });
          doc.text(itemQty.toFixed(0), qtyX, currentY + 5, { width: 50, align: 'center' });
          doc.text(`$${itemRate.toFixed(2)}`, rateX, currentY + 5, { width: 60, align: 'right' });
          doc.text(`$${itemAmount.toFixed(2)}`, amountX, currentY + 5, { width: 70, align: 'right' });
          currentY += rowHeight;
        });
      }

      // === TOTALES ===
      currentY += 10;
      doc.moveTo(pageMargin, currentY).lineTo(doc.page.width - pageMargin, currentY).stroke();
      currentY += 15;

      const totalLabelX = pageMargin + contentWidth - 150;
      const totalValueX = pageMargin + contentWidth - 80;

      // Subtotal original
      doc.fontSize(12).font('Helvetica');
      doc.text('ORIGINAL BUDGET:', totalLabelX, currentY, { width: 70, align: 'right' });
      doc.text(`$${parseFloat(originalBudgetTotal || 0).toFixed(2)}`, totalValueX, currentY, { width: 70, align: 'right' });
      currentY += doc.currentLineHeight() + 5;

      // Extras si existen
      if (subtotalExtras && parseFloat(subtotalExtras) > 0) {
        doc.text('ADDITIONAL ITEMS:', totalLabelX, currentY, { width: 70, align: 'right' });
        doc.text(`$${parseFloat(subtotalExtras).toFixed(2)}`, totalValueX, currentY, { width: 70, align: 'right' });
        currentY += doc.currentLineHeight() + 5;
      }

      // Pago inicial si existe
      if (initialPaymentMade && parseFloat(initialPaymentMade) > 0) {
        doc.text('INITIAL PAYMENT:', totalLabelX, currentY, { width: 70, align: 'right' });
        doc.text(`-$${parseFloat(initialPaymentMade).toFixed(2)}`, totalValueX, currentY, { width: 70, align: 'right' });
        currentY += doc.currentLineHeight() + 5;
      }

      // Balance final
      doc.fontSize(14).font('Helvetica-Bold');
      if (invoiceStatus === 'paid') {
        doc.fillColor('green');
        doc.text('PAID IN FULL', totalLabelX, currentY, { width: 150, align: 'center' });
      } else {
        doc.fillColor(primaryColor);
        doc.text('BALANCE DUE:', totalLabelX, currentY, { width: 70, align: 'right' });
        doc.text(`$${parseFloat(finalAmountDue || 0).toFixed(2)}`, totalValueX, currentY, { width: 70, align: 'right' });
      }
      
      doc.fillColor(textColor);
      currentY += doc.currentLineHeight() + 20;

      // === INFORMACIÓN DE PAGO ===
      if (invoiceStatus !== 'paid' && parseFloat(finalAmountDue || 0) > 0) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor(textColor);
        doc.text('Payment Information:', pageMargin, currentY);
        currentY += doc.currentLineHeight() + 5;
        
        doc.font('Helvetica').fontSize(9);
        doc.text('Bank: Chase', pageMargin, currentY);
        currentY += doc.currentLineHeight();
        doc.text('Routing: 267084131', pageMargin, currentY);
        currentY += doc.currentLineHeight();
        doc.text('Account: 686125371', pageMargin, currentY);
        currentY += doc.currentLineHeight();
        doc.text('Email: zurcherseptic@gmail.com', pageMargin, currentY);
        currentY += 20;
      }

      // === MENSAJE DE AGRADECIMIENTO ===
      doc.fontSize(16).font('Helvetica-BoldOblique').fillColor(primaryColor);
      doc.text('Thank You for Your Business!', pageMargin, currentY, { 
        width: contentWidth, 
        align: 'center' 
      });
      
      // === PIE DE PÁGINA ===
      addStandardPageFooter(doc);

      // --- 4. Finalizar PDF ---
      doc.end();

      // --- 5. Resolver Promesa ---
      stream.on('finish', () => {
        console.log(`Final Invoice PDF generado: ${pdfPath}`);
        resolve(pdfPath);
      });
      stream.on('error', (err) => {
        console.error("Error al escribir el stream del PDF de Final Invoice:", err);
        reject(err);
      });

    } catch (error) {
      console.error("Error dentro de generateAndSaveFinalInvoicePDF:", error);
      reject(error);
    }
  });
}

module.exports = { generateAndSaveFinalInvoicePDF };