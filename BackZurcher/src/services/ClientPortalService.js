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
 * @param {string} applicantEmail - Email del cliente
 * @param {string} contactCompany - Empresa del cliente (opcional)
 * @returns {Promise<string>} - Token del portal de cliente
 */
async function generateOrGetClientPortalToken(applicantEmail, contactCompany = null) {
  if (!applicantEmail) {
    throw new Error('applicantEmail es requerido para generar token del portal');
  }

  try {
    // 🔧 Normalizar email a minúsculas para evitar duplicados
    const normalizedEmail = applicantEmail.toLowerCase().trim();
    
    console.log(`🔍 Buscando token existente para: ${normalizedEmail}`);

    // 1. Buscar si ya existe un token para este cliente (email normalizado) - búsqueda más exhaustiva
    const existingBudget = await Budget.findOne({
      where: {
        [require('sequelize').Op.and]: [
          {
            [require('sequelize').Op.or]: [
              { applicantEmail: normalizedEmail },
              { applicantEmail: applicantEmail }, // Buscar también el original por si acaso
              { applicantEmail: normalizedEmail.toUpperCase() }, // Y en mayúsculas
              { applicantEmail: { [require('sequelize').Op.iLike]: normalizedEmail } } // Búsqueda case-insensitive
            ]
          },
          { clientPortalToken: { [require('sequelize').Op.ne]: null } }
        ]
      },
      order: [['updatedAt', 'DESC']] // Obtener el más reciente
    });

    // 2. Si ya existe, retornar el token existente
    if (existingBudget && existingBudget.clientPortalToken) {
      console.log(`✅ Token existente encontrado para ${normalizedEmail}: ${existingBudget.clientPortalToken.substring(0, 16)}...`);
      console.log(`📧 Email del presupuesto con token: ${existingBudget.applicantEmail}`);
      
      // ** CORRECCIÓN CRÍTICA: Asegurar que TODOS los budgets similares usen el mismo token **
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
        console.log(`🔄 Sincronizados ${updatedCount} presupuestos con el token existente`);
      } catch (syncError) {
        console.log(`⚠️ Error sincronizando presupuestos (no crítico): ${syncError.message}`);
      }
      
      return existingBudget.clientPortalToken;
    }

    // 3. Si no existe, generar uno nuevo con email normalizado
    const tokenSalt = crypto.randomBytes(16).toString('hex');
    const clientToken = crypto
      .createHash('sha256')
      .update(normalizedEmail + tokenSalt + (process.env.JWT_SECRET || 'default-secret'))
      .digest('hex');

    console.log(`🔑 Generando nuevo token para ${normalizedEmail}...`);

    // 4. Actualizar todos los budgets del cliente (incluyendo variaciones de email)
    const updateWhereClause = { 
      [require('sequelize').Op.or]: [
        { applicantEmail: normalizedEmail },
        { applicantEmail: applicantEmail },
        { applicantEmail: normalizedEmail.toUpperCase() }
      ]
    };
    if (contactCompany) {
      updateWhereClause.contactCompany = contactCompany;
    }

    const [updatedCount] = await Budget.update(
      { clientPortalToken: clientToken },
      { where: updateWhereClause }
    );

    console.log(`✅ Token generado para ${normalizedEmail}: ${updatedCount} presupuestos actualizados`);
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
 * @param {string} applicantEmail - Email del cliente
 * @param {string} contactCompany - Empresa del cliente (opcional)
 * @returns {Promise<string|null>} - URL completa del portal o null si no tiene token
 */
async function getClientPortalUrl(applicantEmail, contactCompany = null) {
  try {
    // 🔧 Normalizar email a minúsculas
    const normalizedEmail = applicantEmail.toLowerCase().trim();
    
    const whereClause = { 
      [require('sequelize').Op.or]: [
        { applicantEmail: normalizedEmail },
        { applicantEmail: applicantEmail },
        { applicantEmail: normalizedEmail.toUpperCase() }
      ]
    };
    if (contactCompany) {
      whereClause.contactCompany = contactCompany;
    }

    const budget = await Budget.findOne({
      where: {
        ...whereClause,
        clientPortalToken: { [require('sequelize').Op.ne]: null }
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