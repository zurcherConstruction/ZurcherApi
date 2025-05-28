const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { format, parseISO } = require('date-fns'); // Para formatear fechas
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// --- CONSTANTES DE DISEÑO (Compartidas y Estilo ChangeOrder) ---
const pageMargin = 50;
// Colores (similares a ChangeOrder)
const primaryColor = '#003366'; // Azul oscuro
const whiteColor = '#FFFFFF';
const textColor = '#333333';
const lightGrayColor = '#DDDDDD'; // Para líneas y bordes suaves

// Helper para formatear fechas o devolver N/A
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

// --- NUEVA FUNCIÓN DE ENCABEZADO DE PÁGINA (Estilo Change Order) ---
function _addPageHeader(doc, budgetData, pageTitle, formattedDate, formattedExpirationDate) {
  const { idBudget } = budgetData;
  const logoPath = path.join(__dirname, '../assets/logo.png'); // Asegúrate que esta ruta es correcta
  const headerHeight = 70; // Altura del banner azul

  doc.save(); // Guardar estado para no afectar el resto del doc

  // Banner azul superior
  doc.rect(0, 0, doc.page.width, headerHeight).fill(primaryColor);

  // Logo (dentro del banner)
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, pageMargin, 10, { height: headerHeight - 20 });
  } else {
    console.warn(`Logo no encontrado en header: ${logoPath}`);
  }

  // Título del Documento
  doc.fontSize(14).fillColor(whiteColor).font('Helvetica-Bold')
     .text(pageTitle, pageMargin + 150, headerHeight / 2 - 10, {
       align: 'center',
       width: doc.page.width - (pageMargin + 150) - pageMargin
     });
  
  doc.restore(); // Restaurar estado

  // Información del Presupuesto (debajo del banner)
  const infoStartY = headerHeight + 15;
  const budgetInfoX = doc.page.width - pageMargin - 200;

  doc.fontSize(10).fillColor(textColor);
  doc.font('Helvetica-Bold').text(`Budget #: ${idBudget}`, budgetInfoX, infoStartY, { width: 190, align: 'right' });
  doc.font('Helvetica').text(`Date: ${formattedDate}`, budgetInfoX, doc.y, { width: 190, align: 'right' });
  if (formattedExpirationDate && formattedExpirationDate !== 'N/A') {
    doc.text(`Expiration Date: ${formattedExpirationDate}`, budgetInfoX, doc.y, { width: 190, align: 'right' });
  }

  // Información de la Empresa (izquierda, debajo del banner)
  const companyInfoX = pageMargin;
  doc.fontSize(10).font('Helvetica-Bold').text("Zurcher Construction", companyInfoX, infoStartY);
  doc.font('Helvetica').fontSize(9);
  doc.text("Septic Tank Division - CFC1433240", companyInfoX, doc.y);
  doc.text("zurcherseptic@gmail.com", companyInfoX, doc.y);
  doc.text("+1 (407) 419-4495", companyInfoX, doc.y);
  
  let maxYForHeader = doc.y; // Captura la Y después de la info de la empresa
  
  // Asegurar que la Y de la info del presupuesto no sobrepase la de la empresa para la línea
  doc.y = Math.max(maxYForHeader, infoStartY + 3 * doc.currentLineHeight({fontSize:10}));


  doc.moveDown(2); // Ajustar este valor según sea necesario
  const lineY = doc.y;
  doc.moveTo(pageMargin, lineY).lineTo(doc.page.width - pageMargin, lineY).strokeColor(lightGrayColor).stroke();
  doc.moveDown(1);
}


// --- NUEVA FUNCIÓN PARA SECCIÓN DE FIRMA ---
function _addClientSignatureSection(doc) {
  const currentContentHeight = doc.y;
  const availableSpace = doc.page.height - pageMargin - currentContentHeight;
  const signatureSectionHeight = 80; 

  if (availableSpace < signatureSectionHeight) {
    console.warn("Poco espacio para la sección de firma, podría superponerse o cortarse.");
    doc.y = doc.page.height - pageMargin - signatureSectionHeight - 10; 
     if (doc.y < currentContentHeight) doc.y = currentContentHeight + 10; 
  } else {
     doc.y = doc.page.height - pageMargin - signatureSectionHeight - 20; 
  }

  const signatureStartY = doc.y;
  const contentWidth = doc.page.width - pageMargin * 2;
  const lineLength = (contentWidth / 2) - 30; 
 const signatureX = pageMargin;
  const dateX = pageMargin + contentWidth / 2 + 10;

  doc.fontSize(8).font('Helvetica-Bold').text('Client Acceptance & Signature:', pageMargin, signatureStartY, {width: contentWidth}); // Asumo que el tamaño de fuente es 10 como en mi última corrección, si es 8 como en tu selección, el efecto será similar.
  doc.moveDown(2.5); // Aumentado de 2 a 3 para más espacio

  const lineYPosition = doc.y + 5; // Position for the signature lines
  
  // Signature Line (Left)
  doc.moveTo(signatureX, lineYPosition).lineTo(signatureX + lineLength, lineYPosition).strokeColor(textColor).stroke();
  
  // Date Line (Right)
  doc.moveTo(dateX, lineYPosition).lineTo(dateX + lineLength, lineYPosition).strokeColor(textColor).stroke();

  // Calculate Y for text below lines - a small gap below the line
  const textY = lineYPosition + 5; 

  doc.font('Helvetica').fontSize(9);
  
  // Text below Signature Line (Left)
  doc.text('Accepted proposal signature.', signatureX, textY, { 
    width: lineLength, 
    align: 'center' 
  });

  // Text below Date Line (Right)
  doc.text('Signature date.', dateX, textY, { // Use the same textY for horizontal alignment
    width: lineLength, 
    align: 'center' 
  });
  
  // Ensure doc.y is below the text for subsequent content
  // Use currentLineHeight with the active font size (9)
  doc.y = textY + doc.currentLineHeight({fontSize: 9}) + 10; 
}

function _addStandardPageFooter(doc) {
  const footerYPosition = doc.page.height - 35; // Posiciona el pie de página a 35 puntos del borde inferior absoluto
  const contentWidth = doc.page.width - pageMargin * 2;
  
  // Guardar estado actual (color, fuente) para no afectar otras partes del documento
  doc.save(); 
  doc.fontSize(8).fillColor('grey').text('Thank you for your business! | Zurcher Construction', pageMargin, footerYPosition, {
     align: 'center',
     width: contentWidth
  });
  // Restaurar estado
  doc.restore();
}

