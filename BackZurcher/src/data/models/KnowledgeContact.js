const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('KnowledgeContact', {
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
      comment: 'Categoría del contacto',
    },
    
    // 📧 INFORMACIÓN DEL CONTACTO
    companyName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'company_name',
      comment: 'Nombre de la empresa',
    },
    
    contactPerson: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'contact_person',
      comment: 'Persona de contacto',
    },
    
    phone: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Teléfono principal',
    },
    
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Email principal',
    },
    
    secondaryPhone: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'secondary_phone',
      comment: 'Teléfono secundario',
    },
    
    secondaryEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'secondary_email',
      comment: 'Email secundario',
    },
    
    // 📍 DIRECCIÓN
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Dirección',
    },
    
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Ciudad',
    },
    
    state: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Estado',
    },
    
    zipCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'zip_code',
      comment: 'Código postal',
    },
    
    // 🌐 INFORMACIÓN ADICIONAL
    website: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Sitio web',
    },
    
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales',
    },
    
    contactType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'contact_type',
      comment: 'Tipo específico (ej: "Inspección Privada", "Condado Cook")',
    },
    
    tags: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Tags para búsqueda y organización',
    },
    
    // 🎯 ESTADO
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Contacto activo',
    },
    
    isFavorite: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_favorite',
      comment: 'Contacto marcado como favorito',
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
    tableName: 'KnowledgeContacts',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['category_id'] },
      { fields: ['contact_type'] },
      { fields: ['active'] },
      { fields: ['is_favorite'] },
      { fields: ['tags'], using: 'gin' },
    ]
  });
};
