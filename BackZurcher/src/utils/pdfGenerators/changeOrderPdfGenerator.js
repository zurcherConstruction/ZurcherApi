const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Importar desde archivos compartidos
const {

  NEW_PAGE_MARGIN,
  FONT_FAMILY_MONO,
  FONT_FAMILY_MONO_BOLD,
  COLOR_TEXT_DARK,
  COLOR_TEXT_MEDIUM,
  COLOR_BORDER_LIGHT,
  COLOR_BACKGROUND_TABLE_HEADER
} = require('./shared/constants');

const { formatDateDDMMYYYY } = require('./shared/helpers');

// === FUNCIÓN DE ENCABEZADO ESTILIZADO ===
function _addChangeOrderHeader(doc, changeOrderData, workData, formattedDate, coNumber) {
  const logoPath = path.join(__dirname, '../../assets/logo.png');
  const headerStartY = NEW_PAGE_MARGIN;
  const contentWidth = doc.page.width - NEW_PAGE_MARGIN * 2;

  const companyInfoX = NEW_PAGE_MARGIN;
  const companyInfoWidth = contentWidth * 0.55;
  const coInfoX = NEW_PAGE_MARGIN + companyInfoWidth + 10;
  const coInfoWidth = contentWidth - companyInfoWidth - 10;

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
  doc.text("admin@zurcherseptic.com", companyInfoX, doc.y, { width: companyInfoWidth });
  doc.text("+1 (407) 419-4495", companyInfoX, doc.y, { width: companyInfoWidth });
  const finalYLeftTop = doc.y;

  let currentYRight = headerStartY + 5;
  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(20).fillColor('#063260')
    .text(`CHANGE ORDER`, coInfoX, currentYRight, { width: coInfoWidth, align: 'right' });
  currentYRight = doc.y + 45;

  // ✅ ALINEACIÓN PERFECTA - TODOS LOS TEXTOS EMPIEZAN EN LA MISMA POSICIÓN X
  doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);

  const dateTextStartX = coInfoX + 120;
  const dateTextWidth = coInfoWidth - 50;

  doc.text("DATE:", dateTextStartX, currentYRight, { width: dateTextWidth, align: 'left' });
  currentYRight += doc.currentLineHeight() + 2;

  doc.text(formattedDate, dateTextStartX, currentYRight, { width: dateTextWidth, align: 'left' });
  currentYRight += doc.currentLineHeight() + 4;

  doc.text("DUE DATE:", dateTextStartX, currentYRight, { width: dateTextWidth, align: 'left' });
  currentYRight += doc.currentLineHeight() + 2;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30); // Vencimiento en 30 días
  const formattedDueDate = formatDateDDMMYYYY(dueDate.toISOString());

   doc.text(formattedDueDate, dateTextStartX, currentYRight, { width: dateTextWidth, align: 'left' });
  currentYRight += doc.currentLineHeight();
  
 
  currentYRight += doc.currentLineHeight();

  doc.y = currentYRight;
  const finalYRightTop = doc.y;
  doc.y = Math.max(finalYLeftTop, finalYRightTop) + 15;
  
  // --- Línea Divisora ---
  doc.moveTo(NEW_PAGE_MARGIN, doc.y).lineTo(doc.page.width - NEW_PAGE_MARGIN, doc.y)
    .strokeColor(COLOR_BORDER_LIGHT).lineWidth(0.7).stroke();
  doc.moveDown(1);

  // --- Información Cliente y Trabajo ---
  const { propertyAddress } = workData;
  const clientName = workData.budget?.applicantName || workData.Permit?.applicantName || "Valued Customer";
  const clientEmail = workData.budget?.Permit?.applicantEmail || workData.budget?.applicantEmail;

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
  // ✅ LÓGICA MODIFICADA PARA LA TERCERA COLUMNA
  const paymentInfoX = workLocationX + columnWidth + columnGap;
  
  // Calcular el porcentaje restante del presupuesto original
  const initialPercentage = parseFloat(workData.budget?.initialPaymentPercentage || 0);
  const finalPercentage = 100 - initialPercentage;
  const paymentText = `PAYMENT WILL BE MADE ALONG WITH THE FINAL ${finalPercentage}% BALANCE OF THE PROJECT.`;

  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK)
    .text("PAYMENT", paymentInfoX, subHeaderStartY, { width: columnWidth });
  doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);
  doc.text(paymentText.toUpperCase(), paymentInfoX, doc.y + 2, { width: columnWidth });
  const finalYCol3 = doc.y;

  doc.y = Math.max(finalYCol1, finalYCol2, finalYCol3);
  doc.moveDown(1);
  doc.moveTo(NEW_PAGE_MARGIN, doc.y).lineTo(doc.page.width - NEW_PAGE_MARGIN, doc.y)
    .strokeColor(COLOR_BORDER_LIGHT).lineWidth(0.7).stroke();
  doc.moveDown(1);
}

