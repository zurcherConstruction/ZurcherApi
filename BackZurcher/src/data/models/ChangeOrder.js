const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('ChangeOrder', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    workId: { // Clave foránea para la relación con Work
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Works', // Nombre de la tabla 'Works'
        key: 'idWork',
      },
    },
    changeOrderNumber: { // Un número secuencial o identificador único para este CO dentro del trabajo
      type: DataTypes.STRING, // Podría ser algo como "CO-WORK123-01"
      allowNull: true, // O hacerlo obligatorio y generarlo automáticamente
    },
    description: { // Descripción general del Change Order
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // Puedes tener una tabla separada 'ChangeOrderItems' si un CO puede tener múltiples líneas
    // Por ahora, simplificamos con campos directos para el caso de "extracción de piedras"
    itemDescription: { // Descripción específica del ítem, ej: "Extracción de piedras"
        type: DataTypes.STRING,
        allowNull: true,
    },
    hours: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    unitCost: { // Costo por hora o costo unitario del ítem
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    totalCost: { // Costo total del Change Order (podría ser calculado: hours * unitCost, o ingresado)
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    status: {
      type: DataTypes.ENUM(
        'draft',                    // Borrador, interno
        'pendingAdminReview',       // Admin necesita revisar/completar datos
        'pendingClientApproval',    // Enviado al cliente, esperando respuesta
        'approved',                 // Cliente aprobó
        'rejected',                 // Cliente rechazó
        'invoiced',                 // Incluido en una factura
        'cancelled'                 // Cancelado internamente
      ),
      allowNull: false,
      defaultValue: 'draft',
    },
    clientMessage: { // Mensaje específico para el cliente en la comunicación del CO
        type: DataTypes.TEXT,
        allowNull: true,
    },
    adminNotes: { // Notas internas del admin sobre este CO
        type: DataTypes.TEXT,
        allowNull: true,
    },
    requestedAt: { // Fecha en que se notificó al cliente
      type: DataTypes.DATE,
      allowNull: true,
    },
    respondedAt: { // Fecha en que el cliente respondió
      type: DataTypes.DATE,
      allowNull: true,
    },
    pdfUrl: { // URL al PDF generado para este Change Order (si lo guardas en la nube)
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Podrías añadir tokens si usas un sistema de aprobación por enlace único más seguro
    approvalToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rejectionToken: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  }, {
    // Opciones adicionales del modelo
    timestamps: true, // Habilita createdAt y updatedAt automáticamente
  });
};