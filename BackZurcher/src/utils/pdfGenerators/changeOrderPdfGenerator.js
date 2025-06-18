const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');


// Importar desde archivos compartidos
const {
  pageMargin,
  primaryColor,
  whiteColor,
  textColor,
  lightGrayColor
} = require('./shared/constants');

const { formatDateDDMMYYYY } = require('./shared/helpers');
const { addClientSignatureSection } = require('./shared/components');

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

      const {
        propertyAddress,
      } = workData;

      // Datos de tu empresa
      const defaultCompanyData = {
        name: "ZURCHER CONSTRUCTION LLC.",
        addressLine1: "9837 Clear Cloud Aly",
        cityStateZip: "Winter Garden 34787",
        phone: "+1 (407) 419-4495",
        email: "zurcherseptic@gmail.com",
        logoPath: path.join(__dirname, '../../assets/logo.png') // Ajustar ruta
      };
      const currentCompany = { ...defaultCompanyData, ...companyData };

      // Datos del cliente
      const clientName = workData.Budget?.applicantName || workData.Permit?.applicantName || "Valued Customer";
      const clientCompanyName = workData.Budget?.companyName || "";

      const formattedCODate = formatDateDDMMYYYY(coCreatedAt || new Date().toISOString());
      const coNumber = changeOrderNumber || `CO-${changeOrderId.substring(0, 8)}`;

      // --- 2. Configurar PDF ---
      const doc = new PDFDocument({ margin: pageMargin, size: 'A4' });
      const uploadsDir = path.join(__dirname, '../../uploads/change_orders'); // Ajustar ruta
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const pdfPath = path.join(uploadsDir, `change_order_${coNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      const contentWidth = doc.page.width - pageMargin * 2;

      // --- 3. Contenido del PDF ---

      // === ENCABEZADO ===
      const headerHeight = 80;
      doc.save();
      doc.rect(0, 0, doc.page.width, headerHeight).fill(primaryColor);
      if (fs.existsSync(currentCompany.logoPath)) {
        doc.image(currentCompany.logoPath, pageMargin, 15, { height: 50 });
      }
      doc.fontSize(12).fillColor(whiteColor).font('Helvetica-Bold')
        .text('CHANGE ORDER', pageMargin + 200, 30, { align: 'right', width: contentWidth - 200 });
      doc.restore();

      doc.fillColor(textColor);

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

      // === MENSAJE AL CLIENTE ===
      if (clientMessage) {
        doc.fontSize(10).font('Helvetica-Oblique').text("Note:", pageMargin, currentY);
        currentY += doc.currentLineHeight();
        doc.font('Helvetica').text(clientMessage, pageMargin, currentY, { width: contentWidth });
        currentY = doc.y + 10;
        doc.y = currentY;
      }

      // === SECCIÓN DE APROBACIÓN ===
      if (coStatus === 'approved') {
        const approvedStampPath = path.join(__dirname, '../../assets/approved_stamp.png'); // Ajustar ruta
        let stampYPosition = doc.y + 10;
        const stampHeight = 70;
        const spaceNeededForStampAndFollowing = stampHeight + 150;

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
      currentY = doc.y;

      // === SECCIONES INFERIORES ===
      const signatureSectionHeightEst = 100;
      const paymentInfoHeightEst = (5 * 12) + 20;
      const thankYouHeightEst = 40 + 10;
      const spacingAfterPayment = 3 * 12;
      const spacingAfterThankYou = 3 * 12;

      const totalBottomSectionsHeight = paymentInfoHeightEst + spacingAfterPayment + thankYouHeightEst + spacingAfterThankYou + signatureSectionHeightEst;

      if (doc.y + totalBottomSectionsHeight > doc.page.height - pageMargin) {
        doc.addPage();
      }

      // === INFORMACIÓN DE PAGO ===
      doc.fontSize(9).font('Helvetica-Bold').text('Payment Information:', pageMargin, doc.y);
      doc.y += 5;

      doc.font('Helvetica');
      doc.text(`Bank: ${currentCompany.bankName || "Chase"}`, pageMargin, doc.y);
      doc.text(`Routing number: ${currentCompany.routingNumber || "267084131"}`, pageMargin, doc.y);
      doc.text(`Account number: ${currentCompany.accountNumber || "686125371"}`, pageMargin, doc.y);
      doc.text(`Email: ${currentCompany.paymentEmail || "zurcherseptic@gmail.com"}`, pageMargin, doc.y);

      doc.moveDown(3);

      // === THANK YOU ===
      if (doc.y + thankYouHeightEst + spacingAfterThankYou + signatureSectionHeightEst > doc.page.height - pageMargin) {
        doc.addPage();
      }
      doc.fontSize(22).font('Helvetica-BoldOblique').fillColor(primaryColor)
        .text('Thank You!', pageMargin, doc.y, { width: contentWidth, align: 'right' });

      doc.moveDown(3);

      // === SIGNATURE SECTION ===
      addClientSignatureSection(doc);

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

module.exports = { generateAndSaveChangeOrderPDF };