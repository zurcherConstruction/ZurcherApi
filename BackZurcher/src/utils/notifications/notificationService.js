const { Staff } = require('../../data');
const { Op } = require('sequelize'); // Asegúrate de importar Op para usar operadores de Sequelize

// 📧 MAPEO PROFESIONAL DE ROLES A CORREOS CORPORATIVOS
const CORPORATE_EMAIL_MAP = {
  'owner': 'damian@zurcherseptic.com',
  'admin': 'admin@zurcherseptic.com',
  'worker': 'installers.zurcherseptic@gmail.com', // Gmail para installers (no corporativo)
  'recept': 'purchasing@zurcherseptic.com',
  'finance': 'finance@zurcherseptic.com', // Nuevo rol para finanzas
  'maintenance': 'maintenance@zurcherseptic.com'
};

// 🔧 Función helper para obtener correos corporativos por roles
const getCorporateEmailsByRoles = (roles) => {
  return roles.map(role => ({
    role: role,
    email: CORPORATE_EMAIL_MAP[role] || `${role}@zurcherseptic.com`,
    name: role.charAt(0).toUpperCase() + role.slice(1) // Capitalizar nombre del rol
  })).filter(staff => staff.email); // Filtrar solo los que tienen email válido
};

// Mapeo de estados a roles y mensajes
const stateNotificationMap = {
  initial_inspection_approved: {
    roles: ['admin', 'owner'],
    message: (work, context) => `El trabajo con dirección ${work.propertyAddress} ha sido aprobado en la inspección inicial (registro rápido). Inspección ID: ${context?.inspectionId || 'N/A'}.`,
  },
  initial_inspection_rejected: {
    roles: ['admin', 'owner', 'worker'],
    message: (work, context) => {
      let msg = `El trabajo con dirección ${work.propertyAddress} ha sido rechazado en la inspección inicial (registro rápido).`;
      if (context?.inspectionId) msg += `\nInspección ID: ${context.inspectionId}`;
      if (context?.notes) msg += `\nNotas: ${context.notes}`;
      if (work.resultDocumentUrl) msg += `\nImagen/PDF: ${work.resultDocumentUrl}`;
      return msg;
    },
  },
  final_inspection_approved_maintenance: {
    roles: ['admin', 'owner'],
    message: (work, context) => `El trabajo con dirección ${work.propertyAddress} ha sido aprobado en la inspección final (registro rápido) y pasa a mantenimiento. Inspección ID: ${context?.inspectionId || 'N/A'}.`,
  },
  final_inspection_rejected: {
    roles: ['admin', 'owner'],
    message: (work, context) => `El trabajo con dirección ${work.propertyAddress} ha sido rechazado en la inspección final (registro rápido). Inspección ID: ${context?.inspectionId || 'N/A'}. Notas: ${context?.notes || 'Sin notas.'}`,
  },
  pending: {
    roles: ['owner', 'recept'], // Finance debe saber sobre compras pendientes 
        message: (work) => {
          let startDateFormatted = 'fecha no definida';
          if (work?.startDate && /^\d{4}-\d{2}-\d{2}$/.test(work.startDate)) {
            const [year, month, day] = work.startDate.split('-');
            startDateFormatted = `${day}/${month}/${year}`;
          } else if (work?.startDate) {
            startDateFormatted = work.startDate;
          }
          return `El trabajo con dirección ${work.propertyAddress} ya fue confirmado. Por favor, compra los materiales necesarios para la fecha ${startDateFormatted}.<br><a href="https://www.zurcherseptic.com/materiales" style="background:#1976d2;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;display:inline-block;margin-top:8px;">Ir a la compra de materiales</a>`;
        },
  },
 assigned: {
  roles: ['owner', 'recept'], // Roles que reciben email
  subject: (work) => `Trabajo Asignado: ${work?.propertyAddress || 'Dirección desconocida'}`,
    message: (work) => {
    let assignedDisplay = 'desconocido';
    if (work?.Staff?.name) {
      assignedDisplay = work.Staff.name;
    } else if (work?.Staff?.email) {
      assignedDisplay = work.Staff.email;
    } else if (work?.staffId) {
      assignedDisplay = `ID ${work.staffId}`;
    }
    let startDateFormatted = 'fecha no definida';
    if (work?.startDate && /^\d{4}-\d{2}-\d{2}$/.test(work.startDate)) {
      const [year, month, day] = work.startDate.split('-');
      startDateFormatted = `${day}/${month}/${year}`;
    } else if (work?.startDate) {
      startDateFormatted = work.startDate;
    }
    return `Se ha asignado el trabajo en ${work?.propertyAddress || 'Dirección desconocida'} a ${assignedDisplay}.<br>` +
      `La fecha de inicio programada es: ${startDateFormatted}.<br>` +
      `Por favor, coordinar la compra de materiales necesarios para esta fecha.<br>` +
      `<a href="https://www.zurcherseptic.com/materiales" style="background:#1976d2;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;display:inline-block;margin-top:8px;">Ir a la compra de materiales</a>`;
  },
  getStaff: async (work) => {
    if (!work?.staffId) {
      // Si no hay asignado, notificar solo a admin/owner/recept
      return await Staff.findAll({ where: { role: ['owner', 'admin', 'recept'] } });
    }
    // Buscar al trabajador asignado Y a los roles de gestión
    const staff = await Staff.findAll({
      where: {
        [Op.or]: [
          { id: work.staffId }, // El trabajador asignado
          { role: ['owner', 'admin', 'recept'] } // Los roles de gestión
        ]
      }
    });
    return staff;
  }
},
  inProgress: {
    roles: ['worker', 'owner'], 
        message: (work) => {
          let startDateFormatted = 'fecha no definida';
          if (work?.startDate && /^\d{4}-\d{2}-\d{2}$/.test(work.startDate)) {
            const [year, month, day] = work.startDate.split('-');
            startDateFormatted = `${day}/${month}/${year}`;
          } else if (work?.startDate) {
            startDateFormatted = work.startDate;
          }
          return `Los materiales ya fueron comprados para la dirección ${work.propertyAddress}, La fecha de Instalación es el día: ${startDateFormatted}.`;
        },
  },
  installed: {
    roles: ['admin', 'owner'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} ha sido instalado. Por favor, solicita la primera inspección.`,
  },
  firstInspectionPending: {
    roles: [ 'admin', 'owner'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} está pendiente de la primera inspección. Esperando respuesta del inspector.`,
  },
  approvedInspection: {
    roles: [ 'admin','owner'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} ha pasado la inspección inicial. Por favor, procede con las tareas asignadas.`,
  },
  rejectedInspection: {
    roles: ['admin','owner'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} ha sido rechazado en la inspección inicial. Por favor, revisa los detalles y toma las medidas necesarias.`,
  },
   reinspection_initial_requested: { // Added new status
    roles: ['admin', 'owner'], // Define appropriate roles
    message: (work, context) => `Se ha solicitado una reinspección inicial para la obra en ${work.propertyAddress}. Inspección ID: ${context?.inspectionId || 'N/A'}.`,
  },
  completed: {
    roles: ['owner', 'admin'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} ha sido completado. Por favor, revisa el estado final.`,
  },
  coverPending: {
    roles: ['owner', 'worker', 'admin'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} esta listo para ser tapado.`,
  },
  covered: {
    roles: ['owner', 'admin'], // Finance debe saber cuando está listo para facturar
    message: (work) => `El trabajo con dirección ${work.propertyAddress} ha sido Tapado. Por favor, revisa los detalles y envía el Invoice Final.`,
  },
  invoiceFinal: {
    roles: ['owner', 'admin'], // Finance debe saber cuando se envía factura final
    message: (work) => `La factura final del trabajo con dirección ${work.propertyAddress} ha sido enviada al cliente. Esperando pago.`,
  },
  finalInspectionPending: {
    roles: ['admin', 'owner'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} está pendiente de la inspección final. Por favor, coordina con el inspector.`,
  },
  finalApproved: {
    roles: ['owner',  'admin'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} ha sido aprobado en la inspección final. El proyecto está completo.`,
  },
  finalRejected: {
    roles: ['admin', 'owner'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} ha sido rechazado en la inspección final. Por favor, revisa los detalles.`,
  },
    reinspection_final_requested: { // Added new status
    roles: ['admin', 'owner'], // Define appropriate roles
    message: (work, context) => `Se ha solicitado una reinspección final para la obra en ${work.propertyAddress}. Inspección ID: ${context?.inspectionId || 'N/A'}.`,
  },
  maintenance: {
    roles: ['owner', 'admin'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} está en mantenimiento. Por favor, realiza las tareas asignadas.`,
  },
  budgetCreated: {
    roles: ['admin', 'owner'], // Incluir finance en presupuestos
    message: (work) => `El presupuesto para la dirección ${work.propertyAddress} está listo para ser enviado al cliente.`,
  },
  
  // ✅ NUEVA NOTIFICACIÓN PARA ERRORES DE PDF
  budgetPdfError: {
    roles: ['admin', 'owner'], // Admin y owner reciben errores de PDF
    message: (budget) => `⚠️ ERROR: No se pudo generar el PDF para el presupuesto ${budget?.idBudget} en ${budget?.propertyAddress}. Error: ${budget?.error}. Se requiere intervención manual.`,
  },
  
  budgetSent: {
    roles: ['admin', 'owner'], // Incluir finance cuando se envía presupuesto
    message: (work) => `El presupuesto para la dirección ${work.propertyAddress} ha sido enviado al cliente.`,
  },
   budgetSentToSignNow: {
    roles: ['admin', 'owner'], // Incluir finance en firmas de presupuesto
    message: (data) => `El presupuesto #${data.idBudget} para la dirección ${data.propertyAddress} ha sido enviado a ${data.applicantName} (${data.applicantEmail}) para su firma digital a través de SignNow.`
  },
  incomeCreated: {
    roles: ['admin', 'owner', 'finance'], // Finance debe estar en todos los pagos
    // 'income' ahora tiene las propiedades extra añadidas
    message: (income) => {
      const paymentReceived = parseFloat(income.amount || 0);
      const budgetTotal = parseFloat(income.budgetTotal || 0); // Usar el total real
      const initialPercentage = parseFloat(income.budgetInitialPercentage || 0); // Usar el % real
      const remainingPercentage = 100 - initialPercentage;
      const remainingAmount = budgetTotal - paymentReceived;

      // Validar que los cálculos tengan sentido
      if (budgetTotal <= 0 || initialPercentage <= 0) {
         return `Se registró el pago inicial de $${paymentReceived.toFixed(2)} para la obra en ${income.propertyAddress || 'N/A'}. (No se pudo calcular desglose).`;
      }

      return `Se registro Pago inicial de (${initialPercentage}%) de $${paymentReceived.toFixed(2)} registrado para ${income.propertyAddress || 'N/A'}. ` +
             `Total Presupuesto: $${budgetTotal.toFixed(2)}. ` +
             `Restante (${remainingPercentage}%): $${remainingAmount.toFixed(2)}.`;
    }
  },
  
  // ✅ NUEVAS NOTIFICACIONES FINANCIERAS
  expenseCreated: {
    roles: ['admin', 'owner', 'finance'],
    message: (expense) => {
      const amount = parseFloat(expense.amount || 0);
      const expenseType = expense.typeExpense || 'Gasto';
      const staffName = expense.Staff?.name || 'Staff desconocido';
      const workAddress = expense.Work?.propertyAddress || expense.propertyAddress || 'Obra no especificada';
      
      return `💰 Nuevo gasto registrado: $${amount.toFixed(2)} - ${expenseType}. ` +
             `Registrado por: ${staffName}. Obra: ${workAddress}`;
    }
  },
  
  incomeRegistered: {
    roles: ['admin', 'owner', 'finance'],
    message: (income) => {
      const amount = parseFloat(income.amount || 0);
      const incomeType = income.typeIncome || 'Ingreso';
      const staffName = income.Staff?.name || 'Staff desconocido';
      const workAddress = income.Work?.propertyAddress || income.propertyAddress || 'Obra no especificada';
      
      return `💵 Nuevo ingreso registrado: $${amount.toFixed(2)} - ${incomeType}. ` +
             `Registrado por: ${staffName}. Obra: ${workAddress}`;
    }
  },
  
  expenseUpdated: {
    roles: ['admin', 'owner', 'finance'],
    message: (expense) => {
      const amount = parseFloat(expense.amount || 0);
      const expenseType = expense.typeExpense || 'Gasto';
      const workAddress = expense.Work?.propertyAddress || expense.propertyAddress || 'Obra no especificada';
      
      return `📝 Gasto actualizado: $${amount.toFixed(2)} - ${expenseType}. Obra: ${workAddress}`;
    }
  },
  workApproved: {
    roles: ['owner', 'admin'], // Solo notificar al owner
    message: (work) => `El trabajo para la dirección ${work.propertyAddress} (Work ID: ${work.idWork}) ha sido aprobado y está listo para ser agendado.`,
  },
};

// Función para obtener los empleados a notificar y el mensaje
const getNotificationDetails = async (status, work) => {
  const notificationConfig = stateNotificationMap[status];
  if (!notificationConfig) {
    throw new Error(`Estado de notificación no configurado: ${status}`);
  }

  const roles = notificationConfig.roles;
  const message = notificationConfig.message(work);

  // 🔧 USAR SOLO CORREOS DE STAFF (BASE DE DATOS), NO CORPORATIVOS
  // Buscar staff en la base de datos por roles
  const staffToNotify = await Staff.findAll({
    where: {
      role: roles,
      email: { [Op.ne]: null }
    },
    attributes: ['email', 'name', 'role']
  });
  console.log(`📧 Notificación para roles [${roles.join(', ')}] usando correos de staff:`, 
              staffToNotify.map(s => s.email).join(', '));

  return { staffToNotify, message };
};

module.exports = { getNotificationDetails, getCorporateEmailsByRoles, CORPORATE_EMAIL_MAP };