const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Importar desde archivos compartidos
const {
  pageMargin,
  NEW_PAGE_MARGIN,
  FONT_FAMILY_REGULAR,
  FONT_FAMILY_BOLD,
  FONT_FAMILY_MONO,
  FONT_FAMILY_MONO_BOLD,
  COLOR_TEXT_DARK,
  COLOR_TEXT_MEDIUM,
  COLOR_TEXT_LIGHT,
  COLOR_BORDER_LIGHT,
  COLOR_BORDER_MEDIUM, // 🆕 Importar constante faltante
  COLOR_BACKGROUND_TABLE_HEADER
} = require('./shared/constants');

const { formatDateDDMMYYYY } = require('./shared/helpers');

/**
 * Genera el encabezado del PDF para SimpleWork
 */
function _addPageHeader(doc, simpleWorkData, formattedDate) {
  const logoPath = path.join(__dirname, '../../assets/logo.png');
  const headerStartY = NEW_PAGE_MARGIN;
  const contentWidth = doc.page.width - NEW_PAGE_MARGIN * 2;

  const { workNumber, propertyAddress, clientData, workType, status, initialPaymentPercentage, initialPayment } = simpleWorkData;
  
  // Información de la empresa (lado izquierdo)
  const companyInfoX = NEW_PAGE_MARGIN;
  const companyInfoWidth = contentWidth * 0.55;
  
  // Información del presupuesto (lado derecho)
  const quoteInfoX = NEW_PAGE_MARGIN + companyInfoWidth + 10;
  const quoteInfoWidth = contentWidth - companyInfoWidth - 10;

  let currentYLeft = headerStartY;
  
  // Logo de la empresa
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, companyInfoX, currentYLeft, { width: 70 });
    currentYLeft += 30 + 40;
  } else {
    currentYLeft = headerStartY;
    doc.font(FONT_FAMILY_MONO_BOLD).fontSize(14).fillColor(COLOR_TEXT_DARK)
      .text("ZURCHER CONSTRUCTION", companyInfoX, currentYLeft, { width: companyInfoWidth });
    currentYLeft += doc.currentLineHeight() + 2;
  }

  // Información de contacto de la empresa
  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(12).fillColor(COLOR_TEXT_DARK)
    .text("ZURCHER CONSTRUCTION", companyInfoX, currentYLeft, { width: companyInfoWidth });
  doc.font(FONT_FAMILY_MONO).fontSize(12).fillColor(COLOR_TEXT_MEDIUM);
  doc.text("SEPTIC TANK DIVISION - CFC1433240", companyInfoX, doc.y, { width: companyInfoWidth });
  doc.text("admin@zurcherseptic.com", companyInfoX, doc.y, { width: companyInfoWidth });
  doc.text("+1 (954) 636-8200", companyInfoX, doc.y, { width: companyInfoWidth });
  const finalYLeftTop = doc.y;

  // Información del presupuesto (lado derecho)
  let currentYRight = headerStartY + 5;
  
  // Determinar si es QUOTE o INVOICE
  const isCompleted = status === 'completed' || status === 'paid';
  const documentLabel = isCompleted ? 'INVOICE' : 'QUOTE';
  
  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(14).fillColor('#063260')
    .text(`${documentLabel} #${workNumber}`, quoteInfoX, currentYRight, { width: quoteInfoWidth, align: 'right' });
  currentYRight = doc.y + 45;

  // Fecha del documento
  const dateTextStartX = quoteInfoX + 120;
  const dateTextWidth = quoteInfoWidth - 50;

  doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);
  doc.text("DATE:", dateTextStartX, currentYRight, { width: dateTextWidth, align: 'left' });
  currentYRight += doc.currentLineHeight() + 2;
  doc.text(formattedDate, dateTextStartX, currentYRight, { width: dateTextWidth, align: 'left' });

  doc.y = Math.max(finalYLeftTop, currentYRight) + 15;
  
  // Línea divisora
  doc.moveTo(NEW_PAGE_MARGIN, doc.y).lineTo(doc.page.width - NEW_PAGE_MARGIN, doc.y)
    .strokeColor(COLOR_BORDER_LIGHT).lineWidth(0.7).stroke();
  doc.moveDown(1);

  // Información del cliente y trabajo (parte inferior del encabezado) - similar a Budget
  const subHeaderStartY = doc.y;
  const columnGap = 15;
  const columnWidth = (contentWidth - columnGap * 2) / 3; // 3 columnas como Budget

  // Información del cliente (izquierda)
  const customerInfoX = NEW_PAGE_MARGIN;
  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK)
    .text("CUSTOMER INFO", customerInfoX, subHeaderStartY, { width: columnWidth });
  doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);
  const clientName = clientData.firstName && clientData.lastName 
    ? `${clientData.firstName} ${clientData.lastName}`.toUpperCase()
    : (clientData.name || 'N/A').toUpperCase();
  doc.text(clientName, customerInfoX, doc.y + 2, { width: columnWidth });
  if (clientData.email) {
    doc.text(clientData.email.toLowerCase(), customerInfoX, doc.y, { width: columnWidth });
  }
  if (clientData.phone) {
    doc.text(clientData.phone, customerInfoX, doc.y, { width: columnWidth });
  }
  const finalYCol1 = doc.y;

  // Información del trabajo (centro)
  doc.y = subHeaderStartY;
  const workLocationX = customerInfoX + columnWidth + columnGap;
  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK)
    .text("WORK LOCATION", workLocationX, subHeaderStartY, { width: columnWidth });
  doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);
  doc.text((propertyAddress || 'N/A').toUpperCase(), workLocationX, doc.y + 2, { width: columnWidth });
  const finalYCol2 = doc.y;

  // Información de pago (derecha) - como Budget
  doc.y = subHeaderStartY;
  const paymentInfoX = workLocationX + columnWidth + columnGap;
  if (initialPaymentPercentage !== undefined && initialPayment !== undefined) {
    doc.font(FONT_FAMILY_MONO_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK)
      .text("PAYMENT INFO", paymentInfoX, subHeaderStartY, { width: columnWidth });
    doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);
    
    const paymentPercentage = parseFloat(initialPaymentPercentage);
    const totalAmount = parseFloat(simpleWorkData.finalAmount || simpleWorkData.estimatedAmount || 0);
    const initialAmount = parseFloat(initialPayment || 0);
    const remainingAmount = totalAmount - initialAmount;
    
    if (paymentPercentage === 100) {
      doc.text("TOTAL", paymentInfoX, doc.y + 2, { width: columnWidth });
      doc.text(`$${totalAmount.toFixed(2)}`, paymentInfoX, doc.y, { width: columnWidth });
    } else {
      doc.text(`Total: $${totalAmount.toFixed(2)}`, paymentInfoX, doc.y + 2, { width: columnWidth });
      doc.text(`${paymentPercentage}% Required: $${initialAmount.toFixed(2)}`, paymentInfoX, doc.y + 2, { width: columnWidth });
      doc.text(`Remaining: $${remainingAmount.toFixed(2)}`, paymentInfoX, doc.y + 2, { width: columnWidth });
    }
  }
  const finalYCol3 = doc.y;

  doc.y = Math.max(finalYCol1, finalYCol2, finalYCol3);
  
  // Línea divisora final
  doc.moveDown(1);
  doc.moveTo(NEW_PAGE_MARGIN, doc.y).lineTo(doc.page.width - NEW_PAGE_MARGIN, doc.y)
    .strokeColor(COLOR_BORDER_LIGHT).lineWidth(0.7).stroke();
  doc.moveDown(1);
}

