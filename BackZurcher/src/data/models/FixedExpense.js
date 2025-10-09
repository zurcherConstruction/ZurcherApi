const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FixedExpense = sequelize.define('FixedExpense', {
    idFixedExpense: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre del gasto fijo (ej: Renta de Oficina, Internet, Seguros, etc.)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción detallada del gasto fijo'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Monto del gasto fijo'
    },
    frequency: {
      type: DataTypes.ENUM(
        'monthly',      // Mensual
        'biweekly',     // Quincenal
        'weekly',       // Semanal
        'quarterly',    // Trimestral
        'semiannual',   // Semestral
        'annual',       // Anual
        'one_time'      // Único (no recurrente)
      ),
      allowNull: false,
      defaultValue: 'monthly',
      
    },
    category: {
      type: DataTypes.ENUM(
        'Renta',
        'Servicios', // Internet, Luz, Agua, Gas
        'Seguros',
        'Salarios',
        'Equipamiento',
        'Software/Subscripciones',
        'Mantenimiento Vehicular',
        'Combustible',
        'Impuestos',
        'Contabilidad/Legal',
        'Marketing',
        'Telefonía',
        'Otros'
      ),
      allowNull: false,
      
    },
    paymentMethod: {
      type: DataTypes.ENUM(
        // Bancos
        'Cap Trabajos Septic',
        'Capital Proyectos Septic',
        'Chase Bank',
        // Tarjetas
        'AMEX',
        'Chase Credit Card',
        // Otros métodos
        'Cheque',
        'Transferencia Bancaria',
        'Efectivo',
        'Zelle',
        'Tarjeta Débito',
        'PayPal',
        'Otro'
      ),
      allowNull: false,
      
    },
    paymentAccount: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Número de cuenta, últimos 4 dígitos de tarjeta, o detalle adicional del método de pago'
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Fecha de inicio del gasto fijo'
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Fecha de fin del gasto fijo (null si es indefinido)'
    },
    nextDueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Próxima fecha de vencimiento'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Indica si el gasto fijo está activo'
    },
    autoCreateExpense: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Si debe crear automáticamente registros de Expense cuando llegue la fecha'
    },
    vendor: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Proveedor o empresa a quien se paga'
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Número de cuenta o referencia del servicio'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales sobre el gasto fijo'
    },
    createdByStaffId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Staffs',
        key: 'id'
      },
      comment: 'Staff que creó/registró el gasto fijo'
    }
  }, {
    timestamps: true,
    tableName: 'FixedExpenses'
  });

  return FixedExpense;
};