// --- PÁGINA 1: DETALLE DEL PRESUPUESTO (CONTRATO) ---
function _buildBudgetContractPage(doc, budgetData, formattedDate, formattedExpirationDate) {
  // Custom header for the FIRST page of Budget Proposal
  const { idBudget, applicantName, propertyAddress, Permit, lineItems = [], subtotalPrice, discountDescription, discountAmount, totalPrice, initialPaymentPercentage, initialPayment, generalNotes } = budgetData;
  const contentWidth = doc.page.width - pageMargin * 2;

  const headerHeight = 70;
  doc.save();
  // Blue Banner
  doc.rect(0, 0, doc.page.width, headerHeight).fill(primaryColor);

  // Logo (left in banner)
  const logoPath = path.join(__dirname, '../assets/logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, pageMargin, 10, { height: headerHeight - 20 });
  } else {
    console.warn(`Logo no encontrado en header: ${logoPath}`);
  }

  // Budget #, Date, Expiration Date (right in banner)
  const budgetInfoXInBanner = doc.page.width - pageMargin - 220; 
  let budgetInfoYInBanner = 18; // Adjusted Y for better vertical centering in banner

  doc.fillColor(whiteColor).font('Helvetica-Bold').fontSize(10);
  doc.text(`Budget #: ${idBudget}`, budgetInfoXInBanner, budgetInfoYInBanner, { width: 210, align: 'right' });
  budgetInfoYInBanner += doc.currentLineHeight() + 2;
  doc.font('Helvetica').fontSize(9);
  doc.text(`Date: ${formattedDate}`, budgetInfoXInBanner, budgetInfoYInBanner, { width: 210, align: 'right' });
  budgetInfoYInBanner += doc.currentLineHeight() + 2;
  if (formattedExpirationDate && formattedExpirationDate !== 'N/A') {
    doc.text(`Expiration Date: ${formattedExpirationDate}`, budgetInfoXInBanner, budgetInfoYInBanner, { width: 210, align: 'right' });
  }
  doc.restore(); // After banner content

  // --- Content Below Banner ---
  const infoStartYBelowBanner = headerHeight + 15;

  // Company Information (Zurcher - left, below banner)
  const companyInfoX = pageMargin;
  doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold').text("Zurcher Construction", companyInfoX, infoStartYBelowBanner);
  doc.font('Helvetica').fontSize(9);
  doc.text("Septic Tank Division - CFC1433240", companyInfoX, doc.y);
  doc.text("zurcherseptic@gmail.com", companyInfoX, doc.y);
  doc.text("+1 (407) 419-4495", companyInfoX, doc.y);
  let maxYLeft = doc.y;

  // Customer Information (right, below banner)
  const customerInfoX = doc.page.width - pageMargin - 220; // Align with budget info in banner
  doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold').text('Client:', customerInfoX, infoStartYBelowBanner, {width: 210, align: 'left'});
  doc.font('Helvetica').fontSize(9);
  doc.text(`Name: ${applicantName || 'N/A'}`, customerInfoX, doc.y, {width: 210, align: 'left'});
  doc.text(`Property Address: ${propertyAddress || 'N/A'}`, customerInfoX, doc.y, {width: 210, align: 'left'});
  if (Permit) {
    doc.text(`Permit #: ${Permit.permitNumber || 'N/A'}`, customerInfoX, doc.y, {width: 210, align: 'left'});
  }
  let maxYRight = doc.y;

  doc.y = Math.max(maxYLeft, maxYRight); // Ensure y is below the taller of the two columns

  // Separator line
  doc.moveDown(2);
  const lineY = doc.y;
  doc.moveTo(pageMargin, lineY).lineTo(doc.page.width - pageMargin, lineY).strokeColor(lightGrayColor).stroke();
  doc.moveDown(1);

 // --- NEW: DYNAMIC INTRODUCTORY TEXT ---
  let systemType = "Septic Tank System"; // Default
  let systemBrand = "INFILTRATOR"; // Default
  let sandLoads = 4; // Default
  let systemCapacity = " gallons per day (GPD)"; // Default
  let drainfieldSize = "500 sqft"; // Default

  const systemItem = lineItems.find(item => item.category && item.category.toUpperCase().includes("SYSTEM"));
  if (systemItem) {
    systemType = systemItem.name || systemType;
    systemBrand = systemItem.brand || systemBrand;
  }
  const sandItem = lineItems.find(item => item.name && item.name.toLowerCase().includes("sand") && item.quantity);
  if (sandItem) {
    sandLoads = parseFloat(sandItem.quantity) || sandLoads;
  }
  // You might need to adjust how systemCapacity and drainfieldSize are found if they are in lineItems

doc.fontSize(10).font('Helvetica-Bold').text('The Following Proposal Includes:', pageMargin, doc.y, { underline: true, align: 'center' });
  doc.moveDown(1);
  doc.font('Helvetica').fontSize(9);
  // Explicitly set x to pageMargin, y to undefined (current doc.y)
  doc.text(`This proposal outlines the installation of a sewage system.`, pageMargin, undefined, { align: 'justify', width: contentWidth });
  doc.moveDown(0.5);
  doc.text(`The cost covers both labor and Maintenance service twice a year, for two years for the tank.`, pageMargin, undefined, { align: 'justify', width: contentWidth });
  doc.moveDown(0.5);
  doc.text(`The initial inspection will be carried out by a private provider as part of the agreed price. Once the installation stages have been completed, including lawn seeding, gutter installation, and well installation, we will be ready for the final inspection.`, pageMargin, undefined, { align: 'justify', width: contentWidth });
  doc.moveDown(0.5);
  doc.text(`In case you prefer a final inspection carried out by a private provider, an additional charge of $200 will apply. If you prefer to avoid this charge, you can notify the Health Department and request the final inspection to be conducted by the department.`, pageMargin, undefined, { align: 'justify', width: contentWidth });
  doc.moveDown(1);

  // --- NEW: ADDITIONAL COSTS SECTION ---
  doc.font('Helvetica-Bold').fontSize(10).text('Pumping Station and Additional Costs:', pageMargin, undefined, { underline: true, width: contentWidth, align: 'left' });
  doc.font('Helvetica').fontSize(9);
  doc.moveDown(0.5);
  doc.text("If gravity flow isn't achievable and a pumping station is needed for system installation, a pumping station, pump, and audiovisual alarm will be installed for a cost of $2,750. This cost does not cover lawn installation or any required electrical work to power the pumping station, if needed.", pageMargin, undefined, { align: 'justify', width: contentWidth });
  doc.moveDown(1);

  doc.font('Helvetica-Bold').fontSize(10).text('Price Changes and Notification:', pageMargin, undefined, { underline: true, width: contentWidth, align: 'left' });
  doc.font('Helvetica').fontSize(9);
  doc.moveDown(0.5);
  doc.text("Due to price volatility and material availability, prices are subject to change. In the event of a price adjustment, a written notification will be sent before commencing any new work with the updated price.", pageMargin, undefined, { align: 'justify', width: contentWidth });
  doc.moveDown(1);

  doc.font('Helvetica-Bold').fontSize(10).text('Maintenance and Repairs:', pageMargin, undefined, { underline: true, width: contentWidth, align: 'left' });
  doc.font('Helvetica').fontSize(9);
  doc.moveDown(0.5);
  doc.text("While maintenance will be conducted, repair of tank parts is not included and must be managed directly with the manufacturer.", pageMargin, undefined, { align: 'justify', width: contentWidth });
  doc.moveDown(1);

  doc.font('Helvetica-Bold').fontSize(10).text('Deep Excavation and Additional Charges:', pageMargin, undefined, { underline: true, width: contentWidth, align: 'left' });
  doc.font('Helvetica').fontSize(9);
  doc.moveDown(0.5);
  doc.text("Please note that if deep excavation is required, more sand than included in this estimate may be needed. Additional charges will apply if a jackhammer is needed due to the presence of rocks or other hard material, as indicated below:", pageMargin, undefined, { align: 'justify', width: contentWidth });
  // For lists, the x,y are the starting point of the list block.
  doc.list([
    "$350 for the first hour.",
    "$250 for the second hour.",
    "$200 for each additional hour (with a minimum of 2 hours)."
  ], pageMargin, undefined, { indent: 20, bulletRadius: 1.5, width: contentWidth - 20 });
  doc.moveDown(1);

  doc.font('Helvetica-Bold').fontSize(10).text('Extra Sand and Other Materials Charges:', pageMargin, undefined, { underline: true, width: contentWidth, align: 'left' });
  doc.font('Helvetica').fontSize(9);
  doc.moveDown(0.5);
  doc.text("Any extra sand loads will be billed immediately after system installation, starting at $370.00 per load. Additional billing will start from $290 if soil fill is required to cover the system. Additional charges will apply for transports:", pageMargin, undefined, { align: 'justify', width: contentWidth });
  doc.list([
    "$160 for fill material.",
    "$220 for rocks."
  ], pageMargin, undefined, { indent: 20, bulletRadius: 1.5, width: contentWidth - 20 });
  doc.moveDown(1);

  // --- NEW: PAYMENT SCHEDULE SECTION ---
  const firstPaymentAmount = parseFloat(initialPayment);
  const totalAmount = parseFloat(totalPrice);
  const secondPaymentAmount = totalAmount - firstPaymentAmount;

  doc.font('Helvetica-Bold').fontSize(10).text('PAYMENT SCHEDULE', pageMargin, undefined, { underline: true, align: 'left', width: contentWidth });
  doc.moveDown(1);

  doc.font('Helvetica-Bold').fontSize(10).text('1ST PAYMENT', pageMargin, undefined, {width: contentWidth, align: 'left'});
  doc.font('Helvetica').fontSize(9);
  doc.text(`The first money transfer will be ${initialPaymentPercentage || 60}% of the total agreed amount. The payment must be made at the time of signing the contract.`, pageMargin, undefined, { continued: false, align: 'justify', width: contentWidth });
  doc.font('Helvetica-Bold').text(`Total: $${!isNaN(firstPaymentAmount) ? firstPaymentAmount.toFixed(2) : '0.00'}`, pageMargin, undefined, { underline: true, width: contentWidth, align: 'left' });
  doc.moveDown(1);

  doc.font('Helvetica-Bold').fontSize(10).text('2ND PAYMENT', pageMargin, undefined, {width: contentWidth, align: 'left'});
  doc.font('Helvetica').fontSize(9);
  doc.text(`The second money transfer will be ${100 - (initialPaymentPercentage || 60)}% of the total agreed amount. The payment must be made upon completion of the project.`, pageMargin, undefined, { continued: false, align: 'justify', width: contentWidth });
  doc.font('Helvetica-Bold').text(`Total: $${!isNaN(secondPaymentAmount) ? secondPaymentAmount.toFixed(2) : '0.00'}`, pageMargin, undefined, { underline: true, width: contentWidth, align: 'left' });
  doc.moveDown(1.5);




//   // The rest of the page content (Scope of Work, Items, Totals, Notes, Signature)
//   // Check if there's enough space for the table header, otherwise add a new page.
//   if (doc.y + 50 > doc.page.height - pageMargin - 130) { // 50 for table header, 130 for signature/footer
//     _addStandardPageFooter(doc);
//     doc.addPage();
//     _addPageHeader(doc, budgetData, "BUDGET PROPOSAL / CONTRACT (Cont.)", formattedDate, formattedExpirationDate);
//   }

//   doc.fontSize(12).font('Helvetica-Bold').text('Scope of Work / Budget Items', pageMargin, doc.y, { underline: true });
//   doc.moveDown(0.5);
//   const tableTop = doc.y;
// // ... rest of the _buildBudgetContractPage function (item table, totals, signature, etc.) remains the same
// // ...ensure the lineItems.forEach loop and totals section correctly use _addPageHeader for continuations.
//   const itemX = pageMargin;
//   const qtyX = pageMargin + contentWidth * 0.55;
//   const unitPriceX = pageMargin + contentWidth * 0.70;
//   const totalX = pageMargin + contentWidth * 0.85;
//   const tableHeaderRightEdge = doc.page.width - pageMargin;

//   doc.fontSize(10).font('Helvetica-Bold');
//   doc.rect(itemX, tableTop - 5, contentWidth, 20).fillOpacity(0.1).fillAndStroke(primaryColor, lightGrayColor);
//   doc.fillOpacity(1).fillColor(textColor);

//   doc.text('Item / Description', itemX + 5, tableTop, { width: qtyX - itemX - 10 });
//   doc.text('Qty', qtyX, tableTop, { width: unitPriceX - qtyX - 10, align: 'right' });
//   doc.text('Unit Price', unitPriceX, tableTop, { width: totalX - unitPriceX - 10, align: 'right' });
//   doc.text('Line Total', totalX, tableTop, { width: tableHeaderRightEdge - totalX - 5, align: 'right' });
//   doc.font('Helvetica').fillColor(textColor);
//   doc.y = tableTop + 15;
//   doc.moveDown(0.5);

//   lineItems.forEach((item) => {
//     const yStartRow = doc.y;
//     let estimatedRowHeight = 20; 
//     const descText = ((item.category ? item.category.toUpperCase() + ' - ' : '') + (item.name || 'N/A').toUpperCase() + (item.brand ? ' - ' + item.brand.toUpperCase() : ''));
//     estimatedRowHeight = Math.max(estimatedRowHeight, doc.heightOfString(descText, { width: qtyX - itemX - 15, fontSize: 9 }));
//     const lowerCaseNotes = item.notes ? item.notes.toLowerCase() : "";
//     const shouldShowNotes = item.notes && lowerCaseNotes !== 'item personalizado';
//     if (shouldShowNotes) {
//         estimatedRowHeight += doc.heightOfString(item.notes, {width: qtyX - itemX - 20, fontSize: 8}) + 5;
//     }

//     if (yStartRow + estimatedRowHeight > doc.page.height - pageMargin - 130) { 
//         _addStandardPageFooter(doc);
//         doc.addPage();
//         _addPageHeader(doc, budgetData, "BUDGET PROPOSAL / CONTRACT (Cont.)", formattedDate, formattedExpirationDate);
//         doc.fontSize(10).font('Helvetica-Bold');
//         const newTableTop = doc.y;
//         doc.rect(itemX, newTableTop - 5, contentWidth, 20).fillOpacity(0.1).fillAndStroke(primaryColor, lightGrayColor);
//         doc.fillOpacity(1).fillColor(textColor);
//         doc.text('Item / Description', itemX + 5, newTableTop, { width: qtyX - itemX - 10 });
//         doc.text('Qty', qtyX, newTableTop, { width: unitPriceX - qtyX - 10, align: 'right' });
//         doc.text('Unit Price', unitPriceX, newTableTop, { width: totalX - unitPriceX - 10, align: 'right' });
//         doc.text('Line Total', totalX, newTableTop, { width: tableHeaderRightEdge - totalX - 5, align: 'right' });
//         doc.font('Helvetica').fillColor(textColor);
//         doc.y = newTableTop + 15;
//         doc.moveDown(0.5);
//     }
    
//     const yPos = doc.y;
//     const quantityNum = parseFloat(item.quantity);
//     const unitPriceNum = parseFloat(item.unitPrice);
//     const lineTotalNum = parseFloat(item.lineTotal);

//     let descriptionParts = [];
//     if (item.category) descriptionParts.push(item.category.toUpperCase());
//     descriptionParts.push((item.name || 'N/A').toUpperCase());
//     if (item.brand) descriptionParts.push(item.brand.toUpperCase());
//     const itemFullDescription = descriptionParts.join(' - ');

//     doc.fontSize(9).text(itemFullDescription, itemX + 5, yPos + 2, { width: qtyX - itemX - 15 });
//     let notesY = doc.y; 

//     if (shouldShowNotes) {
//       doc.fontSize(8).fillColor('grey').text(item.notes, itemX + 10, notesY, { width: qtyX - itemX - 20 }); 
//       doc.fillColor(textColor);
//       notesY = doc.y; 
//     }
    
//     doc.fontSize(9).text(!isNaN(quantityNum) ? quantityNum.toFixed(2) : '0.00', qtyX, yPos + 2, { width: unitPriceX - qtyX - 10, align: 'right' });
//     doc.text(`$${!isNaN(unitPriceNum) ? unitPriceNum.toFixed(2) : '0.00'}`, unitPriceX, yPos + 2, { width: totalX - unitPriceX - 10, align: 'right' });
//     doc.text(`$${!isNaN(lineTotalNum) ? lineTotalNum.toFixed(2) : '0.00'}`, totalX, yPos + 2, { width: tableHeaderRightEdge - totalX - 5, align: 'right' });
    
//     doc.y = Math.max(yPos + doc.heightOfString(itemFullDescription, {width: qtyX - itemX - 15, fontSize: 9}), notesY);
//     doc.moveDown(0.5);
//     doc.moveTo(itemX, doc.y).lineTo(tableHeaderRightEdge, doc.y).strokeColor(lightGrayColor).stroke();
//     doc.moveDown(0.5);
//   });

//   doc.moveDown(0.5);

//   const totalsLabelStartX = pageMargin + contentWidth * 0.55; 
//   const totalsValueStartX = pageMargin + contentWidth * 0.80;
//   const totalsRightEdge = doc.page.width - pageMargin;
//   const labelWidth = totalsValueStartX - totalsLabelStartX - 5;
//   const valueWidth = totalsRightEdge - totalsValueStartX - 5;
//   doc.fontSize(10);

//   let currentYTotal = doc.y;
//   if (currentYTotal + 80 > doc.page.height - pageMargin - 130) {
//     _addStandardPageFooter(doc); doc.addPage();
//     _addPageHeader(doc, budgetData, "BUDGET PROPOSAL / CONTRACT (Cont.)", formattedDate, formattedExpirationDate);
//     currentYTotal = doc.y;
//   }

//   const subtotalNum = parseFloat(subtotalPrice);
//   doc.text(`Subtotal:`, totalsLabelStartX, currentYTotal, { width: labelWidth, align: 'right' });
//   doc.text(`$${!isNaN(subtotalNum) ? subtotalNum.toFixed(2) : '0.00'}`, totalsValueStartX, currentYTotal, { width: valueWidth, align: 'right' });
//   doc.moveDown(0.65);

//   const discountNum = parseFloat(discountAmount);
//   if (discountNum > 0) {
//     currentYTotal = doc.y;
//     doc.text(`Discount (${discountDescription || ''}):`, totalsLabelStartX, currentYTotal, { width: labelWidth, align: 'right' });
//     doc.text(`-$${discountNum.toFixed(2)}`, totalsValueStartX, currentYTotal, { width: valueWidth, align: 'right' });
//     doc.moveDown(0.65);
//   }

//   currentYTotal = doc.y;
//   const totalNum = parseFloat(totalPrice);
//   doc.font('Helvetica-Bold');
//   doc.text(`Total Contract Price:`, totalsLabelStartX, currentYTotal, { width: labelWidth, align: 'right' });
//   doc.text(`$${!isNaN(totalNum) ? totalNum.toFixed(2) : '0.00'}`, totalsValueStartX, currentYTotal, { width: valueWidth, align: 'right' });
//   doc.font('Helvetica');
//   doc.moveDown(0.65);

//   currentYTotal = doc.y;
//   // const initialPaymentNum = parseFloat(initialPayment); // Already defined for Payment Schedule
//   let paymentLabel = `Initial Payment (60%)`;
//   if (initialPaymentPercentage === 100) {
//     paymentLabel = `Payment in Full (100%)`;
//   } else {
//     const storedPercentage = parseFloat(initialPaymentPercentage);
//     if (!isNaN(storedPercentage) && storedPercentage !== 100) {
//         paymentLabel = `Initial Payment (${storedPercentage}%) Due Upon Acceptance:`;
//     } else if (isNaN(storedPercentage)){ 
//         paymentLabel = `Initial Payment (60%) Due Upon Acceptance:`;
//     }
//   }
//   doc.font('Helvetica-Bold');
//   doc.text(`${paymentLabel}`, totalsLabelStartX - 25, currentYTotal, { width: labelWidth + 25, align: 'right' });
//   doc.text(`$${!isNaN(firstPaymentAmount) ? firstPaymentAmount.toFixed(2) : '0.00'}`, totalsValueStartX, currentYTotal, { width: valueWidth, align: 'right' });
//   doc.font('Helvetica');
//   doc.moveDown(1.5);

//   if (generalNotes) {
//     if (doc.y + 60 > doc.page.height - pageMargin - 130) {
//         _addStandardPageFooter(doc); doc.addPage();
//         _addPageHeader(doc, budgetData, "BUDGET PROPOSAL / CONTRACT (Cont.)", formattedDate, formattedExpirationDate);
//     }
//     doc.fontSize(10).font('Helvetica-Bold').text('General Notes & Scope Clarifications:', pageMargin, doc.y, { underline: true });
//     doc.font('Helvetica').fontSize(9);
//     doc.moveDown(0.5);
//     doc.text(generalNotes, pageMargin, doc.y, { width: contentWidth, align: 'justify' });
//     doc.moveDown(1.5);
//   }
  
  _addClientSignatureSection(doc);
 
}

