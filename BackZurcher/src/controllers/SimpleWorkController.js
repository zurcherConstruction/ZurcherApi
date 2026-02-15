const { SimpleWork, SimpleWorkPayment, SimpleWorkExpense, SimpleWorkItem, Work, Staff, Income, Expense, sequelize } = require('../data');
const { Op } = require('sequelize');
const fs = require('fs');
const { uploadBufferToCloudinary } = require('../utils/cloudinaryUploader');
const { generateAndSaveSimpleWorkPDF } = require('../utils/pdfGenerators/simpleWorkPdfGenerator');
const { sendEmail } = require('../utils/notifications/emailService');
const { handleSimpleWorkSendLogic } = require('../helpers/simpleWorkHelpers');

/**
 * Controlador para SimpleWork - Sistema de trabajos varios
 */
const SimpleWorkController = {

  /**
   * Obtener todos los trabajos con filtros
   */
  async getAllSimpleWorks(req, res) {
    try {
      const {
        status,
        workType,
        assignedStaffId,
        startDate,
        endDate,
        search,
        page = 1,
        limit = 20
      } = req.query;

      // Construir filtros
      const where = {};
      
      if (status && status !== 'all') {
        where.status = status;
      }
      
      if (workType && workType !== 'all') {
        where.workType = workType;
      }
      
      if (assignedStaffId) {
        where.assignedStaffId = assignedStaffId;
      }
      
      if (startDate && endDate) {
        where.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
      
      if (search) {
        where[Op.or] = [
          { workNumber: { [Op.iLike]: `%${search}%` } },
          { propertyAddress: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Calcular offset para paginación
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows: simpleWorks } = await SimpleWork.findAndCountAll({
        where,
        include: [
          {
            model: Staff,
            as: 'assignedStaff',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Staff,
            as: 'creator',
            attributes: ['id', 'name']
          },
          {
            model: SimpleWorkPayment,
            as: 'payments',
            required: false
          },
          {
            model: SimpleWorkExpense,
            as: 'expenses',
            required: false
          },
          {
            model: SimpleWorkItem,
            as: 'items',
            required: false,
            order: [['displayOrder', 'ASC']]
          },
          {
            model: Income,
            as: 'linkedIncomes',
            required: false,
            attributes: ['idIncome', 'date', 'amount', 'typeIncome', 'notes', 'paymentMethod']
          },
          {
            model: Expense,
            as: 'linkedExpenses',
            required: false,
            attributes: ['idExpense', 'date', 'amount', 'typeExpense', 'notes', 'paymentMethod']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      // 🔍 DEBUG: Mostrar resumen de SimpleWorks encontrados
      console.log(`🔍 [SIMPLEWORKS] Total encontrados: ${count}, Mostrando: ${simpleWorks.length}`);
      
      simpleWorks.forEach((work, idx) => {
        const linkedIncomesCount = work.linkedIncomes?.length || 0;
        const linkedExpensesCount = work.linkedExpenses?.length || 0;
        
        if (linkedIncomesCount > 0 || linkedExpensesCount > 0) {
          console.log(`  ${idx + 1}. ${work.workNumber} - Ingresos vinculados: ${linkedIncomesCount}, Gastos vinculados: ${linkedExpensesCount}`);
          
          if (linkedIncomesCount > 0) {
            work.linkedIncomes.forEach(income => {
              console.log(`     💰 Income #${income.idIncome}: $${income.amount} - ${income.typeIncome}`);
            });
          }
          
          if (linkedExpensesCount > 0) {
            work.linkedExpenses.forEach(expense => {
              console.log(`     💸 Expense #${expense.idExpense}: $${expense.amount} - ${expense.typeExpense}`);
            });
          }
        }
      });

      // Calcular totales por trabajo (combinando dedicados + vinculados)
      const worksWithTotals = simpleWorks.map(work => {
        // Calcular totalPaid: SimpleWorkPayments (dedicados) + Income (vinculados)
        // DEDUPLICAR: Excluir SimpleWorkPayments legacy que coincidan con un linkedIncome
        const linkedIncomeTotal = work.linkedIncomes?.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0) || 0;
        
        const nonDuplicatePayments = (work.payments || []).filter(p => {
          return !(work.linkedIncomes || []).some(i => 
            Math.abs(parseFloat(p.amount || 0) - parseFloat(i.amount || 0)) < 0.01 &&
            String(p.paymentDate || '').substring(0, 10) === String(i.date || '').substring(0, 10)
          );
        });
        const dedicatedPayments = nonDuplicatePayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const totalPaid = dedicatedPayments + linkedIncomeTotal;
        
        // Calcular totalExpenses: SimpleWorkExpenses (dedicados) + Expense (vinculados)
        const dedicatedExpenses = work.expenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
        const linkedExpenseTotal = work.linkedExpenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
        const totalExpenses = dedicatedExpenses + linkedExpenseTotal;

        // Calculate totalCost from items or use finalAmount/estimatedAmount
        const itemsTotal = work.items?.reduce((sum, item) => {
          return sum + parseFloat(item.finalCost || item.totalCost || 0);
        }, 0) || 0;
        
        const totalCost = itemsTotal > 0 ? itemsTotal : (work.finalAmount || work.estimatedAmount || 0);
        const finalAmount = parseFloat(work.finalAmount || work.estimatedAmount || 0);

        return {
          ...work.toJSON(),
          totalCost: parseFloat(totalCost),
          totalPaid,
          totalExpenses,
          remainingAmount: Math.max(0, finalAmount - totalPaid),
          profit: totalPaid - totalExpenses,
          statusDisplay: work.getStatusDisplay(),
          workTypeDisplay: work.getWorkTypeDisplay()
        };
      });

      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json({
        success: true,
        data: worksWithTotals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / parseInt(limit))
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo SimpleWorks:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  /**
   * Crear nuevo trabajo simple
   */
  async createSimpleWork(req, res) {
    try {
      const {
        workType,
        propertyAddress,
        clientData,
        linkedWorkId, // Opcional: vinculación con Work existente
        description,
        estimatedAmount,
        initialPaymentPercentage = 100, // Default 100%
        paymentMethod, // 💳 Payment method integration
        notes,
        items = [], // 🆕 Array de items
        attachments = [] // 🆕 Array de attachments temporales
      } = req.body;

      // Validaciones básicas
      if (!workType || !propertyAddress || !clientData || !description || !estimatedAmount) {
        return res.status(400).json({
          success: false,
          message: 'Faltan campos requeridos: workType, propertyAddress, clientData, description, estimatedAmount'
        });
      }

      // Si hay linkedWorkId, verificar que exista
      if (linkedWorkId) {
        const linkedWork = await Work.findByPk(linkedWorkId);
        if (!linkedWork) {
          return res.status(400).json({
            success: false,
            message: 'El trabajo vinculado no existe'
          });
        }
      }

      // Generar número de trabajo único
      const workNumber = await SimpleWork.generateWorkNumber();

      // Calcular total final basado en items
      let finalAmount = estimatedAmount;
      if (items && items.length > 0) {
        finalAmount = items.reduce((sum, item) => {
          const finalCost = parseFloat(item.finalCost || item.totalCost || 0);
          return sum + finalCost;
        }, 0);
      }

      // Calculate initial payment
      const initialPayment = finalAmount * (parseFloat(initialPaymentPercentage) / 100);

      // Crear SimpleWork
      const simpleWork = await SimpleWork.create({
        workNumber,
        workType,
        propertyAddress,
        clientData,
        linkedWorkId: linkedWorkId || null,
        description,
        estimatedAmount: parseFloat(estimatedAmount),
        finalAmount: finalAmount,
        initialPaymentPercentage: parseFloat(initialPaymentPercentage),
        initialPayment: parseFloat(initialPayment),
        paymentMethod: paymentMethod || null, // 💳 Payment method integration
        notes,
        attachments: attachments || [],
        createdBy: req.user?.id || null
      });

      // 🆕 Crear items si existen
      if (items && items.length > 0) {
        const itemsData = items.map((item, index) => ({
          simpleWorkId: simpleWork.id,
          category: item.category || 'general',
          description: item.description || '',
          quantity: parseFloat(item.quantity || 1),
          unit: item.unit || 'ea',
          unitCost: parseFloat(item.unitCost || 0),
          totalCost: parseFloat(item.totalCost || 0),
          discount: parseFloat(item.discount || 0),
          markup: parseFloat(item.markup || 0),
          finalCost: parseFloat(item.finalCost || item.totalCost || 0),
          notes: item.notes || null,
          isFromTemplate: item.isFromTemplate || false,
          templateItemId: item.templateItemId || null,
          displayOrder: index + 1
        }));

        await SimpleWorkItem.bulkCreate(itemsData);
      }

      // Obtener el trabajo con asociaciones
      const createdWork = await SimpleWork.findByPk(simpleWork.id, {
        include: [
          {
            model: Staff,
            as: 'creator',
            attributes: ['id', 'name']
          },
          {
            model: SimpleWorkItem,
            as: 'items',
            required: false
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Trabajo simple creado exitosamente',
        data: createdWork
      });

    } catch (error) {
      console.error('❌ Error creando SimpleWork:', error);
      res.status(500).json({
        success: false,
        message: 'Error creando trabajo simple',
        error: error.message
      });
    }
  },

  /**
   * Obtener trabajo simple por ID
   */
  async getSimpleWorkById(req, res) {
    try {
      const { id } = req.params;

      const simpleWork = await SimpleWork.findByPk(id, {
        include: [
          {
            model: Staff,
            as: 'assignedStaff',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: Staff,
            as: 'creator',
            attributes: ['id', 'name']
          },
          {
            model: SimpleWorkPayment,
            as: 'payments',
            include: [
              {
                model: Staff,
                as: 'creator',
                attributes: ['id', 'name']
              }
            ],
            order: [['paymentDate', 'DESC']]
          },
          {
            model: SimpleWorkExpense,
            as: 'expenses',
            include: [
              {
                model: Staff,
                as: 'creator',
                attributes: ['id', 'name']
              }
            ],
            order: [['expenseDate', 'DESC']]
          },
          {
            model: Work,
            as: 'linkedWork',
            required: false,
            attributes: ['idWork', 'propertyAddress', 'status']
          },
          {
            model: Income,
            as: 'linkedIncomes',
            required: false,
            attributes: ['idIncome', 'date', 'amount', 'typeIncome', 'notes', 'paymentMethod', 'paymentDetails'],
            include: [
              {
                model: Staff,
                as: 'Staff',
                attributes: ['id', 'name']
              }
            ]
          },
          {
            model: Expense,
            as: 'linkedExpenses',
            required: false,
            attributes: ['idExpense', 'date', 'amount', 'typeExpense', 'notes', 'paymentMethod', 'paymentDetails'],
            include: [
              {
                model: Staff,
                as: 'Staff',
                attributes: ['id', 'name']
              }
            ]
          }
        ]
      });

      if (!simpleWork) {
        return res.status(404).json({
          success: false,
          message: 'Trabajo simple no encontrado'
        });
      }

      // 🔍 DEBUG: Mostrar gastos e ingresos vinculados
      console.log('🔍 [SIMPLEWORK] Detalles del SimpleWork:', {
        id: simpleWork.id,
        workNumber: simpleWork.workNumber,
        linkedIncomes: simpleWork.linkedIncomes?.length || 0,
        linkedExpenses: simpleWork.linkedExpenses?.length || 0
      });

      if (simpleWork.linkedIncomes?.length > 0) {
        console.log('💰 [INCOMES] Ingresos vinculados:');
        simpleWork.linkedIncomes.forEach((income, idx) => {
          console.log(`  ${idx + 1}. Income #${income.idIncome} - $${income.amount} - ${income.typeIncome} - ${income.date}`);
        });
      } else {
        console.log('⚠️ [INCOMES] No hay ingresos vinculados');
      }

      if (simpleWork.linkedExpenses?.length > 0) {
        console.log('💸 [EXPENSES] Gastos vinculados:');
        simpleWork.linkedExpenses.forEach((expense, idx) => {
          console.log(`  ${idx + 1}. Expense #${expense.idExpense} - $${expense.amount} - ${expense.typeExpense} - ${expense.date}`);
        });
      } else {
        console.log('⚠️ [EXPENSES] No hay gastos vinculados');
      }

      // Calcular totales REALES combinando dedicados + vinculados (como Works)
      // DEDUPLICAR: Si un SimpleWorkPayment coincide con un linkedIncome (mismo monto y fecha),
      // es un registro legacy duplicado - no sumarlo dos veces
      const linkedIncomeTotal = simpleWork.linkedIncomes?.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0) || 0;
      
      const nonDuplicatePayments = (simpleWork.payments || []).filter(p => {
        return !(simpleWork.linkedIncomes || []).some(i => 
          Math.abs(parseFloat(p.amount || 0) - parseFloat(i.amount || 0)) < 0.01 &&
          String(p.paymentDate || '').substring(0, 10) === String(i.date || '').substring(0, 10)
        );
      });
      const dedicatedPayments = nonDuplicatePayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const calculatedTotalPaid = dedicatedPayments + linkedIncomeTotal;

      const dedicatedExpenses = simpleWork.expenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
      const linkedExpenseTotal = simpleWork.linkedExpenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
      const calculatedTotalExpenses = dedicatedExpenses + linkedExpenseTotal;

      const finalAmount = parseFloat(simpleWork.finalAmount || simpleWork.estimatedAmount || 0);

      const workWithTotals = {
        ...simpleWork.toJSON(),
        totalPaid: calculatedTotalPaid,
        totalExpenses: calculatedTotalExpenses,
        remainingAmount: Math.max(0, finalAmount - calculatedTotalPaid),
        profit: calculatedTotalPaid - calculatedTotalExpenses,
        statusDisplay: simpleWork.getStatusDisplay(),
        workTypeDisplay: simpleWork.getWorkTypeDisplay()
      };

      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json({
        success: true,
        data: workWithTotals
      });

    } catch (error) {
      console.error('❌ Error obteniendo SimpleWork:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  /**
   * Actualizar trabajo simple
   */
  async updateSimpleWork(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;



      const simpleWork = await SimpleWork.findByPk(id);
      if (!simpleWork) {
        return res.status(404).json({
          success: false,
          message: 'Trabajo simple no encontrado'
        });
      }

      // Actualizar campos permitidos
      const allowedFields = [
        'workType', 'propertyAddress', 'clientData', 'description',
        'estimatedAmount', 'finalAmount', 'status', 'assignedStaffId',
        'assignedDate', 'startDate', 'completedDate', 'notes', 'attachments',
        'discountPercentage', 'initialPaymentPercentage', 'paymentMethod', // 🆕 Campos de payment + payment method
        'totalPaid' // 🆕 Campo para actualizar el total pagado
      ];

      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          // Manejar campo paymentMethod: convertir cadena vacía a null
          if (field === 'paymentMethod' && updates[field] === '') {
            simpleWork[field] = null;
          } else {
            simpleWork[field] = updates[field];
          }
        }
      });

      // 🆕 Calcular initialPayment basado en el porcentaje actualizado
      if (updates.initialPaymentPercentage !== undefined || updates.estimatedAmount !== undefined || updates.finalAmount !== undefined) {
        const paymentPercentage = updates.initialPaymentPercentage || simpleWork.initialPaymentPercentage || 100;
        const totalAmount = parseFloat(updates.finalAmount || updates.estimatedAmount || simpleWork.finalAmount || simpleWork.estimatedAmount || 0);
        simpleWork.initialPayment = totalAmount * (paymentPercentage / 100);
      }

      await simpleWork.save();

      res.json({
        success: true,
        message: 'Trabajo actualizado exitosamente',
        data: simpleWork
      });

    } catch (error) {
      console.error('❌ Error actualizando SimpleWork:', error);
      res.status(500).json({
        success: false,
        message: 'Error actualizando trabajo',
        error: error.message
      });
    }
  },

  /**
   * Agregar pago a trabajo simple
   */
  async addPayment(req, res) {
    try {
      const { id } = req.params;
      const { amount, paymentMethod, paymentDate, description } = req.body;

      if (!amount || !paymentMethod || !paymentDate) {
        return res.status(400).json({
          success: false,
          message: 'Faltan campos requeridos para el pago'
        });
      }

      const simpleWork = await SimpleWork.findByPk(id);
      if (!simpleWork) {
        return res.status(404).json({
          success: false,
          message: 'Trabajo simple no encontrado'
        });
      }

      // Crear pago
      const payment = await SimpleWorkPayment.create({
        simpleWorkId: id,
        amount: parseFloat(amount),
        paymentMethod,
        paymentDate: new Date(paymentDate),
        description,
        createdBy: req.user?.id || null
      });

      // Actualizar total pagado en SimpleWork
      const totalPaid = await SimpleWorkPayment.sum('amount', {
        where: { simpleWorkId: id }
      });

      await simpleWork.update({ totalPaid: totalPaid || 0 });

      // Verificar si está completamente pagado
      const remainingAmount = simpleWork.getRemainingAmount();
      if (remainingAmount <= 0 && simpleWork.status !== 'paid') {
        await simpleWork.update({ status: 'paid' });
      }

      res.status(201).json({
        success: true,
        message: 'Pago agregado exitosamente',
        data: payment
      });

    } catch (error) {
      console.error('❌ Error agregando pago:', error);
      res.status(500).json({
        success: false,
        message: 'Error agregando pago',
        error: error.message
      });
    }
  },

  /**
   * Agregar gasto a trabajo simple
   */
  async addExpense(req, res) {
    try {
      const { id } = req.params;
      const { amount, category, description, expenseDate } = req.body;

      if (!amount || !category || !description || !expenseDate) {
        return res.status(400).json({
          success: false,
          message: 'Faltan campos requeridos para el gasto'
        });
      }

      const simpleWork = await SimpleWork.findByPk(id);
      if (!simpleWork) {
        return res.status(404).json({
          success: false,
          message: 'Trabajo simple no encontrado'
        });
      }

      // Crear gasto
      const expense = await SimpleWorkExpense.create({
        simpleWorkId: id,
        amount: parseFloat(amount),
        category,
        description,
        expenseDate: new Date(expenseDate),
        createdBy: req.user?.id || null
      });

      // Actualizar total de gastos en SimpleWork
      const totalExpenses = await SimpleWorkExpense.sum('amount', {
        where: { simpleWorkId: id }
      });

      await simpleWork.update({ totalExpenses: totalExpenses || 0 });

      res.status(201).json({
        success: true,
        message: 'Gasto agregado exitosamente',
        data: expense
      });

    } catch (error) {
      console.error('❌ Error agregando gasto:', error);
      res.status(500).json({
        success: false,
        message: 'Error agregando gasto',
        error: error.message
      });
    }
  },

  /**
   * Obtener resumen financiero de SimpleWorks
   */
  async getFinancialSummary(req, res) {
    try {
      const { startDate, endDate, status } = req.query;

      // Construir filtros
      const where = {};
      if (startDate && endDate) {
        where.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
      if (status && status !== 'all') {
        where.status = status;
      }

      const works = await SimpleWork.findAll({
        where,
        include: [
          {
            model: SimpleWorkPayment,
            as: 'payments',
            required: false
          },
          {
            model: SimpleWorkExpense,
            as: 'expenses',
            required: false
          }
        ]
      });

      // Calcular resumen
      const summary = works.reduce((acc, work) => {
        const estimated = parseFloat(work.estimatedAmount || 0);
        const final = parseFloat(work.finalAmount || work.estimatedAmount || 0);
        const paid = work.payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
        const expenses = work.expenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
        const remaining = Math.max(0, final - paid);
        const profit = paid - expenses;

        acc.totalWorks++;
        acc.totalEstimated += estimated;
        acc.totalFinal += final;
        acc.totalPaid += paid;
        acc.totalExpenses += expenses;
        acc.totalRemaining += remaining;
        acc.totalProfit += profit;

        // Contar por estado
        acc.byStatus[work.status] = (acc.byStatus[work.status] || 0) + 1;

        return acc;
      }, {
        totalWorks: 0,
        totalEstimated: 0,
        totalFinal: 0,
        totalPaid: 0,
        totalExpenses: 0,
        totalRemaining: 0,
        totalProfit: 0,
        byStatus: {}
      });

      res.json({
        success: true,
        data: summary
      });

    } catch (error) {
      console.error('❌ Error obteniendo resumen financiero:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  /**
   * Obtener Works existentes para vinculación (con datos de cliente)
   */
  async getWorksForLinking(req, res) {
    try {
      const { search, limit = 100 } = req.query;

      // Construir filtros de búsqueda
      const where = {};
      if (search) {
        where[Op.or] = [
          { propertyAddress: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const works = await Work.findAll({
        where,
        include: [
          {
            model: require('../data').Budget,
            as: 'budget',
            attributes: ['applicantName', 'applicantEmail', 'contactCompany', 'propertyAddress'],
            where: search ? {
              [Op.or]: [
                { applicantName: { [Op.iLike]: `%${search}%` } },
                { applicant_email: { [Op.iLike]: `%${search}%` } },
                { propertyAddress: { [Op.iLike]: `%${search}%` } }
              ]
            } : undefined,
            required: false // LEFT JOIN para incluir Works sin Budget
          }
        ],
        attributes: ['idWork', 'propertyAddress', 'status', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit)
      });

      const worksForLinking = works.map(work => ({
        id: work.idWork,
        propertyAddress: work.propertyAddress,
        status: work.status,
        createdAt: work.createdAt,
        clientData: {
          name: work.budget?.applicantName || 'No disponible',
          email: work.budget?.applicantEmail || '',
          phone: '', // No disponible en Budget
          address: work.budget?.propertyAddress || work.propertyAddress,
          company: work.budget?.contactCompany || ''
        }
      }));

      res.json({
        success: true,
        data: worksForLinking,
        total: worksForLinking.length
      });

    } catch (error) {
      console.error('❌ Error obteniendo Works para vinculación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  /**
   * Generar PDF de presupuesto/invoice para SimpleWork (descarga)
   */
  async generateSimpleWorkPDF(req, res) {
    try {
      const { id } = req.params;

      const simpleWork = await SimpleWork.findByPk(id, {
        include: [
          {
            model: Staff,
            as: 'assignedStaff',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: Staff,
            as: 'creator',
            attributes: ['id', 'name']
          },
          {
            model: SimpleWorkItem,
            as: 'items',
            required: false,
            order: [['displayOrder', 'ASC']]
          }
        ]
      });

      if (!simpleWork) {
        return res.status(404).json({
          success: false,
          message: 'Trabajo simple no encontrado'
        });
      }

      // Generar PDF
      const pdfPath = await generateAndSaveSimpleWorkPDF(simpleWork);

      // Enviar el archivo PDF
      res.download(pdfPath, `${simpleWork.workNumber}_quote.pdf`, (err) => {
        if (err) {
          console.error('❌ Error enviando PDF:', err);
          res.status(500).json({
            success: false,
            message: 'Error enviando PDF'
          });
        }
      });

    } catch (error) {
      console.error('❌ Error generando PDF de SimpleWork:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando PDF',
        error: error.message
      });
    }
  },

  /**
   * Vista previa del PDF de SimpleWork (inline para modal)
   */
  async viewSimpleWorkPDF(req, res) {
    try {
      const { id } = req.params;

      const simpleWork = await SimpleWork.findByPk(id, {
        include: [
          {
            model: Staff,
            as: 'assignedStaff',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: Staff,
            as: 'creator',
            attributes: ['id', 'name']
          },
          {
            model: SimpleWorkItem,
            as: 'items',
            required: false,
            order: [['displayOrder', 'ASC']]
          }
        ]
      });

      if (!simpleWork) {
        return res.status(404).json({
          success: false,
          message: 'Trabajo simple no encontrado'
        });
      }

      // Generar PDF
      const pdfPath = await generateAndSaveSimpleWorkPDF(simpleWork);

      // Leer archivo y enviarlo inline para vista previa
      const pdfBuffer = fs.readFileSync(pdfPath);
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="' + `${simpleWork.workNumber}_quote.pdf` + '"',
        'Content-Length': pdfBuffer.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Error generando vista previa PDF de SimpleWork:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando vista previa PDF',
        error: error.message
      });
    }
  },

  /**
   * Enviar SimpleWork por email al cliente
   */
  async sendSimpleWorkEmail(req, res) {
    try {
      const { id } = req.params;
      const { recipientEmail, customMessage } = req.body;

      const simpleWork = await SimpleWork.findByPk(id, {
        include: [
          {
            model: Staff,
            as: 'assignedStaff',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: Staff,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          },
          {
            model: SimpleWorkItem,
            as: 'items',
            required: false,
            order: [['displayOrder', 'ASC']]
          }
        ]
      });

      if (!simpleWork) {
        return res.status(404).json({
          success: false,
          message: 'Trabajo simple no encontrado'
        });
      }

      // Usar email del trabajo si no se proporciona uno específico
      const clientEmail = recipientEmail || simpleWork.clientData?.email;
      
      if (!clientEmail) {
        return res.status(400).json({
          success: false,
          message: 'No hay email de cliente configurado'
        });
      }

      // Generar PDF
      const pdfPath = await generateAndSaveSimpleWorkPDF(simpleWork);

      // Preparar datos del cliente
      const clientName = simpleWork.clientData?.firstName && simpleWork.clientData?.lastName 
        ? `${simpleWork.clientData.firstName} ${simpleWork.clientData.lastName}`
        : simpleWork.clientData?.name || 'Valued Client';
      
      const creatorName = simpleWork.creator?.name || 'Zurcher Construction Team';
      
      // Preparar email para cliente
      const clientMailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@zurcherconstruction.com',
        to: clientEmail,
        subject: `Work Estimate #${simpleWork.workNumber || id} - Zurcher Construction`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1a365d; margin: 0; font-size: 28px;">Work Estimate</h1>
                <p style="color: #4a5568; font-size: 18px; margin: 10px 0 0 0;">#${simpleWork.workNumber || id}</p>
              </div>
              
              <div style="margin-bottom: 25px;">
                <p style="font-size: 16px; color: #2d3748; margin-bottom: 20px;">Dear <strong>${clientName}</strong>,</p>
                
                <p style="color: #4a5568; line-height: 1.6; margin-bottom: 20px;">
                  Thank you for considering <strong>Zurcher Construction</strong> for your project.
                  Please find attached the detailed work estimate for:
                </p>
                
                <div style="background-color: #f7fafc; padding: 20px; border-left: 4px solid #3182ce; margin: 20px 0;">
                  <p style="margin: 0; color: #2d3748;"><strong>Work Type:</strong> ${simpleWork.workType}</p>
                  <p style="margin: 5px 0 0 0; color: #2d3748;"><strong>Property:</strong> ${simpleWork.propertyAddress}</p>
                  ${simpleWork.description ? `<p style="margin: 5px 0 0 0; color: #2d3748;"><strong>Description:</strong> ${simpleWork.description}</p>` : ''}
                </div>
                
                ${customMessage ? `
                <div style="background-color: #edf2f7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0; color: #2d3748; font-style: italic;">${customMessage}</p>
                </div>
                ` : ''}
                
                <p style="color: #4a5568; line-height: 1.6; margin-bottom: 20px;">
                  The attached PDF contains all project details, materials, labor costs, and timeline.
                  Please review and don't hesitate to contact us with any questions.
                </p>
              </div>
              
              <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h3 style="color: #1a365d; margin: 0 0 15px 0; font-size: 18px;">Next Steps:</h3>
                <ul style="color: #4a5568; line-height: 1.6; margin: 0; padding-left: 20px;">
                  <li>Review the attached estimate</li>
                  <li>Contact us to schedule or discuss any modifications</li>
                  <li>We're ready to start your project when you are!</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="color: #4a5568; margin: 0;">For questions or to proceed, please contact:</p>
                <p style="color: #1a365d; font-weight: bold; font-size: 16px; margin: 10px 0;">
                  📞 ${process.env.COMPANY_PHONE || '+1 (954) 636-8200'} | 📧 ${process.env.COMPANY_EMAIL || 'admin@zurcherseptic.com'}
                </p>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #dee2e6; text-align: center;">
                <div style="color: #6c757d; font-size: 14px;">
                  <strong style="color: #1a365d;">Zurcher Construction</strong><br>
                  SEPTIC TANK DIVISION - CFC1433240<br>
                  
                </div>
              </div>
            </div>
          </div>
        `,
        attachments: [{
          filename: `work_estimate_${simpleWork.workNumber || id}.pdf`,
          path: pdfPath,
          contentType: 'application/pdf'
        }],
      };

      try {
        await sendEmail(clientMailOptions);
        
      } catch (emailError) {
        console.error(`❌ Error al enviar work estimate a ${clientEmail}:`, emailError);
        return res.status(500).json({
          success: false,
          message: 'Error enviando trabajo por email',
          error: emailError.message
        });
      }

      // Actualizar estado del trabajo si está en draft
      if (simpleWork.status === 'draft') {
        await simpleWork.update({ status: 'quote_sent' });
      }

      res.json({
        success: true,
        message: 'Trabajo enviado por email exitosamente',
        data: {
          workId: id,
          recipientEmail: clientEmail,
          status: simpleWork.status
        }
      });

    } catch (error) {
      console.error('❌ Error enviando SimpleWork por email:', error);
      res.status(500).json({
        success: false,
        message: 'Error enviando trabajo por email',
        error: error.message
      });
    }
  },

  /**
   * Eliminar SimpleWork
   */
  async deleteSimpleWork(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.user;

      // Solo admin y manager pueden eliminar
      if (!['admin', 'manager'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar trabajos'
        });
      }

      const simpleWork = await SimpleWork.findByPk(id);

      if (!simpleWork) {
        return res.status(404).json({
          success: false,
          message: 'Trabajo simple no encontrado'
        });
      }

      await simpleWork.destroy();

      res.json({
        success: true,
        message: 'Trabajo eliminado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error eliminando SimpleWork:', error);
      res.status(500).json({
        success: false,
        message: 'Error eliminando trabajo',
        error: error.message
      });
    }
  },

  /**
   * Subir archivo adjunto temporal (durante creación)
   */
  async uploadTempAttachment(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionó archivo'
        });
      }

      // Subir archivo a Cloudinary en carpeta temporal
      const uploadResult = await uploadBufferToCloudinary(
        req.file.buffer, 
        req.file.originalname,
        'simple-work-temp-attachments'
      );

      res.json({
        success: true,
        message: 'Archivo subido temporalmente',
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        filename: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      });

    } catch (error) {
      console.error('❌ Error subiendo attachment temporal:', error);
      res.status(500).json({
        success: false,
        message: 'Error subiendo archivo',
        error: error.message
      });
    }
  },

  /**
   * Eliminar archivo adjunto temporal
   */
  async deleteTempAttachment(req, res) {
    try {
      const { attachmentId } = req.params;

      // En una implementación más robusta, podrías guardar una lista de archivos temporales
      // Por ahora, simplemente devolvemos éxito ya que el frontend maneja el estado local
      res.json({
        success: true,
        message: 'Archivo temporal eliminado'
      });

    } catch (error) {
      console.error('❌ Error eliminando attachment temporal:', error);
      res.status(500).json({
        success: false,
        message: 'Error eliminando archivo',
        error: error.message
      });
    }
  },

  /**
   * Subir archivo adjunto (planos, documentos)
   */
  async uploadAttachment(req, res) {
    try {
      const { id } = req.params;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionó archivo'
        });
      }

      const simpleWork = await SimpleWork.findByPk(id);
      if (!simpleWork) {
        return res.status(404).json({
          success: false,
          message: 'Trabajo no encontrado'
        });
      }

      // Subir archivo a Cloudinary
      const uploadResult = await uploadBufferToCloudinary(
        req.file.buffer, 
        req.file.originalname,
        'simple-work-attachments'
      );

      // Agregar attachment al array existente
      const currentAttachments = simpleWork.attachments || [];
      const newAttachment = {
        id: Date.now().toString(),
        filename: req.file.originalname,
        originalName: req.file.originalname,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        uploadedAt: new Date(),
        size: req.file.size,
        type: req.file.mimetype
      };

      currentAttachments.push(newAttachment);
      simpleWork.attachments = currentAttachments;
      
      await simpleWork.save();

      res.json({
        success: true,
        message: 'Archivo subido exitosamente',
        attachment: newAttachment
      });

    } catch (error) {
      console.error('❌ Error subiendo attachment:', error);
      res.status(500).json({
        success: false,
        message: 'Error subiendo archivo',
        error: error.message
      });
    }
  },

  /**
   * Eliminar archivo adjunto
   */
  async deleteAttachment(req, res) {
    try {
      const { id, attachmentId } = req.params;

      const simpleWork = await SimpleWork.findByPk(id);
      if (!simpleWork) {
        return res.status(404).json({
          success: false,
          message: 'Trabajo no encontrado'
        });
      }

      const currentAttachments = simpleWork.attachments || [];
      const attachmentIndex = currentAttachments.findIndex(att => att.id === attachmentId);

      if (attachmentIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Archivo no encontrado'
        });
      }

      // Eliminar de Cloudinary si existe publicId
      const attachment = currentAttachments[attachmentIndex];
      if (attachment.publicId) {
        try {
          const cloudinary = require('cloudinary').v2;
          await cloudinary.uploader.destroy(attachment.publicId);
        } catch (cloudinaryError) {
          console.warn('❌ Error eliminando de Cloudinary:', cloudinaryError);
        }
      }

      // Remover del array
      currentAttachments.splice(attachmentIndex, 1);
      simpleWork.attachments = currentAttachments;
      
      await simpleWork.save();

      res.json({
        success: true,
        message: 'Archivo eliminado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error eliminando attachment:', error);
      res.status(500).json({
        success: false,
        message: 'Error eliminando archivo',
        error: error.message
      });
    }
  },

  /**
   * Enviar SimpleWork por email al cliente
   * POST /api/simple-works/:id/send-email
   */
  async sendSimpleWorkToClient(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;
      
      console.log(`📧 === INICIANDO ENVÍO DE SIMPLEWORK POR EMAIL ===`);
      console.log(`🆔 SimpleWork ID: ${id}`);
      console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
      console.log(`👤 Usuario solicitante: ${req.user?.email || 'No identificado'}`);

      // Buscar SimpleWork con items si existen
      const simpleWork = await SimpleWork.findByPk(id, {
        include: [
          {
            model: SimpleWorkItem,
            as: 'items',
            required: false
          }
        ],
        transaction
      });

      if (!simpleWork) {
        console.error(`❌ SimpleWork ${id} no encontrado`);
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'SimpleWork no encontrado'
        });
      }

      console.log('✅ SimpleWork encontrado:');
      console.log(`   - ID: ${simpleWork.id}`);
      console.log(`   - Work Number: ${simpleWork.workNumber}`);
      console.log(`   - Status: ${simpleWork.status}`);
      console.log(`   - Client Email: ${simpleWork.clientData?.email}`);

      // Validar que tiene email del cliente
      if (!simpleWork.clientData?.email) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'El SimpleWork no tiene un email de cliente configurado'
        });
      }

      // Validar estados permitidos para envío
      const allowedStatuses = ['quoted', 'draft', 'sent', 'rejected'];
      if (!allowedStatuses.includes(simpleWork.status)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `No se puede enviar un SimpleWork con estado "${simpleWork.status}". Solo se pueden enviar SimpleWorks en estado "quoted", "draft", "sent" o "rejected".`
        });
      }

      // Determinar si es reenvío
      const isResend = simpleWork.status === 'sent';
      
      // Usar helper para manejar envío
      await handleSimpleWorkSendLogic(simpleWork, transaction, req.io, isResend);

      // Actualizar estado a 'sent'
      console.log(`🔄 Estado antes de actualizar: ${simpleWork.status}`);
      simpleWork.status = 'sent';
      simpleWork.sentAt = new Date();
      await simpleWork.save({ transaction });
      console.log(`🔄 Estado después de guardar: ${simpleWork.status}`);

      console.log(`✅ Estado actualizado a 'sent' para SimpleWork ${id}`);

      await transaction.commit();

      const clientName = `${simpleWork.clientData.firstName || ''} ${simpleWork.clientData.lastName || ''}`.trim() || 'Cliente';
      
      res.json({
        success: true,
        message: `SimpleWork enviado exitosamente a ${clientName} (${simpleWork.clientData.email})`,
        data: {
          workNumber: simpleWork.workNumber,
          clientEmail: simpleWork.clientData.email,
          clientName: clientName,
          status: simpleWork.status,
          sentAt: simpleWork.sentAt
        }
      });

    } catch (error) {
      console.error('❌ Error enviando SimpleWork:', error);
      await transaction.rollback();
      
      res.status(500).json({
        success: false,
        message: 'Error enviando SimpleWork por email',
        error: error.message
      });
    }
  },

  /**
   * Eliminar pago de trabajo simple
   */
  async deletePayment(req, res) {
    try {
      const { id, paymentId } = req.params;

      const simpleWork = await SimpleWork.findByPk(id);
      if (!simpleWork) {
        return res.status(404).json({
          success: false,
          message: 'Trabajo simple no encontrado'
        });
      }

      const payment = await SimpleWorkPayment.findOne({
        where: {
          id: paymentId,
          simpleWorkId: id
        }
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      await payment.destroy();

      // Recalcular total pagado
      const totalPaid = await SimpleWorkPayment.sum('amount', {
        where: { simpleWorkId: id }
      });

      await simpleWork.update({ totalPaid: totalPaid || 0 });

      res.json({
        success: true,
        message: 'Pago eliminado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error eliminando pago:', error);
      res.status(500).json({
        success: false,
        message: 'Error eliminando pago',
        error: error.message
      });
    }
  },

  /**
   * Eliminar gasto de trabajo simple
   */
  async deleteExpense(req, res) {
    try {
      const { id, expenseId } = req.params;

      const simpleWork = await SimpleWork.findByPk(id);
      if (!simpleWork) {
        return res.status(404).json({
          success: false,
          message: 'Trabajo simple no encontrado'
        });
      }

      const expense = await SimpleWorkExpense.findOne({
        where: {
          id: expenseId,
          simpleWorkId: id
        }
      });

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Gasto no encontrado'
        });
      }

      await expense.destroy();

      // Recalcular total de gastos
      const totalExpenses = await SimpleWorkExpense.sum('amount', {
        where: { simpleWorkId: id }
      });

      await simpleWork.update({ totalExpenses: totalExpenses || 0 });

      res.json({
        success: true,
        message: 'Gasto eliminado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error eliminando gasto:', error);
      res.status(500).json({
        success: false,
        message: 'Error eliminando gasto',
        error: error.message
      });
    }
  },

  /**
   * Marcar SimpleWork como completado
   * POST /api/simple-works/:id/mark-completed
   */
  async markAsCompleted(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      
      console.log(`🏁 === MARCANDO SIMPLEWORK COMO COMPLETADO ===`);
      console.log(`🆔 SimpleWork ID: ${id}`);
      console.log(`👤 Completado por: ${req.user?.email || 'No identificado'}`);

      const simpleWork = await SimpleWork.findByPk(id);

      if (!simpleWork) {
        return res.status(404).json({
          success: false,
          message: 'SimpleWork no encontrado'
        });
      }

      // Validar estados permitidos para completar
      const allowedStatuses = ['approved', 'in_progress', 'sent', 'paid'];
      if (!allowedStatuses.includes(simpleWork.status)) {
        return res.status(400).json({
          success: false,
          message: `No se puede marcar como completado un SimpleWork con estado "${simpleWork.status}". Solo trabajos "approved", "in_progress", "sent" o "paid" pueden marcarse como completados.`
        });
      }

      // Actualizar estado y fecha de completado
      simpleWork.status = 'completed';
      simpleWork.completedDate = new Date();
      
      // Agregar notas si se proporcionaron
      if (notes) {
        const existingNotes = simpleWork.notes || '';
        const completionNote = `\n\n🏁 COMPLETADO (${new Date().toLocaleDateString()}): ${notes}`;
        simpleWork.notes = existingNotes + completionNote;
      }

      await simpleWork.save();

      console.log(`✅ SimpleWork ${id} marcado como completado`);

      const clientName = `${simpleWork.clientData?.firstName || ''} ${simpleWork.clientData?.lastName || ''}`.trim() || 'Cliente';

      res.json({
        success: true,
        message: `Trabajo completado exitosamente para ${clientName}`,
        data: {
          workNumber: simpleWork.workNumber,
          status: simpleWork.status,
          completedDate: simpleWork.completedDate,
          notes: simpleWork.notes
        }
      });

    } catch (error) {
      console.error('❌ Error marcando SimpleWork como completado:', error);
      res.status(500).json({
        success: false,
        message: 'Error marcando SimpleWork como completado',
        error: error.message
      });
    }
  }

};
  

module.exports = SimpleWorkController;