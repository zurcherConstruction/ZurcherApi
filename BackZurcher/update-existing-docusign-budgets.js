require('dotenv').config();
const { Sequelize } = require('sequelize');

const {
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_DEPLOY,
  NODE_ENV
} = process.env;

// Usar DB_DEPLOY si existe (Railway/Producción), sino usar configuración local
const sequelize = DB_DEPLOY 
  ? new Sequelize(DB_DEPLOY, {
      logging: console.log,
      native: false,
      timezone: 'America/New_York',
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      dialectOptions: {
        ssl: NODE_ENV === 'production' ? { require: true, rejectUnauthorized: false } : false
      }
    })
  : new Sequelize(
      `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
      {
        logging: console.log,
        native: false,
        pool: {
          max: 10,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      }
    );

console.log(`📊 Base de datos: ${DB_DEPLOY ? 'RAILWAY (Producción)' : 'LOCAL (Desarrollo)'}\n`);

async function updateExistingDocuSignBudgets() {
  try {
    console.log('🔌 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa\n');

    // Buscar budgets con signatureMethod='docusign' pero sin docusignEnvelopeId
    console.log('🔍 Buscando budgets de DocuSign sin docusignEnvelopeId...\n');
    
    const [budgets] = await sequelize.query(`
      SELECT 
        "idBudget",
        "invoiceNumber",
        "signatureDocumentId",
        "signatureMethod",
        "status",
        "sentForSignatureAt"
      FROM "Budgets"
      WHERE "signatureMethod" = 'docusign'
      AND "signatureDocumentId" IS NOT NULL
      AND "docusignEnvelopeId" IS NULL
      ORDER BY "sentForSignatureAt" DESC;
    `);

    if (budgets.length === 0) {
      console.log('✅ No hay budgets de DocuSign para actualizar\n');
      return;
    }

    console.log(`📋 Encontrados ${budgets.length} budgets para actualizar:\n`);
    console.table(budgets);

    // Actualizar cada uno copiando signatureDocumentId a docusignEnvelopeId
    console.log('\n🔧 Actualizando budgets...\n');
    
    for (const budget of budgets) {
      await sequelize.query(`
        UPDATE "Budgets"
        SET "docusignEnvelopeId" = :envelopeId
        WHERE "idBudget" = :budgetId
      `, {
        replacements: {
          envelopeId: budget.signatureDocumentId,
          budgetId: budget.idBudget
        }
      });

      console.log(`✅ Budget #${budget.idBudget} (Invoice ${budget.invoiceNumber || 'N/A'}) actualizado con envelope ID: ${budget.signatureDocumentId}`);
    }

    // Verificar resultados
    console.log('\n📊 Verificando actualizaciones...\n');
    
    const [updated] = await sequelize.query(`
      SELECT 
        "idBudget",
        "invoiceNumber",
        "docusignEnvelopeId",
        "signatureMethod",
        "status"
      FROM "Budgets"
      WHERE "signatureMethod" = 'docusign'
      AND "docusignEnvelopeId" IS NOT NULL
      ORDER BY "sentForSignatureAt" DESC
      LIMIT 10;
    `);

    console.table(updated);

    console.log('\n✅ Actualización completada exitosamente');

  } catch (error) {
    console.error('❌ Error en la actualización:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar actualización
updateExistingDocuSignBudgets();
