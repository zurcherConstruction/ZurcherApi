/**
 * 📊 Monthly Installations Controller
 * 
 * Obtiene los trabajos que fueron instalados (estado "covered" o posterior)
 * agrupados por mes, basándose en la fecha del WorkStateHistory cuando
 * el trabajo cambió a estado "covered".
 */

const { Op } = require('sequelize');
const { WorkStateHistory, Work, Staff, Permit, Budget } = require('../data');

/**
 * Estados que indican que el trabajo ya fue instalado/covered
 */
const INSTALLED_STATUSES = [
  'covered',
  'invoiceFinal',
  'paymentReceived',
  'finalInspectionPending',
  'finalApproved',
  'finalRejected',
  'maintenance'
];

/**
 * GET /monthly-installations
 * 
 * Query params:
 * - year: Año a consultar (default: año actual)
 * - month: Mes a consultar (1-12, opcional - si no se envía, retorna todos los meses del año)
 * 
 * Response:
 * {
 *   year: 2026,
 *   month: 1, // solo si se filtró por mes
 *   installations: [
 *     {
 *       workId: "uuid",
 *       propertyAddress: "123 Main St",
 *       coveredDate: "2026-01-15",
 *       staff: { id: "uuid", name: "John Doe" },
 *       currentStatus: "maintenance"
 *     }
 *   ],
 *   summary: {
 *     totalWorks: 15,
 *     byStaff: [
 *       { staffId: "uuid", staffName: "John Doe", count: 8 },
 *       { staffId: "uuid", staffName: "Jane Smith", count: 7 }
 *     ]
 *   }
 * }
 */
