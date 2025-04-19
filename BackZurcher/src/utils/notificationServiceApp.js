const { Staff } = require('../data');

const getNotificationDetailsApp = async (newStatus, work) => {
    let staffToNotifyApp = [];
    let message = '';

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

        default:
            message = `El estado del trabajo en ${work.propertyAddress} ha cambiado a ${newStatus}.`;
            break;
    }

    return { staffToNotifyApp, message };
};

module.exports = { getNotificationDetailsApp };