// 💰 Constantes de Métodos de Pago
// Sincronizado con backend: Income.js, Expense.js, Receipt.js, FixedExpense.js

export const PAYMENT_METHODS = [
  // 🏦 Cuentas Bancarias
  { value: 'Proyecto Septic BOFA', label: 'Proyecto Septic BOFA', category: 'bank' },
  { value: 'Chase Bank', label: 'Chase Bank', category: 'bank' },
  
  // 💳 Tarjetas
  { value: 'AMEX', label: 'AMEX', category: 'card' },
  { value: 'Chase Credit Card', label: 'Chase Credit Card', category: 'card' },
  
  // � Otros Métodos
  { value: 'Transferencia Bancaria', label: 'Transferencia Bancaria', category: 'other' },
  { value: 'Efectivo', label: 'Efectivo', category: 'other' },
];

// Métodos de pago agrupados por categoría
export const PAYMENT_METHODS_GROUPED = {
  bank: PAYMENT_METHODS.filter(m => m.category === 'bank'),
  card: PAYMENT_METHODS.filter(m => m.category === 'card'),
  online: PAYMENT_METHODS.filter(m => m.category === 'online'),
  other: PAYMENT_METHODS.filter(m => m.category === 'other'),
};

// Categorías de Gastos Fijos (sincronizado con FixedExpense.js)
export const FIXED_EXPENSE_CATEGORIES = [
  { value: 'Renta', label: 'Renta' },
  { value: 'Servicios', label: 'Servicios (Luz, Agua, Gas, Internet)' },
  { value: 'Seguros', label: 'Seguros' },
  { value: 'Salarios', label: 'Salarios' },
  { value: 'Equipamiento', label: 'Equipamiento' },
  { value: 'Software/Subscripciones', label: 'Software/Subscripciones' },
  { value: 'Mantenimiento Vehicular', label: 'Mantenimiento Vehicular' },
  { value: 'Combustible', label: 'Combustible' },
  { value: 'Impuestos', label: 'Impuestos' },
  { value: 'Contabilidad/Legal', label: 'Contabilidad/Legal' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Telefonía', label: 'Telefonía' },
  { value: 'Otros', label: 'Otros' },
];

// Frecuencias de Gastos Fijos (sincronizado con FixedExpense.js)
export const FIXED_EXPENSE_FREQUENCIES = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
  { value: 'one_time', label: 'Único' },
];

// Tipos de Ingresos (sincronizado con Income.js)
export const INCOME_TYPES = [
  'Factura Pago Inicial Budget',
  'Factura Pago Final Budget',
  //'DiseñoDif',
  'Comprobante Ingreso',
];

// Tipos de Gastos (sincronizado con Expense.js)
export const EXPENSE_TYPES = [
  'Materiales',
  //'Diseño',
  // 'Workers', // ❌ Removido - Se maneja en módulo específico de workers
  'Imprevistos',
  // 'Comprobante Gasto', // ❌ Removido - Usar tipos específicos
  'Gastos Generales',
  'Materiales Iniciales',
  'Inspección Inicial',
  'Inspección Final',
  // 'Comisión Vendedor', // ❌ Removido - Se paga desde CommissionsManager.jsx
  'Gasto Fijo',
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
      if (value === 'Transferencia Bancaria') return '🔄';
      return '💰';
    default:
      return '💰';
  }
};
