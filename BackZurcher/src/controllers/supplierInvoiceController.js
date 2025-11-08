const { SupplierInvoice, SupplierInvoiceItem, SupplierInvoiceWork, SupplierInvoiceExpense, Expense, FixedExpense, Work, Staff, Receipt, sequelize } = require('../data');
const { Op } = require('sequelize');
const { cloudinary } = require('../utils/cloudinaryConfig');
const { uploadBufferToCloudinary } = require('../utils/cloudinaryUploader'); // 🆕 Para subir receipts
const { sendNotifications } = require('../utils/notifications/notificationManager'); // 🆕 Para notificaciones

/**
 * Crear un nuevo invoice de proveedor
 * POST /api/supplier-invoices
 */
const createSupplierInvoice = async (req, res) => {
  const transaction = await SupplierInvoice.sequelize.transaction();

  try {
    console.log('📥 Datos recibidos para crear invoice:', JSON.stringify(req.body, null, 2));
    
    const {
      invoiceNumber,
      vendor,
      issueDate,
      dueDate,
      notes,
      items,
      linkedWorks, // 🆕 Works vinculados para auto-generar expenses
      vendorEmail,
      vendorPhone,
      vendorAddress
    } = req.body;

    // Si no se proporciona issueDate, usar la fecha local actual (no UTC)
    const finalIssueDate = issueDate || (() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })();

    // Validación básica con mensajes más específicos
    const missingFields = [];
    if (!invoiceNumber) missingFields.push('invoiceNumber');
    if (!vendor) missingFields.push('vendor');
    if (!items) missingFields.push('items');
    if (items && items.length === 0) missingFields.push('items (array vacío)');
    
    if (missingFields.length > 0) {
      await transaction.rollback();
      console.log('❌ Campos faltantes:', missingFields);
      return res.status(400).json({
        error: 'Faltan campos requeridos',
        missingFields,
        received: { invoiceNumber, vendor, issueDate: finalIssueDate, itemsCount: items?.length }
      });
    }

    // 🆕 Normalizar vendor name (trim y espacios múltiples)
    const normalizedVendor = vendor.trim().replace(/\s+/g, ' ');
    console.log(`✨ Vendor normalizado: "${vendor}" → "${normalizedVendor}"`);

    // 1. Crear el invoice principal
    const invoice = await SupplierInvoice.create({
      invoiceNumber,
      vendor: normalizedVendor, // 🆕 Usar vendor normalizado
      issueDate: finalIssueDate,
      dueDate,
      totalAmount: 0,
      paymentStatus: 'pending',
      paidAmount: 0,
      notes,
      vendorEmail,
      vendorPhone,
      vendorAddress,
      verified: false,
      createdByStaffId: req.user?.id || null
    }, { transaction });

    console.log(`✅ Invoice creado: ${invoiceNumber}`);

    // 2. Procesar cada item
    let totalAmount = 0;
    const createdItems = [];

    for (const itemData of items) {
      // Validar item
      if (!itemData.description || !itemData.category || !itemData.amount) {
        await transaction.rollback();
        return res.status(400).json({
          error: 'Cada item debe tener: description, category, amount'
        });
      }

      // Crear el item
      const item = await SupplierInvoiceItem.create({
        supplierInvoiceId: invoice.idSupplierInvoice,
        workId: itemData.workId || null,
        description: itemData.description,
        category: itemData.category,
        amount: itemData.amount,
        relatedExpenseId: itemData.relatedExpenseId || null,
        relatedFixedExpenseId: itemData.relatedFixedExpenseId || null,
        notes: itemData.notes || null
      }, { transaction });

      totalAmount += parseFloat(itemData.amount);
      createdItems.push(item);

      console.log(`  📌 Item creado: ${itemData.description} - $${itemData.amount}`);

      // 3. Si hay expense vinculado, actualizarlo
      if (itemData.relatedExpenseId) {
        const expense = await Expense.findByPk(itemData.relatedExpenseId, { transaction });
        
        if (!expense) {
          await transaction.rollback();
          return res.status(404).json({
            error: `Expense no encontrado: ${itemData.relatedExpenseId}`
          });
        }

        // Verificar que el expense no esté ya pagado
        if (expense.paymentStatus !== 'unpaid') {
          await transaction.rollback();
          return res.status(400).json({
            error: `El expense ${itemData.relatedExpenseId} ya está pagado o vinculado a otro invoice`
          });
        }

        // Actualizar el expense
        await expense.update({
          paymentStatus: 'paid_via_invoice',
          paidDate: finalIssueDate,
          supplierInvoiceItemId: item.idItem
        }, { transaction });

        console.log(`  ✓ Expense vinculado: ${expense.idExpense}`);
      }
      // 3b. Si hay fixed expense vinculado, actualizarlo
      else if (itemData.relatedFixedExpenseId) {
        const fixedExpense = await FixedExpense.findByPk(itemData.relatedFixedExpenseId, { transaction });
        
        if (!fixedExpense) {
          await transaction.rollback();
          return res.status(404).json({
            error: `Fixed Expense no encontrado: ${itemData.relatedFixedExpenseId}`
          });
        }

        // Verificar que el fixed expense no esté ya pagado
        if (fixedExpense.paymentStatus !== 'unpaid') {
          await transaction.rollback();
          return res.status(400).json({
            error: `El fixed expense ${itemData.relatedFixedExpenseId} ya está pagado o vinculado a otro invoice`
          });
        }

        // Actualizar el fixed expense
        await fixedExpense.update({
          paymentStatus: 'paid_via_invoice',
          paidDate: finalIssueDate,
          supplierInvoiceItemId: item.idItem
        }, { transaction });

        console.log(`  ✓ Fixed Expense vinculado: ${fixedExpense.idFixedExpense}`);
      } 
      // 4. Si NO hay expense vinculado y hay workId, crear uno nuevo
      else if (itemData.workId) {
        // Mapear categoría de SupplierInvoiceItem a typeExpense válido de Expense
        const categoryMap = {
          'Otro': 'Gastos Generales',
          'Gasto Fijo': 'Gasto Fijo'
        };
        
        const expenseType = categoryMap[itemData.category] || itemData.category;
        
        const newExpense = await Expense.create({
          workId: itemData.workId,
          typeExpense: expenseType,
          amount: itemData.amount,
          vendor: vendor,
          date: finalIssueDate,
          paymentStatus: 'paid_via_invoice',
          paidDate: finalIssueDate,
          supplierInvoiceItemId: item.idItem,
          staffId: req.user?.id || null,
          notes: itemData.description || `Auto-generado desde invoice ${invoiceNumber}`,
          verified: false
        }, { transaction });

        console.log(`  🆕 Expense creado automáticamente: ${newExpense.idExpense} (${expenseType})`);
      }
      // 5. Si NO hay workId (gasto general), crear expense sin work
      // 🆕 PERO NO si el invoice tiene linkedWorks (se crearán al pagar)
      else if (!linkedWorks || linkedWorks.length === 0) {
        // Mapear categoría de SupplierInvoiceItem a typeExpense válido de Expense
        const categoryMap = {
          'Otro': 'Gastos Generales',
          'Gasto Fijo': 'Gasto Fijo'
        };
        
        const expenseType = categoryMap[itemData.category] || itemData.category;
        
        const newExpense = await Expense.create({
          workId: null,
          typeExpense: expenseType,
          amount: itemData.amount,
          vendor: vendor,
          date: finalIssueDate,
          paymentStatus: 'paid_via_invoice',
          paidDate: finalIssueDate,
          supplierInvoiceItemId: item.idItem,
          staffId: req.user?.id || null,
          notes: itemData.description || `Gasto general desde invoice ${invoiceNumber}`,
          verified: false
        }, { transaction });

        console.log(`  🆕 Expense general creado: ${newExpense.idExpense} (${expenseType})`);
      } else {
        console.log(`  ⏸️ Item sin expense (se creará al registrar pago con linkedWorks)`);
      }
    }

    // 6. Actualizar el total del invoice
    await invoice.update({ totalAmount }, { transaction });

    // 🆕 7. Vincular works si se proporcionaron
    if (linkedWorks && Array.isArray(linkedWorks) && linkedWorks.length > 0) {
      for (const workId of linkedWorks) {
        await SupplierInvoiceWork.create({
          supplierInvoiceId: invoice.idSupplierInvoice,
          workId: workId
        }, { transaction });
        console.log(`  🔗 Work vinculado: ${workId}`);
      }
    }

    // Commit de la transacción
    await transaction.commit();

    console.log(`\n✅ Invoice ${invoiceNumber} creado exitosamente con ${createdItems.length} items${linkedWorks?.length ? ` y ${linkedWorks.length} work(s) vinculado(s)` : ''}\n`);

    // Retornar el invoice con sus items y works vinculados
    const invoiceWithItems = await SupplierInvoice.findByPk(invoice.idSupplierInvoice, {
      include: [
        {
          model: SupplierInvoiceItem,
          as: 'items',
          include: [
            {
              model: Work,
              as: 'work',
              attributes: ['idWork', 'propertyAddress'],
              required: false
            },
            {
              model: Expense,
              as: 'relatedExpense',
              attributes: ['idExpense', 'typeExpense', 'amount'],
              required: false
            },
            {
              model: FixedExpense,
              as: 'relatedFixedExpense',
              attributes: ['idFixedExpense', 'description', 'totalAmount'],
              required: false
            }
          ]
        },
        {
          model: Staff,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Work,
          as: 'linkedWorks', // 🆕 Works vinculados para auto-distribución
          attributes: ['idWork', 'propertyAddress'],
          through: { attributes: [] }
        }
      ]
    });

    res.status(201).json({
      message: 'Invoice creado exitosamente',
      invoice: invoiceWithItems
    });

  } catch (error) {
    // Solo hacer rollback si la transacción no ha sido finalizada
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error('❌ Error creando invoice:', error);
    res.status(500).json({
      error: 'Error al crear el invoice',
      details: error.message
    });
  }
};

