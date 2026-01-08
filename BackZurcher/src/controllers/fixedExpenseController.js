const { FixedExpense, FixedExpensePayment, Staff, Expense } = require('../data');
const { Op } = require('sequelize');

/**
 * � CRITICAL: Normalizar un objeto FixedExpense para asegurar que las fechas sean strings ISO
 * Previene que Sequelize convierta DATEONLY a Date objects que pierdan información
 */
function normalizeFixedExpenseResponse(expense) {
  if (!expense) return expense;
  
  // 🔴 CRITICAL: Convertir string YYYY-MM-DD a Date UTC sin pérdida de timezone
  function stringToUTCDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  
  const obj = expense instanceof Object ? (expense.toJSON ? expense.toJSON() : expense) : {};
  
  // Convertir campos DATEONLY a strings ISO explícitamente
  if (obj.startDate) {
    obj.startDate = obj.startDate instanceof Date 
      ? obj.startDate.toISOString().split('T')[0]
      : String(obj.startDate).split('T')[0];
  }
  if (obj.endDate) {
    obj.endDate = obj.endDate instanceof Date 
      ? obj.endDate.toISOString().split('T')[0]
      : String(obj.endDate).split('T')[0];
  }
  if (obj.nextDueDate) {
    obj.nextDueDate = obj.nextDueDate instanceof Date 
      ? obj.nextDueDate.toISOString().split('T')[0]
      : String(obj.nextDueDate).split('T')[0];
  }
  
  return obj;
}

/**
 * �🔧 CRITICAL: Helper para normalizar fechas sin perder un día por timezone
 * 
 * Problema: 
 * - Frontend envía: "2025-11-01" (string)
 * - JavaScript lo interpreta como UTC: 2025-11-01T00:00:00Z
 * - Al convertir a timezone local: 2025-10-31T23:00:00 (¡pierde un día!)
 * 
 * Solución:
 * - Procesar fechas como strings ISO (YYYY-MM-DD) cuando sea posible
 * - Usar Date objects SOLO con UTC times
 * - Nunca restar/sumar directamente con new Date()
 */
function normalizeDateString(dateString) {
  // Si es null, undefined o string vacío, lanzar error
  if (!dateString || dateString === '' || dateString === null) {
    throw new Error(`Fecha requerida: recibió "${dateString}"`);
  }

  // Si ya es string ISO, validar que sea YYYY-MM-DD
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Validar que sea una fecha válida
    const testDate = new Date(dateString + 'T00:00:00Z');
    if (isNaN(testDate.getTime())) {
      throw new Error(`Fecha inválida: ${dateString}`);
    }
    return dateString; // Retornar como-está, sin convertir
  }
  
  // Si es Date object, convertir a ISO string
  if (dateString instanceof Date) {
    if (isNaN(dateString.getTime())) {
      throw new Error(`Date object inválido`);
    }
    return dateString.toISOString().split('T')[0];
  }
  
  // Si es string pero no YYYY-MM-DD, intentar parsearlo
  if (typeof dateString === 'string') {
    // Dividir por guiones y validar que sean números
    const parts = dateString.split('-');
    if (parts.length === 3 && parts.every(p => /^\d+$/.test(p))) {
      // Parsear manualmente sin crear Date para evitar timezone issues
      const [year, month, day] = parts.map(Number);
      if (year > 1900 && year < 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return dateString;
      }
    }
  }
  
  throw new Error(`Fecha inválida o formato no soportado: ${dateString}`);
}

/**
 * 🔧 Helper para comparar fechas sin problemas de timezone
 * Retorna: -1 si date1 < date2, 0 si son iguales, 1 si date1 > date2
 */
function compareDateStrings(dateString1, dateString2) {
  const d1 = normalizeDateString(dateString1);
  const d2 = normalizeDateString(dateString2);
  
  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}

/**
 * 🔧 Helper para calcular el último día de un mes
 * Sin problemas de timezone
 */
