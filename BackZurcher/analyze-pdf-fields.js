/**
 * Script para analizar campos de PDFs con formularios
 * Uso: node analyze-pdf-fields.js <ruta-al-pdf>
 * 
 * Ejemplo: node analyze-pdf-fields.js ./src/templates/ppi/ppi-type-a.pdf
 */

const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function analyzePdfFields(pdfPath) {
  try {
    console.log(`\n📄 Analizando PDF: ${pdfPath}\n`);
    
    // Leer el PDF
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Obtener el formulario
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`✅ Total de campos encontrados: ${fields.length}\n`);
    
    if (fields.length === 0) {
      console.log('⚠️  Este PDF no tiene campos de formulario rellenables.');
      return;
    }
    
    // Analizar cada campo
    console.log('📋 LISTA DE CAMPOS:\n');
    console.log('━'.repeat(80));
    
    fields.forEach((field, index) => {
      const name = field.getName();
      const type = field.constructor.name;
      
      console.log(`${index + 1}. Campo: "${name}"`);
      console.log(`   Tipo: ${type}`);
      
      // Si es un campo de texto, mostrar valor actual
      if (type === 'PDFTextField') {
        try {
          const textField = form.getTextField(name);
          const currentValue = textField.getText() || '(vacío)';
          console.log(`   Valor actual: ${currentValue}`);
        } catch (e) {
          console.log(`   Valor actual: (no disponible)`);
        }
      }
      
      // Si es un checkbox
      if (type === 'PDFCheckBox') {
        try {
          const checkbox = form.getCheckBox(name);
          const isChecked = checkbox.isChecked();
          console.log(`   Estado: ${isChecked ? '☑ Marcado' : '☐ Sin marcar'}`);
        } catch (e) {
          console.log(`   Estado: (no disponible)`);
        }
      }
      
      // Si es un dropdown
      if (type === 'PDFDropdown') {
        try {
          const dropdown = form.getDropdown(name);
          const options = dropdown.getOptions();
          console.log(`   Opciones disponibles: ${options.join(', ')}`);
        } catch (e) {
          console.log(`   Opciones: (no disponible)`);
        }
      }
      
      console.log('━'.repeat(80));
    });
    
    console.log('\n💡 Ejemplo de código para llenar estos campos:\n');
    console.log('```javascript');
    console.log('const form = pdfDoc.getForm();');
    fields.slice(0, 3).forEach(field => {
      const name = field.getName();
      const type = field.constructor.name;
      
      if (type === 'PDFTextField') {
        console.log(`form.getTextField('${name}').setText('valor aquí');`);
      } else if (type === 'PDFCheckBox') {
        console.log(`form.getCheckBox('${name}').check(); // o .uncheck()`);
      } else if (type === 'PDFDropdown') {
        console.log(`form.getDropdown('${name}').select('opción');`);
      }
    });
    console.log('```\n');
    
  } catch (error) {
    console.error('❌ Error al analizar el PDF:');
    console.error(error.message);
    
    if (error.message.includes('No such file')) {
      console.log('\n💡 Asegúrate de que la ruta al PDF sea correcta.');
    }
  }
}

// Obtener ruta del PDF desde argumentos
const pdfPath = process.argv[2];

if (!pdfPath) {
  console.log('❌ Uso: node analyze-pdf-fields.js <ruta-al-pdf>');
  console.log('\nEjemplo:');
  console.log('  node analyze-pdf-fields.js ./src/templates/ppi/ppi-type-a.pdf');
  console.log('  node analyze-pdf-fields.js ./src/templates/ppi/ppi-type-b.pdf');
  process.exit(1);
}

analyzePdfFields(pdfPath);