const getMonthlyInstallations = async (req, res) => {
  try {
    const { year, month } = req.query;
    
    // Año por defecto: año actual
    const targetYear = parseInt(year) || new Date().getFullYear();
    
    // Construir rango de fechas en UTC para evitar problemas de timezone
    let startDate, endDate;
    
    if (month) {
      // Si se especifica mes, filtrar solo ese mes
      const targetMonth = parseInt(month);
      if (targetMonth < 1 || targetMonth > 12) {
        return res.status(400).json({ error: 'Mes inválido. Debe ser entre 1 y 12.' });
      }
      // Crear fechas en formato ISO para evitar problemas de timezone
      startDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-01T00:00:00.000Z`;
      const lastDay = new Date(targetYear, targetMonth, 0).getDate(); // Último día del mes
      endDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}T23:59:59.999Z`;
    } else {
      // Si no se especifica mes, obtener todo el año
      startDate = `${targetYear}-01-01T00:00:00.000Z`;
      endDate = `${targetYear}-12-31T23:59:59.999Z`;
    }

    // Buscar todos los cambios de estado a "covered" en el rango de fechas
    const coveredHistories = await WorkStateHistory.findAll({
      where: {
        toStatus: 'covered',
        changedAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [
        {
          model: Work,
          as: 'work', // Usar el alias correcto
          include: [
            {
              model: Staff,
              attributes: ['id', 'name', 'email']
            },
            {
              model: Permit,
              attributes: ['idPermit', 'propertyAddress'] // Remover 'city' que no existe
            }
          ]
        }
      ],
      order: [['changedAt', 'DESC']]
    });

    // Filtrar duplicados (un work puede tener múltiples entradas si se rechazó y volvió a covered)
    // Tomamos la PRIMERA vez que llegó a covered
    const workMap = new Map();
    
    for (const history of coveredHistories) {
      if (!history.work) continue; // Cambiar Work por work (alias)
      
      const workId = history.work.idWork; // Cambiar Work por work (alias)
      
      // Solo guardar si no existe o si esta fecha es anterior
      if (!workMap.has(workId)) {
        workMap.set(workId, {
          workId: workId,
          propertyAddress: history.work.propertyAddress, // Cambiar Work por work
          coveredDate: history.changedAt.toISOString().split('T')[0], // Solo fecha YYYY-MM-DD
          currentStatus: history.work.status, // Cambiar Work por work
          staff: history.work.Staff ? { // Cambiar Work por work
            id: history.work.Staff.id,
            name: history.work.Staff.name,
            email: history.work.Staff.email
          } : null,
          permit: history.work.Permit ? { // Cambiar Work por work
            id: history.work.Permit.idPermit,
            propertyAddress: history.work.Permit.propertyAddress // Remover city
          } : null
        });
      } else {
        // Si la fecha actual es anterior, reemplazar
        const existing = workMap.get(workId);
        const existingDate = new Date(existing.coveredDate + 'T00:00:00Z');
        const currentDate = new Date(history.changedAt);
        if (currentDate < existingDate) {
          existing.coveredDate = history.changedAt.toISOString().split('T')[0];
        }
      }
    }

    // Convertir Map a array y ordenar por fecha descendente
    const installations = Array.from(workMap.values()).sort((a, b) => 
      new Date(b.coveredDate + 'T00:00:00Z') - new Date(a.coveredDate + 'T00:00:00Z')
    );

    // Calcular resumen
    const staffCounts = {};
    for (const installation of installations) {
      const staffId = installation.staff?.id || 'unassigned';
      const staffName = installation.staff?.name || 'Sin Asignar';
      
      if (!staffCounts[staffId]) {
        staffCounts[staffId] = { staffId, staffName, count: 0 };
      }
      staffCounts[staffId].count++;
    }

    const summary = {
      totalWorks: installations.length,
      byStaff: Object.values(staffCounts).sort((a, b) => b.count - a.count)
    };

    // Preparar respuesta con fechas formateadas correctamente
    const response = {
      year: targetYear,
      startDate: startDate.split('T')[0], // Solo YYYY-MM-DD
      endDate: endDate.split('T')[0], // Solo YYYY-MM-DD
      installations,
      summary
    };

    if (month) {
      response.month = parseInt(month);
    }

    res.json(response);

  } catch (error) {
    console.error('❌ Error en getMonthlyInstallations:', error);
    res.status(500).json({ 
      error: 'Error al obtener instalaciones mensuales',
      details: error.message 
    });
  }
};

/**
 * GET /monthly-installations/summary
 * 
 * Obtiene un resumen anual de instalaciones por mes
 * 
 * Query params:
 * - year: Año a consultar (default: año actual)
 * 
 * Response:
 * {
 *   year: 2026,
 *   monthlyData: [
 *     { month: 1, monthName: "Enero", count: 15 },
 *     { month: 2, monthName: "Febrero", count: 12 },
 *     ...
 *   ],
 *   totalYear: 150
 * }
 */
const getYearlySummary = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();
    
    const startDate = `${targetYear}-01-01T00:00:00.000Z`;
    const endDate = `${targetYear}-12-31T23:59:59.999Z`;

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Buscar todos los cambios a "covered" del año
    const coveredHistories = await WorkStateHistory.findAll({
      where: {
        toStatus: 'covered',
        changedAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: ['workId', 'changedAt']
    });

    // Agrupar por workId (tomar la primera fecha de covered)
    const workFirstCovered = {};
    for (const history of coveredHistories) {
      const workId = history.workId;
      if (!workFirstCovered[workId] || new Date(history.changedAt) < new Date(workFirstCovered[workId])) {
        workFirstCovered[workId] = history.changedAt;
      }
    }

    // Contar por mes
    const monthlyCounts = Array(12).fill(0);
    for (const coveredDate of Object.values(workFirstCovered)) {
      const monthIndex = new Date(coveredDate).getMonth();
      monthlyCounts[monthIndex]++;
    }

    const monthlyData = monthlyCounts.map((count, index) => ({
      month: index + 1,
      monthName: monthNames[index],
      count
    }));

    res.json({
      year: targetYear,
      monthlyData,
      totalYear: Object.keys(workFirstCovered).length
    });

  } catch (error) {
    console.error('❌ Error en getYearlySummary:', error);
    res.status(500).json({ 
      error: 'Error al obtener resumen anual',
      details: error.message 
    });
  }
};

/**
 * GET /monthly-installations/available-years
 * 
 * Obtiene los años disponibles con datos de instalaciones
 * Incluye el año actual aunque no tenga datos
 */
const getAvailableYears = async (req, res) => {
  try {
    const histories = await WorkStateHistory.findAll({
      where: { toStatus: 'covered' },
      attributes: ['changedAt'],
      order: [['changedAt', 'ASC']]
    });

    const currentYear = new Date().getFullYear();
    const yearsSet = new Set([currentYear]); // Siempre incluir año actual
    
    for (const history of histories) {
      yearsSet.add(new Date(history.changedAt).getFullYear());
    }

    const years = Array.from(yearsSet).sort((a, b) => b - a); // Más reciente primero

    res.json({ years });

  } catch (error) {
    console.error('❌ Error en getAvailableYears:', error);
    res.status(500).json({ 
      error: 'Error al obtener años disponibles',
      details: error.message 
    });
  }
};

module.exports = {
  getMonthlyInstallations,
  getYearlySummary,
  getAvailableYears
};
