const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { format, parseISO } = require('date-fns');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
//const checkPageBreak let currentYRight_Terms
// --- CONSTANTES DE DISEÑO ---
const pageMargin = 50;
const primaryColor = '#003366';
const whiteColor = '#FFFFFF';
const textColor = '#333333';
const lightGrayColor = '#DDDDDD';

// --- NUEVAS CONSTANTES PARA ESTILO V2 ---
const NEW_PAGE_MARGIN = 20;                    // Margen mínimo
const FONT_FAMILY_REGULAR = 'Helvetica';
const FONT_FAMILY_BOLD = 'Helvetica-Bold';
const FONT_FAMILY_OBLIQUE = 'Helvetica-Oblique';
const FONT_FAMILY_MONO = 'Courier';
const FONT_FAMILY_MONO_BOLD = 'Courier-Bold';
const COLOR_TEXT_DARK = '#333333';
const COLOR_TEXT_MEDIUM = '#555555';
const COLOR_TEXT_LIGHT = '#777777';
const COLOR_PRIMARY_ACCENT = '#007bff';
const COLOR_BORDER_LIGHT = '#DDDDDD';
const COLOR_BACKGROUND_TABLE_HEADER = '#f2f2f2';

// Helper para formatear fechas
const formatDateDDMMYYYY = (dateInput) => {
  if (!dateInput) return 'N/A';
  try {
    let dateObj;
    if (typeof dateInput === 'string') {
      dateObj = parseISO(dateInput);
    } else if (dateInput instanceof Date) {
      dateObj = dateInput;
    } else {
      return 'Invalid Date Input';
    }
    return format(dateObj, 'MM-dd-yyyy');
  } catch (e) {
    console.error("Error formateando fecha:", dateInput, e);
    return 'Invalid Date';
  }
};

// --- FUNCIONES DE ENCABEZADO ---
function _addPageHeader_v2(doc, budgetData, pageType, documentIdOrTitle, formattedDate, formattedExpirationDate) {
  const logoPath = path.join(__dirname, '../assets/logo.png');
  const headerStartY = NEW_PAGE_MARGIN;
  const contentWidth = doc.page.width - NEW_PAGE_MARGIN * 2;

  const { applicantName, propertyAddress, Permit } = budgetData; // Destructure for T&C

  if (pageType === "INVOICE") {
    // --- INVOICE HEADER LOGIC (como se refinó anteriormente) ---
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
    doc.font(FONT_FAMILY_MONO_BOLD).fontSize(20).fillColor('#063260') // Tamaño de INVOICE #
      .text(`INVOICE #${documentIdOrTitle}`, invoiceInfoX, currentYRight, { width: invoiceInfoWidth, align: 'right' });
    currentYRight = doc.y + 45;


    // ✅ ALINEACIÓN PERFECTA - TODOS LOS TEXTOS EMPIEZAN EN LA MISMA POSICIÓN X
    doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);

    // ✅ DEFINIR POSICIÓN X FIJA PARA QUE TODOS LOS TEXTOS EMPIECEN IGUAL
    const dateTextStartX = invoiceInfoX + 120; // ✅ POSICIÓN FIJA donde empiezan TODOS los textos
    const dateTextWidth = invoiceInfoWidth - 50; // ✅ ANCHO restante desde esa posición

    // ✅ LÍNEA 1: DATE: - empieza en dateTextStartX
    doc.text("DATE:", dateTextStartX, currentYRight, { width: dateTextWidth, align: 'left' });
    currentYRight += doc.currentLineHeight() + 2;

    // ✅ LÍNEA 2: 06/03/2025 - empieza en dateTextStartX (misma posición que DATE:)
    doc.text(formattedDate, dateTextStartX, currentYRight, { width: dateTextWidth, align: 'left' });
    currentYRight += doc.currentLineHeight() + 4;

    // ✅ LÍNEA 3: DUE DATE: - empieza en dateTextStartX (misma posición)
    if (formattedExpirationDate && formattedExpirationDate !== 'N/A') {
      doc.text("DUE DATE:", dateTextStartX, currentYRight, { width: dateTextWidth, align: 'left' });
      currentYRight += doc.currentLineHeight() + 2;

      // ✅ LÍNEA 4: 07/03/2025 - empieza en dateTextStartX (misma posición)
      doc.text(formattedExpirationDate, dateTextStartX, currentYRight, { width: dateTextWidth, align: 'left' });
      currentYRight += doc.currentLineHeight();
    }

    // ✅ ACTUALIZAR doc.y para continuar desde aquí
    doc.y = currentYRight;
    const finalYRightTop = doc.y;
    doc.y = Math.max(finalYLeftTop, finalYRightTop) + 15;
    // --- Línea Divisora para INVOICE (antes de Customer/Work/Initial Payment) ---
    doc.moveTo(NEW_PAGE_MARGIN, doc.y).lineTo(doc.page.width - NEW_PAGE_MARGIN, doc.y)
      .strokeColor(COLOR_BORDER_LIGHT).lineWidth(0.7).stroke();
    doc.moveDown(1);

    // --- Parte Inferior del Encabezado para INVOICE (Info Cliente, Ubicación, Pago Inicial) ---
    const { initialPaymentPercentage, initialPayment } = budgetData;
    const subHeaderStartY_Invoice = doc.y;
    const columnGap_Invoice = 15;
    const columnWidth_Invoice = (contentWidth - (2 * columnGap_Invoice)) / 3;

    const customerInfoX_Invoice = NEW_PAGE_MARGIN;
    doc.font(FONT_FAMILY_MONO_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK)
      .text("CUSTOMER INFO", customerInfoX_Invoice, subHeaderStartY_Invoice, { width: columnWidth_Invoice });
    doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);
    doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);
    // ✅ CONVERTIR A MAYÚSCULAS
    doc.text((applicantName || 'N/A').toUpperCase(), customerInfoX_Invoice, doc.y + 2, { width: columnWidth_Invoice });
    if (Permit?.applicantEmail) {
      // ✅ CONVERTIR EMAIL A MAYÚSCULAS
      doc.text(Permit.applicantEmail.toUpperCase(), customerInfoX_Invoice, doc.y, { width: columnWidth_Invoice });
    }
    const finalYCol1_Invoice = doc.y;

    doc.y = subHeaderStartY_Invoice;
    const workLocationX_Invoice = customerInfoX_Invoice + columnWidth_Invoice + columnGap_Invoice;
    doc.font(FONT_FAMILY_MONO_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK)
      .text("WORK LOCATION", workLocationX_Invoice, subHeaderStartY_Invoice, { width: columnWidth_Invoice });
    doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);
    doc.text((propertyAddress || 'N/A').toUpperCase(), workLocationX_Invoice, doc.y + 2, { width: columnWidth_Invoice });

    const finalYCol2_Invoice = doc.y;

    let finalYCol3_Invoice = subHeaderStartY_Invoice;
    doc.y = subHeaderStartY_Invoice;
    const additionalOffset = 20; // Ajusta este valor según qué tanto quieras moverlo a la derecha
    const initialPaymentX_Invoice = workLocationX_Invoice + columnWidth_Invoice + columnGap_Invoice + additionalOffset;
    if (initialPaymentPercentage !== undefined && initialPayment !== undefined) {
      doc.font(FONT_FAMILY_MONO_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK)
        .text("INITIAL PAYMENT", initialPaymentX_Invoice, subHeaderStartY_Invoice, { width: columnWidth_Invoice });
      doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);
      const percentageText = parseFloat(initialPaymentPercentage) === 100 ? "TOTAL" : `${parseFloat(initialPaymentPercentage)}% REQUIRE TO START`;
      doc.text(percentageText, initialPaymentX_Invoice, doc.y + 2, { width: columnWidth_Invoice });
      doc.text(`$${parseFloat(initialPayment).toFixed(2)}`, initialPaymentX_Invoice, doc.y, { width: columnWidth_Invoice });
    }
    finalYCol3_Invoice = doc.y;

    doc.y = Math.max(finalYCol1_Invoice, finalYCol2_Invoice, finalYCol3_Invoice);
    //✅ AGREGAR LÍNEA DIVISORIA DEBAJO DE LAS TRES COLUMNAS
    doc.moveDown(1); // Espacio antes de la línea
    doc.moveTo(NEW_PAGE_MARGIN, doc.y).lineTo(doc.page.width - NEW_PAGE_MARGIN, doc.y)
      .strokeColor(COLOR_BORDER_LIGHT).lineWidth(0.7).stroke();
    doc.moveDown(1); // Espacio después de la línea antes de la tabla

  } else if (pageType === "TERMS") {
    // ✅ AJUSTAR POSICIONES PARA ALINEACIÓN CORRECTA
    const leftBlockWidth_Terms = contentWidth * 0.50;  // Columna izquierda (empresa)
    const rightBlockX_Terms = NEW_PAGE_MARGIN + leftBlockWidth_Terms + 100; // ✅ ESPACIO CORRECTO
    const rightBlockWidth_Terms = contentWidth * 0.45; // ✅ ANCHO FIJO para el cliente

    // ✅ POSICIÓN ORIGINAL DE LA EMPRESA (MÁS ARRIBA)
    let currentYLeft_Terms = headerStartY; // ✅ EMPEZAR DESDE headerStartY (posición original)
    
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, NEW_PAGE_MARGIN, currentYLeft_Terms, { width: 70 });
      currentYLeft_Terms += 80; // ✅ ESPACIO DESPUÉS DEL LOGO
    } else {
      // Si no hay logo, empezar con el texto de la empresa
      currentYLeft_Terms = headerStartY ;
    }

    // ✅ INFORMACIÓN DE LA EMPRESA (izquierda) - POSICIÓN ORIGINAL
    doc.font(FONT_FAMILY_BOLD).fontSize(12).fillColor(COLOR_TEXT_DARK) // ✅ TAMAÑO ORIGINAL
      .text("ZURCHER CONSTRUCTION", NEW_PAGE_MARGIN, currentYLeft_Terms, { width: leftBlockWidth_Terms });
    doc.font(FONT_FAMILY_REGULAR).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);
    doc.text("SEPTIC TANK DIVISION - CFC1433240", NEW_PAGE_MARGIN, doc.y, { width: leftBlockWidth_Terms });
    doc.text("zurcherseptic@gmail.com", NEW_PAGE_MARGIN, doc.y, { width: leftBlockWidth_Terms });
    doc.text("+1 (407) 419-4495", NEW_PAGE_MARGIN, doc.y, { width: leftBlockWidth_Terms });
    const finalYLeft_Terms = doc.y;

    // ✅ INFORMACIÓN DEL CLIENTE (derecha) - POSICIÓN ACTUAL CORRECTA
    let currentYRight_Terms = headerStartY + 60; // ✅ MANTENER POSICIÓN ACTUAL
    doc.font(FONT_FAMILY_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK)
      .text("CUSTOMER INFO", rightBlockX_Terms, currentYRight_Terms, { width: rightBlockWidth_Terms });
    doc.font(FONT_FAMILY_REGULAR).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);
    
    // ✅ NOMBRE DEL CLIENTE
    doc.text((applicantName || 'N/A').toUpperCase(), rightBlockX_Terms, doc.y + 2, { 
      width: rightBlockWidth_Terms,
      continued: false
    });

  
    
    doc.moveDown(0.8); // Espacio entre Customer Info y Work Location

    // ✅ WORK LOCATION CON SALTO DE LÍNEA AUTOMÁTICO
    doc.font(FONT_FAMILY_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK)
      .text("WORK LOCATION", rightBlockX_Terms, doc.y, { width: rightBlockWidth_Terms });
    doc.font(FONT_FAMILY_REGULAR).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);
    
    // ✅ DIRECCIÓN CON SALTO DE LÍNEA EN COMAS Y PUNTOS
    let formattedAddress = (propertyAddress || 'N/A').toUpperCase();
    
    // ✅ REEMPLAZAR COMAS Y PUNTOS CON SALTOS DE LÍNEA
    formattedAddress = formattedAddress
      .replace(/,\s*/g, '\n')  // Reemplazar comas (con o sin espacio) con salto de línea
      .replace(/\.\s*/g, '\n'); // Reemplazar puntos (con o sin espacio) con salto de línea
    
    doc.text(formattedAddress, rightBlockX_Terms, doc.y + 2, { 
      width: rightBlockWidth_Terms,
      continued: false
    });
    
    const finalYRight_Terms = doc.y;

    // ✅ USAR LA Y MÁS BAJA ENTRE LAS DOS COLUMNAS
    doc.y = Math.max(finalYLeft_Terms, finalYRight_Terms) + 2;

    // --- Línea Divisora para TERMS ---
    doc.moveDown(1);
    doc.moveTo(NEW_PAGE_MARGIN, doc.y).lineTo(doc.page.width - NEW_PAGE_MARGIN, doc.y)
      .strokeColor(COLOR_BORDER_LIGHT).lineWidth(0.7).stroke();
    doc.moveDown(1);

    // --- Título Principal para TERMS ---
    let termsPageTitle = "TERMS AND CONDITIONS ACCEPTANCE AGREEMENT FOR THE INSTALLATION OF A SEPTIC SYSTEM";
    if (documentIdOrTitle && documentIdOrTitle.includes("(Cont.)")) {
      termsPageTitle += " (Cont.)";
    }
    doc.font(FONT_FAMILY_BOLD).fontSize(9).fillColor(COLOR_TEXT_DARK)
      .text(termsPageTitle, NEW_PAGE_MARGIN, doc.y, {
        width: contentWidth,
        align: 'left',
        underline: true
      });
  }
  // Espacio común después del contenido del encabezado, antes de que comience el contenido principal de la página
  doc.moveDown(2);
}

