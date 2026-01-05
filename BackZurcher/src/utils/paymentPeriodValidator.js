/**
 * 🔍 UTILIDADES PARA VALIDACIÓN DE PERÍODOS
 * Validaciones inteligentes para pagos de gastos fijos
 * Evita pagos duplicados del mismo período
 */

/**
 * Validar que no exista un pago del mismo período
 * @param {Array} paymentHistory - Historial de pagos del gasto fijo
 * @param {string} paymentDate - Fecha de pago nueva (DEPRECATED - usar periodStart/periodEnd)
 * @param {string} frequency - Frecuencia del gasto (monthly, biweekly, etc)
 * @param {string} periodStart - Inicio del período (formato YYYY-MM-DD)
 * @param {string} periodEnd - Fin del período (formato YYYY-MM-DD)
 * @returns {Object} { isValid, message, conflictingPayment }
 */
function validateNoDuplicatePeriod(paymentHistory, paymentDate, frequency, periodStart, periodEnd) {
  if (!paymentHistory || paymentHistory.length === 0) {
    return { isValid: true, message: '' };
  }

  console.log(`\n🔍 [validateNoDuplicatePeriod] Validando duplicados:`);
  console.log(`   Nuevo período: ${periodStart} a ${periodEnd}`);
  console.log(`   Frecuencia: ${frequency}`);
  console.log(`   Pagos existentes: ${paymentHistory.length}`);

  // Si tenemos periodStart y periodEnd, usarlos para validación exacta
  if (periodStart && periodEnd) {
    for (const payment of paymentHistory) {
      console.log(`   Comparando con pago existente: ${payment.periodStart} a ${payment.periodEnd}`);
      
      // Validación exacta: mismo período = mismo start Y mismo end
      const isSamePeriod = 
        payment.periodStart === periodStart && 
        payment.periodEnd === periodEnd;
      
      if (isSamePeriod) {
        console.log(`   ❌ DUPLICADO ENCONTRADO! Período exacto ya existe`);
        return {
          isValid: false,
          message: `Ya existe un pago registrado para este período (${payment.paymentDate})`,
          conflictingPayment: payment
        };
      }
    }
    console.log(`   ✅ No hay duplicados de período exacto`);
    return { isValid: true, message: '' };
  }

  // Fallback: usar paymentDate si no tenemos período exacto
  const newPaymentDate = new Date(paymentDate);
  const newMonth = newPaymentDate.getMonth();
  const newYear = newPaymentDate.getFullYear();
  const newDate = newPaymentDate.getDate();

  // Lógica según frecuencia
  for (const payment of paymentHistory) {
    const payDate = new Date(payment.paymentDate);
    const payMonth = payDate.getMonth();
    const payYear = payDate.getFullYear();
    const payDay = payDate.getDate();

    let isDuplicate = false;

    switch (frequency) {
      case 'monthly':
        // Mismo mes/año = duplicado
        isDuplicate = payMonth === newMonth && payYear === newYear;
        break;

      case 'biweekly':
        // Si ambos pagos están en la misma quincena del mismo mes
        const newQuincena = newDate <= 15 ? 1 : 2;
        const payQuincena = payDay <= 15 ? 1 : 2;
        isDuplicate =
          payMonth === newMonth &&
          payYear === newYear &&
          payQuincena === newQuincena;
        break;

      case 'weekly':
        // Misma semana (lunes-domingo)
        const newWeekStart = new Date(newPaymentDate);
        newWeekStart.setDate(newPaymentDate.getDate() - newPaymentDate.getDay());

        const payWeekStart = new Date(payDate);
        payWeekStart.setDate(payDate.getDate() - payDate.getDay());

        isDuplicate =
          newWeekStart.toDateString() === payWeekStart.toDateString();
        break;

      case 'quarterly':
        // Mismo trimestre (3 meses)
        const newQuarter = Math.floor(newMonth / 3);
        const payQuarter = Math.floor(payMonth / 3);
        isDuplicate = newQuarter === payQuarter && payYear === newYear;
        break;

      case 'semiannual':
        // Mismo semestre (6 meses)
        const newSemester = Math.floor(newMonth / 6);
        const paySemester = Math.floor(payMonth / 6);
        isDuplicate = newSemester === paySemester && payYear === newYear;
        break;

      case 'annual':
        // Mismo año
        isDuplicate = payYear === newYear;
        break;

      case 'one_time':
        // Pagos únicos: si ya existe cualquier pago, es duplicado
        isDuplicate = true;
        break;

      default:
        // Default a monthly
        isDuplicate = payMonth === newMonth && payYear === newYear;
    }

    if (isDuplicate) {
      return {
        isValid: false,
        message: `Ya existe un pago registrado para este período (${payment.paymentDate})`,
        conflictingPayment: payment
      };
    }
  }

  return { isValid: true, message: '' };
}

