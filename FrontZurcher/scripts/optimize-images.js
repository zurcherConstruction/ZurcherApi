#!/usr/bin/env node
/**
 * Script para optimizar imágenes automáticamente
 * Usa Sharp para comprimir JPEGs y PNGs sin pérdida visible de calidad
 * 
 * Uso: node scripts/optimize-images.js [directorio]
 * Ejemplo: node scripts/optimize-images.js src/assets/landing
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const DEFAULT_DIR = path.join(__dirname, '../src/assets/landing');
const QUALITY = 80; // Calidad de compresión (80% es excelente balance)
const CREATE_BACKUP = false; // No crear backup en Windows (problemas de permisos)
const OUTPUT_SUFFIX = '_optimized'; // Sufijo para archivos optimizados

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

/**
 * Formatea bytes a unidades legibles
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Crea backup de un archivo
 */
async function createBackup(filePath) {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  const backupPath = path.join(dir, `${name}.backup${ext}`);
  
  try {
    await fs.promises.copyFile(filePath, backupPath);
    return backupPath;
  } catch (error) {
    console.error(`${colors.red}Error creando backup:${colors.reset}`, error.message);
    return null;
  }
}

/**
 * Optimiza una imagen JPEG
 */
async function optimizeJPEG(filePath) {
  const originalStats = await fs.promises.stat(filePath);
  const originalSize = originalStats.size;
  
  // Generar nombre del archivo optimizado
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  const outputPath = path.join(dir, `${name}${OUTPUT_SUFFIX}${ext}`);
  
  // Optimizar imagen
  await sharp(filePath)
    .jpeg({
      quality: QUALITY,
      progressive: true,
      mozjpeg: true,
    })
    .toFile(outputPath);
  
  const newStats = await fs.promises.stat(outputPath);
  const newSize = newStats.size;
  const savings = originalSize - newSize;
  const savingsPercent = ((savings / originalSize) * 100).toFixed(1);
  
  return {
    original: originalSize,
    optimized: newSize,
    savings,
    savingsPercent,
    outputPath,
  };
}

/**
 * Optimiza una imagen PNG
 */
async function optimizePNG(filePath) {
  const originalStats = await fs.promises.stat(filePath);
  const originalSize = originalStats.size;
  
  // Generar nombre del archivo optimizado
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  const outputPath = path.join(dir, `${name}${OUTPUT_SUFFIX}${ext}`);
  
  // Optimizar imagen
  await sharp(filePath)
    .png({
      quality: QUALITY,
      compressionLevel: 9,
      palette: true,
    })
    .toFile(outputPath);
  
  const newStats = await fs.promises.stat(outputPath);
  const newSize = newStats.size;
  const savings = originalSize - newSize;
  const savingsPercent = ((savings / originalSize) * 100).toFixed(1);
  
  return {
    original: originalSize,
    optimized: newSize,
    savings,
    savingsPercent,
    outputPath,
  };
}

/**
 * Procesa un directorio completo
 */