async function _buildInvoicePage_v2(doc, budgetData, formattedDate, formattedExpirationDate, clientEmailFromPermit) {
  _addPageHeader_v2(doc, budgetData, "INVOICE", budgetData.idBudget, formattedDate, formattedExpirationDate);
  const contentWidth = doc.page.width - NEW_PAGE_MARGIN * 2;
  const {
    lineItems = [],
    totalPrice,
    initialPaymentPercentage,
    initialPayment,
    discountAmount,
    discountDescription
  } = budgetData;

  // --- Item Table ---
  const tableTop = doc.y;
  const cellPadding = 5;

  // ✅ AJUSTAR ANCHOS DE COLUMNAS PARA USAR MÁS ESPACIO
  const colIncludedW = contentWidth * 0.15;
  const colDescW = contentWidth * 0.50;
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
  const tableHeaderRightEdge = doc.page.width - NEW_PAGE_MARGIN;

  // Table Header
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
  doc.y = headerY + 18;
  doc.moveDown(0.5);

  doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);

  // MAIN ITEM
  const mainItemName = "SEPTIC SYSTEM INSTALLATION";
  const mainItemDesc = "COMPLETE INSTALLATION OF THE SYSTEM (LABOR AND MATERIALS)";
  const mainItemQty = 1;
  const mainItemRate = parseFloat(totalPrice);

  let currentItemY = doc.y;
  doc.text(mainItemName, xIncludedText, currentItemY, { width: wIncluded });
  doc.text(mainItemDesc, xDescText, currentItemY, { width: wDesc });
  doc.text(mainItemQty.toFixed(0), xQtyText, currentItemY, { width: wQty, align: 'right' });
  doc.text(`$${mainItemRate.toFixed(2)}`, xRateText, currentItemY, { width: wRate, align: 'right' });
  doc.text(`$${mainItemRate.toFixed(2)}`, xAmountText, currentItemY, { width: wAmount, align: 'right' });
  doc.moveDown(2.8);

  console.log("Procesando lineItems para PDF:", lineItems);

  // ✅ FUNCIÓN CHECKPAGEBREAK OPTIMIZADA
  const checkPageBreak = (estimatedHeight = 50) => {
    const availableSpace = doc.page.height - NEW_PAGE_MARGIN - 25;

    if (doc.y + estimatedHeight > availableSpace) {
      doc.addPage();
      doc.y = NEW_PAGE_MARGIN;
      doc.font(FONT_FAMILY_MONO).fontSize(11).fillColor(COLOR_TEXT_MEDIUM);
    }
  };

  // Procesar cada lineItem
  if (lineItems && lineItems.length > 0) {
    lineItems.forEach((item, index) => {
      const itemCategory = item.category || 'N/A';
      const itemName = item.name || 'N/A';
      const itemDescription = item.description || '';
      const itemQty = parseInt(item.quantity) || 1;
      const itemNotes = item.notes || '';


      // ✅ CONSTRUIR DESCRIPCIÓN COMPLETA: NAME + DESCRIPTION + MARCA + CAPACITY + NOTES
      let fullDescription = itemName; // Empezar con el nombre

      if (itemDescription && itemDescription.trim() !== '') {
        fullDescription += ` - ${itemDescription}`;
      }

      if (item.marca && item.marca.trim() !== '') {
        fullDescription += ` [Marca: ${item.marca}]`;
      }

      if (item.capacity && item.capacity.trim() !== '') {
        fullDescription += ` [Capacidad: ${item.capacity}]`;
      }

      if (itemNotes && itemNotes.trim() !== '') {
        fullDescription += ` - ${itemNotes}`;
      }

      // ✅ ESTIMACIÓN MÁS PRECISA DE ALTURA NECESARIA
      const estimatedDescHeight = doc.heightOfString(fullDescription, { width: wDesc });
      const estimatedCategoryHeight = doc.heightOfString(itemCategory, { width: wIncluded });
      const estimatedItemHeight = Math.max(estimatedDescHeight, estimatedCategoryHeight) + 25; // ✅ AUMENTADO PADDING
      checkPageBreak(estimatedItemHeight);

      // Dibujar el item
      currentItemY = doc.y;

      // ✅ COLUMNA INCLUDED - MOSTRAR CATEGORY cambie x name 06/06
      doc.font(FONT_FAMILY_MONO).fontSize(10).fillColor(COLOR_TEXT_MEDIUM);
      doc.text(itemName.toUpperCase(), xIncludedText, currentItemY, { width: wIncluded });

      // Guardar Y antes de escribir descripción (para alinear otras columnas)
      const yBeforeDesc = doc.y;

      // ✅ COLUMNA DESCRIPTION - MOSTRAR NAME + DESCRIPTION + DETALLES  cambie por description 06/06
      doc.text(itemDescription, xDescText, currentItemY, { width: wDesc });
      const yAfterDesc = doc.y;

      // Columnas QTY, RATE, AMOUNT (alineadas con currentItemY)
      doc.text(itemQty.toString(), xQtyText, currentItemY, { width: wQty, align: 'right' });
      doc.text("$0.00", xRateText, currentItemY, { width: wRate, align: 'right' });
      doc.font(FONT_FAMILY_MONO_BOLD).text("INCLUDED", xAmountText, currentItemY, { width: wAmount, align: 'right' });
      doc.font(FONT_FAMILY_MONO); // Volver a fuente normal

      // Mover Y al final de la descripción (que puede ser multi-línea)
      doc.y = yAfterDesc;
      doc.moveDown(2.5); // ✅ AUMENTADO DE 2.0 A 2.5 PARA MÁS ESPACIO ENTRE ITEMS
    });
  } else {
    // ✅ FALLBACK: Si no hay lineItems, mostrar items estándar (como backup)
    console.log("No se encontraron lineItems en budgetData, usando items estándar de fallback");

    const standardItems = [
      { desc: "SAND TRUCK - LOADS OF SAND INCLUDED", qty: "ALL", rate: 0.00 },
      { desc: "DIRT TRUCK FOR COVER - LOADS OF DIRT INCLUDED", qty: "ALL", rate: 0.00 },
      { desc: "ROCK REMOVAL - INCLUDED AT NO ADDITIONAL COST IF REQUIRED DURING INSTALLATION", qty: 1, rate: 0.00 },
      { desc: "PRIVATE INSPECTION - FIRST INITIAL INSPECTION", qty: 1, rate: 0.00 },
      { desc: "SERVICE MAINTENANCE CONTRACT - 2 YEAR CONTRACT WITH SERVICE EVERY 6 MONTHS", qty: 1, rate: 0.00 },
      { desc: "SYSTEM PARTS & ELECTRICAL INSTALLATION - FULL INSTALLATION OF PIPES, ACCESSORIES, AND ELECTRICAL WORK FOR THE SEPTIC SYSTEM", qty: 1, rate: 0.00 },
      { desc: "WARRANTY - 2 YEAR MANUFACTURER'S WARRANTY", qty: 1, rate: 0.00 }
    ];

    standardItems.forEach(subItem => {
      // ✅ ESTIMACIÓN MÁS PRECISA PARA ITEMS ESTÁNDAR TAMBIÉN
      const estimatedDescHeight = doc.heightOfString(subItem.desc, { width: wDesc });
      const estimatedRowHeight = Math.max(estimatedDescHeight + 20, 35); // ✅ AUMENTADO MÍNIMO DE 25 A 35
      checkPageBreak(estimatedRowHeight);

      currentItemY = doc.y;
      doc.text("", xIncludedText, currentItemY, { width: wIncluded });
      const yBeforeDesc = doc.y;
      doc.text(subItem.desc, xDescText, currentItemY, { width: wDesc });
      const yAfterDesc = doc.y;

      doc.text(typeof subItem.qty === 'number' ? subItem.qty.toFixed(0) : subItem.qty.toString(),
        xQtyText, currentItemY, { width: wQty, align: 'right' });
      doc.text(`$${subItem.rate.toFixed(2)}`, xRateText, currentItemY, { width: wRate, align: 'right' });
      doc.font(FONT_FAMILY_MONO_BOLD).text("INCLUDED", xAmountText, currentItemY, { width: wAmount, align: 'right' });
      doc.font(FONT_FAMILY_MONO);

      doc.y = yAfterDesc;
      doc.moveDown(2.5); // ✅ AUMENTADO DE 2.0 A 2.5 PARA MÁS ESPACIO ENTRE ITEMS
    });
  }

  // Línea final de la tabla
  doc.moveTo(NEW_PAGE_MARGIN, doc.y).lineTo(tableHeaderRightEdge, doc.y)
    .strokeColor(COLOR_BORDER_LIGHT).lineWidth(0.5).stroke();
  doc.moveDown(2.0);

  // ✅ VERIFICACIÓN ANTES DE SECCIÓN DE TOTALES
  const totalsSectionHeightEstimate = 200;
  if (doc.y + totalsSectionHeightEstimate > doc.page.height - NEW_PAGE_MARGIN - 30) {
    doc.addPage();
    doc.y = NEW_PAGE_MARGIN;
  }

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

  // SECCIÓN DE TOTALES - ALINEACIÓN PERFECTA
  const totalsStartX = NEW_PAGE_MARGIN + contentWidth * 0.55; // ✅ POSICIÓN FIJA para TODAS las etiquetas
  const totalsValueX = NEW_PAGE_MARGIN + contentWidth * 0.85; // ✅ POSICIÓN FIJA para TODOS los valores
  const totalsRightEdge = doc.page.width - NEW_PAGE_MARGIN;

  let currentTotalY = doc.y;

  const discountNum = parseFloat(discountAmount || 0);
  const priceAfterDiscountAlreadyApplied = parseFloat(totalPrice || 0);
  const subtotalBruto = priceAfterDiscountAlreadyApplied + discountNum;

  // ✅ SUBTOTAL - empieza en totalsStartX
  doc.font(FONT_FAMILY_MONO).fontSize(11).fillColor(COLOR_TEXT_MEDIUM);
  doc.text("SUBTOTAL", totalsStartX, currentTotalY, { width: totalsValueX - totalsStartX - cellPadding, align: 'left' });
  doc.font(FONT_FAMILY_MONO).fontSize(11).fillColor(COLOR_TEXT_MEDIUM);
  doc.text(`$${subtotalBruto.toFixed(2)}`, totalsValueX, currentTotalY, { width: totalsRightEdge - totalsValueX, align: 'right' });
  doc.moveDown(0.6);

  // ✅ DISCOUNT (si existe) - empieza en totalsStartX
  if (discountNum > 0) {
    currentTotalY = doc.y;
    doc.font(FONT_FAMILY_MONO).fontSize(11).fillColor(COLOR_TEXT_MEDIUM);
    const discountLabel = discountDescription ? `${discountDescription.toUpperCase()}` : "DISCOUNT";
    doc.text(discountLabel, totalsStartX, currentTotalY, { width: totalsValueX - totalsStartX - cellPadding, align: 'left' });
    doc.font(FONT_FAMILY_MONO).fontSize(11).fillColor(COLOR_TEXT_MEDIUM);
    doc.text(`-$${discountNum.toFixed(2)}`, totalsValueX, currentTotalY, { width: totalsRightEdge - totalsValueX, align: 'right' });
    doc.moveDown(0.6);
  }

  // ✅ TAX - empieza en totalsStartX
  currentTotalY = doc.y;
  doc.font(FONT_FAMILY_MONO).fontSize(11).fillColor(COLOR_TEXT_MEDIUM);
  doc.text("TAX", totalsStartX, currentTotalY, { width: totalsValueX - totalsStartX - cellPadding, align: 'left' });
  doc.font(FONT_FAMILY_MONO).fontSize(9).fillColor(COLOR_TEXT_MEDIUM);
  doc.text(`$0.00`, totalsValueX, currentTotalY, { width: totalsRightEdge - totalsValueX, align: 'right' });
  doc.moveDown(0.6);

  // ✅ TOTAL - empieza en totalsStartX
  currentTotalY = doc.y;
  doc.font(FONT_FAMILY_MONO).fontSize(11).fillColor(COLOR_TEXT_MEDIUM);
  doc.text("TOTAL", totalsStartX, currentTotalY, { width: totalsValueX - totalsStartX - cellPadding, align: 'left' });
  doc.font(FONT_FAMILY_MONO).fontSize(9).fillColor(COLOR_TEXT_MEDIUM);
  doc.text(`$${priceAfterDiscountAlreadyApplied.toFixed(2)}`, totalsValueX, currentTotalY, { width: totalsRightEdge - totalsValueX, align: 'right' });
  doc.moveDown(0.8);

  // ✅ LÍNEA DIVISORIA - empieza en totalsStartX y va hasta el borde derecho
  const lineY = doc.y;
  doc.moveTo(totalsStartX, lineY)
    .lineTo(totalsRightEdge, lineY)
    .strokeColor(COLOR_BORDER_LIGHT)
    .lineWidth(0.8)
    .stroke();
  doc.moveDown(1.2); // ✅ ESPACIO DESPUÉS DE LA LÍNEA

  // ✅ BALANCE DUE - empieza en totalsStartX
  currentTotalY = doc.y;
  doc.font(FONT_FAMILY_MONO).fontSize(11).fillColor(COLOR_TEXT_DARK);
  doc.text("BALANCE DUE", totalsStartX, currentTotalY, { width: totalsValueX - totalsStartX - cellPadding, align: 'left' });
  doc.font(FONT_FAMILY_MONO_BOLD).fontSize(14).fillColor(COLOR_TEXT_DARK);
  doc.text(`$${priceAfterDiscountAlreadyApplied.toFixed(2)}`, totalsValueX, currentTotalY, { width: totalsRightEdge - totalsValueX, align: 'right' });
  const yAfterTotals = doc.y;
  doc.y = Math.max(yAfterPaymentInfo, yAfterTotals);
  doc.moveDown(2);

  // STRIPE PAYMENT BUTTON
  let paymentLinkUrl = null;
  const paymentAmountForStripe = parseFloat(initialPayment);

  if (paymentAmountForStripe > 0 && process.env.STRIPE_SECRET_KEY) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: `Invoice #${budgetData.idBudget} - ${budgetData.applicantName}` },
            unit_amount: Math.round(paymentAmountForStripe * 100)
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: 'https://www.google.com',
        cancel_url: 'https://www.google.com',
        ...(clientEmailFromPermit && { customer_email: clientEmailFromPermit }),
        metadata: { internal_budget_id: budgetData.idBudget, payment_type: 'invoice_payment' }
      });
      paymentLinkUrl = session.url;
    } catch (stripeError) {
      console.error("Stripe session creation error for invoice:", stripeError);
    }
  }

  if (paymentLinkUrl) {
    const buttonWidth = 200;
    const buttonHeight = 28;
    const buttonX = NEW_PAGE_MARGIN + (contentWidth - buttonWidth) / 2;
    let buttonY = doc.y;

    if (buttonY + buttonHeight + 40 > doc.page.height - NEW_PAGE_MARGIN) {
      doc.addPage();
      buttonY = doc.y + 20;
    }
    doc.y = buttonY;

    doc.save();
    doc.roundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 5).fillColor('#063260').fill();
    doc.fillColor('#FFFFFF').fontSize(9).font(FONT_FAMILY_MONO_BOLD);
    doc.text('Click Here to Pay Online', buttonX, buttonY + (buttonHeight / 2) - 4, { width: buttonWidth, align: 'center' });
    doc.restore();
    doc.link(buttonX, buttonY, buttonWidth, buttonHeight, paymentLinkUrl);
    doc.y = buttonY + buttonHeight + 10;
  }
}




