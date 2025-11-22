/**
 * 🔧 CONTROLLER: Edit Legacy Maintenance Works
 * 
 * Endpoint especial para editar Works de maintenance legacy que tienen
 * datos placeholder y necesitan ser completados.
 * 
 * Permite editar:
 * - Datos del cliente (via Budget)
 * - Reemplazar Permit
 * - Site plan
 * - Optional docs
 */

const { Work, Budget, Permit, Staff } = require('../data');

/**
 * GET /api/legacy-maintenance
 * Lista TODOS los Works de maintenance (legacy y regulares)
 * Para no mezclar con otros Works
 */
const getLegacyMaintenanceWorks = async (req, res) => {
  try {
    const maintenanceWorks = await Work.findAll({
      where: { 
        status: 'maintenance'
        // Removido: isLegacy: true - ahora muestra TODOS los maintenance
      },
      include: [
        { 
          model: Budget,
          as: 'budget', // ✅ Usar el alias correcto
          required: false // Left join - algunos pueden no tener Budget
        },
        { model: Permit },
        { model: Staff } // ✅ Sin alias - la asociación no tiene alias
      ],
      order: [['createdAt', 'DESC']] // Más recientes primero
    });

    res.status(200).json({
      error: false,
      message: 'Maintenance works obtenidos',
      data: maintenanceWorks,
      total: maintenanceWorks.length
    });

  } catch (error) {
    console.error('❌ Error al obtener maintenance works:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Error al obtener maintenance works',
      details: error.message 
    });
  }
};

/**
 * PUT /api/legacy-maintenance/:idWork
 * Edita un Work de maintenance (actualiza Budget, Permit, etc.)
 * Funciona con TODOS los Works de maintenance (legacy y regulares)
 */
const updateLegacyMaintenanceWork = async (req, res) => {
  try {
    const { idWork } = req.params;
    const { 
      // Datos del cliente (Budget)
      clientName,
      clientEmail,
      clientPhone,
      
      // Permit
      permitId, // ID del permit a vincular
      
      // System info (NUEVO)
      systemType,
      isPBTS,
      
      // Opcional
      notes
    } = req.body;

    console.log('🔵 [UPDATE LEGACY WORK] Datos recibidos:', {
      idWork,
      clientName,
      clientEmail,
      clientPhone,
      permitId,
      systemType,
      isPBTS,
      notes
    });

    // Buscar el Work con Permit (relación por propertyAddress)
    const work = await Work.findByPk(idWork, {
      include: [
        { model: Budget, as: 'budget' },
        { model: Permit } // ✅ Incluir Permit (relación por propertyAddress)
      ]
    });

    if (!work) {
      return res.status(404).json({ 
        error: true, 
        message: 'Work no encontrado' 
      });
    }

    console.log('🔵 [UPDATE LEGACY WORK] Work encontrado:', {
      idWork: work.idWork,
      propertyAddress: work.propertyAddress,
      status: work.status,
      hasPermit: !!work.Permit
    });

    // Validar que sea maintenance (no importa si es legacy o no)
    if (work.status !== 'maintenance') {
      return res.status(403).json({ 
        error: true, 
        message: 'Solo se pueden editar Works de maintenance' 
      });
    }

    // 🔥 ACTUALIZAR PERMIT (para que WorkDetail lo vea)
    // Buscar Permit por propertyAddress (relación correcta)
    const permit = await Permit.findOne({
      where: { propertyAddress: work.propertyAddress }
    });
    
    if (permit) {
      console.log('🔵 [UPDATE PERMIT] Datos ANTES:', {
        applicantName: permit.applicantName,
        applicantEmail: permit.applicantEmail,
        applicantPhone: permit.applicantPhone
      });

      const permitUpdates = {};
      if (clientName) permitUpdates.applicantName = clientName;
      if (clientEmail) permitUpdates.applicantEmail = clientEmail;
      if (clientPhone) permitUpdates.applicantPhone = clientPhone;
      if (systemType !== undefined) permitUpdates.systemType = systemType;
      if (isPBTS !== undefined) permitUpdates.isPBTS = isPBTS;

      if (Object.keys(permitUpdates).length > 0) {
        await permit.update(permitUpdates);
        console.log('✅ [UPDATE PERMIT] Datos DESPUÉS:', {
          applicantName: permit.applicantName,
          applicantEmail: permit.applicantEmail,
          applicantPhone: permit.applicantPhone,
          systemType: permit.systemType,
          isPBTS: permit.isPBTS
        });
      }
    } else {
      console.log('⚠️ [UPDATE PERMIT] No se encontró Permit para propertyAddress:', work.propertyAddress);
    }

    // Actualizar Budget (datos del cliente) - por si acaso
    if (work.budget) {
      const budgetUpdates = {};
      if (clientName) budgetUpdates.applicantName = clientName;
      if (clientEmail) budgetUpdates.clientEmail = clientEmail;
      if (clientPhone) budgetUpdates.clientPhone = clientPhone;

      if (Object.keys(budgetUpdates).length > 0) {
        await work.budget.update(budgetUpdates);
      }
    }

    // 🚫 NO CAMBIAR PERMIT - La relación es por propertyAddress (inmutable)
    // El permitId se ignora porque Work-Permit están vinculados por dirección

    // Actualizar notas del Work
    if (notes) {
      await work.update({ notes });
    }

    // Reload con todas las relaciones
    await work.reload({
      include: [
        { 
          model: Budget, 
          as: 'budget' // ✅ Usar el alias correcto
        },
        { 
          model: Permit,
          required: false // Left join - el Permit debe existir pero lo marcamos como opcional para evitar errores
        },
        { 
          model: Staff,
          required: false // ✅ Sin alias
        }
      ]
    });

    console.log('✅ [UPDATE LEGACY WORK] Datos finales del Work:', {
      idWork: work.idWork,
      'Permit.applicantName': work.Permit?.applicantName,
      'Permit.applicantEmail': work.Permit?.applicantEmail,
      'Permit.applicantPhone': work.Permit?.applicantPhone,
      notes: work.notes
    });

    res.status(200).json({
      success: true, // ✅ Agregado
      error: false,
      message: 'Work actualizado correctamente',
      data: work
    });

  } catch (error) {
    console.error('❌ Error al actualizar legacy work:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Error al actualizar legacy work',
      details: error.message 
    });
  }
};

module.exports = {
  getLegacyMaintenanceWorks,
  updateLegacyMaintenanceWork
};
