const { Staff } = require('../../data');
const { Op } = require('sequelize'); // Asegúrate de importar Op para usar operadores de Sequelize
 // Asegúrate de importar el modelo Budget si lo necesitas

// Mapeo de estados a roles y mensajes
const stateNotificationMap = {
  pending: {
    roles: ['admin', 'owner', 'recept'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} ya fue confirmado. Por favor, compra los materiales necesarios.`,
  },
  assigned: {
    roles: ['worker', 'recept', 'owner'], 
    message: (work) => `Tienes una nueva istalacion pendiente ${work.propertyAddress}, para la fecha ${work.startDate} .`,
  },
  inProgress: {
    roles: ['worker'], 
    message: (work) => `Los materiales ya fueron comprados para la dirección ${work.propertyAddress} .`,
  },
  installed: {
    roles: ['recept'], 
    message: (work) => `El trabajo con dirección ${work.propertyAddress} ha sido instalado. Por favor, solicita la primera inspección.`,
  },
  firstInspectionPending: {
    roles: ['recept'], 
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
    roles: ['owner'], 
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