// --- PÁGINA DE TÉRMINOS Y CONDICIONES ---
function _buildTermsAndConditionsPage_v2(doc, budgetData, formattedDate, formattedExpirationDate) {
  _addPageHeader_v2(doc, budgetData, "TERMS", "TERMS_AND_CONDITIONS", formattedDate, formattedExpirationDate);
  const contentWidth = doc.page.width - NEW_PAGE_MARGIN * 2;

  doc.font(FONT_FAMILY_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK).text('Considering that:', NEW_PAGE_MARGIN, doc.y);
  doc.moveDown(0.5);
  doc.font(FONT_FAMILY_REGULAR).fontSize(8).fillColor(COLOR_TEXT_MEDIUM);
  const consideringText = `The Provider specializes in the installation of septic systems and offers these services in compliance with all applicable technical and legal regulations. The Client is interested in contracting the Provider for the installation of a septic system on the property located at: ${budgetData.propertyAddress || '____________________________'}. Both parties wish to formalize the terms and conditions under which the service will be provided.`;
  doc.text(consideringText, NEW_PAGE_MARGIN, doc.y, { width: contentWidth, align: 'justify' });
  doc.moveDown(1);

  doc.font(FONT_FAMILY_BOLD).fontSize(9).fillColor(COLOR_TEXT_DARK).text('The following is hereby agreed:', NEW_PAGE_MARGIN, doc.y);
  doc.moveDown(0.5);

  const termsText = `1. Acceptance of Terms and Conditions\nThe Client declares to have read, understood, and accepted the terms and conditions set forth in this agreement. Acceptance of these terms is mandatory for the provision of the septic system installation service.\n\n2. Scope of Work:\nThe Provider agrees to:\n  • Install the septic system according to the approved plans and local regulatory standards.\n  • Supply all labor, materials, and equipment necessary for the installation.\n  • Conduct functionality tests upon completion to ensure the system operates correctly.\nThe Provider does not include, unless expressly agreed in writing:\n  • Electrical work, landscaping, irrigation, fencing, or removal of trees/sod.\n  • Additional engineering tests (such as percolation or soil tests).\n  • Haul-off of debris beyond what is standard for the installation.\n  • Damage repairs to driveways, walkways, sprinklers, cables, or unmarked underground lines.\n\n3. Client's Obligations: The Client agrees to:\n  • Provide full access to the property and keep the area clear of debris or obstructions.\n  • Supply any required documents (e.g., site plan, floor plan) to facilitate permitting or inspection.\n  • Be responsible for any unmarked private underground lines.\n  • Obtain required permits, unless otherwise agreed in writing.\n  • Avoid parking or placing heavy loads on the system area after installation, as this may cause system failure and void the warranty.\n\nPayment Terms\n  • A 60% deposit is required prior to the start of work.\n  • The remaining 40% must be paid immediately after the initial inspection has been passed and the work has been covered by our team.\n  • Permit fees must be paid in advance and are non-refundable.\n\n4. Execution Timeline:\nWork will begin on the agreed-upon date, subject to weather conditions or delays beyond the Provider's control. In the event of encountering unsuitable soil or rock conditions, additional charges may apply and will be discussed with the Client before proceeding.\n\n5. Change Orders and Additional Work:\nAny changes to the scope of work requested by the Client must be agreed upon in writing through a Change Order. Additional work beyond the agreed scope will be billed at the Provider's standard rates.\n\n6. Warranty:\nThe installation of the drainfield is covered by a one (1) year limited warranty from the date of the initial inspection, provided the system is used in accordance with the conditions established in the health department permit. Component parts are subject to the manufacturer's warranty. Damage caused by misuse, neglect, or unauthorized modifications will void the warranty.\n\n7. Limitation of Liability:\nThe Provider is not responsible for:\n  • Any damage to landscaping, private utility lines, or other structures caused during standard installation work.\n  • Any direct, indirect, incidental, or consequential damages resulting from the use or misuse of the installed septic system.\n  • The system's performance if affected by external factors such as surface water, improper use, or lack of maintenance.\n\n8. Contract Termination: This agreement may be terminated:\n  • By mutual consent of both parties.\n  • By either party, in the event of material breach, with written notice.\n  • By the Client, at any time, with written notice; however, the Client shall be responsible for payment for all work completed and costs incurred up to the cancellation date.\n\nClient Acknowledgment:\nBy signing this agreement, the Client authorizes the Provider to proceed with the work and agrees to comply with all terms and conditions outlined herein.`;

  doc.font(FONT_FAMILY_REGULAR).fontSize(8).fillColor(COLOR_TEXT_MEDIUM);
  const paragraphs = termsText.split('\n\n');

  paragraphs.forEach(paragraph => {
    const lines = paragraph.split('\n');
    lines.forEach((line, index) => {
      const isListItem = line.trim().startsWith('•');
      const indent = isListItem ? 15 : 0;
      const textToDraw = isListItem ? line.trim().substring(1).trim() : line.trim();

      const paragraphHeight = doc.heightOfString(textToDraw, { width: contentWidth - indent, align: 'justify' });
      if (doc.y + paragraphHeight > doc.page.height - NEW_PAGE_MARGIN - 100) {

        doc.addPage();
        // _addPageHeader_v2(doc, budgetData, "TERMS", "TERMS_AND_CONDITIONS (Cont.)", formattedDate, formattedExpirationDate);
        doc.font(FONT_FAMILY_REGULAR).fontSize(8).fillColor(COLOR_TEXT_MEDIUM);
      }

      if (isListItem) {
        doc.text("•", NEW_PAGE_MARGIN, doc.y, { width: 10 });
        doc.text(textToDraw, NEW_PAGE_MARGIN + indent, doc.y, { width: contentWidth - indent, align: 'justify' });
      } else {
        doc.text(textToDraw, NEW_PAGE_MARGIN + indent, doc.y, { width: contentWidth - indent, align: 'justify' });
      }

      if (index < lines.length - 1 && textToDraw.length > 0) doc.moveDown(0.2);
    });
    if (paragraph.trim().length > 0) doc.moveDown(0.6);
  });

  // --- Signature Section ---
  let signatureY = doc.y + 20;
  if (signatureY + 80 > doc.page.height - NEW_PAGE_MARGIN) {
    _addStandardPageFooter(doc);
    doc.addPage();
    _addPageHeader_v2(doc, budgetData, "TERMS", "TERMS_AND_CONDITIONS (Cont.)", formattedDate, formattedExpirationDate);
    signatureY = doc.y + 20;
  }
  doc.y = signatureY;

  const sigFieldWidth = (contentWidth / 2) - 10;
  const sigLineFullWidth = sigFieldWidth - 80;
  const dateLineFullWidth = sigFieldWidth - 110;

  doc.font(FONT_FAMILY_REGULAR).fontSize(8).fillColor(COLOR_TEXT_DARK);

  // Client Signature
  let currentLineY = doc.y;
  doc.text("Client Signature:", NEW_PAGE_MARGIN, currentLineY, { width: 75 });
  doc.moveTo(NEW_PAGE_MARGIN + 75, currentLineY + 8).lineTo(NEW_PAGE_MARGIN + 75 + sigLineFullWidth, currentLineY + 8)
    .strokeColor(COLOR_TEXT_DARK).lineWidth(0.5).stroke();

  doc.text("Date:", NEW_PAGE_MARGIN + sigFieldWidth + 10, currentLineY, { width: 30 });
  doc.moveTo(NEW_PAGE_MARGIN + sigFieldWidth + 10 + 30, currentLineY + 8)
    .lineTo(NEW_PAGE_MARGIN + sigFieldWidth + 10 + 30 + dateLineFullWidth, currentLineY + 8)
    .strokeColor(COLOR_TEXT_DARK).lineWidth(0.5).stroke();
  doc.moveDown(2.5);

  // Provider Representative
  currentLineY = doc.y;
  doc.text("Provider Representative:", NEW_PAGE_MARGIN, currentLineY, { width: 110 });
  doc.moveTo(NEW_PAGE_MARGIN + 110, currentLineY + 8)
    .lineTo(NEW_PAGE_MARGIN + 110 + (sigLineFullWidth - 30), currentLineY + 8)
    .strokeColor(COLOR_TEXT_DARK).lineWidth(0.5).stroke();

  doc.text("Date:", NEW_PAGE_MARGIN + sigFieldWidth + 10, currentLineY, { width: 30 });
  doc.moveTo(NEW_PAGE_MARGIN + sigFieldWidth + 10 + 30, currentLineY + 8)
    .lineTo(NEW_PAGE_MARGIN + sigFieldWidth + 10 + 30 + dateLineFullWidth, currentLineY + 8)
    .strokeColor(COLOR_TEXT_DARK).lineWidth(0.5).stroke();
  doc.moveDown(1.5);


}