// --- PÁGINA 2: TÉRMINOS Y CONDICIONES ---
function _buildTermsAndConditionsPage(doc, budgetData, formattedDate, formattedExpirationDate) {
  _addPageHeader(doc, budgetData, "TERMS AND CONDITIONS", formattedDate, formattedExpirationDate);
  const contentWidth = doc.page.width - pageMargin * 2;

  doc.fontSize(12).font('Helvetica-Bold').text('Standard Terms and Conditions', pageMargin, doc.y, { underline: true, align: 'center' });
  doc.moveDown(1);

  // --- REPLACE WITH YOUR ACTUAL TERMS AND CONDITIONS TEXT ---
  const termsText = `
1.  Scope of Work: The scope of work is limited to the items explicitly listed in the Budget Proposal / Contract. Any additional work requested by the Client will be considered a Change Order and will be quoted and billed separately. Zurcher Construction reserves the right to refuse any additional work.

2.  Payment Terms:
    a.  An initial payment, as specified in the Budget Proposal, is due upon acceptance of this contract to schedule the work.
    b.  Final payment is due immediately upon completion of the work, unless otherwise agreed in writing.
    c.  Late payments may be subject to a late fee of 1.5% per month (18% annually) or the maximum rate permitted by law.
    d.  All materials remain the property of Zurcher Construction until payment is received in full.

3.  Changes and Change Orders: Any alterations or deviations from the agreed-upon scope of work will be executed only upon written agreement and will be subject to additional charges. Client will be notified of any such changes and associated costs before work proceeds.

4.  Site Conditions:
    a.  The Client is responsible for ensuring clear and safe access to the work site.
    b.  The proposal is based on visible conditions and information provided by the Client. Unforeseen conditions (e.g., hidden utilities, rock, unsuitable soil, underground obstructions) may result in additional charges and/or delays. Zurcher Construction will notify the Client promptly if such conditions are encountered.
    c.  Client is responsible for identifying and marking all private underground utilities. Zurcher Construction is not responsible for damage to unmarked private utilities.

5.  Permits and Inspections: Zurcher Construction will obtain necessary permits as outlined in the proposal. Client agrees to cooperate with all required inspections. Any fees or delays caused by failed inspections due to Client-provided information or site conditions not caused by Zurcher Construction may result in additional charges.

6.  Warranty: Zurcher Construction warrants its workmanship for a period of one (1) year from the date of completion. This warranty covers defects in workmanship only and does not cover materials (which are typically covered by manufacturer warranties), abuse, neglect, acts of God, or normal wear and tear. Warranty is void if outstanding payments exist.

7.  Client Responsibilities:
    a.  Provide accurate information regarding the property and project requirements.
    b.  Ensure the work site is accessible and free of obstructions.
    c.  Make timely payments as per the agreed schedule.

8.  Cancellation: If the Client cancels this contract after acceptance, the Client may be liable for costs incurred by Zurcher Construction up to the date of cancellation, plus a cancellation fee.

9.  Limitation of Liability: Zurcher Construction's liability for any claim arising out of this agreement shall not exceed the total contract price. Zurcher Construction shall not be liable for any indirect, incidental, or consequential damages.

10. Dispute Resolution: Any disputes arising from this agreement shall first be attempted to be resolved through direct negotiation. If negotiation fails, parties agree to mediation before pursuing any other legal remedies.

11. Entire Agreement: This document, along with the Budget Proposal / Contract, constitutes the entire agreement between Zurcher Construction and the Client and supersedes all prior discussions, negotiations, and agreements.

12. Governing Law: This agreement shall be governed by the laws of the State of Florida.

Acceptance of the Budget Proposal / Contract signifies understanding and agreement to these Terms and Conditions.
  `; // --- END OF EXAMPLE TERMS TEXT ---

  doc.font('Helvetica').fontSize(8.5); // Slightly smaller for dense text
  const paragraphs = termsText.split('\n\n'); 

  paragraphs.forEach(paragraph => {
    const paragraphHeight = doc.heightOfString(paragraph, { width: contentWidth, align: 'justify' });
    if (doc.y + paragraphHeight > doc.page.height - pageMargin - 130) { // 130 for signature and footer
        // _addStandardPageFooter(doc);
        doc.addPage();
        _addPageHeader(doc, budgetData, "TERMS AND CONDITIONS (Cont.)", formattedDate, formattedExpirationDate);
        doc.fontSize(12).font('Helvetica-Bold').text('Standard Terms and Conditions (Continued)', pageMargin, doc.y, { underline: true, align: 'center' });
        doc.moveDown(1);
        doc.font('Helvetica').fontSize(8.5);
    }
    doc.text(paragraph.trim(), pageMargin, doc.y, {
      width: contentWidth,
      align: 'justify'
    });
    doc.moveDown(0.65);
  });
  
  _addClientSignatureSection(doc);
  // _addStandardPageFooter(doc);
}