/**
 * Convierte el tipo de trabajo a texto legible
 */
function _getWorkTypeDisplay(workType) {
  const typeMap = {
    culvert: 'Culvert Installation',
    drainfield: 'Drainfield Work',
    concrete_work: 'Concrete Work',
    excavation: 'Excavation Service',
    plumbing: 'Plumbing Service',
    electrical: 'Electrical Work',
    landscaping: 'Landscaping Service',
    other: 'General Construction'
  };
  return typeMap[workType] || workType;
}

/**
 * Genera una tabla de items como en Budget (con 5 columnas)
 */
function _addItemsTable(doc, simpleWorkData) {
  const contentWidth = doc.page.width - NEW_PAGE_MARGIN * 2;
  const { items } = simpleWorkData;  // Changed from simpleWorkItems to items
  
  if (!items || items.length === 0) {
    return;
  }
  
  // --- Item Table (igual que Budget) ---
  const tableTop = doc.y;
  const cellPadding = 5;

  // Anchos de columnas exactamente como Budget
  const colIncludedW = contentWidth * 0.20;
  const colDescW = contentWidth * 0.40;
  const colQtyW = contentWidth * 0.08;
  const colRateW = contentWidth * 0.12;
  const colAmountW = contentWidth * 0.15;

  // Posiciones X del texto
  const xIncludedText = NEW_PAGE_MARGIN + cellPadding;
  const xDescText = NEW_PAGE_MARGIN + colIncludedW + cellPadding;
  const xQtyText = NEW_PAGE_MARGIN + colIncludedW + colDescW + cellPadding;
  const xRateText = NEW_PAGE_MARGIN + colIncludedW + colDescW + colQtyW + cellPadding;
  const xAmountText = NEW_PAGE_MARGIN + colIncludedW + colDescW + colQtyW + colRateW + cellPadding;

  // Anchos para el texto
  const wIncluded = colIncludedW - (2 * cellPadding);
  const wDesc = colDescW - (2 * cellPadding);
  const wQty = colQtyW - (2 * cellPadding);
  const wRate = colRateW - (2 * cellPadding);
  const wAmount = colAmountW - (2 * cellPadding);

  // Table Header (igual que Budget)
  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK);
  const headerY = tableTop;
  doc.rect(NEW_PAGE_MARGIN, headerY - 3, contentWidth, 18)
    .fillColor(COLOR_BACKGROUND_TABLE_HEADER).strokeColor(COLOR_BORDER_LIGHT).fillAndStroke();
  doc.fillColor(COLOR_TEXT_DARK);
  doc.text('INCLUDED', xIncludedText, headerY + 2, { width: wIncluded });
  doc.text('DESCRIPTION', xDescText, headerY + 2, { width: wDesc });
  doc.text('QTY', xQtyText, headerY + 2, { width: wQty, align: 'right' });
  doc.text('RATE', xRateText, headerY + 2, { width: wRate, align: 'right' });
  doc.text('AMOUNT', xAmountText, headerY + 2, { width: wAmount, align: 'right' });
  doc.font(FONT_FAMILY_MONO);
  doc.y = headerY + 18;
  doc.moveDown(0.5);

  // Item rows
  doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);
  
  let currentItemY = doc.y;
  
  // Add items with their actual prices
  items.forEach((item, index) => {
    const itemQty = parseInt(item.quantity) || 1;
    const itemRate = parseFloat(item.unitCost) || 0;
    const itemAmount = itemQty * itemRate;
    
    currentItemY = doc.y;
    
    // Use category as the INCLUDED column (user-typed)
    const itemIncluded = (item.category || '').toUpperCase();
    const itemDesc = item.description || '';
    
    doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);
    doc.text(itemIncluded, xIncludedText, currentItemY, { width: wIncluded });
    doc.text(itemDesc, xDescText, currentItemY, { width: wDesc });
    doc.text(itemQty.toString(), xQtyText, currentItemY, { width: wQty, align: 'right' });
    doc.text(`$${itemRate.toFixed(2)}`, xRateText, currentItemY, { width: wRate, align: 'right' });
    doc.text(`$${itemAmount.toFixed(2)}`, xAmountText, currentItemY, { width: wAmount, align: 'right' });
    
    doc.moveDown(3.0);
  });
  
  doc.moveDown(1);
}