async function optimizeDirectory(dirPath) {
  console.log(`${colors.bright}${colors.blue}🖼️  Optimizador de Imágenes${colors.reset}\n`);
  console.log(`${colors.cyan}Directorio:${colors.reset} ${dirPath}`);
  console.log(`${colors.cyan}Calidad:${colors.reset} ${QUALITY}%`);
  console.log(`${colors.cyan}Modo:${colors.reset} Generar archivos *_optimized.ext\n`);
  
  try {
    const files = await fs.promises.readdir(dirPath);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png'].includes(ext) && !file.includes('.backup');
    });
    
    if (imageFiles.length === 0) {
      console.log(`${colors.yellow}⚠️  No se encontraron imágenes para optimizar${colors.reset}`);
      return;
    }
    
    console.log(`${colors.green}✓${colors.reset} Encontradas ${imageFiles.length} imagen(es)\n`);
    console.log(`${colors.bright}Procesando...${colors.reset}\n`);
    
    let totalOriginal = 0;
    let totalOptimized = 0;
    let processedCount = 0;
    
    for (const file of imageFiles) {
      const filePath = path.join(dirPath, file);
      const ext = path.extname(file).toLowerCase();
      
      try {
        console.log(`${colors.cyan}▸${colors.reset} ${file}...`);
        
        let result;
        if (['.jpg', '.jpeg'].includes(ext)) {
          result = await optimizeJPEG(filePath);
        } else if (ext === '.png') {
          result = await optimizePNG(filePath);
        }
        
        totalOriginal += result.original;
        totalOptimized += result.optimized;
        processedCount++;
        
        const savingsColor = result.savingsPercent > 30 ? colors.green : 
                            result.savingsPercent > 10 ? colors.yellow : colors.reset;
        
        console.log(`  ${colors.green}✓${colors.reset} ${formatBytes(result.original)} → ${formatBytes(result.optimized)}`);
        console.log(`  ${savingsColor}↓ Ahorro: ${formatBytes(result.savings)} (${result.savingsPercent}%)${colors.reset}\n`);
        
      } catch (error) {
        console.error(`  ${colors.red}✗ Error: ${error.message}${colors.reset}\n`);
      }
    }
    
    // Resumen final
    const totalSavings = totalOriginal - totalOptimized;
    const totalSavingsPercent = ((totalSavings / totalOriginal) * 100).toFixed(1);
    
    console.log(`${colors.bright}${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bright}📊 RESUMEN${colors.reset}\n`);
    console.log(`Imágenes procesadas: ${colors.bright}${processedCount}${colors.reset}`);
    console.log(`Tamaño original:     ${colors.bright}${formatBytes(totalOriginal)}${colors.reset}`);
    console.log(`Tamaño optimizado:   ${colors.bright}${formatBytes(totalOptimized)}${colors.reset}`);
    console.log(`${colors.green}Ahorro total:        ${colors.bright}${formatBytes(totalSavings)} (${totalSavingsPercent}%)${colors.reset}`);
    
    console.log(`\n${colors.yellow}📁 Archivos generados con sufijo: ${colors.bright}*${OUTPUT_SUFFIX}.ext${colors.reset}`);
    console.log(`${colors.yellow}📝 Próximo paso:${colors.reset}`);
    console.log(`   1. Verifica la calidad de las imágenes optimizadas`);
    console.log(`   2. Elimina los archivos originales (1.jpeg, 2.jpeg, etc.)`);
    console.log(`   3. Renombra los optimizados (quita ${OUTPUT_SUFFIX})`);
    console.log(`\n${colors.cyan}💡 Comandos útiles:${colors.reset}`);
    console.log(`   ${colors.bright}# Eliminar originales${colors.reset}`);
    console.log(`   Remove-Item src\\assets\\landing\\[0-9]*.jpeg -Exclude *_optimized*`);
    console.log(`   ${colors.bright}# Renombrar optimizados (quitar sufijo)${colors.reset}`);
    console.log(`   Get-ChildItem src\\assets\\landing\\*_optimized.* | Rename-Item -NewName {$_.Name -replace '_optimized',''}`);
    
    console.log(`${colors.bright}${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
    console.log(`${colors.green}✓ Optimización completada exitosamente${colors.reset}\n`);
    
  } catch (error) {
    console.error(`${colors.red}Error leyendo directorio:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Ejecutar script
const targetDir = process.argv[2] || DEFAULT_DIR;
const resolvedDir = path.resolve(targetDir);

// Verificar que el directorio existe
if (!fs.existsSync(resolvedDir)) {
  console.error(`${colors.red}Error: El directorio no existe: ${resolvedDir}${colors.reset}`);
  process.exit(1);
}

optimizeDirectory(resolvedDir).catch(error => {
  console.error(`${colors.red}Error fatal:${colors.reset}`, error);
  process.exit(1);
});
