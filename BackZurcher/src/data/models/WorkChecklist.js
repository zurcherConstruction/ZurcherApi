const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WorkChecklist = sequelize.define('WorkChecklist', {
    idWorkChecklist: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    workId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Works',
        key: 'idWork'
      },
      onDelete: 'CASCADE',
      unique: true, // Un solo checklist por work
    },
    
    // ✅ VERIFICACIONES MANUALES
    arenaExpenseReviewed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Se revisó el gasto de arena'
    },
    finalInvoiceSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Se envió el invoice final al cliente'
    },
    materialesInicialesUploaded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Se subió el comprobante de materiales iniciales'
    },
    feeInspectionPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Se pagó el fee de inspección'
    },
    initialInspectionPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Se pagó la inspección inicial'
    },
    finalInspectionPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Se pagó la inspección final'
    },
    
    // ✅ DOCUMENTOS FINALES
    operatingPermitUploaded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Se subió el permiso de operación oficial'
    },
    maintenanceServiceUploaded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Se subió el documento de servicio de mantenimiento'
    },
    
    // ✅ APROBACIÓN FINAL
    finalReviewCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Revisión final completada - OK para cerrar'
    },
    
    // ✅ AUDITORÍA
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Staffs',
        key: 'id'
      },
      comment: 'Usuario que completó la revisión final'
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de revisión final'
    },
    
    // ✅ NOTAS OPCIONALES
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales sobre la revisión'
    }
  }, {
    tableName: 'WorkChecklists',
    timestamps: true,
  });

  return WorkChecklist;
};
