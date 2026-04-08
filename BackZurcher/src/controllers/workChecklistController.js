const { WorkChecklist, Work, Staff } = require('../data');

/**
 * Obtener el checklist de un work (o crear uno vacío si no existe)
 * GET /api/works/:workId/checklist
 */
const getWorkChecklist = async (req, res) => {
  try {
    const { workId } = req.params;

    // Verificar que el work existe
    const work = await Work.findByPk(workId);
    if (!work) {
      return res.status(404).json({
        error: 'Work no encontrado'
      });
    }

    // Buscar o crear el checklist (atómico para evitar race conditions)
    const [checklist, created] = await WorkChecklist.findOrCreate({
      where: { workId },
      defaults: { workId },
      include: [
        {
          model: Staff,
          as: 'reviewer',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (created) {
      console.log(`✅ Checklist creado para work ${workId}`);
    }

    return res.status(200).json({
      success: true,
      checklist
    });
  } catch (error) {
    console.error('❌ Error al obtener checklist:', error);
    return res.status(500).json({
      error: 'Error al obtener el checklist',
      details: error.message
    });
  }
};

/**
 * Actualizar el checklist de un work
 * PUT /api/works/:workId/checklist
 */
const updateWorkChecklist = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { workId } = req.params;
    const updates = req.body;
    const userId = req.user?.id; // Usuario autenticado (cambio: idUser -> id)

    console.log(`📝 Actualizando checklist para work ${workId}`);
    console.log('Datos recibidos:', updates);

    // ⏱️ Timeout de 5 segundos para queries rápidas
    const QUERY_TIMEOUT = 5000;

    // Verificar que el work existe (con timeout)
    const work = await Work.findByPk(workId, {
      timeout: QUERY_TIMEOUT,
      attributes: ['idWork'] // Solo necesitamos verificar existencia
    });
    
    if (!work) {
      return res.status(404).json({
        error: 'Work no encontrado'
      });
    }

    // ✅ Buscar o crear checklist de forma ATÓMICA (sin locks explícitos)
    // El índice UNIQUE en workId previene duplicados
    const [checklist, created] = await WorkChecklist.findOrCreate({ 
      where: { workId },
      defaults: { workId },
      timeout: QUERY_TIMEOUT
    });
    
    if (created) {
      console.log('📝 Nuevo checklist creado');
    }

    // Si se está marcando finalReviewCompleted como true, guardar quién y cuándo
    if (updates.finalReviewCompleted === true && !checklist.finalReviewCompleted) {
      updates.reviewedBy = userId;
      updates.reviewedAt = new Date();
      console.log(`✅ Revisión final completada por usuario ${userId}`);
    }

    // Si se está desmarcando finalReviewCompleted, limpiar los datos de revisión
    if (updates.finalReviewCompleted === false && checklist.finalReviewCompleted) {
      updates.reviewedBy = null;
      updates.reviewedAt = null;
      console.log(`⚠️ Revisión final desmarcada`);
    }

    // Actualizar el checklist (con timeout)
    await checklist.update(updates, { 
      timeout: QUERY_TIMEOUT 
    });

    // ✅ OPTIMIZACIÓN: En lugar de reload con include (lento), 
    // hacemos una query separada solo cuando sea necesario
    let reviewer = null;
    if (checklist.reviewedBy) {
      reviewer = await Staff.findByPk(checklist.reviewedBy, {
        attributes: ['id', 'name', 'email'],
        timeout: QUERY_TIMEOUT
      });
    }

    console.log(`✅ Checklist actualizado exitosamente en ${Date.now() - startTime}ms`);

    return res.status(200).json({
      success: true,
      message: 'Checklist actualizado exitosamente',
      checklist: {
        ...checklist.toJSON(),
        reviewer: reviewer ? reviewer.toJSON() : null
      }
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Error al actualizar checklist después de ${elapsed}ms:`, error);
    
    // Mejorar logs de error para diagnóstico
    if (error.name === 'SequelizeTimeoutError') {
      console.error('⏱️ TIMEOUT: La consulta tardó más de 5 segundos');
      console.error('💡 Verifica que los índices estén creados correctamente');
      return res.status(504).json({
        error: 'Timeout al actualizar el checklist',
        details: 'La operación tardó demasiado. Contacta al administrador.'
      });
    }
    
    return res.status(500).json({
      error: 'Error al actualizar el checklist',
      details: error.message
    });
  }
};

/**
 * Obtener estadísticas de checklists completados
 * GET /api/works/checklists/stats
 */
const getChecklistStats = async (req, res) => {
  try {
    const totalWorks = await Work.count();
    const worksWithChecklist = await WorkChecklist.count();
    const completedChecklists = await WorkChecklist.count({
      where: { finalReviewCompleted: true }
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalWorks,
        worksWithChecklist,
        completedChecklists,
        completionRate: totalWorks > 0 
          ? ((completedChecklists / totalWorks) * 100).toFixed(2) 
          : 0
      }
    });
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    return res.status(500).json({
      error: 'Error al obtener estadísticas',
      details: error.message
    });
  }
};

/**
 * 🆕 BATCH: Obtener múltiples checklists en 1 query
 * POST /api/works/checklists/batch
 * Body: { workIds: ['id1', 'id2', ...] }
 */
const getBatchChecklists = async (req, res) => {
  try {
    const { workIds } = req.body;

    if (!Array.isArray(workIds) || workIds.length === 0) {
      return res.status(400).json({
        error: 'Se requiere un array de workIds'
      });
    }

    console.log(`📦 [BATCH] Obteniendo checklists para ${workIds.length} works`);

    // 1 SOLA QUERY para traer todos los checklists existentes
    const existingChecklists = await WorkChecklist.findAll({
      where: { workId: workIds },
      include: [
        {
          model: Staff,
          as: 'reviewer',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Mapear por workId para acceso rápido
    const checklistsMap = {};
    existingChecklists.forEach(checklist => {
      checklistsMap[checklist.workId] = checklist;
    });

    // Para los works sin checklist, crear registros vacíos (sin guardar en DB)
    const result = {};
    workIds.forEach(workId => {
      if (checklistsMap[workId]) {
        result[workId] = checklistsMap[workId];
      } else {
        // Devolver estructura vacía sin crear en DB
        result[workId] = {
          workId,
          finalReviewCompleted: false,
          reviewedBy: null,
          reviewedAt: null,
          reviewer: null
        };
      }
    });

    console.log(`✅ [BATCH] Retornando ${Object.keys(result).length} checklists (${existingChecklists.length} existentes, ${workIds.length - existingChecklists.length} vacíos)`);

    return res.status(200).json({
      success: true,
      checklists: result
    });
  } catch (error) {
    console.error('❌ Error en batch checklists:', error);
    return res.status(500).json({
      error: 'Error al obtener checklists',
      details: error.message
    });
  }
};

module.exports = {
  getWorkChecklist,
  updateWorkChecklist,
  getChecklistStats,
  getBatchChecklists // 🆕 Exportar nuevo endpoint
};