/**
 * Genera el resumen de pago con información de pago
 */
function _addPaymentSummary(doc, simpleWorkData) {
  const contentWidth = doc.page.width - NEW_PAGE_MARGIN * 2;
  const { estimatedAmount, finalAmount, initialPaymentPercentage, initialPayment, status, items } = simpleWorkData;
  
  // Calculate total from items if available, otherwise use finalAmount/estimatedAmount
  let totalAmount = 0;
  
  if (items && items.length > 0) {
    totalAmount = items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 1;
      const unitPrice = parseFloat(item.unitCost) || 0;  // Changed from unitPrice to unitCost
      return sum + (quantity * unitPrice);
    }, 0);
  } 
  
  // Use finalAmount or estimatedAmount as fallback or if no items total
  if (totalAmount === 0) {
    totalAmount = parseFloat(finalAmount || estimatedAmount || 0);
  }
  
  const paymentPercentage = parseFloat(initialPaymentPercentage || 100);
  const paymentAmount = parseFloat(initialPayment || (totalAmount * paymentPercentage / 100));
  const remainingAmount = totalAmount - paymentAmount;
  
  // Thank you message and payment info section (similar to Budget)
  const thanksAndPaymentY = doc.y;
  const paymentInfoWidth = contentWidth * 0.55;

  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(10).fillColor(COLOR_TEXT_LIGHT)
    .text("Thank you for your business!", NEW_PAGE_MARGIN, doc.y, { width: contentWidth, align: 'left' });
  doc.moveDown(1.8);

  // Payment information section (always show for SimpleWork)
  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK)
    .text("PAYMENT INFORMATION", NEW_PAGE_MARGIN, doc.y, { width: paymentInfoWidth });
  doc.moveDown(0.3);
  doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);
  doc.text("BANK: CHASE".toUpperCase(), NEW_PAGE_MARGIN, doc.y, { width: paymentInfoWidth });
  doc.moveDown(0.3);
  doc.text("ACCOUNT NUMBER: 686125371".toUpperCase(), NEW_PAGE_MARGIN, doc.y, { width: paymentInfoWidth });
  doc.moveDown(0.3);
  doc.text("ROUTING NUMBER: 267084131".toUpperCase(), NEW_PAGE_MARGIN, doc.y, { width: paymentInfoWidth });
  doc.moveDown(0.5);
  
  doc.text("Zelle: zurcherconstruction.fl@gmail.com".toUpperCase(), NEW_PAGE_MARGIN, doc.y, { width: paymentInfoWidth });
  doc.moveDown(0.3);
  doc.text("CREDIT CARD + 3%".toUpperCase(), NEW_PAGE_MARGIN, doc.y, { width: paymentInfoWidth });
  doc.moveDown(0.3);
  doc.text("ASK ABOUT PAYMENT METHODS.".toUpperCase(), NEW_PAGE_MARGIN, doc.y, { width: paymentInfoWidth });
  doc.moveDown(1.5);

  // Track end of left column (payment info)
  const leftColumnEndY = doc.y;

  // Totals section (right side)
  doc.y = thanksAndPaymentY;
  const totalsStartX = NEW_PAGE_MARGIN + contentWidth * 0.55;
  const totalsValueX = NEW_PAGE_MARGIN + contentWidth * 0.78;
  const totalsRightEdge = doc.page.width - NEW_PAGE_MARGIN;
  const cellPadding = 5;

  // CALCULAR VALORES PARA INITIAL PAYMENT (siguiendo patrón de Budget)
  const initialPaymentPct = paymentPercentage;
  const initialPaymentAmt = paymentAmount;
  const percentageText = parseFloat(initialPaymentPct) === 100 
    ? "INITIAL PAYMENT (TOTAL)" 
    : `INITIAL PAYMENT (${parseFloat(initialPaymentPct)}%)`;

  // BALANCE DUE es PROMINENTE (como Budget draft)
  let currentTotalY = doc.y;
  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(12).fillColor(COLOR_TEXT_DARK);
  doc.text("BALANCE DUE", totalsStartX, currentTotalY, { width: totalsValueX - totalsStartX - cellPadding, align: 'left' });
  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(14).fillColor(COLOR_TEXT_DARK);
  doc.text(`$${totalAmount.toFixed(2)}`, totalsValueX, currentTotalY, { width: totalsRightEdge - totalsValueX, align: 'right' });
  doc.moveDown(0.8);

  // INITIAL PAYMENT - TEXTO PEQUEÑO Y MENOS PROMINENTE (como Budget draft)
  currentTotalY = doc.y;
  doc.font(FONT_FAMILY_MONO).fontSize(9).fillColor(COLOR_TEXT_MEDIUM);
  doc.text(percentageText, totalsStartX, currentTotalY, { width: totalsValueX - totalsStartX - cellPadding, align: 'left' });
  doc.font(FONT_FAMILY_MONO).fontSize(9).fillColor(COLOR_TEXT_MEDIUM);
  doc.text(`$${parseFloat(initialPaymentAmt).toFixed(2)}`, totalsValueX, currentTotalY, { width: totalsRightEdge - totalsValueX, align: 'right' });
  
  // Ensure Y is past whichever column was taller
  const rightColumnEndY = doc.y;
  doc.y = Math.max(leftColumnEndY, rightColumnEndY);
  doc.moveDown(2);
}

