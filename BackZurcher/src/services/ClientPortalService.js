/**
 * 🔧 SERVICIO DE AUTO-GENERACIÓN DE TOKENS DEL PORTAL DE CLIENTE
 * 
 * Funciones para generar automáticamente tokens cuando se crean works
 * y para gestionar enlaces de seguimiento de clientes
 */

const crypto = require('crypto');
const { Budget } = require('../data');

/**
 * Generar o obtener token existente para un cliente
 * LÓGICA DE AGRUPACIÓN MEJORADA:
 * 1. SIEMPRE agrupar por applicantEmail (prioridad máxima)
 * 2. Además, si existe contactCompany, sincronizar todos los budgets de esa empresa con el mismo token
 * 3. Resultado: Si john@abc.com tiene budgets con y sin empresa, TODOS comparten el mismo token
 * 
 * @param {string} applicantEmail - Email del cliente
 * @param {string} contactCompany - Empresa del cliente (opcional, para sincronización adicional)
 * @returns {Promise<string>} - Token del portal de cliente
 */
async function generateOrGetClientPortalToken(applicantEmail, contactCompany = null) {
  if (!applicantEmail) {
    throw new Error('applicantEmail es requerido para generar token del portal');
  }

  try {
    const normalizedEmail = applicantEmail.toLowerCase().trim();
    const normalizedCompany = contactCompany?.trim() || null;
    
    console.log(`🔍 Buscando token existente para: ${normalizedEmail}${normalizedCompany ? ` (Empresa: ${normalizedCompany})` : ''}`);

    // 📧 PASO 1: Buscar si ya existe un token para este EMAIL (sin importar empresa)
    const existingBudget = await Budget.findOne({
      where: {
        [require('sequelize').Op.and]: [
          {
            [require('sequelize').Op.or]: [
              { applicantEmail: normalizedEmail },
              { applicantEmail: applicantEmail },
              { applicantEmail: normalizedEmail.toUpperCase() },
              { applicantEmail: { [require('sequelize').Op.iLike]: normalizedEmail } }
            ]
          },
          { clientPortalToken: { [require('sequelize').Op.ne]: null } }
        ]
      },
      order: [['updatedAt', 'DESC']]
    });

    // PASO 2: Si ya existe token para este email, reutilizarlo para TODOS sus budgets
    if (existingBudget && existingBudget.clientPortalToken) {
      console.log(`✅ Token existente encontrado para ${normalizedEmail}: ${existingBudget.clientPortalToken.substring(0, 16)}...`);
      
      // Sincronizar TODOS los budgets del mismo email con el token existente
      try {
        const [updatedCount] = await Budget.update(
          { clientPortalToken: existingBudget.clientPortalToken },
          { 
            where: {
              [require('sequelize').Op.and]: [
                {
                  [require('sequelize').Op.or]: [
                    { applicantEmail: normalizedEmail },
                    { applicantEmail: applicantEmail },
                    { applicantEmail: normalizedEmail.toUpperCase() },
                    { applicantEmail: { [require('sequelize').Op.iLike]: normalizedEmail } }
                  ]
                },
                {
                  [require('sequelize').Op.or]: [
                    { clientPortalToken: null },
                    { clientPortalToken: { [require('sequelize').Op.ne]: existingBudget.clientPortalToken } }
                  ]
                }
              ]
            }
          }
        );
        console.log(`🔄 Sincronizados ${updatedCount} presupuestos del email ${normalizedEmail}`);
        
        // 🏢 PASO 2B: Si además tiene empresa, sincronizar TODOS los budgets de esa empresa
        if (normalizedCompany) {
          const [companyUpdated] = await Budget.update(
            { clientPortalToken: existingBudget.clientPortalToken },
            { 
              where: {
                contactCompany: normalizedCompany,
                [require('sequelize').Op.or]: [
                  { clientPortalToken: null },
                  { clientPortalToken: { [require('sequelize').Op.ne]: existingBudget.clientPortalToken } }
                ]
              }
            }
          );
          console.log(`🏢 Sincronizados ${companyUpdated} presupuestos adicionales de la empresa ${normalizedCompany}`);
        }
      } catch (syncError) {
        console.log(`⚠️ Error sincronizando presupuestos (no crítico): ${syncError.message}`);
      }
      
      return existingBudget.clientPortalToken;
    }

    // PASO 3: No existe token, generar uno nuevo
    // 🏢 Si hay empresa, generar basado en empresa (para agrupar múltiples emails)
    // 📧 Si no hay empresa, generar basado en email
    const tokenBase = normalizedCompany || normalizedEmail;
    const tokenSalt = crypto.randomBytes(16).toString('hex');
    const clientToken = crypto
      .createHash('sha256')
      .update(tokenBase + tokenSalt + (process.env.JWT_SECRET || 'default-secret'))
      .digest('hex');

    console.log(`🔑 Generando nuevo token para ${normalizedEmail}${normalizedCompany ? ` (Empresa: ${normalizedCompany})` : ''}...`);

    // PASO 4: Aplicar el nuevo token a todos los budgets relevantes
    const updatePromises = [];
    
    // 4A: Actualizar todos los budgets del EMAIL
    updatePromises.push(
      Budget.update(
        { clientPortalToken: clientToken },
        { 
          where: {
            [require('sequelize').Op.or]: [
              { applicantEmail: normalizedEmail },
              { applicantEmail: applicantEmail },
              { applicantEmail: normalizedEmail.toUpperCase() }
            ]
          }
        }
      )
    );
    
    // 4B: Si hay empresa, TAMBIÉN actualizar todos los budgets de esa EMPRESA
    if (normalizedCompany) {
      updatePromises.push(
        Budget.update(
          { clientPortalToken: clientToken },
          { where: { contactCompany: normalizedCompany } }
        )
      );
    }

    const results = await Promise.all(updatePromises);
    const totalUpdated = results.reduce((sum, [count]) => sum + count, 0);

    console.log(`✅ Token generado: ${totalUpdated} presupuestos actualizados`);
    return clientToken;

  } catch (error) {
    console.error('❌ Error generando token del portal:', error);
    
    // Si es error de llave duplicada, buscar y usar el token existente
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.log('🔄 Token duplicado detectado, buscando token existente...');
      
      const normalizedEmail = applicantEmail.toLowerCase().trim();
      
      // Lista de emails problemáticos conocidos - omitir por ahora
      const problematicEmails = ['yaninazurcher@gmail.com'];
      if (problematicEmails.includes(normalizedEmail)) {
        console.log(`⏭️ Omitiendo email problemático conocido: ${normalizedEmail}`);
        console.log(`ℹ️ Este caso será manejado manualmente después`);
        return null;
      }
      
      // Buscar cualquier presupuesto con token para este email (búsqueda exhaustiva)
      const existingBudget = await Budget.findOne({
        where: {
          [require('sequelize').Op.and]: [
            {
              [require('sequelize').Op.or]: [
                { applicantEmail: normalizedEmail },
                { applicantEmail: applicantEmail },
                { applicantEmail: normalizedEmail.toUpperCase() },
                { applicantEmail: { [require('sequelize').Op.iLike]: normalizedEmail } }
              ]
            },
            { clientPortalToken: { [require('sequelize').Op.ne]: null } }
          ]
        },
        order: [['updatedAt', 'DESC']]
      });
      
      if (existingBudget && existingBudget.clientPortalToken) {
        console.log(`✅ Token existente recuperado para ${normalizedEmail}: ${existingBudget.clientPortalToken.substring(0, 16)}...`);
        return existingBudget.clientPortalToken;
      }
      
      console.log(`❌ No se pudo resolver el conflicto de token para ${normalizedEmail}`);
      console.log(`ℹ️ Continuando sin asignar token - será manejado manualmente si es necesario`);
      return null; // Retornar null en lugar de lanzar error para que el script continúe
    }
    
    throw new Error('Error generando token del portal de cliente');
  }
}