// --- PÁGINA 3: INVOICE ---
async function _buildInvoicePage(doc, budgetData, formattedDate, formattedExpirationDate, clientEmailFromPermit) {
  _addPageHeader(doc, budgetData, "INVOICE", formattedDate, formattedExpirationDate);
  const contentWidth = doc.page.width - pageMargin * 2;

  const { idBudget, applicantName, propertyAddress, Permit, lineItems = [], subtotalPrice, discountDescription, discountAmount, totalPrice, initialPaymentPercentage, initialPayment } = budgetData;

  doc.fontSize(11).font('Helvetica-Bold').text('Customer Information:', pageMargin, doc.y);
  doc.font('Helvetica').fontSize(10);
  doc.text(`Name: ${applicantName || 'N/A'}`);
  doc.text(`Property Address: ${propertyAddress || 'N/A'}`);
  if (Permit) {
    doc.text(`Permit #: ${Permit.permitNumber || 'N/A'}`);
  }
  doc.moveDown(1.5);

  doc.fontSize(12).font('Helvetica-Bold').text('Invoice Items', { underline: true });
  doc.moveDown(0.5);
  const tableTop = doc.y;
  const itemX = pageMargin;
  const qtyX = pageMargin + contentWidth * 0.55;
  const unitPriceX = pageMargin + contentWidth * 0.70;
  const totalX = pageMargin + contentWidth * 0.85;
  const tableHeaderRightEdge = doc.page.width - pageMargin;

  doc.fontSize(10).font('Helvetica-Bold');
  doc.rect(itemX, tableTop - 5, contentWidth, 20).fillOpacity(0.1).fillAndStroke(primaryColor, lightGrayColor);
  doc.fillOpacity(1).fillColor(textColor);
  doc.text('Item / Description', itemX + 5, tableTop, { width: qtyX - itemX - 10 });
  doc.text('Qty', qtyX, tableTop, { width: unitPriceX - qtyX - 10, align: 'right' });
  doc.text('Unit Price', unitPriceX, tableTop, { width: totalX - unitPriceX - 10, align: 'right' });
  doc.text('Line Total', totalX, tableTop, { width: tableHeaderRightEdge - totalX - 5, align: 'right' });
  doc.font('Helvetica').fillColor(textColor);
  doc.y = tableTop + 15;
  doc.moveDown(0.5);

 lineItems.forEach((item) => {
    const yStartRow = doc.y;
    let estimatedRowHeight = 20; 
    const descText = ((item.category ? item.category.toUpperCase() + ' - ' : '') + (item.name || 'N/A').toUpperCase() + (item.brand ? ' - ' + item.brand.toUpperCase() : ''));
    estimatedRowHeight = Math.max(estimatedRowHeight, doc.heightOfString(descText, { width: qtyX - itemX - 15, fontSize: 9 }));
    const lowerCaseNotes = item.notes ? item.notes.toLowerCase() : "";
    const shouldShowNotes = item.notes && lowerCaseNotes !== 'item personalizado';
    if (shouldShowNotes) {
        estimatedRowHeight += doc.heightOfString(item.notes, {width: qtyX - itemX - 20, fontSize: 8}) + 5;
    }

    if (yStartRow + estimatedRowHeight > doc.page.height - pageMargin - 90) { // 90 for payment info and footer
        _addStandardPageFooter(doc);
        doc.addPage();
        _addPageHeader(doc, budgetData, "INVOICE (Cont.)", formattedDate, formattedExpirationDate);
        doc.fontSize(10).font('Helvetica-Bold');
        const newTableTop = doc.y;
        doc.rect(itemX, newTableTop - 5, contentWidth, 20).fillOpacity(0.1).fillAndStroke(primaryColor, lightGrayColor);
        doc.fillOpacity(1).fillColor(textColor);
        doc.text('Item / Description', itemX + 5, newTableTop, { width: qtyX - itemX - 10 });
        doc.text('Qty', qtyX, newTableTop, { width: unitPriceX - qtyX - 10, align: 'right' });
        doc.text('Unit Price', unitPriceX, newTableTop, { width: totalX - unitPriceX - 10, align: 'right' });
        doc.text('Line Total', totalX, newTableTop, { width: tableHeaderRightEdge - totalX - 5, align: 'right' });
        doc.font('Helvetica').fillColor(textColor);
        doc.y = newTableTop + 15;
        doc.moveDown(0.5);
    }
    
    const yPos = doc.y;
    const quantityNum = parseFloat(item.quantity);
    const unitPriceNum = parseFloat(item.unitPrice);
    const lineTotalNum = parseFloat(item.lineTotal);

    let descriptionParts = [];
    if (item.category) descriptionParts.push(item.category.toUpperCase());
    descriptionParts.push((item.name || 'N/A').toUpperCase());
    if (item.brand) descriptionParts.push(item.brand.toUpperCase());
    const itemFullDescription = descriptionParts.join(' - ');

    doc.fontSize(9).text(itemFullDescription, itemX + 5, yPos + 2, { width: qtyX - itemX - 15 });
    let notesY = doc.y;

    if (shouldShowNotes) {
      doc.fontSize(8).fillColor('grey').text(item.notes, itemX + 10, notesY, { width: qtyX - itemX - 20 });
      doc.fillColor(textColor);
      notesY = doc.y;
    }
    
    doc.fontSize(9).text(!isNaN(quantityNum) ? quantityNum.toFixed(2) : '0.00', qtyX, yPos + 2, { width: unitPriceX - qtyX - 10, align: 'right' });
    doc.text(`$${!isNaN(unitPriceNum) ? unitPriceNum.toFixed(2) : '0.00'}`, unitPriceX, yPos + 2, { width: totalX - unitPriceX - 10, align: 'right' });
    doc.text(`$${!isNaN(lineTotalNum) ? lineTotalNum.toFixed(2) : '0.00'}`, totalX, yPos + 2, { width: tableHeaderRightEdge - totalX - 5, align: 'right' });
    
    doc.y = Math.max(yPos + doc.heightOfString(itemFullDescription, {width: qtyX - itemX - 15, fontSize: 9}), notesY);
    doc.moveDown(0.5);
    doc.moveTo(itemX, doc.y).lineTo(tableHeaderRightEdge, doc.y).strokeColor(lightGrayColor).stroke();
    doc.moveDown(0.5);
  });
  doc.moveDown(0.5);

  const totalsLabelStartX = pageMargin + contentWidth * 0.55;
  const totalsValueStartX = pageMargin + contentWidth * 0.80;
  const totalsRightEdge = doc.page.width - pageMargin;
  const labelWidth = totalsValueStartX - totalsLabelStartX - 5;
  const valueWidth = totalsRightEdge - totalsValueStartX - 5;
  doc.fontSize(10);

  let currentYTotalInv = doc.y;
   if (currentYTotalInv + 150 > doc.page.height - pageMargin - 90) { 
    // _addStandardPageFooter(doc); doc.addPage();
    _addPageHeader(doc, budgetData, "INVOICE (Cont.)", formattedDate, formattedExpirationDate);
    currentYTotalInv = doc.y;
  }

  const subtotalNum = parseFloat(subtotalPrice);
  doc.text(`Subtotal:`, totalsLabelStartX, currentYTotalInv, { width: labelWidth, align: 'right' });
  doc.text(`$${!isNaN(subtotalNum) ? subtotalNum.toFixed(2) : '0.00'}`, totalsValueStartX, currentYTotalInv, { width: valueWidth, align: 'right' });
  doc.moveDown(0.65);

  const discountNum = parseFloat(discountAmount);
  if (discountNum > 0) {
    currentYTotalInv = doc.y;
    doc.text(`Discount (${discountDescription || ''}):`, totalsLabelStartX, currentYTotalInv, { width: labelWidth, align: 'right' });
    doc.text(`-$${discountNum.toFixed(2)}`, totalsValueStartX, currentYTotalInv, { width: valueWidth, align: 'right' });
    doc.moveDown(0.65);
  }

  currentYTotalInv = doc.y;
  const totalNum = parseFloat(totalPrice);
  doc.font('Helvetica-Bold');
  doc.text(`Invoice Total:`, totalsLabelStartX, currentYTotalInv, { width: labelWidth, align: 'right' });
  doc.text(`$${!isNaN(totalNum) ? totalNum.toFixed(2) : '0.00'}`, totalsValueStartX, currentYTotalInv, { width: valueWidth, align: 'right' });
  doc.font('Helvetica');
  doc.moveDown(0.65);

  currentYTotalInv = doc.y;
  const initialPaymentNum = parseFloat(initialPayment);
  let paymentDueLabel = `Initial Payment Due:`; 
  if (initialPaymentPercentage === 100) {
    paymentDueLabel = `Total Amount Due:`;
  } else {
    const storedPercentage = parseFloat(initialPaymentPercentage);
    if (!isNaN(storedPercentage) && storedPercentage !== 100) {
        paymentDueLabel = `Initial Payment (${storedPercentage}%) Due:`;
    } else if (isNaN(storedPercentage)) {
        paymentDueLabel = `Initial Payment (60%) Due:`;
    }
  }
  doc.font('Helvetica-Bold');
  doc.text(`${paymentDueLabel}`, totalsLabelStartX - 25, currentYTotalInv, { width: labelWidth + 25, align: 'right' });
  doc.text(`$${!isNaN(initialPaymentNum) ? initialPaymentNum.toFixed(2) : '0.00'}`, totalsValueStartX, currentYTotalInv, { width: valueWidth, align: 'right' });
  doc.font('Helvetica');
  doc.moveDown(2);

  if (doc.y + 70 > doc.page.height - pageMargin - 90) {
    // _addStandardPageFooter(doc); doc.addPage();
    _addPageHeader(doc, budgetData, "INVOICE (Cont.)", formattedDate, formattedExpirationDate);
  }
  doc.fontSize(10).font('Helvetica-Bold').text('Payment Information:', pageMargin, doc.y, { underline: true });
  doc.font('Helvetica').fontSize(9);
  doc.moveDown(0.5);
  doc.text("Bank: Bank of America", pageMargin, doc.y);
  doc.text("Routing #: 063100277", pageMargin, doc.y);
  doc.text("Account #: 898138399808", pageMargin, doc.y);
  doc.text("Zelle Email: zurcherconstruction.fl@gmail.com", pageMargin, doc.y);
  doc.moveDown(1.5);

  let paymentLinkUrl = null;
  const paymentAmountForStripe = parseFloat(initialPayment); 

  if (paymentAmountForStripe > 0) {
    try {
      const successUrl = process.env.STRIPE_SUCCESS_URL || 'https://example.com/success';
      const cancelUrl = process.env.STRIPE_CANCEL_URL || 'https://example.com/cancel';
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Payment for Invoice - Budget #${idBudget} - ${applicantName}`,
              description: `Payment related to work at ${propertyAddress}`,
            },
            unit_amount: Math.round(paymentAmountForStripe * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        ...(clientEmailFromPermit && { customer_email: clientEmailFromPermit }),
        metadata: { internal_budget_id: idBudget, payment_type: 'invoice_payment' }
      });
      paymentLinkUrl = session.url;
    } catch (stripeError) {
      console.error("Error al crear la sesión de Stripe Checkout para la factura:", stripeError);
    }
  }

  if (paymentLinkUrl) {
    if (doc.y + 60 > doc.page.height - pageMargin - 90) { 
        // _addStandardPageFooter(doc); doc.addPage();
        _addPageHeader(doc, budgetData, "INVOICE (Cont.)", formattedDate, formattedExpirationDate);
    }
    doc.moveDown(1);
    const buttonWidth = 220; // Wider button
    const buttonHeight = 35;
    const buttonX = pageMargin + (contentWidth - buttonWidth) / 2;
    const buttonY = doc.y;
    const buttonText = initialPaymentPercentage === 100 ? 'Click Here to Pay Total Amount Online' : 'Click Here to Pay Initial Amount Online';

    doc.save();
    doc.roundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 5).fillColor(primaryColor).fill();
    doc.fillColor(whiteColor).fontSize(10).font('Helvetica-Bold'); // Smaller font for longer text
    doc.text(buttonText, buttonX, buttonY + (buttonHeight / 2) - (doc.currentLineHeight({fontSize: 10}) / 2.0), { // Adjusted vertical centering
        width: buttonWidth,
        align: 'center'
    });
    doc.restore();
    doc.link(buttonX, buttonY, buttonWidth, buttonHeight, paymentLinkUrl);
    doc.moveDown(3);
  }
  _addStandardPageFooter(doc);
}


