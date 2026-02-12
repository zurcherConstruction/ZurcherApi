/**
 * Script para identificar permits con PDFs corruptos en Cloudinary
 * Uso local conectado a Railway: node src/scripts/check-cloudinary-permits.js
 * 
 * IMPORTANTE: 
 * - Ejecutar LOCALMENTE (no en Railway terminal - timeout de 30s)
 * - Usa DB_DEPLOY del .env para conectar a Railway producción
 * - El análisis tarda 2-3 minutos dependiendo de la cantidad de permits
 */

require('dotenv').config();
const axios = require('axios');
const { Permit } = require('../data');

async function checkPermitsCloudinary() {
  try {
    const dbConnection = process.env.DB_DEPLOY || 'Local DB';
    const isProduction = process.env.DB_DEPLOY && process.env.DB_DEPLOY.includes('railway');
    
    console.log('🔍 Buscando permits con Cloudinary URLs...');
    console.log(`📡 Conectado a: ${isProduction ? 'Railway Production ✅' : 'Local Development'}\n`);

    const permits = await Permit.findAll({
      attributes: ['idPermit', 'permitPdfUrl', 'optionalDocsUrl', 'propertyAddress'],
      where: {
        permitPdfUrl: { [require('sequelize').Op.ne]: null }
      },
      order: [['createdAt', 'DESC']],
      limit: 1000
    });

    console.log(`📋 Analizando ${permits.length} permits...\n`);

    const corrupted = [];

    for (const permit of permits) {
      const issues = [];
      
      // Verificar Permit PDF
      if (permit.permitPdfUrl) {
        try {
          const response = await axios.get(permit.permitPdfUrl, {
            responseType: 'arraybuffer',
            timeout: 5000
          });
          
          if (response.data.length < 1000) {
            const content = response.data.toString('utf8');
            if (content.includes(':\\\\') || content.includes('BackZurcher')) {
              issues.push(`Permit PDF (${response.data.length} bytes) - contiene ruta local`);
            }
          }
        } catch (error) {
          issues.push(`Permit PDF - Error: ${error.message}`);
        }
      }

      // Verificar Optional Docs
      if (permit.optionalDocsUrl) {
        try {
          const response = await axios.get(permit.optionalDocsUrl, {
            responseType: 'arraybuffer',
            timeout: 5000
          });
          
          if (response.data.length < 1000) {
            const content = response.data.toString('utf8');
            if (content.includes(':\\\\') || content.includes('BackZurcher') || content.includes('"path"')) {
              issues.push(`Optional Docs (${response.data.length} bytes) - contiene ruta local`);
            }
          }
        } catch (error) {
          issues.push(`Optional Docs - Error: ${error.message}`);
        }
      }

      if (issues.length > 0) {
        corrupted.push({
          id: permit.idPermit,
          address: permit.propertyAddress,
          issues
        });
        console.log(`⚠️  ${permit.propertyAddress || 'Sin dirección'}`);
        console.log(`   ID: ${permit.idPermit}`);
        issues.forEach(issue => console.log(`   - ${issue}`));
        console.log('');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ RESUMEN:`);
    console.log(`   Total permits analizados: ${permits.length}`);
    console.log(`   Permits con problemas: ${corrupted.length}`);
    console.log(`   Porcentaje: ${((corrupted.length / permits.length) * 100).toFixed(2)}%`);
    console.log('='.repeat(60));

    if (corrupted.length > 0) {
      console.log('\n📝 IDs para re-subir:');
      console.log(corrupted.map(p => p.id).join('\n'));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

checkPermitsCloudinary();