/**
 * Validar período de pagado (inicio y fin)
 * Asegura que el período sea válido
 * @param {string} periodStart - Fecha inicio del período
 * @param {string} periodEnd - Fecha fin del período
 * @returns {Object} { isValid, message }
 */
function validatePaymentPeriod(periodStart, periodEnd) {
  if (!periodStart || !periodEnd) {
    return { isValid: true, message: '' };
  }

  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  if (start > end) {
    return {
      isValid: false,
      message: 'La fecha de inicio debe ser anterior a la fecha de fin'
    };
  }

  return { isValid: true, message: '' };
}

/**
 * Calcular período sugerido basado en fecha de pago y frecuencia
 * @param {string} paymentDate - Fecha de pago
 * @param {string} frequency - Frecuencia (monthly, biweekly, etc)
 * @returns {Object} { periodStart, periodEnd, periodDueDate }
 */
function calculateSuggestedPeriod(paymentDate, frequency) {
  const date = new Date(paymentDate);
  const year = date.getFullYear();
  const month = date.getMonth();

  let start, end, dueDate;

  switch (frequency) {
    case 'monthly':
      // Período: del 1 al último día del mes anterior (mes vencido)
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0); // Último día del mes anterior
      dueDate = new Date(year, month, 0); // Mes vencido
      break;

    case 'biweekly':
      // Determinar si es 1ª o 2ª quincena
      if (date.getDate() <= 15) {
        // Pago del 1-15: corresponde a 2ª quincena del mes anterior
        start = new Date(year, month - 1, 16);
        end = new Date(year, month, 0);
        dueDate = new Date(year, month, 0);
      } else {
        // Pago del 16-31: corresponde a 1ª quincena del mes actual
        start = new Date(year, month, 1);
        end = new Date(year, month, 15);
        dueDate = new Date(year, month, 15);
      }
      break;

    case 'weekly':
      // Período: semana anterior (lunes-domingo)
      const dayOfWeek = date.getDay();
      const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Lunes = 0
      start = new Date(date);
      start.setDate(date.getDate() - daysBack);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      dueDate = new Date(end);
      break;

    case 'quarterly':
      // Trimestre anterior
      const quarter = Math.floor(month / 3);
      const quarterStart = quarter * 3;
      start = new Date(year, quarterStart - 3, 1);
      end = new Date(year, quarterStart, 0);
      dueDate = new Date(end);
      break;

    case 'semiannual':
      // Semestre anterior
      if (month < 6) {
        start = new Date(year - 1, 6, 1);
        end = new Date(year, 0, 0);
      } else {
        start = new Date(year, 0, 1);
        end = new Date(year, 6, 0);
      }
      dueDate = new Date(end);
      break;

    case 'annual':
      // Año anterior
      start = new Date(year - 1, 0, 1);
      end = new Date(year, 0, 0);
      dueDate = new Date(end);
      break;

    case 'one_time':
    default:
      // Para únicos, usar el mes actual
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 0);
      dueDate = new Date(end);
  }

  return {
    periodStart: start.toISOString().split('T')[0],
    periodEnd: end.toISOString().split('T')[0],
    periodDueDate: dueDate.toISOString().split('T')[0]
  };
}

/**
 * Obtener descripción del período en formato amigable
 * @param {string} periodStart - Fecha inicio
 * @param {string} periodEnd - Fecha fin
 * @returns {string} Descripción del período
 */
function getPeriodDescription(periodStart, periodEnd) {
  if (!periodStart || !periodEnd) return '';

  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const startMonth = months[start.getMonth()];
  const endMonth = months[end.getMonth()];
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startMonth === endMonth && startYear === endYear) {
    return `${start.getDate()} al ${end.getDate()} de ${startMonth} de ${startYear}`;
  }

  if (startYear === endYear) {
    return `${start.getDate()} de ${startMonth} al ${end.getDate()} de ${endMonth} de ${startYear}`;
  }

  return `${start.getDate()} de ${startMonth} de ${startYear} al ${end.getDate()} de ${endMonth} de ${endYear}`;
}

module.exports = {
  validateNoDuplicatePeriod,
  validatePaymentPeriod,
  calculateSuggestedPeriod,
  getPeriodDescription
};
