const { Staff } = require('../data');

const getNotificationDetailsApp = async (newStatus, work, budget) => {
    let staffToNotifyApp = [];
    let message = '';

    console.log('Usuarios a notificar (push):', staffToNotifyApp);
    console.log('Mensaje de notificación (push):', message);

    switch (newStatus) {
        case 'pending':
            // Notificar a los roles admin y owner
            const adminsAndOwners = await Staff.findAll({ where: { role: ['admin', 'owner'] } });
            staffToNotifyApp = adminsAndOwners;
            message = `Por favor, asignen una fecha de instalación y procedan con la compra de materiales.`;
            break;

        case 'assigned':
            // Notificar al staff asignado
            const assignedStaff = await Staff.findByPk(work.staffId);
            if (assignedStaff) {
                staffToNotifyApp.push(assignedStaff);
                message = `Se te ha asignado el trabajo en ${work.propertyAddress}.`;
            }
            break;

        case 'completed':
            // Notificar al administrador
            const admins = await Staff.findAll({ where: { role: 'admin' } });
            staffToNotifyApp = admins;
            message = `El trabajo en ${work.propertyAddress} ha sido completado.`;
            break;

        // Casos específicos para Budget
        case 'created':
            message = `El presupuesto para ${budget.propertyAddress} ha sido creado.`;
            break;

        case 'send':
            message = `El presupuesto para ${budget.propertyAddress} ha sido enviado al cliente.`;
            break;

        case 'approved':
            message = `El presupuesto para ${budget.propertyAddress} ha sido aprobado por el cliente.`;
            break;

        case 'rejected':
            message = `El presupuesto para ${budget.propertyAddress} ha sido rechazado por el cliente.`;
            break;

        default:
            message = `El estado del trabajo en ${budget.propertyAddress} ha cambiado a ${newStatus}.`;
            break;
    }

    return { staffToNotifyApp, message };
};

module.exports = { getNotificationDetailsApp };