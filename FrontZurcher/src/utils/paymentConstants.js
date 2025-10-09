// 💰 Constantes de Métodos de Pago
// Sincronizado con backend: Income.js, Expense.js, Receipt.js, FixedExpense.js

export const PAYMENT_METHODS = [
  // Cuentas Bancarias
  { value: 'Cap Trabajos Septic', label: 'Cap Trabajos Septic', category: 'bank' },
  { value: 'Capital Proyectos Septic', label: 'Capital Proyectos Septic', category: 'bank' },
  { value: 'Chase Bank', label: 'Chase Bank', category: 'bank' },
  
  // Tarjetas
  { value: 'AMEX', label: 'AMEX', category: 'card' },
  { value: 'Chase Credit Card', label: 'Chase Credit Card', category: 'card' },
  { value: 'Tarjeta Débito', label: 'Tarjeta Débito', category: 'card' },
  
  // Otros Métodos
  { value: 'Cheque', label: 'Cheque', category: 'other' },
  { value: 'Transferencia Bancaria', label: 'Transferencia Bancaria', category: 'other' },
  { value: 'Efectivo', label: 'Efectivo', category: 'other' },
  { value: 'Zelle', label: 'Zelle', category: 'other' },
  { value: 'PayPal', label: 'PayPal', category: 'other' },
  { value: 'Otro', label: 'Otro', category: 'other' },
];

// Métodos de pago agrupados por categoría
export const PAYMENT_METHODS_GROUPED = {
  bank: PAYMENT_METHODS.filter(m => m.category === 'bank'),
  card: PAYMENT_METHODS.filter(m => m.category === 'card'),
  other: PAYMENT_METHODS.filter(m => m.category === 'other'),
};

// Categorías de Gastos Fijos
export const FIXED_EXPENSE_CATEGORIES = [
  { value: 'Alquiler', label: 'Alquiler' },
  { value: 'Servicios Públicos', label: 'Servicios Públicos' },
  { value: 'Seguros', label: 'Seguros' },
  { value: 'Salarios', label: 'Salarios' },
  { value: 'Suscripciones', label: 'Suscripciones' },
  { value: 'Mantenimiento', label: 'Mantenimiento' },
  { value: 'Impuestos', label: 'Impuestos' },
  { value: 'Otro', label: 'Otro' },
];

// Frecuencias de Gastos Fijos
export const FIXED_EXPENSE_FREQUENCIES = [
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
  { value: 'one-time', label: 'Único' },
];

// Tipos de Ingresos (sincronizado con Income.js)
export const INCOME_TYPES = [
  'Factura Pago Inicial Budget',
  'Factura Pago Final Budget',
  'DiseñoDif',
  'Comprobante Ingreso',
];

// Tipos de Gastos (sincronizado con Expense.js)
export const EXPENSE_TYPES = [
  'Materiales',
  'Diseño',
  'Workers',
  'Imprevistos',
  'Comprobante Gasto',
  'Gastos Generales',
  'Materiales Iniciales',
  'Inspección Inicial',
  'Inspección Final',
  'Comisión Vendedor',
  'Gasto Fijo', // 🆕 Para gastos fijos
];

// Tipos de Comprobantes (sincronizado con Receipt.js)
export const RECEIPT_TYPES = [
  'Factura Pago Inicial Budget',
  'Factura Pago Final Budget',
  'Materiales',
  'Diseño',
  'Workers',
  'Comisión Vendedor',
  'Imprevistos',
  'Comprobante Gasto',
  'Comprobante Ingreso',
  'Gastos Generales',
  'Materiales Iniciales',
  'Inspección Inicial',
  'Inspección Final',
  'Gasto Fijo', // 🆕 Para comprobantes de gastos fijos
];

// Helper para obtener label de método de pago
export const getPaymentMethodLabel = (value) => {
  const method = PAYMENT_METHODS.find(m => m.value === value);
  return method ? method.label : value;
};

// Helper para obtener categoría de método de pago
export const getPaymentMethodCategory = (value) => {
  const method = PAYMENT_METHODS.find(m => m.value === value);
  return method ? method.category : 'other';
};

// Helper para validar método de pago
export const isValidPaymentMethod = (value) => {
  return PAYMENT_METHODS.some(m => m.value === value);
};

// Helper para obtener icono según categoría
export const getPaymentMethodIcon = (value) => {
  const category = getPaymentMethodCategory(value);
  switch (category) {
    case 'bank':
      return '🏦';
    case 'card':
      return '💳';
    case 'other':
      if (value === 'Efectivo') return '💵';
      if (value === 'Cheque') return '📝';
      if (value === 'Transferencia Bancaria') return '🔄';
      return '💰';
    default:
      return '💰';
  }
};
