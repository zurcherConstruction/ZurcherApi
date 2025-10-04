const { Sequelize } = require('sequelize');
require('dotenv').config();

async function addSalesRepRole() {
  const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: console.log
    }
  );

  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a base de datos establecida');

    // 🔧 PostgreSQL: Modificar el ENUM para agregar 'sales_rep'
    console.log('🔧 Agregando rol "sales_rep" al ENUM de Staffs...');
    
    // Primero, verificar si el valor ya existe
    const [results] = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'sales_rep' 
        AND enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'enum_Staffs_role'
        )
      );
    `);

    if (results[0].exists) {
      console.log('⚠️  El rol "sales_rep" ya existe en el ENUM');
      return;
    }

    // Agregar el nuevo valor al ENUM
    await sequelize.query(`
      ALTER TYPE "enum_Staffs_role" ADD VALUE 'sales_rep';
    `);

    console.log('✅ Rol "sales_rep" agregado exitosamente');

  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

module.exports = addSalesRepRole;

// Si se ejecuta directamente
if (require.main === module) {
  addSalesRepRole()
    .then(() => {
      console.log('✅ Migración completada');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Migración falló:', error);
      process.exit(1);
    });
}
