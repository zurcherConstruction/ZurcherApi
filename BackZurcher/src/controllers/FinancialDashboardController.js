const { Work, Budget, FinalInvoice, Expense, FixedExpensePayment, FixedExpense, SupplierInvoice, BankTransaction, BankAccount, Income } = require('../data');
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

      // 🚨 FECHA MÍNIMA: Solo contar transacciones desde el 1 de diciembre 2025 en adelante
      // Antes de esta fecha hay datos con lógica incorrecta (tarjetas marcadas como paid)
      const MINIMUM_DATE = '2025-12-01';
      const minimumDateObj = new Date(MINIMUM_DATE);
      minimumDateObj.setHours(0, 0, 0, 0);

      // Construir filtro de fechas
      let dateFilter = {};
      let filterDescription = '';
      
      if (startDate && endDate) {
        // Asegurar que no se incluyan fechas anteriores al mínimo
        const effectiveStartDate = new Date(startDate) >= minimumDateObj ? startDate : MINIMUM_DATE;
        
        dateFilter = {
          [Op.and]: [
            { createdAt: { [Op.gte]: new Date(effectiveStartDate) } },
            { createdAt: { [Op.lte]: new Date(endDate + 'T23:59:59') } }
          ]
        };
        filterDescription = `Rango: ${effectiveStartDate} a ${endDate} (mínimo: ${MINIMUM_DATE})`;
      } else if (month && year) {
        let firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0, 23, 59, 59);
        
        // Si el primer día del mes es anterior al mínimo, usar la fecha mínima
        if (firstDay < minimumDateObj) {
          firstDay = minimumDateObj;
        }
        
        dateFilter = {
          [Op.and]: [
            { createdAt: { [Op.gte]: firstDay } },
            { createdAt: { [Op.lte]: lastDay } }
          ]
        };
        filterDescription = `MES ESPECÍFICO: ${month}/${year} (${firstDay.toISOString().split('T')[0]} a ${lastDay.toISOString().split('T')[0]})`;
      } else {
        // Sin filtros específicos, pero aplicar fecha mínima
        dateFilter = {
          createdAt: { [Op.gte]: minimumDateObj }
        };
        filterDescription = `Desde ${MINIMUM_DATE} en adelante (datos reales)`;
      }

      // =============================================================
      // 1. INGRESOS (Usar SOLO la tabla Income como fuente única de verdad)
      // =============================================================
      
      const incomeFilter = {
        date: { [Op.gte]: MINIMUM_DATE } // Solo desde fecha mínima
      };
      
      // Income usa campo 'date' en formato string YYYY-MM-DD
      if (startDate && endDate) {
        const effectiveStartDate = new Date(startDate) >= minimumDateObj ? startDate : MINIMUM_DATE;
        incomeFilter.date = {
          [Op.between]: [effectiveStartDate, endDate]
        };
      } else if (month && year) {
        const monthStr = String(month).padStart(2, '0');
        const yearMonth = `${year}-${monthStr}`;
        const firstDayStr = `${yearMonth}-01`;
        
        // Si el mes es anterior a la fecha mínima, usar la fecha mínima
        if (firstDayStr < MINIMUM_DATE) {
          incomeFilter.date = {
            [Op.and]: [
              { [Op.gte]: MINIMUM_DATE },
              { [Op.like]: `${yearMonth}%` }
            ]
          };
        } else {
          incomeFilter.date = {
            [Op.like]: `${yearMonth}%`
          };
        }
      }

      const allIncomes = await Income.findAll({
        where: incomeFilter,
        attributes: ['amount', 'paymentMethod', 'typeIncome', 'date']
      });

      // Calcular total de ingresos
      const totalIncome = allIncomes.reduce((sum, inc) => 
        sum + parseFloat(inc.amount || 0), 0
      );

      // Contar por tipo
      const initialPaymentsCount = allIncomes.filter(inc => inc.typeIncome === 'Factura Pago Inicial Budget').length;
      const finalPaymentsCount = allIncomes.filter(inc => inc.typeIncome === 'Factura Pago Final Budget').length;
      const totalInitialPayments = allIncomes
        .filter(inc => inc.typeIncome === 'Factura Pago Inicial Budget')
        .reduce((sum, inc) => sum + parseFloat(inc.amount || 0), 0);
      const totalFinalPayments = allIncomes
        .filter(inc => inc.typeIncome === 'Factura Pago Final Budget')
        .reduce((sum, inc) => sum + parseFloat(inc.amount || 0), 0);

      // Desglose de ingresos por método de pago
      const incomeByPaymentMethod = {};
      
      allIncomes.forEach(income => {
        const method = income.paymentMethod || 'No especificado';
        const amount = parseFloat(income.amount || 0);
        incomeByPaymentMethod[method] = (incomeByPaymentMethod[method] || 0) + amount;
      });

      // =============================================================
      // 2. EGRESOS (Gastos + Comisiones + Tarjeta)
      // =============================================================

      // 2.1 Gastos regulares (Expenses) - SOLO los pagados
      // EXCLUIR los que fueron generados automáticamente por otros sistemas
      // EXCLUIR comisiones (se cuentan desde Budget.commissionAmount)
      // EXCLUIR gastos de tarjeta de crédito (son compromisos, no gastos pagados)
      const expensesFilter = {
        paymentStatus: { [Op.in]: ['paid', 'paid_via_invoice'] }, // Solo gastos realmente pagados
        // relatedFixedExpenseId: null, // ⚠️ Removido: se filtra después para poder contar duplicados
        supplierInvoiceItemId: null, // Excluir gastos auto-generados por pagos de proveedores
        paymentMethod: { 
          [Op.notIn]: ['Chase Credit Card', 'AMEX'] // Excluir tarjetas de crédito (son deudas, no gastos pagados)
        },
        date: { [Op.gte]: MINIMUM_DATE }, // Solo desde fecha mínima
        [Op.and]: [
          Sequelize.where(
            Sequelize.cast(Sequelize.col('typeExpense'), 'TEXT'),
            { [Op.notILike]: '%comisión%' }
          )
        ]
      };
      
      // Expenses usa campo 'date' en formato string YYYY-MM-DD
      if (startDate && endDate) {
        const effectiveStartDate = new Date(startDate) >= minimumDateObj ? startDate : MINIMUM_DATE;
        expensesFilter.date = {
          [Op.between]: [effectiveStartDate, endDate]
        };
      } else if (month && year) {
        const monthStr = String(month).padStart(2, '0');
        const yearMonth = `${year}-${monthStr}`;
        const firstDayStr = `${yearMonth}-01`;
        
        // Si el mes es anterior a la fecha mínima, usar la fecha mínima
        if (firstDayStr < MINIMUM_DATE) {
          expensesFilter.date = {
            [Op.and]: [
              { [Op.gte]: MINIMUM_DATE },
              { [Op.like]: `${yearMonth}%` }
            ]
          };
        } else {
          expensesFilter.date = {
            [Op.like]: `${yearMonth}%`
          };
        }
      }

      const expenses = await Expense.findAll({
        where: expensesFilter,
        attributes: ['amount', 'typeExpense', 'paymentMethod', 'date', 'paymentStatus', 'relatedFixedExpenseId', 'supplierInvoiceItemId']
      });

      console.log(`🔍 [Dashboard] Gastos encontrados: ${expenses.length}`);
      
      // 🚫 Filtrar gastos duplicados (que tienen relatedFixedExpenseId O son pagos parciales de gastos fijos)
      const nonDuplicatedExpenses = expenses.filter(exp => {
        // Excluir si tiene relatedFixedExpenseId
        if (exp.relatedFixedExpenseId) return false;
        
        // Excluir si es un pago parcial de gasto fijo (detectado por notas)
        if (exp.notes && exp.notes.toLowerCase().includes('pago parcial de gasto fijo')) return false;
        
        return true;
      });
      
      const duplicatedExpenses = expenses.filter(exp => 
        exp.relatedFixedExpenseId || 
        (exp.notes && exp.notes.toLowerCase().includes('pago parcial de gasto fijo'))
      );
      
      console.log(`✅ [Dashboard] Gastos no duplicados: ${nonDuplicatedExpenses.length}`);
      console.log(`⚠️ [Dashboard] Gastos duplicados excluidos: ${duplicatedExpenses.length}`);
      
      if (nonDuplicatedExpenses.length > 0) {
        console.log('🔍 [Dashboard] Primeros 3 gastos no duplicados:', nonDuplicatedExpenses.slice(0, 3).map(e => ({
          amount: e.amount,
          date: e.date,
          type: e.typeExpense,
          paymentStatus: e.paymentStatus
        })));
      }
      
      if (duplicatedExpenses.length > 0) {
        console.log('⚠️ [Dashboard] Gastos duplicados excluidos:', duplicatedExpenses.slice(0, 3).map(e => ({
          amount: e.amount,
          type: e.typeExpense,
          relatedFixedExpenseId: e.relatedFixedExpenseId
        })));
      }

      const totalExpenses = nonDuplicatedExpenses.reduce((sum, exp) => 
        sum + parseFloat(exp.amount || 0), 0
      );
      
      console.log(`💰 [Dashboard] Total gastos (sin duplicados): $${totalExpenses}`);

      // Desglose de gastos por método de pago (solo gastos no duplicados)
      const expensesByPaymentMethod = {};
      nonDuplicatedExpenses.forEach(expense => {
        const method = expense.paymentMethod || 'No especificado';
        const amount = parseFloat(expense.amount || 0);
        expensesByPaymentMethod[method] = (expensesByPaymentMethod[method] || 0) + amount;
      });

      // 2.2 Gastos fijos (FixedExpensePayments - solo pagos realmente efectuados)
      // ⚠️ EXCLUIR pagos con tarjeta de crédito (son deuda, no gasto real)
      const fixedExpensesFilter = {
        amount: { [Op.gt]: 0 }, // Solo pagos con monto real
        paymentDate: { [Op.gte]: MINIMUM_DATE }, // Solo desde fecha mínima
        paymentMethod: { 
          [Op.notIn]: ['Chase Credit Card', 'AMEX'] // Excluir tarjetas de crédito
        }
      };
      
      if (startDate && endDate) {
        const effectiveStartDate = new Date(startDate) >= minimumDateObj ? startDate : MINIMUM_DATE;
        fixedExpensesFilter.paymentDate = {
          [Op.between]: [effectiveStartDate, endDate]
        };
      } else if (month && year) {
        // paymentDate es DATEONLY, usar between con primer y último día del mes
        let firstDayStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${lastDayOfMonth}`;
        
        // Si el mes es anterior a la fecha mínima, ajustar
        if (firstDayStr < MINIMUM_DATE) {
          firstDayStr = MINIMUM_DATE;
        }
        
        fixedExpensesFilter.paymentDate = {
          [Op.between]: [firstDayStr, lastDayStr]
        };
      }

      const fixedExpensePayments = await FixedExpensePayment.findAll({
        where: fixedExpensesFilter,
        attributes: ['amount', 'paymentMethod', 'paymentDate']
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
      // ⚠️ EXCLUIR pagos con tarjeta de crédito (son deuda, no gasto real)
      // También excluir transacciones internas de tarjeta (isCreditCard: true)
      const supplierExpensesFilter = {
        [Op.and]: [
          {
            paymentStatus: { [Op.in]: ['paid', 'partial'] }
          },
          {
            [Op.or]: [
              { paymentMethod: { [Op.notIn]: ['Chase Credit Card', 'AMEX'] } },
              { paymentMethod: null }
            ]
          },
          {
            [Op.or]: [
              { isCreditCard: false },
              { isCreditCard: null }
            ]
          }
        ]
      };
      
      // Filtrar por paymentDate si existe, sino por createdAt
      if (startDate && endDate) {
        const effectiveStartDate = new Date(startDate) >= minimumDateObj ? startDate : MINIMUM_DATE;
        const start = new Date(effectiveStartDate);
        const end = new Date(endDate + 'T23:59:59');
        
        supplierExpensesFilter[Op.and].push({
          [Op.or]: [
            {
              paymentDate: {
                [Op.between]: [effectiveStartDate, endDate]
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
        let firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0, 23, 59, 59);
        let firstDayStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${lastDayOfMonth}`;
        
        // Si el mes es anterior a la fecha mínima, ajustar
        if (firstDay < minimumDateObj) {
          firstDay = minimumDateObj;
          firstDayStr = MINIMUM_DATE;
        }
        
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
      } else {
        // Sin filtros de mes/año, aplicar solo fecha mínima
        supplierExpensesFilter[Op.and].push({
          [Op.or]: [
            {
              paymentDate: { [Op.gte]: MINIMUM_DATE }
            },
            {
              paymentDate: null,
              createdAt: { [Op.gte]: minimumDateObj }
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
        commissionAmount: { [Op.gt]: 0 },
        commissionPaidDate: { [Op.gte]: MINIMUM_DATE } // Solo desde fecha mínima
      };
      
      if (Object.keys(dateFilter).length > 0 && startDate && endDate) {
        const effectiveStartDate = new Date(startDate) >= minimumDateObj ? startDate : MINIMUM_DATE;
        commissionsFilter.commissionPaidDate = {
          [Op.between]: [effectiveStartDate, endDate]
        };
      } else if (month && year) {
        const monthStr = String(month).padStart(2, '0');
        const yearMonth = `${year}-${monthStr}`;
        const firstDayStr = `${yearMonth}-01`;
        
        // Si el mes es anterior a la fecha mínima, usar la fecha mínima
        if (firstDayStr < MINIMUM_DATE) {
          commissionsFilter.commissionPaidDate = {
            [Op.and]: [
              { [Op.gte]: MINIMUM_DATE },
              { [Op.like]: `${yearMonth}%` }
            ]
          };
        } else {
          commissionsFilter.commissionPaidDate = {
            [Op.like]: `${yearMonth}%`
          };
        }
      }

      const paidCommissions = await Budget.findAll({
        where: commissionsFilter,
        attributes: ['commissionAmount', 'commissionPaidDate']
      });

      const totalCommissions = paidCommissions.reduce((sum, c) => 
        sum + parseFloat(c.commissionAmount || 0), 0
      );

      // Buscar BankTransactions de comisiones para agregarlos al desglose por método de pago
      let commissionBankTransactionsFilter = {
        description: { [Op.like]: '%Comisión:%' },
        date: { [Op.gte]: MINIMUM_DATE }
      };

      if (startDate && endDate) {
        const effectiveStartDate = new Date(startDate) >= minimumDateObj ? startDate : MINIMUM_DATE;
        commissionBankTransactionsFilter.date = {
          [Op.between]: [effectiveStartDate, endDate]
        };
      } else if (month && year) {
        const monthStr = String(month).padStart(2, '0');
        let firstDayStr = `${year}-${monthStr}-01`;
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        const lastDayStr = `${year}-${monthStr}-${lastDayOfMonth}`;
        
        // Si el mes es anterior a la fecha mínima, ajustar
        if (firstDayStr < MINIMUM_DATE) {
          firstDayStr = MINIMUM_DATE;
        }
        
        commissionBankTransactionsFilter.date = {
          [Op.between]: [firstDayStr, lastDayStr]
        };
      }

      const commissionTransactions = await BankTransaction.findAll({
        where: commissionBankTransactionsFilter,
        attributes: ['amount', 'bankAccountId'],
        include: [{
          model: BankAccount,
          as: 'account',
          attributes: ['accountName']
        }]
      });

      // Agregar comisiones al desglose por método de pago
      commissionTransactions.forEach(transaction => {
        const accountName = transaction.account ? transaction.account.accountName : 'No especificado';
        const amount = Math.abs(parseFloat(transaction.amount || 0)); // Comisiones son negativas
        expensesByPaymentMethod[accountName] = (expensesByPaymentMethod[accountName] || 0) + amount;
      });

      // 2.5 Pagos de Tarjetas de Crédito (BankTransactions con relatedCreditCardPaymentId)
      // ✅ IMPORTANTE: Los pagos de tarjeta SÍ son gastos reales
      // Cuando pagas la tarjeta, sale dinero real de tu cuenta = GASTO REAL del período
      // Los cargos a la tarjeta son solo DEUDA hasta que se pagan
      const creditCardPaymentsFilter = {
        transactionType: 'withdrawal',
        relatedCreditCardPaymentId: { [Op.ne]: null },
        date: { [Op.gte]: MINIMUM_DATE } // Solo desde fecha mínima
      };
      
      if (startDate && endDate) {
        const effectiveStartDate = new Date(startDate) >= minimumDateObj ? startDate : MINIMUM_DATE;
        const start = new Date(effectiveStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        creditCardPaymentsFilter.date = {
          [Op.between]: [start, end]
        };
      } else if (month && year) {
        let firstDay = new Date(year, month - 1, 1);
        firstDay.setHours(0, 0, 0, 0);
        const lastDay = new Date(year, month, 0, 23, 59, 59, 999);
        
        // Si el mes es anterior a la fecha mínima, ajustar
        if (firstDay < minimumDateObj) {
          firstDay = minimumDateObj;
        }
        
        creditCardPaymentsFilter.date = {
          [Op.between]: [firstDay, lastDay]
        };
      }

      const creditCardPayments = await BankTransaction.findAll({
        where: creditCardPaymentsFilter,
        attributes: ['amount', 'date', 'description', 'relatedCreditCardPaymentId', 'bankAccountId'],
        include: [{
          model: BankAccount,
          as: 'account',
          attributes: ['accountName']
        }]
      });

      console.log(`💳 [Dashboard] Pagos de tarjeta encontrados: ${creditCardPayments.length}`);
      if (creditCardPayments.length > 0) {
        console.log('💳 [Dashboard] Detalle:', creditCardPayments.map(p => ({
          amount: p.amount,
          date: p.date,
          description: p.description
        })));
      }

      // Separar pagos por tarjeta
      const chasePayments = creditCardPayments.filter(p => 
        p.description && (p.description.includes('Chase') || p.description.includes('chase'))
      );
      const amexPayments = creditCardPayments.filter(p => 
        p.description && (p.description.includes('AMEX') || p.description.includes('Amex'))
      );

      const totalChasePayments = chasePayments.reduce((sum, p) => 
        sum + parseFloat(p.amount || 0), 0
      );
      const totalAmexPayments = amexPayments.reduce((sum, p) => 
        sum + parseFloat(p.amount || 0), 0
      );
      const totalCreditCardPayments = totalChasePayments + totalAmexPayments;

      // Agregar pagos de tarjeta al desglose por método de pago (según cuenta bancaria usada)
      creditCardPayments.forEach(payment => {
        const accountName = payment.account ? payment.account.accountName : 'No especificado';
        const amount = parseFloat(payment.amount || 0);
        expensesByPaymentMethod[accountName] = (expensesByPaymentMethod[accountName] || 0) + amount;
      });

      // Total de egresos (INCLUYENDO pagos de tarjeta como gasto real)
      // 🔢 Asegurar que todos los valores sean números válidos
      const safeExpenses = parseFloat(totalExpenses) || 0;
      const safeFixedExpenses = parseFloat(totalFixedExpenses) || 0;
      const safeSupplierExpenses = parseFloat(totalSupplierExpenses) || 0;
      const safeCommissions = parseFloat(totalCommissions) || 0;
      const safeCreditCardPayments = parseFloat(totalCreditCardPayments) || 0;
      
      console.log('🔍 [Debug] Valores individuales:', {
        totalExpenses: safeExpenses,
        totalFixedExpenses: safeFixedExpenses,
        totalSupplierExpenses: safeSupplierExpenses,
        totalCommissions: safeCommissions,
        totalCreditCardPayments: safeCreditCardPayments
      });
      
      const totalEgresos = safeExpenses + safeFixedExpenses + safeSupplierExpenses + safeCommissions + safeCreditCardPayments;

      // =============================================================
      // 2.6 CUENTAS POR PAGAR (Tarjetas de Crédito)
      // =============================================================
      // Obtener balance actual de tarjetas de crédito (deuda pendiente)
      
      // Chase Credit Card: suma de expenses unpaid/partial
      const chaseCardExpenses = await Expense.findAll({
        where: {
          paymentMethod: 'Chase Credit Card',
          paymentStatus: { [Op.in]: ['unpaid', 'partial'] }
        },
        attributes: ['amount', 'paidAmount']
      });
      
      const chaseCardBalance = chaseCardExpenses.reduce((sum, exp) => {
        const total = parseFloat(exp.amount || 0);
        const paid = parseFloat(exp.paidAmount || 0);
        return sum + (total - paid);
      }, 0);

      // AMEX: suma de expenses unpaid/partial
      const amexExpenses = await Expense.findAll({
        where: {
          paymentMethod: 'AMEX',
          paymentStatus: { [Op.in]: ['unpaid', 'partial'] }
        },
        attributes: ['amount', 'paidAmount']
      });
      
      const amexBalance = amexExpenses.reduce((sum, exp) => {
        const total = parseFloat(exp.amount || 0);
        const paid = parseFloat(exp.paidAmount || 0);
        return sum + (total - paid);
      }, 0);

      const totalAccountsPayable = chaseCardBalance + amexBalance;

      // =============================================================
      // 3. BALANCE NETO
      // =============================================================
      const balanceNeto = (parseFloat(totalIncome) || 0) - (parseFloat(totalEgresos) || 0);

      // =============================================================
      // 4. DESGLOSE POR TIPO DE GASTO
      // =============================================================
      const expensesByType = {};
      nonDuplicatedExpenses.forEach(expense => {
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
      // ✅ Incluir pagos de tarjeta como gasto real (dinero que sale de la cuenta)
      if (totalCreditCardPayments > 0) {
        expensesByType['Pago Tarjeta Crédito'] = totalCreditCardPayments;
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
          totalCreditCardPayments, // Pagos realizados a tarjetas (INCLUIDO en totalEgresos)
          totalChasePayments, // Pagos a Chase Credit Card
          totalAmexPayments, // Pagos a AMEX
          totalAccountsPayable // Deuda pendiente en tarjetas
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
        // 🆕 Nueva sección: Cuentas por Pagar (Tarjetas de Crédito)
        accountsPayable: {
          totalBalance: parseFloat(totalAccountsPayable.toFixed(2)),
          chaseCardBalance: parseFloat(chaseCardBalance.toFixed(2)),
          amexBalance: parseFloat(amexBalance.toFixed(2)),
          paymentsMadeThisPeriod: parseFloat(totalCreditCardPayments.toFixed(2))
        },
        counts: {
          initialPaymentsCount,
          finalPaymentsCount,
          expensesCount: expenses.length,
          fixedExpensesCount: fixedExpensePayments.length,
          supplierExpensesCount: supplierExpenses.length,
          commissionsCount: paidCommissions.length,
          creditCardPaymentsCount: creditCardPayments.length
        }
      };

      console.log('🔍 [Backend] Enviando respuesta con totales:', {
        totalIncome,
        totalEgresos,
        balanceNeto,
        totalExpenses,
        totalFixedExpenses,
        totalCreditCardPayments
      });

      res.json(response);

    } catch (error) {
      console.error('❌ [FinancialDashboard] Error:', error);
      res.status(500).json({
        error: true,
        message: error.message
      });
    }
  },

  /**
   * 📊 DASHBOARD FINANCIERO DETALLADO CON TRANSACCIONES
   * Proporciona análisis completo con detalles de todas las transacciones para verificar duplicaciones
   */
  async getDetailedFinancialDashboard(req, res) {
    try {
      const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;
      
      // Fechas para filtrar (usar formato más inclusivo)
      const startDate = new Date(`${year}-${month.toString().padStart(2, '0')}-01T00:00:00`);
      const endDate = new Date(`${year}-${month.toString().padStart(2, '0')}-31T23:59:59`);
      const startDateStr = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDateStr = `${year}-${month.toString().padStart(2, '0')}-31`;
      
      console.log(`🔍 [DetailedDashboard] Analizando: ${startDateStr} - ${endDateStr}`);
      console.log(`🔍 [DetailedDashboard] Rango completo: ${startDate.toISOString()} - ${endDate.toISOString()}`);
      
      // ===== 1. INGRESOS DETALLADOS =====
      const incomes = await Income.findAll({
        where: {
          date: {
            [Op.between]: [startDate, endDate]
          }
        },
        order: [['date', 'DESC']],
        attributes: ['idIncome', 'date', 'amount', 'paymentMethod', 'typeIncome', 'notes', 'workId']
      });

      // ===== 2. GASTOS GENERALES DETALLADOS =====
      const allExpenses = await Expense.findAll({
        where: {
          [Op.and]: [
            { createdAt: { [Op.gte]: startDate } },
            { createdAt: { [Op.lte]: endDate } },
            { paymentStatus: 'paid' },
            {
              paymentMethod: {
                [Op.notIn]: ['Chase Credit Card', 'AMEX']
              }
            }
          ]
        },
        order: [['date', 'DESC']],
        attributes: ['idExpense', 'date', 'amount', 'paymentMethod', 'typeExpense', 'notes', 'workId', 'relatedFixedExpenseId']
      });
      
      // 🚫 Filtrar gastos duplicados SOLO si realmente están duplicados
      // Ser más conservador: solo excluir si está claramente marcado como duplicado
      const expenses = allExpenses.filter(exp => {
        // Incluir todos EXCEPTO aquellos que están claramente marcados como duplicados
        // Excluir si tiene relatedFixedExpenseId
        if (exp.relatedFixedExpenseId) return false;
        
        // Excluir si es un pago parcial de gasto fijo (detectado por notas)
        if (exp.notes && exp.notes.toLowerCase().includes('pago parcial de gasto fijo')) return false;
        
        return true;
      });
      
      const duplicatedExpenses = allExpenses.filter(exp => 
        exp.relatedFixedExpenseId || 
        (exp.notes && exp.notes.toLowerCase().includes('pago parcial de gasto fijo'))
      );
      
      console.log(`📄 [DetailedDashboard] Gastos totales encontrados: ${allExpenses.length}`);
      console.log(`✅ [DetailedDashboard] Gastos válidos (sin duplicar): ${expenses.length}`);
      console.log(`⚠️ [DetailedDashboard] Gastos duplicados excluidos: ${duplicatedExpenses.length}`);
      
      // 🔍 Log detallado de gastos excluidos para verificación
      if (duplicatedExpenses.length > 0) {
        console.log('🔍 [DetailedDashboard] Gastos duplicados excluidos:');
        duplicatedExpenses.forEach((dup, i) => {
          console.log(`   ${i+1}. ID:${dup.idExpense} | ${dup.date} | $${parseFloat(dup.amount).toFixed(2)} | relatedId: ${dup.relatedFixedExpenseId}`);
          console.log(`      Notas: ${dup.notes?.substring(0, 50) || 'Sin notas'}${dup.notes?.length > 50 ? '...' : ''}`);
        });
      }
      
      // 🔍 Log de verificación de totales
      const totalValidAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
      const totalAllAmount = allExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
      console.log(`💰 [DetailedDashboard] Total gastos válidos: $${totalValidAmount.toFixed(2)}`);
      console.log(`💰 [DetailedDashboard] Total gastos encontrados: $${totalAllAmount.toFixed(2)}`);
      console.log(`💰 [DetailedDashboard] Diferencia por exclusión: $${(totalAllAmount - totalValidAmount).toFixed(2)}`);

      // ===== 3. PAGOS DE GASTOS FIJOS DETALLADOS =====
      const fixedExpensePayments = await FixedExpensePayment.findAll({
        where: {
          paymentDate: {
            [Op.between]: [startDate, endDate]
          }
        },
        include: [{
          model: FixedExpense,
          as: 'fixedExpense',
          attributes: ['idFixedExpense', 'name', 'category', 'totalAmount', 'frequency', 'description'] // Fixed: usar totalAmount
        }],
        order: [['paymentDate', 'DESC']],
        attributes: ['idPayment', 'amount', 'paymentDate', 'paymentMethod', 'notes', 'fixedExpenseId']
      });

      // ===== 4. ANÁLISIS DE INGRESOS =====
      const incomesByMethod = {};
      let totalIncome = 0;
      
      incomes.forEach(income => {
        const method = income.paymentMethod || 'Sin especificar';
        if (!incomesByMethod[method]) {
          incomesByMethod[method] = { count: 0, total: 0, transactions: [] };
        }
        const amount = parseFloat(income.amount);
        incomesByMethod[method].count++;
        incomesByMethod[method].total += amount;
        incomesByMethod[method].transactions.push({
          id: income.idIncome,
          date: income.date,
          amount: amount,
          type: income.typeIncome,
          notes: income.notes,
          workId: income.workId
        });
        totalIncome += amount;
      });

      // ===== 5. ANÁLISIS DE GASTOS GENERALES =====
      const expensesByMethod = {};
      const expensesByType = {};
      const expensesBySupplier = {}; // 🎯 Pagos a proveedores específicos
      const expensesByCategory = {}; // 🎯 Nueva agrupación por categoría principal
      let totalGeneralExpenses = 0;

      expenses.forEach(expense => {
        const method = expense.paymentMethod || 'Sin especificar';
        const notes = expense.notes || '';
        
        // 🎯 CLASIFICACIÓN PRINCIPAL POR CATEGORÍA
        let mainCategory = 'Gastos Generales';
        let supplierName = null;
        
        // 1. Verificar si es comisión de vendedor
        if (notes.toLowerCase().includes('comisión') || 
            notes.toLowerCase().includes('comision') ||
            notes.toLowerCase().includes('commission')) {
          mainCategory = 'Comisiones de Vendedores';
        }
        // 2. Verificar si es pago a proveedor (contiene " - Invoice " o similar)
        else if (notes.includes(' - Invoice ') || 
                 (notes.includes(' - ') && !notes.toLowerCase().includes('paso') && 
                  !notes.toLowerCase().includes('pago') && !notes.toLowerCase().includes('comisión'))) {
          mainCategory = 'Pagos a Proveedores';
          
          // Extraer nombre del proveedor
          if (notes.includes(' - Invoice ')) {
            const parts = notes.split(' - Invoice ');
            if (parts[0]) {
              supplierName = parts[0].trim();
            }
          } else if (notes.includes(' - ')) {
            const parts = notes.split(' - ');
            if (parts[0]) {
              supplierName = parts[0].trim();
            }
          }
          
          // Limpiar y estandarizar nombres de proveedores
          if (supplierName) {
            supplierName = supplierName.split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
          } else {
            supplierName = 'Proveedor No Identificado';
          }
        }
        // 3. Materiales Iniciales
        else if (notes.toLowerCase().includes('materiales iniciales') || 
                 notes.toLowerCase().includes('gasto de materiales iniciales')) {
          mainCategory = 'Materiales Iniciales';
        }
        // 4. Materiales generales y Chambers/Endcaps
        else if (notes.toLowerCase().includes('chambers y endcaps') ||
                 notes.toLowerCase().includes('chambers') ||
                 notes.toLowerCase().includes('endcaps') ||
                 (notes.toLowerCase().includes('materiales') && !notes.toLowerCase().includes('materiales iniciales')) || 
                 notes.toLowerCase().includes('materials')) {
          mainCategory = 'Materiales';
        }
        // 5. Inspección Inicial
        else if (notes.toLowerCase().includes('inspection') ||
                 notes.toLowerCase().includes('inspección') ||
                 notes.toLowerCase().includes('initial inspection')) {
          mainCategory = 'Inspección Inicial';
        }
        // 6. Todo lo demás va a Gastos Generales (incluye: Nómina, Combustible, Seguros, Mantenimiento, etc.)
        else {
          mainCategory = 'Gastos Generales';
        }
        
        // 🎯 CLASIFICACIÓN DETALLADA POR TIPO (mantenida para compatibilidad)
        let type = 'Gastos Generales';
        
        if (notes.toLowerCase().includes('materiales iniciales') || 
            notes.toLowerCase().includes('gasto de materiales iniciales')) {
          type = 'Materiales Iniciales';
        } else if (notes.toLowerCase().includes('chambers y endcaps') ||
                  notes.toLowerCase().includes('chambers') ||
                  notes.toLowerCase().includes('endcaps')) {
          type = 'Materiales - Chambers y Endcaps';
        } else if (notes.toLowerCase().includes('inspection') ||
                  notes.toLowerCase().includes('inspección') ||
                  notes.toLowerCase().includes('initial inspection')) {
          type = 'Inspección Inicial';
        } else if (notes.toLowerCase().includes('payroll') ||
                  notes.toLowerCase().includes('salarios') ||
                  expense.relatedFixedExpenseId) {
          type = 'Nómina y Salarios';
        } else if (notes.toLowerCase().includes('gasolina') ||
                  notes.toLowerCase().includes('diesel') ||
                  notes.toLowerCase().includes('gas') ||
                  notes.toLowerCase().includes('combustible')) {
          type = 'Combustible';
        } else if (notes.toLowerCase().includes('sand') ||
                  notes.toLowerCase().includes('arena') ||
                  notes.toLowerCase().includes('trucking') ||
                  notes.toLowerCase().includes('transport')) {
          type = 'Transporte y Arena';
        } else if (notes.toLowerCase().includes('lift station') ||
                  notes.toLowerCase().includes('tanque') ||
                  notes.toLowerCase().includes('septic')) {
          type = 'Lift Station y Tanques';
        } else if (notes.toLowerCase().includes('agua') ||
                  notes.toLowerCase().includes('hielo') ||
                  notes.toLowerCase().includes('water') ||
                  notes.toLowerCase().includes('ice')) {
          type = 'Suministros Básicos';
        } else if (notes.toLowerCase().includes('liability') ||
                  notes.toLowerCase().includes('insurance') ||
                  notes.toLowerCase().includes('seguro')) {
          type = 'Seguros';
        } else if (notes.toLowerCase().includes('aceite') ||
                  notes.toLowerCase().includes('oil') ||
                  notes.toLowerCase().includes('grease') ||
                  notes.toLowerCase().includes('grasa')) {
          type = 'Mantenimiento Equipos';
        } else if (notes.toLowerCase().includes('comisión') || 
                  notes.toLowerCase().includes('comision') ||
                  notes.toLowerCase().includes('commission')) {
          type = 'Comisiones de Vendedores';
        }
        
        // Por método de pago
        if (!expensesByMethod[method]) {
          expensesByMethod[method] = { count: 0, total: 0, transactions: [] };
        }
        
        // Por tipo de gasto (detallado)
        if (!expensesByType[type]) {
          expensesByType[type] = { count: 0, total: 0, transactions: [] };
        }
        
        // 🎯 Por categoría principal
        if (!expensesByCategory[mainCategory]) {
          expensesByCategory[mainCategory] = { count: 0, total: 0, transactions: [] };
        }
        
        // 🎯 Por proveedor (solo si es pago a proveedor)
        if (mainCategory === 'Pagos a Proveedores' && supplierName) {
          if (!expensesBySupplier[supplierName]) {
            expensesBySupplier[supplierName] = { count: 0, total: 0, transactions: [] };
          }
        }
        
        const amount = parseFloat(expense.amount);
        const transaction = {
          id: expense.idExpense,
          date: expense.date,
          amount: amount,
          method: method,
          type: type,
          mainCategory: mainCategory, // 🎯 Categoría principal
          supplierName: supplierName, // 🎯 Nombre del proveedor (si aplica)
          notes: expense.notes,
          workId: expense.workId
        };
        
        expensesByMethod[method].count++;
        expensesByMethod[method].total += amount;
        expensesByMethod[method].transactions.push(transaction);
        
        expensesByType[type].count++;
        expensesByType[type].total += amount;
        expensesByType[type].transactions.push(transaction);
        
        // 🎯 Agrupar por categoría principal
        expensesByCategory[mainCategory].count++;
        expensesByCategory[mainCategory].total += amount;
        expensesByCategory[mainCategory].transactions.push(transaction);
        
        // 🎯 Agrupar por proveedor (solo si es pago a proveedor)
        if (mainCategory === 'Pagos a Proveedores' && supplierName) {
          expensesBySupplier[supplierName].count++;
          expensesBySupplier[supplierName].total += amount;
          expensesBySupplier[supplierName].transactions.push(transaction);
        }
        
        totalGeneralExpenses += amount;
      });

      // ===== 6. ANÁLISIS DE PAGOS GASTOS FIJOS =====
      const fixedPaymentsByMethod = {};
      let totalFixedPaid = 0;

      fixedExpensePayments.forEach(payment => {
        const method = payment.paymentMethod || 'Sin especificar';
        if (!fixedPaymentsByMethod[method]) {
          fixedPaymentsByMethod[method] = { count: 0, total: 0, payments: [] };
        }
        
        const amount = parseFloat(payment.amount);
        fixedPaymentsByMethod[method].count++;
        fixedPaymentsByMethod[method].total += amount;
        fixedPaymentsByMethod[method].payments.push({
          id: payment.idPayment,
          date: payment.paymentDate,
          amount: amount,
          fixedExpenseName: payment.fixedExpense?.name || 'N/A',
          category: payment.fixedExpense?.category || 'N/A', 
          notes: payment.notes || 'Sin notas',
          // 🎯 INFORMACIÓN COMPLETA DEL GASTO FIJO
          fixedExpenseDetails: {
            name: payment.fixedExpense?.name || 'Sin nombre',
            category: payment.fixedExpense?.category || 'Sin categoría',
            amount: payment.fixedExpense?.totalAmount || 0,
            frequency: payment.fixedExpense?.frequency || 'Sin frecuencia',
            description: payment.fixedExpense?.description || 'Sin descripción'
          }
        });
        
        totalFixedPaid += amount;
      });

      // ===== 7. IDENTIFICAR POSIBLES DUPLICACIONES =====
      const potentialDuplicates = [];
      
      // Verificar gastos generales vs pagos de gastos fijos (posible duplicación)
      const fixedPaymentAmounts = fixedExpensePayments.map(p => parseFloat(p.amount));
      
      expenses.forEach(expense => {
        const amount = parseFloat(expense.amount);
        if (expense.typeExpense === 'Gasto Fijo' && fixedPaymentAmounts.includes(amount)) {
          potentialDuplicates.push({
            type: 'possible_duplicate',
            description: `Gasto general de $${amount.toFixed(2)} puede estar duplicado con pago de gasto fijo`,
            expenseId: expense.idExpense,
            date: expense.date,
            amount: amount
          });
        }
      });

      // ===== 8. RESUMEN CONSOLIDADO =====
      const totalRealExpenses = totalFixedPaid + totalGeneralExpenses;
      const netBalance = totalIncome - totalRealExpenses;
      const efficiency = totalRealExpenses > 0 ? ((totalIncome / totalRealExpenses) * 100) : 0;

      // 🔍 VERIFICACIÓN FINAL DE INTEGRIDAD
      const categoriesTotal = Object.values(expensesByCategory).reduce((sum, cat) => sum + cat.total, 0);
      const categoriesCount = Object.values(expensesByCategory).reduce((sum, cat) => sum + cat.count, 0);
      
      console.log('\n🔍 [DetailedDashboard] VERIFICACIÓN FINAL:');
      console.log(`   Gastos procesados individualmente: ${expenses.length} | $${totalGeneralExpenses.toFixed(2)}`);
      console.log(`   Gastos en categorías: ${categoriesCount} | $${categoriesTotal.toFixed(2)}`);
      console.log(`   Diferencia en conteo: ${expenses.length - categoriesCount}`);
      console.log(`   Diferencia en monto: $${Math.abs(totalGeneralExpenses - categoriesTotal).toFixed(2)}`);
      
      if (Math.abs(totalGeneralExpenses - categoriesTotal) > 0.01 || expenses.length !== categoriesCount) {
        console.log('⚠️  [DetailedDashboard] ADVERTENCIA: Discrepancia en clasificación detectada');
      } else {
        console.log('✅ [DetailedDashboard] Todos los gastos clasificados correctamente');
      }

      const response = {
        success: true,
        data: {
          period: {
            month: parseInt(month),
            year: parseInt(year),
            startDate: startDateStr,
            endDate: endDateStr,
            periodName: `${getMonthName(month)} ${year}`
          },
          
          // Resumen principal
          summary: {
            totalIncome,
            totalGeneralExpenses,
            totalFixedPaid,
            totalRealExpenses,
            netBalance,
            efficiency: parseFloat(efficiency.toFixed(1))
          },
          
          // Detalles de ingresos
          incomeDetails: {
            total: totalIncome,
            transactionCount: incomes.length,
            byMethod: incomesByMethod,
            allTransactions: incomes.map(income => ({
              id: income.idIncome,
              date: income.date,
              amount: parseFloat(income.amount),
              method: income.paymentMethod,
              type: income.typeIncome,
              notes: income.notes,
              workId: income.workId
            }))
          },
          
          // Detalles de gastos generales
          expenseDetails: {
            total: totalGeneralExpenses,
            transactionCount: expenses.length,
            byMethod: expensesByMethod,
            byType: expensesByType,
            bySupplier: expensesBySupplier, // Pagos a proveedores específicos
            byCategory: expensesByCategory, // 🎯 Nueva agrupación por categoría principal
            allTransactions: expenses.map(expense => ({
              id: expense.idExpense,
              date: expense.date,
              amount: parseFloat(expense.amount),
              method: expense.paymentMethod,
              type: expense.typeExpense,
              notes: expense.notes,
              workId: expense.workId
            }))
          },
          
          // Detalles de pagos gastos fijos
          fixedPaymentDetails: {
            paid: totalFixedPaid,
            paymentCount: fixedExpensePayments.length,
            byPaymentMethod: fixedPaymentsByMethod,
            allPayments: fixedExpensePayments.map(payment => ({
              id: payment.idPayment,
              date: payment.paymentDate,
              amount: parseFloat(payment.amount),
              method: payment.paymentMethod,
              fixedExpenseName: payment.fixedExpense?.name || 'N/A',
              category: payment.fixedExpense?.category || 'N/A',
              notes: payment.notes
            }))
          },
          
          // Alertas y problemas
          alerts: {
            potentialDuplicates,
            hasLowEfficiency: efficiency < 120,
            hasNegativeBalance: netBalance < 0,
            duplicateCount: potentialDuplicates.length
          },
          
          // 🚫 Información sobre gastos duplicados excluidos
          duplicatesInfo: {
            excludedCount: duplicatedExpenses.length,
            excludedAmount: duplicatedExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0),
            excludedTransactions: duplicatedExpenses.map(expense => ({
              id: expense.idExpense,
              date: expense.date,
              amount: parseFloat(expense.amount),
              type: expense.typeExpense,
              notes: expense.notes,
              relatedFixedExpenseId: expense.relatedFixedExpenseId,
              reason: "Excluido por duplicación con FixedExpensePayment"
            }))
          }
        }
      };

      console.log(`✅ [DetailedDashboard] Procesado: ${incomes.length} ingresos, ${expenses.length} gastos, ${fixedExpensePayments.length} pagos fijos`);
      res.json(response);

    } catch (error) {
      console.error('❌ [DetailedDashboard] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener dashboard detallado',
        details: error.message
      });
    }
  }

};

// Helper function para nombres de meses
const getMonthName = (month) => {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[parseInt(month) - 1] || 'Desconocido';
};

module.exports = FinancialDashboardController;
