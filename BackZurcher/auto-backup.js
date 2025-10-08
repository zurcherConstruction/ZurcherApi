/**
 * 🔐 BACKUP AUTOMÁTICO DE BASE DE DATOS
 * 
 * Este script crea backups automáticos de la base de datos usando pg_dump
 * y los guarda en el directorio backups/
 * 
 * CONFIGURAR COMO CRON JOB para backups periódicos
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuración
const BACKUP_DIR = path.join(__dirname, 'backups');
const DATABASE_URL = process.env.DATABASE_URL;
const MAX_BACKUPS = 30; // Mantener últimos 30 backups

// Crear directorio de backups si no existe
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`✅ Directorio de backups creado: ${BACKUP_DIR}`);
}

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupFile = path.join(BACKUP_DIR, `zurcher_backup_${timestamp}.sql`);
  
  console.log('🔄 Iniciando backup de base de datos...');
  console.log(`📅 Timestamp: ${timestamp}`);
  console.log(`📁 Archivo: ${backupFile}`);

  if (!DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL no está configurada en las variables de entorno');
    process.exit(1);
  }

  // Ejecutar pg_dump
  const command = `pg_dump "${DATABASE_URL}" > "${backupFile}"`;

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error al crear el backup:', error);
        reject(error);
        return;
      }

      // Verificar que el archivo se creó
      if (fs.existsSync(backupFile)) {
        const stats = fs.statSync(backupFile);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        console.log(`✅ Backup creado exitosamente`);
        console.log(`📦 Tamaño: ${fileSizeMB} MB`);

        // Comprimir el backup
        const gzipCommand = `gzip "${backupFile}"`;
        exec(gzipCommand, (gzipError) => {
          if (gzipError) {
            console.warn('⚠️  No se pudo comprimir el backup:', gzipError.message);
            resolve(backupFile);
          } else {
            const gzFile = `${backupFile}.gz`;
            const gzStats = fs.statSync(gzFile);
            const gzFileSizeMB = (gzStats.size / (1024 * 1024)).toFixed(2);
            console.log(`📦 Backup comprimido: ${gzFileSizeMB} MB`);
            resolve(gzFile);
          }
        });
      } else {
        reject(new Error('El archivo de backup no se creó'));
      }
    });
  });
}

async function cleanOldBackups() {
  console.log('\n🧹 Limpiando backups antiguos...');
  
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('zurcher_backup_') && (f.endsWith('.sql') || f.endsWith('.sql.gz')))
    .map(f => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // Más recientes primero

  if (files.length > MAX_BACKUPS) {
    const toDelete = files.slice(MAX_BACKUPS);
    console.log(`🗑️  Eliminando ${toDelete.length} backups antiguos...`);
    
    toDelete.forEach(file => {
      fs.unlinkSync(file.path);
      console.log(`   ❌ Eliminado: ${file.name}`);
    });
  } else {
    console.log(`✅ Total de backups: ${files.length}/${MAX_BACKUPS}`);
  }
}

async function listBackups() {
  console.log('\n📋 Backups existentes:');
  console.log('─'.repeat(80));
  
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('zurcher_backup_'))
    .map(f => {
      const stats = fs.statSync(path.join(BACKUP_DIR, f));
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      const date = stats.mtime.toLocaleString('es-ES');
      return { name: f, size: sizeMB, date };
    })
    .sort((a, b) => b.name.localeCompare(a.name)); // Más recientes primero

  files.forEach(f => {
    console.log(`📦 ${f.name.padEnd(50)} ${f.size.padStart(8)} MB   ${f.date}`);
  });
  
  console.log('─'.repeat(80));
  console.log(`Total: ${files.length} backups\n`);
}

// Ejecutar backup
async function run() {
  try {
    await createBackup();
    await cleanOldBackups();
    await listBackups();
    
    console.log('✅ Proceso de backup completado exitosamente\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

run();
