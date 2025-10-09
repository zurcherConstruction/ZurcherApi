/**
 * Constantes compartidas para métodos de pago
 * Usar estas constantes en toda la aplicación para mantener consistencia
 */

// 🏦 MÉTODOS DE PAGO - ENUM para Income, Expense y FixedExpense
const PAYMENT_METHODS = {
  // Cuentas Bancarias
  CAP_TRABAJOS: 'Cap Trabajos Septic',
  CAP_PROYECTOS: 'Capital Proyectos Septic',
  CHASE_BANK: 'Chase Bank',
  
  // Tarjetas de Crédito
  AMEX: 'AMEX',
  CHASE_CREDIT: 'Chase Credit Card',
  
  // Otros Métodos
  CHEQUE: 'Cheque',
  TRANSFERENCIA: 'Transferencia Bancaria',
  EFECTIVO: 'Efectivo',
  ZELLE: 'Zelle',
  TARJETA_DEBITO: 'Tarjeta Débito',
  PAYPAL: 'PayPal',
  OTRO: 'Otro'
};

// Array para selects en el frontend
const PAYMENT_METHODS_ARRAY = [
  { value: PAYMENT_METHODS.CAP_TRABAJOS, label: 'Cap de Trabajos Septic', type: 'bank' },
  { value: PAYMENT_METHODS.CAP_PROYECTOS, label: 'Capital de Proyectos Septic', type: 'bank' },
  { value: PAYMENT_METHODS.CHASE_BANK, label: 'Chase Bank', type: 'bank' },
  { value: PAYMENT_METHODS.AMEX, label: 'AMEX', type: 'credit_card' },
  { value: PAYMENT_METHODS.CHASE_CREDIT, label: 'Chase Credit Card', type: 'credit_card' },
  { value: PAYMENT_METHODS.CHEQUE, label: 'Cheque', type: 'other' },
  { value: PAYMENT_METHODS.TRANSFERENCIA, label: 'Transferencia Bancaria', type: 'transfer' },
  { value: PAYMENT_METHODS.EFECTIVO, label: 'Efectivo', type: 'cash' },
  { value: PAYMENT_METHODS.ZELLE, label: 'Zelle', type: 'digital' },
  { value: PAYMENT_METHODS.TARJETA_DEBITO, label: 'Tarjeta Débito', type: 'debit_card' },
  { value: PAYMENT_METHODS.PAYPAL, label: 'PayPal', type: 'digital' },
  { value: PAYMENT_METHODS.OTRO, label: 'Otro', type: 'other' }
];

// Categorías de gastos fijos
const FIXED_EXPENSE_CATEGORIES = {
  RENTA: 'Renta',
  SERVICIOS: 'Servicios',
  SEGUROS: 'Seguros',
  SALARIOS: 'Salarios',
  EQUIPAMIENTO: 'Equipamiento',
  SOFTWARE: 'Software/Subscripciones',
  MANTENIMIENTO_VEHICULAR: 'Mantenimiento Vehicular',
  COMBUSTIBLE: 'Combustible',
  IMPUESTOS: 'Impuestos',
  CONTABILIDAD: 'Contabilidad/Legal',
  MARKETING: 'Marketing',
  TELEFONIA: 'Telefonía',
  OTROS: 'Otros'
};

const FIXED_EXPENSE_CATEGORIES_ARRAY = [
  { value: FIXED_EXPENSE_CATEGORIES.RENTA, label: 'Renta', icon: '🏢' },
  { value: FIXED_EXPENSE_CATEGORIES.SERVICIOS, label: 'Servicios (Luz, Agua, Gas, Internet)', icon: '⚡' },
  { value: FIXED_EXPENSE_CATEGORIES.SEGUROS, label: 'Seguros', icon: '🛡️' },
  { value: FIXED_EXPENSE_CATEGORIES.SALARIOS, label: 'Salarios', icon: '👥' },
  { value: FIXED_EXPENSE_CATEGORIES.EQUIPAMIENTO, label: 'Equipamiento', icon: '🔧' },
  { value: FIXED_EXPENSE_CATEGORIES.SOFTWARE, label: 'Software/Subscripciones', icon: '💻' },
  { value: FIXED_EXPENSE_CATEGORIES.MANTENIMIENTO_VEHICULAR, label: 'Mantenimiento Vehicular', icon: '🚗' },
  { value: FIXED_EXPENSE_CATEGORIES.COMBUSTIBLE, label: 'Combustible', icon: '⛽' },
  { value: FIXED_EXPENSE_CATEGORIES.IMPUESTOS, label: 'Impuestos', icon: '📊' },
  { value: FIXED_EXPENSE_CATEGORIES.CONTABILIDAD, label: 'Contabilidad/Legal', icon: '📋' },
  { value: FIXED_EXPENSE_CATEGORIES.MARKETING, label: 'Marketing', icon: '📢' },
  { value: FIXED_EXPENSE_CATEGORIES.TELEFONIA, label: 'Telefonía', icon: '📞' },
  { value: FIXED_EXPENSE_CATEGORIES.OTROS, label: 'Otros', icon: '📦' }
];

// Frecuencias de gastos fijos
const FIXED_EXPENSE_FREQUENCIES = {
  MONTHLY: 'monthly',
  BIWEEKLY: 'biweekly',
  WEEKLY: 'weekly',
  QUARTERLY: 'quarterly',
  SEMIANNUAL: 'semiannual',
  ANNUAL: 'annual',
  ONE_TIME: 'one_time'
};

const FIXED_EXPENSE_FREQUENCIES_ARRAY = [
  { value: FIXED_EXPENSE_FREQUENCIES.WEEKLY, label: 'Semanal' },
  { value: FIXED_EXPENSE_FREQUENCIES.BIWEEKLY, label: 'Quincenal' },
  { value: FIXED_EXPENSE_FREQUENCIES.MONTHLY, label: 'Mensual' },
  { value: FIXED_EXPENSE_FREQUENCIES.QUARTERLY, label: 'Trimestral' },
  { value: FIXED_EXPENSE_FREQUENCIES.SEMIANNUAL, label: 'Semestral' },
  { value: FIXED_EXPENSE_FREQUENCIES.ANNUAL, label: 'Anual' },
  { value: FIXED_EXPENSE_FREQUENCIES.ONE_TIME, label: 'Pago Único' }
];

module.exports = {
  PAYMENT_METHODS,
  PAYMENT_METHODS_ARRAY,
  FIXED_EXPENSE_CATEGORIES,
  FIXED_EXPENSE_CATEGORIES_ARRAY,
  FIXED_EXPENSE_FREQUENCIES,
  FIXED_EXPENSE_FREQUENCIES_ARRAY
};