/**
 * Construye la página principal del PDF (SIN términos y condiciones)
 */
function _buildMainPage(doc, simpleWorkData, formattedDate) {
  _addPageHeader(doc, simpleWorkData, formattedDate);
  _addDescription(doc, simpleWorkData);
  _addItemsTable(doc, simpleWorkData);
  _addNotes(doc, simpleWorkData);
  _addPaymentSummary(doc, simpleWorkData);
  _addTermsAndConditions(doc, simpleWorkData);
  _addSignatureSection(doc, simpleWorkData);
}

/**
 * Imprime Descripción ANTES de la tabla de items
 */
function _addDescription(doc, simpleWorkData) {
  const contentWidth = doc.page.width - NEW_PAGE_MARGIN * 2;
  const { description, descriptionTitle } = simpleWorkData;

  if (!description || !description.trim()) return;

  const title = (descriptionTitle && descriptionTitle.trim()) || 'DESCRIPTION';
  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK)
    .text(title.toUpperCase(), NEW_PAGE_MARGIN, doc.y, { width: contentWidth });
  doc.moveDown(0.3);
  doc.font(FONT_FAMILY_MONO).fontSize(9).fillColor(COLOR_TEXT_MEDIUM)
    .text(description, NEW_PAGE_MARGIN, doc.y, { width: contentWidth, lineGap: 2 });
  doc.moveDown(1);
}