// === SECCIÓN DE FIRMA ESTILIZADA ===
function _addChangeOrderSignatureSection(doc) {
  const contentWidth = doc.page.width - NEW_PAGE_MARGIN * 2;
  
  // Verificar espacio disponible
  if (doc.y + 120 > doc.page.height - NEW_PAGE_MARGIN) {
    doc.addPage();
    doc.y = NEW_PAGE_MARGIN;
  }

  doc.moveDown(2);
  
  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK);
  doc.text('', NEW_PAGE_MARGIN, doc.y, { width: contentWidth, underline: true });
  doc.moveDown(0.5);
  
  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(12).fillColor(COLOR_TEXT_MEDIUM);
  doc.text("Please sign below to confirm acceptance of this change order.", 
    NEW_PAGE_MARGIN, doc.y, { width: contentWidth, align: 'justify' });
  doc.moveDown(1.5);

  const sigFieldWidth = (contentWidth / 2) - 10;
  const sigLineFullWidth = sigFieldWidth - 80;
  const dateLineFullWidth = sigFieldWidth - 110;

  doc.font(FONT_FAMILY_MONO).fontSize(9).fillColor(COLOR_TEXT_DARK);

  let currentLineY = doc.y;
  doc.text("Client Signature:", NEW_PAGE_MARGIN, currentLineY, { width: 85 });
  doc.moveTo(NEW_PAGE_MARGIN + 85, currentLineY + 8).lineTo(NEW_PAGE_MARGIN + 85 + sigLineFullWidth, currentLineY + 8)
    .strokeColor(COLOR_TEXT_DARK).lineWidth(0.5).stroke();

  doc.text("Date:", NEW_PAGE_MARGIN + sigFieldWidth + 10, currentLineY, { width: 30 });
  doc.moveTo(NEW_PAGE_MARGIN + sigFieldWidth + 10 + 30, currentLineY + 8)
    .lineTo(NEW_PAGE_MARGIN + sigFieldWidth + 10 + 30 + dateLineFullWidth, currentLineY + 8)
    .strokeColor(COLOR_TEXT_DARK).lineWidth(0.5).stroke();
  doc.moveDown(2.5);

  currentLineY = doc.y;
  doc.text("Provider Representative:", NEW_PAGE_MARGIN, currentLineY, { width: 120 });
  doc.moveTo(NEW_PAGE_MARGIN + 120, currentLineY + 8)
    .lineTo(NEW_PAGE_MARGIN + 120 + (sigLineFullWidth - 35), currentLineY + 8)
    .strokeColor(COLOR_TEXT_DARK).lineWidth(0.5).stroke();

  doc.text("Date:", NEW_PAGE_MARGIN + sigFieldWidth + 10, currentLineY, { width: 30 });
  doc.moveTo(NEW_PAGE_MARGIN + sigFieldWidth + 10 + 30, currentLineY + 8)
    .lineTo(NEW_PAGE_MARGIN + sigFieldWidth + 10 + 30 + dateLineFullWidth, currentLineY + 8)
    .strokeColor(COLOR_TEXT_DARK).lineWidth(0.5).stroke();
  doc.moveDown(1.5);
}

