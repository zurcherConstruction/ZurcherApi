const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('WorkNote', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    workId: {
      type: DataTypes.UUID, // Work.idWork es UUID, no INTEGER
      allowNull: false,
      references: {
        model: 'Works',
        key: 'idWork'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    staffId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Staffs',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'El mensaje no puede estar vacío'
        },
        len: {
          args: [1, 5000],
          msg: 'El mensaje debe tener entre 1 y 5000 caracteres'
        }
      }
    },
    noteType: {
      type: DataTypes.ENUM(
        'follow_up',        // 📞 Seguimiento general
        'client_contact',   // 💬 Contacto con cliente
        'status_change',    // 📋 Cambio de estado
        'problem',          // ⚠️ Problema/bloqueo
        'progress',         // ✅ Avance/progreso
        'internal',         // 🔒 Nota interna
        'payment',          // 💰 Relacionado a pagos
        'other'             // 📝 Otro
      ),
      allowNull: false,
      defaultValue: 'follow_up'
    },
    relatedStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Estado de la obra en el momento de crear la nota'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium'
    },
    isResolved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Para notas tipo "problem", indica si ya se resolvió'
    },
    mentionedStaffIds: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: true,
      defaultValue: [],
      comment: 'IDs de staff mencionados con @ en el mensaje'
    }
  }, {
    timestamps: true,
    tableName: 'WorkNotes',
    indexes: [
      {
        fields: ['workId']
      },
      {
        fields: ['staffId']
      },
      {
        fields: ['noteType']
      },
      {
        fields: ['createdAt']
      }
    ]
  });
};
