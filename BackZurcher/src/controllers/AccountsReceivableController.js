const { Work, Budget, FinalInvoice, ChangeOrder, WorkExtraItem, Staff } = require('../data');
const { Sequelize, Op } = require('sequelize');

/**
 * Controlador para Cuentas por Cobrar (Accounts Receivable)
 * Maneja el seguimiento de dinero pendiente por cobrar
 */
const AccountsReceivableController = {

  /**
   * Obtener resumen completo de cuentas por cobrar
   * Incluye: Budgets pendientes, FinalInvoices pendientes, ChangeOrders aprobados
   */
  async getAccountsReceivableSummary(req, res) {
    try {
      // 1. BUDGETS APROBADOS/FIRMADOS PERO NO CONVERTIDOS EN WORK
      const pendingBudgets = await Budget.findAll({
        where: {
          status: {
            [Op.in]: ['approved', 'signed', 'client_approved']
          }
        },
        include: [
          {
            model: Work,
            required: false // Left join para encontrar budgets SIN work
          }
        ]
      });

      // Filtrar solo budgets que NO tienen work asociado
      const budgetsWithoutWork = pendingBudgets.filter(budget => !budget.Work);

      // Calcular total pendiente de budgets
      const totalPendingFromBudgets = budgetsWithoutWork.reduce((sum, budget) => {
        const totalPrice = parseFloat(budget.totalPrice || 0);
        const initialPayment = parseFloat(budget.paymentProofAmount || 0);
        const remaining = totalPrice - initialPayment;
        return sum + remaining;
      }, 0);

      // 2. OBRAS EN PROGRESO CON FINAL INVOICE PENDIENTE
      const worksInProgress = await Work.findAll({
        where: {
          status: {
            [Op.in]: ['inProgress', 'finalInspectionPending', 'firstInspectionPending']
          }
        },
        include: [
          {
            model: Budget,
            as: 'budget'
          },
          {
            model: FinalInvoice,
            as: 'finalInvoice',
            required: false,
            include: [
              {
                model: WorkExtraItem,
                as: 'extraItems'
              }
            ]
          },
          {
            model: ChangeOrder,
            as: 'changeOrders',
            where: { status: 'approved' },
            required: false
          }
        ]
      });

      // Calcular total pendiente de obras en progreso
      let totalPendingFromWorks = 0;
      const worksPendingDetails = worksInProgress.map(work => {
        const budgetTotal = parseFloat(work.budget?.totalPrice || 0);
        const initialPayment = parseFloat(work.budget?.paymentProofAmount || 0);
        
        // Calcular extras de Change Orders aprobados
        const changeOrdersTotal = work.changeOrders?.reduce((sum, co) => {
          return sum + parseFloat(co.newTotalPrice || 0) - parseFloat(co.previousTotalPrice || 0);
        }, 0) || 0;

        // Calcular extras de Final Invoice
        const finalInvoiceExtras = work.finalInvoice?.subtotalExtras || 0;

        // Total a cobrar = Budget + Change Orders + Extras - Pago Inicial
        const totalDue = budgetTotal + changeOrdersTotal + parseFloat(finalInvoiceExtras) - initialPayment;

        // Calcular pagado de Final Invoice
        const finalInvoicePaid = work.finalInvoice?.status === 'paid' ? parseFloat(work.finalInvoice.finalAmountDue) : 0;
        
        const amountPending = totalDue - finalInvoicePaid;

        totalPendingFromWorks += amountPending;

        return {
          workId: work.idWork,
          propertyAddress: work.propertyAddress,
          status: work.status,
          clientName: work.budget?.applicantName || 'N/A',
          budgetTotal,
          initialPayment,
          changeOrdersTotal,
          finalInvoiceExtras,
          totalDue,
          finalInvoicePaid,
          amountPending,
          finalInvoiceStatus: work.finalInvoice?.status || 'not_created',
          hasChangeOrders: work.changeOrders?.length > 0,
          changeOrdersCount: work.changeOrders?.length || 0
        };
      });

      // 3. FINAL INVOICES PENDIENTES
      const pendingFinalInvoices = await FinalInvoice.findAll({
        where: {
          status: {
            [Op.in]: ['pending', 'partially_paid']
          }
        },
        include: [
          {
            model: Work,
            as: 'Work',
            include: [
              {
                model: Budget,
                as: 'budget'
              }
            ]
          },
          {
            model: WorkExtraItem,
            as: 'extraItems'
          }
        ]
      });

      const totalPendingFromFinalInvoices = pendingFinalInvoices.reduce((sum, invoice) => {
        return sum + parseFloat(invoice.finalAmountDue || 0);
      }, 0);

      // 4. CHANGE ORDERS APROBADOS PERO NO INCLUIDOS EN FINAL INVOICE
      const approvedChangeOrders = await ChangeOrder.findAll({
        where: {
          status: 'approved'
        },
        include: [
          {
            model: Work,
            as: 'work',
            include: [
              {
                model: Budget,
                as: 'budget'
              },
              {
                model: FinalInvoice,
                as: 'finalInvoice',
                required: false
              }
            ]
          }
        ]
      });

      const changeOrdersPendingDetails = approvedChangeOrders.map(co => {
        const increase = parseFloat(co.newTotalPrice || 0) - parseFloat(co.previousTotalPrice || 0);
        return {
          changeOrderId: co.id,
          workId: co.workId,
          propertyAddress: co.work?.propertyAddress || 'N/A',
          clientName: co.work?.budget?.applicantName || 'N/A',
          description: co.changeDescription,
          previousTotal: parseFloat(co.previousTotalPrice || 0),
          newTotal: parseFloat(co.newTotalPrice || 0),
          increase,
          approvedDate: co.approvedDate,
          includedInFinalInvoice: !!co.work?.finalInvoice
        };
      });

      // RESUMEN GENERAL
      const totalAccountsReceivable = totalPendingFromBudgets + totalPendingFromWorks + totalPendingFromFinalInvoices;

      res.status(200).json({
        summary: {
          totalAccountsReceivable,
          totalPendingFromBudgets,
          totalPendingFromWorks,
          totalPendingFromFinalInvoices,
          budgetsWithoutWorkCount: budgetsWithoutWork.length,
          worksInProgressCount: worksInProgress.length,
          pendingFinalInvoicesCount: pendingFinalInvoices.length,
          approvedChangeOrdersCount: approvedChangeOrders.length
        },
        details: {
          budgetsWithoutWork: budgetsWithoutWork.map(b => ({
            budgetId: b.idBudget,
            propertyAddress: b.propertyAddress,
            clientName: b.applicantName || 'N/A',
            totalPrice: parseFloat(b.totalPrice || 0),
            initialPayment: parseFloat(b.paymentProofAmount || 0),
            amountPending: parseFloat(b.totalPrice || 0) - parseFloat(b.paymentProofAmount || 0),
            status: b.status,
            date: b.date,
            expirationDate: b.expirationDate
          })),
          worksInProgress: worksPendingDetails,
          pendingFinalInvoices: pendingFinalInvoices.map(fi => ({
            finalInvoiceId: fi.id,
            workId: fi.workId,
            propertyAddress: fi.Work?.propertyAddress || 'N/A',
            clientName: fi.Work?.budget?.applicantName || 'N/A',
            originalBudgetTotal: parseFloat(fi.originalBudgetTotal || 0),
            initialPaymentMade: parseFloat(fi.initialPaymentMade || 0),
            subtotalExtras: parseFloat(fi.subtotalExtras || 0),
            finalAmountDue: parseFloat(fi.finalAmountDue || 0),
            status: fi.status,
            invoiceDate: fi.invoiceDate,
            extraItemsCount: fi.extraItems?.length || 0
          })),
          approvedChangeOrders: changeOrdersPendingDetails
        }
      });

    } catch (error) {
      console.error('Error obteniendo cuentas por cobrar:', error);
      res.status(500).json({
        error: true,
        message: 'Error al obtener cuentas por cobrar',
        details: error.message
      });
    }
  },

  /**
   * Obtener detalle de una obra específica con toda la información de cobros
   */
  async getWorkReceivableDetail(req, res) {
    const { workId } = req.params;

    try {
      const work = await Work.findByPk(workId, {
        include: [
          {
            model: Budget,
            as: 'budget'
          },
          {
            model: FinalInvoice,
            as: 'finalInvoice',
            include: [
              {
                model: WorkExtraItem,
                as: 'extraItems'
              }
            ]
          },
          {
            model: ChangeOrder,
            as: 'changeOrders',
            where: { status: 'approved' },
            required: false
          }
        ]
      });

      if (!work) {
        return res.status(404).json({ error: true, message: 'Obra no encontrada' });
      }

      // Calcular breakdown detallado
      const budgetTotal = parseFloat(work.budget?.totalPrice || 0);
      const initialPayment = parseFloat(work.budget?.paymentProofAmount || 0);

      const changeOrders = work.changeOrders?.map(co => ({
        id: co.id,
        description: co.changeDescription,
        previousTotal: parseFloat(co.previousTotalPrice || 0),
        newTotal: parseFloat(co.newTotalPrice || 0),
        increase: parseFloat(co.newTotalPrice || 0) - parseFloat(co.previousTotalPrice || 0),
        approvedDate: co.approvedDate
      })) || [];

      const totalChangeOrdersIncrease = changeOrders.reduce((sum, co) => sum + co.increase, 0);

      const extraItems = work.finalInvoice?.extraItems?.map(item => ({
        id: item.id,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        lineTotal: parseFloat(item.lineTotal)
      })) || [];

      const totalExtraItems = extraItems.reduce((sum, item) => sum + item.lineTotal, 0);

      const totalDue = budgetTotal + totalChangeOrdersIncrease + totalExtraItems;
      const totalPaid = initialPayment + (work.finalInvoice?.status === 'paid' ? parseFloat(work.finalInvoice.finalAmountDue) : 0);
      const amountPending = totalDue - totalPaid;

      res.status(200).json({
        work: {
          id: work.idWork,
          propertyAddress: work.propertyAddress,
          status: work.status,
          clientName: work.budget?.applicantName || 'N/A'
        },
        financials: {
          budgetTotal,
          initialPayment,
          totalChangeOrdersIncrease,
          totalExtraItems,
          totalDue,
          totalPaid,
          amountPending
        },
        breakdown: {
          changeOrders,
          extraItems
        },
        finalInvoice: work.finalInvoice ? {
          id: work.finalInvoice.id,
          status: work.finalInvoice.status,
          finalAmountDue: parseFloat(work.finalInvoice.finalAmountDue),
          invoiceDate: work.finalInvoice.invoiceDate,
          paymentDate: work.finalInvoice.paymentDate
        } : null
      });

    } catch (error) {
      console.error('Error obteniendo detalle de cuenta por cobrar:', error);
      res.status(500).json({
        error: true,
        message: 'Error al obtener detalle',
        details: error.message
      });
    }
  },

  /**
   * Obtener comisiones pendientes de pago a vendedores
   */
  async getPendingCommissions(req, res) {
    try {
      const budgetsWithCommissions = await Budget.findAll({
        where: {
          leadSource: 'sales_rep',
          createdByStaffId: { [Op.ne]: null },
          salesCommissionAmount: { [Op.gt]: 0 },
          [Op.or]: [
            { commissionPaid: false },
            { commissionPaid: null }
          ]
        },
        include: [
          {
            model: Staff,
            as: 'createdByStaff',
            attributes: ['id', 'name', 'email', 'role']
          },
          {
            model: Work,
            attributes: ['idWork', 'status']
          }
        ]
      });

      const totalPendingCommissions = budgetsWithCommissions.reduce((sum, budget) => {
        return sum + parseFloat(budget.salesCommissionAmount || 0);
      }, 0);

      // Agrupar por vendedor
      const commissionsBySalesRep = {};
      budgetsWithCommissions.forEach(budget => {
        const staffId = budget.createdByStaffId;
        const staffName = budget.createdByStaff?.name || 'Unknown';
        
        if (!commissionsBySalesRep[staffId]) {
          commissionsBySalesRep[staffId] = {
            staffId,
            staffName,
            staffEmail: budget.createdByStaff?.email,
            totalCommissions: 0,
            budgetsCount: 0,
            budgets: []
          };
        }

        commissionsBySalesRep[staffId].totalCommissions += parseFloat(budget.salesCommissionAmount || 0);
        commissionsBySalesRep[staffId].budgetsCount += 1;
        commissionsBySalesRep[staffId].budgets.push({
          budgetId: budget.idBudget,
          propertyAddress: budget.propertyAddress,
          clientName: budget.applicantName || 'N/A',
          commissionAmount: parseFloat(budget.salesCommissionAmount || 0),
          budgetStatus: budget.status,
          workStatus: budget.Work?.status || 'no_work',
          date: budget.date
        });
      });

      res.status(200).json({
        summary: {
          totalPendingCommissions,
          totalBudgetsWithCommissions: budgetsWithCommissions.length,
          salesRepsCount: Object.keys(commissionsBySalesRep).length
        },
        bySalesRep: Object.values(commissionsBySalesRep),
        allBudgets: budgetsWithCommissions.map(b => ({
          budgetId: b.idBudget,
          propertyAddress: b.propertyAddress,
          salesRepName: b.createdByStaff?.name || 'N/A',
          clientName: b.applicantName || 'N/A',
          commissionAmount: parseFloat(b.salesCommissionAmount || 0),
          budgetStatus: b.status,
          workStatus: b.Work?.status || 'no_work',
          date: b.date
        }))
      });

    } catch (error) {
      console.error('Error obteniendo comisiones pendientes:', error);
      res.status(500).json({
        error: true,
        message: 'Error al obtener comisiones pendientes',
        details: error.message
      });
    }
  }
};

module.exports = AccountsReceivableController;
