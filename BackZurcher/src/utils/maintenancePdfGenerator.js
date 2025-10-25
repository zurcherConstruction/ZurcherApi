const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { format, parseISO } = require('date-fns');

// Constantes de diseño
const PAGE_MARGIN = 50;
const PRIMARY_COLOR = '#063260';
const TEXT_COLOR = '#333333';
const TEXT_LIGHT = '#666666';
const BORDER_COLOR = '#DDDDDD';
const HEADER_BG = '#F3F4F6';

// Helper para formatear fechas
const formatDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  try {
    const dateObj = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    return format(dateObj, 'MM/dd/yyyy');
  } catch (e) {
    return 'N/A';
  }
};

async function generateMaintenancePDF(visitData) {
  return new Promise((resolve, reject) => {
    try {
      console.log('📊 Generando PDF compacto para visita:', visitData.id);
      
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
        mediaFiles
      } = visitData;

      const doc = new PDFDocument({ 
        margin: PAGE_MARGIN, 
        size: 'LETTER',
        bufferPages: true
      });
      
      const uploadsDir = path.join(__dirname, '../uploads/maintenance_reports');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      
      // Nombre del archivo con dirección
      const propertyAddress = work?.propertyAddress || 'unknown';
      const safeAddress = propertyAddress.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `maintenance_${safeAddress}_${formatDate(actual_visit_date).replace(/\//g, '-')}.pdf`;
      const pdfPath = path.join(uploadsDir, fileName);
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      const contentWidth = doc.page.width - PAGE_MARGIN * 2;
      let currentY = PAGE_MARGIN;

      // ===== ENCABEZADO =====
      const logoPath = path.join(__dirname, '../assets/logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, PAGE_MARGIN, currentY, { width: 60 });
      }

      doc.font('Helvetica-Bold').fontSize(18).fillColor(PRIMARY_COLOR)
        .text('MAINTENANCE VISIT REPORT', PAGE_MARGIN + 80, currentY + 5, { align: 'center' });
      
      currentY += 35;
      doc.fontSize(9).fillColor(TEXT_COLOR).font('Helvetica')
        .text('ZURCHER CONSTRUCTION - SEPTIC TANK DIVISION', PAGE_MARGIN, currentY, { align: 'center' });
      currentY += 12;
      doc.fontSize(8).text('CFC1433240 | (407) 419-4495 | zurcherseptic@gmail.com', PAGE_MARGIN, currentY, { align: 'center' });
      
      currentY += 20;
      doc.moveTo(PAGE_MARGIN, currentY).lineTo(doc.page.width - PAGE_MARGIN, currentY)
        .strokeColor(BORDER_COLOR).stroke();
      currentY += 15;

      // ===== INFO GENERAL (COMPACTA) =====
      const colWidth = contentWidth / 2;
      const col1X = PAGE_MARGIN;
      const col2X = PAGE_MARGIN + colWidth;

      // Columna 1
      doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT_COLOR);
      doc.text('Visit #:', col1X, currentY, { continued: true, width: 60 });
      doc.font('Helvetica').fillColor(TEXT_LIGHT).text(visit_number || id?.substring(0, 8) || 'N/A', { width: colWidth - 60 });
      currentY += 14;

      doc.font('Helvetica-Bold').fillColor(TEXT_COLOR);
      doc.text('Property:', col1X, currentY, { width: colWidth });
      currentY += 11;
      doc.font('Helvetica').fontSize(8).fillColor(TEXT_LIGHT);
      doc.text(work?.propertyAddress || 'N/A', col1X + 5, currentY, { width: colWidth - 10 });
      currentY += 18;

      doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT_COLOR);
      doc.text('Client:', col1X, currentY, { continued: true, width: 60 });
      doc.font('Helvetica').fillColor(TEXT_LIGHT).text(work?.Permit?.applicantName || 'N/A', { width: colWidth - 60 });
      currentY += 14;

      doc.font('Helvetica-Bold').fillColor(TEXT_COLOR);
      doc.text('Worker:', col1X, currentY, { continued: true, width: 60 });
      doc.font('Helvetica').fillColor(TEXT_LIGHT).text(completedByStaff?.name || assignedStaff?.name || 'N/A', { width: colWidth - 60 });

      // Columna 2
      let col2Y = currentY - (14 * 3) - 18;
      doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT_COLOR);
      doc.text('Status:', col2X, col2Y, { continued: true, width: 70 });
      const statusColor = status === 'completed' ? '#059669' : status === 'assigned' ? '#F59E0B' : '#6B7280';
      doc.font('Helvetica-Bold').fillColor(statusColor)
        .text((status || 'N/A').toUpperCase(), { width: colWidth - 70 });
      col2Y += 14;

      doc.font('Helvetica-Bold').fillColor(TEXT_COLOR);
      doc.text('Scheduled:', col2X, col2Y, { continued: true, width: 70 });
      doc.font('Helvetica').fillColor(TEXT_LIGHT).text(formatDate(scheduled_date), { width: colWidth - 70 });
      col2Y += 14;

      doc.font('Helvetica-Bold').fillColor(TEXT_COLOR);
      doc.text('Completed:', col2X, col2Y, { continued: true, width: 70 });
      doc.font('Helvetica').fillColor(TEXT_LIGHT).text(formatDate(actual_visit_date), { width: colWidth - 70 });
      col2Y += 14;

      doc.font('Helvetica-Bold').fillColor(TEXT_COLOR);
      doc.text('System:', col2X, col2Y, { continued: true, width: 70 });
      doc.font('Helvetica').fontSize(8).fillColor(TEXT_LIGHT).text(work?.Permit?.systemType || 'N/A', { width: colWidth - 70 });

      currentY += 25;
      doc.moveTo(PAGE_MARGIN, currentY).lineTo(doc.page.width - PAGE_MARGIN, currentY)
        .strokeColor(BORDER_COLOR).stroke();
      currentY += 12;

      // ===== NIVELES (SI EXISTEN) =====
      if (level_inlet || level_outlet) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor(PRIMARY_COLOR)
          .text('TANK LEVELS', PAGE_MARGIN, currentY);
        currentY += 15;

        doc.fontSize(9).font('Helvetica').fillColor(TEXT_COLOR);
        const levelCol1 = col1X;
        const levelCol2 = col2X;
        
        if (level_inlet) {
          doc.font('Helvetica-Bold').text('Inlet Level:', levelCol1, currentY, { continued: true, width: 80 });
          doc.font('Helvetica').fillColor(TEXT_LIGHT).text(` ${level_inlet} inches`, { width: colWidth - 80 });
        }
        if (level_outlet) {
          doc.fillColor(TEXT_COLOR).font('Helvetica-Bold')
            .text('Outlet Level:', levelCol2, currentY, { continued: true, width: 80 });
          doc.font('Helvetica').fillColor(TEXT_LIGHT).text(` ${level_outlet} inches`, { width: colWidth - 80 });
        }
        currentY += 18;
      }

      // ===== INSPECCIÓN GENERAL =====
      doc.fontSize(11).font('Helvetica-Bold').fillColor(PRIMARY_COLOR)
        .text('GENERAL INSPECTION', PAGE_MARGIN, currentY);
      currentY += 15;

      const inspectionItems = [
        { label: 'Strong Odors', value: strong_odors, notes: strong_odors_notes },
        { label: 'Water Level OK', value: water_level_ok, notes: water_level_notes },
        { label: 'Visible Leaks', value: visible_leaks, notes: visible_leaks_notes },
        { label: 'Area Around Dry', value: area_around_dry, notes: area_around_notes },
        { label: 'Green Cap Inspected', value: cap_green_inspected, notes: cap_green_notes },
        { label: 'Needs Pumping', value: needs_pumping, notes: null }
      ];

      currentY = drawCompactChecklist(doc, currentY, inspectionItems, contentWidth);

      // ===== ATU SYSTEM (SI APLICA) =====
      const hasATU = blower_working !== undefined || blower_filter_clean !== undefined;
      if (hasATU) {
        currentY += 8;
        doc.fontSize(11).font('Helvetica-Bold').fillColor(PRIMARY_COLOR)
          .text('ATU SYSTEM', PAGE_MARGIN, currentY);
        currentY += 15;

        const atuItems = [
          { label: 'Blower Working', value: blower_working, notes: blower_working_notes },
          { label: 'Blower Filter Clean', value: blower_filter_clean, notes: blower_filter_notes },
          { label: 'Diffusers Bubbling', value: diffusers_bubbling, notes: diffusers_bubbling_notes },
          { label: 'Discharge Pump OK', value: discharge_pump_ok, notes: discharge_pump_notes },
          { label: 'Clarified Water Outlet', value: clarified_water_outlet, notes: clarified_water_notes }
        ];

        currentY = drawCompactChecklist(doc, currentY, atuItems, contentWidth);
      }

      // ===== LIFT STATION (SI APLICA) =====
      const hasLift = alarm_panel_working !== undefined || pump_working !== undefined;
      if (hasLift) {
        currentY += 8;
        doc.fontSize(11).font('Helvetica-Bold').fillColor(PRIMARY_COLOR)
          .text('LIFT STATION', PAGE_MARGIN, currentY);
        currentY += 15;

        const liftItems = [
          { label: 'Alarm Panel Working', value: alarm_panel_working, notes: alarm_panel_notes },
          { label: 'Pump Working', value: pump_working, notes: pump_working_notes },
          { label: 'Float Switch Good', value: float_switch_good, notes: float_switch_notes }
        ];

        currentY = drawCompactChecklist(doc, currentY, liftItems, contentWidth);
      }

      // ===== PBTS/ATU SAMPLES =====
      if (well_points_quantity) {
        currentY += 8;
        doc.fontSize(11).font('Helvetica-Bold').fillColor(PRIMARY_COLOR)
          .text('PBTS/ATU WELL SAMPLES', PAGE_MARGIN, currentY);
        currentY += 15;

        doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT_COLOR);
        doc.text('Well Points Quantity:', PAGE_MARGIN, currentY, { continued: true, width: 130 });
        doc.font('Helvetica').fillColor(TEXT_LIGHT).text(` ${well_points_quantity}`, { width: 100 });
        currentY += 15;

        const samples = [well_sample_1_url, well_sample_2_url, well_sample_3_url].filter(Boolean);
        if (samples.length > 0) {
          doc.fontSize(8).fillColor(TEXT_LIGHT);
          doc.text(`✓ ${samples.length} sample photo${samples.length > 1 ? 's' : ''} attached to this visit`, PAGE_MARGIN, currentY);
          currentY += 12;
        }
      }

      // ===== NOTAS GENERALES =====
      if (general_notes && general_notes.trim()) {
        if (currentY > doc.page.height - 150) {
          doc.addPage();
          currentY = PAGE_MARGIN;
        }
        currentY += 10;
        doc.fontSize(11).font('Helvetica-Bold').fillColor(PRIMARY_COLOR)
          .text('ADDITIONAL NOTES', PAGE_MARGIN, currentY);
        currentY += 15;

        doc.fontSize(9).font('Helvetica').fillColor(TEXT_COLOR)
          .text(general_notes, PAGE_MARGIN, currentY, { width: contentWidth, align: 'justify', lineGap: 2 });
        currentY = doc.y + 15;
      }

      // ===== ARCHIVOS ADJUNTOS =====
      if (mediaFiles && mediaFiles.length > 0) {
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = PAGE_MARGIN;
        }
        currentY += 10;
        doc.fontSize(11).font('Helvetica-Bold').fillColor(PRIMARY_COLOR)
          .text('ATTACHED FILES', PAGE_MARGIN, currentY);
        currentY += 15;

        doc.fontSize(9).font('Helvetica').fillColor(TEXT_COLOR);
        doc.text(`✓ ${mediaFiles.length} file${mediaFiles.length > 1 ? 's' : ''} (photos/videos) attached to this maintenance visit`, PAGE_MARGIN, currentY);
        currentY += 18;
      }

      // ===== FIRMA =====
      if (worker_signature_url) {
        if (currentY > doc.page.height - 120) {
          doc.addPage();
          currentY = PAGE_MARGIN;
        }
        currentY += 10;
        doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT_COLOR)
          .text('Worker Signature:', PAGE_MARGIN, currentY);
        currentY += 5;
        doc.fontSize(7).font('Helvetica').fillColor(TEXT_LIGHT)
          .text('Digital signature on file', PAGE_MARGIN, currentY);
        currentY += 15;
      }

      // ===== PIE DE PÁGINA =====
      const footerY = doc.page.height - 40;
      doc.fontSize(7).font('Helvetica').fillColor(TEXT_LIGHT);
      doc.text(
        `Generated on ${formatDate(new Date())} | Zurcher Construction - Septic Tank Division`,
        PAGE_MARGIN,
        footerY,
        { width: contentWidth, align: 'center' }
      );

      doc.end();

      stream.on('finish', () => {
        console.log(`✅ PDF de mantenimiento generado: ${pdfPath}`);
        resolve(pdfPath);
      });

      stream.on('error', (err) => {
        console.error('❌ Error al escribir PDF:', err);
        reject(err);
      });

    } catch (error) {
      console.error('❌ Error al generar PDF de mantenimiento:', error);
      reject(error);
    }
  });
}

