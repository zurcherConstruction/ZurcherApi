const { Expense, FixedExpense, sequelize } = require('../data');
const { Op } = require('sequelize');

/**
 * GET /api/monthly-expenses
 * Obtener gastos devengados mensuales (Gastos Generales + Gastos Fijos)
 * Muestra el gasto real generado mensualmente independientemente del estado de pago
 */
const getMonthlyExpenses = async (req, res) => {
  try {
    const { year, month } = req.query;
    const currentYear = parseInt(year) || new Date().getFullYear();
    const specificMonth = month ? parseInt(month) : null; // Si se especifica un mes, solo mostrar ese mes
    
    console.log(`📊 Consultando gastos devengados para ${currentYear}${specificMonth ? ` - Mes: ${specificMonth}` : ''}`);

    // 1. GASTOS GENERALES desde Expense (excluyendo los que ya están en SupplierInvoices)
    // 🚫 Excluir también 'Gasto Fijo' que se gestiona en la tabla FixedExpense
    let generalExpensesWhere = {
      typeExpense: 'Gastos Generales',
      supplierInvoiceItemId: null, // 🚫 Excluir gastos ya vinculados a invoices de proveedores
      date: {
        [Op.gte]: `${currentYear}-01-01`,
        [Op.lte]: `${currentYear}-12-31`
      }
    };

    // Si se especifica un mes, filtrar por ese mes
    if (specificMonth) {
      const monthPadded = specificMonth.toString().padStart(2, '0');
      generalExpensesWhere.date = {
        [Op.gte]: `${currentYear}-${monthPadded}-01`,
        [Op.lte]: `${currentYear}-${monthPadded}-31`
      };
    }

    const generalExpensesQuery = await Expense.findAll({
      where: generalExpensesWhere,
      attributes: [
        'idExpense',
        'date',
        'amount',
        'paymentStatus',
        'notes',
        'vendor',
        'paidAmount',
        'paymentMethod',
        'createdAt'
      ],
      order: [['date', 'ASC']],
      raw: true
    });

    console.log(`💰 Encontrados ${generalExpensesQuery.length} gastos generales para ${currentYear}`);
    if (generalExpensesQuery.length > 0) {
      console.log(`   Primero: ${generalExpensesQuery[0].date} - $${generalExpensesQuery[0].amount}`);
      console.log(`   Último: ${generalExpensesQuery[generalExpensesQuery.length - 1].date} - $${generalExpensesQuery[generalExpensesQuery.length - 1].amount}`);
    }

    // 2. GASTOS FIJOS desde FixedExpense (independientes del pago)
    const fixedExpensesQuery = await FixedExpense.findAll({
      where: {
        isActive: true,
        // Solo gastos que estén vigentes en el año consultado
        [Op.or]: [
          { endDate: null },
          { endDate: { [Op.gte]: `${currentYear}-01-01` } }
        ]
      },
      attributes: [
        'idFixedExpense',
        'name',
        'description',
        'totalAmount',
        'frequency',
        'category',
        'startDate',
        'endDate',
        'isActive'
      ],
      order: [['name', 'ASC']],
      raw: true
    });

    console.log(`🔄 Encontrados ${fixedExpensesQuery.length} gastos fijos activos`);

    // 3. PROCESAR GASTOS POR MES
    const monthlyData = {};
    
    // Si se especifica un mes, solo inicializar ese mes
    const monthsToProcess = specificMonth ? [parseInt(specificMonth)] : Array.from({length: 12}, (_, i) => i + 1);
    
    monthsToProcess.forEach(monthNum => {
      const monthKey = monthNum.toString().padStart(2, '0');
      monthlyData[monthKey] = {
        month: monthKey,
        monthNumber: monthNum,
        monthName: getMonthName(monthNum),
        year: currentYear,
        generalExpenses: {
          count: 0,
          total: 0,
          paid: 0,
          unpaid: 0,
          partial: 0,
          items: []
        },
        fixedExpenses: {
          count: 0,
          total: 0,
          items: []
        },
        totalMonth: 0
      };
    });

    // 4. PROCESAR GASTOS GENERALES
    generalExpensesQuery.forEach(expense => {
      const expenseMonth = expense.date.substring(5, 7); // Extraer MM de YYYY-MM-DD
      const amount = parseFloat(expense.amount);
      
      if (monthlyData[expenseMonth]) {
        monthlyData[expenseMonth].generalExpenses.count++;
        monthlyData[expenseMonth].generalExpenses.total += amount;
        
        // Contar por estado
        if (expense.paymentStatus === 'paid' || expense.paymentStatus === 'paid_via_invoice') {
          monthlyData[expenseMonth].generalExpenses.paid += amount;
        } else if (expense.paymentStatus === 'partial') {
          monthlyData[expenseMonth].generalExpenses.partial += amount;
        } else {
          monthlyData[expenseMonth].generalExpenses.unpaid += amount;
        }

        monthlyData[expenseMonth].generalExpenses.items.push({
          id: expense.idExpense,
          date: expense.date,
          amount: amount,
          status: expense.paymentStatus,
          vendor: expense.vendor,
          notes: expense.notes,
          paidAmount: parseFloat(expense.paidAmount || 0),
          paymentMethod: expense.paymentMethod,
          pendingAmount: amount - parseFloat(expense.paidAmount || 0),
          type: 'general',
          category: 'Gastos Generales',
          createdAt: expense.createdAt
        });
      }
    });

    // 5. PROCESAR GASTOS FIJOS (generar por cada mes que aplique)
    fixedExpensesQuery.forEach(fixedExpense => {
      const startDate = new Date(fixedExpense.startDate);
      const endDate = fixedExpense.endDate ? new Date(fixedExpense.endDate) : new Date(`${currentYear}-12-31`);
      const baseAmount = parseFloat(fixedExpense.totalAmount);

      // Determinar en qué meses aplica este gasto fijo
      monthsToProcess.forEach(monthNum => {
        const monthDate = new Date(currentYear, monthNum - 1, 1);
        
        // Verificar si el gasto fijo aplica en este mes
        if (shouldIncludeFixedExpenseInMonth(fixedExpense.frequency, startDate, endDate, monthDate)) {
          const monthKey = monthNum.toString().padStart(2, '0');
          
          if (monthlyData[monthKey]) {
            // 🆕 Calcular cuántas veces se paga este gasto en el mes
            const timesPerMonth = getFrequencyMultiplier(fixedExpense.frequency, monthNum, currentYear);
            const monthlyAmount = baseAmount * timesPerMonth;
            
            monthlyData[monthKey].fixedExpenses.count++;
            monthlyData[monthKey].fixedExpenses.total += monthlyAmount;
            monthlyData[monthKey].fixedExpenses.items.push({
              id: fixedExpense.idFixedExpense,
              name: fixedExpense.name,
              description: fixedExpense.description,
              amount: monthlyAmount, // 🆕 Usar el monto ya multiplicado
              baseAmount: baseAmount, // 🆕 Guardar el monto base para referencia
              frequency: fixedExpense.frequency,
              timesPerMonth: timesPerMonth, // 🆕 Mostrar cuántas veces se paga
              category: fixedExpense.category,
              type: 'fixed',
              dueDay: fixedExpense.dueDay,
              startDate: fixedExpense.startDate,
              endDate: fixedExpense.endDate,
              // Para gastos fijos, calculamos una fecha estimada de vencimiento
              estimatedDueDate: `${currentYear}-${monthKey}-${String(fixedExpense.dueDay || 1).padStart(2, '0')}`
            });
          }
        }
      });
    });

    // 6. CALCULAR TOTALES MENSUALES
    Object.values(monthlyData).forEach(monthData => {
      monthData.totalMonth = monthData.generalExpenses.total + monthData.fixedExpenses.total;
      
      // Ordenar items por fecha
      monthData.generalExpenses.items.sort((a, b) => new Date(a.date) - new Date(b.date));
      monthData.fixedExpenses.items.sort((a, b) => a.name.localeCompare(b.name));
    });

    // 7. CALCULAR TOTALES ANUALES (solo si no se filtró por mes específico)
    const yearTotals = specificMonth ? null : {
      generalExpenses: Object.values(monthlyData).reduce((sum, month) => sum + month.generalExpenses.total, 0),
      fixedExpenses: Object.values(monthlyData).reduce((sum, month) => sum + month.fixedExpenses.total, 0),
      totalYear: 0
    };
    
    if (yearTotals) {
      yearTotals.totalYear = yearTotals.generalExpenses + yearTotals.fixedExpenses;
    }

    res.status(200).json({
      success: true,
      year: currentYear,
      month: specificMonth || null,
      monthlyData: Object.values(monthlyData),
      yearTotals,
      summary: {
        generalExpensesFound: generalExpensesQuery.length,
        fixedExpensesActive: fixedExpensesQuery.length,
        totalMonthsWithExpenses: Object.values(monthlyData).filter(m => m.totalMonth > 0).length,
        filter: specificMonth ? `Mes específico: ${getMonthName(parseInt(specificMonth))}` : 'Año completo'
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo gastos devengados mensuales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener gastos devengados mensuales',
      error: error.message
    });
  }
};

// Función auxiliar para determinar si un gasto fijo aplica en un mes específico
// 🆕 Función para calcular cuántas veces se paga un gasto fijo en un mes específico
function getFrequencyMultiplier(frequency, monthNum, year) {
  switch (frequency) {
    case 'daily':
      // Contar días del mes
      const daysInMonth = new Date(year, monthNum, 0).getDate();
      return daysInMonth;
    
    case 'weekly':
      // Contar semanas completas + días sueltos del mes
      const firstDay = new Date(year, monthNum - 1, 1);
      const lastDay = new Date(year, monthNum, 0);
      const weeksInMonth = Math.ceil((lastDay.getDate() + firstDay.getDay()) / 7);
      return weeksInMonth;
    
    case 'biweekly':
      // Dos veces al mes (cada 15 días aproximadamente)
      return 2;
    
    case 'monthly':
      // Una vez al mes
      return 1;
    
    case 'quarterly':
      // Una vez cada 3 meses (solo en ene, abr, jul, oct)
      return [1, 4, 7, 10].includes(monthNum) ? 1 : 0;
    
    case 'semiannual':
      // Una vez cada 6 meses (solo en enero y julio)
      return [1, 7].includes(monthNum) ? 1 : 0;
    
    case 'annual':
      // Una vez al año (solo en enero por defecto, pero solo se suma una vez)
      return monthNum === 1 ? 1 : 0;
    
    case 'one_time':
      // Única vez (solo aparece una vez)
      return 1;
    
    default:
      return 1;
  }
}

function shouldIncludeFixedExpenseInMonth(frequency, startDate, endDate, monthDate) {
  // Para one_time: verificar que esté en el mismo mes/año que startDate
  if (frequency === 'one_time') {
    return monthDate.getMonth() + 1 === startDate.getMonth() + 1 && 
           monthDate.getFullYear() === startDate.getFullYear();
  }

  // Para otros tipos: verificar que el mes esté dentro del rango de fechas del gasto fijo
  if (monthDate < startDate || monthDate > endDate) {
    return false;
  }

  switch (frequency) {
    case 'daily':
    case 'weekly':
    case 'biweekly':
    case 'monthly':
      return true; // Todos los meses
    case 'quarterly':
      // Trimestral: Enero, Abril, Julio, Octubre
      return [1, 4, 7, 10].includes(monthDate.getMonth() + 1);
    case 'semiannual':
      // Semestral: Enero y Julio
      return [1, 7].includes(monthDate.getMonth() + 1);
    case 'annual':
      // Anual: Solo en el mes de inicio
      return monthDate.getMonth() + 1 === startDate.getMonth() + 1;
    default:
      return true;
  }
}

// Función auxiliar para obtener nombre del mes
function getMonthName(monthNumber) {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[monthNumber - 1];
}

/**
 * 🆕 GET /api/monthly-expenses/available-years
 * Obtener los años que tienen datos de gastos disponibles
 */
const getAvailableYears = async (req, res) => {
  try {
    console.log('📅 Consultando años con datos disponibles...');

    // Obtener los años únicos de los gastos generales
    const generalExpenseYears = await Expense.findAll({
      where: {
        typeExpense: 'Gastos Generales',
        supplierInvoiceItemId: null
      },
      attributes: [[sequelize.fn('DISTINCT', sequelize.fn('DATE_TRUNC', 'year', sequelize.col('date'))), 'year']],
      raw: true
    });

    // Fallback si DATE_TRUNC no funciona (para SQLite u otros dialectos)
    let yearsWithData = new Set();
    
    if (generalExpenseYears.length === 0) {
      // Obtener todos los gastos y extraer año manualmente
      const allExpenses = await Expense.findAll({
        where: {
          typeExpense: 'Gastos Generales',
          supplierInvoiceItemId: null
        },
        attributes: ['date'],
        raw: true
      });

      allExpenses.forEach(expense => {
        const year = expense.date.substring(0, 4);
        yearsWithData.add(parseInt(year));
      });
    } else {
      generalExpenseYears.forEach(item => {
        if (item.year) {
          const year = new Date(item.year).getFullYear();
          yearsWithData.add(year);
        }
      });
    }

    // También agregar años de gastos fijos activos
    const fixedExpenses = await FixedExpense.findAll({
      where: { isActive: true },
      attributes: ['startDate', 'endDate'],
      raw: true
    });

    fixedExpenses.forEach(expense => {
      const startYear = parseInt(expense.startDate.substring(0, 4));
      yearsWithData.add(startYear);
      if (expense.endDate) {
        const endYear = parseInt(expense.endDate.substring(0, 4));
        yearsWithData.add(endYear);
      }
    });

    // Convertir a array y ordenar
    const availableYears = Array.from(yearsWithData).sort((a, b) => b - a);
    
    console.log(`✅ Años con datos disponibles: ${availableYears.join(', ')}`);

    res.status(200).json({
      success: true,
      availableYears,
      currentYear: new Date().getFullYear(),
      recommendedYear: availableYears.length > 0 ? availableYears[0] : new Date().getFullYear()
    });

  } catch (error) {
    console.error('❌ Error obteniendo años disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener años disponibles',
      error: error.message
    });
  }
};

module.exports = {
  getMonthlyExpenses,
  getAvailableYears
};