async function generateAndSaveBudgetPDF(budgetData) {
  return new Promise(async(resolve, reject) => {
    try {
      const { idBudget, date, expirationDate, Permit } = budgetData;
      const clientEmailFromPermit = Permit?.applicantEmail;
      const formattedDate = formatDateDDMMYYYY(date);
      const formattedExpirationDate = formatDateDDMMYYYY(expirationDate);

      const doc = new PDFDocument({ autoFirstPage: false, margin: pageMargin, size: 'A4' });
      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const pdfPath = path.join(uploadsDir, `budget_package_${idBudget}.pdf`);
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      doc.addPage();
      _buildBudgetContractPage(doc, budgetData, formattedDate, formattedExpirationDate);

      doc.addPage();
      _buildTermsAndConditionsPage(doc, budgetData, formattedDate, formattedExpirationDate);

      doc.addPage();
      await _buildInvoicePage(doc, budgetData, formattedDate, formattedExpirationDate, clientEmailFromPermit);

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


async function generateAndSaveBudgetPDF(budgetData) {
  return new Promise(async(resolve, reject) => {
    try {
      const { idBudget, date, expirationDate, Permit } = budgetData;
      const clientEmailFromPermit = Permit?.applicantEmail;
      const formattedDate = formatDateDDMMYYYY(date);
      const formattedExpirationDate = formatDateDDMMYYYY(expirationDate);

      const doc = new PDFDocument({ autoFirstPage: false, margin: pageMargin, size: 'A4' });
      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const pdfPath = path.join(uploadsDir, `budget_package_${idBudget}.pdf`);
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      doc.addPage();
      _buildBudgetContractPage(doc, budgetData, formattedDate, formattedExpirationDate);

      doc.addPage();
      _buildTermsAndConditionsPage(doc, budgetData, formattedDate, formattedExpirationDate);

      doc.addPage();
      await _buildInvoicePage(doc, budgetData, formattedDate, formattedExpirationDate, clientEmailFromPermit);

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
  return new Promise(async(resolve, reject) => {
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
      const uploadsDir = path.join(__dirname, '../uploads'); // Asegúrate que esta ruta es correcta
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const pdfPath = path.join(uploadsDir, `final_invoice_${id}.pdf`); // Nombre de archivo diferente
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
      doc.fontSize(9).font('Helvetica-Bold').text(currentCompany.name, pageMargin, currentY);
      currentY += doc.currentLineHeight();
      doc.font('Helvetica').text(currentCompany.addressLine1, pageMargin, currentY);
      currentY += doc.currentLineHeight();
      doc.text(currentCompany.cityStateZip, pageMargin, currentY);
      currentY += doc.currentLineHeight();
      doc.text(currentCompany.phone, pageMargin, currentY);
      const leftColumnEndY = currentY;

      currentY = headerHeight + 20; 
      const rightInfoX = doc.page.width - pageMargin - 200;
      doc.fontSize(10).font('Helvetica-Bold').text(`NO: ${coNumber}`, rightInfoX, currentY, { width: 200, align: 'right' });
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
      doc.fontSize(11).font('Helvetica-Bold').text(propertyAddress.toUpperCase(), pageMargin, currentY, {align: 'left'});
      currentY += doc.currentLineHeight() + 40;
      doc.y = currentY;
       

      // === TABLA DE ÍTEMS DEL CHANGE ORDER ===
      const tableTop = currentY;
      const colQtyX = pageMargin;
      const colDescX = pageMargin + 60;
      const colUnitPriceX = pageMargin + contentWidth - 180;
      const colTotalX = pageMargin + contentWidth - 90;

      doc.fontSize(10).font('Helvetica-Bold');
      doc.rect(pageMargin, tableTop - 5, contentWidth, 20).fill(primaryColor);
      doc.fillColor(whiteColor);
      doc.text('Qty', colQtyX + 5, tableTop, { width: colDescX - colQtyX - 10 });
      doc.text('Item Description', colDescX + 5, tableTop);
      doc.text('Unit Price', colUnitPriceX, tableTop, { width: colTotalX - colUnitPriceX - 10, align: 'right' });
      doc.text('Total', colTotalX, tableTop, { width: contentWidth - (colTotalX - pageMargin), align: 'right' });
      doc.fillColor(textColor); 
      currentY = tableTop + 25;
      doc.y = currentY;

      doc.fontSize(10).font('Helvetica');
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

module.exports = { generateAndSaveBudgetPDF, generateAndSaveFinalInvoicePDF,generateAndSaveChangeOrderPDF };