// --- Standard Page Footer ---
function _addStandardPageFooter(doc) {
  const footerYPosition = doc.page.height - NEW_PAGE_MARGIN + 15;
  const contentWidth = doc.page.width - NEW_PAGE_MARGIN * 2;
  doc.fontSize(7).fillColor(COLOR_TEXT_LIGHT)
    .text('Thank you for your business! | Zurcher Construction', NEW_PAGE_MARGIN, footerYPosition, {
      align: 'center',
      width: contentWidth
    });
}

// --- FUNCIÓN PARA FIRMAS (Faltaba en tu código) ---
function _addClientSignatureSection(doc) {
  const currentY = doc.y;
  const pageBottom = doc.page.height - pageMargin;

  // Check if we need a new page
  if (currentY + 100 > pageBottom) {
    doc.addPage();
  }

  doc.fontSize(10).font('Helvetica-Bold').text('Client Acceptance:', pageMargin, doc.y);
  doc.moveDown(1);

  const signatureLineY = doc.y + 20;
  const signatureLineLength = 200;

  // Client signature line
  doc.text('Client Signature:', pageMargin, signatureLineY);
  doc.moveTo(pageMargin + 100, signatureLineY + 10)
    .lineTo(pageMargin + 100 + signatureLineLength, signatureLineY + 10)
    .strokeColor('#000000').stroke();

  // Date line
  doc.text('Date:', pageMargin + 320, signatureLineY);
  doc.moveTo(pageMargin + 350, signatureLineY + 10)
    .lineTo(pageMargin + 450, signatureLineY + 10)
    .strokeColor('#000000').stroke();

  doc.y = signatureLineY + 40;
}



