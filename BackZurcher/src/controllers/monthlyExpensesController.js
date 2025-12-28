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
    const currentYear = year || new Date().getFullYear();
    const specificMonth = month; // Si se especifica un mes, solo mostrar ese mes
    
    console.log(`📊 Consultando gastos devengados para ${currentYear}${specificMonth ? ` - Mes: ${specificMonth}` : ''}`);

    // 1. GASTOS GENERALES desde Expense (excluyendo los que ya están en SupplierInvoices)
    let generalExpensesWhere = {
      typeExpense: 'Gastos Generales',
      supplierInvoiceItemId: null, // 🚫 Excluir gastos ya vinculados a invoices de proveedores
      date: {
        [Op.like]: `${currentYear}-%`
      }
    };

    // Si se especifica un mes, filtrar por ese mes
    if (specificMonth) {
      const monthPadded = specificMonth.toString().padStart(2, '0');
      generalExpensesWhere.date = {
        [Op.like]: `${currentYear}-${monthPadded}-%`
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
      order: [['date', 'ASC']]
    });

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
      order: [['name', 'ASC']]
    });

    console.log(`💰 Encontrados ${generalExpensesQuery.length} gastos generales`);
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
      const amount = parseFloat(fixedExpense.totalAmount);

      // Determinar en qué meses aplica este gasto fijo
      monthsToProcess.forEach(monthNum => {
        const monthDate = new Date(currentYear, monthNum - 1, 1);
        
        // Verificar si el gasto fijo aplica en este mes
        if (shouldIncludeFixedExpenseInMonth(fixedExpense.frequency, startDate, endDate, monthDate)) {
          const monthKey = monthNum.toString().padStart(2, '0');
          
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].fixedExpenses.count++;
            monthlyData[monthKey].fixedExpenses.total += amount;
            monthlyData[monthKey].fixedExpenses.items.push({
              id: fixedExpense.idFixedExpense,
              name: fixedExpense.name,
              description: fixedExpense.description,
              amount: amount,
              category: fixedExpense.category,
              frequency: fixedExpense.frequency,
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
function shouldIncludeFixedExpenseInMonth(frequency, startDate, endDate, monthDate) {
  // Verificar que el mes esté dentro del rango de fechas del gasto fijo
  if (monthDate < startDate || monthDate > endDate) {
    return false;
  }

  switch (frequency) {
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
    case 'biweekly':
    case 'weekly':
      // Para simplificar, quincenal y semanal los tratamos como mensuales
      return true;
    case 'one_time':
      // Única vez: Solo en el mes exacto de startDate
      return monthDate.getMonth() + 1 === startDate.getMonth() + 1 && 
             monthDate.getFullYear() === startDate.getFullYear();
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

module.exports = {
  getMonthlyExpenses
};