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
  lightGrayColor,
  NEW_PAGE_MARGIN,
  FONT_FAMILY_REGULAR,
  FONT_FAMILY_BOLD,
  FONT_FAMILY_OBLIQUE,
  FONT_FAMILY_MONO,
  FONT_FAMILY_MONO_BOLD,
  COLOR_TEXT_DARK,
  COLOR_TEXT_MEDIUM,
  COLOR_TEXT_LIGHT,
  COLOR_PRIMARY_ACCENT,
  COLOR_BORDER_LIGHT,
  COLOR_BACKGROUND_TABLE_HEADER
} = require('./shared/constants');

const { formatDateDDMMYYYY } = require('./shared/helpers');

// === FUNCIÓN DE ENCABEZADO ESTILIZADO ===
function _addFinalInvoiceHeader(doc, invoiceData, workData, budgetData, formattedDate, invoiceNumber) {
  const logoPath = path.join(__dirname, '../../assets/logo.png');
  const headerStartY = NEW_PAGE_MARGIN;
  const contentWidth = doc.page.width - NEW_PAGE_MARGIN * 2;

  const companyInfoX = NEW_PAGE_MARGIN;
  const companyInfoWidth = contentWidth * 0.55;
  const invoiceInfoX = NEW_PAGE_MARGIN + companyInfoWidth + 10;
  const invoiceInfoWidth = contentWidth - companyInfoWidth - 10;

  let currentYLeft = headerStartY;
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, companyInfoX, currentYLeft, { width: 70 });
    currentYLeft += 30 + 40; // Espacio ajustado para el logo
  } else {
    currentYLeft = headerStartY;
    doc.font(FONT_FAMILY_MONO_BOLD).fontSize(14).fillColor(COLOR_TEXT_DARK)
      .text("ZURCHER CONSTRUCTION", companyInfoX, currentYLeft, { width: companyInfoWidth });
    currentYLeft += doc.currentLineHeight() + 2;
  }

  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(12).fillColor(COLOR_TEXT_DARK)
    .text("ZURCHER CONSTRUCTION", companyInfoX, currentYLeft, { width: companyInfoWidth });
  doc.font(FONT_FAMILY_MONO).fontSize(12).fillColor(COLOR_TEXT_MEDIUM);
  doc.text("SEPTIC TANK DIVISION - CFC1433240", companyInfoX, doc.y, { width: companyInfoWidth });
  doc.text("zurcherseptic@gmail.com", companyInfoX, doc.y, { width: companyInfoWidth });
  doc.text("+1 (407) 419-4495", companyInfoX, doc.y, { width: companyInfoWidth });
  const finalYLeftTop = doc.y;

  let currentYRight = headerStartY + 5;
  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(20).fillColor('#063260')
    .text(`FINAL INVOICE #${invoiceNumber}`, invoiceInfoX, currentYRight, { width: invoiceInfoWidth, align: 'right' });
  currentYRight = doc.y + 45;

  // ✅ ALINEACIÓN PERFECTA - TODOS LOS TEXTOS EMPIEZAN EN LA MISMA POSICIÓN X
  doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);

  const dateTextStartX = invoiceInfoX + 120;
  const dateTextWidth = invoiceInfoWidth - 50;

  doc.text("DATE:", dateTextStartX, currentYRight, { width: dateTextWidth, align: 'left' });
  currentYRight += doc.currentLineHeight() + 2;

  doc.text(formattedDate, dateTextStartX, currentYRight, { width: dateTextWidth, align: 'left' });
  currentYRight += doc.currentLineHeight() + 4;

  // Status si está pagado
  if (invoiceData.status === 'paid' && invoiceData.paymentDate) {
    doc.text("PAID ON:", dateTextStartX, currentYRight, { width: dateTextWidth, align: 'left' });
    currentYRight += doc.currentLineHeight() + 2;
    doc.text(formatDateDDMMYYYY(invoiceData.paymentDate), dateTextStartX, currentYRight, { width: dateTextWidth, align: 'left' });
    currentYRight += doc.currentLineHeight();
  }

  doc.y = currentYRight;
  const finalYRightTop = doc.y;
  doc.y = Math.max(finalYLeftTop, finalYRightTop) + 15;
  
  // --- Línea Divisora ---
  doc.moveTo(NEW_PAGE_MARGIN, doc.y).lineTo(doc.page.width - NEW_PAGE_MARGIN, doc.y)
    .strokeColor(COLOR_BORDER_LIGHT).lineWidth(0.7).stroke();
  doc.moveDown(1);

  // --- Información Cliente y Trabajo ---
  const { propertyAddress } = workData;
  const clientName = budgetData?.applicantName || "Valued Customer";
  const clientEmail = budgetData?.Permit?.applicantEmail || budgetData?.applicantEmail;

  const subHeaderStartY = doc.y;
  const columnGap = 15;
  const columnWidth = (contentWidth - (2 * columnGap)) / 3;

  const customerInfoX = NEW_PAGE_MARGIN;
  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK)
    .text("CUSTOMER INFO", customerInfoX, subHeaderStartY, { width: columnWidth });
  doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);
  doc.text((clientName || 'N/A').toUpperCase(), customerInfoX, doc.y + 2, { width: columnWidth });
  if (clientEmail) {
    doc.text(clientEmail.toUpperCase(), customerInfoX, doc.y, { width: columnWidth });
  }
  const finalYCol1 = doc.y;

  doc.y = subHeaderStartY;
  const workLocationX = customerInfoX + columnWidth + columnGap;
  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK)
    .text("WORK LOCATION", workLocationX, subHeaderStartY, { width: columnWidth });
  doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);
  doc.text((propertyAddress || 'N/A').toUpperCase(), workLocationX, doc.y + 2, { width: columnWidth });
  const finalYCol2 = doc.y;

  doc.y = subHeaderStartY;
  const additionalOffset = 20;
  const statusInfoX = workLocationX + columnWidth + columnGap + additionalOffset;
  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK)
    .text("INVOICE STATUS", statusInfoX, subHeaderStartY, { width: columnWidth });
  doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(invoiceData.status === 'paid' ? 'green' : COLOR_TEXT_MEDIUM);
  doc.text(invoiceData.status?.toUpperCase() || 'PENDING', statusInfoX, doc.y + 2, { width: columnWidth });
  const finalYCol3 = doc.y;

  doc.y = Math.max(finalYCol1, finalYCol2, finalYCol3);
  doc.moveDown(1);
  doc.moveTo(NEW_PAGE_MARGIN, doc.y).lineTo(doc.page.width - NEW_PAGE_MARGIN, doc.y)
    .strokeColor(COLOR_BORDER_LIGHT).lineWidth(0.7).stroke();
  doc.moveDown(1);
}

