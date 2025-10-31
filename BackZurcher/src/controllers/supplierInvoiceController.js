const { SupplierInvoice, SupplierInvoiceItem, Expense, FixedExpense, Work, Staff, Receipt } = require('../data');
const { Op } = require('sequelize');
const { cloudinary } = require('../utils/cloudinaryConfig');

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

    // 1. Crear el invoice principal
    const invoice = await SupplierInvoice.create({
      invoiceNumber,
      vendor,
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
      else {
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
      }
    }

    // 6. Actualizar el total del invoice
    await invoice.update({ totalAmount }, { transaction });

    // Commit de la transacción
    await transaction.commit();

    console.log(`\n✅ Invoice ${invoiceNumber} creado exitosamente con ${createdItems.length} items\n`);

    // Retornar el invoice con sus items
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
        }
      ]
    });

    res.status(201).json({
      message: 'Invoice creado exitosamente',
      invoice: invoiceWithItems
    });

  } catch (error) {
    await transaction.rollback();
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

    // Siempre incluir items con sus relaciones para que el frontend tenga la info completa
    const include = [
      {
        model: Staff,
        as: 'createdBy',
        attributes: ['id', 'name', 'email']
      },
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

    const invoice = await SupplierInvoice.findByPk(id, {
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
              attributes: ['idExpense', 'typeExpense', 'amount', 'date', 'paymentStatus']
            }
          ]
        },
        {
          model: Staff,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Receipt,
          as: 'Receipts',
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
 * Registrar pago de un invoice
 * PATCH /api/supplier-invoices/:id/pay
 */
const registerPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      paymentMethod,
      paymentDate,
      paidAmount,
      paymentDetails,
      notes
    } = req.body;

    // Validación
    if (!paymentMethod || !paymentDate || !paidAmount) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: paymentMethod, paymentDate, paidAmount'
      });
    }

    const invoice = await SupplierInvoice.findByPk(id);

    if (!invoice) {
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

    // Actualizar invoice
    await invoice.update({
      paymentMethod,
      paymentDate,
      paidAmount: newPaidAmount,
      paymentDetails: paymentDetails || invoice.paymentDetails,
      paymentStatus: newStatus,
      notes: notes || invoice.notes
    });

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
        }
      ]
    });

    res.json({
      message: 'Pago registrado exitosamente',
      invoice: updatedInvoice
    });

  } catch (error) {
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
    const { items, ...invoiceUpdates } = req.body;

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

    await transaction.commit();

    console.log(`✅ Invoice ${invoice.invoiceNumber} actualizado`);

    // Retornar invoice actualizado con items
    const updatedInvoice = await SupplierInvoice.findByPk(id, {
      include: [{
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
      }]
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

module.exports = {
  createSupplierInvoice,
  getSupplierInvoices,
  getSupplierInvoiceById,
  registerPayment,
  updateSupplierInvoice,
  deleteSupplierInvoice,
  getAccountsPayable,
  getPaymentHistory,
  uploadInvoicePdf
};
