const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('KnowledgeProcedure', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'KnowledgeCategories',
        key: 'id'
      },
      field: 'category_id',
      comment: 'Categoría del procedimiento',
    },
    
    // 📋 INFORMACIÓN DEL PROCEDIMIENTO
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Título del procedimiento',
    },
    
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción general',
    },
    
    // 📝 PASOS DEL PROCEDIMIENTO
    // Formato: [{ order: 1, title: "Paso 1", description: "...", notes: "..." }]
    steps: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array de pasos del procedimiento',
    },
    
    // ⏱️ INFORMACIÓN ADICIONAL
    estimatedTime: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'estimated_time',
      comment: 'Tiempo estimado de ejecución',
    },
    
    difficulty: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Nivel de dificultad (easy, medium, hard)',
    },
    
    tags: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Tags para búsqueda',
    },
    
    // 📎 ARCHIVOS ADJUNTOS
    // Formato: [{ name: "...", url: "...", type: "..." }]
    attachments: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Archivos adjuntos',
    },
    
    // 🎯 ESTADO
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Procedimiento activo',
    },
    
    isFavorite: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_favorite',
      comment: 'Procedimiento marcado como favorito',
    },
    
    // 👤 AUDITORÍA
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Staffs',
        key: 'id'
      },
      field: 'created_by',
      comment: 'Usuario que creó el registro',
    },
    
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Staffs',
        key: 'id'
      },
      field: 'updated_by',
      comment: 'Último usuario que actualizó',
    },
    
  }, {
    tableName: 'KnowledgeProcedures',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['category_id'] },
      { fields: ['active'] },
      { fields: ['is_favorite'] },
      { fields: ['tags'], using: 'gin' },
    ]
  });
};
