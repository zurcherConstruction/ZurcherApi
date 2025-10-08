#!/bin/bash

# 🔐 BACKUP DE BASE DE DATOS DE PRODUCCIÓN
# Ejecutar ANTES de hacer cualquier deployment

# Variables de configuración
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
BACKUP_FILE="zurcher_production_backup_${TIMESTAMP}.sql"
DATABASE_URL="tu_database_url_de_produccion_aqui"  # Reemplazar con la URL real

# Crear directorio de backups si no existe
mkdir -p $BACKUP_DIR

echo "🔄 Iniciando backup de producción..."
echo "📅 Timestamp: $TIMESTAMP"

# Hacer backup usando pg_dump
# Si usas Heroku:
# heroku pg:backups:capture --app nombre-de-tu-app
# heroku pg:backups:download --app nombre-de-tu-app

# Si usas otra plataforma (Railway, Render, etc.):
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup completado exitosamente"
    echo "📁 Archivo: $BACKUP_DIR/$BACKUP_FILE"
    
    # Comprimir el backup para ahorrar espacio
    gzip "$BACKUP_DIR/$BACKUP_FILE"
    echo "📦 Backup comprimido: $BACKUP_DIR/$BACKUP_FILE.gz"
    
    # Mostrar tamaño del archivo
    du -h "$BACKUP_DIR/$BACKUP_FILE.gz"
else
    echo "❌ Error al crear el backup"
    exit 1
fi

# Listar backups existentes
echo ""
echo "📋 Backups existentes:"
ls -lh $BACKUP_DIR/

echo ""
echo "✅ Backup completado. Ya puedes hacer el deployment."