/**
 * Obtener todos los invoices con filtros
 * GET /api/supplier-invoices
 */
const getSupplierInvoices = async (req, res) => {
  try {
    console.log('📥 Query params recibidos:', req.query);
    
    const {
      status,
      vendor,
      startDate,
      endDate,
      includeItems,
      paymentStatus,
      vendorName
    } = req.query;

    // Construir filtros
    const where = {};

    // Aceptar tanto 'status' como 'paymentStatus'
    const statusFilter = status || paymentStatus;
    if (statusFilter && statusFilter !== '') {
      if (Array.isArray(statusFilter)) {
        where.paymentStatus = { [Op.in]: statusFilter };
      } else {
        where.paymentStatus = statusFilter;
      }
    }

    // Aceptar tanto 'vendor' como 'vendorName'
    const vendorFilter = vendor || vendorName;
    if (vendorFilter && vendorFilter !== '') {
      where.vendor = { [Op.iLike]: `%${vendorFilter}%` };
    }

    if (startDate && startDate !== '' && endDate && endDate !== '') {
      where.issueDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    console.log('🔍 Filtros aplicados:', where);

    // 🆕 Nuevo sistema: incluir expenses vinculados
    const include = [
      {
        model: Staff,
        as: 'createdBy',
        attributes: ['id', 'name', 'email']
      },
      {
        model: Expense,
        as: 'linkedExpenses',
        attributes: ['idExpense', 'typeExpense', 'amount', 'date', 'paymentStatus'],
        through: { 
          attributes: ['amountApplied', 'notes', 'createdAt'],
          as: 'linkInfo'
        },
        required: false
      }
    ];

    const invoices = await SupplierInvoice.findAll({
      where,
      include,
      order: [['issueDate', 'DESC']]
    });

    console.log(`✅ Invoices encontrados: ${invoices.length}`);
    
    // Devolver directamente el array para compatibilidad con frontend
    res.json(invoices);

  } catch (error) {
    console.error('❌ Error obteniendo invoices:', error);
    res.status(500).json({
      error: 'Error al obtener los invoices',
      details: error.message
    });
  }
};

/**
 * Obtener un invoice por ID con todos sus detalles
 * GET /api/supplier-invoices/:id
 */
const getSupplierInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 🆕 Obtener invoice con nuevo sistema de linkedExpenses
    const invoice = await SupplierInvoice.findByPk(id, {
      include: [
        {
          model: Staff,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Expense,
          as: 'linkedExpenses',
          attributes: ['idExpense', 'typeExpense', 'amount', 'date', 'paymentStatus', 'notes'],
          through: { 
            attributes: ['amountApplied', 'notes', 'createdAt'],
            as: 'linkInfo'
          },
          required: false
        }
      ]
    });

    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice no encontrado'
      });
    }

    res.json({ invoice });

  } catch (error) {
    console.error('❌ Error obteniendo invoice:', error);
    res.status(500).json({
      error: 'Error al obtener el invoice',
      details: error.message
    });
  }
};

/**
 * Registrar pago de un invoice (MÉTODO ANTIGUO - DEPRECADO)
 * PATCH /api/supplier-invoices/:id/pay
 * 
 * ⚠️ Este endpoint está deprecado. Usar /api/supplier-invoices/:id/pay-v2
 */
const registerPayment = async (req, res) => {
  const transaction = await SupplierInvoice.sequelize.transaction();
  
  try {
    const { id } = req.params;
    const {
      paymentMethod,
      paymentDate,
      paidAmount,
      paymentDetails,
      notes,
      receipt // 🆕 Opcionalmente puede venir un receipt
    } = req.body;

    // Validación
    if (!paymentMethod || !paymentDate || !paidAmount) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Faltan campos requeridos: paymentMethod, paymentDate, paidAmount'
      });
    }

    // Buscar invoice simple
    const invoice = await SupplierInvoice.findByPk(id, { transaction });

    if (!invoice) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'Invoice no encontrado'
      });
    }

    // Calcular el nuevo monto pagado
    const newPaidAmount = parseFloat(invoice.paidAmount) + parseFloat(paidAmount);

    // Determinar el nuevo estado
    let newStatus;
    if (newPaidAmount >= parseFloat(invoice.totalAmount)) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    } else {
      newStatus = invoice.paymentStatus;
    }

    // ⚠️ DEPRECADO: Código de auto-generación de expenses comentado
    // El nuevo sistema usa /pay-v2 que maneja esto de manera diferente
    /*
    if (invoice.linkedWorks && invoice.linkedWorks.length > 0 && newStatus === 'paid') {
      console.log(`🔗 Invoice tiene ${invoice.linkedWorks.length} work(s) vinculado(s). Auto-generando expenses...`);
      ... código antiguo removido ...
    }
    */

    // Actualizar invoice
    await invoice.update({
      paymentMethod,
      paymentDate,
      paidAmount: newPaidAmount,
      paymentDetails: paymentDetails || invoice.paymentDetails,
      paymentStatus: newStatus,
      notes: notes || invoice.notes
    }, { transaction });

    await transaction.commit();

    console.log(`✅ Pago registrado para invoice ${invoice.invoiceNumber}: $${paidAmount}`);

    // Retornar invoice actualizado
    const updatedInvoice = await SupplierInvoice.findByPk(id, {
      include: [
        {
          model: SupplierInvoiceItem,
          as: 'items',
          include: [
            {
              model: Work,
              as: 'work',
              attributes: ['idWork', 'propertyAddress']
            }
          ]
        },
        {
          model: Work,
          as: 'linkedWorks',
          attributes: ['idWork', 'propertyAddress'],
          through: { attributes: [] }
        }
      ]
    });

    res.json({
      message: 'Pago registrado exitosamente' + (invoice.linkedWorks?.length > 0 ? ` y ${invoice.linkedWorks.length} gasto(s) creado(s)` : ''),
      invoice: updatedInvoice
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error registrando pago:', error);
    res.status(500).json({
      error: 'Error al registrar el pago',
      details: error.message
    });
  }
};

/**
 * Actualizar un invoice
 * PUT /api/supplier-invoices/:id
 */
