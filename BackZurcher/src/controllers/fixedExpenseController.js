const { FixedExpense, FixedExpensePayment, Staff, Expense } = require('../data');
const { Op } = require('sequelize');

/**
 * 🔧 Helper: Calcular paymentStatus para el frontend
 */
const addPaymentStatus = (fixedExpenseData) => {
  const paidAmount = parseFloat(fixedExpenseData.paidAmount || 0);
  const totalAmount = parseFloat(fixedExpenseData.totalAmount || 0);
  
  let paymentStatus;
  if (paidAmount >= totalAmount && totalAmount > 0) {
    paymentStatus = 'paid';
  } else if (paidAmount > 0) {
    paymentStatus = 'partial';
  } else {
    paymentStatus = 'unpaid';
  }

  return {
    ...fixedExpenseData,
    paymentStatus
  };
};

/**
 * Crear un nuevo gasto fijo
 */
const createFixedExpense = async (req, res) => {
  try {
    const {
      name,
      description,
      amount,        // 🔄 Retrocompatibilidad: frontend envía "amount"
      totalAmount,   // 🆕 Nuevo campo
      frequency,
      category,
      paymentMethod,
      paymentAccount,
      startDate,
      endDate,
      isActive,
      autoCreateExpense,
      vendor,
      accountNumber,
      notes,
      createdByStaffId
    } = req.body;

    // 🔄 Usar totalAmount si existe, sino usar amount (retrocompatibilidad)
    const finalTotalAmount = totalAmount || amount;

    // Validaciones básicas
    if (!name || !finalTotalAmount || !frequency || !category || !paymentMethod || !startDate) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: name, amount, frequency, category, paymentMethod, startDate'
      });
    }

    // Calcular próxima fecha de vencimiento según frecuencia
    const nextDueDate = calculateNextDueDate(startDate, frequency);

    const newFixedExpense = await FixedExpense.create({
      name,
      description,
      totalAmount: finalTotalAmount,  // 🔄 Usar el monto correcto
      paidAmount: 0,                   // 🆕 Inicializar en 0
      frequency,
      category,
      paymentMethod,
      paymentAccount,
      startDate,
      endDate,
      nextDueDate,
      isActive: isActive !== undefined ? isActive : true,
      autoCreateExpense: autoCreateExpense || false,
      vendor,
      accountNumber,
      notes,
      createdByStaffId
    });

    // Incluir información del Staff si existe
    const fixedExpenseWithStaff = await FixedExpense.findByPk(newFixedExpense.idFixedExpense, {
      include: [
        {
          model: Staff,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      message: 'Gasto fijo creado exitosamente',
      fixedExpense: addPaymentStatus(fixedExpenseWithStaff.toJSON())
    });

  } catch (error) {
    console.error('❌ Error creando gasto fijo:', error);
    res.status(500).json({
      error: 'Error al crear el gasto fijo',
      details: error.message
    });
  }
};

/**
 * Obtener todos los gastos fijos con filtros
 */
