const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { format, parseISO } = require('date-fns'); // Para formatear fechas
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// Helper para formatear fechas o devolver N/A
const formatDateDDMMYYYY = (dateInput) => {
  if (!dateInput) return 'N/A';
  try {
    let dateObj;
    if (typeof dateInput === 'string') {
      dateObj = parseISO(dateInput); // Si es string, intenta parsearlo
    } else if (dateInput instanceof Date) {
      dateObj = dateInput; // Si ya es un objeto Date, úsalo directamente
    } else {
      return 'Invalid Date Input'; // Si no es ni string ni Date
    }
    return format(dateObj, 'MM-dd-yyyy');
  } catch (e) {
    console.error("Error formateando fecha:", dateInput, e);
    return 'Invalid Date';
  }
};

// Función para generar y guardar el PDF del presupuesto
async function generateAndSaveBudgetPDF(budgetData) {
  return new Promise(async(resolve, reject) => {
    try {
      // --- 1. Preparar Datos ---
      const {
        idBudget, date, expirationDate, applicantName, propertyAddress,
        Permit, lineItems = [], subtotalPrice, discountDescription, discountAmount,
        totalPrice, initialPaymentPercentage, initialPayment, generalNotes
      } = budgetData;

      const clientEmailFromPermit = Permit?.applicantEmail;

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
        const y = doc.y; // Línea base para este ítem
        const quantityNum = parseFloat(item.quantity);
        const unitPriceNum = parseFloat(item.unitPrice);
        const lineTotalNum = parseFloat(item.lineTotal);

        // Construir la descripción del ítem
        let descriptionParts = [];

        if (item.category) {
            descriptionParts.push(item.category.toUpperCase());
        }

        // El nombre siempre se añade
        descriptionParts.push((item.name || 'N/A').toUpperCase());

        if (item.brand) {
            descriptionParts.push(item.brand.toUpperCase());
        }
        
        const itemFullDescription = descriptionParts.join(' - ');
       

        // Imprimir descripción principal del ítem
        doc.fontSize(9).text(itemFullDescription, itemX, y, { width: qtyX - itemX - 10 });

        // La siguiente línea que imprimía item.name otra vez se elimina para evitar superposición.
        // doc.fontSize(9).text(item.name || 'N/A', itemX, y, { width: qtyX - itemX - 10 }); // ESTA LÍNEA SE ELIMINA

        // Imprimir notas si existen y no son "Item Personalizado"
        const lowerCaseNotes = item.notes ? item.notes.toLowerCase() : "";
        const shouldShowNotes = item.notes && lowerCaseNotes !== 'item personalizado';

        if (shouldShowNotes) {
          // doc.y aquí ya está después de que itemFullDescription se haya impreso (pdfkit maneja el salto de línea)
          doc.fontSize(8).fillColor('grey').text(item.notes, itemX + 5, doc.y, { width: qtyX - itemX - 15 });
          doc.fillColor('black'); // Volver al color de texto por defecto
        }

        // Imprimir columnas numéricas alineadas con la 'y' inicial del ítem
        doc.fontSize(9).text(!isNaN(quantityNum) ? quantityNum.toFixed(2) : '0.00', qtyX, y, { width: unitPriceX - qtyX - 10, align: 'right' });
        doc.text(`$${!isNaN(unitPriceNum) ? unitPriceNum.toFixed(2) : '0.00'}`, unitPriceX, y, { width: totalX - unitPriceX - 10, align: 'right' });
        doc.text(`$${!isNaN(lineTotalNum) ? lineTotalNum.toFixed(2) : '0.00'}`, totalX, y, { width: tableHeaderRightEdge - totalX, align: 'right' });
        
        // Ajustar el espaciado vertical para el siguiente ítem.
        // doc.y se habrá actualizado a la posición después del texto más alto de la fila actual.
        doc.moveDown(shouldShowNotes ? 1.5 : 1); // Espaciado un poco mayor si hubo notas
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

     // --- DEBUG: Verificar el valor y tipo ---
     console.log('DEBUG PDF - initialPaymentPercentage:', initialPaymentPercentage, typeof initialPaymentPercentage);
     // --- FIN DEBUG ---

     let paymentLabel = `Initial Payment (60%)`;
     // La comparación === requiere que sea el NÚMERO 100
     if (initialPaymentPercentage === 100) {
       paymentLabel = `Total Payment (100%)`; // Cambiar etiqueta para 100%
     } else {
       const storedPercentage = parseFloat(initialPaymentPercentage);
       if (!isNaN(storedPercentage) && storedPercentage !== 100) {
           paymentLabel = `Initial Payment (${storedPercentage}%)`;
       }
       // Si no, se queda con el default "Initial Payment (60%)"
     }
     doc.text(`${paymentLabel}:`, totalsLabelStartX, currentY, { width: labelWidth, align: 'right' });
     doc.text(`$${!isNaN(initialPaymentNum) ? initialPaymentNum.toFixed(2) : '0.00'}`, totalsValueStartX, currentY, { width: valueWidth, align: 'right' });
     doc.moveDown(2); // Espacio después de los totales
// ... (resto del código) ...

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
      doc.fontSize(10).font('Helvetica-Bold').text('Terms and Conditions:', pageMargin, doc.y, { underline: true });
      doc.font('Helvetica').fontSize(9);
      doc.moveDown(0.5);
      const termsUrl = 'https://docs.google.com/document/d/1Q5gzNSUz5UAWaVbA_v523W-QrMu66fZl8PSdB3RkXmM/edit?usp=sharing'; // <-- REEMPLAZA CON TU URL REAL
      doc.fillColor('blue') // Color azul para que parezca un enlace
         .text('Click here to view the full Terms and Conditions', pageMargin, doc.y, {
           link: termsUrl,
           underline: true // Subrayado para indicar enlace
         });
      doc.fillColor('black'); // Volver al color negro por defecto
      doc.moveDown(1.5);

       // *** NUEVO: SECCIÓN ENLACE DE PAGO STRIPE PARA PAGO INICIAL ***
       let initialPaymentLinkUrl = null;
       const initialPaymentNumForStripe = parseFloat(initialPayment); // Usar el valor ya calculado
 // *** DEBUG: Verificar valor del pago inicial ***
 console.log(`DEBUG PDF Budget - initialPayment value: ${initialPayment}, parsed as: ${initialPaymentNumForStripe}`);
 // *** FIN DEBUG ***

       // Solo generar enlace si hay un pago inicial > 0
       if (initialPaymentNumForStripe > 0) {
         try {
           // URLs de redirección (pueden ser las mismas o diferentes a las de la factura final)
           const successUrl = 'https://www.google.com'; // O tu página de Facebook, etc.
           const cancelUrl = 'https://www.google.com';  // Misma URL para ambos casos
 
           // Crear sesión de Checkout en Stripe para el pago inicial
           const session = await stripe.checkout.sessions.create({
             payment_method_types: ['card'],
             line_items: [
               {
                 price_data: {
                   currency: 'usd',
                   product_data: {
                     name: `Initial Payment - Budget #${idBudget} - ${applicantName}`,
                     description: `Initial payment for work at ${propertyAddress}`,
                   },
                   // Monto del pago inicial en centavos
                   unit_amount: Math.round(initialPaymentNumForStripe * 100),
                 },
                 quantity: 1,
               },
             ],
             mode: 'payment',
             success_url: successUrl,
             cancel_url: cancelUrl,
             // Pre-rellenar email si está disponible
             ...(clientEmailFromPermit && { customer_email: clientEmailFromPermit }),
             metadata: {
               internal_budget_id: idBudget,
               payment_type: 'initial'
             }
           });
           initialPaymentLinkUrl = session.url;// Guardar la URL de pago
 
         } catch (stripeError) {
           console.error("Error al crear la sesión de Stripe Checkout para el presupuesto:", stripeError);
           // Loguear el error, el PDF se generará sin este enlace específico.
         }
       }
 
       // Añadir la sección al PDF si se generó el enlace de pago inicial
       if (initialPaymentLinkUrl) {
         // Podrías colocar esta sección antes o después de la info de Banco/Zelle, según prefieras
         doc.moveDown(2); // Espacio antes
          // --- SIMULACIÓN DE BOTÓN (COPIADO DE FINAL INVOICE) ---
          const buttonWidth = 180;
          const buttonHeight = 30;
          const buttonX = pageMargin + (contentWidth - buttonWidth) / 2; // Centrar horizontalmente
          const buttonY = doc.y;
          // *** AJUSTAR TEXTO PARA PAGO INICIAL ***
          const buttonText = 'Click Here to Pay Initial Amount';
 
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
          // *** USAR initialPaymentLinkUrl AQUÍ ***
          doc.link(buttonX, buttonY, buttonWidth, buttonHeight, initialPaymentLinkUrl);
          // --- FIN SIMULACIÓN DE BOTÓN ---
 
          doc.moveDown(3);
        //  doc.fontSize(10).font('Helvetica-Bold').text('Online Initial Payment:', pageMargin, doc.y, { underline: true });
        //  doc.font('Helvetica').fontSize(9);
        //  doc.moveDown(0.5);
        //  doc.fillColor('blue')
        //     .text('Click here to pay the initial amount online securely via Stripe', pageMargin, doc.y, {
        //       link: initialPaymentLinkUrl,
        //       underline: true
        //     });
        //  doc.fillColor('black');
        //  doc.moveDown(1.5); // Espacio después
       }
       // *** FIN NUEVA SECCIÓN ***
 

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
      doc.moveTo(unitPriceX - 10, finalItemsYExtras).lineTo(tableHeaderRightEdge, finalItemsYExtras).strokeColor("#cccccc").stroke();
      doc.moveDown(0.5);

      // === SECCIÓN TOTALES === (Alineada a la derecha)
      const totalsLabelStartX = pageMargin + contentWidth * 0.60;
      const totalsValueStartX = pageMargin + contentWidth * 0.80;
      const totalsRightEdge = doc.page.width - pageMargin;
      const labelWidth = totalsValueStartX - totalsLabelStartX - 5;
      const valueWidth = totalsRightEdge - totalsValueStartX;
      doc.fontSize(10);

      // --- Original Budget Total ---
      let currentY = doc.y;
      const originalTotalNum = parseFloat(originalBudgetTotal);
      doc.text(`Original Budget Total:`, totalsLabelStartX, currentY, { width: labelWidth, align: 'right' });
      doc.text(`$${!isNaN(originalTotalNum) ? originalTotalNum.toFixed(2) : '0.00'}`, totalsValueStartX, currentY, { width: valueWidth, align: 'right' });
      doc.moveDown(0.5);

      // --- Subtotal Extras ---
      currentY = doc.y;
      const extrasNum = parseFloat(subtotalExtras);
      doc.text(`Additional Items Total:`, totalsLabelStartX, currentY, { width: labelWidth, align: 'right' });
      doc.text(`$${!isNaN(extrasNum) ? extrasNum.toFixed(2) : '0.00'}`, totalsValueStartX, currentY, { width: valueWidth, align: 'right' });
      doc.moveDown(0.5);

      // --- Initial Payment ---
      currentY = doc.y;
      const initialPaymentNum = parseFloat(initialPaymentMade);
      doc.fillColor('green').text(`Initial Payment Received:`, totalsLabelStartX, currentY, { width: labelWidth, align: 'right' });
      doc.text(`-$${!isNaN(initialPaymentNum) ? initialPaymentNum.toFixed(2) : '0.00'}`, totalsValueStartX, currentY, { width: valueWidth, align: 'right' });
      doc.fillColor('black').moveDown(0.5);

      // --- Final Amount Due ---
      currentY = doc.y;
      const finalAmountNum = parseFloat(finalAmountDue);
      doc.font('Helvetica-Bold'); // Total en negrita
      doc.text(status === 'paid' ? `Final Amount Paid:` : `Final Amount Due:`, totalsLabelStartX, currentY, { width: labelWidth, align: 'right' });
      doc.text(`$${!isNaN(finalAmountNum) ? finalAmountNum.toFixed(2) : '0.00'}`, totalsValueStartX, currentY, { width: valueWidth, align: 'right' });
      doc.font('Helvetica'); // Volver a normal
      doc.moveDown(2);

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
        logoPath: path.join(__dirname, '../assets/logo_zurcher_construction.png') // Asegúrate que el path y nombre del logo sean correctos
      };
      const currentCompany = { ...defaultCompanyData, ...companyData };


      // Datos del cliente (ejemplo, necesitarás obtenerlos del workData o sus relaciones)
      const clientName = workData.Budget?.applicantName || workData.Permit?.applicantName || "Valued Customer";
      const clientCompanyName = workData.Budget?.companyName || ""; // Si tienes compañía del cliente

      const formattedCODate = formatDateDDMMYYYY(coCreatedAt || new Date().toISOString()); // Fecha del CO
      const coNumber = changeOrderNumber || `CO-${changeOrderId.substring(0, 8)}`;


      // --- 2. Configurar PDF ---
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const uploadsDir = path.join(__dirname, '../uploads/change_orders'); // Carpeta específica para COs
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const pdfPath = path.join(uploadsDir, `change_order_${coNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // --- CONSTANTES DE DISEÑO ---
      const pageMargin = 50;
      const contentWidth = doc.page.width - pageMargin * 2;
      
      // Colores
      const primaryColor = '#003366'; // Azul oscuro para encabezados y acentos
      const secondaryColor = '#4A90E2'; // Azul más claro
      const textColor = '#333333';
      const lightGrayColor = '#DDDDDD';
      const whiteColor = '#FFFFFF';

      // --- 3. Contenido del PDF ---

      // === ENCABEZADO ===
      const headerHeight = 80;
      doc.rect(0, 0, doc.page.width, headerHeight).fill(primaryColor);
      if (fs.existsSync(currentCompany.logoPath)) {
        doc.image(currentCompany.logoPath, pageMargin, 15, { height: 50 });
      }
      doc.fontSize(24).fillColor(whiteColor).font('Helvetica-Bold')
         .text('CHANGE ORDER', pageMargin + 200, 30, { align: 'right', width: contentWidth - 200 - pageMargin });
      
      doc.fillColor(textColor); // Reset color

      // === INFORMACIÓN DE LA EMPRESA Y DEL DOCUMENTO ===
      let currentY = headerHeight + 20;
      doc.fontSize(9).font('Helvetica-Bold').text(currentCompany.name, pageMargin, currentY);
      currentY += doc.currentLineHeight();
      doc.font('Helvetica').text(currentCompany.addressLine1, pageMargin, currentY);
      currentY += doc.currentLineHeight();
      doc.text(currentCompany.cityStateZip, pageMargin, currentY);
      currentY += doc.currentLineHeight();
      doc.text(currentCompany.phone, pageMargin, currentY);

      const rightInfoX = doc.page.width - pageMargin - 200;
      currentY = headerHeight + 20; // Reset Y para la columna derecha
      doc.fontSize(10).font('Helvetica-Bold').text(`NO: ${coNumber}`, rightInfoX, currentY, { width: 200, align: 'right' });
      currentY += doc.currentLineHeight();
      doc.font('Helvetica').text(`Date: ${formattedCODate}`, rightInfoX, currentY, { width: 200, align: 'right' });
      currentY += doc.currentLineHeight();
      if (clientCompanyName) {
        doc.font('Helvetica-Bold').text(clientCompanyName.toUpperCase(), rightInfoX, currentY, { width: 200, align: 'right' });
      } else {
        doc.font('Helvetica-Bold').text(clientName.toUpperCase(), rightInfoX, currentY, { width: 200, align: 'right' });
      }
      
      currentY = Math.max(currentY, headerHeight + 20 + (4 * 12)) + 20; // Espacio después de la info

      // === DIRECCIÓN DE LA OBRA ===
      doc.fontSize(11).font('Helvetica-Bold').text(propertyAddress.toUpperCase(), pageMargin, currentY, {align: 'left'});
      currentY += doc.currentLineHeight() + 20;

      // === TABLA DE ÍTEMS DEL CHANGE ORDER ===
      const tableTop = currentY;
      const colQtyX = pageMargin;
      const colDescX = pageMargin + 60;
      const colUnitPriceX = pageMargin + contentWidth - 180;
      const colTotalX = pageMargin + contentWidth - 90;

      // Cabeceras
      doc.fontSize(10).font('Helvetica-Bold');
      doc.rect(pageMargin, tableTop - 5, contentWidth, 20).fill(primaryColor);
      doc.fillColor(whiteColor);
      doc.text('Qty', colQtyX + 5, tableTop, { width: colDescX - colQtyX - 10 });
      doc.text('Item Description', colDescX + 5, tableTop);
      doc.text('Unit Price', colUnitPriceX, tableTop, { width: colTotalX - colUnitPriceX - 10, align: 'right' });
      doc.text('Total', colTotalX, tableTop, { width: contentWidth - (colTotalX - pageMargin), align: 'right' });
      doc.fillColor(textColor); // Reset color
      currentY = tableTop + 25;

      // Fila del ítem
      doc.fontSize(10).font('Helvetica');
      const qtyText = hours ? `${parseFloat(hours).toFixed(1)} hours` : '1'; // Asume 1 si no hay horas
      const itemDescText = itemDescription || coDescription || "Work as per Change Order";
      const unitPriceText = `$${parseFloat(unitCost || totalCost || 0).toFixed(2)}`;
      const totalText = `$${parseFloat(totalCost || 0).toFixed(2)}`;

      doc.text(qtyText, colQtyX + 5, currentY, { width: colDescX - colQtyX - 10 });
      doc.text(itemDescText, colDescX + 5, currentY, { width: colUnitPriceX - colDescX - 10 });
      doc.text(unitPriceText, colUnitPriceX, currentY, { width: colTotalX - colUnitPriceX - 10, align: 'right' });
      doc.text(totalText, colTotalX, currentY, { width: contentWidth - (colTotalX - pageMargin), align: 'right' });
      
      currentY += doc.currentLineHeight() + 10; // Espacio después de la fila
      // Línea debajo de la fila
      doc.moveTo(pageMargin, currentY).lineTo(doc.page.width - pageMargin, currentY).strokeColor(lightGrayColor).stroke();
      currentY += 15;

      // === TOTAL DEL CHANGE ORDER ===
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('TOTAL CHANGE ORDER:', colUnitPriceX - 100, currentY, { width: 100, align: 'right' });
      doc.text(`$${parseFloat(totalCost || 0).toFixed(2)}`, colTotalX, currentY, { width: contentWidth - (colTotalX - pageMargin), align: 'right' });
      currentY += doc.currentLineHeight() + 20;

      // === MENSAJE AL CLIENTE (SI EXISTE) ===
      if (clientMessage) {
        doc.fontSize(10).font('Helvetica-Oblique').text("Note:", pageMargin, currentY);
        currentY += doc.currentLineHeight();
        doc.font('Helvetica').text(clientMessage, pageMargin, currentY, { width: contentWidth });
        currentY += doc.currentLineHeight() * (Math.ceil(doc.heightOfString(clientMessage, {width: contentWidth}) / doc.currentLineHeight())) + 10;
      }
      
      // === SECCIÓN DE APROBACIÓN (SI EL ESTADO ES APROBADO) ===
      // Esto es solo para mostrarlo en el PDF si YA está aprobado.
      // La aprobación real vendrá del enlace en el email.
      if (coStatus === 'approved') {
        const approvedStampPath = path.join(__dirname, '../assets/approved_stamp.png'); // Necesitarás una imagen de sello "APPROVED"
        if (fs.existsSync(approvedStampPath)) {
            doc.image(approvedStampPath, doc.page.width - pageMargin - 150, currentY, { width: 120 });
            currentY += 70; // Ajustar según el tamaño del sello
        } else {
            doc.fontSize(18).fillColor('green').font('Helvetica-Bold')
               .text('APPROVED', doc.page.width - pageMargin - 200, currentY, { width: 180, align: 'center' });
            currentY += 30;
        }
        // Podrías añadir "Approved by: [Nombre]" y "Date: [Fecha]" si tienes esa info
      }

      // Mover al final de la página para el "Thank You" y la info de pago si es necesario
      const spaceForFooter = 150;
      if (doc.page.height - currentY < spaceForFooter) {
        doc.addPage();
        currentY = pageMargin;
      } else {
        currentY = doc.page.height - spaceForFooter - 20; // Posicionar más arriba
      }


      // === INFORMACIÓN DE PAGO (Opcional, si aplica para COs) ===
      doc.fontSize(9).font('Helvetica-Bold').text('Payment Information:', pageMargin, currentY);
      currentY += doc.currentLineHeight();
      doc.font('Helvetica');
      doc.text(`Bank: ${currentCompany.bankName || "Chase"}`, pageMargin, currentY); // Añade bankName a companyData si es diferente
      currentY += doc.currentLineHeight();
      doc.text(`Routing number: ${currentCompany.routingNumber || "267084131"}`, pageMargin, currentY);
      currentY += doc.currentLineHeight();
      doc.text(`Account number: ${currentCompany.accountNumber || "686125371"}`, pageMargin, currentY);
      currentY += doc.currentLineHeight();
      doc.text(`Email: ${currentCompany.paymentEmail || "zurcherseptic@gmail.com"}`, pageMargin, currentY);
      
      // === THANK YOU ===
      doc.fontSize(22).font('Helvetica-BoldOblique').fillColor(primaryColor)
         .text('Thank You!', doc.page.width - pageMargin - 200, doc.page.height - pageMargin - 60, { width: 180, align: 'right' });


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