const updateSupplierInvoice = async (req, res) => {
  const transaction = await SupplierInvoice.sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { items, linkedWorks, ...invoiceUpdates } = req.body; // 🆕 Extraer linkedWorks

    const invoice = await SupplierInvoice.findByPk(id, {
      include: [{
        model: SupplierInvoiceItem,
        as: 'items'
      }],
      transaction
    });

    if (!invoice) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'Invoice no encontrado'
      });
    }

    // No permitir editar invoices pagados
    if (invoice.paymentStatus === 'paid') {
      await transaction.rollback();
      return res.status(400).json({
        error: 'No se puede editar un invoice que ya está pagado'
      });
    }

    // Si se envían items, procesarlos
    if (items && Array.isArray(items)) {
      // Obtener items actuales
      const currentItems = invoice.items || [];
      
      // Revertir expenses de items que serán eliminados
      for (const currentItem of currentItems) {
        if (currentItem.relatedExpenseId) {
          await Expense.update({
            paymentStatus: 'unpaid',
            paidDate: null,
            supplierInvoiceItemId: null
          }, {
            where: { idExpense: currentItem.relatedExpenseId },
            transaction
          });
        }
        if (currentItem.relatedFixedExpenseId) {
          await FixedExpense.update({
            paymentStatus: 'unpaid',
            paidDate: null,
            supplierInvoiceItemId: null
          }, {
            where: { idFixedExpense: currentItem.relatedFixedExpenseId },
            transaction
          });
        }
      }

      // Eliminar todos los items actuales
      await SupplierInvoiceItem.destroy({
        where: { supplierInvoiceId: id },
        transaction
      });

      // Crear nuevos items
      let totalAmount = 0;
      for (const itemData of items) {
        const item = await SupplierInvoiceItem.create({
          supplierInvoiceId: id,
          workId: itemData.workId || null,
          description: itemData.description,
          category: itemData.category,
          amount: itemData.amount,
          relatedExpenseId: itemData.relatedExpenseId || null,
          relatedFixedExpenseId: itemData.relatedFixedExpenseId || null,
          notes: itemData.notes || null
        }, { transaction });

        totalAmount += parseFloat(itemData.amount);

        // Vincular expense si existe
        if (itemData.relatedExpenseId) {
          await Expense.update({
            paymentStatus: 'paid_via_invoice',
            paidDate: invoiceUpdates.issueDate || invoice.issueDate,
            supplierInvoiceItemId: item.idItem
          }, {
            where: { idExpense: itemData.relatedExpenseId },
            transaction
          });
        }
        
        if (itemData.relatedFixedExpenseId) {
          await FixedExpense.update({
            paymentStatus: 'paid_via_invoice',
            paidDate: invoiceUpdates.issueDate || invoice.issueDate,
            supplierInvoiceItemId: item.idItem
          }, {
            where: { idFixedExpense: itemData.relatedFixedExpenseId },
            transaction
          });
        }
      }

      // Actualizar totalAmount
      invoiceUpdates.totalAmount = totalAmount;
    }

    // Actualizar invoice principal
    await invoice.update(invoiceUpdates, { transaction });

    // 🆕 Actualizar linkedWorks si se proporcionaron
    if (linkedWorks !== undefined) {
      // Eliminar relaciones existentes
      await SupplierInvoiceWork.destroy({
        where: { supplierInvoiceId: id },
        transaction
      });

      // Crear nuevas relaciones
      if (Array.isArray(linkedWorks) && linkedWorks.length > 0) {
        for (const workId of linkedWorks) {
          await SupplierInvoiceWork.create({
            supplierInvoiceId: id,
            workId: workId
          }, { transaction });
        }
        console.log(`  🔗 ${linkedWorks.length} work(s) vinculado(s) al invoice`);
      }
    }

    await transaction.commit();

    console.log(`✅ Invoice ${invoice.invoiceNumber} actualizado`);

    // Retornar invoice actualizado con items y linkedWorks
    const updatedInvoice = await SupplierInvoice.findByPk(id, {
      include: [
        {
          model: SupplierInvoiceItem,
          as: 'items',
          include: [
            {
              model: Work,
              as: 'work',
              attributes: ['idWork', 'propertyAddress']
            },
            {
              model: Expense,
              as: 'relatedExpense',
              attributes: ['idExpense', 'typeExpense', 'amount']
            },
            {
              model: FixedExpense,
              as: 'relatedFixedExpense',
              attributes: ['idFixedExpense', 'description', 'totalAmount']
            }
          ]
        },
        {
          model: Work,
          as: 'linkedWorks', // 🆕 Incluir works vinculados
          attributes: ['idWork', 'propertyAddress'],
          through: { attributes: [] }
        }
      ]
    });

    res.json({
      message: 'Invoice actualizado exitosamente',
      invoice: updatedInvoice
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error actualizando invoice:', error);
    res.status(500).json({
      error: 'Error al actualizar el invoice',
      details: error.message
    });
  }
};

/**
 * Eliminar un invoice
 * DELETE /api/supplier-invoices/:id
 */
const deleteSupplierInvoice = async (req, res) => {
  const transaction = await SupplierInvoice.sequelize.transaction();

  try {
    const { id } = req.params;

    const invoice = await SupplierInvoice.findByPk(id, {
      include: [
        {
          model: SupplierInvoiceItem,
          as: 'items'
        }
      ],
      transaction
    });

    if (!invoice) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'Invoice no encontrado'
      });
    }

    // No permitir eliminar invoices pagados
    if (invoice.paymentStatus === 'paid') {
      await transaction.rollback();
      return res.status(400).json({
        error: 'No se puede eliminar un invoice que ya está pagado'
      });
    }

    // Revertir los expenses vinculados
    for (const item of invoice.items) {
      if (item.relatedExpenseId) {
        await Expense.update({
          paymentStatus: 'unpaid',
          paidDate: null,
          supplierInvoiceItemId: null
        }, {
          where: { idExpense: item.relatedExpenseId },
          transaction
        });

        console.log(`  ↩️  Expense revertido: ${item.relatedExpenseId}`);
      }
    }

    // Eliminar items (cascade delete debería hacerlo automático)
    await SupplierInvoiceItem.destroy({
      where: { supplierInvoiceId: id },
      transaction
    });

    // Eliminar invoice
    await invoice.destroy({ transaction });

    await transaction.commit();

    console.log(`✅ Invoice ${invoice.invoiceNumber} eliminado`);

    res.json({
      message: 'Invoice eliminado exitosamente'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error eliminando invoice:', error);
    res.status(500).json({
      error: 'Error al eliminar el invoice',
      details: error.message
    });
  }
};

/**
 * Obtener cuentas por pagar (invoices pendientes)
 * GET /api/supplier-invoices/accounts-payable
 */
const getAccountsPayable = async (req, res) => {
  try {
    const pendingInvoices = await SupplierInvoice.findAll({
      where: {
        paymentStatus: {
          [Op.in]: ['pending', 'partial', 'overdue']
        }
      },
      include: [
        {
          model: SupplierInvoiceItem,
          as: 'items',
          include: [
            {
              model: Work,
              as: 'work',
              attributes: ['idWork', 'propertyAddress']
            }
          ]
        },
        {
          model: Staff,
          as: 'createdBy',
          attributes: ['id', 'name']
        }
      ],
      order: [['dueDate', 'ASC']]
    });

    // Calcular totales
    const totalPayable = pendingInvoices.reduce((sum, invoice) => {
      const amountDue = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount);
      return sum + amountDue;
    }, 0);

    // Agrupar por proveedor
    const byVendor = {};
    pendingInvoices.forEach(invoice => {
      if (!byVendor[invoice.vendor]) {
        byVendor[invoice.vendor] = {
          vendor: invoice.vendor,
          totalAmount: 0,
          invoiceCount: 0,
          invoices: []
        };
      }
      const amountDue = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount);
      byVendor[invoice.vendor].totalAmount += amountDue;
      byVendor[invoice.vendor].invoiceCount += 1;
      byVendor[invoice.vendor].invoices.push(invoice);
    });

    // Detectar vencidos
    const today = new Date();
    const overdueInvoices = pendingInvoices.filter(inv => 
      new Date(inv.dueDate) < today && inv.paymentStatus !== 'paid'
    );

    res.json({
      totalPayable: parseFloat(totalPayable.toFixed(2)),
      totalInvoices: pendingInvoices.length,
      overdueCount: overdueInvoices.length,
      overdueAmount: overdueInvoices.reduce((sum, inv) => 
        sum + (parseFloat(inv.totalAmount) - parseFloat(inv.paidAmount)), 0
      ),
      byVendor: Object.values(byVendor),
      invoices: pendingInvoices
    });

  } catch (error) {
    console.error('❌ Error obteniendo cuentas por pagar:', error);
    res.status(500).json({
      error: 'Error al obtener cuentas por pagar',
      details: error.message
    });
  }
};

/**
 * Obtener historial de pagos
 * GET /api/supplier-invoices/payment-history
 */
