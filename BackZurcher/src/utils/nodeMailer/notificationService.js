const { Staff } = require('../../data');

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
};

// Función para obtener los empleados a notificar y el mensaje
const getNotificationDetails = async (status, work) => {
    const notificationConfig = stateNotificationMap[status];
    if (!notificationConfig) {
      return null; 
    }
  
    console.log('Roles a notificar:', notificationConfig.roles);
  
    // Buscar empleados con los roles especificados
    const staffToNotify = await Staff.findAll({
      where: {
        role: notificationConfig.roles,
      },
    });
  
    console.log('Empleados a notificar:', staffToNotify);
  
    // Generar el mensaje
    const message = notificationConfig.message(work);
  
    return { staffToNotify, message };
  };
  
module.exports = { getNotificationDetails };