/**
 * Imprime Notas DESPUÉS de la tabla de items
 */
function _addNotes(doc, simpleWorkData) {
  const contentWidth = doc.page.width - NEW_PAGE_MARGIN * 2;
  const { notes, notesTitle } = simpleWorkData;

  if (!notes || !notes.trim()) return;

  doc.moveTo(NEW_PAGE_MARGIN, doc.y).lineTo(doc.page.width - NEW_PAGE_MARGIN, doc.y)
    .strokeColor(COLOR_BORDER_LIGHT).lineWidth(0.5).stroke();
  doc.moveDown(0.8);

  const title = (notesTitle && notesTitle.trim()) || 'NOTES';
  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK)
    .text(title.toUpperCase(), NEW_PAGE_MARGIN, doc.y, { width: contentWidth });
  doc.moveDown(0.3);
  doc.font(FONT_FAMILY_MONO).fontSize(9).fillColor(COLOR_TEXT_MEDIUM)
    .text(notes, NEW_PAGE_MARGIN, doc.y, { width: contentWidth, lineGap: 2 });
  doc.moveDown(1);
}

/**
 * Agrega sección de Términos y Condiciones (con título personalizable)
 */
function _addTermsAndConditions(doc, simpleWorkData) {
  const contentWidth = doc.page.width - NEW_PAGE_MARGIN * 2;
  const { termsAndConditions, termsTitle } = simpleWorkData;
  
  if (!termsAndConditions || !termsAndConditions.trim()) return;

  // Check if we need a new page
  if (doc.y > doc.page.height - 150) {
    doc.addPage();
  }

  doc.moveDown(0.5);
  
  // Línea divisora
  doc.moveTo(NEW_PAGE_MARGIN, doc.y).lineTo(doc.page.width - NEW_PAGE_MARGIN, doc.y)
    .strokeColor(COLOR_BORDER_LIGHT).lineWidth(0.7).stroke();
  doc.moveDown(0.8);

  // Título personalizable
  const title = (termsTitle && termsTitle.trim()) || 'TERMS & CONDITIONS';
  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(11).fillColor(COLOR_TEXT_DARK)
    .text(title.toUpperCase(), NEW_PAGE_MARGIN, doc.y, { width: contentWidth });
  doc.moveDown(0.5);

  // Contenido
  doc.font(FONT_FAMILY_MONO).fontSize(9).fillColor(COLOR_TEXT_MEDIUM)
    .text(termsAndConditions, NEW_PAGE_MARGIN, doc.y, {
      width: contentWidth,
      lineGap: 3
    });
  doc.moveDown(1);
}