const getAllFixedExpenses = async (req, res) => {
  try {
    const { isActive, category, paymentMethod, search } = req.query;

    const whereClause = {};

    // Filtro por estado activo/inactivo
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    // Filtro por categoría
    if (category && category !== 'all') {
      whereClause.category = category;
    }

    // Filtro por método de pago
    if (paymentMethod && paymentMethod !== 'all') {
      whereClause.paymentMethod = paymentMethod;
    }

    // Búsqueda por nombre o vendor
    if (search && search.trim()) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search.trim()}%` } },
        { vendor: { [Op.iLike]: `%${search.trim()}%` } },
        { description: { [Op.iLike]: `%${search.trim()}%` } }
      ];
    }

    const fixedExpenses = await FixedExpense.findAll({
      where: whereClause,
      include: [
        {
          model: Staff,
          as: 'createdBy',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        // 🆕 Incluir resumen de pagos parciales
        {
          model: FixedExpensePayment,
          as: 'payments',
          attributes: ['idPayment', 'amount', 'paymentDate'],
          separate: true, // Evita duplicados
          order: [['paymentDate', 'DESC']],
          limit: 5 // Solo los últimos 5 pagos en el listado
        }
      ],
      order: [
        ['isActive', 'DESC'], // Activos primero
        ['nextDueDate', 'ASC'] // Los más próximos a vencer primero
      ]
    });

    // Importar Expense para verificar pagos
    const { Expense } = require('../data');

    // Para cada gasto fijo, verificar si ya se pagó en el período actual
    const fixedExpensesWithPaymentStatus = await Promise.all(
      fixedExpenses.map(async (fe) => {
        const feData = fe.toJSON();
        
        // Calcular rango de fechas según frecuencia
        const today = new Date();
        let startDate, endDate;
        
        switch (fe.frequency) {
          case 'weekly':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - today.getDay()); // Inicio de semana
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6); // Fin de semana
            break;
          case 'biweekly':
            // Quincenal: primeros 15 días o últimos del mes
            const dayOfMonth = today.getDate();
            if (dayOfMonth <= 15) {
              startDate = new Date(today.getFullYear(), today.getMonth(), 1);
              endDate = new Date(today.getFullYear(), today.getMonth(), 15);
            } else {
              startDate = new Date(today.getFullYear(), today.getMonth(), 16);
              endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            }
            break;
          case 'monthly':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
          case 'quarterly':
            const quarter = Math.floor(today.getMonth() / 3);
            startDate = new Date(today.getFullYear(), quarter * 3, 1);
            endDate = new Date(today.getFullYear(), quarter * 3 + 3, 0);
            break;
          case 'semiannual':
            // Semestral: enero-junio o julio-diciembre
            const semester = today.getMonth() < 6 ? 0 : 1;
            startDate = new Date(today.getFullYear(), semester * 6, 1);
            endDate = new Date(today.getFullYear(), semester * 6 + 6, 0);
            break;
          case 'annual':
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), 11, 31);
            break;
          case 'one_time':
            // Para one_time, verificar si ya existe algún pago
            startDate = new Date(fe.startDate);
            endDate = new Date();
            break;
          default:
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
        }

        // Buscar si ya existe un expense generado en este período
        const existingExpense = await Expense.findOne({
          where: {
            relatedFixedExpenseId: fe.idFixedExpense,
            date: {
              [Op.between]: [startDate, endDate]
            }
          },
          order: [['date', 'DESC']]
        });

        // 🔄 Calcular paymentStatus basado en paidAmount vs totalAmount
        const paidAmount = parseFloat(feData.paidAmount || 0);
        const totalAmount = parseFloat(feData.totalAmount || 0);
        
        let paymentStatus;
        if (paidAmount >= totalAmount && totalAmount > 0) {
          paymentStatus = 'paid';
        } else if (paidAmount > 0) {
          paymentStatus = 'partial';
        } else {
          paymentStatus = 'unpaid';
        }

        return {
          ...feData,
          lastPaymentDate: existingExpense ? existingExpense.date : null,
          isPaidThisPeriod: !!existingExpense,
          paymentStatus // 🆕 Campo que necesita el frontend
        };
      })
    );

    // Calcular estadísticas
    const stats = {
      total: fixedExpenses.length,
      active: fixedExpenses.filter(fe => fe.isActive).length,
      inactive: fixedExpenses.filter(fe => !fe.isActive).length,
      monthlyTotal: fixedExpenses
        .filter(fe => fe.isActive && fe.frequency === 'monthly')
        .reduce((sum, fe) => sum + parseFloat(fe.amount), 0),
      totalCommitment: calculateTotalCommitment(fixedExpenses.filter(fe => fe.isActive))
    };

    res.status(200).json({
      fixedExpenses: fixedExpensesWithPaymentStatus,
      stats
    });

  } catch (error) {
    console.error('❌ Error obteniendo gastos fijos:', error);
    res.status(500).json({
      error: 'Error al obtener los gastos fijos',
      details: error.message
    });
  }
};

/**
 * Obtener un gasto fijo por ID
 */
const getFixedExpenseById = async (req, res) => {
  try {
    const { id } = req.params;

    const fixedExpense = await FixedExpense.findByPk(id, {
      include: [
        {
          model: Staff,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        },
        // 🆕 Incluir pagos parciales
        {
          model: FixedExpensePayment,
          as: 'payments',
          include: [
            {
              model: Expense,
              as: 'generatedExpense',
              attributes: ['idExpense', 'name', 'cost', 'paymentStatus']
            },
            {
              model: Staff,
              as: 'createdBy',
              attributes: ['id', 'name']
            }
          ],
          order: [['paymentDate', 'DESC']]
        }
      ]
    });

    if (!fixedExpense) {
      return res.status(404).json({ error: 'Gasto fijo no encontrado' });
    }

    // 🆕 Agregar balance calculado y paymentStatus
    const fixedExpenseWithStatus = addPaymentStatus(fixedExpense.toJSON());
    
    const response = {
      ...fixedExpenseWithStatus,
      balance: {
        totalAmount: parseFloat(fixedExpense.totalAmount).toFixed(2),
        paidAmount: parseFloat(fixedExpense.paidAmount || 0).toFixed(2),
        remainingAmount: fixedExpense.remainingAmount,
        paymentCount: fixedExpense.payments?.length || 0,
        percentagePaid: ((parseFloat(fixedExpense.paidAmount || 0) / parseFloat(fixedExpense.totalAmount)) * 100).toFixed(2)
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error obteniendo gasto fijo:', error);
    res.status(500).json({
      error: 'Error al obtener el gasto fijo',
      details: error.message
    });
  }
};

/**
 * Actualizar un gasto fijo
 */
const updateFixedExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // 🔍 DEBUG: Log completo de la petición
    console.log('📝 [updateFixedExpense] ID:', id);
    console.log('📝 [updateFixedExpense] Datos recibidos:', JSON.stringify(updateData, null, 2));

    const fixedExpense = await FixedExpense.findByPk(id);

    if (!fixedExpense) {
      console.log('❌ [updateFixedExpense] Gasto fijo no encontrado');
      return res.status(404).json({ error: 'Gasto fijo no encontrado' });
    }

    // 🔍 DEBUG: Valores antes de actualizar
    console.log('📊 [updateFixedExpense] Valores actuales:', {
      name: fixedExpense.name,
      totalAmount: fixedExpense.totalAmount,
      category: fixedExpense.category,
      paymentMethod: fixedExpense.paymentMethod
    });

    // 🔄 RETROCOMPATIBILIDAD: Si viene "amount", mapearlo a "totalAmount"
    if (updateData.amount !== undefined && updateData.totalAmount === undefined) {
      console.log('🔄 [updateFixedExpense] Mapeando "amount" → "totalAmount":', updateData.amount);
      updateData.totalAmount = updateData.amount;
      delete updateData.amount; // Eliminar el campo incorrecto
    }

    // Si cambia la frecuencia o fecha de inicio, recalcular nextDueDate
    if (updateData.frequency || updateData.startDate) {
      const newFrequency = updateData.frequency || fixedExpense.frequency;
      const newStartDate = updateData.startDate || fixedExpense.startDate;
      updateData.nextDueDate = calculateNextDueDate(newStartDate, newFrequency);
    }

    // 🔍 DEBUG: Intentando actualizar
    console.log('🔄 [updateFixedExpense] Ejecutando update con:', JSON.stringify(updateData, null, 2));
    
    await fixedExpense.update(updateData);

    // 🔍 DEBUG: Valores después de actualizar
    await fixedExpense.reload();
    console.log('✅ [updateFixedExpense] Valores después de update:', {
      name: fixedExpense.name,
      totalAmount: fixedExpense.totalAmount,
      category: fixedExpense.category,
      paymentMethod: fixedExpense.paymentMethod
    });

    // Recargar con relaciones
    const updatedFixedExpense = await FixedExpense.findByPk(id, {
      include: [
        {
          model: Staff,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    console.log('✅ [updateFixedExpense] Actualización completada exitosamente');

    res.status(200).json({
      message: 'Gasto fijo actualizado exitosamente',
      fixedExpense: updatedFixedExpense
    });

  } catch (error) {
    console.error('❌ Error actualizando gasto fijo:', error);
    res.status(500).json({
      error: 'Error al actualizar el gasto fijo',
      details: error.message
    });
  }
};

/**
 * Eliminar un gasto fijo
 */
const deleteFixedExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const fixedExpense = await FixedExpense.findByPk(id);

    if (!fixedExpense) {
      return res.status(404).json({ error: 'Gasto fijo no encontrado' });
    }

    await fixedExpense.destroy();

    res.status(200).json({
      message: 'Gasto fijo eliminado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error eliminando gasto fijo:', error);
    res.status(500).json({
      error: 'Error al eliminar el gasto fijo',
      details: error.message
    });
  }
};

/**
 * Activar/Desactivar un gasto fijo
 */
const toggleFixedExpenseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const fixedExpense = await FixedExpense.findByPk(id);

    if (!fixedExpense) {
      return res.status(404).json({ error: 'Gasto fijo no encontrado' });
    }

    await fixedExpense.update({ isActive });

    res.status(200).json({
      message: `Gasto fijo ${isActive ? 'activado' : 'desactivado'} exitosamente`,
      fixedExpense
    });

  } catch (error) {
    console.error('❌ Error cambiando estado del gasto fijo:', error);
    res.status(500).json({
      error: 'Error al cambiar el estado del gasto fijo',
      details: error.message
    });
  }
};

/**
 * Obtener gastos fijos próximos a vencer
 */
const getUpcomingFixedExpenses = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + parseInt(days));

    const upcomingExpenses = await FixedExpense.findAll({
      where: {
        isActive: true,
        nextDueDate: {
          [Op.between]: [today, futureDate]
        }
      },
      include: [
        {
          model: Staff,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['nextDueDate', 'ASC']]
    });

    res.status(200).json({
      upcomingExpenses,
      count: upcomingExpenses.length,
      daysRange: days
    });

  } catch (error) {
    console.error('❌ Error obteniendo gastos próximos:', error);
    res.status(500).json({
      error: 'Error al obtener gastos próximos',
      details: error.message
    });
  }
};

/**
 * Generar un gasto (Expense) a partir de un gasto fijo
 * NOTA: Esto registra un pago manual directo del gasto fijo
 */
const generateExpenseFromFixed = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentDate, notes } = req.body;

    const fixedExpense = await FixedExpense.findByPk(id);

    if (!fixedExpense) {
      return res.status(404).json({ error: 'Gasto fijo no encontrado' });
    }

    if (!fixedExpense.isActive) {
      return res.status(400).json({ error: 'El gasto fijo está inactivo' });
    }

    // Verificar que el gasto fijo no esté ya pagado
    if (fixedExpense.paymentStatus !== 'unpaid') {
      return res.status(400).json({ 
        error: 'Este gasto fijo ya fue pagado',
        currentStatus: fixedExpense.paymentStatus
      });
    }

    // Importar el modelo Expense
    const { Expense } = require('../data');

    // Usar fecha local para evitar problemas de timezone
    const finalPaymentDate = paymentDate || (() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })();

    // Crear el gasto con paymentStatus: 'paid' (pago directo, no vía invoice)
    const newExpense = await Expense.create({
      typeExpense: 'Gasto Fijo',
      amount: fixedExpense.totalAmount || fixedExpense.amount, // ✅ Retrocompatibilidad
      notes: notes || fixedExpense.description || fixedExpense.name,
      paymentMethod: fixedExpense.paymentMethod,
      paymentDetails: fixedExpense.paymentAccount || null,
      date: finalPaymentDate,
      staffId: fixedExpense.createdByStaffId || req.user?.id || null,
      verified: true, // Marcado como verificado porque se paga manualmente
      workId: null, // Gastos fijos generalmente no están asociados a una obra específica
      paymentStatus: 'paid', // 🔑 PAGADO DIRECTAMENTE (no vía invoice)
      paidDate: finalPaymentDate,
      relatedFixedExpenseId: fixedExpense.idFixedExpense,
      vendor: fixedExpense.vendor
    });

    console.log(`✅ Expense generado desde FixedExpense: ${newExpense.idExpense}`);

    // Actualizar el FixedExpense:
    // 1. Marcar como pagado
    // 2. Actualizar paidAmount = totalAmount (pago completo)
    // 3. Actualizar nextDueDate para el próximo período
    const newNextDueDate = calculateNextDueDate(
      fixedExpense.nextDueDate || fixedExpense.startDate,
      fixedExpense.frequency
    );

    const totalAmount = parseFloat(fixedExpense.totalAmount || fixedExpense.amount || 0);

    await fixedExpense.update({ 
      paymentStatus: 'paid',
      paidAmount: totalAmount, // ✅ Marcar como pagado completamente
      paidDate: finalPaymentDate,
      nextDueDate: newNextDueDate
    });

    console.log(`✅ FixedExpense actualizado: paymentStatus=paid, paidAmount=${totalAmount}, nextDueDate=${newNextDueDate}`);

    // Si es recurrente y autoCreateExpense está activado, crear el próximo FixedExpense
    if (fixedExpense.frequency !== 'one_time' && fixedExpense.autoCreateExpense) {
      // Calcular el primer día del mes del siguiente período
      const nextDueDate = new Date(newNextDueDate);
      const nextPeriodStart = new Date(nextDueDate.getFullYear(), nextDueDate.getMonth(), 1);
      const nextPeriodStartStr = nextPeriodStart.toISOString().split('T')[0];
      
      const nextFixedExpense = await FixedExpense.create({
        name: fixedExpense.name,
        description: fixedExpense.description,
        totalAmount: fixedExpense.totalAmount || fixedExpense.amount, // ✅ Retrocompatibilidad
        paidAmount: 0, // ✅ Nuevo período sin pagos
        frequency: fixedExpense.frequency,
        category: fixedExpense.category,
        paymentMethod: fixedExpense.paymentMethod,
        paymentAccount: fixedExpense.paymentAccount,
        startDate: nextPeriodStartStr, // ✅ Primer día del mes siguiente
        endDate: fixedExpense.endDate,
        nextDueDate: newNextDueDate, // ✅ Fecha de vencimiento (ej: 30 de nov)
        isActive: true,
        autoCreateExpense: fixedExpense.autoCreateExpense,
        vendor: fixedExpense.vendor,
        accountNumber: fixedExpense.accountNumber,
        notes: fixedExpense.notes,
        createdByStaffId: fixedExpense.createdByStaffId,
        paymentStatus: 'unpaid' // El nuevo período empieza sin pagar
      });

      console.log(`🔄 Próximo FixedExpense creado automáticamente: ${nextFixedExpense.idFixedExpense} (startDate: ${nextPeriodStartStr}, nextDueDate: ${newNextDueDate})`);
    }

    res.status(201).json({
      message: 'Gasto generado exitosamente',
      expense: newExpense,
      fixedExpense: await FixedExpense.findByPk(id, {
        include: [
          {
            model: Staff,
            as: 'createdBy',
            attributes: ['id', 'name', 'email'],
            required: false
          }
        ]
      })
    });

  } catch (error) {
    console.error('❌ Error generando gasto:', error);
    res.status(500).json({
      error: 'Error al generar el gasto',
      details: error.message
    });
  }
};

// ========== FUNCIONES AUXILIARES ==========

/**
 * Calcular la próxima fecha de vencimiento según la frecuencia
 */
function calculateNextDueDate(startDate, frequency) {
  const date = new Date(startDate);
  const today = new Date();
  
  // Si la fecha de inicio es futura, esa es la próxima fecha
  if (date > today) {
    return startDate;
  }

  // Calcular próxima fecha según frecuencia
  switch (frequency) {
    case 'weekly':
      while (date <= today) {
        date.setDate(date.getDate() + 7);
      }
      break;
    case 'biweekly':
      while (date <= today) {
        date.setDate(date.getDate() + 14);
      }
      break;
    case 'monthly':
      while (date <= today) {
        date.setMonth(date.getMonth() + 1);
      }
      break;
    case 'quarterly':
      while (date <= today) {
        date.setMonth(date.getMonth() + 3);
      }
      break;
    case 'semiannual':
      while (date <= today) {
        date.setMonth(date.getMonth() + 6);
      }
      break;
    case 'annual':
      while (date <= today) {
        date.setFullYear(date.getFullYear() + 1);
      }
      break;
    case 'one_time':
      return startDate; // No hay próxima fecha para pagos únicos
    default:
      return startDate;
  }

  return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
}

/**
 * Calcular compromiso total mensual aproximado
 */
function calculateTotalCommitment(activeExpenses) {
  return activeExpenses.reduce((total, expense) => {
    const amount = parseFloat(expense.amount);
    
    switch (expense.frequency) {
      case 'weekly':
        return total + (amount * 4.33); // Aproximado mensual
      case 'biweekly':
        return total + (amount * 2);
      case 'monthly':
        return total + amount;
      case 'quarterly':
        return total + (amount / 3);
      case 'semiannual':
        return total + (amount / 6);
      case 'annual':
        return total + (amount / 12);
      case 'one_time':
        return total; // No se cuenta para compromiso mensual
      default:
        return total;
    }
  }, 0);
}

/**
 * 🆕 Obtener gastos fijos no pagados (para vincular con supplier invoices)
 */
const getUnpaidFixedExpenses = async (req, res) => {
  try {
    const { vendor, category } = req.query;

    const where = { 
      paymentStatus: 'unpaid',
      isActive: true // Solo gastos activos
    };

    if (vendor) {
      where.vendor = { [Op.iLike]: `%${vendor}%` };
    }

    if (category) {
      where.category = category;
    }

    const unpaidFixedExpenses = await FixedExpense.findAll({
      where,
      order: [['nextDueDate', 'ASC']]
    });

    res.json(unpaidFixedExpenses);

  } catch (error) {
    console.error('❌ Error al obtener gastos fijos no pagados:', error);
    res.status(500).json({
      error: 'Error al obtener gastos fijos no pagados',
      details: error.message
    });
  }
};

/**
 * 🆕 Obtener gastos fijos por estado de pago
 */
const getFixedExpensesByPaymentStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const { category, vendor } = req.query;

    const where = {};

    // Validar que el status sea válido
    const validStatuses = ['unpaid', 'paid', 'paid_via_invoice'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Estado de pago inválido',
        validStatuses
      });
    }

    if (status) {
      where.paymentStatus = status;
    }

    if (category) {
      where.category = category;
    }

    if (vendor) {
      where.vendor = { [Op.iLike]: `%${vendor}%` };
    }

    const fixedExpenses = await FixedExpense.findAll({
      where,
      order: [['nextDueDate', 'ASC']]
    });

    res.json(fixedExpenses);

  } catch (error) {
    console.error('❌ Error al obtener gastos fijos por estado:', error);
    res.status(500).json({
      error: 'Error al obtener gastos fijos por estado',
      details: error.message
    });
  }
};

module.exports = {
  createFixedExpense,
  getAllFixedExpenses,
  getFixedExpenseById,
  updateFixedExpense,
  deleteFixedExpense,
  toggleFixedExpenseStatus,
  getUpcomingFixedExpenses,
  generateExpenseFromFixed,
  getUnpaidFixedExpenses,
  getFixedExpensesByPaymentStatus
};