// Helper para dibujar checklist compacto
function drawCompactChecklist(doc, startY, items, contentWidth) {
  const colWidth = contentWidth / 2 - 10;
  const col1X = PAGE_MARGIN;
  const col2X = PAGE_MARGIN + colWidth + 20;
  let currentY = startY;
  let leftColY = startY;
  let rightColY = startY;
  let colIndex = 0;

  doc.fontSize(8).font('Helvetica');

  items.forEach((item) => {
    // Skip si no hay datos relevantes
    if (item.value === undefined && item.value !== false && !item.notes) return;

    const useLeftCol = colIndex % 2 === 0;
    const colX = useLeftCol ? col1X : col2X;
    const itemY = useLeftCol ? leftColY : rightColY;

    // Determinar el símbolo y color
    let symbol = '□';
    let symbolColor = TEXT_LIGHT;
    let valueText = '';

    if (item.value === true || item.value === 'true' || item.value === 'yes') {
      symbol = '☑';
      symbolColor = '#059669'; // Verde
      valueText = 'YES';
    } else if (item.value === false || item.value === 'false' || item.value === 'no') {
      symbol = '☐';
      symbolColor = '#DC2626'; // Rojo
      valueText = 'NO';
    } else if (item.value === 'ok' || item.value === 'good') {
      symbol = '☑';
      symbolColor = '#059669';
      valueText = 'OK';
    } else if (item.value === 'p' || item.value === 'poor' || item.value === 'needs_attention') {
      symbol = '⚠';
      symbolColor = '#F59E0B'; // Amarillo
      valueText = 'ATTENTION';
    } else if (item.value) {
      valueText = String(item.value).toUpperCase();
    }

    // Símbolo
    doc.fontSize(10).fillColor(symbolColor).text(symbol, colX, itemY);

    // Label
    doc.fontSize(8).fillColor(TEXT_COLOR)
      .text(item.label, colX + 15, itemY + 1, { width: colWidth - 15, continued: true });
    
    // Value (si existe y es diferente del símbolo)
    if (valueText) {
      doc.fontSize(7).fillColor(symbolColor)
        .text(` (${valueText})`, { width: colWidth - 15 });
    } else {
      doc.text('');
    }

    let noteY = doc.y;

    // Notes (si existen)
    if (item.notes && item.notes.trim()) {
      doc.fontSize(7).fillColor(TEXT_LIGHT)
        .text(`   → ${item.notes}`, colX + 15, noteY, { width: colWidth - 15 });
      noteY = doc.y;
    }

    // Actualizar la posición Y de la columna correspondiente
    if (useLeftCol) {
      leftColY = noteY + 8;
    } else {
      rightColY = noteY + 8;
    }

    colIndex++;
  });

  // Retornar el Y más alto de ambas columnas
  return Math.max(leftColY, rightColY);
}

module.exports = { generateMaintenancePDF };
