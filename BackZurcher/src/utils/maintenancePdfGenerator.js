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

      // === ENCABEZADO ===
      const logoPath = path.join(__dirname, '../assets/logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, PAGE_MARGIN, PAGE_MARGIN, { width: 70 });
      }

      // Título centrado debajo del logo
      doc.font('Helvetica-Bold').fontSize(14).fillColor(PRIMARY_COLOR)
        .text('REPORTE DE INSPECCIÓN DE MANTENIMIENTO', PAGE_MARGIN, PAGE_MARGIN + 50, { align: 'center' });
      
      // 🆕 Número de visita prominente (usar visitNumber de Sequelize o visit_number como fallback)
      const visitNum = visitNumber || visit_number || 'N/A';
      doc.fontSize(14).fillColor('#DC2626')
        .text(`Visita #${visitNum}`, PAGE_MARGIN, PAGE_MARGIN + 70, { align: 'center' });
      
      doc.fontSize(9).fillColor(TEXT_LIGHT)
        .text('Zurcher Construction ', PAGE_MARGIN, PAGE_MARGIN + 88, { align: 'center' });

      let y = PAGE_MARGIN + 105;

      // === DATOS GENERALES ===
      // Usar camelCase de Sequelize o snake_case como fallback (ya declarado arriba)
      const schedDate = scheduledDate || scheduled_date;
      
      doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_COLOR);
      doc.text(`Programada: `, PAGE_MARGIN, y, { continued: true }).font('Helvetica').text(formatDate(schedDate));
      doc.text(`Realizada: `, PAGE_MARGIN + 220, y, { continued: true }).font('Helvetica').text(formatDate(actualDate));
      y += 12;
      doc.font('Helvetica-Bold').text(`Estado: `, PAGE_MARGIN, y, { continued: true }).font('Helvetica').text((status || 'N/A').toUpperCase());
      doc.text(`Propiedad: `, PAGE_MARGIN + 220, y, { continued: true }).font('Helvetica').text(work?.propertyAddress || 'N/A', { width: 280 });
      y += 12;
      const technicianName = (completedByStaff?.name || assignedStaff?.name || 'N/A').toUpperCase();
      doc.font('Helvetica-Bold').text(`Técnico: `, PAGE_MARGIN, y, { continued: true }).font('Helvetica').text(technicianName);
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
        // Las imágenes ahora van al lado, ajustar altura si hay imágenes
        if (hasImages && !hasNotes) rowHeight = Math.max(rowHeight, 50); // Más altura para el enlace "Ver"

        // Verificar si necesitamos nueva página
        if (y + rowHeight > doc.page.height - PAGE_MARGIN) {
          doc.addPage();
          y = PAGE_MARGIN;
        }

        const yes = (value === true || value === 'yes') ? 'SI' : '';
        const no = (value === false || value === 'no') ? 'NO' : '';

        // Dibujar rectángulo de la fila
        doc.rect(PAGE_MARGIN, y, doc.page.width - PAGE_MARGIN * 2, rowHeight)
          .strokeColor(BORDER_COLOR).stroke();

        // Pregunta
        doc.font('Helvetica').fontSize(8).fillColor(TEXT_COLOR);
        doc.text(label, colX[0] + 3, y + 5, { width: 220 });
        
        // Respuesta SI
        doc.fillColor(yes ? '#059669' : TEXT_COLOR).text(yes, colX[1], y + 5);
        
        // LÍNEA DIVISORIA VERTICAL entre SI y NO
        doc.moveTo(colX[2] - 5, y + 2)
          .lineTo(colX[2] - 5, y + 18)
          .strokeColor('#CCCCCC')
          .stroke();
        
        // Respuesta NO
        doc.fillColor(no ? '#DC2626' : TEXT_COLOR).text(no, colX[2], y + 5);
        
        // Miniaturas en la mitad DERECHA con enlaces "Ver"
        if (hasImages) {
          const thumbSize = 32;
          const thumbSpacing = 3;
          const thumbStartX = colX[3]; // Columna derecha
          let thumbX = thumbStartX;
          
          for (let i = 0; i < Math.min(fieldImages.length, 3); i++) { // Máximo 3 miniaturas en línea
            try {
              const imageData = fieldImages[i];
              const imageBuffer = imageData.buffer;
              const imageUrl = imageData.url;
              
              if (!imageBuffer) continue;
              
              // Dibujar miniatura usando el buffer
              doc.image(imageBuffer, thumbX, y + 3, { 
                width: thumbSize, 
                height: thumbSize,
                fit: [thumbSize, thumbSize]
              });
              doc.rect(thumbX, y + 3, thumbSize, thumbSize).strokeColor('#DDD').stroke();
              
              // Agregar enlace "Ver" debajo de la miniatura (apunta a URL de Cloudinary)
              doc.fontSize(6).fillColor('#2563EB')
                .text('Ver', thumbX, y + thumbSize + 5, { 
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
          
          if (fieldImages.length > 3) {
            doc.fontSize(6).fillColor(TEXT_LIGHT).text(
              `+${fieldImages.length - 3}`, 
              thumbX, 
              y + 18
            );
          }
        }
        
        let currentY = y + 5;
        
        // Mostrar notas DEBAJO (usando toda la fila)
        if (hasNotes) {
          doc.fillColor(TEXT_LIGHT).fontSize(7).text(notes, colX[0] + 3, currentY + 15, { 
            width: doc.page.width - PAGE_MARGIN * 2 - 10 
          });
          currentY += 25;
        }
        
        y += rowHeight;
      };

      // === NIVELES ===
      if (tank_inlet_level || tank_outlet_level || level_inlet || level_outlet) {
        drawSectionTitle('Niveles del Tanque');
        doc.font('Helvetica').fontSize(9).fillColor(TEXT_COLOR);
        if (tank_inlet_level) {
          doc.text(`Nivel Entrada: ${tank_inlet_level}`, PAGE_MARGIN, y);
          if (tank_inlet_notes) {
            doc.fontSize(7).fillColor(TEXT_LIGHT).text(tank_inlet_notes, PAGE_MARGIN + 150, y, { width: 250 });
          }
          y += 15;
        } else if (level_inlet) {
          doc.text(`Nivel Entrada Tanque: ${level_inlet}`, PAGE_MARGIN, y);
          y += 15;
        }
        
        if (tank_outlet_level) {
          doc.fontSize(9).fillColor(TEXT_COLOR).text(`Nivel Salida: ${tank_outlet_level}`, PAGE_MARGIN, y);
          if (tank_outlet_notes) {
            doc.fontSize(7).fillColor(TEXT_LIGHT).text(tank_outlet_notes, PAGE_MARGIN + 150, y, { width: 250 });
          }
          y += 15;
        } else if (level_outlet) {
          doc.fontSize(9).fillColor(TEXT_COLOR).text(`Nivel Salida Tanque: ${level_outlet}`, PAGE_MARGIN, y);
          y += 15;
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
        
        if (well_points_quantity) {
          doc.font('Helvetica').fontSize(9).fillColor(TEXT_COLOR);
          doc.text(`Total de Well Points: ${well_points_quantity}`, PAGE_MARGIN, y);
          y += 20;
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
          const startX = PAGE_MARGIN + 20;
          let x = startX;
          
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
        doc.font('Helvetica').fontSize(9).fillColor(TEXT_COLOR)
          .text(general_notes, PAGE_MARGIN + 5, y, { width: doc.page.width - PAGE_MARGIN * 2 - 10, align: 'justify' });
        y = doc.y + 20;
      }

      // === VIDEO DEL SISTEMA ===
      if (system_video_url) {
        // Verificar si necesitamos nueva página
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = PAGE_MARGIN;
        }
        
        drawSectionTitle('Video del Sistema');
        
        doc.font('Helvetica').fontSize(9).fillColor(TEXT_COLOR)
          .text('Video general del sistema disponible:', PAGE_MARGIN + 5, y);
        y += 15;
        
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
        
        // Link clickeable al video (se abrirá en navegador)
        doc.fontSize(9).fillColor('#0066CC')
          .text('Reproducir Video', PAGE_MARGIN + 10, y, { 
            link: playerUrl,
            underline: true 
          });
        y += 25;
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
        .text(`Generado el ${formatDate(new Date())} | Zurcher Construction - División de Tanques Sépticos`,
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


