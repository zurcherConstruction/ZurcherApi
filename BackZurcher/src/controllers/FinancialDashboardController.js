const { Work, Budget, FinalInvoice, Expense, FixedExpensePayment, SupplierInvoice, BankTransaction } = require('../data');
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
      let filterDescription = '';
      
      if (startDate && endDate) {
        dateFilter = {
          [Op.and]: [
            { createdAt: { [Op.gte]: new Date(startDate) } },
            { createdAt: { [Op.lte]: new Date(endDate + 'T23:59:59') } }
          ]
        };
        filterDescription = `Rango: ${startDate} a ${endDate}`;
      } else if (month && year) {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0, 23, 59, 59);
        dateFilter = {
          [Op.and]: [
            { createdAt: { [Op.gte]: firstDay } },
            { createdAt: { [Op.lte]: lastDay } }
          ]
        };
        filterDescription = `MES ESPECÍFICO: ${month}/${year} (${firstDay.toISOString().split('T')[0]} a ${lastDay.toISOString().split('T')[0]})`;
      } else {
        filterDescription = 'Sin filtros - TODOS LOS REGISTROS';
      }
      
      console.log('   📅 Filtro aplicado:', filterDescription);

      // =============================================================
      // 1. INGRESOS (Accounts Receivable)
      // =============================================================
      
      // 1.1 Initial Payments de Budgets (solo los que tienen comprobante de pago - paymentProofAmount)
      const initialPaymentsFilter = {
        paymentProofAmount: { [Op.gt]: 0 } // Solo contar pagos con comprobante
      };
      
      // Para Budgets usamos el campo 'date' en formato YYYY-MM-DD
      if (startDate && endDate) {
        initialPaymentsFilter.date = {
          [Op.between]: [startDate, endDate]
        };
      } else if (month && year) {
        const monthStr = String(month).padStart(2, '0');
        const yearMonth = `${year}-${monthStr}`;
        initialPaymentsFilter.date = {
          [Op.like]: `${yearMonth}%`
        };
      }

      const budgetsWithInitialPayment = await Budget.findAll({
        where: initialPaymentsFilter,
        attributes: ['paymentProofAmount', 'paymentProofMethod', 'date']
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
        sum + parseFloat(b.paymentProofAmount || 0), 0
      );
      const totalFinalPayments = finalInvoicePayments.reduce((sum, inv) => 
        sum + parseFloat(inv.totalAmountPaid || 0), 0
      );
      const totalIncome = totalInitialPayments + totalFinalPayments;

      // Desglose de ingresos por método de pago
      const incomeByPaymentMethod = {};
      
      budgetsWithInitialPayment.forEach(budget => {
        const method = budget.paymentProofMethod || 'No especificado';
        const amount = parseFloat(budget.paymentProofAmount || 0);
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

      // 2.1 Gastos regulares (Expenses) - SOLO los pagados
      // EXCLUIR los que fueron generados automáticamente por otros sistemas
      // EXCLUIR comisiones (se cuentan desde Budget.commissionAmount)
      const expensesFilter = {
        paymentStatus: { [Op.in]: ['paid', 'paid_via_invoice'] }, // Solo gastos realmente pagados
        relatedFixedExpenseId: null, // Excluir gastos auto-generados por pagos de gastos fijos
        supplierInvoiceItemId: null, // Excluir gastos auto-generados por pagos de proveedores
        [Op.and]: [
          Sequelize.where(
            Sequelize.cast(Sequelize.col('typeExpense'), 'TEXT'),
            { [Op.notILike]: '%comisión%' }
          )
        ]
      };
      
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

      const expenses = await Expense.findAll({
        where: expensesFilter,
        attributes: ['amount', 'typeExpense', 'paymentMethod', 'date', 'paymentStatus', 'relatedFixedExpenseId', 'supplierInvoiceItemId']
      });

      console.log(`   💸 Gastos regulares encontrados: ${expenses.length} expenses`);
      if (expenses.length > 0) {
        console.log(`      Primeros 3:`, expenses.slice(0, 3).map(e => ({
          amount: e.amount,
          type: e.typeExpense,
          date: e.date,
          status: e.paymentStatus,
          method: e.paymentMethod
        })));
        
        // Mostrar resumen por método de pago para verificar
        const byMethod = {};
        expenses.forEach(e => {
          const method = e.paymentMethod || 'No especificado';
          byMethod[method] = (byMethod[method] || 0) + parseFloat(e.amount || 0);
        });
        console.log(`      Resumen por método:`, byMethod);
      }

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

      // 2.2 Gastos fijos (FixedExpensePayments - solo pagos realmente efectuados)
      const fixedExpensesFilter = {
        amount: { [Op.gt]: 0 } // Solo pagos con monto real
      };
      
      if (startDate && endDate) {
        fixedExpensesFilter.paymentDate = {
          [Op.between]: [startDate, endDate]
        };
      } else if (month && year) {
        // paymentDate es DATEONLY, usar between con primer y último día del mes
        const firstDayStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${lastDayOfMonth}`;
        
        fixedExpensesFilter.paymentDate = {
          [Op.between]: [firstDayStr, lastDayStr]
        };
      }

      const fixedExpensePayments = await FixedExpensePayment.findAll({
        where: fixedExpensesFilter,
        attributes: ['amount', 'paymentMethod', 'paymentDate']
      });

      console.log(`   💸 Pagos de gastos fijos encontrados: ${fixedExpensePayments.length} payments`);
      if (fixedExpensePayments.length > 0) {
        console.log(`      Primeros 3:`, fixedExpensePayments.slice(0, 3).map(p => ({
          amount: p.amount,
          method: p.paymentMethod,
          date: p.paymentDate
        })));
      }

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

      console.log(`   💸 Facturas de proveedores encontradas: ${supplierExpenses.length} invoices`);

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

      // 2.5 Pagos de Tarjetas de Crédito (BankTransactions con relatedCreditCardPaymentId)
      const creditCardPaymentsFilter = {
        transactionType: 'withdrawal',
        relatedCreditCardPaymentId: { [Op.ne]: null }
      };
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        creditCardPaymentsFilter.date = {
          [Op.between]: [start, end]
        };
      } else if (month && year) {
        const firstDay = new Date(year, month - 1, 1);
        firstDay.setHours(0, 0, 0, 0);
        const lastDay = new Date(year, month, 0, 23, 59, 59, 999);
        creditCardPaymentsFilter.date = {
          [Op.between]: [firstDay, lastDay]
        };
      }

      const creditCardPayments = await BankTransaction.findAll({
        where: creditCardPaymentsFilter,
        attributes: ['amount', 'date', 'description']
      });

      console.log(`   💸 Pagos de tarjetas encontrados: ${creditCardPayments.length} payments`);

      const totalCreditCardPayments = creditCardPayments.reduce((sum, p) => 
        sum + parseFloat(p.amount || 0), 0
      );

      // Los pagos de tarjeta siempre salen de Chase Bank
      if (totalCreditCardPayments > 0) {
        expensesByPaymentMethod['Chase Bank (Pago Tarjeta)'] = (expensesByPaymentMethod['Chase Bank (Pago Tarjeta)'] || 0) + totalCreditCardPayments;
      }

      // Total de egresos
      const totalEgresos = totalExpenses + totalFixedExpenses + totalSupplierExpenses + totalCommissions + totalCreditCardPayments;

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
      if (totalCreditCardPayments > 0) {
        expensesByType['Pagos Tarjetas Crédito'] = totalCreditCardPayments;
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
          totalCommissions,
          totalCreditCardPayments
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
          commissionsCount: paidCommissions.length,
          creditCardPaymentsCount: creditCardPayments.length
        }
      };

      console.log('✅ [FinancialDashboard] Dashboard generado exitosamente');
      console.log(`   📅 Período: ${filterDescription}`);
      console.log(`   💰 Ingresos TOTALES DEL PERÍODO: $${totalIncome.toFixed(2)}`);
      console.log(`      - Initial Payments: $${totalInitialPayments.toFixed(2)} (${budgetsWithInitialPayment.length} budgets)`);
      console.log(`      - Final Payments: $${totalFinalPayments.toFixed(2)} (${finalInvoicePayments.length} invoices)`);
      console.log(`   💸 Egresos TOTALES DEL PERÍODO: $${totalEgresos.toFixed(2)}`);
      console.log(`      - Gastos regulares: $${totalExpenses.toFixed(2)} (${expenses.length} expenses)`);
      console.log(`      - Gastos fijos: $${totalFixedExpenses.toFixed(2)} (${fixedExpensePayments.length} payments)`);
      console.log(`      - Facturas proveedores: $${totalSupplierExpenses.toFixed(2)} (${supplierExpenses.length} invoices)`);
      console.log(`      - Comisiones: $${totalCommissions.toFixed(2)} (${paidCommissions.length} commissions)`);
      console.log(`      - Pagos tarjetas: $${totalCreditCardPayments.toFixed(2)} (${creditCardPayments.length} payments)`);
      console.log(`   📊 Balance del período: $${balanceNeto.toFixed(2)}`);

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