const getPaymentHistory = async (req, res) => {
  try {
    const { startDate, endDate, vendor } = req.query;

    const where = {
      paymentStatus: 'paid'
    };

    if (startDate && endDate) {
      where.paymentDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    if (vendor) {
      where.vendor = { [Op.iLike]: `%${vendor}%` };
    }

    const paidInvoices = await SupplierInvoice.findAll({
      where,
      include: [
        {
          model: SupplierInvoiceItem,
          as: 'items',
          include: [
            {
              model: Work,
              as: 'work',
              attributes: ['idWork', 'propertyAddress']
            }
          ]
        }
      ],
      order: [['paymentDate', 'DESC']]
    });

    const totalPaid = paidInvoices.reduce((sum, inv) => 
      sum + parseFloat(inv.paidAmount), 0
    );

    res.json({
      totalPaid: parseFloat(totalPaid.toFixed(2)),
      invoiceCount: paidInvoices.length,
      invoices: paidInvoices
    });

  } catch (error) {
    console.error('❌ Error obteniendo historial de pagos:', error);
    res.status(500).json({
      error: 'Error al obtener historial de pagos',
      details: error.message
    });
  }
};

/**
 * Subir PDF del invoice a Cloudinary
 * POST /api/supplier-invoices/:id/upload-invoice
 */
const uploadInvoicePdf = async (req, res) => {
  console.log('-----------------------------------------');
  console.log('[SupplierInvoiceController] uploadInvoicePdf iniciado.');
  console.log('[SupplierInvoiceController] Params:', req.params);
  console.log('[SupplierInvoiceController] File:', req.file ? {
    fieldname: req.file.fieldname,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  } : 'No file received');

  if (!req.file) {
    console.error('[SupplierInvoiceController] Error: No se recibió ningún archivo.');
    return res.status(400).json({ 
      error: true, 
      message: 'No se subió ningún archivo (PDF o imagen).' 
    });
  }

  // Validar tipo de archivo
  const validMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];

  if (!validMimeTypes.includes(req.file.mimetype)) {
    console.error('[SupplierInvoiceController] Tipo de archivo no válido:', req.file.mimetype);
    return res.status(400).json({
      error: true,
      message: 'Tipo de archivo no válido. Solo se permiten PDFs e imágenes (JPG, PNG, WEBP).'
    });
  }

  const { id } = req.params;

  if (!id) {
    console.error('[SupplierInvoiceController] Error: Falta ID del invoice.');
    return res.status(400).json({ 
      error: true, 
      message: 'ID del invoice es requerido.' 
    });
  }

  try {
    // Verificar que el invoice existe
    const invoice = await SupplierInvoice.findByPk(id);
    
    if (!invoice) {
      console.error(`[SupplierInvoiceController] Invoice ${id} no encontrado.`);
      return res.status(404).json({ 
        error: true, 
        message: 'Invoice no encontrado.' 
      });
    }

    console.log(`[SupplierInvoiceController] Invoice encontrado: ${invoice.invoiceNumber}`);

    // Si ya tiene un PDF, eliminar el anterior de Cloudinary
    if (invoice.invoicePdfPublicId) {
      console.log(`[SupplierInvoiceController] Eliminando PDF anterior: ${invoice.invoicePdfPublicId}`);
      try {
        await cloudinary.uploader.destroy(invoice.invoicePdfPublicId);
        console.log('[SupplierInvoiceController] PDF anterior eliminado de Cloudinary.');
      } catch (deleteError) {
        console.error('[SupplierInvoiceController] Error al eliminar PDF anterior:', deleteError);
        // Continuar aunque falle la eliminación
      }
    }

    // Subir nuevo PDF o imagen a Cloudinary
    console.log('[SupplierInvoiceController] Preparando stream para Cloudinary...');
    const isPdf = req.file.mimetype === 'application/pdf';
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'supplier_invoices',
        resource_type: isPdf ? 'image' : 'auto', // 'image' para que Cloudinary convierta PDF a imagen
        format: 'jpg', // Convertir todo a JPG para visualización
        access_mode: 'public',
        context: {
          invoice_number: invoice.invoiceNumber,
          vendor: invoice.vendor,
          upload_date: new Date().toISOString()
        }
      },
      async (error, result) => {
        if (error) {
          console.error('[SupplierInvoiceController] Error subiendo a Cloudinary:', error);
          return res.status(500).json({ 
            error: true, 
            message: 'Error al subir PDF a Cloudinary.', 
            details: error.message 
          });
        }

        console.log('[SupplierInvoiceController] Cloudinary subió el archivo con éxito:', {
          public_id: result.public_id,
          secure_url: result.secure_url,
        });

        try {
          // Actualizar el invoice con la información del PDF
          await invoice.update({
            invoicePdfPath: result.secure_url,
            invoicePdfPublicId: result.public_id
          });

          console.log(`[SupplierInvoiceController] Invoice ${invoice.invoiceNumber} actualizado con PDF.`);

          // Retornar invoice actualizado
          const updatedInvoice = await SupplierInvoice.findByPk(id, {
            include: [
              {
                model: SupplierInvoiceItem,
                as: 'items',
                include: [
                  {
                    model: Work,
                    as: 'work',
                    attributes: ['idWork', 'propertyAddress'],
                    required: false
                  }
                ]
              },
              {
                model: Staff,
                as: 'createdBy',
                attributes: ['id', 'name', 'email']
              }
            ]
          });

          res.json({
            message: 'PDF del invoice subido exitosamente',
            invoice: updatedInvoice
          });

        } catch (updateError) {
          console.error('[SupplierInvoiceController] Error actualizando invoice:', updateError);
          
          // Intentar eliminar el archivo subido si falla la actualización
          try {
            await cloudinary.uploader.destroy(result.public_id);
          } catch (cleanupError) {
            console.error('[SupplierInvoiceController] Error limpiando archivo:', cleanupError);
          }

          return res.status(500).json({
            error: true,
            message: 'Error al actualizar invoice con PDF',
            details: updateError.message
          });
        }
      }
    );

    // Pipe del buffer del archivo al stream de Cloudinary
    const Readable = require('stream').Readable;
    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);

  } catch (error) {
    console.error('[SupplierInvoiceController] Error en uploadInvoicePdf:', error);
    res.status(500).json({
      error: true,
      message: 'Error al procesar subida de PDF',
      details: error.message
    });
  }
};

/**
 * Distribuir un invoice entre múltiples trabajos y crear expenses automáticamente
 * POST /api/supplier-invoices/:id/distribute
 * 
 * Body (FormData):
 * - distribution: JSON string con array de { idWork, amount, notes }
 * - paymentMethod: string
 * - paymentDate: date string
 * - referenceNumber: string (optional)
 * - receipt: file (optional)
 */
const distributeInvoiceToWorks = async (req, res) => {
  const transaction = await SupplierInvoice.sequelize.transaction();

  try {
    const { id } = req.params;
    
    console.log('📊 [DistributeInvoice] Iniciando distribución del invoice:', id);
    console.log('📊 [DistributeInvoice] Body recibido:', req.body);
    console.log('📊 [DistributeInvoice] Archivo recibido:', req.file?.originalname);

    // 1. Obtener invoice
    const invoice = await SupplierInvoice.findByPk(id, { transaction });

    if (!invoice) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Invoice no encontrado' });
    }

    // 2. Verificar que el invoice no esté ya pagado
    if (invoice.paymentStatus === 'paid') {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Este invoice ya está marcado como pagado',
        currentStatus: invoice.paymentStatus
      });
    }

    // 3. Parsear distribución
    let distribution;
    try {
      distribution = JSON.parse(req.body.distribution);
    } catch (error) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Formato de distribución inválido',
        details: error.message
      });
    }

    // 4. Validar distribución
    if (!Array.isArray(distribution) || distribution.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'La distribución debe contener al menos un trabajo' });
    }

    // Validar que todos tengan idWork y amount
    for (const item of distribution) {
      if (!item.idWork || !item.amount || parseFloat(item.amount) <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          error: 'Cada distribución debe tener idWork y amount válidos',
          invalidItem: item
        });
      }
    }

    // 5. Calcular total distribuido
    const totalDistributed = distribution.reduce((sum, item) => {
      return sum + parseFloat(item.amount);
    }, 0);

    // Validar que coincida con el total del invoice (tolerancia de 1 centavo)
    const difference = Math.abs(totalDistributed - parseFloat(invoice.totalAmount));
    if (difference > 0.01) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'El total distribuido no coincide con el total del invoice',
        invoiceTotal: parseFloat(invoice.totalAmount),
        distributed: totalDistributed,
        difference
      });
    }

    // 6. Verificar que todos los works existan
    const workIds = distribution.map(d => d.idWork);
    const works = await Work.findAll({
      where: { idWork: { [Op.in]: workIds } },
      transaction
    });

    if (works.length !== workIds.length) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'Uno o más trabajos no existen',
        requestedWorks: workIds.length,
        foundWorks: works.length
      });
    }

    // 7. Subir receipt a Cloudinary si existe
    let receiptUrl = null;
    let receiptPublicId = null;

    if (req.file) {
      console.log('📎 [DistributeInvoice] Subiendo receipt a Cloudinary...');
      
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'receipts',
          resource_type: 'auto'
        },
        (error, result) => {
          if (error) {
            console.error('❌ Error subiendo receipt:', error);
          } else {
            receiptUrl = result.secure_url;
            receiptPublicId = result.public_id;
            console.log('✅ Receipt subido:', receiptUrl);
          }
        }
      );

      const Readable = require('stream').Readable;
      const bufferStream = new Readable();
      bufferStream.push(req.file.buffer);
      bufferStream.push(null);
      
      await new Promise((resolve, reject) => {
        bufferStream.pipe(uploadStream)
          .on('finish', resolve)
          .on('error', reject);
      });
    }

    // 8. Crear expenses para cada trabajo
    const createdExpenses = [];
    const paymentDate = req.body.paymentDate || new Date().toISOString().split('T')[0];
    const paymentMethod = req.body.paymentMethod || 'Chase Bank';
    const referenceNumber = req.body.referenceNumber || '';

    for (const item of distribution) {
      const work = works.find(w => w.idWork === item.idWork);
      
      // Descripción del expense incluye el vendor
      const expenseDescription = `${invoice.vendor} - Invoice #${invoice.invoiceNumber}${item.notes ? ` (${item.notes})` : ''}`;

      // Crear expense - usar "Materiales" como tipo genérico para supplier invoices
      const expense = await Expense.create({
        workId: item.idWork,
        date: paymentDate, // Fecha del gasto (requerido)
        description: expenseDescription,
        typeExpense: 'Materiales', // Tipo genérico para supplier invoices (arena, tierra, etc.)
        amount: parseFloat(item.amount),
        paymentStatus: 'paid', // Ya se está pagando
        paidAmount: parseFloat(item.amount),
        paymentMethod: paymentMethod,
        paymentDate: paymentDate,
        paymentDetails: referenceNumber,
        notes: `Generado automáticamente desde Supplier Invoice #${invoice.invoiceNumber}. Vendor: ${invoice.vendor}`,
        verified: false,
        staffId: req.user?.id || null // 👤 Usuario que realiza la distribución
      }, { transaction });

      console.log(`✅ Expense creado para work ${work.propertyAddress}: $${item.amount}`);

      // Si hay receipt, crear Receipt vinculado
      if (receiptUrl) {
        await Receipt.create({
          expenseId: expense.idExpense,
          receiptUrl: receiptUrl,
          cloudinaryPublicId: receiptPublicId,
          uploadedByStaffId: req.user?.id || null
        }, { transaction });

        console.log(`📎 Receipt vinculado al expense ${expense.idExpense}`);
      }

      createdExpenses.push({
        idExpense: expense.idExpense,
        workId: item.idWork,
        propertyAddress: work.propertyAddress,
        amount: item.amount
      });
    }

    // 9. Marcar invoice como pagado
    await invoice.update({
      paymentStatus: 'paid',
      paidAmount: invoice.totalAmount,
      paymentMethod: paymentMethod,
      paymentDate: paymentDate,
      paymentDetails: referenceNumber,
      notes: invoice.notes + `\n\n✅ Distribuido entre ${distribution.length} trabajo(s) el ${paymentDate}`
    }, { transaction });

    console.log(`✅ Invoice #${invoice.invoiceNumber} marcado como PAID`);

    // 10. Commit transaction
    await transaction.commit();

    res.json({
      success: true,
      message: `Invoice distribuido exitosamente entre ${distribution.length} trabajo(s)`,
      invoice: {
        idSupplierInvoice: invoice.idSupplierInvoice,
        invoiceNumber: invoice.invoiceNumber,
        paymentStatus: 'paid',
        totalAmount: invoice.totalAmount
      },
      expensesCreated: createdExpenses.length,
      worksUpdated: distribution.length,
      expenses: createdExpenses,
      receiptUploaded: !!receiptUrl
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ [DistributeInvoice] Error:', error);
    res.status(500).json({
      error: true,
      message: 'Error al distribuir invoice',
      details: error.message
    });
  }
};