function getLastDayOfMonth(year, month) {
  // Validar inputs
  if (isNaN(year) || isNaN(month)) {
    throw new Error(`getLastDayOfMonth: parámetros inválidos (year=${year}, month=${month})`);
  }
  
  // month es 0-indexed (0 = enero, 11 = diciembre)
  const firstDayNextMonth = new Date(Date.UTC(year, month + 1, 1));
  
  // Validar que la fecha sea válida
  if (isNaN(firstDayNextMonth.getTime())) {
    throw new Error(`getLastDayOfMonth: fecha UTC inválida (year=${year}, month=${month})`);
  }
  
  const lastDay = new Date(Date.UTC(firstDayNextMonth.getUTCFullYear(), firstDayNextMonth.getUTCMonth(), firstDayNextMonth.getUTCDate() - 1));
  
  const result = lastDay.toISOString().split('T')[0];
  
  if (!result || !result.match(/^\d{4}-\d{2}-\d{2}$/)) {
    throw new Error(`getLastDayOfMonth: resultado inválido (${result}) para year=${year}, month=${month}`);
  }
  
  return result;
}

/**
 * 🆕 Helper: Calcular el vencimiento del PRIMER PERÍODO desde una fecha de inicio
 * 
 * Si inicia el 30/11/2025 con frequency=monthly:
 * - Período 1: 30/11 - 30/12 (vencimiento: 30/12/2025)
 * 
 * Si inicia el 31/01/2026 con frequency=monthly:
 * - Período 1: 31/01 - 28/02 (vencimiento: 28/02/2026, no existe 31 febrero)
 */
