const { Staff } = require('../../data');
const { Op } = require('sequelize');

const getNotificationDetailsApp = async (newStatus, work, budget) => {
    let staffToNotify = [];
    let message = '';
    const targetObject = work || budget;
    const address = targetObject?.propertyAddress || 'Dirección desconocida';

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
            staffToNotify = await Staff.findAll({ where: { role: ['owner'] } }); // Solo owner
            // Mensaje corto para push notification
            message = `Trabajo Aprobado: ${work.propertyAddress} listo para agendar.`;
            break;
            case 'pending': // Estado inicial del Work o cuando está listo para materiales/asignación
             // Ajusta roles según quién deba saber que está pendiente
            staffToNotify = await Staff.findAll({ where: { role: ['admin', 'owner'] } });
            message = `Trabajo Pendiente: ${address}. Comprar materiales/asignar.`;
            break;

            case 'assigned': // Cuando se asigna un staffId al Work
            if (work?.staffId) {
                const assignedStaff = await Staff.findByPk(work.staffId);
                // Obtener managers/recept con pushToken
                const managers = await Staff.findAll({
                    where: {
                        role: ['owner', 'admin', 'recept'],
                        pushToken: { [Op.ne]: null } // Solo los que tienen push token
                    }
                });
                // Combinar y filtrar nulos/sin token (si assignedStaff no tiene token)
                staffToNotify = [assignedStaff?.pushToken ? assignedStaff : null, ...managers].filter(Boolean);

                // --- Mensaje mejorado ---
                const assignedName = assignedStaff?.name || `ID ${work.staffId}`;
                // Formatear la fecha de inicio si existe
                const startDateFormatted = work.startDate
                    ? new Date(work.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : 'fecha no definida';

                // Mensaje para push: incluye instrucción para 'recept'
                message = `Asignado: ${address} a ${assignedName}. Inicio: ${startDateFormatted}. Recept: Comprar materiales.`;
                // --- Fin Mensaje mejorado ---

            } else {
                 // Si no hay staffId, notificar a admin/owner/recept que necesita asignación
                 staffToNotify = await Staff.findAll({
                     where: {
                         role: ['owner', 'admin', 'recept'],
                         pushToken: { [Op.ne]: null } // Solo con pushToken
                     }
                 });
                 message = `Asignación Pendiente: ${address}.`;
            }
            break;

        case 'inProgress': // Cuando se compran materiales o empieza el trabajo
             // Notificar a roles relevantes (worker asignado, admin, owner?)
             staffToNotify = await Staff.findAll({ where: { role: ['worker', 'recept', 'owner', 'admin'] } }); // Ajusta roles
             message = `Trabajo en Progreso: ${address}.`;
             break;

        case 'installed':
             // Notificar a roles relevantes para solicitar inspección
             staffToNotify = await Staff.findAll({ where: { role: [ 'admin', 'owner'] } });
             message = `Trabajo Instalado: ${address}. Solicitar 1ra inspección.`;
             break;
        case 'coverPending':
                // Notificar a roles relevantes para solicitar inspección
                staffToNotify = await Staff.findAll({ where: { role: ['worker', 'admin', 'owner'] } });
                message = `Inspeccion Aprobada, listo para cubrir en la direccion: ${address}. Avisar cuando este Tapado.`;
                break;
        case 'covered':
                    // Notificar a roles relevantes para solicitar inspección
                    staffToNotify = await Staff.findAll({ where: { role: [ 'admin', 'owner'] } });
                    message = `Trabajo Tapado: ${address}. Solicitar inspección Final.`;
                    break;

        // --- Añade CASES para TODOS los demás estados de Work ---
        // firstInspectionPending, approvedInspection, rejectedInspection,
        // completed, finalInspectionPending, finalApproved, finalRejected, maintenance

        // Ejemplo para completed:
        case 'completed':
             staffToNotify = await Staff.findAll({ where: { role: ['owner', 'admin'] } });
             message = `Trabajo Completado: ${address}. Revisar estado final.`;
             break;


             default:
                console.warn(`Estado no manejado para notificaciones push: ${newStatus}`);
                // Devuelve vacío para que no intente enviar nada
                return { staffToNotify: [], message: '' };
                // break; // No es necesario después de return
        }
    
        // Asegúrate de devolver siempre la misma estructura
        return { staffToNotify: staffToNotify || [], message };
    };
module.exports = { getNotificationDetailsApp };