async function generateAndSaveFinalInvoicePDF(invoiceData) {
  return new Promise(async (resolve, reject) => {
    try {
      // --- 1. Preparar Datos ---
      const {
        id: invoiceId,
        invoiceDate,
        originalBudgetTotal,
        initialPaymentMade,
        subtotalExtras,
        finalAmountDue,
        status: invoiceStatus,
        paymentDate,
        Work: workData,
        extraItems = []
      } = invoiceData;

      if (!workData) {
        throw new Error('No se encontraron datos de trabajo (Work) en la factura');
      }

      const {
        propertyAddress,
        budget: budgetData,
        changeOrders = []
      } = workData;

      const clientName = budgetData?.applicantName || "Valued Customer";
      const clientEmail = budgetData?.Permit?.applicantEmail || budgetData?.applicantEmail;

      const formattedInvoiceDate = formatDateDDMMYYYY(invoiceDate);
      const invoiceNumber = invoiceId?.toString().substring(0, 8) || 'UNKNOWN';

      // --- 2. Configurar PDF ---
      const doc = new PDFDocument({ autoFirstPage: false, margin: NEW_PAGE_MARGIN, size: 'A4' });
      const uploadsDir = path.join(__dirname, '../../uploads/final_invoices');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      
      const pdfPath = path.join(uploadsDir, `final_invoice_${invoiceNumber}.pdf`);
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      doc.addPage();

      // --- 3. Construir PDF con estilo Budget ---
      _addFinalInvoiceHeader(doc, invoiceData, workData, budgetData, formattedInvoiceDate, invoiceNumber);

      const contentWidth = doc.page.width - NEW_PAGE_MARGIN * 2;

      // === TABLA DE ÍTEMS ===
      const tableTop = doc.y;
      const cellPadding = 5;

      // ✅ USAR LOS MISMOS ANCHOS DEL BUDGET
      const colIncludedW = contentWidth * 0.20;
      const colDescW = contentWidth * 0.40;
      const colQtyW = contentWidth * 0.08;
      const colRateW = contentWidth * 0.12;
      const colAmountW = contentWidth * 0.15;

      const xIncludedText = NEW_PAGE_MARGIN + cellPadding;
      const xDescText = NEW_PAGE_MARGIN + colIncludedW + cellPadding;
      const xQtyText = NEW_PAGE_MARGIN + colIncludedW + colDescW + cellPadding;
      const xRateText = NEW_PAGE_MARGIN + colIncludedW + colDescW + colQtyW + cellPadding;
      const xAmountText = NEW_PAGE_MARGIN + colIncludedW + colDescW + colQtyW + colRateW + cellPadding;

      const wIncluded = colIncludedW - (2 * cellPadding);
      const wDesc = colDescW - (2 * cellPadding);
      const wQty = colQtyW - (2 * cellPadding);
      const wRate = colRateW - (2 * cellPadding);
      const wAmount = colAmountW - (2 * cellPadding);

      // Table Header - ESTILO EXACTO DEL BUDGET
      doc.font(FONT_FAMILY_MONO_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK);
      const headerY = tableTop;
      doc.rect(NEW_PAGE_MARGIN, headerY - 3, contentWidth, 18)
        .fillColor(COLOR_BACKGROUND_TABLE_HEADER).strokeColor(COLOR_BORDER_LIGHT).fillAndStroke();
      doc.fillColor(COLOR_TEXT_DARK);
      doc.text('ITEM TYPE', xIncludedText, headerY + 2, { width: wIncluded });
      doc.text('DESCRIPTION', xDescText, headerY + 2, { width: wDesc });
      doc.text('QTY', xQtyText, headerY + 2, { width: wQty, align: 'right' });
      doc.text('RATE', xRateText, headerY + 2, { width: wRate, align: 'right' });
      doc.text('AMOUNT', xAmountText, headerY + 2, { width: wAmount, align: 'right' });
      doc.font(FONT_FAMILY_MONO);
      doc.y = headerY + 18;
      doc.moveDown(0.5);

      doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);

      // ITEM PRINCIPAL - SEPTIC SYSTEM
      const mainItemName = "SEPTIC SYSTEM";
      const mainItemDesc = "COMPLETE INSTALLATION OF THE SYSTEM (LABOR AND MATERIALS)";
      const mainItemQty = 1;
      const mainItemRate = parseFloat(originalBudgetTotal || 0);

      let currentItemY = doc.y;
      doc.text(mainItemName, xIncludedText, currentItemY, { width: wIncluded });
      doc.text(mainItemDesc, xDescText, currentItemY, { width: wDesc });
      doc.text(mainItemQty.toFixed(0), xQtyText, currentItemY, { width: wQty, align: 'right' });
      doc.text(`$${mainItemRate.toFixed(2)}`, xRateText, currentItemY, { width: wRate, align: 'right' });
      doc.text(`$${mainItemRate.toFixed(2)}`, xAmountText, currentItemY, { width: wAmount, align: 'right' });
      doc.moveDown(3.5);

      // ITEMS ADICIONALES (EXTRA ITEMS)
      if (extraItems && extraItems.length > 0) {
        extraItems.forEach(item => {
          const itemQty = parseFloat(item.quantity || 1);
          const itemRate = parseFloat(item.unitPrice || 0);
          const itemAmount = parseFloat(item.lineTotal || 0);

          currentItemY = doc.y;
          doc.text("EXTRA ITEM", xIncludedText, currentItemY, { width: wIncluded });
          doc.text(item.description || 'Additional Work', xDescText, currentItemY, { width: wDesc });
          doc.text(itemQty.toFixed(0), xQtyText, currentItemY, { width: wQty, align: 'right' });
          doc.text(`$${itemRate.toFixed(2)}`, xRateText, currentItemY, { width: wRate, align: 'right' });
          doc.text(`$${itemAmount.toFixed(2)}`, xAmountText, currentItemY, { width: wAmount, align: 'right' });
          doc.moveDown(3.0);
        });
      }

      // Línea final de la tabla
      doc.moveTo(NEW_PAGE_MARGIN, doc.y).lineTo(doc.page.width - NEW_PAGE_MARGIN, doc.y)
        .strokeColor(COLOR_BORDER_LIGHT).lineWidth(0.5).stroke();
      doc.moveDown(2.0);

      // === SECCIÓN DE TOTALES Y PAGO - ESTILO BUDGET ===
      const thankYouAndPaymentInfoY = doc.y;
      const paymentInfoWidth = contentWidth * 0.55;

      doc.font(FONT_FAMILY_MONO_BOLD).fontSize(10).fillColor(COLOR_TEXT_LIGHT)
        .text("Thank you for your business!", NEW_PAGE_MARGIN, doc.y, { width: contentWidth, align: 'left' });
      doc.moveDown(1.8);

      doc.font(FONT_FAMILY_MONO_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK)
        .text("PAYMENT INFORMATION", NEW_PAGE_MARGIN, doc.y, { width: paymentInfoWidth });
      doc.moveDown(0.3);
      doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);
      doc.text("BANK: BANK OF AMERICA".toUpperCase(), NEW_PAGE_MARGIN, doc.y, { width: paymentInfoWidth });
      doc.moveDown(0.3);
      doc.text("ACCOUNT NUMBER: 898138399808".toUpperCase(), NEW_PAGE_MARGIN, doc.y, { width: paymentInfoWidth });
      doc.moveDown(0.3);
      doc.text("ROUTING NUMBER: 063100277".toUpperCase(), NEW_PAGE_MARGIN, doc.y, { width: paymentInfoWidth });
      doc.moveDown(0.3);
      doc.text("EMAIL: ZURCHERCONSTRUCTION.FL@GMAIL.COM".toUpperCase(), NEW_PAGE_MARGIN, doc.y, { width: paymentInfoWidth });

      const yAfterPaymentInfo = doc.y;
      doc.y = thankYouAndPaymentInfoY;

      // SECCIÓN DE TOTALES - ALINEACIÓN PERFECTA DEL BUDGET
      const totalsStartX = NEW_PAGE_MARGIN + contentWidth * 0.55;
      const totalsValueX = NEW_PAGE_MARGIN + contentWidth * 0.85;
      const totalsRightEdge = doc.page.width - NEW_PAGE_MARGIN;

      let currentTotalY = doc.y;

      // ORIGINAL BUDGET
      doc.font(FONT_FAMILY_MONO).fontSize(11).fillColor(COLOR_TEXT_MEDIUM);
      doc.text("ORIGINAL BUDGET", totalsStartX, currentTotalY, { width: totalsValueX - totalsStartX - cellPadding, align: 'left' });
      doc.text(`$${parseFloat(originalBudgetTotal || 0).toFixed(2)}`, totalsValueX, currentTotalY, { width: totalsRightEdge - totalsValueX, align: 'right' });
      doc.moveDown(0.6);

      // ADDITIONAL ITEMS (si existen)
      if (subtotalExtras && parseFloat(subtotalExtras) > 0) {
        currentTotalY = doc.y;
        doc.text("ADDITIONAL ITEMS", totalsStartX, currentTotalY, { width: totalsValueX - totalsStartX - cellPadding, align: 'left' });
        doc.text(`$${parseFloat(subtotalExtras).toFixed(2)}`, totalsValueX, currentTotalY, { width: totalsRightEdge - totalsValueX, align: 'right' });
        doc.moveDown(0.6);
      }

      // INITIAL PAYMENT (si existe)
      if (initialPaymentMade && parseFloat(initialPaymentMade) > 0) {
        currentTotalY = doc.y;
        doc.text("INITIAL PAYMENT", totalsStartX, currentTotalY, { width: totalsValueX - totalsStartX - cellPadding, align: 'left' });
        doc.text(`-$${parseFloat(initialPaymentMade).toFixed(2)}`, totalsValueX, currentTotalY, { width: totalsRightEdge - totalsValueX, align: 'right' });
        doc.moveDown(0.6);
      }

      // TAX
      currentTotalY = doc.y;
      doc.text("TAX", totalsStartX, currentTotalY, { width: totalsValueX - totalsStartX - cellPadding, align: 'left' });
      doc.font(FONT_FAMILY_MONO).fontSize(9).fillColor(COLOR_TEXT_MEDIUM);
      doc.text(`$0.00`, totalsValueX, currentTotalY, { width: totalsRightEdge - totalsValueX, align: 'right' });
      doc.moveDown(0.8);

      // LÍNEA DIVISORIA
      const lineY = doc.y;
      doc.moveTo(totalsStartX, lineY)
        .lineTo(totalsRightEdge, lineY)
        .strokeColor(COLOR_BORDER_LIGHT)
        .lineWidth(0.8)
        .stroke();
      doc.moveDown(1.2);

      // BALANCE DUE / PAID IN FULL
      currentTotalY = doc.y;
      if (invoiceStatus === 'paid') {
        doc.font(FONT_FAMILY_MONO_BOLD).fontSize(14).fillColor('green');
        doc.text("PAID IN FULL", totalsStartX, currentTotalY, { width: totalsRightEdge - totalsStartX, align: 'center' });
      } else {
        doc.font(FONT_FAMILY_MONO).fontSize(11).fillColor(COLOR_TEXT_DARK);
        doc.text("BALANCE DUE", totalsStartX, currentTotalY, { width: totalsValueX - totalsStartX - cellPadding, align: 'left' });
        doc.font(FONT_FAMILY_MONO_BOLD).fontSize(14).fillColor(COLOR_TEXT_DARK);
        doc.text(`$${parseFloat(finalAmountDue || 0).toFixed(2)}`, totalsValueX, currentTotalY, { width: totalsRightEdge - totalsValueX, align: 'right' });
      }

      const yAfterTotals = doc.y;
      doc.y = Math.max(yAfterPaymentInfo, yAfterTotals);
      doc.moveDown(2);

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