/**
 * Obtener URL completa del portal para un cliente
 * LÓGICA DE BÚSQUEDA:
 * 1. Buscar por applicantEmail (siempre, sin importar si tiene empresa o no)
 * 
 * @param {string} applicantEmail - Email del cliente
 * @param {string} contactCompany - Empresa del cliente (opcional, no afecta la búsqueda)
 * @returns {Promise<string|null>} - URL completa del portal o null si no tiene token
 */
async function getClientPortalUrl(applicantEmail, contactCompany = null) {
  try {
    const normalizedEmail = applicantEmail.toLowerCase().trim();
    
    // Buscar token por email (sin importar si tiene o no contactCompany)
    const budget = await Budget.findOne({
      where: {
        [require('sequelize').Op.and]: [
          {
            [require('sequelize').Op.or]: [
              { applicantEmail: normalizedEmail },
              { applicantEmail: applicantEmail },
              { applicantEmail: normalizedEmail.toUpperCase() }
            ]
          },
          { clientPortalToken: { [require('sequelize').Op.ne]: null } }
        ]
      },
      attributes: ['clientPortalToken']
    });

    if (!budget || !budget.clientPortalToken) {
      return null;
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/client-portal/${budget.clientPortalToken}`;

  } catch (error) {
    console.error('❌ Error obteniendo URL del portal:', error);
    return null;
  }
}

/**
 * Auto-generar token al crear un work (middleware/hook)
 * @param {Object} workData - Datos del work que incluyen el budget
 */
async function autoGenerateTokenForWork(workData) {
  try {
    // Obtener información del budget asociado
    const budget = await Budget.findByPk(workData.idBudget, {
      attributes: ['applicantEmail', 'contactCompany', 'clientPortalToken']
    });

    if (!budget || !budget.applicantEmail) {
      console.log('⚠️ Work sin email de cliente, no se genera token del portal');
      return null;
    }

    // Solo generar si no tiene token ya
    if (budget.clientPortalToken) {
      console.log(`✅ Cliente ${budget.applicantEmail} ya tiene token del portal`);
      return budget.clientPortalToken;
    }

    // Generar token automáticamente
    const token = await generateOrGetClientPortalToken(
      budget.applicantEmail, 
      budget.contactCompany
    );

    if (token) {
      console.log(`🎉 Token del portal auto-generado para work #${workData.idWork} - Cliente: ${budget.applicantEmail}`);
      return token;
    } else {
      console.log(`⚠️ No se pudo generar token para work #${workData.idWork} - Cliente: ${budget.applicantEmail}`);
      return null;
    }

  } catch (error) {
    console.error('❌ Error en auto-generación de token:', error);
    return null;
  }
}

