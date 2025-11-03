/**
 * Script para probar que DocuSign encuentra correctamente el Anchor Text
 * en el PDF de presupuesto
 */

require('dotenv').config();
const DocuSignService = require('./src/services/ServiceDocuSign');
const { generateAndSaveBudgetPDF } = require('./src/utils/pdfGenerators/budgetPdfGenerator');
const { sequelize, Budget, Permit, BudgetLineItem } = require('./src/data');
const path = require('path');
const fs = require('fs');

async function testAnchorText() {
  try {
    console.log('🧪 PROBANDO ANCHOR TEXT EN DOCUSIGN\n');
    
    // Buscar el último presupuesto en la base de datos
    console.log('🔍 Buscando presupuesto en la base de datos...');
    const budget = await Budget.findOne({
      where: { status: 'signed' }, // Buscar uno que ya esté firmado para tener datos completos
      include: [
        { model: Permit },
        { model: BudgetLineItem, as: 'lineItems' }
      ],
      order: [['idBudget', 'DESC']]
    });
    
    if (!budget) {
      console.error('❌ No se encontró ningún presupuesto en la base de datos');
      console.log('   Crea un presupuesto desde el frontend primero');
      process.exit(1);
    }
    
    console.log(`✅ Presupuesto encontrado: #${budget.idBudget}`);
    console.log(`   Cliente: ${budget.applicantName}`);
    console.log(`   Dirección: ${budget.propertyAddress}\n`);
    
    // Generar el PDF
    console.log('📄 Generando PDF del presupuesto...');
    const pdfPath = await generateAndSaveBudgetPDF(budget.toJSON());
    console.log(`✅ PDF generado: ${path.basename(pdfPath)}\n`);
    
    // Leer el PDF para verificar que tiene el texto "Client Signature:"
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfText = pdfBuffer.toString('utf-8', 0, Math.min(pdfBuffer.length, 10000));
    
    if (pdfText.includes('Client Signature:')) {
      console.log('✅ PDF contiene el texto "Client Signature:"\n');
    } else {
      console.log('⚠️  No se pudo verificar el texto en el PDF (puede ser normal)\n');
    }
    
    // Inicializar servicio
    const docuSignService = new DocuSignService();
    
    // Usar el email del presupuesto o un email de prueba
    const clientEmail = budget.Permit?.applicantEmail || process.env.DOCUSIGN_USER_EMAIL || 'yanicorc@gmail.com';
    const clientName = budget.applicantName || 'Test Client';
    
    console.log('📤 Enviando documento a DocuSign con Anchor Text...');
    console.log('   - Anchor para firma: "Client Signature:"');
    console.log('   - Anchor para fecha: "Date:"');
    console.log(`   - Email: ${clientEmail}`);
    console.log(`   - Nombre: ${clientName}\n`);
    
    const result = await docuSignService.sendBudgetForSignature(
      pdfPath,
      clientEmail,
      clientName,
      `Budget_${budget.idBudget}_Anchor_Test.pdf`,
      '🧪 Test: Anchor Text Configuration',
      'Este es un test para verificar que DocuSign encuentra correctamente los campos de firma usando Anchor Text.'
    );
    
    console.log('✅ DOCUMENTO ENVIADO EXITOSAMENTE\n');
    console.log('📋 Detalles:');
    console.log(`   Envelope ID: ${result.envelopeId}`);
    console.log(`   Status: ${result.status}`);
    
    console.log('\n📧 INSTRUCCIONES:');
    console.log('   1. Revisa tu email (también spam)');
    console.log('   2. Abre el documento en DocuSign');
    console.log('   3. Verifica que los campos de firma estén en la ubicación correcta:');
    console.log('      - La firma debe estar en la línea después de "Client Signature:"');
    console.log('      - La fecha debe estar en la línea después de "Date:"');
    console.log('   4. Si los campos están bien posicionados, firma el documento');
    console.log('   5. Si están mal posicionados, ajusta los offsets en ServiceDocuSign.js\n');
    
    console.log('💡 TIP: Puedes ajustar la posición modificando:');
    console.log('   - anchorXOffset: mover horizontalmente (+ = derecha, - = izquierda)');
    console.log('   - anchorYOffset: mover verticalmente (+ = abajo, - = arriba)\n');
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response.body, null, 2));
    }
    await sequelize.close();
    process.exit(1);
  }
}

testAnchorText();
