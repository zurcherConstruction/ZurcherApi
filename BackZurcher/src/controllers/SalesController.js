const { Budget, Work, Permit, Staff } = require('../data');
const { Op } = require('sequelize');

class SalesController {
  /**
   * Dashboard para empleados de ventas (sales_rep)
   * Muestra sus presupuestos y works concretados
   */
  async getMySalesDashboard(req, res) {
    try {
      const userId = req.user.id; // ID del vendedor logueado
      const { month, year, status, workStatus } = req.query;

      console.log(`📊 Sales Dashboard - User ID: ${userId}`);

      // Verificar que el usuario sea sales_rep
      const user = await Staff.findByPk(userId);
      if (!user || user.role !== 'sales_rep') {
        return res.status(403).json({
          error: true,
          message: 'Solo usuarios con rol sales_rep pueden acceder a este dashboard'
        });
      }

      // === 📋 FILTROS ===
      const budgetFilters = {
        createdByStaffId: userId,
        leadSource: 'sales_rep'
      };

      // Filtro por mes/año
      if (month && year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        budgetFilters.createdAt = {
          [Op.between]: [startDate, endDate]
        };
      } else if (year) {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);
        budgetFilters.createdAt = {
          [Op.between]: [startDate, endDate]
        };
      }

      // Filtro por status del presupuesto
      if (status) {
        budgetFilters.status = status;
      }

      // === 📊 OBTENER PRESUPUESTOS ===
      const budgets = await Budget.findAll({
        where: budgetFilters,
        include: [
          {
            model: Permit,
            attributes: ['permitNumber', 'applicantName', 'applicantEmail', 'applicantPhone', 'propertyAddress', 'systemType']
          },
          {
            model: Work,
            required: false,
            attributes: ['idWork', 'status', 'startDate', 'endDate', 'createdAt']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // === 🔨 OBTENER WORKS CONCRETADOS ===
      const workFilters = {};
      if (workStatus) {
        workFilters.status = workStatus;
      }

      // Works que vienen de budgets del vendedor
      const works = await Work.findAll({
        where: workFilters,
        include: [
          {
            model: Budget,
            as: 'budget', // ✅ Usar alias correcto
            required: true,
            where: {
              createdByStaffId: userId,
              leadSource: 'sales_rep'
            },
            include: [
              {
                model: Permit,
                attributes: ['permitNumber', 'applicantName', 'applicantEmail', 'applicantPhone', 'propertyAddress', 'systemType']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // === 📈 CALCULAR TOTALES MENSUALES ===
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const monthStartDate = new Date(currentYear, currentMonth - 1, 1);
      const monthEndDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

      const monthlyBudgets = await Budget.findAll({
        where: {
          createdByStaffId: userId,
          leadSource: 'sales_rep',
          createdAt: {
            [Op.between]: [monthStartDate, monthEndDate]
          }
        },
        attributes: ['status', 'totalPrice']
      });

      // Contar works concretados del mes
      const monthlyWorks = await Work.count({
        where: {
          createdAt: {
            [Op.between]: [monthStartDate, monthEndDate]
          }
        },
        include: [
          {
            model: Budget,
            as: 'budget',
            required: true,
            where: {
              createdByStaffId: userId,
              leadSource: 'sales_rep'
            },
            attributes: []
          }
        ]
      });

      const monthlyStats = {
        totalCreated: monthlyBudgets.length,
        totalWorks: monthlyWorks
      };

      // === 📦 FORMATEAR RESPUESTA ===
      res.status(200).json({
        success: true,
        salesRep: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        monthlyStats: {
          month: currentMonth,
          year: currentYear,
          ...monthlyStats
        },
        budgets: budgets.map(b => ({
          idBudget: b.idBudget,
          status: b.status,
          propertyAddress: b.propertyAddress,
          totalPrice: parseFloat(b.totalPrice || 0),
          date: b.date,
          createdAt: b.createdAt,
          // Datos del cliente
          client: {
            name: b.Permit?.applicantName || b.applicantName,
            email: b.Permit?.applicantEmail || b.applicantEmail,
            phone: b.Permit?.applicantPhone,
            address: b.Permit?.propertyAddress || b.propertyAddress
          },
          permit: {
            permitNumber: b.Permit?.permitNumber,
            systemType: b.Permit?.systemType
          },
          // Work asociado (si existe)
          work: b.Work ? {
            idWork: b.Work.idWork,
            status: b.Work.status,
            startDate: b.Work.startDate,
            endDate: b.Work.endDate,
            createdAt: b.Work.createdAt
          } : null
        })),
        works: works.map(w => ({
          idWork: w.idWork,
          status: w.status,
          startDate: w.startDate,
          endDate: w.endDate,
          createdAt: w.createdAt,
          // Info del budget asociado
          budget: {
            idBudget: w.budget?.idBudget,
            status: w.budget?.status,
            totalPrice: parseFloat(w.budget?.totalPrice || 0),
            date: w.budget?.date,
            // Incluir permit completo en budget
            permit: {
              permitNumber: w.budget?.Permit?.permitNumber,
              applicantName: w.budget?.Permit?.applicantName,
              applicantEmail: w.budget?.Permit?.applicantEmail,
              applicantPhone: w.budget?.Permit?.applicantPhone,
              propertyAddress: w.budget?.Permit?.propertyAddress,
              systemType: w.budget?.Permit?.systemType
            }
          }
        }))
      });

    } catch (error) {
      console.error('❌ Error en getMySalesDashboard:', error);
      res.status(500).json({
        error: true,
        message: 'Error al obtener el dashboard de ventas',
        details: error.message
      });
    }
  }
}

module.exports = new SalesController();
