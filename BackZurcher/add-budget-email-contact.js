require('dotenv').config();
const { Sequelize } = require('sequelize');

// Configuración de la base de datos
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

async function addBudgetEmailAndContact() {
  try {
    console.log('🚀 Iniciando migración: Agregar applicant_email y contact_company a Budgets...\n');

    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida\n');

    // 1. Agregar las columnas
    console.log('📝 Paso 1: Agregando columnas applicant_email y contact_company...');
    await sequelize.query(`
      ALTER TABLE "Budgets" 
      ADD COLUMN IF NOT EXISTS applicant_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact_company VARCHAR(255);
    `);
    console.log('✅ Columnas agregadas\n');

    // 2. Copiar emails desde Permits
    console.log('📝 Paso 2: Copiando emails desde Permits...');
    const [updateResult] = await sequelize.query(`
      UPDATE "Budgets" b
      SET applicant_email = p."applicantEmail"
      FROM "Permits" p
      WHERE b."PermitIdPermit" = p."idPermit"
      AND b.applicant_email IS NULL;
    `);
    console.log(`✅ ${updateResult[1] || 0} budgets actualizados con email\n`);

    // 3. Crear índices
    console.log('📝 Paso 3: Creando índices...');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_budgets_applicant_email_lower 
      ON "Budgets" (LOWER(applicant_email));
    `);
    console.log('✅ Índice para applicant_email creado');

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_budgets_contact_company_lower 
      ON "Budgets" (LOWER(contact_company));
    `);
    console.log('✅ Índice para contact_company creado\n');

    // 4. Verificar resultados
    console.log('📊 Paso 4: Verificando resultados...');
    const [stats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_budgets,
        COUNT(applicant_email) as budgets_con_email,
        COUNT(contact_company) as budgets_con_contacto,
        COUNT(*) - COUNT(applicant_email) as budgets_sin_email
      FROM "Budgets";
    `);
    
    console.log('\n📈 Estadísticas:');
    console.log(`   Total budgets: ${stats[0].total_budgets}`);
    console.log(`   Con email: ${stats[0].budgets_con_email}`);
    console.log(`   Con contacto: ${stats[0].budgets_con_contacto}`);
    console.log(`   Sin email: ${stats[0].budgets_sin_email}`);

    // 5. Mostrar índices creados
    const [indexes] = await sequelize.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'Budgets' 
      AND (indexname LIKE '%email%' OR indexname LIKE '%contact%')
      ORDER BY indexname;
    `);

    if (indexes.length > 0) {
      console.log('\n📋 Índices creados:');
      indexes.forEach(idx => {
        console.log(`   - ${idx.indexname}`);
      });
    }

    console.log('\n✅ Migración completada exitosamente\n');

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

addBudgetEmailAndContact();
