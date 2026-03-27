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

      // Verificar que el usuario exista y obtener su rol
      const user = await Staff.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          error: true,
          message: 'Usuario no encontrado'
        });
      }

      // === 📋 FILTROS ===
      const budgetFilters = {
        leadSource: 'sales_rep'
      };

      // Si es sales_rep, solo ve sus propios presupuestos
      // Si es admin/owner, ve TODOS los presupuestos de ventas
      if (user.role === 'sales_rep') {
        budgetFilters.createdByStaffId = userId;
      }

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

      // Filtro condicional para budgets en works
      const workBudgetWhere = { leadSource: 'sales_rep' };
      if (user.role === 'sales_rep') {
        workBudgetWhere.createdByStaffId = userId;
      }

      // Works que vienen de budgets del vendedor (o todos si es admin/owner)
      const works = await Work.findAll({
        where: workFilters,
        include: [
          {
            model: Budget,
            as: 'budget', // ✅ Usar alias correcto
            required: true,
            where: workBudgetWhere,
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

      const monthlyBudgetWhere = {
        leadSource: 'sales_rep',
        createdAt: {
          [Op.between]: [monthStartDate, monthEndDate]
        }
      };
      if (user.role === 'sales_rep') {
        monthlyBudgetWhere.createdByStaffId = userId;
      }

      const monthlyBudgets = await Budget.findAll({
        where: monthlyBudgetWhere,
        attributes: ['status', 'totalPrice']
      });

      // Contar works concretados del mes
      const monthlyWorkBudgetWhere = { leadSource: 'sales_rep' };
      if (user.role === 'sales_rep') {
        monthlyWorkBudgetWhere.createdByStaffId = userId;
      }

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
            where: monthlyWorkBudgetWhere,
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
