/**
 * 🚀 MIGRACIÓN: Subir PDFs de Permit a Cloudinary
 * 
 * Este script migra todos los PDFs almacenados como BLOB en PostgreSQL
 * a Cloudinary y actualiza los registros con las URLs.
 * 
 * ANTES DE EJECUTAR:
 * 1. Hacer backup de la BD
 * 2. Verificar credenciales de Cloudinary en .env
 * 3. Probar en desarrollo primero
 */

require('dotenv').config();
const { Permit } = require('./src/data');
const cloudinary = require('cloudinary').v2;

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper para subir buffer a Cloudinary
const uploadBufferToCloudinary = (buffer, folder, filename) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'raw', // Para PDFs
        public_id: filename,
        format: 'pdf'
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

const migratePermitPdfs = async () => {
  console.log('🚀 Iniciando migración de PDFs de Permit...\n');

  try {
    // Obtener todos los permits que tengan pdfData o optionalDocs
    const permits = await Permit.findAll({
      where: {
        // Solo migrar los que tienen BLOBs
        // pdfData o optionalDocs no null
      },
      raw: true
    });

    console.log(`📊 Total de permits en BD: ${permits.length}\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const permit of permits) {
      console.log(`\n📄 Procesando Permit ID: ${permit.idPermit}`);
      console.log(`   Dirección: ${permit.propertyAddress}`);

      const updates = {};
      let hasChanges = false;

      // Migrar pdfData
      if (permit.pdfData && Buffer.isBuffer(permit.pdfData)) {
        try {
          console.log('   📤 Subiendo permit PDF a Cloudinary...');
          const result = await uploadBufferToCloudinary(
            permit.pdfData,
            'permits',
            `permit_${permit.idPermit}_main`
          );

          updates.permitPdfUrl = result.secure_url;
          updates.permitPdfPublicId = result.public_id;
          updates.pdfData = null; // Limpiar BLOB
          hasChanges = true;
          console.log(`   ✅ Permit PDF subido: ${result.secure_url}`);
        } catch (error) {
          console.error(`   ❌ Error subiendo permit PDF:`, error.message);
          errors++;
        }
      }

      // Migrar optionalDocs
      if (permit.optionalDocs && Buffer.isBuffer(permit.optionalDocs)) {
        try {
          console.log('   📤 Subiendo optional docs a Cloudinary...');
          const result = await uploadBufferToCloudinary(
            permit.optionalDocs,
            'permits/optional',
            `permit_${permit.idPermit}_optional`
          );

          updates.optionalDocsUrl = result.secure_url;
          updates.optionalDocsPublicId = result.public_id;
          updates.optionalDocs = null; // Limpiar BLOB
          hasChanges = true;
          console.log(`   ✅ Optional docs subido: ${result.secure_url}`);
        } catch (error) {
          console.error(`   ❌ Error subiendo optional docs:`, error.message);
          errors++;
        }
      }

      // Actualizar registro si hubo cambios
      if (hasChanges) {
        try {
          await Permit.update(updates, {
            where: { idPermit: permit.idPermit }
          });
          migrated++;
          console.log(`   💾 Permit actualizado en BD`);
        } catch (error) {
          console.error(`   ❌ Error actualizando BD:`, error.message);
          errors++;
        }
      } else {
        skipped++;
        console.log(`   ⏭️  Sin PDFs para migrar`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN:');
    console.log('='.repeat(60));
    console.log(`✅ Migrados:  ${migrated}`);
    console.log(`⏭️  Omitidos:   ${skipped}`);
    console.log(`❌ Errores:    ${errors}`);
    console.log('='.repeat(60) + '\n');

    if (errors === 0) {
      console.log('🎉 ¡Migración completada exitosamente!');
      console.log('\n⚠️  SIGUIENTE PASO:');
      console.log('1. Agregar columnas nuevas al modelo Permit:');
      console.log('   - permitPdfUrl');
      console.log('   - permitPdfPublicId');
      console.log('   - optionalDocsUrl');
      console.log('   - optionalDocsPublicId');
      console.log('2. Eliminar pdfData y optionalDocs después de verificar');
    } else {
      console.log('⚠️  Migración completada con errores. Revisar logs.');
    }

  } catch (error) {
    console.error('💥 Error fatal en migración:', error);
    process.exit(1);
  }
};

// Ejecutar migración
if (require.main === module) {
  console.log('⚠️  ATENCIÓN: Esta migración modificará la base de datos');
  console.log('   Asegúrate de tener un backup antes de continuar\n');
  
  migratePermitPdfs()
    .then(() => {
      console.log('\n✅ Script finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script terminó con error:', error);
      process.exit(1);
    });
}

module.exports = { migratePermitPdfs };
