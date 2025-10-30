const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { format, parseISO } = require('date-fns');

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
    const dateObj = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    return format(dateObj, 'MM/dd/yyyy');
  } catch {
    return 'N/A';
  }
};

// === Descarga temporal de imágenes desde Cloudinary ===
async function downloadImage(url, destFolder) {
  const fileName = path.basename(url.split('?')[0]);
  const filePath = path.join(destFolder, fileName);
  const response = await axios({ url, responseType: 'arraybuffer' });
  fs.writeFileSync(filePath, response.data);
  return filePath;
}

async function generateMaintenancePDF(visitData) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('📋 Generando PDF de mantenimiento con estilo mejorado...');

      const {
        id,
        visit_number,
        scheduled_date,
        actual_visit_date,
        status,
        work,
        assignedStaff,
        completedByStaff,
        // Niveles
        level_inlet,
        level_outlet,
        // Inspección General
        strong_odors,
        strong_odors_notes,
        water_level_ok,
        water_level_notes,
        visible_leaks,
        visible_leaks_notes,
        area_around_dry,
        area_around_notes,
        cap_green_inspected,
        cap_green_notes,
        needs_pumping,
        // ATU
        blower_working,
        blower_working_notes,
        blower_filter_clean,
        blower_filter_notes,
        diffusers_bubbling,
        diffusers_bubbling_notes,
        discharge_pump_ok,
        discharge_pump_notes,
        clarified_water_outlet,
        clarified_water_notes,
        // Lift Station
        alarm_panel_working,
        alarm_panel_notes,
        pump_working,
        pump_working_notes,
        float_switch_good,
        float_switch_notes,
        // PBTS/ATU
        well_points_quantity,
        well_sample_1_url,
        well_sample_2_url,
        well_sample_3_url,
        // Generales
        general_notes,
        worker_signature_url,
        mediaFiles = []
      } = visitData;

      // 🆕 Organizar imágenes por campo
      const tmpDir = path.join(__dirname, '../tmp/pdf-images');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      
      const imagesByField = {};
      const generalImages = [];
      
      for (const item of mediaFiles) {
        const url = typeof item === 'string' ? item : item.mediaUrl || item.url;
        const fieldName = typeof item === 'string' ? 'general' : item.fieldName || 'general';
        
        try {
          const localPath = await downloadImage(url, tmpDir);
          if (fieldName === 'general' || fieldName === 'system_overview_video') {
            generalImages.push({ path: localPath, label: fieldName, url });
          } else {
            if (!imagesByField[fieldName]) imagesByField[fieldName] = [];
            imagesByField[fieldName].push(localPath);
          }
        } catch (err) {
          console.warn(`⚠️ Could not download image: ${url}`);
        }
      }

      const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'LETTER' });

      const outputDir = path.join(__dirname, '../uploads/maintenance_reports');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const safeAddress = (work?.propertyAddress || 'unknown').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `maintenance_${safeAddress}_${formatDate(actual_visit_date).replace(/\//g, '-')}.pdf`;
      const pdfPath = path.join(outputDir, fileName);
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // === ENCABEZADO ===
      const logoPath = path.join(__dirname, '../assets/logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, PAGE_MARGIN, PAGE_MARGIN, { width: 70 });
      }

      // Título centrado debajo del logo
      doc.font('Helvetica-Bold').fontSize(18).fillColor(PRIMARY_COLOR)
        .text('MAINTENANCE INSPECTION REPORT', PAGE_MARGIN, PAGE_MARGIN + 50, { align: 'center' });
      
      // 🆕 Número de visita prominente
      doc.fontSize(14).fillColor('#DC2626')
        .text(`Visit #${visit_number || 'N/A'}`, PAGE_MARGIN, PAGE_MARGIN + 70, { align: 'center' });
      
      doc.fontSize(9).fillColor(TEXT_LIGHT)
        .text('Zurcher Construction - Septic Tank Division', PAGE_MARGIN, PAGE_MARGIN + 88, { align: 'center' });

      let y = PAGE_MARGIN + 105;

      // === DATOS GENERALES ===
      doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_COLOR);
      doc.text(`Scheduled:`, PAGE_MARGIN, y, { continued: true }).font('Helvetica').text(formatDate(scheduled_date));
      doc.text(`Completed:`, PAGE_MARGIN + 220, y, { continued: true }).font('Helvetica').text(formatDate(actual_visit_date));
      y += 12;
      doc.font('Helvetica-Bold').text(`Status:`, PAGE_MARGIN, y, { continued: true }).font('Helvetica').text((status || 'N/A').toUpperCase());
      doc.text(`Property:`, PAGE_MARGIN + 220, y, { continued: true }).font('Helvetica').text(work?.propertyAddress || 'N/A', { width: 280 });
      y += 12;
      doc.font('Helvetica-Bold').text(`Technician:`, PAGE_MARGIN, y, { continued: true }).font('Helvetica').text(completedByStaff?.name || assignedStaff?.name || 'N/A');
      y += 25;

      // === Helper secciones ===
      const drawSectionTitle = (title) => {
        // Verificar si necesitamos nueva página (si quedan menos de 100px)
        if (y > doc.page.height - 150) {
          doc.addPage();
          y = PAGE_MARGIN;
        }
        
        doc.rect(PAGE_MARGIN, y, doc.page.width - PAGE_MARGIN * 2, 18)
          .fillAndStroke(HEADER_BG, BORDER_COLOR);
        doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(10)
          .text(title, PAGE_MARGIN + 5, y + 4);
        y += 25;
      };

      const drawRow = (label, value, notes = '', fieldImages = []) => {
        const colX = [PAGE_MARGIN, PAGE_MARGIN + 230, PAGE_MARGIN + 270, PAGE_MARGIN + 360];
        const baseRowHeight = 20;
        let rowHeight = baseRowHeight;
        
        // Calcular altura necesaria para notas e imágenes
        const hasNotes = notes && notes.trim().length > 0;
        const hasImages = fieldImages && fieldImages.length > 0;
        
        if (hasNotes) rowHeight += 25; // Espacio para notas
        if (hasImages) rowHeight += 45; // Espacio para miniaturas

        // Verificar si necesitamos nueva página
        if (y + rowHeight > doc.page.height - PAGE_MARGIN) {
          doc.addPage();
          y = PAGE_MARGIN;
        }

        const yes = (value === true || value === 'yes') ? 'YES' : '';
        const no = (value === false || value === 'no') ? 'NO' : '';

        doc.rect(PAGE_MARGIN, y, doc.page.width - PAGE_MARGIN * 2, rowHeight)
          .strokeColor(BORDER_COLOR).stroke();

        doc.font('Helvetica').fontSize(8).fillColor(TEXT_COLOR);
        doc.text(label, colX[0] + 3, y + 5, { width: 220 });
        doc.fillColor(yes ? '#059669' : TEXT_COLOR).text(yes, colX[1], y + 5);
        doc.fillColor(no ? '#DC2626' : TEXT_COLOR).text(no, colX[2], y + 5);
        
        let currentY = y + 5;
        
        // Mostrar notas si existen
        if (hasNotes) {
          doc.fillColor(TEXT_LIGHT).fontSize(7).text(notes, colX[0] + 3, currentY + 15, { 
            width: doc.page.width - PAGE_MARGIN * 2 - 10 
          });
          currentY += 25;
        }
        
        // Mostrar miniaturas si existen
        if (hasImages) {
          const thumbSize = 35;
          const thumbSpacing = 5;
          let thumbX = colX[0] + 3;
          
          for (let i = 0; i < Math.min(fieldImages.length, 4); i++) { // Máximo 4 miniaturas por fila
            try {
              doc.image(fieldImages[i], thumbX, currentY + 5, { 
                width: thumbSize, 
                height: thumbSize,
                fit: [thumbSize, thumbSize]
              });
              doc.rect(thumbX, currentY + 5, thumbSize, thumbSize).strokeColor('#DDD').stroke();
              thumbX += thumbSize + thumbSpacing;
            } catch (err) {
              console.warn(`⚠️ Error rendering thumbnail: ${err.message}`);
            }
          }
          
          if (fieldImages.length > 4) {
            doc.fontSize(6).fillColor(TEXT_LIGHT).text(
              `+${fieldImages.length - 4} more`, 
              thumbX, 
              currentY + 15
            );
          }
        }
        
        y += rowHeight;
      };

      // === NIVELES ===
      if (level_inlet || level_outlet) {
        drawSectionTitle('Tank Levels');
        doc.font('Helvetica').fontSize(9).fillColor(TEXT_COLOR);
        if (level_inlet) doc.text(`Inlet Level: ${level_inlet}`, PAGE_MARGIN, y);
        if (level_outlet) doc.text(`Outlet Level: ${level_outlet}`, PAGE_MARGIN + 200, y);
        y += 20;
      }

      // === INSPECCIÓN GENERAL ===
      drawSectionTitle('General Inspection');
      drawRow('Strong Odors', strong_odors, strong_odors_notes, imagesByField.strong_odors || []);
      drawRow('Water Level OK', water_level_ok, water_level_notes, imagesByField.water_level_ok || []);
      drawRow('Visible Leaks', visible_leaks, visible_leaks_notes, imagesByField.visible_leaks || []);
      drawRow('Area Around Dry', area_around_dry, area_around_notes, imagesByField.area_around_dry || []);
      drawRow('Green Cap Inspected', cap_green_inspected, cap_green_notes, imagesByField.cap_green_inspected || []);
      drawRow('Needs Pumping', needs_pumping, '', []);
      y += 15;

      // === SISTEMA ATU ===
      drawSectionTitle('ATU System');
      drawRow('Blower Working', blower_working, blower_working_notes, imagesByField.blower_working || []);
      drawRow('Blower Filter Clean', blower_filter_clean, blower_filter_notes, imagesByField.blower_filter_clean || []);
      drawRow('Diffusers Bubbling', diffusers_bubbling, diffusers_bubbling_notes, imagesByField.diffusers_bubbling || []);
      drawRow('Discharge Pump OK', discharge_pump_ok, discharge_pump_notes, imagesByField.discharge_pump_ok || []);
      drawRow('Clarified Water Outlet', clarified_water_outlet, clarified_water_notes, imagesByField.clarified_water_outlet || []);
      y += 15;

      // === LIFT STATION ===
      if (alarm_panel_working !== undefined || pump_working !== undefined) {
        drawSectionTitle('Lift Station');
        drawRow('Alarm Panel Working', alarm_panel_working, alarm_panel_notes, imagesByField.alarm_panel_working || []);
        drawRow('Pump Working', pump_working, pump_working_notes, imagesByField.pump_working || []);
        drawRow('Float Switch Good', float_switch_good, float_switch_notes, imagesByField.float_switch_good || []);
        y += 15;
      }

      // === PBTS / ATU - Muestras individuales ===
      if (well_points_quantity || well_sample_1_url || well_sample_2_url || well_sample_3_url) {
        drawSectionTitle('PBTS / ATU Well Samples');
        
        if (well_points_quantity) {
          doc.font('Helvetica').fontSize(9).fillColor(TEXT_COLOR);
          doc.text(`Total Well Points: ${well_points_quantity}`, PAGE_MARGIN, y);
          y += 15;
        }
        
        // Mostrar cada muestra individualmente
        const samples = [
          { url: well_sample_1_url, label: 'Well Sample 1' },
          { url: well_sample_2_url, label: 'Well Sample 2' },
          { url: well_sample_3_url, label: 'Well Sample 3' }
        ];
        
        for (const sample of samples) {
          if (sample.url) {
            // Verificar si necesitamos nueva página (imagen + label + link = ~130px)
            if (y > doc.page.height - 180) {
              doc.addPage();
              y = PAGE_MARGIN;
            }
            
            try {
              const samplePath = await downloadImage(sample.url, tmpDir);
              
              doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_COLOR);
              doc.text(sample.label, PAGE_MARGIN, y);
              y += 12;
              
              doc.image(samplePath, PAGE_MARGIN + 10, y, { 
                width: 100, 
                height: 100,
                fit: [100, 100]
              });
              doc.rect(PAGE_MARGIN + 10, y, 100, 100).strokeColor('#DDD').stroke();
              y += 105;
              
              // Link para ver imagen completa
              doc.fontSize(7).fillColor('#0066CC')
                .text('View image', PAGE_MARGIN + 10, y, { 
                  link: sample.url,
                  underline: true 
                });
              y += 15;
            } catch (err) {
              console.warn(`⚠️ Could not download sample image: ${sample.url}`);
              doc.font('Helvetica-Oblique').fontSize(7).fillColor(TEXT_LIGHT);
              doc.text(`${sample.label}: Image not available`, PAGE_MARGIN + 10, y);
              
              // Aún así mostrar link
              doc.fontSize(7).fillColor('#0066CC')
                .text('View online', PAGE_MARGIN + 10, y + 10, { 
                  link: sample.url,
                  underline: true 
                });
              y += 25;
            }
          }
        }
        y += 10;
      }

      // === NOTAS GENERALES ===
      if (general_notes) {
        // Verificar si necesitamos nueva página
        if (y > doc.page.height - 150) {
          doc.addPage();
          y = PAGE_MARGIN;
        }
        
        drawSectionTitle('Additional Notes');
        doc.font('Helvetica').fontSize(9).fillColor(TEXT_COLOR)
          .text(general_notes, PAGE_MARGIN + 5, y, { width: doc.page.width - PAGE_MARGIN * 2 - 10, align: 'justify' });
        y = doc.y + 20;
      }

      // === IMÁGENES GENERALES ===
      if (generalImages.length > 0) {
        drawSectionTitle('Additional Photos');
        
        const thumbSize = 120;
        const spacing = 20;
        const perRow = 3;
        let col = 0;

        for (let i = 0; i < generalImages.length; i++) {
          const { path: img, label, url } = generalImages[i];
          const x = PAGE_MARGIN + (col * (thumbSize + spacing));
          
          // Verificar si necesitamos nueva página (imagen + label + link = ~160px)
          if (y > doc.page.height - 210) {
            doc.addPage();
            y = PAGE_MARGIN;
            col = 0;
          }
          
          doc.image(img, x, y, { width: thumbSize, height: thumbSize, fit: [thumbSize, thumbSize] })
             .rect(x, y, thumbSize, thumbSize).strokeColor('#DDD').stroke();
          
          doc.font('Helvetica').fontSize(8).fillColor(TEXT_COLOR)
             .text(label === 'general' ? `Photo ${i + 1}` : label, x, y + thumbSize + 4, { width: thumbSize, align: 'center' });
          
          // Link para ver imagen completa
          if (url) {
            doc.fontSize(6).fillColor('#0066CC')
              .text('View', x, y + thumbSize + 16, { 
                width: thumbSize, 
                align: 'center',
                link: url,
                underline: true 
              });
          }
          
          col++;
          if (col >= perRow) {
            col = 0;
            y += thumbSize + spacing + 30;
          }
        }
        
        if (col > 0) {
          y += thumbSize + 30;
        }
      }

      // === FIRMA ===
      if (worker_signature_url) {
        drawSectionTitle('Technician Signature');
        try {
          const sigPath = await downloadImage(worker_signature_url, path.join(__dirname, '../tmp/pdf-images'));
          doc.image(sigPath, PAGE_MARGIN + 100, y, { width: 120 });
        } catch {
          doc.font('Helvetica-Oblique').fontSize(8).fillColor(TEXT_LIGHT)
            .text('Digital signature available in record.', PAGE_MARGIN + 10, y + 10);
        }
        y += 50;
      }

      // === FOOTER ===
      const footerY = doc.page.height - 40;
      doc.fontSize(7).font('Helvetica').fillColor(TEXT_LIGHT)
        .text(`Generated on ${formatDate(new Date())} | Zurcher Construction - Septic Tank Division`,
          PAGE_MARGIN, footerY, { width: doc.page.width - PAGE_MARGIN * 2, align: 'center' });

      doc.end();

      stream.on('finish', () => {
        console.log(`✅ PDF generado: ${pdfPath}`);
        resolve(pdfPath);
      });
      stream.on('error', reject);
    } catch (err) {
      console.error('❌ Error generando PDF:', err);
      reject(err);
    }
  });
}

module.exports = { generateMaintenancePDF };