function calculateFirstPeriodDueDate(startDateString, frequency) {
  const normalizedStart = normalizeDateString(startDateString);
  const [year, month, day] = normalizedStart.split('-').map(Number);

  const monthIndex = month - 1;

  switch (frequency) {
    case 'weekly':
      // Una semana después
      const weekDate = new Date(Date.UTC(year, monthIndex, day + 7));
      return weekDate.toISOString().split('T')[0];
      
    case 'biweekly':
      // Dos semanas después
      const biweeklyDate = new Date(Date.UTC(year, monthIndex, day + 14));
      return biweeklyDate.toISOString().split('T')[0];
      
    case 'monthly':
      // Mismo día del siguiente mes, o último día si no existe
      let nextMonth = month + 1;
      let nextYear = year;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }
      const nextMonthIndex = nextMonth - 1;
      const lastDayNextMonth = parseInt(getLastDayOfMonth(nextYear, nextMonthIndex).split('-')[2]);
      const dueDay = Math.min(day, lastDayNextMonth);
      return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
      
    case 'quarterly':
      // 3 meses después
      let quarterMonth = month + 3;
      let quarterYear = year;
      while (quarterMonth > 12) {
        quarterMonth -= 12;
        quarterYear += 1;
      }
      const quarterMonthIndex = quarterMonth - 1;
      const lastDayQuarter = parseInt(getLastDayOfMonth(quarterYear, quarterMonthIndex).split('-')[2]);
      const quarterDay = Math.min(day, lastDayQuarter);
      return `${quarterYear}-${String(quarterMonth).padStart(2, '0')}-${String(quarterDay).padStart(2, '0')}`;
      
    case 'semiannual':
      // 6 meses después
      let semiMonth = month + 6;
      let semiYear = year;
      while (semiMonth > 12) {
        semiMonth -= 12;
        semiYear += 1;
      }
      const semiMonthIndex = semiMonth - 1;
      const lastDaySemi = parseInt(getLastDayOfMonth(semiYear, semiMonthIndex).split('-')[2]);
      const semiDay = Math.min(day, lastDaySemi);
      return `${semiYear}-${String(semiMonth).padStart(2, '0')}-${String(semiDay).padStart(2, '0')}`;
      
    case 'annual':
      // 1 año después
      const annualDate = `${year + 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return annualDate;
      
    case 'one_time':
      return normalizedStart; // Sin próximo vencimiento
      
    default:
      return normalizedStart;
  }
}

/**
 * 🔧 Helper: Calcular paymentStatus ACTUAL basado en período y historial
 * 
 * La lógica es:
 * - Si el período ACTUAL está pagado completamente → 'paid'
 * - Si el período ACTUAL tiene pago parcial → 'partial'
 * - Si el período ACTUAL NO está pagado → 'unpaid'
 * 
 * El período ACTUAL es siempre el que termina en nextDueDate
 */
const calculateCurrentPaymentStatus = (fixedExpenseData) => {
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
    paymentStatus,
    // 🆕 Información para el frontend
    periodInfo: {
      nextDueDate: fixedExpenseData.nextDueDate,
      currentPeriodPaid: paidAmount >= totalAmount,
      remainingAmount: (totalAmount - paidAmount).toFixed(2)
    }
  };
};

/**
 * 🔧 DEPRECATED: Usar calculateCurrentPaymentStatus en su lugar
 */
const addPaymentStatus = (fixedExpenseData) => {
  return calculateCurrentPaymentStatus(fixedExpenseData);
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
      createdByStaffId,
      staffId         // 🆕 NUEVO: Para asignar un Staff en categoría Salarios
    } = req.body;

    // 🔄 Usar totalAmount si existe, sino usar amount (retrocompatibilidad)
    const finalTotalAmount = totalAmount || amount;

    // 📝 Validaciones básicas - SOLO campos requeridos al crear
    // paymentMethod se elige al momento de pagar, no al crear
    if (!name || !finalTotalAmount || !frequency || !category || !startDate) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: name, totalAmount, frequency, category, startDate'
      });
    }

    // 🔴 CRÍTICO: Normalizar fechas para evitar perder un día por timezone
    let normalizedStartDate;
    let normalizedEndDate = null;
    
    try {
      normalizedStartDate = normalizeDateString(startDate);
      if (endDate) {
        normalizedEndDate = normalizeDateString(endDate);
      }
    } catch (error) {
      console.error('❌ Error normalizando fechas:', error.message);
      return res.status(400).json({
        error: 'Fecha inválida. Use formato YYYY-MM-DD',
        details: error.message
      });
    }

    // ✅ Calcular fecha de vencimiento del PRIMER PERÍODO (no el siguiente)
    let nextDueDate;
    try {
      nextDueDate = calculateFirstPeriodDueDate(normalizedStartDate, frequency);
    } catch (error) {
      console.error('❌ Error calculando nextDueDate:', error.message);
      return res.status(400).json({
        error: 'Error calculando fecha de vencimiento',
        details: error.message
      });
    }

    const newFixedExpense = await FixedExpense.create({
      name,
      description,
      totalAmount: finalTotalAmount,
      paidAmount: 0,
      frequency,
      category,
      paymentMethod: paymentMethod || null,
      paymentAccount: paymentAccount || null,
      // 🔴 CRITICAL: Pasar como STRING directamente, Sequelize maneja DATEONLY strings
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      nextDueDate,
      isActive: isActive !== undefined ? isActive : true,
      autoCreateExpense: autoCreateExpense || false,
      vendor,
      accountNumber,
      notes,
      createdByStaffId: createdByStaffId || null,
      // 🆕 Guardar Staff solo para Salarios - convertir cadena vacía a null
      staffId: category === 'Salarios' && staffId ? staffId : null
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
      fixedExpense: addPaymentStatus(normalizeFixedExpenseResponse(fixedExpenseWithStaff))
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

    // Solo traer gastos activos (sin restricción de fecha de vencimiento)
    // A menos que se pida explícitamente incluir inactivos
    const today = new Date();
    
    // Si no se especifica isActive en query, por defecto mostrar solo activos
    const finalWhereClause = {
      ...whereClause,
      ...(isActive === undefined && { isActive: true })
    };

    const fixedExpenses = await FixedExpense.findAll({
      where: finalWhereClause,
      include: [
        {
          model: Staff,
          as: 'createdBy',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: FixedExpensePayment,
          as: 'payments',
          attributes: ['idPayment', 'amount', 'paymentDate'],
          separate: true,
          order: [['paymentDate', 'DESC']],
          limit: 5
        }
      ],
      order: [
        ['isActive', 'DESC'],
        ['nextDueDate', 'ASC']
      ]
    });

    // Importar Expense para verificar pagos
    const { Expense } = require('../data');

    // Para cada gasto fijo, verificar si ya se pagó en el período actual
    const fixedExpensesWithPaymentStatus = await Promise.all(
      fixedExpenses.map(async (fe) => {
        const feData = normalizeFixedExpenseResponse(fe);
        
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

        // Buscar si ya existe un expense generado en este período (solo si el nextDueDate está vencido)
        let existingExpense = null;
        if (fe.nextDueDate && new Date(fe.nextDueDate) <= today) {
          existingExpense = await Expense.findOne({
            where: {
              relatedFixedExpenseId: fe.idFixedExpense,
              date: {
                [Op.between]: [startDate, endDate]
              }
            },
            order: [['date', 'DESC']]
          });
        }

        // 🔄 Calcular paymentStatus basado en paidAmount vs totalAmount
        const paidAmount = parseFloat(feData.paidAmount || 0);
        const totalAmount = parseFloat(feData.totalAmount || 0);
        
        // Solo marcar como 'unpaid' si NO hay pago para el período vencido
        let paymentStatus;
        if (existingExpense) {
          paymentStatus = 'paid';
        } else {
          paymentStatus = 'unpaid';
        }
        // Si hay pagos parciales, marcar como 'partial'
        if (!existingExpense && paidAmount > 0 && paidAmount < totalAmount) {
          paymentStatus = 'partial';
        }

        return {
          ...feData,
          lastPaymentDate: existingExpense ? existingExpense.date : null,
          isPaidThisPeriod: !!existingExpense,
          paymentStatus
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
              attributes: ['idExpense', 'date', 'amount', 'typeExpense', 'notes']
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
    const fixedExpenseWithStatus = addPaymentStatus(normalizeFixedExpenseResponse(fixedExpense));
    
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

    console.log('📝 [updateFixedExpense] ID:', id);
    console.log('📝 [updateFixedExpense] Datos recibidos:', JSON.stringify(updateData, null, 2));

    const fixedExpense = await FixedExpense.findByPk(id);

    if (!fixedExpense) {
      console.log('❌ [updateFixedExpense] Gasto fijo no encontrado');
      return res.status(404).json({ error: 'Gasto fijo no encontrado' });
    }

    // 🔄 RETROCOMPATIBILIDAD: Si viene "amount", mapearlo a "totalAmount"
    if (updateData.amount !== undefined && updateData.totalAmount === undefined) {
      console.log('🔄 [updateFixedExpense] Mapeando "amount" → "totalAmount":', updateData.amount);
      updateData.totalAmount = updateData.amount;
      delete updateData.amount;
    }

    // 🔴 CRÍTICO: Normalizar fechas para evitar perder un día por timezone
    // También sanitizar campos vacíos a null
    if (updateData.startDate) {
      updateData.startDate = normalizeDateString(updateData.startDate);
    } else if (updateData.startDate === '') {
      delete updateData.startDate;
    }
    
    if (updateData.endDate) {
      updateData.endDate = normalizeDateString(updateData.endDate);
    } else if (updateData.endDate === '') {
      updateData.endDate = null;
    }

    // 🔴 CRÍTICO: Convertir strings vacíos a NULL para campos ENUM y UUID
    // PostgreSQL no permite strings vacíos en ENUMs ni en UUIDs
    if (updateData.paymentMethod === '') {
      updateData.paymentMethod = null;
    }
    
    if (updateData.paymentAccount === '') {
      updateData.paymentAccount = null;
    }
    
    if (updateData.staffId === '') {
      updateData.staffId = null;
    }
    
    if (updateData.category === '') {
      delete updateData.category; // No permitir cambiar a vacío
    }

    // Si cambia la frecuencia o fecha de inicio, recalcular nextDueDate
    if (updateData.frequency || updateData.startDate) {
      const newFrequency = updateData.frequency || fixedExpense.frequency;
      let newStartDate = updateData.startDate || fixedExpense.startDate;
      
      // Solo recalcular si ambos valores son válidos
      // Normalizar newStartDate en caso de que sea Date object de Sequelize
      if (newStartDate && newFrequency) {
        try {
          newStartDate = normalizeDateString(newStartDate);
          updateData.nextDueDate = calculateNextDueDate(newStartDate, newFrequency);
        } catch (error) {
          console.error('⚠️ Error recalculando nextDueDate:', error.message);
          // No recalcular si hay error, mantener el valor anterior
        }
      }
    }

    // Manejo especial para staffId en categoría Salarios
    if (updateData.category === 'Salarios') {
      // staffId puede estar presente o no (empleados sin staff asignado)
      if (updateData.staffId === undefined) {
        updateData.staffId = fixedExpense.staffId; // Mantener el anterior si no se proporciona
      }
      // Si está vacío o null, dejarlo como null (permitir salarios sin staff)
    } else {
      // Para otras categorías, limpiar staffId
      if (updateData.category) {
        updateData.staffId = null;
      }
    }

    console.log('🔄 [updateFixedExpense] Ejecutando update con:', JSON.stringify(updateData, null, 2));
    
    await fixedExpense.update(updateData);
    await fixedExpense.reload();

    // 🔄 Si cambió el monto, actualizar Expenses impagos relacionados
    if (updateData.totalAmount && updateData.totalAmount !== fixedExpense.totalAmount) {
      console.log('💰 [updateFixedExpense] Monto cambió. Actualizando Expenses impagos...');
      const unpaidExpenses = await Expense.findAll({
        where: {
          relatedFixedExpenseId: id,
          paymentStatus: 'unpaid' // Solo los impagos
        }
      });
      
      for (const expense of unpaidExpenses) {
        await expense.update({ amount: updateData.totalAmount });
      }
      console.log(`✅ [updateFixedExpense] ${unpaidExpenses.length} Expense(s) impago(s) actualizado(s)`);
    }

    console.log('✅ [updateFixedExpense] Valores después de update: actualizado correctamente');

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
      message: '✅ Gasto fijo actualizado exitosamente',
      fixedExpense: addPaymentStatus(normalizeFixedExpenseResponse(updatedFixedExpense))
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

    // ⚠️ Verificar si hay Expenses relacionados
    const relatedExpenses = await Expense.count({
      where: { relatedFixedExpenseId: id }
    });

    if (relatedExpenses > 0) {
      return res.status(409).json({
        error: 'No se puede eliminar',
        message: `Este gasto fijo tiene ${relatedExpenses} gasto(s) relacionado(s). Elimine primero los gastos asociados.`,
        relatedCount: relatedExpenses
      });
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
/**
 * 🔧 CORREGIDO: Calcular próximo vencimiento basado en período mensual completo
 * 🔴 IMPORTANTE: Usar normalizeDateString() para evitar problemas de timezone
 * 
 * LÓGICA CORRECTA:
 * - Si startDate = 31/10/2025
 * - Primer vencimiento = último día del siguiente mes = 30/11/2025
 * - Períodos = completos (1 al último día del mes)
 * 
 * - Si nextDueDate = 30/11/2025
 * - Siguiente vencimiento = último día del siguiente mes = 31/12/2025
 */
function calculateNextDueDate(baseDate, frequency) {
  // 🔴 CRÍTICO: Normalizar la fecha de entrada (puede ser string o Date)
  let baseDateString;
  try {
    baseDateString = normalizeDateString(baseDate);
  } catch (error) {
    console.error('❌ Error normalizando baseDate en calculateNextDueDate:', baseDate, error.message);
    throw error;
  }
  
  // Parsear como componentes (year, month, day) SIN problemas de timezone
  const parts = baseDateString.split('-');
  if (parts.length !== 3) {
    throw new Error(`Fecha debe estar en formato YYYY-MM-DD, recibió: ${baseDateString}`);
  }
  
  const [year, month, day] = parts.map(Number);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error(`Fecha contiene valores no-numéricos: ${baseDateString}`);
  }
  
  // month es 1-indexed en el string (01-12), convertir a 0-indexed para Date
  const monthIndex = month - 1;
  
  // 🔧 CRÍTICO: Chequear si el día de INICIO es el último día de su mes
  // Si es así, siempre usar el último día del mes para los períodos siguientes
  const lastDayOfCurrentMonth = getLastDayOfMonth(year, monthIndex);
  const lastDayCurrentNum = parseInt(lastDayOfCurrentMonth.split('-')[2]);
  const isLastDayOfMonth = (day === lastDayCurrentNum);

  switch (frequency) {
    case 'weekly':
      // Avanzar 7 días
      const nextWeekDate = new Date(Date.UTC(year, monthIndex, day + 7));
      return nextWeekDate.toISOString().split('T')[0];
      
    case 'biweekly':
      // Avanzar 14 días
      const nextBiweeklyDate = new Date(Date.UTC(year, monthIndex, day + 14));
      return nextBiweeklyDate.toISOString().split('T')[0];
      
    case 'monthly':
      // 🔧 CRÍTICO: Obtener el ÚLTIMO DÍA del siguiente mes (sin problemas de timezone)
      // El siguiente mes es monthIndex + 1 (ejemplo: oct=9, next=10=nov)
      const nextMonth = monthIndex + 1;
      const nextYear = nextMonth > 11 ? year + 1 : year;
      const adjustedMonth = nextMonth > 11 ? 0 : nextMonth;
      
      // Obtener último día del próximo mes
      const lastDayOfNextMonthStr = getLastDayOfMonth(nextYear, adjustedMonth);
      // Extract day from "YYYY-MM-DD" format
      const lastDayNum = parseInt(lastDayOfNextMonthStr.split('-')[2]);
      // 🆕 Si el día de inicio es el último día de su mes, usar último día del siguiente
      // Si no, usar el día específico o el último disponible si no existe
      const dayToSetMonthly = isLastDayOfMonth ? lastDayNum : Math.min(day, lastDayNum);
      return `${nextYear}-${String(adjustedMonth + 1).padStart(2, '0')}-${String(dayToSetMonthly).padStart(2, '0')}`;
      
    case 'quarterly':
      // Trimestral: avanzar 3 meses
      const nextQuarterMonth = monthIndex + 3;
      const quarterYear = Math.floor(nextQuarterMonth / 12) + year;
      const adjustedQuarterMonth = nextQuarterMonth % 12;
      const lastDayQuarter = getLastDayOfMonth(quarterYear, adjustedQuarterMonth);
      const lastDayQuarterNum = parseInt(lastDayQuarter.split('-')[2]);
      // 🆕 Si el día de inicio es el último día de su mes, usar último día del siguiente
      const dayToSetQuarter = isLastDayOfMonth ? lastDayQuarterNum : Math.min(day, lastDayQuarterNum);
      return `${quarterYear}-${String(adjustedQuarterMonth + 1).padStart(2, '0')}-${String(dayToSetQuarter).padStart(2, '0')}`;
      
    case 'semiannual':
      // Semestral: avanzar 6 meses
      const nextSemiMonth = monthIndex + 6;
      const semiYear = Math.floor(nextSemiMonth / 12) + year;
      const adjustedSemiMonth = nextSemiMonth % 12;
      const lastDaySemi = getLastDayOfMonth(semiYear, adjustedSemiMonth);
      const lastDaySemiNum = parseInt(lastDaySemi.split('-')[2]);
      // 🆕 Si el día de inicio es el último día de su mes, usar último día del siguiente
      const dayToSetSemi = isLastDayOfMonth ? lastDaySemiNum : Math.min(day, lastDaySemiNum);
      return `${semiYear}-${String(adjustedSemiMonth + 1).padStart(2, '0')}-${String(dayToSetSemi).padStart(2, '0')}`;
      
    case 'annual':
      // Anual: avanzar 1 año
      const nextAnnualYear = year + 1;
      const lastDayAnnual = getLastDayOfMonth(nextAnnualYear, monthIndex);
      const lastDayAnnualNum = parseInt(lastDayAnnual.split('-')[2]);
      // 🆕 Si el día de inicio es el último día de su mes, usar último día del siguiente
      const dayToSetAnnual = isLastDayOfMonth ? lastDayAnnualNum : Math.min(day, lastDayAnnualNum);
      return `${nextAnnualYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayToSetAnnual).padStart(2, '0')}`;
      
    case 'one_time':
      return baseDateString; // No tiene próximo vencimiento
      
    default:
      return baseDateString;
  }
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

/**
 * 📊 Obtener resumen mensual de gastos fijos para dashboard
 */
const getMonthlySummary = async (req, res) => {
  try {
    console.log('📊 Generando resumen mensual de gastos fijos...');

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Obtener gastos fijos activos
    const activeFixedExpenses = await FixedExpense.findAll({
      where: {
        isActive: true
      },
      include: [
        {
          model: Staff,
          as: 'createdBy',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: FixedExpensePayment,
          as: 'payments',
          attributes: ['idPayment', 'amount', 'paymentDate', 'notes'],
          required: false
        }
      ],
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    // Calcular totales y estadísticas
    let totalCommitmentMensual = 0;
    let totalPagado = 0;
    let totalPendiente = 0;
    const categorySummary = {};
    const paymentStatusCounts = {
      paid: 0,
      partial: 0,
      unpaid: 0
    };

    // Procesar cada gasto fijo
    const processedExpenses = activeFixedExpenses.map(expense => {
      const totalAmount = parseFloat(expense.totalAmount || 0);
      const paidAmount = parseFloat(expense.paidAmount || 0);
      const remainingAmount = totalAmount - paidAmount;
      
      // Solo contar gastos mensuales para el commitment mensual
      if (expense.frequency === 'monthly') {
        totalCommitmentMensual += totalAmount;
      }
      
      totalPagado += paidAmount;
      totalPendiente += remainingAmount;
      
      // Estadísticas por categoría
      if (!categorySummary[expense.category]) {
        categorySummary[expense.category] = {
          count: 0,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0
        };
      }
      
      categorySummary[expense.category].count++;
      categorySummary[expense.category].totalAmount += totalAmount;
      categorySummary[expense.category].paidAmount += paidAmount;
      categorySummary[expense.category].pendingAmount += remainingAmount;
      
      // Estado de pago
      let paymentStatus;
      if (paidAmount >= totalAmount && totalAmount > 0) {
        paymentStatus = 'paid';
        paymentStatusCounts.paid++;
      } else if (paidAmount > 0) {
        paymentStatus = 'partial';
        paymentStatusCounts.partial++;
      } else {
        paymentStatus = 'unpaid';
        paymentStatusCounts.unpaid++;
      }

      return {
        ...normalizeFixedExpenseResponse(expense),
        paymentStatus,
        remainingAmount
      };
    });

    // Próximos vencimientos (7 días)
    const upcomingExpenses = processedExpenses
      .filter(exp => {
        if (!exp.nextDueDate) return false;
        const dueDate = new Date(exp.nextDueDate);
        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        return daysUntilDue >= 0 && daysUntilDue <= 7;
      })
      .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate))
      .map(exp => ({
        ...exp,
        daysUntilDue: Math.ceil((new Date(exp.nextDueDate) - now) / (1000 * 60 * 60 * 24))
      }));

    // Generar alertas
    const alerts = [];
    
    if (paymentStatusCounts.unpaid > 0) {
      alerts.push({
        type: 'error',
        message: `${paymentStatusCounts.unpaid} gastos fijos sin pagar`,
        action: 'ACCIÓN REQUERIDA'
      });
    }

    if (upcomingExpenses.length > 0) {
      const unpaidUpcoming = upcomingExpenses.filter(exp => exp.paymentStatus !== 'paid');
      if (unpaidUpcoming.length > 0) {
        alerts.push({
          type: 'warning',
          message: `${unpaidUpcoming.length} gastos vencen en los próximos 7 días`,
          action: 'VENCIMIENTOS'
        });
      }
    }

    const highCommitmentCategories = Object.keys(categorySummary)
      .filter(cat => categorySummary[cat].totalAmount > totalCommitmentMensual * 0.3);
    
    if (highCommitmentCategories.length > 0) {
      alerts.push({
        type: 'info',
        message: `Categoría "${highCommitmentCategories[0]}" representa >30% del commitment`,
        action: 'ALTO IMPACTO'
      });
    }

    // Respuesta estructurada
    const summary = {
      period: {
        month: now.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase(),
        year: currentYear,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString()
      },
      totals: {
        activeFixedExpenses: activeFixedExpenses.length,
        commitmentMensual: totalCommitmentMensual,
        totalPagado,
        totalPendiente,
        percentagePaid: totalPagado + totalPendiente > 0 ? 
          ((totalPagado / (totalPagado + totalPendiente)) * 100).toFixed(1) : 0
      },
      paymentStatus: paymentStatusCounts,
      categorySummary: Object.keys(categorySummary)
        .sort((a, b) => categorySummary[b].totalAmount - categorySummary[a].totalAmount)
        .map(category => ({
          category,
          ...categorySummary[category],
          percentage: categorySummary[category].totalAmount > 0 ? 
            ((categorySummary[category].paidAmount / categorySummary[category].totalAmount) * 100).toFixed(0) : 0
        })),
      upcomingExpenses,
      alerts,
      hasAlerts: alerts.length > 0
    };

    res.status(200).json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('❌ Error generando resumen mensual:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar resumen mensual',
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
  getFixedExpensesByPaymentStatus,
  getMonthlySummary,
  calculateNextDueDate // 🆕 Exportar función para uso en payment controller
};

