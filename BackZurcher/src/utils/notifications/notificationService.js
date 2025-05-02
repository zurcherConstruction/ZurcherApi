const { Staff } = require('../../data');
const { Op } = require('sequelize'); // Asegúrate de importar Op para usar operadores de Sequelize
 // Asegúrate de importar el modelo Budget si lo necesitas

// Mapeo de estados a roles y mensajes
const stateNotificationMap = {
  pending: {
    roles: ['admin', 'owner', 'recept'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} ya fue confirmado. Por favor, compra los materiales necesarios  para la fecha ${work.startDate}.`,
  },
  assigned: {
    roles: ['owner', 'admin', 'recept', 'worker'], // Roles que reciben email
    subject: (work) => `Trabajo Asignado: ${work?.propertyAddress || 'Dirección desconocida'}`,
    message: (work) => {
        // Asumiendo que el Staff asignado se incluye en la consulta o se busca después
        const assignedName = work?.Staff?.name || `ID ${work?.staffId || 'desconocido'}`;
        const startDateFormatted = work?.startDate
            ? new Date(work.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : 'fecha no definida';

        // Mensaje más detallado para email
        return `Se ha asignado el trabajo en ${work?.propertyAddress || 'Dirección desconocida'} a ${assignedName}.\n` +
               `La fecha de inicio programada es: ${startDateFormatted}.\n\n` +
               `**Para Recepción:** Por favor, coordinar la compra de materiales necesarios para esta fecha.\n\n` +
               `Notas adicionales: ${work?.notes || 'Ninguna'}`;
    },
    // Ajusta getStaff si es necesario para incluir al trabajador asignado y a los roles de gestión
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
    roles: ['worker', 'recept', 'owner'], 
    message: (work) => `Los materiales ya fueron comprados para la dirección ${work.propertyAddress} .`,
  },
  installed: {
    roles: ['recept', 'admin', 'owner'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} ha sido instalado. Por favor, solicita la primera inspección.`,
  },
  firstInspectionPending: {
    roles: [ 'admin', 'owner'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} está pendiente de la primera inspección. Por favor, coordina con el inspector.`,
  },
  approvedInspection: {
    roles: ['worker', 'admin','owner'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} ha pasado la inspección inicial. Por favor, procede con las tareas asignadas.`,
  },
  rejectedInspection: {
    roles: ['admin','recept','owner'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} ha sido rechazado en la inspección inicial. Por favor, revisa los detalles y toma las medidas necesarias.`,
  },
  completed: {
    roles: ['owner', 'admin', 'recept'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} ha sido completado. Por favor, revisa el estado final.`,
  },
  finalInspectionPending: {
    roles: ['recept'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} está pendiente de la inspección final. Por favor, coordina con el inspector.`,
  },
  finalApproved: {
    roles: ['owner', 'recept', 'admin'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} ha sido aprobado en la inspección final. El proyecto está completo.`,
  },
  finalRejected: {
    roles: ['admin', 'recept'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} ha sido rechazado en la inspección final. Por favor, revisa los detalles.`,
  },
  maintenance: {
    roles: ['owner'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} está en mantenimiento. Por favor, realiza las tareas asignadas.`,
  },
  budgetCreated: {
    roles: ['admin', 'owner'],
    message: (work) => `El presupuesto para la dirección ${work.propertyAddress} está listo para ser enviado al cliente.`,
  },
  budgetSent: {
    roles: ['admin', 'owner'],
    message: (work) => `El presupuesto para la dirección ${work.propertyAddress} ha sido enviado al cliente.`,
  },
  incomeCreated: {
    roles: ['admin', 'owner'],
    message: (income) => `Se ha registrado un ingreso de $${income.amount} para el Work asociado a la dirección ${income.propertyAddress}.`,
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

  // Obtener usuarios con los roles especificados
  const staffToNotify = await Staff.findAll({
    where: { role: { [Op.in]: roles } },
  });

  return { staffToNotify, message };
};

module.exports = { getNotificationDetails };