/**
 * Obtener información del portal para un work específico
 * Usado para mostrar el enlace en WorkDetail
 * 
 * @param {String} workId - ID del work
 * @returns {Object|null} Información del portal o null si no existe
 */
async function getPortalInfoForWork(workId) {
  try {
    const { Work } = require('../data');
    
    // Obtener work con su budget
    const work = await Work.findByPk(workId, {
      include: [{
        model: Budget,
        as: 'budget',
        attributes: ['idBudget', 'applicantEmail', 'applicantName', 'contactCompany', 'clientPortalToken']
      }]
    });

    if (!work || !work.budget) {
      return null;
    }

    const { budget } = work;

    // Si no tiene token, indicar que no hay portal
    if (!budget.clientPortalToken) {
      return {
        hasPortal: false,
        clientEmail: budget.applicantEmail,
        clientName: budget.applicantName,
        canGenerate: !!budget.applicantEmail // Puede generar si tiene email
      };
    }

    // Construir información del portal existente
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const portalUrl = `${baseUrl}/client-portal/${budget.clientPortalToken}`;

    return {
      hasPortal: true,
      clientEmail: budget.applicantEmail,
      clientName: budget.applicantName,
      contactCompany: budget.contactCompany,
      token: budget.clientPortalToken,
      portalUrl
    };

  } catch (error) {
    console.error('❌ Error en getPortalInfoForWork:', error);
    return null;
  }
}

module.exports = {
  generateOrGetClientPortalToken,
  getClientPortalUrl,
  autoGenerateTokenForWork,
  getPortalInfoForWork  // 🆕 Nueva función
};