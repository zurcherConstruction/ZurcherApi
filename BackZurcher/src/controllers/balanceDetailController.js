const { Expense, Work, Budget, FixedExpense } = require('../data');
const { Op } = require('sequelize');

/**
 * 🎯 ANÁLISIS DETALLADO PARA BALANCE DASHBOARD
 * Obtener resumen expandible por método de pago y tipo de gasto
 */

const getBalanceDetailAnalysis = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: true,
        message: 'Fechas de inicio y fin son requeridas'
      });
    }

    // Obtener todos los gastos del período con información completa
    const expenses = await Expense.findAll({
      where: {
        date: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      },
      include: [
        {
          model: Work,
          as: 'work',
          required: false,
          include: [
            {
              model: Budget,
              as: 'budget',
              required: false,
              attributes: ['applicantName', 'propertyAddress']
            }
          ]
        },
        {
          model: FixedExpense,
          as: 'fixedExpense',
          required: false,
          attributes: ['name', 'description', 'category']
        }
      ],
      order: [['date', 'DESC'], ['amount', 'DESC']]
    });

    // =============================================================================
    // ANÁLISIS POR MÉTODO DE PAGO
    // =============================================================================
    const paymentMethodAnalysis = {};
    
    expenses.forEach(expense => {
      const method = expense.paymentMethod || 'Sin método';
      const amount = parseFloat(expense.amount) || 0;
      
      if (!paymentMethodAnalysis[method]) {
        paymentMethodAnalysis[method] = {
          method: method,
          totalAmount: 0,
          totalCount: 0,
          paidAmount: 0,
          paidCount: 0,
          unpaidAmount: 0,
          unpaidCount: 0,
          expenses: []
        };
      }
      
      paymentMethodAnalysis[method].totalAmount += amount;
      paymentMethodAnalysis[method].totalCount++;
      
      if (expense.paymentStatus === 'paid') {
        paymentMethodAnalysis[method].paidAmount += amount;
        paymentMethodAnalysis[method].paidCount++;
      } else {
        paymentMethodAnalysis[method].unpaidAmount += amount;
        paymentMethodAnalysis[method].unpaidCount++;
      }
      
      // Agregar detalles del gasto con información completa
      paymentMethodAnalysis[method].expenses.push({
        idExpense: expense.idExpense,
        date: expense.date,
        amount: amount,
        notes: expense.notes,
        paymentStatus: expense.paymentStatus,
        clientName: expense.work?.budget?.applicantName || expense.workName || 'Sin cliente',
        propertyAddress: expense.work?.budget?.propertyAddress || 'Sin dirección',
        workId: expense.workId,
        createdAt: expense.createdAt,
        // Información de gasto fijo si existe
        fixedExpenseInfo: expense.fixedExpense ? {
          name: expense.fixedExpense.name,
          description: expense.fixedExpense.description,
          category: expense.fixedExpense.category
        } : null,
        relatedFixedExpenseId: expense.relatedFixedExpenseId
      });
    });

    // =============================================================================
    // ANÁLISIS POR TIPO DE GASTO
    // =============================================================================
    const expenseTypeAnalysis = {};
    
    expenses.forEach(expense => {
      const amount = parseFloat(expense.amount) || 0;
      const notes = expense.notes || '';
      const notesLower = notes.toLowerCase();
      
      // 🎯 CLASIFICACIÓN MEJORADA Y MÁS ESPECÍFICA
      let expenseType = 'Gastos Generales';
      
      // 1. MATERIALES INICIALES - Muy específico
      if (notesLower.includes('materiales iniciales') || 
          notesLower.includes('gasto de materiales iniciales')) {
        expenseType = 'Materiales Iniciales';
      }
      // 2. INSPECCIÓN INICIAL - Muy específico  
      else if (notesLower.includes('initial inspection') ||
               notesLower.includes('inspección inicial') ||
               notesLower.includes('initial septic inspection') ||
               notesLower.includes('final septic inspection') ||
               (notesLower.includes('inspection') && notesLower.includes('address:'))) {
        expenseType = 'Inspección Inicial';
      }
      // 3. MATERIALES - Otros materiales que no sean iniciales
      else if ((notesLower.includes('chambers y endcaps') ||
                notesLower.includes('chambers') ||
                notesLower.includes('endcaps') ||
                notesLower.includes('lift station') ||
                notesLower.includes('tanque') ||
                notesLower.includes('correcion de tanque') ||
                notesLower.includes('materiales') ||
                notesLower.includes('pegamento') ||
                notesLower.includes('grasa') ||
                notesLower.includes('aceite')) && 
                !notesLower.includes('materiales iniciales')) {
        expenseType = 'Materiales';
      }
      // 4. NÓMINA Y SALARIOS - Gastos fijos de payroll
      else if (notesLower.includes('payroll') ||
               notesLower.includes('salarios') ||
               expense.relatedFixedExpenseId ||
               expense.fixedExpense) {
        expenseType = 'Nómina y Salarios';
      }
      // 5. COMBUSTIBLE - Categoría específica
      else if (notesLower.includes('gasolina') ||
               notesLower.includes('diesel') ||
               notesLower.includes('gas') ||
               notesLower.includes('combustible')) {
        expenseType = 'Combustible';
      }
      // 6. TRANSPORTE Y ARENA - Servicios de terceros
      else if (notesLower.includes('sand') ||
               notesLower.includes('arena') ||
               notesLower.includes('trucking') ||
               notesLower.includes('transport') ||
               notesLower.includes('gdg trucking') ||
               notesLower.includes('arian transport') ||
               notesLower.includes('ronay transport')) {
        expenseType = 'Transporte y Arena';
      }
      // 7. FEES E INSPECCIONES - Otros fees que no sean initial
      else if (notesLower.includes('fee') ||
               notesLower.includes('inspection') ||
               notesLower.includes('taxes') ||
               notesLower.includes('renovación') ||
               notesLower.includes('placas')) {
        expenseType = 'Fees e Inspecciones';
      }
      // 8. SEGUROS - Categoría específica
      else if (notesLower.includes('liability') ||
               notesLower.includes('insurance') ||
               notesLower.includes('seguro')) {
        expenseType = 'Seguros';
      }
      // 9. SUMINISTROS BÁSICOS - Agua, hielo, etc.
      else if (notesLower.includes('agua') ||
               notesLower.includes('hielo') ||
               notesLower.includes('water') ||
               notesLower.includes('ice')) {
        expenseType = 'Suministros Básicos';
      }
      // 10. LABOR/MANO DE OBRA - Pagos a subcontratistas
      else if (notesLower.includes('labor') ||
               notesLower.includes('instalacion') ||
               notesLower.includes('malagon llc') ||
               notesLower.includes('pago para')) {
        expenseType = 'Mano de Obra';
      }
      // 11. TODO LO DEMÁS - Gastos Generales
      
      if (!expenseTypeAnalysis[expenseType]) {
        expenseTypeAnalysis[expenseType] = {
          type: expenseType,
          totalAmount: 0,
          totalCount: 0,
          paidAmount: 0,
          paidCount: 0,
          unpaidAmount: 0,
          unpaidCount: 0,
          expenses: []
        };
      }
      
      expenseTypeAnalysis[expenseType].totalAmount += amount;
      expenseTypeAnalysis[expenseType].totalCount++;
      
      if (expense.paymentStatus === 'paid') {
        expenseTypeAnalysis[expenseType].paidAmount += amount;
        expenseTypeAnalysis[expenseType].paidCount++;
      } else {
        expenseTypeAnalysis[expenseType].unpaidAmount += amount;
        expenseTypeAnalysis[expenseType].unpaidCount++;
      }
      
      // Agregar detalles del gasto con información completa
      expenseTypeAnalysis[expenseType].expenses.push({
        idExpense: expense.idExpense,
        date: expense.date,
        amount: amount,
        notes: expense.notes,
        paymentStatus: expense.paymentStatus,
        paymentMethod: expense.paymentMethod,
        clientName: expense.work?.budget?.applicantName || expense.workName || 'Sin cliente',
        propertyAddress: expense.work?.budget?.propertyAddress || 'Sin dirección',
        workId: expense.workId,
        createdAt: expense.createdAt,
        // Información de gasto fijo si existe
        fixedExpenseInfo: expense.fixedExpense ? {
          name: expense.fixedExpense.name,
          description: expense.fixedExpense.description,
          category: expense.fixedExpense.category
        } : null,
        relatedFixedExpenseId: expense.relatedFixedExpenseId
      });
    });

    // =============================================================================
    // ESTADÍSTICAS GENERALES
    // =============================================================================
    const totalExpenses = expenses.length;
    const totalAmount = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    const paidExpenses = expenses.filter(exp => exp.paymentStatus === 'paid');
    const unpaidExpenses = expenses.filter(exp => exp.paymentStatus === 'unpaid');
    
    const paidAmount = paidExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    const unpaidAmount = unpaidExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

    // Ordenar por monto total (mayor a menor)
    const paymentMethodSummary = Object.values(paymentMethodAnalysis)
      .sort((a, b) => b.totalAmount - a.totalAmount);
    
    const expenseTypeSummary = Object.values(expenseTypeAnalysis)
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Respuesta
    res.json({
      error: false,
      period: {
        startDate,
        endDate
      },
      summary: {
        totalExpenses,
        totalAmount: totalAmount.toFixed(2),
        paidAmount: paidAmount.toFixed(2),
        unpaidAmount: unpaidAmount.toFixed(2),
        paidCount: paidExpenses.length,
        unpaidCount: unpaidExpenses.length,
        paidPercentage: totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(1) : 0
      },
      paymentMethods: paymentMethodSummary.map(method => ({
        ...method,
        totalAmount: method.totalAmount.toFixed(2),
        paidAmount: method.paidAmount.toFixed(2),
        unpaidAmount: method.unpaidAmount.toFixed(2),
        // Ordenar gastos por fecha descendente
        expenses: method.expenses
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .map(exp => ({
            ...exp,
            amount: parseFloat(exp.amount).toFixed(2)
          }))
      })),
      expenseTypes: expenseTypeSummary.map(type => ({
        ...type,
        totalAmount: type.totalAmount.toFixed(2),
        paidAmount: type.paidAmount.toFixed(2),
        unpaidAmount: type.unpaidAmount.toFixed(2),
        // Ordenar gastos por fecha descendente
        expenses: type.expenses
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .map(exp => ({
            ...exp,
            amount: parseFloat(exp.amount).toFixed(2)
          }))
      }))
    });

  } catch (error) {
    console.error('❌ Error en getBalanceDetailAnalysis:', error);
    res.status(500).json({
      error: true,
      message: 'Error interno del servidor',
      details: error.message
    });
  }
};

module.exports = {
  getBalanceDetailAnalysis
};