/**
 * 🆕 NUEVO ENDPOINT: Pagar Invoice con 3 opciones
 * POST /api/supplier-invoices/:id/pay
 * 
 * Opciones de pago:
 * 1. "link_existing" - Vincular a expense(s) existente(s)
 * 2. "create_with_works" - Crear nuevo expense vinculado a work(s)
 * 3. "create_general" - Crear expense general sin work
 * 
 * Body:
 * {
 *   paymentType: "link_existing" | "create_with_works" | "create_general",
 *   paymentMethod: string,
 *   paymentDate: date,
 *   paymentDetails: string (opcional),
 *   
 *   // Si paymentType === "link_existing"
 *   expenseIds: [uuid, uuid, ...],
 *   
 *   // Si paymentType === "create_with_works"
 *   workIds: [uuid, uuid, ...],
 *   distribution: [{workId: uuid, amount: number}, ...], // Opcional, si no se proporciona se distribuye equitativamente
 *   
 *   // Si paymentType === "create_general"
 *   // No requiere campos adicionales
 * }
 */
const paySupplierInvoice = async (req, res) => {
  const { id: invoiceId } = req.params;
  const transaction = await SupplierInvoice.sequelize.transaction();

  try {
    // 🆕 Procesar FormData (ahora viene con archivo)
    let {
      paymentType,
      paymentMethod,
      paymentDate,
      paymentDetails,
      expenseIds,
      distribution,
      generalDescription
    } = req.body;

    // 🆕 Parsear arrays si vienen como strings (FormData serializa arrays como strings)
    if (typeof expenseIds === 'string') {
      expenseIds = JSON.parse(expenseIds);
    }
    if (typeof distribution === 'string') {
      distribution = JSON.parse(distribution);
    }

    // 🆕 Obtener archivo de receipt si existe
    const receiptFile = req.file;

    console.log(`💳 [PayInvoice] Procesando pago de invoice ${invoiceId}`, {
      paymentType,
      paymentMethod,
      paymentDate,
      hasReceipt: !!receiptFile
    });

    // 1. Validar campos requeridos
    if (!paymentType || !paymentMethod) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Faltan campos requeridos: paymentType, paymentMethod'
      });
    }

    if (!['link_existing', 'create_with_works', 'create_general'].includes(paymentType)) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'paymentType inválido. Debe ser: link_existing, create_with_works, o create_general'
      });
    }

    // 2. Buscar el invoice
    const invoice = await SupplierInvoice.findByPk(invoiceId, { transaction });

    if (!invoice) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Invoice no encontrado' });
    }

    if (invoice.paymentStatus === 'paid') {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Este invoice ya está marcado como pagado'
      });
    }

    const finalPaymentDate = paymentDate || new Date().toISOString().split('T')[0];
    let createdExpenses = [];
    let linkedExpenses = [];

    // 3. Procesar según tipo de pago
    switch (paymentType) {
      
      // ===== OPCIÓN 1: VINCULAR A EXPENSE(S) EXISTENTE(S) =====
      case 'link_existing': {
        if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
          await transaction.rollback();
          return res.status(400).json({
            error: 'Para paymentType=link_existing, se requiere expenseIds (array de UUIDs)'
          });
        }

        console.log(`🔗 [PayInvoice] Vinculando a ${expenseIds.length} expense(s) existente(s)...`);

        // Buscar los expenses
        const expenses = await Expense.findAll({
          where: { idExpense: { [Op.in]: expenseIds } },
          transaction
        });

        if (expenses.length !== expenseIds.length) {
          await transaction.rollback();
          return res.status(404).json({
            error: 'Uno o más expenses no existen',
            requested: expenseIds.length,
            found: expenses.length
          });
        }

        // Calcular total de expenses
        const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const invoiceTotal = parseFloat(invoice.totalAmount);

        // Validar que coincidan los totales (tolerancia de 1 centavo)
        if (Math.abs(totalExpenses - invoiceTotal) > 0.01) {
          await transaction.rollback();
          return res.status(400).json({
            error: 'El total de los expenses no coincide con el total del invoice',
            invoiceTotal,
            totalExpenses,
            difference: Math.abs(totalExpenses - invoiceTotal)
          });
        }

        // Vincular cada expense al invoice usando la tabla intermedia
        for (const expense of expenses) {
          const { SupplierInvoiceExpense } = require('../data');
          
          await SupplierInvoiceExpense.create({
            supplierInvoiceId: invoice.idSupplierInvoice,
            expenseId: expense.idExpense,
            amountApplied: expense.amount,
            linkedByStaffId: req.user?.id || null,
            notes: `Vinculado al invoice #${invoice.invoiceNumber}`
          }, { transaction });

          // Actualizar el expense a "paid_via_invoice"
          await expense.update({
            paymentStatus: 'paid_via_invoice',
            paidDate: finalPaymentDate
          }, { transaction });

          linkedExpenses.push({
            idExpense: expense.idExpense,
            amount: expense.amount,
            typeExpense: expense.typeExpense,
            workId: expense.workId
          });

          console.log(`  ✅ Expense ${expense.idExpense} vinculado ($${expense.amount})`);
        }

        console.log(`✅ ${expenses.length} expense(s) vinculado(s) exitosamente`);
        break;
      }

      // ===== OPCIÓN 2: CREAR EXPENSE(S) VINCULADO(S) A WORK(S) =====
      case 'create_with_works': {
        if (!distribution || !Array.isArray(distribution) || distribution.length === 0) {
          await transaction.rollback();
          return res.status(400).json({
            error: 'Para paymentType=create_with_works, se requiere distribution (array de {workId, amount})'
          });
        }

        console.log(`🏗️  [PayInvoice] Creando expense(s) para ${distribution.length} work(s)...`);

        // Extraer workIds del distribution
        const workIds = distribution.map(d => d.workId);

        // Buscar los works
        const works = await Work.findAll({
          where: { idWork: { [Op.in]: workIds } },
          transaction
        });

        if (works.length !== workIds.length) {
          await transaction.rollback();
          return res.status(404).json({
            error: 'Uno o más works no existen',
            requested: workIds.length,
            found: works.length
          });
        }

        // Validar distribución
        const totalDistributed = distribution.reduce((sum, d) => sum + parseFloat(d.amount), 0);
        if (Math.abs(totalDistributed - parseFloat(invoice.totalAmount)) > 0.01) {
          await transaction.rollback();
          return res.status(400).json({
            error: 'El total distribuido no coincide con el total del invoice',
            invoiceTotal: parseFloat(invoice.totalAmount),
            distributed: totalDistributed
          });
        }

        // 🆕 Subir receipt a Cloudinary si existe
        let receiptUrl = null;
        let receiptPublicId = null;
        if (receiptFile) {
          console.log('📤 Subiendo receipt a Cloudinary...');
          const uploadResult = await uploadBufferToCloudinary(receiptFile.buffer, {
            folder: 'zurcher_receipts',
            resource_type: receiptFile.mimetype === 'application/pdf' ? 'raw' : 'auto',
            format: receiptFile.mimetype === 'application/pdf' ? undefined : 'jpg',
            access_mode: 'public'
          });
          receiptUrl = uploadResult.secure_url;
          receiptPublicId = uploadResult.public_id;
          console.log('✅ Receipt subido exitosamente');
        }

        // Crear expense para cada work
        for (const item of distribution) {
          const work = works.find(w => w.idWork === item.workId);
          
          // Construir descripción: base + descripción personalizada (si existe)
          let expenseDescription = `${invoice.vendor} - Invoice #${invoice.invoiceNumber}`;
          if (item.description && item.description.trim()) {
            expenseDescription += ` - ${item.description.trim()}`;
          }

          const expense = await Expense.create({
            workId: item.workId,
            date: finalPaymentDate,
            amount: parseFloat(item.amount),
            typeExpense: 'Materiales', // Tipo genérico
            notes: expenseDescription,
            paymentStatus: 'paid',
            paidDate: finalPaymentDate,
            paymentMethod: paymentMethod,
            paymentDetails: paymentDetails || '',
            vendor: invoice.vendor,
            verified: false,
            staffId: req.user?.id || null
          }, { transaction });

          // 🆕 Crear Receipt vinculado al Expense si hay archivo
          if (receiptFile && receiptUrl) {
            await Receipt.create({
              relatedModel: 'Expense',
              relatedId: expense.idExpense.toString(),
              type: 'Materiales',
              notes: `Receipt de invoice #${invoice.invoiceNumber}`,
              fileUrl: receiptUrl,
              publicId: receiptPublicId,
              mimeType: receiptFile.mimetype,
              originalName: receiptFile.originalname
            }, { transaction });
            console.log(`  📎 Receipt vinculado al expense ${expense.idExpense}`);
          }

          // Vincular el expense al invoice
          const { SupplierInvoiceExpense } = require('../data');
          await SupplierInvoiceExpense.create({
            supplierInvoiceId: invoice.idSupplierInvoice,
            expenseId: expense.idExpense,
            amountApplied: item.amount,
            linkedByStaffId: req.user?.id || null,
            notes: `Creado para work ${work.propertyAddress}`
          }, { transaction });

          createdExpenses.push({
            idExpense: expense.idExpense,
            workId: item.workId,
            propertyAddress: work.propertyAddress,
            amount: item.amount
          });

          console.log(`  ✅ Expense creado para work ${work.propertyAddress}: $${item.amount}`);

          // 🆕 Enviar notificación del expense creado
          try {
            const expenseWithDetails = await Expense.findByPk(expense.idExpense, {
              include: [
                { model: Staff, as: 'Staff', attributes: ['id', 'name', 'email'] },
                { model: Work, as: 'work', attributes: ['idWork', 'propertyAddress'] }
              ],
              transaction
            });

            await sendNotifications('expenseCreated', expenseWithDetails.toJSON());
            console.log(`  📧 Notificación enviada para expense ${expense.idExpense}`);
          } catch (notificationError) {
            console.error('  ⚠️ Error enviando notificación:', notificationError.message);
          }
        }

        console.log(`✅ ${createdExpenses.length} expense(s) creado(s) exitosamente`);
        break;
      }

      // ===== OPCIÓN 3: CREAR EXPENSE GENERAL (SIN WORK) =====
      case 'create_general': {
        console.log('🌍 [PayInvoice] Creando expense general...');

        // Construir descripción: base + descripción personalizada (si existe)
        let expenseDescription = `${invoice.vendor} - Invoice #${invoice.invoiceNumber}`;
        if (generalDescription && generalDescription.trim()) {
          expenseDescription += ` - ${generalDescription.trim()}`;
        }

        const expense = await Expense.create({
          workId: null, // Sin work asociado
          date: finalPaymentDate,
          amount: parseFloat(invoice.totalAmount),
          typeExpense: 'Gastos Generales',
          notes: expenseDescription,
          paymentStatus: 'paid',
          paidDate: finalPaymentDate,
          paymentMethod: paymentMethod,
          paymentDetails: paymentDetails || '',
          vendor: invoice.vendor,
          verified: false,
          staffId: req.user?.id || null
        }, { transaction });

        // 🆕 Subir y crear Receipt si hay archivo
        if (receiptFile) {
          console.log('📤 Subiendo receipt a Cloudinary...');
          const uploadResult = await uploadBufferToCloudinary(receiptFile.buffer, {
            folder: 'zurcher_receipts',
            resource_type: receiptFile.mimetype === 'application/pdf' ? 'raw' : 'auto',
            format: receiptFile.mimetype === 'application/pdf' ? undefined : 'jpg',
            access_mode: 'public'
          });

          await Receipt.create({
            relatedModel: 'Expense',
            relatedId: expense.idExpense.toString(),
            type: 'Gastos Generales',
            notes: `Receipt de invoice #${invoice.invoiceNumber}`,
            fileUrl: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            mimeType: receiptFile.mimetype,
            originalName: receiptFile.originalname
          }, { transaction });
          
          console.log('✅ Receipt subido y vinculado al expense');
        }

        // Vincular el expense al invoice
        const { SupplierInvoiceExpense } = require('../data');
        await SupplierInvoiceExpense.create({
          supplierInvoiceId: invoice.idSupplierInvoice,
          expenseId: expense.idExpense,
          amountApplied: invoice.totalAmount,
          linkedByStaffId: req.user?.id || null,
          notes: 'Gasto general sin work asociado'
        }, { transaction });

        createdExpenses.push({
          idExpense: expense.idExpense,
          workId: null,
          amount: invoice.totalAmount,
          typeExpense: 'Gastos Generales'
        });

        console.log(`  ✅ Expense general creado: $${invoice.totalAmount}`);

        // 🆕 Enviar notificación del expense creado
        try {
          const expenseWithDetails = await Expense.findByPk(expense.idExpense, {
            include: [
              { model: Staff, as: 'Staff', attributes: ['id', 'name', 'email'] },
              { model: Work, as: 'work', attributes: ['idWork', 'propertyAddress'] }
            ],
            transaction
          });

          await sendNotifications('expenseCreated', expenseWithDetails.toJSON());
          console.log(`  📧 Notificación enviada para expense general ${expense.idExpense}`);
        } catch (notificationError) {
          console.error('  ⚠️ Error enviando notificación:', notificationError.message);
        }

        break;
      }
    }

    // 4. Actualizar el invoice a "paid"
    await invoice.update({
      paymentStatus: 'paid',
      paidAmount: invoice.totalAmount,
      paymentMethod: paymentMethod,
      paymentDate: finalPaymentDate,
      paymentDetails: paymentDetails || ''
    }, { transaction });

    console.log(`✅ Invoice #${invoice.invoiceNumber} marcado como PAID`);

    // 5. Commit transaction
    await transaction.commit();

    // 6. Responder
    res.json({
      success: true,
      message: `Invoice pagado exitosamente usando método: ${paymentType}`,
      invoice: {
        idSupplierInvoice: invoice.idSupplierInvoice,
        invoiceNumber: invoice.invoiceNumber,
        paymentStatus: 'paid',
        totalAmount: invoice.totalAmount,
        paymentDate: finalPaymentDate
      },
      paymentType,
      expensesCreated: createdExpenses.length,
      expensesLinked: linkedExpenses.length,
      createdExpenses,
      linkedExpenses
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ [PayInvoice] Error:', error);
    res.status(500).json({
      error: true,
      message: 'Error al procesar el pago del invoice',
      details: error.message
    });
  }
};

