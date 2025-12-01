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

// === Descarga de imágenes con caché en memoria ===
const imageCache = new Map(); // Cache para evitar descargar la misma imagen múltiples veces

async function downloadImageToBuffer(url) {
  // Verificar si ya está en caché
  if (imageCache.has(url)) {
    return imageCache.get(url);
  }
  
  try {
    const response = await axios({ url, responseType: 'arraybuffer', timeout: 10000 });
    const buffer = Buffer.from(response.data);
    imageCache.set(url, buffer); // Guardar en caché
    return buffer;
  } catch (error) {
    console.warn(`⚠️ Error descargando imagen ${url}:`, error.message);
    return null;
  }
}

async function generateMaintenancePDF(visitData) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('📋 Generando PDF de mantenimiento con estilo mejorado...');

      const {
        id,
        visit_number,
        visitNumber, // Sequelize usa camelCase
        scheduled_date,
        scheduledDate, // Sequelize usa camelCase
        actual_visit_date,
        actualVisitDate, // Sequelize usa camelCase
        status,
        work,
        assignedStaff,
        completedByStaff,
        // Niveles del tanque (nuevos)
        tank_inlet_level,
        tank_inlet_notes,
        tank_outlet_level,
        tank_outlet_notes,
        // Niveles (legacy)
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
        septic_access_clear,
        septic_access_notes,
        cap_green_inspected,
        cap_green_notes,
        needs_pumping,
        needs_pumping_notes,
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
        alarm_test,
        alarm_test_notes,
        // Lift Station (nuevos)
        pump_running,
        pump_running_notes,
        float_switches,
        float_switches_notes,
        alarm_working,
        alarm_working_notes,
        pump_condition,
        pump_condition_notes,
        // Lift Station (legacy)
        alarm_panel_working,
        alarm_panel_notes,
        pump_working,
        pump_working_notes,
        float_switch_good,
        float_switch_notes,
        // PBTS/ATU
        well_points_quantity,
        well_sample_1_url,
        well_sample_1_observations,
        well_sample_1_notes,
        well_sample_2_url,
        well_sample_2_observations,
        well_sample_2_notes,
        well_sample_3_url,
        well_sample_3_observations,
        well_sample_3_notes,
        system_video_url,
        // Generales
        general_notes,
        worker_signature_url,
        mediaFiles = []
      } = visitData;

      // 🆕 Organizar imágenes por campo - Descargar a buffers con caché
      const imagesByField = {}; // { fieldName: [{ buffer, url }] }
      const generalImages = [];
      
      console.log(`📥 Descargando ${mediaFiles.length} imágenes...`);
      
      for (const item of mediaFiles) {
        const url = typeof item === 'string' ? item : item.mediaUrl || item.url;
        const fieldName = typeof item === 'string' ? 'general' : item.fieldName || 'general';
        
        if (!url) continue;
        
        const buffer = await downloadImageToBuffer(url);
        if (!buffer) continue; // Saltar si falló la descarga
        
        const imageData = { buffer, url }; // Guardar buffer y URL (para enlaces)
        
        if (fieldName === 'general' || fieldName === 'system_overview_video') {
          generalImages.push({ ...imageData, label: fieldName });
        } else {
          if (!imagesByField[fieldName]) imagesByField[fieldName] = [];
          imagesByField[fieldName].push(imageData);
        }
      }
      
      console.log(`✅ Imágenes descargadas. Cache: ${imageCache.size} imágenes únicas`);


      const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'LETTER' });

      const outputDir = path.join(__dirname, '../uploads/maintenance_reports');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      // Usar camelCase de Sequelize o snake_case como fallback
      const actualDate = actualVisitDate || actual_visit_date;
      
      const safeAddress = (work?.propertyAddress || 'unknown').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `maintenance_${safeAddress}_${formatDate(actualDate).replace(/\//g, '-')}.pdf`;
      const pdfPath = path.join(outputDir, fileName);
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // === ENCABEZADO SIMPLIFICADO ===
      const visitNum = visitNumber || visit_number || 'N/A';
      const rightX = doc.page.width - PAGE_MARGIN - 200;

      const logoPath = path.join(__dirname, '../assets/logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, PAGE_MARGIN, PAGE_MARGIN + 5, { width: 60 });
      }

      
      
      // Información del lado derecho - alineada con el logo
      doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_COLOR);
      doc.text(`Mantenimiento: `, rightX, PAGE_MARGIN + 15, { continued: true })
        .font('Helvetica').fillColor('#DC2626').text(`N° ${visitNum}`);
      
      doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_COLOR);
      doc.text(`Realizada: `, rightX, PAGE_MARGIN + 30, { continued: true })
        .font('Helvetica').text(formatDate(actualDate));
      
      doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_COLOR);
      doc.text(`Propiedad: `, rightX, PAGE_MARGIN + 45, { continued: true })
        .font('Helvetica').text(work?.propertyAddress || 'N/A', { width: 200 });

      let y = PAGE_MARGIN + 70;

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
        y += 18;
        
        // Agregar encabezados de columnas de la tabla
        const colWidths = {
          question: 280,
          result: 70,
          images: 162
        };
        
        const startX = PAGE_MARGIN;
        const headerHeight = 16;
        
        // Fila de encabezados
        doc.rect(startX, y, doc.page.width - PAGE_MARGIN * 2, headerHeight)
          .fillAndStroke('#F3F4F6', BORDER_COLOR);
        
        // Encabezado "INSPECCIÓN"
        doc.font('Helvetica-Bold').fontSize(7).fillColor(TEXT_COLOR);
        doc.text('INSPECCIÓN', startX + 5, y + 4, { width: colWidths.question - 10 });
        
        // Línea divisoria vertical
        const resultX = startX + colWidths.question;
        doc.moveTo(resultX, y)
          .lineTo(resultX, y + headerHeight)
          .strokeColor(BORDER_COLOR)
          .stroke();
        
        // Encabezado "RESULTADO"
        doc.text('RESULTADO', resultX + 8, y + 4, { width: colWidths.result - 16, align: 'center' });
        
        // Línea divisoria vertical
        const imagesX = resultX + colWidths.result;
        doc.moveTo(imagesX, y)
          .lineTo(imagesX, y + headerHeight)
          .strokeColor(BORDER_COLOR)
          .stroke();
        
        // Encabezado "EVIDENCIA"
        doc.text('EVIDENCIA', imagesX + 5, y + 4, { width: colWidths.images - 10 });
        
        y += headerHeight;
      };

      const drawRow = (label, value, notes = '', fieldImages = []) => {
        const colWidths = {
          question: 280,
          result: 70,
          images: 162
        };
        
        const baseRowHeight = 22;
        let rowHeight = baseRowHeight;
        
        // Calcular altura necesaria para observaciones e imágenes
        const hasNotes = notes && notes.trim().length > 0;
        const hasImages = fieldImages && fieldImages.length > 0;
        
        if (hasNotes) rowHeight += 20; // Espacio para observaciones
        if (hasImages) rowHeight = Math.max(rowHeight, 40); // Más altura para miniaturas

        // Verificar si necesitamos nueva página
        if (y + rowHeight > doc.page.height - PAGE_MARGIN) {
          doc.addPage();
          y = PAGE_MARGIN;
        }

        // Determinar respuesta
        let result = 'N/A';
        let resultColor = TEXT_COLOR;
        
        if (value === true || value === 'yes') {
          result = 'SI';
          resultColor = '#059669'; // Verde
        } else if (value === false || value === 'no') {
          result = 'NO';
          resultColor = '#DC2626'; // Rojo
        }

        // Dibujar fila de la tabla
        const startX = PAGE_MARGIN;
        doc.rect(startX, y, doc.page.width - PAGE_MARGIN * 2, rowHeight)
          .strokeColor(BORDER_COLOR).stroke();

        // Columna 1: Pregunta
        doc.font('Helvetica').fontSize(8).fillColor(TEXT_COLOR);
        doc.text(label, startX + 5, y + 6, { width: colWidths.question - 10 });
        
        // Línea divisoria vertical después de pregunta
        const resultX = startX + colWidths.question;
        doc.moveTo(resultX, y)
          .lineTo(resultX, y + rowHeight)
          .strokeColor(BORDER_COLOR)
          .stroke();
        
        // Columna 2: Resultado (SI/NO)
        doc.font('Helvetica-Bold').fontSize(9).fillColor(resultColor);
        doc.text(result, resultX + 8, y + 6, { width: colWidths.result - 16, align: 'center' });
        
        // Línea divisoria vertical después de resultado
        const imagesX = resultX + colWidths.result;
        doc.moveTo(imagesX, y)
          .lineTo(imagesX, y + rowHeight)
          .strokeColor(BORDER_COLOR)
          .stroke();
        
        // Columna 3: Imágenes (miniaturas)
        if (hasImages) {
          const thumbSize = 28;
          const thumbSpacing = 4;
          let thumbX = imagesX + 8;
          
          for (let i = 0; i < Math.min(fieldImages.length, 4); i++) {
            try {
              const imageData = fieldImages[i];
              const imageBuffer = imageData.buffer;
              const imageUrl = imageData.url;
              
              if (!imageBuffer) continue;
              
              // Dibujar miniatura
              doc.image(imageBuffer, thumbX, y + 5, { 
                width: thumbSize, 
                height: thumbSize,
                fit: [thumbSize, thumbSize]
              });
              doc.rect(thumbX, y + 5, thumbSize, thumbSize).strokeColor('#DDD').stroke();
              
              // Enlace "Ver" debajo
              doc.fontSize(5).fillColor('#2563EB')
                .text('Ver', thumbX, y + thumbSize + 7, { 
                  width: thumbSize, 
                  align: 'center',
                  link: imageUrl,
                  underline: true
                });
              
              thumbX += thumbSize + thumbSpacing;
            } catch (err) {
              console.warn(`⚠️ Error rendering thumbnail: ${err.message}`);
            }
          }
          
          // Indicador de más imágenes
          if (fieldImages.length > 4) {
            doc.fontSize(6).fillColor(TEXT_LIGHT).text(
              `+${fieldImages.length - 4}`, 
              thumbX, 
              y + 14
            );
          }
        }
        
        // Observaciones DEBAJO de la fila (usando todo el ancho)
        if (hasNotes) {
          doc.fillColor(TEXT_LIGHT).fontSize(7).text(
            `Observaciones: ${notes}`, 
            startX + 5, 
            y + baseRowHeight + 2, 
            { width: doc.page.width - PAGE_MARGIN * 2 - 10 }
          );
        }
        
        y += rowHeight;
      };

      // === NIVELES ===
      if (tank_inlet_level || tank_outlet_level || level_inlet || level_outlet) {
        drawSectionTitle('Niveles del Tanque');
        
        // Usar formato de tabla para niveles
        const colWidths = { question: 280, result: 70, images: 162 };
        const startX = PAGE_MARGIN;
        
        if (tank_inlet_level || level_inlet) {
          const level = tank_inlet_level || level_inlet;
          const notes = tank_inlet_notes || '';
          const rowHeight = notes ? 40 : 22;
          
          if (y + rowHeight > doc.page.height - PAGE_MARGIN) {
            doc.addPage();
            y = PAGE_MARGIN;
          }
          
          doc.rect(startX, y, doc.page.width - PAGE_MARGIN * 2, rowHeight).strokeColor(BORDER_COLOR).stroke();
          
          doc.font('Helvetica').fontSize(8).fillColor(TEXT_COLOR);
          doc.text('Nivel Entrada:', startX + 5, y + 6, { width: colWidths.question - 10 });
          
          const resultX = startX + colWidths.question;
          doc.moveTo(resultX, y).lineTo(resultX, y + rowHeight).strokeColor(BORDER_COLOR).stroke();
          
          doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_COLOR);
          doc.text(level, resultX + 8, y + 6, { width: colWidths.result - 16, align: 'center' });
          
          const imagesX = resultX + colWidths.result;
          doc.moveTo(imagesX, y).lineTo(imagesX, y + rowHeight).strokeColor(BORDER_COLOR).stroke();
          
          if (notes) {
            doc.fontSize(7).fillColor(TEXT_LIGHT).text(`Observaciones: ${notes}`, startX + 5, y + 24, { width: doc.page.width - PAGE_MARGIN * 2 - 10 });
          }
          
          y += rowHeight;
        }
        
        if (tank_outlet_level || level_outlet) {
          const level = tank_outlet_level || level_outlet;
          const notes = tank_outlet_notes || '';
          const rowHeight = notes ? 40 : 22;
          
          if (y + rowHeight > doc.page.height - PAGE_MARGIN) {
            doc.addPage();
            y = PAGE_MARGIN;
          }
          
          doc.rect(startX, y, doc.page.width - PAGE_MARGIN * 2, rowHeight).strokeColor(BORDER_COLOR).stroke();
          
          doc.font('Helvetica').fontSize(8).fillColor(TEXT_COLOR);
          doc.text('Nivel Salida:', startX + 5, y + 6, { width: colWidths.question - 10 });
          
          const resultX = startX + colWidths.question;
          doc.moveTo(resultX, y).lineTo(resultX, y + rowHeight).strokeColor(BORDER_COLOR).stroke();
          
          doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_COLOR);
          doc.text(level, resultX + 8, y + 6, { width: colWidths.result - 16, align: 'center' });
          
          const imagesX = resultX + colWidths.result;
          doc.moveTo(imagesX, y).lineTo(imagesX, y + rowHeight).strokeColor(BORDER_COLOR).stroke();
          
          if (notes) {
            doc.fontSize(7).fillColor(TEXT_LIGHT).text(`Observaciones: ${notes}`, startX + 5, y + 24, { width: doc.page.width - PAGE_MARGIN * 2 - 10 });
          }
          
          y += rowHeight;
        }
        
        y += 10;
      }

      // === INSPECCIÓN GENERAL ===
      drawSectionTitle('Inspección General');
      drawRow('¿Olores fuertes?', strong_odors, strong_odors_notes, imagesByField.strong_odors || []);
      drawRow('¿Nivel de agua correcto?', water_level_ok, water_level_notes, imagesByField.water_level_ok || []);
      drawRow('¿Fugas visibles?', visible_leaks, visible_leaks_notes, imagesByField.visible_leaks || []);
      drawRow('¿Área alrededor seca?', area_around_dry, area_around_notes, imagesByField.area_around_dry || []);
      //drawRow('¿Acceso al séptico despejado?', septic_access_clear, septic_access_notes, imagesByField.septic_access_clear || []);
      drawRow('¿T de inspección cap verde?', cap_green_inspected, cap_green_notes, imagesByField.cap_green_inspected || []);
      drawRow('¿Necesita bombeo?', needs_pumping, needs_pumping_notes, imagesByField.needs_pumping || []);
      y += 15;

      // === SISTEMA ATU ===
      drawSectionTitle('Sistema ATU');
      drawRow('¿Blower funcionando?', blower_working, blower_working_notes, imagesByField.blower_working || []);
      drawRow('¿Filtro del Blower limpio?', blower_filter_clean, blower_filter_notes, imagesByField.blower_filter_clean || []);
      drawRow('¿Difusores burbujeando?', diffusers_bubbling, diffusers_bubbling_notes, imagesByField.diffusers_bubbling || []);
      drawRow('¿Bomba de descarga OK?', discharge_pump_ok, discharge_pump_notes, imagesByField.discharge_pump_ok || []);
      drawRow('¿Agua clarificada salida tanque?', clarified_water_outlet, clarified_water_notes, imagesByField.clarified_water_outlet || []);
      drawRow('¿Prueba de alarma?', alarm_test, alarm_test_notes, imagesByField.alarm_test || []);
      y += 15;

      // === LIFT STATION ===
      if (pump_running !== undefined || float_switches !== undefined || alarm_working !== undefined || 
          pump_condition !== undefined || alarm_panel_working !== undefined || pump_working !== undefined) {
        drawSectionTitle('Lift Station');
        
        // Usar campos nuevos primero, si no existen usar legacy
        drawRow('¿Bomba funcionando?', pump_running !== undefined ? pump_running : pump_working, 
                pump_running_notes || pump_working_notes, 
                imagesByField.pump_running || imagesByField.pump_working || []);
        
        drawRow('¿Flotantes en buena condición?', float_switches !== undefined ? float_switches : float_switch_good, 
                float_switches_notes || float_switch_notes, 
                imagesByField.float_switches || imagesByField.float_switch_good || []);
        
        drawRow('¿Panel de alarma funcionando?', alarm_working !== undefined ? alarm_working : alarm_panel_working, 
                alarm_working_notes || alarm_panel_notes, 
                imagesByField.alarm_working || imagesByField.alarm_panel_working || []);
        
        
        
        y += 15;
      }

      // === PBTS / ATU - Muestras individuales ===
      if (well_points_quantity || well_sample_1_url || well_sample_2_url || well_sample_3_url) {
        drawSectionTitle('Muestras PBTS / ATU');
        
        // Usar formato de tabla para Well Points
        const colWidths = { question: 280, result: 70, images: 162 };
        const startX = PAGE_MARGIN;
        
        if (well_points_quantity) {
          const rowHeight = 22;
          
          if (y + rowHeight > doc.page.height - PAGE_MARGIN) {
            doc.addPage();
            y = PAGE_MARGIN;
          }
          
          doc.rect(startX, y, doc.page.width - PAGE_MARGIN * 2, rowHeight).strokeColor(BORDER_COLOR).stroke();
          
          doc.font('Helvetica').fontSize(8).fillColor(TEXT_COLOR);
          doc.text('Total de Well Points:', startX + 5, y + 6, { width: colWidths.question - 10 });
          
          const resultX = startX + colWidths.question;
          doc.moveTo(resultX, y).lineTo(resultX, y + rowHeight).strokeColor(BORDER_COLOR).stroke();
          
          doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_COLOR);
          doc.text(well_points_quantity.toString(), resultX + 8, y + 6, { width: colWidths.result - 16, align: 'center' });
          
          const imagesX = resultX + colWidths.result;
          doc.moveTo(imagesX, y).lineTo(imagesX, y + rowHeight).strokeColor(BORDER_COLOR).stroke();
          
          y += rowHeight + 15;
        }
        
        // Mostrar muestras con sus observaciones
        const samples = [
          { 
            url: well_sample_1_url, 
            label: 'Muestra 1',
            observations: well_sample_1_observations,
            notes: well_sample_1_notes
          },
          { 
            url: well_sample_2_url, 
            label: 'Muestra 2',
            observations: well_sample_2_observations,
            notes: well_sample_2_notes
          },
          { 
            url: well_sample_3_url, 
            label: 'Muestra 3',
            observations: well_sample_3_observations,
            notes: well_sample_3_notes
          }
        ].filter(s => s.url); // Solo muestras que tienen URL
        
        if (samples.length > 0) {
          // Verificar si necesitamos nueva página
          if (y > doc.page.height - 250) {
            doc.addPage();
            y = PAGE_MARGIN;
          }
          
          const thumbSize = 90;
          const spacing = 15;
          const sampleStartX = PAGE_MARGIN + 20;
          let x = sampleStartX;
          
          // Calcular altura máxima necesaria para observaciones
          let maxObservationsHeight = 0;
          for (const sample of samples) {
            if (sample.observations || sample.notes) {
              const textHeight = doc.heightOfString(sample.observations || sample.notes || '', { 
                width: thumbSize + 40,
                fontSize: 8
              });
              maxObservationsHeight = Math.max(maxObservationsHeight, textHeight);
            }
          }
          
          for (let i = 0; i < samples.length; i++) {
            const sample = samples[i];
            
            try {
              // Descargar imagen a buffer
              const buffer = await downloadImageToBuffer(sample.url);
              if (!buffer) throw new Error('No se pudo descargar la imagen');
              
              // Label arriba de la imagen
              doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_COLOR);
              doc.text(sample.label, x, y, { width: thumbSize, align: 'center' });
              
              // Imagen
              doc.image(buffer, x, y + 12, { 
                width: thumbSize, 
                height: thumbSize,
                fit: [thumbSize, thumbSize]
              });
              doc.rect(x, y + 12, thumbSize, thumbSize).strokeColor('#DDD').stroke();
              
              // Link "Ver imagen" debajo
              doc.fontSize(7).fillColor('#0066CC')
                .text('Ver imagen', x, y + thumbSize + 16, { 
                  width: thumbSize,
                  align: 'center',
                  link: sample.url,
                  underline: true 
                });
              
              // Observaciones debajo del link
              if (sample.observations || sample.notes) {
                const observationsY = y + thumbSize + 28;
                doc.font('Helvetica-Bold').fontSize(7).fillColor(TEXT_COLOR);
                doc.text('Observaciones:', x, observationsY, { width: thumbSize + 40 });
                
                doc.font('Helvetica').fontSize(7).fillColor(TEXT_LIGHT);
                doc.text(sample.observations || sample.notes || '', x, observationsY + 10, { 
                  width: thumbSize + 40,
                  align: 'left'
                });
              }
              
            } catch (err) {
              console.warn(`⚠️ Error mostrando imagen: ${sample.url}`);
              doc.font('Helvetica-Oblique').fontSize(7).fillColor(TEXT_LIGHT);
              doc.text(`${sample.label}:\nNo disponible`, x, y + 12, { width: thumbSize, align: 'center' });
              
              // Aún así mostrar link
              doc.fontSize(7).fillColor('#0066CC')
                .text('Ver en línea', x, y + 40, { 
                  width: thumbSize,
                  align: 'center',
                  link: sample.url,
                  underline: true 
                });
              
              // Observaciones incluso si la imagen falló
              if (sample.observations || sample.notes) {
                const observationsY = y + 55;
                doc.font('Helvetica-Bold').fontSize(7).fillColor(TEXT_COLOR);
                doc.text('Observaciones:', x, observationsY, { width: thumbSize + 40 });
                
                doc.font('Helvetica').fontSize(7).fillColor(TEXT_LIGHT);
                doc.text(sample.observations || sample.notes || '', x, observationsY + 10, { 
                  width: thumbSize + 40,
                  align: 'left'
                });
              }
            }
            
            x += thumbSize + spacing + 40; // Más espacio para las observaciones
          }
          
          y += thumbSize + 40 + maxObservationsHeight + 20; // Avanzar después de todas las muestras + observaciones
        }
      }

      // === NOTAS GENERALES ===
      if (general_notes) {
        // Verificar si necesitamos nueva página
        if (y > doc.page.height - 150) {
          doc.addPage();
          y = PAGE_MARGIN;
        }
        
        drawSectionTitle('Notas Adicionales');
        
        // Usar formato de tabla
        const colWidths = { question: 280, result: 70, images: 162 };
        const startX = PAGE_MARGIN;
        const textHeight = doc.heightOfString(general_notes, { width: doc.page.width - PAGE_MARGIN * 2 - 10, fontSize: 8 });
        const rowHeight = Math.max(40, textHeight + 12);
        
        if (y + rowHeight > doc.page.height - PAGE_MARGIN) {
          doc.addPage();
          y = PAGE_MARGIN;
        }
        
        doc.rect(startX, y, doc.page.width - PAGE_MARGIN * 2, rowHeight).strokeColor(BORDER_COLOR).stroke();
        
        doc.font('Helvetica').fontSize(8).fillColor(TEXT_COLOR);
        doc.text(general_notes, startX + 5, y + 6, { width: doc.page.width - PAGE_MARGIN * 2 - 10, align: 'justify' });
        
        y += rowHeight + 15;
      }

      // === VIDEO DEL SISTEMA ===
      if (system_video_url) {
        // Verificar si necesitamos nueva página
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = PAGE_MARGIN;
        }
        
        drawSectionTitle('Video del Sistema');
        
        // Usar formato de tabla
        const colWidths = { question: 280, result: 70, images: 162 };
        const startX = PAGE_MARGIN;
        const rowHeight = 30;
        
        if (y + rowHeight > doc.page.height - PAGE_MARGIN) {
          doc.addPage();
          y = PAGE_MARGIN;
        }
        
        doc.rect(startX, y, doc.page.width - PAGE_MARGIN * 2, rowHeight).strokeColor(BORDER_COLOR).stroke();
        
        doc.font('Helvetica').fontSize(8).fillColor(TEXT_COLOR);
        doc.text('Video general del sistema disponible:', startX + 5, y + 6, { width: colWidths.question - 10 });
        
        const resultX = startX + colWidths.question;
        doc.moveTo(resultX, y).lineTo(resultX, y + rowHeight).strokeColor(BORDER_COLOR).stroke();
        
        const imagesX = resultX + colWidths.result;
        doc.moveTo(imagesX, y).lineTo(imagesX, y + rowHeight).strokeColor(BORDER_COLOR).stroke();
        
        // Convertir URL de Cloudinary al formato del player embebido
        // De: https://res.cloudinary.com/CLOUD/video/upload/v123/path/video.mov
        // A:  https://res.cloudinary.com/CLOUD/video/upload/sp_full_hd/path/video
        let playerUrl = system_video_url;
        
        if (system_video_url.includes('cloudinary.com')) {
          // Extraer cloud name y public_id
          const urlParts = system_video_url.match(/cloudinary\.com\/([^\/]+)\/video\/upload\/(.+)/);
          if (urlParts) {
            const cloudName = urlParts[1];
            let publicIdPath = urlParts[2];
            
            // Remover extensión (.mov, .mp4, etc)
            publicIdPath = publicIdPath.replace(/\.[^.]+$/, '');
            // Remover versión si existe (v1234567/)
            publicIdPath = publicIdPath.replace(/^v\d+\//, '');
            
            // Generar URL del player embebido de Cloudinary con formato MP4 y controles
            playerUrl = `https://res.cloudinary.com/${cloudName}/video/upload/f_auto,q_auto,vc_auto/${publicIdPath}.mp4`;
          }
        }
        
        // Link clickeable al video (en la columna de evidencia)
        doc.fontSize(7).fillColor('#0066CC')
          .text('Reproducir Video', imagesX + 8, y + 10, { 
            link: playerUrl,
            underline: true,
            width: colWidths.images - 16
          });
        
        y += rowHeight + 15;
      }

      // === IMÁGENES GENERALES ===
      if (generalImages.length > 0) {
        drawSectionTitle('Fotos Adicionales');
        
        const thumbSize = 120;
        const spacing = 20;
        const perRow = 3;
        let col = 0;

        for (let i = 0; i < generalImages.length; i++) {
          const { buffer, url, label } = generalImages[i];
          const x = PAGE_MARGIN + (col * (thumbSize + spacing));
          
          // Verificar si necesitamos nueva página (imagen + label + link = ~160px)
          if (y > doc.page.height - 210) {
            doc.addPage();
            y = PAGE_MARGIN;
            col = 0;
          }
          
          if (buffer) {
            // Usar buffer de la imagen
            doc.image(buffer, x, y, { width: thumbSize, height: thumbSize, fit: [thumbSize, thumbSize] })
               .rect(x, y, thumbSize, thumbSize).strokeColor('#DDD').stroke();
            
            doc.font('Helvetica').fontSize(8).fillColor(TEXT_COLOR)
               .text(label === 'general' ? `Foto ${i + 1}` : label, x, y + thumbSize + 4, { width: thumbSize, align: 'center' });
            
            // Link para ver imagen completa en Cloudinary
            doc.fontSize(6).fillColor('#0066CC')
              .text('Ver', x, y + thumbSize + 16, { 
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
        drawSectionTitle('Firma del Técnico');
        try {
          const signatureBuffer = await downloadImageToBuffer(worker_signature_url);
          if (signatureBuffer) {
            doc.image(signatureBuffer, PAGE_MARGIN + 100, y, { width: 120 });
          } else {
            throw new Error('No se pudo cargar la firma');
          }
        } catch {
          doc.font('Helvetica-Oblique').fontSize(8).fillColor(TEXT_LIGHT)
            .text('Firma digital disponible en el registro.', PAGE_MARGIN + 10, y + 10);
        }
        y += 50;
      }

      // === FOOTER ===
      const footerY = doc.page.height - 40;
      doc.fontSize(7).font('Helvetica').fillColor(TEXT_LIGHT)
        .text(`Generado el ${formatDate(new Date())} | Zurcher Construction | www.zurcherconstruction.com |`,
          PAGE_MARGIN, footerY, { width: doc.page.width - PAGE_MARGIN * 2, align: 'center' });

      doc.end();

      stream.on('finish', () => {
        console.log(`✅ PDF generado: ${pdfPath}`);
        
        // Limpiar caché de imágenes para liberar memoria
        imageCache.clear();
        console.log('🗑️  Caché de imágenes limpiado');
        
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


