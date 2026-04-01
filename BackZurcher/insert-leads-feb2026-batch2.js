/**
 * Script para insertar leads de febrero 2026 - Batch 2
 * Fuente: registros de permisos NOC
 * Uso: node insert-leads-feb2026-batch2.js
 */

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// Configurar conexión (soporta DB_DEPLOY para Railway)
const sequelize = process.env.DB_DEPLOY
  ? new Sequelize(process.env.DB_DEPLOY, {
      dialect: 'postgres',
      dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
      logging: false
    })
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false
      }
    );

const leadsData = [
  {
    applicantName: 'Adams Homes of NW Florida, Inc.',
    applicantPhone: '850-934-0470',
    applicantEmail: null,
    propertyAddress: '2329 NW 38th Pl, Cape Coral FL 33993',
    serviceType: 'Single Family Dwelling',
    notes: 'INSTR #2026000027535 | Contractor: Adams Homes of NW Florida, Inc. (Bryan Adams, President) | Tel Contractor: 850-934-0470',
    source: 'other',
    status: 'new',
  },
  {
    applicantName: 'CAH-SWFL Land Holdings LLC',
    applicantPhone: '239-288-5905',
    applicantEmail: 'jschmoyer@christopheral­anhomes.com',
    propertyAddress: '850 Carpenter St E, Lehigh Acres FL 33974',
    serviceType: 'New Single Family Residence',
    notes: 'INSTR #2026000027444 | Contractor: JHS Builders, LLC | Tel Contractor: 239-288-5905 | Email Contractor: jschmoyer@christopherala­nhomes.com',
    source: 'other',
    status: 'new',
  },
  {
    applicantName: 'Holografer Nicole Barbara & Pacheco Anthony',
    applicantPhone: '786-314-9379',
    applicantEmail: null,
    propertyAddress: '12400 Blasingim Rd, Fort Myers FL 33966',
    serviceType: 'Construction of Single Family Residence',
    notes: 'INSTR #2026000027645 | Contractor: Imperial Development Group LLC | Tel Contractor: 239-514-1113',
    source: 'other',
    status: 'new',
  },
  {
    applicantName: 'Joseph & Kathleen Balebanek',
    applicantPhone: '516-286-6960',
    applicantEmail: null,
    propertyAddress: '759 Sanibel Dr, Shell Harbor FL (Lee County)',
    serviceType: 'Construction of New Home',
    notes: 'INSTR #2026000027702 | Contractor: Owner/Builder | Tel Contractor: 516-286-6960',
    source: 'other',
    status: 'new',
  },
  {
    applicantName: '341 Pembroke St Family Trust LLC',
    applicantPhone: '234-265-4135',
    applicantEmail: null,
    propertyAddress: '629 Homestead Rd S, Lehigh Acres FL 33974',
    serviceType: 'Construction of New Duplex',
    notes: 'INSTR #2026000027788 | Contractor: Craig McClellan | Tel Contractor: 234-265-4135',
    source: 'other',
    status: 'new',
  },
  {
    applicantName: 'Maram Development Solutions LLC',
    applicantPhone: '305-400-8280',
    applicantEmail: null,
    propertyAddress: '3411 71st St SW, Lehigh Acres FL 33971',
    serviceType: 'New Single Family Residence',
    notes: 'INSTR #2026000027819 | Contractor: Mandela Builders | Tel Contractor: 305-400-8280',
    source: 'other',
    status: 'new',
  },
  {
    applicantName: 'Galos Investments LLC',
    applicantPhone: '786-556-2372',
    applicantEmail: null,
    propertyAddress: '1070 Lafayette Ave, Lehigh Acres FL 33974',
    serviceType: 'New Construction Single Family',
    notes: 'INSTR #2026000027884 | Contractor: Build Pro Construction Inc | Tel Contractor: 786-740-2549',
    source: 'other',
    status: 'new',
  },
  {
    applicantName: 'Holiday Builders Inc.',
    applicantPhone: '407-745-3757',
    applicantEmail: null,
    propertyAddress: '2929 NW 6th Pl, Cape Coral FL 33993',
    serviceType: 'Single Family Dwelling',
    notes: 'INSTR #2026000027950 | Contractor: Holiday Builders Inc. | Tel Contractor: 407-745-3757',
    source: 'other',
    status: 'new',
  },
  {
    applicantName: 'Thicon, LLC',
    applicantPhone: '239-565-4561',
    applicantEmail: 'Tpicken11@me.com',
    propertyAddress: '4825 SW 29th Ave, Cape Coral FL 33914',
    serviceType: 'Construction of Single-Family Residence',
    notes: 'INSTR #2026000027980 | Contractor: N/A (not listed in NOC)',
    source: 'other',
    status: 'new',
  },
  {
    applicantName: 'LSL Charlie Delta',
    applicantPhone: '857-205-2353',
    applicantEmail: null,
    propertyAddress: '763 Clancy St E, Lehigh Acres FL 33974',
    serviceType: 'New Single Family Residence',
    notes: 'INSTR #2026000028228 | Contractor: Coll & Associates, LLC | Tel Contractor: (305) 306-3774',
    source: 'other',
    status: 'new',
  },
];

async function insertLeads() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a DB establecida\n');

    let inserted = 0;
    let skipped = 0;

    for (const lead of leadsData) {
      // Verificar si ya existe por dirección para evitar duplicados
      const [existing] = await sequelize.query(
        `SELECT id FROM "SalesLeads" WHERE property_address = :address LIMIT 1`,
        {
          replacements: { address: lead.propertyAddress },
          type: sequelize.QueryTypes.SELECT
        }
      );

      if (existing) {
        console.log(`⏭️  OMITIDO (ya existe): ${lead.propertyAddress}`);
        skipped++;
        continue;
      }

      await sequelize.query(
        `INSERT INTO "SalesLeads" 
          (id, applicant_name, applicant_phone, applicant_email, property_address, 
           service_type, notes, source, status, priority, tags,
           created_at, updated_at)
         VALUES 
          (gen_random_uuid(), :applicantName, :applicantPhone, :applicantEmail, :propertyAddress,
           :serviceType, :notes, :source, :status, 'medium', '{}',
           NOW(), NOW())`,
        {
          replacements: {
            applicantName: lead.applicantName,
            applicantPhone: lead.applicantPhone,
            applicantEmail: lead.applicantEmail,
            propertyAddress: lead.propertyAddress,
            serviceType: lead.serviceType,
            notes: lead.notes,
            source: lead.source,
            status: lead.status,
          },
          type: sequelize.QueryTypes.INSERT
        }
      );

      console.log(`✅ INSERTADO: ${lead.applicantName} - ${lead.propertyAddress}`);
      inserted++;
    }

    console.log(`\n📊 Resumen:`);
    console.log(`   ✅ Insertados: ${inserted}`);
    console.log(`   ⏭️  Omitidos (duplicados): ${skipped}`);
    console.log(`   📋 Total procesados: ${leadsData.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

insertLeads();
