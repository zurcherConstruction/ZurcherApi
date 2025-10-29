const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Work = sequelize.define('Work', {
    idWork: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },

    propertyAddress: {
      type: DataTypes.TEXT,
      allowNull: false, // Aseguramos que este campo sea obligatorio
    },
    status: {
      type: DataTypes.ENUM(
        'pending',
        'assigned',
        'inProgress',
        'installed',
        'firstInspectionPending',
        'approvedInspection',
        'rejectedInspection',
        'coverPending',
        'covered',
        'invoiceFinal',
        'paymentReceived',
        'finalInspectionPending',
        'finalApproved',
        'finalRejected',
        'maintenance',
        'cancelled'
      ),
      allowNull: false,
      defaultValue: 'pending',
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    staffId: {
      type: DataTypes.UUID, // Clave foránea que referencia a Staff
      allowNull: true, // Permitir NULL si no todas las obras están asignadas
      references: {
        model: 'Staffs', // Nombre del modelo relacionado
        key: 'id', // Clave primaria del modelo Staff
      },
    },
    idBudget: {
      type: DataTypes.INTEGER, // Cambiado a INTEGER para coincidir con Budget
      allowNull: true,
      references: {
        model: 'Budgets',
        key: 'idBudget',
      },
    },
    stoneExtractionCONeeded: { // NUEVO CAMPO
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    maintenanceStartDate: {
      type: DataTypes.DATE,
      allowNull: true, // Permite nulo si la obra no está o nunca ha estado en mantenimiento
    },
    
    // --- IDENTIFICADOR DE TRABAJO IMPORTADO ---
    isLegacy: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Indica si este trabajo fue importado desde sistema externo'
    }

  }, {
    hooks: {
      // 🔄 Hook automático: Registrar cambios de estado en WorkStateHistory Y crear WorkNote
      beforeUpdate: async (work, options) => {
        // Solo registrar si cambió el status
        if (work.changed('status')) {
          const WorkStateHistory = sequelize.models.WorkStateHistory;
          const WorkNote = sequelize.models.WorkNote;
          
          const fromStatus = work._previousDataValues.status;
          const toStatus = work.status;
          const changedBy = options.staffId || null; // Pasar staffId en options al actualizar
          
          // 1️⃣ Registrar en historial
          await WorkStateHistory.create({
            workId: work.idWork,
            fromStatus: fromStatus,
            toStatus: toStatus,
            changedBy: changedBy,
            reason: options.reason || null,
            changedAt: new Date()
          });

          // 2️⃣ Crear nota automática con el cambio de estado
          const statusLabels = {
            pending: 'Pendiente',
            assigned: 'Asignado',
            inProgress: 'En Progreso',
            installed: 'Instalado',
            firstInspectionPending: 'Inspección Pendiente',
            approvedInspection: 'Inspección Aprobada',
            rejectedInspection: 'Inspección Rechazada',
            coverPending: 'Tapar Pendiente',
            covered: 'Tapado',
            invoiceFinal: 'Factura Final',
            paymentReceived: 'Pago Recibido',
            finalInspectionPending: 'Inspección Final Pendiente',
            finalApproved: 'Aprobado Final',
            finalRejected: 'Rechazado Final',
            maintenance: 'Mantenimiento',
            cancelled: 'Cancelado'
          };

          const fromLabel = statusLabels[fromStatus] || fromStatus;
          const toLabel = statusLabels[toStatus] || toStatus;
          
          const message = `Estado actualizado automáticamente: ${fromLabel} → ${toLabel}`;

          await WorkNote.create({
            workId: work.idWork,
            staffId: changedBy, // Puede ser null si es automático
            message: message,
            noteType: 'status_change',
            priority: 'medium',
            relatedStatus: toStatus,
            isResolved: true, // Siempre resuelto porque es informativo
            mentionedStaffIds: []
          });

          console.log(`✅ WorkStateHistory y WorkNote registrados: ${fromStatus} → ${toStatus}`);
        }
      }
    }
  });

  return Work;
};