// --- PÁGINA 2: TÉRMINOS Y CONDICIONES ---
// ...existing code...
function _buildTermsAndConditionsPage_v2(doc, budgetData, formattedDate, formattedExpirationDate) {
  _addPageHeader_v2(doc, budgetData, "TERMS", "TERMS_AND_CONDITIONS", formattedDate, formattedExpirationDate);
  const contentWidth = doc.page.width - NEW_PAGE_MARGIN * 2;

  // Texto inicial "Considering that:"
  doc.font(FONT_FAMILY_BOLD).fontSize(10).fillColor(COLOR_TEXT_DARK).text('Considering that:', NEW_PAGE_MARGIN, doc.y);
  doc.moveDown(0.5);
  doc.font(FONT_FAMILY_REGULAR).fontSize(8).fillColor(COLOR_TEXT_MEDIUM);
  const consideringText = `The Provider specializes in the installation of septic systems and offers these services in compliance with all applicable technical and legal regulations. The Client is interested in contracting the Provider for the installation of a septic system on the property located at: ${budgetData.propertyAddress || '____________________________'}. Both parties wish to formalize the terms and conditions under which the service will be provided.`;
  doc.text(consideringText, NEW_PAGE_MARGIN, doc.y, { width: contentWidth, align: 'justify' });
  doc.moveDown(1);

  // Texto "The following is hereby agreed:"
  doc.font(FONT_FAMILY_BOLD).fontSize(9).fillColor(COLOR_TEXT_DARK).text('The following is hereby agreed:', NEW_PAGE_MARGIN, doc.y);
  doc.moveDown(0.5);

  const termsSections = [
    {
      number: "1.",
      title: "Acceptance of Terms and Conditions",
      content: "The Client declares to have read, understood, and accepted the terms and conditions set forth in this agreement. Acceptance of these terms is mandatory for the provision of the septic system installation service."
    },
    {
      number: "2.",
      title: "Scope of Work:",
      subtitle: "The Provider agrees to:",
      bulletPoints: [
        "Install the septic system according to the approved plans and local regulatory standards.",
        "Supply all labor, materials, and equipment necessary for the installation.",
        "Conduct functionality tests upon completion to ensure the system operates correctly."
      ],
      subtitle2: "The Provider does not include, unless expressly agreed in writing:",
      bulletPoints2: [
        "Electrical work, landscaping, irrigation, fencing, or removal of trees/sod.",
        "Additional engineering tests (such as percolation or soil tests).",
        "Haul-off of debris beyond what is standard for the installation.",
        "Damage repairs to driveways, walkways, sprinklers, cables, or unmarked underground lines."
      ]
    },
    {
      number: "3.",
      title: "Client's Obligations:",
      subtitle: "The Client agrees to:",
      bulletPoints: [
        "Provide full access to the property and keep the area clear of debris or obstructions.",
        "Supply any required documents (e.g., site plan, floor plan) to facilitate permitting or inspection.",
        "Be responsible for any unmarked private underground lines.",
        "Obtain required permits, unless otherwise agreed in writing.",
        "Avoid parking or placing heavy loads on the system area after installation, as this may cause system failure and void the warranty."
      ]
    },
    {
      number: "4.",
      title: "Payment Terms:",
      bulletPoints: [
        "A 60% deposit is required prior to the start of work.",
        "The remaining 40% must be paid immediately after the initial inspection has been passed and the work has been covered by our team.",
        "Permit fees must be paid in advance and are non-refundable."
      ]
    },
    {
      number: "5.",
      title: "Execution Timeline:",
      content: "Work will begin on the agreed-upon date, subject to weather conditions or delays beyond the Provider's control. In the event of encountering unsuitable soil or rock conditions, additional charges may apply and will be discussed with the Client before proceeding."
    },
    {
      number: "6.",
      title: "Change Orders and Additional Work:",
      content: "Any changes to the scope of work requested by the Client must be agreed upon in writing through a Change Order. Additional work beyond the agreed scope will be billed at the Provider's standard rates."
    },
    {
      number: "7.",
      title: "Warranty:",
      content: "The installation of the drainfield is covered by a one (1) year limited warranty from the date of the initial inspection, provided the system is used in accordance with the conditions established in the health department permit. Component parts are subject to the manufacturer's warranty. Damage caused by misuse, neglect, or unauthorized modifications will void the warranty."
    },
    {
      number: "8.",
      title: "Limitation of Liability:",
      subtitle: "The Provider is not responsible for:",
      bulletPoints: [
        "Any damage to landscaping, private utility lines, or other structures caused during standard installation work.",
        "Any direct, indirect, incidental, or consequential damages resulting from the use or misuse of the installed septic system.",
        "The system's performance if affected by external factors such as surface water, improper use, or lack of maintenance."
      ]
    },
    {
      number: "9.",
      title: "Contract Termination:",
      subtitle: "This agreement may be terminated:",
      bulletPoints: [
        "By mutual consent of both parties.",
        "By either party, in the event of material breach, with written notice.",
        "By the Client, at any time, with written notice; however, the Client shall be responsible for payment for all work completed and costs incurred up to the cancellation date."
      ]
    }
  ];

  const checkPageBreak = (estimatedHeight) => {
    if (doc.y + estimatedHeight > doc.page.height - NEW_PAGE_MARGIN - 100) {
      doc.addPage();
      doc.y = NEW_PAGE_MARGIN;
      return true;
    }
    return false;
  };

  termsSections.forEach((section, index) => {
    let estimatedHeight = 40;
    if (section.content) estimatedHeight += doc.heightOfString(section.content, { width: contentWidth });
    if (section.bulletPoints) estimatedHeight += section.bulletPoints.length * 15; // Rough estimate
    if (section.bulletPoints2) estimatedHeight += section.bulletPoints2.length * 15; // Rough estimate

    checkPageBreak(estimatedHeight);

    doc.font(FONT_FAMILY_BOLD).fontSize(9).fillColor(COLOR_TEXT_DARK);
    doc.text(`${section.number} ${section.title}`, NEW_PAGE_MARGIN, doc.y, { width: contentWidth });
    doc.moveDown(0.3);

    if (section.content) {
      doc.font(FONT_FAMILY_REGULAR).fontSize(8).fillColor(COLOR_TEXT_MEDIUM);
      doc.text(section.content, NEW_PAGE_MARGIN, doc.y, { width: contentWidth, align: 'justify' });
      doc.moveDown(0.8);
    }

    if (section.subtitle) {
      doc.font(FONT_FAMILY_BOLD).fontSize(8).fillColor(COLOR_TEXT_DARK);
      doc.text(section.subtitle, NEW_PAGE_MARGIN, doc.y, { width: contentWidth, underline: true });
      doc.moveDown(0.3);
    }

    if (section.bulletPoints) {
      doc.font(FONT_FAMILY_REGULAR).fontSize(8).fillColor(COLOR_TEXT_MEDIUM);
      section.bulletPoints.forEach(point => {
        const pointTextHeight = doc.heightOfString(point, { width: contentWidth - 15 });
        checkPageBreak(pointTextHeight + 5); // +5 for bullet and small margin

        const currentY = doc.y; // Guardar Y actual
        doc.text("•", NEW_PAGE_MARGIN, currentY, { width: 10, continued: false }); // Dibujar bullet
        doc.text(point, NEW_PAGE_MARGIN + 15, currentY, { width: contentWidth - 15, align: 'justify' }); // Dibujar texto en la misma Y
        // doc.y se actualiza automáticamente a después del texto más largo (el punto)
        doc.moveDown(0.4);
      });
      doc.moveDown(0.4);
    }

    if (section.subtitle2) {
      doc.font(FONT_FAMILY_BOLD).fontSize(8).fillColor(COLOR_TEXT_DARK);
      doc.text(section.subtitle2, NEW_PAGE_MARGIN, doc.y, { width: contentWidth, underline: true });
      doc.moveDown(0.3);
    }

    if (section.bulletPoints2) {
      doc.font(FONT_FAMILY_REGULAR).fontSize(8).fillColor(COLOR_TEXT_MEDIUM);
      section.bulletPoints2.forEach(point => {
        const pointTextHeight = doc.heightOfString(point, { width: contentWidth - 15 });
        checkPageBreak(pointTextHeight + 5);

        const currentY = doc.y; // Guardar Y actual
        doc.text("•", NEW_PAGE_MARGIN, currentY, { width: 10, continued: false }); // Dibujar bullet
        doc.text(point, NEW_PAGE_MARGIN + 15, currentY, { width: contentWidth - 15, align: 'justify' }); // Dibujar texto en la misma Y
        doc.moveDown(0.4);
      });
    }
    doc.moveDown(0.8);
  });

  checkPageBreak(60);
  doc.font(FONT_FAMILY_BOLD).fontSize(9).fillColor(COLOR_TEXT_DARK);
  doc.text("Client Acknowledgment:", NEW_PAGE_MARGIN, doc.y, { width: contentWidth, underline: true });
  doc.moveDown(0.3);
  doc.font(FONT_FAMILY_REGULAR).fontSize(8).fillColor(COLOR_TEXT_MEDIUM);
  doc.text("By signing this agreement, the Client authorizes the Provider to proceed with the work and agrees to comply with all terms and conditions outlined herein.", NEW_PAGE_MARGIN, doc.y, { width: contentWidth, align: 'justify' });
  doc.moveDown(1.5);

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

  doc.font(FONT_FAMILY_REGULAR).fontSize(8).fillColor(COLOR_TEXT_DARK);

  let currentLineY = doc.y;
  doc.text("Client Signature:", NEW_PAGE_MARGIN, currentLineY, { width: 75 });
  doc.moveTo(NEW_PAGE_MARGIN + 75, currentLineY + 8).lineTo(NEW_PAGE_MARGIN + 75 + sigLineFullWidth, currentLineY + 8)
    .strokeColor(COLOR_TEXT_DARK).lineWidth(0.5).stroke();

  doc.text("Date:", NEW_PAGE_MARGIN + sigFieldWidth + 10, currentLineY, { width: 30 });
  doc.moveTo(NEW_PAGE_MARGIN + sigFieldWidth + 10 + 30, currentLineY + 8)
    .lineTo(NEW_PAGE_MARGIN + sigFieldWidth + 10 + 30 + dateLineFullWidth, currentLineY + 8)
    .strokeColor(COLOR_TEXT_DARK).lineWidth(0.5).stroke();
  doc.moveDown(2.5);

  currentLineY = doc.y;
  doc.text("Provider Representative:", NEW_PAGE_MARGIN, currentLineY, { width: 110 });
  doc.moveTo(NEW_PAGE_MARGIN + 110, currentLineY + 8)
    .lineTo(NEW_PAGE_MARGIN + 110 + (sigLineFullWidth - 30), currentLineY + 8)
    .strokeColor(COLOR_TEXT_DARK).lineWidth(0.5).stroke();

  doc.text("Date:", NEW_PAGE_MARGIN + sigFieldWidth + 10, currentLineY, { width: 30 });
  doc.moveTo(NEW_PAGE_MARGIN + sigFieldWidth + 10 + 30, currentLineY + 8)
    .lineTo(NEW_PAGE_MARGIN + sigFieldWidth + 10 + 30 + dateLineFullWidth, currentLineY + 8)
    .strokeColor(COLOR_TEXT_DARK).lineWidth(0.5).stroke();
  doc.moveDown(1.5);


}
// ...existing code...

