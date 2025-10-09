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
      // ✅ CAMBIO: Solo mostrar WORKS (budgets que YA tienen pago inicial y son seguros)
      // Los budgets sin work NO son seguros, no deberían estar en cuentas por cobrar
      
      // 1. OBRAS EN PROGRESO O COMPLETADAS (LO QUE REALMENTE VAMOS A COBRAR)
      const worksInProgress = await Work.findAll({
        where: {
          status: {
            [Op.in]: ['inProgress', 'finalInspectionPending', 'firstInspectionPending', 'finalApproved', 'paymentReceived']
          }
        },
        include: [
          {
            model: Budget,
            as: 'budget',
            include: [
              {
                model: Staff,
                as: 'createdByStaff', // ✅ Alias correcto según definición en data/index.js
                attributes: ['id', 'name', 'email']
              }
            ]
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
          changeOrdersCount: work.changeOrders?.length || 0,
          // 🆕 Información de comisión
          commissionAmount: parseFloat(work.budget?.commissionAmount || 0),
          commissionPaid: work.budget?.commissionPaid || false,
          commissionPaidDate: work.budget?.commissionPaidDate || null,
          salesRepName: work.budget?.createdByStaff?.name || 'N/A',
          salesRepId: work.budget?.createdByStaffId || null
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

      // ✅ RESUMEN GENERAL (sin budgets sin work)
      const totalAccountsReceivable = totalPendingFromWorks + totalPendingFromFinalInvoices;

      res.status(200).json({
        summary: {
          totalAccountsReceivable,
          totalPendingFromWorks,
          totalPendingFromFinalInvoices,
          worksInProgressCount: worksInProgress.length,
          pendingFinalInvoicesCount: pendingFinalInvoices.length,
          approvedChangeOrdersCount: approvedChangeOrders.length
        },
        details: {
          // ✅ ELIMINADO: budgetsWithoutWork (no son seguros, no deberían estar aquí)
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
      // ✅ MOSTRAR TODAS LAS COMISIONES (pagadas y pendientes)
      // Incluye tanto sales_rep como external_referral
      const budgetsWithCommissions = await Budget.findAll({
        where: {
          [Op.or]: [
            {
              // Sales Reps (vendedores internos) - comisión fija $500
              leadSource: 'sales_rep',
              createdByStaffId: { [Op.ne]: null },
              salesCommissionAmount: { [Op.gt]: 0 }
            },
            {
              // External Referrals (referidos externos) - comisión variable
              leadSource: 'external_referral',
              externalReferralName: { [Op.ne]: null },
              commissionAmount: { [Op.gt]: 0 }
            }
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

      // ✅ Calcular totales de comisiones PAGADAS y PENDIENTES
      let totalPendingCommissions = 0;
      let totalPaidCommissions = 0;
      
      budgetsWithCommissions.forEach(budget => {
        // Para sales_rep usar salesCommissionAmount, para external_referral usar commissionAmount
        const amount = budget.leadSource === 'sales_rep' 
          ? parseFloat(budget.salesCommissionAmount || 0)
          : parseFloat(budget.commissionAmount || 0);
        
        if (budget.commissionPaid) {
          totalPaidCommissions += amount;
        } else {
          totalPendingCommissions += amount;
        }
      });

      // Agrupar por vendedor/referido
      const commissionsBySalesRep = {}; // Incluye sales reps
      const commissionsByExternalReferral = {}; // Incluye external referrals
      
      budgetsWithCommissions.forEach(budget => {
        const amount = budget.leadSource === 'sales_rep'
          ? parseFloat(budget.salesCommissionAmount || 0)
          : parseFloat(budget.commissionAmount || 0);

        if (budget.leadSource === 'sales_rep') {
          // Agrupar por vendedor interno (Staff)
          const staffId = budget.createdByStaffId;
          const staffName = budget.createdByStaff?.name || 'Unknown';
          
          if (!commissionsBySalesRep[staffId]) {
            commissionsBySalesRep[staffId] = {
              type: 'sales_rep',
              staffId,
              staffName,
              staffEmail: budget.createdByStaff?.email,
              totalCommissions: 0,
              totalPaid: 0,
              totalPending: 0,
              budgetsCount: 0,
              budgets: []
            };
          }

          commissionsBySalesRep[staffId].totalCommissions += amount;
          
          if (budget.commissionPaid) {
            commissionsBySalesRep[staffId].totalPaid += amount;
          } else {
            commissionsBySalesRep[staffId].totalPending += amount;
          }
          
          commissionsBySalesRep[staffId].budgetsCount += 1;
          commissionsBySalesRep[staffId].budgets.push({
            budgetId: budget.idBudget,
            propertyAddress: budget.propertyAddress,
            clientName: budget.applicantName || 'N/A',
            commissionAmount: amount,
            commissionPaid: budget.commissionPaid || false,
            commissionPaidDate: budget.commissionPaidDate || null,
            budgetStatus: budget.status,
            workStatus: budget.Work?.status || 'no_work',
            workId: budget.Work?.idWork || null,
            date: budget.date,
            leadSource: 'sales_rep'
          });
        } else if (budget.leadSource === 'external_referral') {
          // Agrupar por referido externo (por nombre ya que no tienen ID único)
          const referralKey = budget.externalReferralName || 'Unknown';
          
          if (!commissionsByExternalReferral[referralKey]) {
            commissionsByExternalReferral[referralKey] = {
              type: 'external_referral',
              referralName: budget.externalReferralName,
              referralEmail: budget.externalReferralEmail,
              referralPhone: budget.externalReferralPhone,
              referralCompany: budget.externalReferralCompany,
              totalCommissions: 0,
              totalPaid: 0,
              totalPending: 0,
              budgetsCount: 0,
              budgets: []
            };
          }

          commissionsByExternalReferral[referralKey].totalCommissions += amount;
          
          if (budget.commissionPaid) {
            commissionsByExternalReferral[referralKey].totalPaid += amount;
          } else {
            commissionsByExternalReferral[referralKey].totalPending += amount;
          }
          
          commissionsByExternalReferral[referralKey].budgetsCount += 1;
          commissionsByExternalReferral[referralKey].budgets.push({
            budgetId: budget.idBudget,
            propertyAddress: budget.propertyAddress,
            clientName: budget.applicantName || 'N/A',
            commissionAmount: amount,
            commissionPaid: budget.commissionPaid || false,
            commissionPaidDate: budget.commissionPaidDate || null,
            budgetStatus: budget.status,
            workStatus: budget.Work?.status || 'no_work',
            workId: budget.Work?.idWork || null,
            date: budget.date,
            leadSource: 'external_referral'
          });
        }
      });

      res.status(200).json({
        summary: {
          totalPendingCommissions,
          totalPaidCommissions,
          totalCommissions: totalPendingCommissions + totalPaidCommissions,
          totalBudgetsWithCommissions: budgetsWithCommissions.length,
          salesRepsCount: Object.keys(commissionsBySalesRep).length,
          externalReferralsCount: Object.keys(commissionsByExternalReferral).length
        },
        bySalesRep: Object.values(commissionsBySalesRep),
        byExternalReferral: Object.values(commissionsByExternalReferral),
        allBudgets: budgetsWithCommissions.map(b => {
          const amount = b.leadSource === 'sales_rep'
            ? parseFloat(b.salesCommissionAmount || 0)
            : parseFloat(b.commissionAmount || 0);
            
          return {
            budgetId: b.idBudget,
            propertyAddress: b.propertyAddress,
            leadSource: b.leadSource,
            // Datos de sales rep (si aplica)
            salesRepName: b.createdByStaff?.name || null,
            salesRepId: b.createdByStaffId || null,
            // Datos de external referral (si aplica)
            externalReferralName: b.externalReferralName || null,
            externalReferralEmail: b.externalReferralEmail || null,
            externalReferralPhone: b.externalReferralPhone || null,
            externalReferralCompany: b.externalReferralCompany || null,
            // Datos comunes
            clientName: b.applicantName || 'N/A',
            commissionAmount: amount,
            commissionPaid: b.commissionPaid || false,
            commissionPaidDate: b.commissionPaidDate || null,
            budgetStatus: b.status,
            workStatus: b.Work?.status || 'no_work',
            workId: b.Work?.idWork || null,
            date: b.date
          };
        })
      });

    } catch (error) {
      console.error('Error obteniendo comisiones pendientes:', error);
      res.status(500).json({
        error: true,
        message: 'Error al obtener comisiones pendientes',
        details: error.message
      });
    }
  },

  /**
   * 🆕 Marcar comisión como pagada
   */
  async markCommissionAsPaid(req, res) {
    try {
      const { budgetId } = req.params;
      const { paid, paidDate } = req.body; // paid: boolean, paidDate: YYYY-MM-DD (opcional)

      const budget = await Budget.findByPk(budgetId);
      
      if (!budget) {
        return res.status(404).json({
          error: true,
          message: 'Budget no encontrado'
        });
      }

      // Actualizar estado de comisión
      budget.commissionPaid = paid;
      budget.commissionPaidDate = paid ? (paidDate || new Date()) : null;
      
      await budget.save();

      res.status(200).json({
        message: `Comisión marcada como ${paid ? 'pagada' : 'no pagada'}`,
        budget: {
          idBudget: budget.idBudget,
          commissionAmount: budget.salesCommissionAmount,
          commissionPaid: budget.commissionPaid,
          commissionPaidDate: budget.commissionPaidDate
        }
      });

    } catch (error) {
      console.error('Error actualizando estado de comisión:', error);
      res.status(500).json({
        error: true,
        message: 'Error al actualizar estado de comisión',
        details: error.message
      });
    }
  }
};

module.exports = AccountsReceivableController;