/**
 * 🆕 NUEVO ENDPOINT: Obtener resumen de proveedores con totales pendientes
 * GET /api/supplier-invoices/vendors/summary
 * 
 * Agrupa invoices por proveedor y muestra:
 * - Total pendiente por proveedor
 * - Cantidad de invoices pendientes
 * - Lista de invoices del proveedor
 */
const getVendorsSummary = async (req, res) => {
  try {
    console.log('📊 [VendorsSummary] Obteniendo resumen de proveedores...');

    // Obtener todos los invoices pendientes agrupados por vendor
    const invoices = await SupplierInvoice.findAll({
      where: {
        paymentStatus: {
          [Op.in]: ['pending', 'partial', 'overdue']
        }
      },
      attributes: [
        'idSupplierInvoice',
        'invoiceNumber',
        'vendor',
        'issueDate',
        'dueDate',
        'totalAmount',
        'paidAmount',
        'paymentStatus',
        'notes'
      ],
      order: [['vendor', 'ASC'], ['issueDate', 'ASC']]
    });

    // Agrupar por vendor (normalizando nombres para evitar duplicados)
    const vendorMap = {};

    invoices.forEach(invoice => {
      // Normalizar vendor: trim + convertir a lowercase para agrupación
      const vendorKey = invoice.vendor.trim().toLowerCase();
      const vendorDisplay = invoice.vendor.trim(); // Mantener el formato original para mostrar
      const pendingAmount = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount);

      if (!vendorMap[vendorKey]) {
        vendorMap[vendorKey] = {
          vendor: vendorDisplay,
          totalPending: 0,
          invoiceCount: 0,
          invoices: []
        };
      }

      vendorMap[vendorKey].totalPending += pendingAmount;
      vendorMap[vendorKey].invoiceCount += 1;
      vendorMap[vendorKey].invoices.push({
        idSupplierInvoice: invoice.idSupplierInvoice,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        pendingAmount: pendingAmount.toFixed(2),
        paymentStatus: invoice.paymentStatus,
        notes: invoice.notes
      });
    });

    // Convertir a array y ordenar por total pendiente (mayor a menor)
    const vendors = Object.values(vendorMap).sort((a, b) => b.totalPending - a.totalPending);

    // Redondear los totales y ordenar invoices dentro de cada vendor por fecha (más antigua primero)
    vendors.forEach(v => {
      v.totalPending = parseFloat(v.totalPending.toFixed(2));
      // Ordenar invoices por fecha ascendente (más antigua primero)
      v.invoices.sort((a, b) => new Date(a.issueDate) - new Date(b.issueDate));
    });

    const totalPendingAllVendors = vendors.reduce((sum, v) => sum + v.totalPending, 0);

    console.log(`✅ ${vendors.length} proveedor(es) con invoices pendientes`);

    res.json({
      success: true,
      vendorsCount: vendors.length,
      totalInvoicesPending: invoices.length,
      totalPendingAmount: parseFloat(totalPendingAllVendors.toFixed(2)),
      vendors
    });

  } catch (error) {
    console.error('❌ [VendorsSummary] Error:', error);
    res.status(500).json({
      error: true,
      message: 'Error al obtener resumen de proveedores',
      details: error.message
    });
  }
};