async function generateAndSaveChangeOrderPDF(changeOrderData, workData, companyData) {
  return new Promise(async (resolve, reject) => {
    try {
      // --- 1. Preparar Datos ---
       const {
        id: changeOrderId,
        changeOrderNumber,
        description: coDescription,
        itemDescription,
        hours,
        unitCost,
        totalCost,
        status: coStatus,
        clientMessage,
        createdAt: coCreatedAt,
      } = changeOrderData;

      const { propertyAddress } = workData;
      const clientName = workData.budget?.applicantName || workData.Permit?.applicantName || "Valued Customer";

      const formattedCODate = formatDateDDMMYYYY(coCreatedAt || new Date().toISOString());
      const coNumber = changeOrderNumber || changeOrderId.toString().substring(0, 8);

      // --- 2. Configurar PDF ---
      const doc = new PDFDocument({ autoFirstPage: false, margin: NEW_PAGE_MARGIN, size: 'A4' });
      const uploadsDir = path.join(__dirname, '../../uploads/change_orders');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      
      const pdfPath = path.join(uploadsDir, `change_order_${coNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      doc.addPage();

      // --- 3. Construir PDF con estilo Budget ---
      _addChangeOrderHeader(doc, changeOrderData, workData, formattedCODate, coNumber);

      const contentWidth = doc.page.width - NEW_PAGE_MARGIN * 2;

      // === TABLA DE ÍTEMS DEL CHANGE ORDER ===
      const tableTop = doc.y;
      const cellPadding = 5;

    const colTypeW = contentWidth * 0.20;   // 20%
      const colDescW = contentWidth * 0.35;   // 35% (reducido)
      const colQtyW = contentWidth * 0.15;    // 15% (aumentado)
      const colRateW = contentWidth * 0.15;   // 15% (aumentado)
      const colAmountW = contentWidth * 0.15;

      const xTypeText = NEW_PAGE_MARGIN + cellPadding;
      const xDescText = NEW_PAGE_MARGIN + colTypeW + cellPadding;
      const xQtyText = NEW_PAGE_MARGIN + colTypeW + colDescW + cellPadding;
      const xRateText = NEW_PAGE_MARGIN + colTypeW + colDescW + colQtyW + cellPadding;
      const xAmountText = NEW_PAGE_MARGIN + colTypeW + colDescW + colQtyW + colRateW + cellPadding;

      const wType = colTypeW - (2 * cellPadding);
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
      doc.text('INCLUDED', xTypeText, headerY + 2, { width: wType });
      doc.text('DESCRIPTION', xDescText, headerY + 2, { width: wDesc });
      doc.text('QTY/HOURS', xQtyText, headerY + 2, { width: wQty, align: 'right' });
      doc.text('UNIT PRICE', xRateText, headerY + 2, { width: wRate, align: 'right' });
      doc.text('AMOUNT', xAmountText, headerY + 2, { width: wAmount, align: 'right' });
      doc.font(FONT_FAMILY_MONO);
      doc.y = headerY + 18;
      doc.moveDown(0.5);

      doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);

     // ✅ PARSEO ROBUSTO DE NÚMEROS PARA EVITAR NaN
      const workType = coDescription || "ADDITIONAL WORK";
      const workDesc = itemDescription || "";
      const parsedHours = parseFloat(hours);
      const parsedUnitCost = parseFloat(unitCost);
      const parsedTotalCost = parseFloat(totalCost);

      const workHours = !isNaN(parsedHours) ? parsedHours : 0;
      const workRate = !isNaN(parsedUnitCost) ? parsedUnitCost : 0;
      const workAmount = !isNaN(parsedTotalCost) ? parsedTotalCost : 0;

      let currentItemY = doc.y;
      doc.text(workType.toUpperCase().replace(/_/g, ' '), xTypeText, currentItemY, { width: wType });
      doc.text(workDesc.toUpperCase(), xDescText, currentItemY, { width: wDesc });
      doc.text(workHours.toFixed(1), xQtyText, currentItemY, { width: wQty, align: 'right' });
      doc.text(`$${workRate.toFixed(2)}`, xRateText, currentItemY, { width: wRate, align: 'right' });
      doc.text(`$${workAmount.toFixed(2)}`, xAmountText, currentItemY, { width: wAmount, align: 'right' });
      doc.moveDown(3.5);

      // Línea final de la tabla
      doc.moveTo(NEW_PAGE_MARGIN, doc.y).lineTo(doc.page.width - NEW_PAGE_MARGIN, doc.y)
        .strokeColor(COLOR_BORDER_LIGHT).lineWidth(0.5).stroke();
      doc.moveDown(2.0);

      // === MENSAJE AL CLIENTE ===
      if (clientMessage && clientMessage.trim() !== '') {
        doc.font(FONT_FAMILY_MONO_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK);
        doc.text("ADDITIONAL NOTES:", NEW_PAGE_MARGIN, doc.y);
        doc.moveDown(0.5);
        doc.font(FONT_FAMILY_MONO).fontSize(9).fillColor(COLOR_TEXT_MEDIUM);
        doc.text(clientMessage, NEW_PAGE_MARGIN, doc.y, { width: contentWidth, align: 'justify' });
        doc.moveDown(2);
      }

      // ✅ SECCIÓN DE TOTALES (LÓGICA MODIFICADA)
      // Se elimina la información de pago y se usa el estilo del presupuesto.
      const totalsStartX = NEW_PAGE_MARGIN + contentWidth * 0.55;
      const totalsValueX = NEW_PAGE_MARGIN + contentWidth * 0.85;
      const totalsRightEdge = doc.page.width - NEW_PAGE_MARGIN;

      let currentTotalY = doc.y;

      // SUBTOTAL
      doc.font(FONT_FAMILY_MONO).fontSize(11).fillColor(COLOR_TEXT_MEDIUM);
      doc.text("SUBTOTAL", totalsStartX, currentTotalY, { width: totalsValueX - totalsStartX - cellPadding, align: 'left' });
      doc.text(`$${workAmount.toFixed(2)}`, totalsValueX, currentTotalY, { width: totalsRightEdge - totalsValueX, align: 'right' });
      doc.moveDown(0.6);

      // TAX
      currentTotalY = doc.y;
      doc.text("TAX", totalsStartX, currentTotalY, { width: totalsValueX - totalsStartX - cellPadding, align: 'left' });
      doc.font(FONT_FAMILY_MONO).fontSize(9).fillColor(COLOR_TEXT_MEDIUM);
      doc.text(`$0.00`, totalsValueX, currentTotalY, { width: totalsRightEdge - totalsValueX, align: 'right' });
      doc.moveDown(0.6);

      // TOTAL
      currentTotalY = doc.y;
      doc.font(FONT_FAMILY_MONO).fontSize(11).fillColor(COLOR_TEXT_MEDIUM);
      doc.text("TOTAL", totalsStartX, currentTotalY, { width: totalsValueX - totalsStartX - cellPadding, align: 'left' });
      doc.font(FONT_FAMILY_MONO).fontSize(9).fillColor(COLOR_TEXT_MEDIUM);
      doc.text(`$${workAmount.toFixed(2)}`, totalsValueX, currentTotalY, { width: totalsRightEdge - totalsValueX, align: 'right' });
      doc.moveDown(0.8);

      // LÍNEA DIVISORIA
      const lineY = doc.y;
      doc.moveTo(totalsStartX, lineY)
        .lineTo(totalsRightEdge, lineY)
        .strokeColor(COLOR_BORDER_LIGHT)
        .lineWidth(0.8)
        .stroke();
      doc.moveDown(1.2);

      // BALANCE DUE
      currentTotalY = doc.y;
      doc.font(FONT_FAMILY_MONO).fontSize(11).fillColor(COLOR_TEXT_DARK);
      doc.text("BALANCE DUE", totalsStartX, currentTotalY, { width: totalsValueX - totalsStartX - cellPadding, align: 'left' });
      doc.font(FONT_FAMILY_MONO_BOLD).fontSize(14).fillColor(COLOR_TEXT_DARK);
      doc.text(`$${workAmount.toFixed(2)}`, totalsValueX, currentTotalY, { width: totalsRightEdge - totalsValueX, align: 'right' });

      doc.moveDown(2);

      // === SECCIÓN DE FIRMA ===
      _addChangeOrderSignatureSection(doc);

      // --- 4. Finalizar PDF ---
      doc.end();

      // --- 5. Resolver Promesa ---
      stream.on('finish', () => {
        console.log(`Change Order PDF generado: ${pdfPath}`);
        resolve(pdfPath);
      });
      stream.on('error', (err) => {
        console.error("Error al escribir el stream del PDF del Change Order:", err);
        reject(err);
      });

    } catch (error) {
      console.error("Error dentro de generateAndSaveChangeOrderPDF:", error);
      reject(error);
    }
  });
};

module.exports = { generateAndSaveChangeOrderPDF };