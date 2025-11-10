const { Work, Budget, FinalInvoice, Expense, FixedExpensePayment, SupplierInvoice } = require('../data');
const { Sequelize, Op } = require('sequelize');

/**
 * Controlador para Dashboard Financiero Consolidado
 * Integra: Ingresos (Accounts Receivable), Gastos, Comisiones, Tarjeta de crédito
 */
const FinancialDashboardController = {

  /**
   * Obtener datos consolidados del dashboard financiero
   * Incluye filtros mensuales y desglose por método de pago
   */
  async getFinancialDashboard(req, res) {
    try {
      const { startDate, endDate, month, year } = req.query;

      console.log('📊 [FinancialDashboard] Generando dashboard financiero...');
      console.log('   Filtros:', { startDate, endDate, month, year });

      // Construir filtro de fechas
      let dateFilter = {};
      if (startDate && endDate) {
        dateFilter = {
          [Op.and]: [
            { createdAt: { [Op.gte]: new Date(startDate) } },
            { createdAt: { [Op.lte]: new Date(endDate + 'T23:59:59') } }
          ]
        };
      } else if (month && year) {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0, 23, 59, 59);
        dateFilter = {
          [Op.and]: [
            { createdAt: { [Op.gte]: firstDay } },
            { createdAt: { [Op.lte]: lastDay } }
          ]
        };
      }

      // =============================================================
      // 1. INGRESOS (Accounts Receivable)
      // =============================================================
      
      // 1.1 Initial Payments de Budgets
      const initialPaymentsFilter = {
        initialPayment: { [Op.gt]: 0 }
      };
      if (Object.keys(dateFilter).length > 0) {
        Object.assign(initialPaymentsFilter, dateFilter);
      }

      const budgetsWithInitialPayment = await Budget.findAll({
        where: initialPaymentsFilter,
        attributes: ['initialPayment', 'paymentProofMethod', 'createdAt']
      });

      // 1.2 Final Payments de Final Invoices
      const finalPaymentsFilter = {
        [Op.and]: [
          {
            [Op.or]: [
              { status: 'paid' },
              { totalAmountPaid: { [Op.gt]: 0 } }
            ]
          }
        ]
      };
      
      // Para Final Invoices, filtramos por paymentDate si existe, sino por createdAt
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate + 'T23:59:59');
        
        finalPaymentsFilter[Op.and].push({
          [Op.or]: [
            {
              paymentDate: {
                [Op.between]: [startDate, endDate]
              }
            },
            {
              paymentDate: null,
              createdAt: {
                [Op.between]: [start, end]
              }
            }
          ]
        });
      } else if (month && year) {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0, 23, 59, 59);
        const monthStr = String(month).padStart(2, '0');
        const firstDayStr = `${year}-${monthStr}-01`;
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        const lastDayStr = `${year}-${monthStr}-${lastDayOfMonth}`;
        
        finalPaymentsFilter[Op.and].push({
          [Op.or]: [
            {
              paymentDate: {
                [Op.between]: [firstDayStr, lastDayStr]
              }
            },
            {
              paymentDate: null,
              createdAt: {
                [Op.between]: [firstDay, lastDay]
              }
            }
          ]
        });
      }

      const finalInvoicePayments = await FinalInvoice.findAll({
        where: finalPaymentsFilter,
        attributes: ['totalAmountPaid', 'paymentDate', 'paymentNotes', 'createdAt']
      });

      // Calcular total de ingresos
      const totalInitialPayments = budgetsWithInitialPayment.reduce((sum, b) => 
        sum + parseFloat(b.initialPayment || 0), 0
      );
      const totalFinalPayments = finalInvoicePayments.reduce((sum, inv) => 
        sum + parseFloat(inv.totalAmountPaid || 0), 0
      );
      const totalIncome = totalInitialPayments + totalFinalPayments;

      // Desglose de ingresos por método de pago
      const incomeByPaymentMethod = {};
      
      budgetsWithInitialPayment.forEach(budget => {
        const method = budget.paymentProofMethod || 'No especificado';
        const amount = parseFloat(budget.initialPayment || 0);
        incomeByPaymentMethod[method] = (incomeByPaymentMethod[method] || 0) + amount;
      });

      // Para final invoices, extraemos método de paymentNotes si está disponible
      finalInvoicePayments.forEach(invoice => {
        const method = invoice.paymentNotes || 'No especificado';
        const amount = parseFloat(invoice.totalAmountPaid || 0);
        incomeByPaymentMethod[method] = (incomeByPaymentMethod[method] || 0) + amount;
      });

      // =============================================================
      // 2. EGRESOS (Gastos + Comisiones + Tarjeta)
      // =============================================================

      // 2.1 Gastos regulares (Expenses)
      const expensesFilter = {};
      if (Object.keys(dateFilter).length > 0) {
        // Expenses usa campo 'date' en formato string YYYY-MM-DD
        if (startDate && endDate) {
          expensesFilter.date = {
            [Op.between]: [startDate, endDate]
          };
        } else if (month && year) {
          const monthStr = String(month).padStart(2, '0');
          const yearMonth = `${year}-${monthStr}`;
          expensesFilter.date = {
            [Op.like]: `${yearMonth}%`
          };
        }
      }

      const expenses = await Expense.findAll({
        where: expensesFilter,
        attributes: ['amount', 'typeExpense', 'paymentMethod', 'date']
      });

      const totalExpenses = expenses.reduce((sum, exp) => 
        sum + parseFloat(exp.amount || 0), 0
      );

      // Desglose de gastos por método de pago
      const expensesByPaymentMethod = {};
      expenses.forEach(expense => {
        const method = expense.paymentMethod || 'No especificado';
        const amount = parseFloat(expense.amount || 0);
        expensesByPaymentMethod[method] = (expensesByPaymentMethod[method] || 0) + amount;
      });

      // 2.2 Gastos fijos (FixedExpensePayments)
      const fixedExpensesFilter = {};
      if (Object.keys(dateFilter).length > 0) {
        Object.assign(fixedExpensesFilter, dateFilter);
      }

      const fixedExpensePayments = await FixedExpensePayment.findAll({
        where: fixedExpensesFilter,
        attributes: ['amount', 'paymentMethod', 'createdAt']
      });

      const totalFixedExpenses = fixedExpensePayments.reduce((sum, fe) => 
        sum + parseFloat(fe.amount || 0), 0
      );

      fixedExpensePayments.forEach(payment => {
        const method = payment.paymentMethod || 'No especificado';
        const amount = parseFloat(payment.amount || 0);
        expensesByPaymentMethod[method] = (expensesByPaymentMethod[method] || 0) + amount;
      });

      // 2.3 Supplier Invoice Expenses (facturas de proveedores pagadas)
      const supplierExpensesFilter = {
        [Op.and]: [
          {
            paymentStatus: { [Op.in]: ['paid', 'partial'] }
          }
        ]
      };
      
      // Filtrar por paymentDate si existe, sino por createdAt
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate + 'T23:59:59');
        
        supplierExpensesFilter[Op.and].push({
          [Op.or]: [
            {
              paymentDate: {
                [Op.between]: [startDate, endDate]
              }
            },
            {
              paymentDate: null,
              createdAt: {
                [Op.between]: [start, end]
              }
            }
          ]
        });
      } else if (month && year) {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0, 23, 59, 59);
        const monthStr = String(month).padStart(2, '0');
        const firstDayStr = `${year}-${monthStr}-01`;
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        const lastDayStr = `${year}-${monthStr}-${lastDayOfMonth}`;
        
        supplierExpensesFilter[Op.and].push({
          [Op.or]: [
            {
              paymentDate: {
                [Op.between]: [firstDayStr, lastDayStr]
              }
            },
            {
              paymentDate: null,
              createdAt: {
                [Op.between]: [firstDay, lastDay]
              }
            }
          ]
        });
      }

      const supplierExpenses = await SupplierInvoice.findAll({
        where: supplierExpensesFilter,
        attributes: ['paidAmount', 'paymentMethod', 'paymentDate', 'createdAt']
      });

      const totalSupplierExpenses = supplierExpenses.reduce((sum, se) => 
        sum + parseFloat(se.paidAmount || 0), 0
      );

      supplierExpenses.forEach(expense => {
        const method = expense.paymentMethod || 'No especificado';
        const amount = parseFloat(expense.paidAmount || 0);
        expensesByPaymentMethod[method] = (expensesByPaymentMethod[method] || 0) + amount;
      });

      // 2.4 Comisiones pagadas (desde Budget)
      const commissionsFilter = {
        commissionPaid: true,
        commissionAmount: { [Op.gt]: 0 }
      };
      if (Object.keys(dateFilter).length > 0 && startDate && endDate) {
        commissionsFilter.commissionPaidDate = {
          [Op.between]: [startDate, endDate]
        };
      } else if (month && year) {
        const monthStr = String(month).padStart(2, '0');
        const yearMonth = `${year}-${monthStr}`;
        commissionsFilter.commissionPaidDate = {
          [Op.like]: `${yearMonth}%`
        };
      }

      const paidCommissions = await Budget.findAll({
        where: commissionsFilter,
        attributes: ['commissionAmount', 'commissionPaidDate']
      });

      const totalCommissions = paidCommissions.reduce((sum, c) => 
        sum + parseFloat(c.commissionAmount || 0), 0
      );

      // Las comisiones generalmente no tienen método de pago específico en Budget
      // Las agregamos como "Comisión" en el desglose
      if (totalCommissions > 0) {
        expensesByPaymentMethod['Comisión'] = (expensesByPaymentMethod['Comisión'] || 0) + totalCommissions;
      }

      // Total de egresos
      const totalEgresos = totalExpenses + totalFixedExpenses + totalSupplierExpenses + totalCommissions;

      // =============================================================
      // 3. BALANCE NETO
      // =============================================================
      const balanceNeto = totalIncome - totalEgresos;

      // =============================================================
      // 4. DESGLOSE POR TIPO DE GASTO
      // =============================================================
      const expensesByType = {};
      expenses.forEach(expense => {
        const type = expense.typeExpense || 'Otros';
        const amount = parseFloat(expense.amount || 0);
        expensesByType[type] = (expensesByType[type] || 0) + amount;
      });

      if (totalFixedExpenses > 0) {
        expensesByType['Gastos Fijos'] = totalFixedExpenses;
      }
      if (totalSupplierExpenses > 0) {
        expensesByType['Facturas Proveedores'] = totalSupplierExpenses;
      }
      if (totalCommissions > 0) {
        expensesByType['Comisiones'] = totalCommissions;
      }

      // =============================================================
      // 5. RESPUESTA
      // =============================================================
      const response = {
        summary: {
          totalIncome,
          totalEgresos,
          balanceNeto,
          totalInitialPayments,
          totalFinalPayments,
          totalExpenses,
          totalFixedExpenses,
          totalSupplierExpenses,
          totalCommissions
        },
        incomeByPaymentMethod: Object.entries(incomeByPaymentMethod).map(([method, amount]) => ({
          method,
          amount: parseFloat(amount.toFixed(2))
        })),
        expensesByPaymentMethod: Object.entries(expensesByPaymentMethod).map(([method, amount]) => ({
          method,
          amount: parseFloat(amount.toFixed(2))
        })),
        expensesByType: Object.entries(expensesByType).map(([type, amount]) => ({
          type,
          amount: parseFloat(amount.toFixed(2))
        })),
        counts: {
          initialPaymentsCount: budgetsWithInitialPayment.length,
          finalPaymentsCount: finalInvoicePayments.length,
          expensesCount: expenses.length,
          fixedExpensesCount: fixedExpensePayments.length,
          supplierExpensesCount: supplierExpenses.length,
          commissionsCount: paidCommissions.length
        }
      };

      console.log('✅ [FinancialDashboard] Dashboard generado exitosamente');
      console.log(`   💰 Ingresos: $${totalIncome.toFixed(2)}`);
      console.log(`   💸 Egresos: $${totalEgresos.toFixed(2)}`);
      console.log(`   📊 Balance: $${balanceNeto.toFixed(2)}`);

      res.json(response);

    } catch (error) {
      console.error('❌ [FinancialDashboard] Error:', error);
      res.status(500).json({
        error: true,
        message: error.message
      });
    }
  }

};

module.exports = FinancialDashboardController;