/**
 * 🆕 Crear un nuevo invoice SIMPLIFICADO (sin items, solo invoice + comprobante)
 * POST /api/supplier-invoices/simple
 */
const createSimpleSupplierInvoice = async (req, res) => {
  const transaction = await SupplierInvoice.sequelize.transaction();

  try {
    const {
      invoiceNumber,
      vendor,
      issueDate,
      dueDate,
      totalAmount,
      notes
    } = req.body;

    const invoiceFile = req.file;

    console.log('📥 [SimpleInvoice] Crear invoice simplificado:', {
      invoiceNumber,
      vendor,
      totalAmount,
      hasFile: !!invoiceFile
    });

    // Validaciones
    if (!invoiceNumber || !vendor || !totalAmount) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Campos requeridos: invoiceNumber, vendor, totalAmount'
      });
    }

    if (parseFloat(totalAmount) <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'El total debe ser mayor a 0'
      });
    }

    // 🆕 Normalizar vendor name (trim y espacios múltiples)
    const normalizedVendor = vendor.trim().replace(/\s+/g, ' ');
    console.log(`✨ Vendor normalizado: "${vendor}" → "${normalizedVendor}"`);

    // Verificar si ya existe un invoice con ese número
    const existing = await SupplierInvoice.findOne({
      where: { invoiceNumber },
      transaction
    });

    if (existing) {
      await transaction.rollback();
      return res.status(400).json({
        error: `Ya existe un invoice con el número ${invoiceNumber}`
      });
    }

    // Crear el invoice
    const newInvoice = await SupplierInvoice.create({
      invoiceNumber,
      vendor: normalizedVendor, // 🆕 Usar vendor normalizado
      issueDate: issueDate || new Date().toISOString().split('T')[0],
      dueDate: dueDate || null,
      totalAmount: parseFloat(totalAmount),
      paidAmount: 0,
      paymentStatus: 'pending',
      notes: notes || ''
    }, { transaction });

    // Subir archivo a Cloudinary si existe
    if (invoiceFile) {
      console.log('📤 Subiendo comprobante a Cloudinary...');
      
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'zurcher_supplier_invoices',
            resource_type: invoiceFile.mimetype === 'application/pdf' ? 'raw' : 'auto',
            format: invoiceFile.mimetype === 'application/pdf' ? undefined : 'jpg',
            access_mode: 'public'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(invoiceFile.buffer);
      });

      await newInvoice.update({
        invoicePdfPath: result.secure_url,
        invoicePdfPublicId: result.public_id
      }, { transaction });

      console.log('✅ Comprobante subido exitosamente');
    }

    await transaction.commit();

    console.log(`✅ Invoice #${newInvoice.invoiceNumber} creado exitosamente`);

    res.status(201).json({
      success: true,
      message: 'Invoice creado exitosamente',
      invoice: newInvoice
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ [SimpleInvoice] Error:', error);
    res.status(500).json({
      error: true,
      message: 'Error al crear el invoice',
      details: error.message
    });
  }
};

/**
 * 🆕 Obtener lista de vendors únicos para autocomplete
 * GET /api/supplier-invoices/vendors
 */
const getVendorsList = async (req, res) => {
  try {
    console.log('📋 [VendorsList] Obteniendo lista de vendors únicos...');

    // Obtener todos los vendors únicos de la base de datos
    const invoices = await SupplierInvoice.findAll({
      attributes: ['vendor'],
      group: ['vendor'],
      order: [['vendor', 'ASC']]
    });

    // Normalizar y eliminar duplicados
    const vendorsSet = new Set();
    
    invoices.forEach(invoice => {
      const normalized = invoice.vendor.trim();
      if (normalized) {
        vendorsSet.add(normalized);
      }
    });

    // Convertir a array y ordenar alfabéticamente
    const vendors = Array.from(vendorsSet).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    );

    console.log(`✅ ${vendors.length} vendor(s) único(s) encontrado(s)`);

    res.json({
      success: true,
      count: vendors.length,
      vendors
    });

  } catch (error) {
    console.error('❌ [VendorsList] Error:', error);
    res.status(500).json({
      error: true,
      message: 'Error al obtener lista de vendors',
      details: error.message
    });
  }
};

// ==========================================
// 💳 FUNCIONES PARA TARJETA DE CRÉDITO
// ==========================================

/**
 * 💳 Crear transacción de tarjeta de crédito (cargo, pago o interés)
 * POST /api/supplier-invoices/credit-card/transaction
 * 
 * - CARGO: Crea un Expense con paymentMethod = 'Chase Credit Card'
 * - PAGO: Aplica FIFO sobre expenses pendientes
 * - INTERÉS: Crea un Expense de tipo interés
 */
const createCreditCardTransaction = async (req, res) => {
  const dbTransaction = await sequelize.transaction();

  try {
    const {
      transactionType, // 'charge', 'payment', 'interest'
      description,
      amount,
      date,
      paymentMethod, // Solo para tipo 'payment'
      paymentDetails, // Solo para tipo 'payment'
      notes,
      vendor, // Opcional para cargos
      workId // Opcional: asociar a un trabajo
    } = req.body;

    console.log(`💳 [CreditCard] Creando transacción tipo: ${transactionType}`);

    // Validaciones
    if (!['charge', 'payment', 'interest'].includes(transactionType)) {
      return res.status(400).json({
        error: true,
        message: 'transactionType debe ser: charge, payment o interest'
      });
    }

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        error: true,
        message: 'El monto debe ser mayor a 0'
      });
    }

    const transactionAmount = parseFloat(amount);
    let createdExpense = null;
    let updatedExpenses = [];

    // ==========================================
    // CARGO: Crear Expense con Chase Credit Card
    // ==========================================
    if (transactionType === 'charge') {
      console.log(`💳 [CARGO] Creando expense con Chase Credit Card...`);

      createdExpense = await Expense.create({
        date: date || new Date().toISOString().split('T')[0],
        amount: transactionAmount,
        typeExpense: 'Comprobante Gasto', // O el tipo que prefieras
        notes: description || notes || 'Cargo manual en tarjeta',
        paymentMethod: 'Chase Credit Card',
        paymentStatus: 'unpaid',
        paidAmount: 0,
        vendor: vendor || 'Chase Credit Card',
        verified: false,
        workId: workId || null,
        staffId: req.staff?.id || null
      }, { transaction: dbTransaction });

      console.log(`✅ Expense creado: ${createdExpense.idExpense}`);
    }

    // ==========================================
    // INTERÉS: Crear Expense de tipo especial
    // ==========================================
    if (transactionType === 'interest') {
      console.log(`📈 [INTERÉS] Creando expense de interés...`);

      createdExpense = await Expense.create({
        date: date || new Date().toISOString().split('T')[0],
        amount: transactionAmount,
        typeExpense: 'Gastos Generales', // Intereses como gasto general
        notes: description || notes || 'Intereses Chase Credit Card',
        paymentMethod: 'Chase Credit Card',
        paymentStatus: 'unpaid',
        paidAmount: 0,
        vendor: 'Chase Credit Card - Intereses',
        verified: false,
        workId: null, // Intereses no se asocian a trabajos
        staffId: req.staff?.id || null
      }, { transaction: dbTransaction });

      console.log(`✅ Expense de interés creado: ${createdExpense.idExpense}`);
    }

    // ==========================================
    // PAGO: Aplicar FIFO sobre expenses pendientes
    // ==========================================
    if (transactionType === 'payment') {
      console.log(`💰 [FIFO] Aplicando pago de $${transactionAmount} sobre expenses pendientes...`);

      // Obtener expenses pendientes ordenados por fecha (FIFO)
      const pendingExpenses = await Expense.findAll({
        where: {
          paymentMethod: 'Chase Credit Card',
          paymentStatus: ['unpaid', 'partial']
        },
        order: [['date', 'ASC']], // FIFO: más antiguos primero
        transaction: dbTransaction
      });

      let remainingPayment = transactionAmount;

      for (const expense of pendingExpenses) {
        if (remainingPayment <= 0) break;

        const expenseAmount = parseFloat(expense.amount);
        const paidAmount = parseFloat(expense.paidAmount || 0);
        const pendingAmount = expenseAmount - paidAmount;

        if (pendingAmount > 0) {
          const amountToApply = Math.min(remainingPayment, pendingAmount);
          const newPaidAmount = paidAmount + amountToApply;

          // Actualizar expense
          await expense.update({
            paidAmount: newPaidAmount,
            paymentStatus: newPaidAmount >= expenseAmount ? 'paid' : 'partial',
            paidDate: newPaidAmount >= expenseAmount ? (date || new Date()) : expense.paidDate
          }, { transaction: dbTransaction });

          updatedExpenses.push({
            idExpense: expense.idExpense,
            notes: expense.notes,
            amount: expenseAmount,
            appliedPayment: amountToApply,
            newStatus: newPaidAmount >= expenseAmount ? 'paid' : 'partial'
          });

          remainingPayment -= amountToApply;
          console.log(`  ✅ Expense ${expense.notes}: $${amountToApply} aplicado (${newPaidAmount >= expenseAmount ? 'PAGADO' : 'PARCIAL'})`);
        }
      }

      console.log(`💰 [FIFO] ${updatedExpenses.length} expense(s) actualizados. Sobrante: $${remainingPayment}`);

      // Registrar el pago en SupplierInvoice para tracking
      await SupplierInvoice.create({
        invoiceNumber: `CC-PAYMENT-${Date.now()}`,
        vendor: 'Chase Credit Card',
        issueDate: date || new Date(),
        dueDate: null,
        totalAmount: transactionAmount,
        paymentStatus: 'paid',
        paymentMethod: paymentMethod,
        paymentDetails: paymentDetails,
        paymentDate: date || new Date(),
        paidAmount: transactionAmount,
        notes: description || notes || 'Pago de tarjeta',
        transactionType: 'payment',
        isCreditCard: true,
        balanceAfter: 0, // Se recalcula después
        createdByStaffId: req.staff?.id || null
      }, { transaction: dbTransaction });
    }

    await dbTransaction.commit();

    // Recalcular balance después del commit
    const stats = await calculateCreditCardBalance();

    console.log(`✅ Transacción ${transactionType} completada | Balance actual: $${stats.currentBalance}`);

    res.status(201).json({
      success: true,
      message: `${transactionType === 'payment' ? 'Pago' : transactionType === 'interest' ? 'Interés' : 'Cargo'} registrado exitosamente`,
      createdExpense: createdExpense || null,
      updatedExpenses: updatedExpenses.length > 0 ? updatedExpenses : null,
      currentBalance: stats.currentBalance,
      statistics: stats
    });

  } catch (error) {
    await dbTransaction.rollback();
    console.error('❌ [CreditCard] Error:', error);
    res.status(500).json({
      error: true,
      message: 'Error al crear transacción de tarjeta',
      details: error.message
    });
  }
};