async function generateAndSaveBudgetPDF(budgetData) {
  return new Promise(async (resolve, reject) => {
    try {
      const { idBudget, date, expirationDate, Permit } = budgetData;
      const clientEmailFromPermit = Permit?.applicantEmail;
      const formattedDate = formatDateDDMMYYYY(date);
      const formattedExpirationDate = formatDateDDMMYYYY(expirationDate);

      const doc = new PDFDocument({ autoFirstPage: false, margin: pageMargin, size: 'A4' });
      // BUSCAR en generateAndSaveBudgetPDF (alrededor de la línea 913):
      const uploadsDir = path.join(__dirname, '../uploads/budgets');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const pdfPath = path.join(uploadsDir, `budget_${idBudget}.pdf`);
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // --- PÁGINA 1: INVOICE ESTILIZADA ---
      doc.addPage();
      await _buildInvoicePage_v2(doc, budgetData, formattedDate, formattedExpirationDate, clientEmailFromPermit);

      // --- PÁGINA 2: TÉRMINOS Y CONDICIONES ESTILIZADOS ---
      // Aquí es donde se generan los Términos y Condiciones
      doc.addPage();
      _buildTermsAndConditionsPage_v2(doc, budgetData, formattedDate, formattedExpirationDate);

      // Si tenías una página de "Budget Contract" y también necesita este nuevo estilo,
      // deberías crear una función _buildBudgetContractPage_v2 y llamarla aquí.
      // Por ahora, el paquete es Invoice + T&C según los ejemplos visuales.

      doc.end();

      stream.on('finish', () => {
        console.log(`PDF de paquete de presupuesto generado: ${pdfPath}`);
        resolve(pdfPath);
      });
      stream.on('error', (err) => {
        console.error("Error al escribir el stream del PDF del paquete de presupuesto:", err);
        reject(err);
      });

    } catch (error) {
      console.error("Error dentro de generateAndSaveBudgetPDF (multi-página):", error);
      reject(error);
    }
  });
}



