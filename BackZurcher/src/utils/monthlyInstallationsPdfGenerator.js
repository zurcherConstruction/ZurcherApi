const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const { es } = require('date-fns/locale');

// === ESTILOS ===
const PAGE_MARGIN = 50;
const PRIMARY_COLOR = '#063260';
const HEADER_BG = '#E9EFF5';
const BORDER_COLOR = '#CCCCCC';
const TEXT_COLOR = '#222222';
const TEXT_LIGHT = '#555555';

// === Helper para fechas ===
const formatDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  try {
    const dateObj = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return format(dateObj, 'dd/MM/yyyy');
  } catch {
    return 'N/A';
  }
};

const getMonthName = (monthNum) => {
  const names = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return names[monthNum - 1] || 'N/A';
};

/**
 * Genera un PDF con el reporte de instalaciones mensuales
 * @param {Object} data - Datos de instalaciones
 * @param {Number} data.year - Año
 * @param {Number} data.month - Mes (1-12)
 * @param {Array} data.installations - Array de instalaciones
 * @param {Object} data.summary - Resumen con totales
 * @param {String} data.filteredStaff - Nombre del staff si está filtrado (opcional)
 * @returns {Promise<String>} - Ruta del archivo PDF generado
 */
async function generateMonthlyInstallationsPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      console.log('📋 Generando PDF de instalaciones mensuales...');

      const { year, month, installations, summary, filteredStaff } = data;
      const monthName = getMonthName(month);

      // Crear documento
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN }
      });

      // Directorio de salida
      const outputDir = path.join(__dirname, '../uploads/monthly_reports');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const fileName = `Monthly_Installations_${year}_${month.toString().padStart(2, '0')}.pdf`;
      const outputPath = path.join(outputDir, fileName);
      const stream = fs.createWriteStream(outputPath);

      doc.pipe(stream);

      // === HEADER ===
      const logoPath = path.join(__dirname, '../assets/logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, PAGE_MARGIN, PAGE_MARGIN, { width: 80 });
      }

      doc.font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(PRIMARY_COLOR)
        .text('ZURCHER CONSTRUCTION', PAGE_MARGIN + 100, PAGE_MARGIN);
      
      doc.font('Helvetica')
        .fontSize(9)
        .fillColor(TEXT_LIGHT)
        .text('SEPTIC TANK DIVISION - CFC1433240', PAGE_MARGIN + 100, PAGE_MARGIN + 15)
        .text('admin@zurcherseptic.com', PAGE_MARGIN + 100, PAGE_MARGIN + 28)
        .text('+1 (954) 636-8200', PAGE_MARGIN + 100, PAGE_MARGIN + 41);

      // Título del reporte
      doc.font('Helvetica-Bold')
        .fontSize(18)
        .fillColor(PRIMARY_COLOR)
        .text('MONTHLY INSTALLATIONS REPORT', PAGE_MARGIN, PAGE_MARGIN + 80, { align: 'center' });

      let subtitle = `${monthName} ${year}`;
      if (filteredStaff) {
        subtitle += ` - ${filteredStaff}`;
      }

      doc.font('Helvetica')
        .fontSize(14)
        .fillColor(TEXT_COLOR)
        .text(subtitle, PAGE_MARGIN, PAGE_MARGIN + 105, { align: 'center' });

      // Línea separadora
      doc.moveTo(PAGE_MARGIN, PAGE_MARGIN + 130)
        .lineTo(doc.page.width - PAGE_MARGIN, PAGE_MARGIN + 130)
        .strokeColor(BORDER_COLOR)
        .stroke();

      let yPosition = PAGE_MARGIN + 150;

      // === RESUMEN ===
      doc.font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(PRIMARY_COLOR)
        .text('SUMMARY', PAGE_MARGIN, yPosition);

      yPosition += 25;

      // Cuadro destacado con el total
      const boxWidth = 200;
      const boxHeight = 60;
      const boxX = (doc.page.width - boxWidth) / 2; // Centrar

      doc.rect(boxX, yPosition, boxWidth, boxHeight)
        .fillAndStroke(PRIMARY_COLOR, PRIMARY_COLOR);

      doc.font('Helvetica')
        .fontSize(11)
        .fillColor('white')
        .text('Total Installations', boxX, yPosition + 15, { width: boxWidth, align: 'center' });

      doc.font('Helvetica-Bold')
        .fontSize(28)
        .fillColor('white')
        .text(`${summary.totalWorks}`, boxX, yPosition + 32, { width: boxWidth, align: 'center' });

      yPosition += boxHeight + 30;

      // Resumen por staff - Tabla simple
      if (summary.byStaff && summary.byStaff.length > 0) {
        doc.font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(PRIMARY_COLOR)
          .text('Installations by Staff', PAGE_MARGIN, yPosition);

        yPosition += 20;

        // Encabezado de mini-tabla
        const tableX = PAGE_MARGIN + 20;
        const colStaffWidth = 250;
        const colCountWidth = 80;

        doc.rect(tableX, yPosition, colStaffWidth + colCountWidth, 20)
          .fillAndStroke(HEADER_BG, BORDER_COLOR);

        doc.font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(TEXT_COLOR)
          .text('Staff Member', tableX + 10, yPosition + 6, { width: colStaffWidth - 10 })
          .text('Count', tableX + colStaffWidth + 10, yPosition + 6, { width: colCountWidth - 10, align: 'center' });

        yPosition += 20;

        // Filas de staff
        doc.font('Helvetica').fontSize(9);
        summary.byStaff.forEach((staff, index) => {
          // Fondo alternado
          if (index % 2 === 0) {
            doc.rect(tableX, yPosition, colStaffWidth + colCountWidth, 18)
              .fill('#F9FAFB');
          }

          doc.fillColor(TEXT_COLOR)
            .text(staff.staffName, tableX + 10, yPosition + 4, { width: colStaffWidth - 10 })
            .text(staff.count.toString(), tableX + colStaffWidth + 10, yPosition + 4, { 
              width: colCountWidth - 10, 
              align: 'center' 
            });

          yPosition += 18;
          
          // Nueva página si es necesario
          if (yPosition > doc.page.height - PAGE_MARGIN - 100) {
            doc.addPage();
            yPosition = PAGE_MARGIN;
          }
        });

        yPosition += 10;
      }

      yPosition += 20;

      // === LISTA DE INSTALACIONES ===
      doc.font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(PRIMARY_COLOR)
        .text('INSTALLATIONS LIST', PAGE_MARGIN, yPosition);

      yPosition += 25;

      if (installations && installations.length > 0) {
        // Encabezado de tabla
        doc.rect(PAGE_MARGIN, yPosition, doc.page.width - PAGE_MARGIN * 2, 20)
          .fillAndStroke(PRIMARY_COLOR, PRIMARY_COLOR);

        doc.font('Helvetica-Bold')
          .fontSize(9)
          .fillColor('white')
          .text('#', PAGE_MARGIN + 5, yPosition + 6, { width: 25 })
          .text('Property Address', PAGE_MARGIN + 35, yPosition + 6, { width: 200 })
          .text('Staff', PAGE_MARGIN + 240, yPosition + 6, { width: 120 })
          .text('Installed Date', PAGE_MARGIN + 365, yPosition + 6, { width: 80 })
          .text('Status', PAGE_MARGIN + 450, yPosition + 6, { width: 80 });

        yPosition += 25;

        // Filas de instalaciones
        doc.font('Helvetica').fontSize(9).fillColor(TEXT_COLOR);

        installations.forEach((installation, index) => {
          // Verificar si necesitamos nueva página
          if (yPosition > doc.page.height - PAGE_MARGIN - 50) {
            doc.addPage();
            yPosition = PAGE_MARGIN;
            
            // Re-dibujar encabezado en nueva página
            doc.rect(PAGE_MARGIN, yPosition, doc.page.width - PAGE_MARGIN * 2, 20)
              .fillAndStroke(PRIMARY_COLOR, PRIMARY_COLOR);

            doc.font('Helvetica-Bold')
              .fontSize(9)
              .fillColor('white')
              .text('#', PAGE_MARGIN + 5, yPosition + 6, { width: 25 })
              .text('Property Address', PAGE_MARGIN + 35, yPosition + 6, { width: 200 })
              .text('Staff', PAGE_MARGIN + 240, yPosition + 6, { width: 120 })
              .text('Installed Date', PAGE_MARGIN + 365, yPosition + 6, { width: 80 })
              .text('Status', PAGE_MARGIN + 450, yPosition + 6, { width: 80 });

            yPosition += 25;
            doc.font('Helvetica').fontSize(9).fillColor(TEXT_COLOR);
          }

          // Fondo alternado
          if (index % 2 === 0) {
            doc.rect(PAGE_MARGIN, yPosition - 2, doc.page.width - PAGE_MARGIN * 2, 20)
              .fill('#F9FAFB');
          }

          doc.fillColor(TEXT_COLOR)
            .text(`${index + 1}`, PAGE_MARGIN + 5, yPosition, { width: 25 })
            .text(installation.propertyAddress || 'N/A', PAGE_MARGIN + 35, yPosition, { 
              width: 200, 
              ellipsis: true 
            })
            .text(installation.staff?.name || 'Unassigned', PAGE_MARGIN + 240, yPosition, { 
              width: 120, 
              ellipsis: true 
            })
            .text(formatDate(installation.installedDate), PAGE_MARGIN + 365, yPosition, { width: 80 })
            .text(installation.currentStatus || 'N/A', PAGE_MARGIN + 450, yPosition, { 
              width: 80,
              ellipsis: true  
            });

          yPosition += 20;
        });
      } else {
        doc.font('Helvetica')
          .fontSize(10)
          .fillColor(TEXT_LIGHT)
          .text('No installations found for this period.', PAGE_MARGIN, yPosition, { 
            align: 'center' 
          });
      }

      // === FOOTER ===
      const footerY = doc.page.height - PAGE_MARGIN + 10;
      doc.fontSize(8)
        .fillColor(TEXT_LIGHT)
        .text(
          `Generated on ${formatDate(new Date())} | Zurcher Construction`,
          PAGE_MARGIN,
          footerY,
          { align: 'center' }
        );

      // Finalizar
      doc.end();

      stream.on('finish', () => {
        console.log(`✅ PDF generado: ${outputPath}`);
        resolve(outputPath);
      });

      stream.on('error', (err) => {
        console.error('❌ Error al escribir PDF:', err);
        reject(err);
      });

    } catch (error) {
      console.error('❌ Error al generar PDF de instalaciones mensuales:', error);
      reject(error);
    }
  });
}

module.exports = { generateMonthlyInstallationsPDF };