/**
 * Agrega la sección de firma (igual que Budget)
 */
function _addSignatureSection(doc, simpleWorkData) {
  const contentWidth = doc.page.width - NEW_PAGE_MARGIN * 2;

  // Verificar si necesitamos nueva página para la firma
  let signatureY = doc.y + 20;
  if (signatureY + 80 > doc.page.height - NEW_PAGE_MARGIN) {
    doc.addPage();
    doc.y = NEW_PAGE_MARGIN;
    signatureY = doc.y + 20;
  }
  doc.y = signatureY;

  const sigFieldWidth = (contentWidth / 2) - 10;
  const sigLineFullWidth = sigFieldWidth - 80;
  const dateLineFullWidth = sigFieldWidth - 110;

  doc.font(FONT_FAMILY_MONO).fontSize(8).fillColor(COLOR_TEXT_DARK);

  // Client Signature + Date
  let currentLineY = doc.y;
  doc.text("Client Signature:", NEW_PAGE_MARGIN, currentLineY, { width: 80 });
  doc.moveTo(NEW_PAGE_MARGIN + 80, currentLineY + 8).lineTo(NEW_PAGE_MARGIN + 80 + sigLineFullWidth, currentLineY + 8)
    .strokeColor(COLOR_TEXT_DARK).lineWidth(0.5).stroke();

  doc.text("Date:", NEW_PAGE_MARGIN + sigFieldWidth + 10, currentLineY, { width: 30 });
  doc.moveTo(NEW_PAGE_MARGIN + sigFieldWidth + 10 + 30, currentLineY + 8)
    .lineTo(NEW_PAGE_MARGIN + sigFieldWidth + 10 + 30 + dateLineFullWidth, currentLineY + 8)
    .strokeColor(COLOR_TEXT_DARK).lineWidth(0.5).stroke();
  doc.moveDown(2.5);

  // Provider Representative + Date
  currentLineY = doc.y;
  doc.text("Provider Representative:", NEW_PAGE_MARGIN, currentLineY, { width: 115 });
  doc.moveTo(NEW_PAGE_MARGIN + 115, currentLineY + 8)
    .lineTo(NEW_PAGE_MARGIN + 115 + (sigLineFullWidth - 35), currentLineY + 8)
    .strokeColor(COLOR_TEXT_DARK).lineWidth(0.5).stroke();

  doc.text("Date:", NEW_PAGE_MARGIN + sigFieldWidth + 10, currentLineY, { width: 30 });
  doc.moveTo(NEW_PAGE_MARGIN + sigFieldWidth + 10 + 30, currentLineY + 8)
    .lineTo(NEW_PAGE_MARGIN + sigFieldWidth + 10 + 30 + dateLineFullWidth, currentLineY + 8)
    .strokeColor(COLOR_TEXT_DARK).lineWidth(0.5).stroke();
  doc.moveDown(1.5);
}

/**
 * Función principal para generar el PDF de SimpleWork
 */
async function generateAndSaveSimpleWorkPDF(simpleWorkData) {
  return new Promise((resolve, reject) => {
    try {
      const { id, createdAt } = simpleWorkData;
      const formattedDate = formatDateDDMMYYYY(createdAt || new Date());

      const doc = new PDFDocument({ 
        autoFirstPage: false, 
        margin: pageMargin, 
        size: 'A4' 
      });
      
      // Crear directorio si no existe
      const uploadsDir = path.join(__dirname, '../../uploads/simple-works');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const pdfPath = path.join(uploadsDir, `simple_work_${id}.pdf`);
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // Generar página principal
      doc.addPage();
      _buildMainPage(doc, simpleWorkData, formattedDate);

      doc.end();

      stream.on('finish', () => {
        console.log(`✅ PDF de SimpleWork generado: ${pdfPath}`);
        resolve(pdfPath);
      });
      
      stream.on('error', (err) => {
        console.error("❌ Error al escribir el stream del PDF de SimpleWork:", err);
        reject(err);
      });

    } catch (error) {
      console.error("❌ Error dentro de generateAndSaveSimpleWorkPDF:", error);
      reject(error);
    }
  });
}

module.exports = { generateAndSaveSimpleWorkPDF };