async function generateAndSaveFinalInvoicePDF(invoiceData) {
  return new Promise(async (resolve, reject) => {
    try {
      // --- 1. Preparar Datos ---
      const {
        id, invoiceDate, originalBudgetTotal, initialPaymentMade,
        subtotalExtras, finalAmountDue, status, paymentDate,
        Work, // Objeto Work asociado (incluye Budget y Permit si se hizo include)
        extraItems = [] // Array de WorkExtraItem
      } = invoiceData;

      // Extraer datos del cliente y la obra
      const budget = Work?.budget;
      const permit = budget?.Permit || Work?.Permit; // Buscar permit en budget o work
      const applicantName = budget?.applicantName || permit?.applicantName || 'N/A';
      const propertyAddress = Work?.propertyAddress || budget?.propertyAddress || permit?.propertyAddress || 'N/A';
      const clientEmailFromPermitOrBudget = permit?.applicantEmail || budget?.Permit?.applicantEmail; // Intenta obtenerlo de cualquiera de los dos
      const formattedInvoiceDate = formatDateDDMMYYYY(invoiceDate);
      const formattedPaymentDate = formatDateDDMMYYYY(paymentDate);

      // --- 2. Configurar PDF ---
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const uploadsDir = path.join(__dirname, '../uploads/final_invoices');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const pdfPath = path.join(uploadsDir, `final_invoice_${id}.pdf`);
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // --- CONSTANTES DE DISEÑO ---
      const pageMargin = 50;
      const contentWidth = doc.page.width - pageMargin * 2;
      const logoPath = path.join(__dirname, '../assets/logo.png');

      // --- 3. Contenido del PDF ---

      // === SECCIÓN ENCABEZADO === (Similar a Budget)
      const headerStartY = pageMargin;
      const headerRightX = doc.page.width - pageMargin - 150;
      if (fs.existsSync(logoPath)) doc.image(logoPath, pageMargin, headerStartY, { width: 50 });
      const companyInfoX = pageMargin + 60;
      doc.fontSize(10).font('Helvetica-Bold').text("Zurcher Construction", companyInfoX, headerStartY + 5);
      doc.font('Helvetica').fontSize(9);
      doc.text("Septic Tank Division - CFC1433240", companyInfoX, doc.y);
      doc.text("zurcherseptic@gmail.com", companyInfoX, doc.y);
      doc.text("+1 (407) 419-4495", companyInfoX, doc.y);
      doc.fontSize(12).font('Helvetica-Bold').text(`Final Invoice #: ${id}`, headerRightX, headerStartY + 5, { width: 150, align: 'right' });
      doc.font('Helvetica').fontSize(10);
      doc.text(`Date: ${formattedInvoiceDate}`, headerRightX, doc.y, { width: 150, align: 'right' });
      if (status === 'paid' && paymentDate) {
        doc.text(`Payment Date: ${formattedPaymentDate}`, headerRightX, doc.y, { width: 150, align: 'right' });
      }
      doc.moveDown(3);
      const lineYHeader = doc.y;
      doc.moveTo(pageMargin, lineYHeader).lineTo(doc.page.width - pageMargin, lineYHeader).strokeColor("#cccccc").stroke();
      doc.moveDown(1);

      // === SECCIÓN INFO CLIENTE === (Similar a Budget)
      doc.fontSize(11).font('Helvetica-Bold').text('Customer Information:', pageMargin, doc.y);
      doc.font('Helvetica').fontSize(10);
      doc.text(`Name: ${applicantName}`);
      doc.text(`Property Address: ${propertyAddress}`);
      if (permit) doc.text(`Permit #: ${permit.permitNumber || 'N/A'}`);
      doc.moveDown(2);

      // === SECCIÓN ITEMS EXTRAS ===
      doc.fontSize(12).font('Helvetica-Bold').text('Additional Items / Extras', { underline: true });
      doc.moveDown(0.5);
      const tableTopExtras = doc.y;
      const itemX = pageMargin;
      const qtyX = pageMargin + contentWidth * 0.55;
      const unitPriceX = pageMargin + contentWidth * 0.70;
      const totalX = pageMargin + contentWidth * 0.85;
      const tableHeaderRightEdge = doc.page.width - pageMargin;

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Item / Description', itemX, tableTopExtras, { width: qtyX - itemX - 10 });
      doc.text('Qty', qtyX, tableTopExtras, { width: unitPriceX - qtyX - 10, align: 'right' });
      doc.text('Unit Price', unitPriceX, tableTopExtras, { width: totalX - unitPriceX - 10, align: 'right' });
      doc.text('Line Total', totalX, tableTopExtras, { width: tableHeaderRightEdge - totalX, align: 'right' });
      doc.font('Helvetica');
      doc.moveDown();
      const tableBottomLineYExtras = doc.y;
      doc.moveTo(itemX, tableBottomLineYExtras).lineTo(tableHeaderRightEdge, tableBottomLineYExtras).strokeColor("#cccccc").stroke();
      doc.moveDown(0.5);

      if (extraItems.length > 0) {
        extraItems.forEach(item => {
          const y = doc.y;
          const quantityNum = parseFloat(item.quantity);
          const unitPriceNum = parseFloat(item.unitPrice);
          const lineTotalNum = parseFloat(item.lineTotal);
          doc.fontSize(9).text(item.description || 'N/A', itemX, y, { width: qtyX - itemX - 10 });
          doc.fontSize(9).text(!isNaN(quantityNum) ? quantityNum.toFixed(2) : '0.00', qtyX, y, { width: unitPriceX - qtyX - 10, align: 'right' });
          doc.text(`$${!isNaN(unitPriceNum) ? unitPriceNum.toFixed(2) : '0.00'}`, unitPriceX, y, { width: totalX - unitPriceX - 10, align: 'right' });
          doc.text(`$${!isNaN(lineTotalNum) ? lineTotalNum.toFixed(2) : '0.00'}`, totalX, y, { width: tableHeaderRightEdge - totalX, align: 'right' });
          doc.moveDown(1);
        });
      } else {
        doc.fontSize(9).fillColor('grey').text('No additional items were added.', itemX, doc.y, { width: contentWidth, align: 'center' });
        doc.fillColor('black');
        doc.moveDown(1);
      }

      // Línea antes de totales
      const finalItemsYExtras = doc.y;
      // Ajustar la X inicial de la línea para que comience donde empiezan las etiquetas de los totales
      const totalsLabelStartXForLine = pageMargin + contentWidth * 0.55; // Un poco antes de las etiquetas
      doc.moveTo(totalsLabelStartXForLine, finalItemsYExtras).lineTo(tableHeaderRightEdge, finalItemsYExtras).strokeColor("#cccccc").stroke();
      doc.moveDown(1); // Más espacio después de la línea

      // === SECCIÓN TOTALES (REDISEÑADA PARA MEJOR LEGIBILIDAD) ===
      const totalsSectionStartY = doc.y;
      const labelColumnX = pageMargin + contentWidth * 0.50; // X para inicio de etiquetas (más a la izquierda)
      const valueColumnX = pageMargin + contentWidth * 0.80; // X para inicio de valores (más a la derecha)
      const columnWidth = contentWidth * 0.20; // Ancho para cada columna de valor/etiqueta (ajustar según necesidad)

      doc.fontSize(10);

      // --- Función auxiliar para dibujar una fila de total ---
      const drawTotalRow = (label, value, options = {}) => {
        const yPos = doc.y;
        const isBold = options.bold || false;
        const labelColor = options.labelColor || 'black';
        const valueColor = options.valueColor || 'black';
        const font = isBold ? 'Helvetica-Bold' : 'Helvetica';

        doc.font(font).fillColor(labelColor).text(label, labelColumnX, yPos, {
          width: valueColumnX - labelColumnX - 10, // Ancho para la etiqueta
          align: 'right'
        });
        doc.font(font).fillColor(valueColor).text(value, valueColumnX, yPos, {
          width: (doc.page.width - pageMargin) - valueColumnX, // Ancho para el valor hasta el borde
          align: 'right'
        });
        doc.fillColor('black'); // Reset color
        doc.moveDown(options.moveDownFactor !== undefined ? options.moveDownFactor : 0.65); // Espacio después de la fila
      };

      // --- Original Budget Total ---
      const originalTotalNum = parseFloat(originalBudgetTotal);
      drawTotalRow(
        `Original Budget Total:`,
        `$${!isNaN(originalTotalNum) ? originalTotalNum.toFixed(2) : '0.00'}`
      );

      // --- Subtotal Extras ---
      const extrasNum = parseFloat(subtotalExtras);
      if (!isNaN(extrasNum) && extrasNum !== 0) { // Solo mostrar si hay extras
        drawTotalRow(
          `Additional Items Total:`,
          `$${extrasNum.toFixed(2)}`
        );
      }

      // --- Gran Total (Suma de Budget + Extras) ---
      const grandTotalNum = (originalTotalNum || 0) + (extrasNum || 0);
      drawTotalRow(
        `Total Before Payments:`,
        `$${grandTotalNum.toFixed(2)}`,
        { bold: false, moveDownFactor: 0.8 } // Un poco más de espacio antes del pago
      );

      // Línea delgada antes de los pagos
      const lineBeforePaymentsY = doc.y;
      doc.moveTo(labelColumnX, lineBeforePaymentsY)
        .lineTo(doc.page.width - pageMargin, lineBeforePaymentsY)
        .lineWidth(0.5) // Línea más delgada
        .strokeColor("#999999") // Gris más oscuro para esta línea
        .stroke();
      doc.moveDown(0.8);


      // --- Initial Payment ---
      const initialPaymentNum = parseFloat(initialPaymentMade);
      if (!isNaN(initialPaymentNum) && initialPaymentNum !== 0) { // Solo mostrar si hubo pago inicial
        drawTotalRow(
          `Initial Payment Received:`,
          `-$${initialPaymentNum.toFixed(2)}`,
          { valueColor: 'green' } // Color verde para el pago recibido
        );
      }

      // --- Final Amount Due / Paid ---
      const finalAmountNum = parseFloat(finalAmountDue);
      const finalAmountLabel = status === 'paid' ? `Final Amount Paid:` : `Final Amount Due:`;
      const finalAmountColor = status === 'paid' ? 'green' : 'black';
      drawTotalRow(
        finalAmountLabel,
        `$${!isNaN(finalAmountNum) ? finalAmountNum.toFixed(2) : '0.00'}`,
        { bold: true, valueColor: finalAmountColor, moveDownFactor: 2 } // Negrita y más espacio después
      );

      doc.lineWidth(1);

      // === SECCIÓN ESTADO ===
      doc.fontSize(12).font('Helvetica-Bold').text(`Status: ${status?.replace('_', ' ').toUpperCase() || 'N/A'}`, pageMargin, doc.y);
      doc.moveDown(2);


      let paymentLinkUrl = null;
      if (status !== 'paid' && finalAmountDue > 0) {
        try {
          // Define las URLs a las que Stripe redirigirá al usuario
          // DEBES crear estas rutas en tu aplicación web/frontend
          const successUrl = 'https://www.google.com'; // URL temporal para éxito
          const cancelUrl = 'https://www.google.com';  // URL temporal para cancelación

          // Crear sesión de Checkout en Stripe
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'], // Puedes añadir otros como 'ach_debit'
            line_items: [
              {
                price_data: {
                  currency: 'usd', // O la moneda que uses
                  product_data: {
                    name: `Final Invoice #${id} - ${applicantName}`,
                    description: `Payment for final invoice related to work at ${propertyAddress}`,
                  },
                  // ¡Importante! Stripe espera el monto en centavos
                  unit_amount: Math.round(parseFloat(finalAmountDue) * 100),
                },
                quantity: 1,
              },
            ],
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            // Opcional: Pre-rellenar email del cliente si lo tienes
            ...(clientEmailFromPermitOrBudget && { customer_email: clientEmailFromPermitOrBudget }),
            // Opcional: Pasar metadata útil para reconciliación
            metadata: {
              internal_invoice_id: id,
              work_id: Work?.id || 'N/A',
              budget_id: budget?.idBudget || 'N/A'
            }
          });
          paymentLinkUrl = session.url; // Guardar la URL de pago

        } catch (stripeError) {
          console.error("Error al crear la sesión de Stripe Checkout:", stripeError);
          // Decide cómo manejar esto: ¿generar PDF sin enlace? ¿rechazar la promesa?
          // Por ahora, solo logueamos y el PDF se generará sin el enlace.
        }
      }

      // Añadir la sección al PDF si se generó el enlace
      if (paymentLinkUrl) {
        doc.moveDown(2); // Espacio antes de la nueva sección
        const buttonWidth = 180;
        const buttonHeight = 30;
        const buttonX = pageMargin + (contentWidth - buttonWidth) / 2; // Centrar horizontalmente
        const buttonY = doc.y;
        const buttonText = 'Click Here to Pay Online';

        // 1. Dibujar y rellenar el rectángulo del botón
        doc.save(); // Guardar estado actual (color, etc.)
        doc.roundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 5).fillColor('#007bff').fill(); // Azul tipo botón, esquinas redondeadas

        // 2. Escribir el texto del botón
        doc.fillColor('white').fontSize(10).font('Helvetica-Bold'); // Texto blanco y negrita
        doc.text(buttonText, buttonX, buttonY + (buttonHeight / 2) - (doc.currentLineHeight() / 2.5), { // Centrar texto verticalmente (aproximado)
          width: buttonWidth,
          align: 'center'
        });
        doc.restore(); // Restaurar estado anterior (color negro, fuente normal, etc.)

        // 3. Crear el enlace invisible sobre el área del botón
        doc.link(buttonX, buttonY, buttonWidth, buttonHeight, paymentLinkUrl);
        // --- FIN SIMULACIÓN DE BOTÓN ---

        doc.moveDown(3);
        // doc.fontSize(10).font('Helvetica-Bold').text('Online Payment:', pageMargin, doc.y, { underline: true });
        // doc.font('Helvetica').fontSize(9);
        // doc.moveDown(0.5);
        // doc.fillColor('blue') // Color azul para que parezca un enlace
        //    .text('Click here to pay the final amount online securely via Stripe', pageMargin, doc.y, {
        //      link: paymentLinkUrl,
        //      underline: true // Subrayado para indicar enlace
        //    });
        // doc.fillColor('black'); // Volver al color negro por defecto
        // doc.moveDown(1.5);
      }
      // *** FIN NUEVA SECCIÓN ***
      // === SECCIÓN INFORMACIÓN DE PAGO === (Igual que en Budget)
      doc.fontSize(10).font('Helvetica-Bold').text('Payment Information:', pageMargin, doc.y, { underline: true });
      doc.font('Helvetica');
      doc.moveDown(0.5);
      doc.text("Bank: Bank of America", pageMargin, doc.y);
      doc.text("Routing #: 063100277", pageMargin, doc.y);
      doc.text("Account #: 898138399808", pageMargin, doc.y);
      doc.text("Zelle Email: zurcherconstruction.fl@gmail.com", pageMargin, doc.y);
      doc.moveDown(1.5);



      // === PIE DE PÁGINA === (Igual que en Budget)
      const pageBottom = doc.page.height - pageMargin + 10;
      doc.fontSize(8).fillColor('grey').text('Thank you for your business! | Zurcher Construction', pageMargin, pageBottom, {
        align: 'center',
        width: contentWidth
      });

      // --- 4. Finalizar PDF ---
      doc.end();

      // --- 5. Resolver Promesa ---
      stream.on('finish', () => {
        console.log(`Final Invoice PDF generado y guardado exitosamente en: ${pdfPath}`);
        resolve(pdfPath);
      });
      stream.on('error', (err) => {
        console.error("Error al escribir el stream del PDF de la factura final:", err);
        reject(err);
      });

    } catch (error) {
      console.error("Error dentro de generateAndSaveFinalInvoicePDF:", error);
      reject(error);
    }
  });
}

