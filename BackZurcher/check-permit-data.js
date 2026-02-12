require('dotenv').config();
const { Permit } = require('./src/data');

async function checkPermitData() {
  try {
    const permitId = 'caba1f23-cb18-4ca9-b912-653798223624';
    
    console.log(`\n🔍 Buscando Permit: ${permitId}\n`);
    
    const permit = await Permit.findByPk(permitId, {
      attributes: [
        'idPermit',
        'permitNumber',
        'permitPdfUrl',
        'permitPdfPublicId',
        'optionalDocsUrl',
        'optionalDocsPublicId',
        'pdfData',
        'optionalDocs',
        'isLegacy',
        'createdAt'
      ]
    });
    
    if (!permit) {
      console.log('❌ Permit no encontrado en la base de datos');
      process.exit(1);
    }
    
    console.log('✅ Permit encontrado:\n');
    console.log('📋 Datos básicos:');
    console.log(`   - ID: ${permit.idPermit}`);
    console.log(`   - Permit Number: ${permit.permitNumber || 'N/A'}`);
    console.log(`   - Created At: ${permit.createdAt}`);
    console.log(`   - Is Legacy: ${permit.isLegacy || false}`);
    
    console.log('\n📄 Permit PDF:');
    console.log(`   - permitPdfUrl: ${permit.permitPdfUrl || 'NULL'}`);
    console.log(`   - permitPdfPublicId: ${permit.permitPdfPublicId || 'NULL'}`);
    console.log(`   - pdfData (BLOB): ${permit.pdfData ? `Existe (${permit.pdfData.length} bytes)` : 'NULL'}`);
    
    if (permit.pdfData && permit.pdfData.length < 500) {
      // Si el BLOB es muy pequeño, podría ser una URL
      const pdfDataString = permit.pdfData.toString('utf8');
      console.log(`   - pdfData contenido: ${pdfDataString}`);
    }
    
    console.log('\n📎 Optional Docs:');
    console.log(`   - optionalDocsUrl: ${permit.optionalDocsUrl || 'NULL'}`);
    console.log(`   - optionalDocsPublicId: ${permit.optionalDocsPublicId || 'NULL'}`);
    console.log(`   - optionalDocs (BLOB): ${permit.optionalDocs ? `Existe (${permit.optionalDocs.length} bytes)` : 'NULL'}`);
    
    if (permit.optionalDocs && permit.optionalDocs.length < 500) {
      // Si el BLOB es muy pequeño, podría ser una URL
      const optionalDocsString = permit.optionalDocs.toString('utf8');
      console.log(`   - optionalDocs contenido: ${optionalDocsString}`);
    }
    
    console.log('\n💡 Diagnóstico:');
    
    // Permit PDF
    if (permit.permitPdfUrl || permit.permitPdfPublicId) {
      console.log('   ✅ Permit PDF: Puede cargarse desde Cloudinary');
      if (permit.permitPdfPublicId) {
        const constructedUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/${permit.permitPdfPublicId}`;
        console.log(`      URL reconstruida: ${constructedUrl}`);
      }
    } else if (permit.pdfData) {
      console.log('   ⚠️  Permit PDF: Solo disponible como BLOB legacy');
    } else {
      console.log('   ❌ Permit PDF: NO DISPONIBLE (sin URL, publicId ni BLOB)');
    }
    
    // Optional Docs
    if (permit.optionalDocsUrl || permit.optionalDocsPublicId) {
      console.log('   ✅ Optional Docs: Puede cargarse desde Cloudinary');
      if (permit.optionalDocsPublicId) {
        const constructedUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/${permit.optionalDocsPublicId}`;
        console.log(`      URL reconstruida: ${constructedUrl}`);
      }
    } else if (permit.optionalDocs) {
      console.log('   ⚠️  Optional Docs: Solo disponible como BLOB legacy');
    } else {
      console.log('   ❌ Optional Docs: NO DISPONIBLE (sin URL, publicId ni BLOB)');
    }
    
    console.log('\n');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPermitData();