/**
 * 💳 Función auxiliar para calcular balance actual de Chase Credit Card
 * Balance = Suma de montos pendientes (amount - paidAmount) de cada expense
 */
const calculateCreditCardBalance = async (transaction = null) => {
  // 1. Obtener todos los expenses con Chase Credit Card (CARGOS)
  const expenses = await Expense.findAll({
    where: {
      paymentMethod: 'Chase Credit Card'
    },
    attributes: ['amount', 'paidAmount', 'paymentStatus'],
    transaction
  });

  // Total de cargos y pendientes
  const totalCharges = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const totalPaidViaExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.paidAmount || 0), 0);
  
  // Balance pendiente de expenses = suma de (amount - paidAmount)
  const pendingFromExpenses = expenses.reduce((sum, exp) => {
    const amount = parseFloat(exp.amount);
    const paid = parseFloat(exp.paidAmount || 0);
    return sum + (amount - paid);
  }, 0);

  // 2. Obtener intereses de SupplierInvoices (estos también son deuda)
  const interests = await SupplierInvoice.findAll({
    where: {
      vendor: 'Chase Credit Card',
      isCreditCard: true,
      transactionType: 'interest'
    },
    attributes: ['totalAmount'],
    transaction
  });

  const totalInterests = interests.reduce((sum, int) => sum + parseFloat(int.totalAmount), 0);

  // 3. Obtener pagos de SupplierInvoices (para referencia)
  const payments = await SupplierInvoice.findAll({
    where: {
      vendor: 'Chase Credit Card',
      isCreditCard: true,
      transactionType: 'payment'
    },
    attributes: ['totalAmount'],
    transaction
  });

  const totalPayments = payments.reduce((sum, pay) => sum + parseFloat(pay.totalAmount), 0);

  // Balance actual = Monto pendiente de expenses + Intereses NO pagados
  // Los pagos ya están reflejados en paidAmount de los expenses (FIFO)
  const currentBalance = pendingFromExpenses;

  return {
    currentBalance,
    totalCharges,
    totalInterests,
    totalPayments,
    totalPaidViaExpenses
  };
};

/**
 * 💳 Obtener balance y transacciones de Chase Credit Card
 * GET /api/supplier-invoices/credit-card/balance
 * 
 * Combina:
 * - Expenses con paymentMethod = 'Chase Credit Card' (CARGOS)
 * - SupplierInvoices con isCreditCard = true (PAGOS e INTERESES)
 */
const getCreditCardBalance = async (req, res) => {
  try {
    console.log('💳 [CreditCard] Obteniendo balance y transacciones...');

    // 1. Obtener expenses (CARGOS)
    const expenses = await Expense.findAll({
      where: {
        paymentMethod: 'Chase Credit Card'
      },
      attributes: [
        'idExpense',
        'date',
        'amount',
        'paidAmount',
        'paymentStatus',
        'notes',
        'vendor',
        'typeExpense',
        'createdAt'
      ],
      order: [['date', 'DESC']]
    });

    // 2. Obtener pagos e intereses (SupplierInvoices)
    const transactions = await SupplierInvoice.findAll({
      where: { 
        vendor: 'Chase Credit Card',
        isCreditCard: true 
      },
      order: [['issueDate', 'DESC'], ['createdAt', 'DESC']],
      attributes: [
        'idSupplierInvoice',
        'invoiceNumber',
        'transactionType',
        'issueDate',
        'totalAmount',
        'balanceAfter',
        'paymentMethod',
        'paymentDetails',
        'notes',
        'createdAt'
      ]
    });

    // 3. Calcular balance y estadísticas
    const stats = await calculateCreditCardBalance();

    // 4. Combinar todo en una sola lista cronológica
    const allTransactions = [
      // Expenses como cargos
      ...expenses.map(exp => ({
        id: exp.idExpense,
        type: 'charge',
        transactionType: 'charge',
        date: exp.date,
        description: exp.notes || exp.vendor || exp.typeExpense,
        amount: parseFloat(exp.amount),
        paidAmount: parseFloat(exp.paidAmount || 0),
        pendingAmount: parseFloat(exp.amount) - parseFloat(exp.paidAmount || 0),
        paymentStatus: exp.paymentStatus,
        createdAt: exp.createdAt,
        source: 'expense'
      })),
      // SupplierInvoices (pagos e intereses)
      ...transactions.map(trans => ({
        id: trans.idSupplierInvoice,
        type: trans.transactionType,
        transactionType: trans.transactionType,
        date: trans.issueDate,
        description: trans.notes || `${trans.transactionType === 'payment' ? 'Pago' : 'Interés'} de tarjeta`,
        amount: parseFloat(trans.totalAmount),
        paymentMethod: trans.paymentMethod,
        paymentDetails: trans.paymentDetails,
        balanceAfter: parseFloat(trans.balanceAfter || 0),
        createdAt: trans.createdAt,
        source: 'supplier_invoice'
      }))
    ];

    // Ordenar por fecha descendente
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    console.log(`✅ Balance actual: $${stats.currentBalance} | ${allTransactions.length} transacciones`);

    res.json({
      success: true,
      currentBalance: stats.currentBalance,
      statistics: {
        totalCharges: stats.totalCharges,
        totalInterests: stats.totalInterests,
        totalPayments: stats.totalPayments,
        transactionCount: allTransactions.length,
        expensesCount: expenses.length,
        paymentsCount: transactions.filter(t => t.transactionType === 'payment').length,
        interestsCount: transactions.filter(t => t.transactionType === 'interest').length
      },
      transactions: allTransactions
    });

  } catch (error) {
    console.error('❌ [CreditCard] Error:', error);
    res.status(500).json({
      error: true,
      message: 'Error al obtener balance de tarjeta',
      details: error.message
    });
  }
};

module.exports = {
  createSupplierInvoice,
  getSupplierInvoices,
  getSupplierInvoiceById,
  registerPayment,
  updateSupplierInvoice,
  deleteSupplierInvoice,
  getAccountsPayable,
  getPaymentHistory,
  uploadInvoicePdf,
  distributeInvoiceToWorks,
  paySupplierInvoice, // 🆕 NUEVO
  getVendorsSummary, // 🆕 NUEVO
  createSimpleSupplierInvoice, // 🆕 NUEVO formulario simplificado
  getVendorsList, // 🆕 NUEVO lista de vendors para autocomplete
  createCreditCardTransaction, // 💳 NUEVO transacciones de tarjeta
  getCreditCardBalance // 💳 NUEVO balance de tarjeta
};
