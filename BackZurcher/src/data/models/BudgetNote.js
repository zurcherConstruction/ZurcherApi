const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('BudgetNote', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    budgetId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Budgets',
        key: 'idBudget'
      },
      onDelete: 'CASCADE', // Si se borra el budget, se borran sus notas
      onUpdate: 'CASCADE'
    },
    staffId: {
      type: DataTypes.UUID,
      allowNull: true, // Permitir NULL porque onDelete: SET NULL
      references: {
        model: 'Staffs', // Nombre de tabla pluralizado
        key: 'id' // Primary key real del modelo Staff
      },
      onDelete: 'SET NULL', // Si se borra el staff, la nota queda sin autor
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
      allowNull: true, // Estado del budget cuando se creó la nota
      comment: 'Estado del presupuesto en el momento de crear la nota'
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
    },
    // 🔔 SISTEMA DE ALERTAS
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indica si la nota ha sido vista/leída'
    },
    readBy: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: true,
      defaultValue: [],
      comment: 'IDs de staff que han leído esta nota'
    },
    // ⏰ SISTEMA DE RECORDATORIOS
    reminderDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha/hora para recordatorio futuro (ej: llamar cliente)'
    },
    reminderFor: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: true,
      defaultValue: [],
      comment: 'IDs de staff que deben recibir el recordatorio'
    },
    isReminderActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si el recordatorio está activo (no completado/cancelado)'
    },
    reminderCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Cuándo se completó/canceló el recordatorio'
    },
    reminderEmailSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha y hora en que se envió el email de recordatorio (para enviar solo una vez)'
    }
  }, {
    timestamps: true, // Crea automáticamente createdAt y updatedAt
    tableName: 'BudgetNotes',
    indexes: [
      {
        fields: ['budgetId'] // Índice para búsquedas por budget
      },
      {
        fields: ['staffId'] // Índice para búsquedas por autor
      },
      {
        fields: ['noteType'] // Índice para filtros por tipo
      },
      {
        fields: ['createdAt'] // Índice para ordenamiento temporal
      }
    ]
  });
};