async function generateAndSaveChangeOrderPDF(changeOrderData, workData, companyData) {
  return new Promise(async (resolve, reject) => {
    try {
      // --- 1. Preparar Datos ---
      const {
        id: changeOrderId,
        changeOrderNumber, // Asumimos que lo tienes o lo generas
        description: coDescription,
        itemDescription,
        hours,
        unitCost,
        totalCost,
        status: coStatus,
        clientMessage,
        createdAt: coCreatedAt, // Fecha de creación del CO
      } = changeOrderData;

      const {
        propertyAddress,
        // Podrías necesitar el nombre del cliente del Work o su Budget/Permit asociado
      } = workData;

      // Datos de tu empresa (puedes pasarlos o tenerlos como constantes)
      const defaultCompanyData = {
        name: "ZURCHER CONSTRUCTION LLC.",
        addressLine1: "9837 Clear Cloud Aly",
        cityStateZip: "Winter Garden 34787",
        phone: "+1 (407) 419-4495",
        email: "zurcherseptic@gmail.com", // O el email que uses para contacto
        logoPath: path.join(__dirname, '../assets/logo.png') // Ruta al logo de la empresa
      };
      const currentCompany = { ...defaultCompanyData, ...companyData };


      // Datos del cliente (ejemplo, necesitarás obtenerlos del workData o sus relaciones)
      const clientName = workData.Budget?.applicantName || workData.Permit?.applicantName || "Valued Customer";
      const clientCompanyName = workData.Budget?.companyName || ""; // Si tienes compañía del cliente

      const formattedCODate = formatDateDDMMYYYY(coCreatedAt || new Date().toISOString()); // Fecha del CO
      const coNumber = changeOrderNumber || `CO-${changeOrderId.substring(0, 8)}`;

      // --- 2. Configurar PDF ---
      const doc = new PDFDocument({ margin: pageMargin, size: 'A4' }); // Use global pageMargin
      const uploadsDir = path.join(__dirname, '../uploads/change_orders');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const pdfPath = path.join(uploadsDir, `change_order_${coNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      const contentWidth = doc.page.width - pageMargin * 2;

      // Colores (ya definidos globalmente, pero pueden ser locales si se prefiere)
      // const primaryColor = '#003366'; 
      // const textColor = '#333333';
      // const lightGrayColor = '#DDDDDD';
      // const whiteColor = '#FFFFFF';

      // --- 3. Contenido del PDF ---

      // === ENCABEZADO ===
      const headerHeight = 80;
      doc.save(); // Guardar el estado actual del documento (colores, fuentes, etc.)
      doc.rect(0, 0, doc.page.width, headerHeight).fill(primaryColor);
      if (fs.existsSync(currentCompany.logoPath)) {
        doc.image(currentCompany.logoPath, pageMargin, 15, { height: 50 });
      }
      doc.fontSize(12).fillColor(whiteColor).font('Helvetica-Bold')
        .text('CHANGE ORDER', pageMargin + 200, 30, { align: 'right', width: contentWidth - 200 });
      doc.restore(); // Restaurar el estado del documento a como estaba antes de doc.save()

      doc.fillColor(textColor); // Establecer el color de texto para el contenido principal después del encabezado

      // === INFORMACIÓN DE LA EMPRESA Y DEL DOCUMENTO ===
      let currentY = headerHeight + 20;
      doc.fontSize(11).font('Helvetica-Bold').text(currentCompany.name, pageMargin, currentY);
      currentY += doc.currentLineHeight();
      doc.font('Helvetica').text(currentCompany.addressLine1, pageMargin, currentY);
      currentY += doc.currentLineHeight();
      doc.text(currentCompany.cityStateZip, pageMargin, currentY);
      currentY += doc.currentLineHeight();
      doc.text(currentCompany.phone, pageMargin, currentY);
      const leftColumnEndY = currentY;

      currentY = headerHeight + 20;
      const rightInfoX = doc.page.width - pageMargin - 200;
      doc.fontSize(11).font('Helvetica-Bold').text(`NO: ${coNumber}`, rightInfoX, currentY, { width: 200, align: 'right' });
      currentY += doc.currentLineHeight();
      doc.font('Helvetica').text(`Date: ${formattedCODate}`, rightInfoX, currentY, { width: 200, align: 'right' });
      currentY += doc.currentLineHeight();
      if (clientCompanyName) {
        doc.font('Helvetica-Bold').text(clientCompanyName.toUpperCase(), rightInfoX, currentY, { width: 200, align: 'right' });
      } else {
        doc.font('Helvetica-Bold').text(clientName.toUpperCase(), rightInfoX, currentY, { width: 200, align: 'right' });
      }
      const rightColumnEndY = currentY;

      currentY = Math.max(leftColumnEndY, rightColumnEndY) + 20;
      doc.y = currentY;

      // === DIRECCIÓN DE LA OBRA ===
      doc.fontSize(11).font('Helvetica-Bold').text(propertyAddress.toUpperCase(), pageMargin, currentY, { align: 'left' });
      currentY += doc.currentLineHeight() + 40;
      doc.y = currentY;


      // === TABLA DE ÍTEMS DEL CHANGE ORDER ===
      const tableTop = currentY;
      const colQtyX = pageMargin;
      const colDescX = pageMargin + 60;
      const colUnitPriceX = pageMargin + contentWidth - 180;
      const colTotalX = pageMargin + contentWidth - 90;

      doc.fontSize(12).font('Helvetica-Bold');
      doc.rect(pageMargin, tableTop - 5, contentWidth, 20).fill(primaryColor);
      doc.fillColor(whiteColor);
      doc.text('Qty', colQtyX + 5, tableTop, { width: colDescX - colQtyX - 10 });
      doc.text('Item Description', colDescX + 5, tableTop);
      doc.text('Unit Price', colUnitPriceX, tableTop, { width: colTotalX - colUnitPriceX - 10, align: 'right' });
      doc.text('Total', colTotalX, tableTop, { width: contentWidth - (colTotalX - pageMargin), align: 'right' });
      doc.fillColor(textColor);
      currentY = tableTop + 25;
      doc.y = currentY;

      doc.fontSize(12).font('Helvetica');
      const qtyText = hours ? `${parseFloat(hours).toFixed(1)} hours` : '1';
      const itemDescText = itemDescription || coDescription || "Work as per Change Order";
      const unitPriceText = `$${parseFloat(unitCost || totalCost || 0).toFixed(2)}`;
      const totalText = `$${parseFloat(totalCost || 0).toFixed(2)}`;

      doc.text(qtyText, colQtyX + 5, currentY, { width: colDescX - colQtyX - 10 });
      doc.text(itemDescText, colDescX + 5, currentY, { width: colUnitPriceX - colDescX - 10 });
      doc.text(unitPriceText, colUnitPriceX, currentY, { width: colTotalX - colUnitPriceX - 10, align: 'right' });
      doc.text(totalText, colTotalX, currentY, { width: contentWidth - (colTotalX - pageMargin), align: 'right' });

      currentY = doc.y + doc.currentLineHeight() + 10;
      doc.moveTo(pageMargin, currentY).lineTo(doc.page.width - pageMargin, currentY).strokeColor(lightGrayColor).stroke();
      currentY += 15;
      doc.y = currentY;

      // === TOTAL DEL CHANGE ORDER ===
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('TOTAL CHANGE ORDER:', colUnitPriceX - 100, currentY, { width: 100, align: 'right' });
      doc.text(`$${parseFloat(totalCost || 0).toFixed(2)}`, colTotalX, currentY, { width: contentWidth - (colTotalX - pageMargin), align: 'right' });
      currentY = doc.y + doc.currentLineHeight() + 20;
      doc.y = currentY;

      // === MENSAJE AL CLIENTE (SI EXISTE) ===
      if (clientMessage) {
        doc.fontSize(10).font('Helvetica-Oblique').text("Note:", pageMargin, currentY);
        currentY += doc.currentLineHeight();
        doc.font('Helvetica').text(clientMessage, pageMargin, currentY, { width: contentWidth });
        currentY = doc.y + 10;
        doc.y = currentY;
      }

      // === SECCIÓN DE APROBACIÓN (SI EL ESTADO ES APROBADO) ===
      if (coStatus === 'approved') {
        const approvedStampPath = path.join(__dirname, '../assets/approved_stamp.png');
        let stampYPosition = doc.y + 10;
        const stampHeight = 70;
        const spaceNeededForStampAndFollowing = stampHeight + 150; // Stamp + Signature + Thankyou approx

        if (stampYPosition + spaceNeededForStampAndFollowing > doc.page.height - pageMargin) {
          doc.addPage();
          stampYPosition = pageMargin;
        }
        doc.y = stampYPosition;

        if (fs.existsSync(approvedStampPath)) {
          doc.image(approvedStampPath, doc.page.width - pageMargin - 150, doc.y, { width: 120 });
          doc.y += stampHeight;
        } else {
          doc.fontSize(18).fillColor('green').font('Helvetica-Bold')
            .text('APPROVED', doc.page.width - pageMargin - 200, doc.y, { width: 180, align: 'center' });
          doc.y += 30;
        }
        doc.y += 10;
      }
      currentY = doc.y; // Update currentY after potential stamp

      // --- START: RESTRUCTURED BOTTOM SECTIONS ---
      const signatureSectionHeightEst = 100; // Estimación de _addClientSignatureSection
      const paymentInfoHeightEst = (5 * 12) + 20; // Aprox. 5 líneas para info de pago + título + buffer
      const thankYouHeightEst = 40 + 10;        // Altura de "Thank You!" + espacio potencial
      const spacingAfterPayment = 3 * 12; // Aproximadamente doc.moveDown(3)
      const spacingAfterThankYou = 3 * 12; // Aproximadamente doc.moveDown(3)

      // Estimar altura total necesaria para las secciones inferiores en el nuevo orden
      const totalBottomSectionsHeight = paymentInfoHeightEst + spacingAfterPayment + thankYouHeightEst + spacingAfterThankYou + signatureSectionHeightEst;

      // Usar doc.y directamente como la posición vertical actual
      if (doc.y + totalBottomSectionsHeight > doc.page.height - pageMargin) {
        doc.addPage();
        // doc.y se reinicia al agregar una página nueva (generalmente al margen superior)
      }

      // === INFORMACIÓN DE PAGO ===
      doc.fontSize(9).font('Helvetica-Bold').text('Payment Information:', pageMargin, doc.y);
      // doc.y se actualiza después del texto. Añadir un pequeño espacio antes de los detalles.
      doc.y += 5;

      doc.font('Helvetica');
      doc.text(`Bank: ${currentCompany.bankName || "Chase"}`, pageMargin, doc.y);
      doc.text(`Routing number: ${currentCompany.routingNumber || "267084131"}`, pageMargin, doc.y);
      doc.text(`Account number: ${currentCompany.accountNumber || "686125371"}`, pageMargin, doc.y);
      doc.text(`Email: ${currentCompany.paymentEmail || "zurcherseptic@gmail.com"}`, pageMargin, doc.y);

      doc.moveDown(3); // Espacio después de la Información de Pago

      // === THANK YOU ===
      // Verificar si "Thank You!" y la sección de firma caben desde el doc.y actual
      // signatureSectionHeightEst ya considera los márgenes internos de esa función.
      if (doc.y + thankYouHeightEst + spacingAfterThankYou + signatureSectionHeightEst > doc.page.height - pageMargin) {
        doc.addPage();
      }
      doc.fontSize(22).font('Helvetica-BoldOblique').fillColor(primaryColor)
        .text('Thank You!', pageMargin, doc.y, { width: contentWidth, align: 'right' });
      // doc.y se actualiza después de "Thank You!"

      doc.moveDown(3); // Espacio después de "Thank You!"

      // === SIGNATURE SECTION ===
      // _addClientSignatureSection usará el doc.y actual.
      // Su lógica interna decidirá su posición final (probablemente cerca del final de la página actual).
      _addClientSignatureSection(doc); // Update doc.y after Thank You

      // --- END: RESTRUCTURED BOTTOM SECTIONS ---

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
}

module.exports = { generateAndSaveBudgetPDF, generateAndSaveFinalInvoicePDF, generateAndSaveChangeOrderPDF };