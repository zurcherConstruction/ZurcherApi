const { Staff } = require('../../data');

const getNotificationDetailsApp = async (newStatus, work, budget) => {
    let staffToNotify = [];
    let message = '';

    switch (newStatus) {
        case 'budgetCreated':
            staffToNotify = await Staff.findAll({ where: { role: ['admin', 'owner'] } });
            message = `El presupuesto para ${work.propertyAddress} está listo para ser enviado al cliente.`;
            break;

        case 'budgetSent':
            staffToNotify = await Staff.findAll({ where: { role: ['admin', 'owner'] } });
            message = `El presupuesto para ${work.propertyAddress} ha sido enviado al cliente.`;
            break;
        case 'workApproved':
            staffToNotify = await Staff.findAll({ where: { role: ['owner', 'admin'] } }); // Solo owner
            // Mensaje corto para push notification
            message = `Trabajo Aprobado: ${work.propertyAddress} listo para agendar.`;
            break;

        default:
            console.warn(`Estado no manejado: ${newStatus}`);
            break;
    }

    return { staffToNotify, message };
};
module.exports = { getNotificationDetailsApp };