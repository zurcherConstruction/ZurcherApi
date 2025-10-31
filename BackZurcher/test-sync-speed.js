const { conn } = require("./src/data");

async function testSync() {
  console.time('⏱️ Sync con force: false');
  await conn.sync({ force: false });
  console.timeEnd('⏱️ Sync con force: false');
  
  console.log('✅ Sync completado');
  process.exit(0);
}

testSync().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
