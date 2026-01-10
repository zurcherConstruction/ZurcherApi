const { Op, fn, col, literal } = require('sequelize');
const { StaffAttendance, Staff, WorkStateHistory, Work, Permit, MaintenanceVisit } = require('../data');

class StaffAttendanceController {
  // Obtener asistencias por mes
  async getMonthlyAttendance(req, res) {
    try {
      const { year, month } = req.query;
      
      if (!year || !month) {
        return res.status(400).json({
          success: false,
          message: 'Año y mes son requeridos'
        });
      }

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      console.log(`Buscando asistencias desde ${startDate} hasta ${endDate}`);

      const attendances = await StaffAttendance.findAll({
        where: {
          workDate: {
            [Op.between]: [startDate, endDate]
          }
        },
        include: [{
          model: Staff,
          as: 'Staff',
          attributes: ['id', 'name', 'role']  // Cambiar lastName por role
        }, {
          model: Staff,
          as: 'CreatedByStaff',
          attributes: ['id', 'name']  // Quitar lastName
        }],
        order: [['workDate', 'ASC'], [{ model: Staff, as: 'Staff' }, 'name', 'ASC']]
      });

      // Obtener stats del mes
      const monthlyStats = await StaffAttendance.findAll({
        where: {
          workDate: {
            [Op.between]: [startDate, endDate]
          }
        },
        attributes: [
          'staffId',
          [fn('COUNT', col('StaffAttendance.id')), 'totalDays'],
          [fn('SUM', literal('CASE WHEN "isPresent" = true THEN 1 ELSE 0 END')), 'workingDays'],
          [fn('SUM', literal('CASE WHEN "isPresent" = false THEN 1 ELSE 0 END')), 'absentDays']
        ],
        include: [{
          model: Staff,
          as: 'Staff',
          attributes: ['id', 'name', 'role']
        }],
        group: ['staffId', 'Staff.id', 'Staff.name', 'Staff.role']
      });

      // Organizar datos por día
      const dayData = {};
      const staffSet = new Set();
      
      attendances.forEach(att => {
        const date = att.workDate;
        if (!dayData[date]) {
          dayData[date] = [];
        }
        
        dayData[date].push({
          id: att.id,
          staff: {
            id: att.Staff.id,
            name: att.Staff.name,
            role: att.Staff.role  // Cambiar lastName por role
          },
          isPresent: att.isPresent,
          notes: att.notes,
          createdBy: att.CreatedByStaff ? {
            id: att.CreatedByStaff.id,
            name: att.CreatedByStaff.name  // Quitar lastName
          } : null,
          createdAt: att.createdAt
        });
        
        staffSet.add(JSON.stringify({
          id: att.Staff.id,
          name: att.Staff.name,
          role: att.Staff.role
        }));
      });

      // 🆕 Obtener instalaciones del mes para agregar al resumen
      const startDateISO = `${year}-${month.toString().padStart(2, '0')}-01T00:00:00.000Z`;
      const lastDayForISO = new Date(year, month, 0).getDate();
      const endDateISO = `${year}-${month.toString().padStart(2, '0')}-${lastDayForISO.toString().padStart(2, '0')}T23:59:59.999Z`;

      const installedHistories = await WorkStateHistory.findAll({
        where: {
          toStatus: 'installed', // ✅ Cambiar de 'covered' a 'installed'
          changedAt: {
            [Op.between]: [startDateISO, endDateISO]
          }
        },
        include: [
          {
            model: Work,
            as: 'work',
            include: [
              {
                model: Staff,
                attributes: ['id', 'name', 'role']
              }
            ]
          }
        ]
      });

      // Contar instalaciones por staff
      const installationsByStaff = {};
      const workMap = new Map();
      
      for (const history of installedHistories) {
        if (!history.work || !history.work.Staff) continue;
        
        const workId = history.work.idWork;
        const staffId = history.work.Staff.id;
        
        // Solo contar una vez por work (primera vez que llegó a installed)
        if (!workMap.has(workId)) {
          workMap.set(workId, true);
          if (!installationsByStaff[staffId]) {
            installationsByStaff[staffId] = {
              staff: {
                id: history.work.Staff.id,
                name: history.work.Staff.name,
                role: history.work.Staff.role
              },
              installations: 0
            };
          }
          installationsByStaff[staffId].installations++;
        }
      }

      // 🆕 Obtener mantenimientos completados en el mes
      const completedMaintenances = await MaintenanceVisit.findAll({
        where: {
          status: 'completed',
          actualVisitDate: {
            [Op.between]: [startDate, endDate]
          }
        },
        include: [
          {
            model: Staff,
            as: 'completedByStaff', // Staff que completó el mantenimiento
            attributes: ['id', 'name', 'role']
          }
        ]
      });

      // Contar mantenimientos por staff completador
      const maintenancesByStaff = {};
      
      for (const maintenance of completedMaintenances) {
        if (!maintenance.completedByStaff) continue;
        
        const staffId = maintenance.completedByStaff.id;
        
        if (!maintenancesByStaff[staffId]) {
          maintenancesByStaff[staffId] = {
            staff: {
              id: maintenance.completedByStaff.id,
              name: maintenance.completedByStaff.name,
              role: maintenance.completedByStaff.role
            },
            maintenances: 0
          };
        }
        maintenancesByStaff[staffId].maintenances++;
      }

      // Resumen por staff (combinando asistencia, instalaciones y mantenimientos)
      // 🆕 Crear un Set de todos los staff con actividad
      const allActiveStaffIds = new Set();
      
      // Agregar staff con registros de asistencia
      monthlyStats.forEach(stat => allActiveStaffIds.add(stat.Staff.id));
      
      // Agregar staff con instalaciones
      Object.keys(installationsByStaff).forEach(staffId => allActiveStaffIds.add(staffId));
      
      // Agregar staff con mantenimientos
      Object.keys(maintenancesByStaff).forEach(staffId => allActiveStaffIds.add(staffId));

      // Crear resumen para todos los staff con actividad
      const staffSummaries = [];
      
      for (const staffId of allActiveStaffIds) {
        // Buscar datos de asistencia
        const attendanceStat = monthlyStats.find(stat => stat.Staff.id === staffId);
        
        // Obtener datos de staff (de asistencia, instalaciones o mantenimientos)
        let staffInfo;
        if (attendanceStat) {
          staffInfo = {
            id: attendanceStat.Staff.id,
            name: attendanceStat.Staff.name,
            role: attendanceStat.Staff.role
          };
        } else if (installationsByStaff[staffId]) {
          staffInfo = installationsByStaff[staffId].staff;
        } else if (maintenancesByStaff[staffId]) {
          staffInfo = maintenancesByStaff[staffId].staff;
        }

        if (staffInfo) {
          staffSummaries.push({
            staff: staffInfo,
            totalDays: attendanceStat ? parseInt(attendanceStat.get('totalDays')) : 0,
            workingDays: attendanceStat ? parseInt(attendanceStat.get('workingDays')) : 0,
            absentDays: attendanceStat ? parseInt(attendanceStat.get('absentDays')) : 0,
            installations: installationsByStaff[staffId]?.installations || 0,
            maintenances: maintenancesByStaff[staffId]?.maintenances || 0
          });
        }
      }

      const uniqueStaff = Array.from(staffSet).map(s => JSON.parse(s));

      res.json({
        success: true,
        data: {
          year: parseInt(year),
          month: parseInt(month),
          days: dayData,
          staffSummaries,
          uniqueStaff,
          totalRecords: attendances.length,
          totalInstallations: Object.values(installationsByStaff).reduce((sum, staff) => sum + staff.installations, 0),
          totalMaintenances: Object.values(maintenancesByStaff).reduce((sum, staff) => sum + staff.maintenances, 0)
        }
      });

    } catch (error) {
      console.error('Error fetching monthly attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Marcar/editar asistencia para un día específico
  async markAttendance(req, res) {
    try {
      const { staffId, workDate, isPresent, notes } = req.body;
      const createdBy = req.user?.id || req.body.createdBy;

      if (!staffId || !workDate || typeof isPresent !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'staffId, workDate e isPresent son requeridos'
        });
      }

      if (!createdBy) {
        return res.status(400).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar si ya existe un registro para este staff en esta fecha
      const existingRecord = await StaffAttendance.findOne({
        where: {
          staffId,
          workDate
        }
      });

      let attendance;
      
      if (existingRecord) {
        // Actualizar registro existente
        await existingRecord.update({
          isPresent,
          notes,
          updatedAt: new Date()
        });
        attendance = existingRecord;
      } else {
        // Crear nuevo registro
        attendance = await StaffAttendance.create({
          staffId,
          workDate,
          isPresent,
          notes,
          createdBy
        });
      }

      // Devolver con datos del staff incluidos
      const attendanceWithStaff = await StaffAttendance.findByPk(attendance.id, {
        include: [{
          model: Staff,
          as: 'Staff',
          attributes: ['id', 'name', 'role']
        }, {
          model: Staff,
          as: 'CreatedByStaff',
          attributes: ['id', 'name']
        }]
      });

      res.json({
        success: true,
        data: attendanceWithStaff,
        message: existingRecord ? 'Asistencia actualizada' : 'Asistencia registrada'
      });

    } catch (error) {
      console.error('Error marking attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener resumen anual por staff
  async getYearlySummary(req, res) {
    try {
      const { year, staffId } = req.query;
      
      if (!year) {
        return res.status(400).json({
          success: false,
          message: 'Año es requerido'
        });
      }

      let whereClause = {
        workDate: {
          [Op.between]: [`${year}-01-01`, `${year}-12-31`]
        }
      };

      if (staffId) {
        whereClause.staffId = staffId;
      }

      const yearlyData = await StaffAttendance.findAll({
        where: whereClause,
        attributes: [
          'staffId',
          [fn('EXTRACT', literal('MONTH FROM "workDate"')), 'month'],
          [fn('COUNT', col('id')), 'totalDays'],
          [fn('SUM', literal('CASE WHEN "isPresent" = true THEN 1 ELSE 0 END')), 'workingDays'],
          [fn('SUM', literal('CASE WHEN "isPresent" = false THEN 1 ELSE 0 END')), 'absentDays']
        ],
        include: [{
          model: Staff,
          as: 'Staff',
          attributes: ['id', 'name', 'role']
        }],
        group: [
          'staffId', 
          'Staff.id', 
          'Staff.name', 
          'Staff.role',
          fn('EXTRACT', literal('MONTH FROM "workDate"'))
        ],
        order: [
          [{ model: Staff, as: 'Staff' }, 'name', 'ASC'],
          [fn('EXTRACT', literal('MONTH FROM "workDate"')), 'ASC']
        ]
      });

      // Organizar datos por mes y staff
      const monthlyBreakdown = {};
      
      yearlyData.forEach(record => {
        const month = parseInt(record.get('month'));
        if (!monthlyBreakdown[month]) {
          monthlyBreakdown[month] = [];
        }
        
        monthlyBreakdown[month].push({
          staff: {
            id: record.Staff.id,
            name: record.Staff.name,
            role: record.Staff.role
          },
          totalDays: parseInt(record.get('totalDays')),
          workingDays: parseInt(record.get('workingDays')),
          absentDays: parseInt(record.get('absentDays'))
        });
      });

      res.json({
        success: true,
        data: {
          year: parseInt(year),
          monthlyBreakdown,
          totalRecords: yearlyData.length
        }
      });

    } catch (error) {
      console.error('Error fetching yearly summary:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener años disponibles
  async getAvailableYears(req, res) {
    try {
      const years = await StaffAttendance.findAll({
        attributes: [
          [fn('DISTINCT', fn('EXTRACT', literal('YEAR FROM "workDate"'))), 'year']
        ],
        order: [[fn('EXTRACT', literal('YEAR FROM "workDate"')), 'DESC']]
      });

      const yearsList = years.map(y => parseInt(y.get('year'))).filter(year => !isNaN(year));

      res.json({
        success: true,
        data: {
          years: yearsList,
          count: yearsList.length
        }
      });

    } catch (error) {
      console.error('Error fetching available years:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Eliminar registro de asistencia
  async deleteAttendance(req, res) {
    try {
      const { id } = req.params;
      
      const attendance = await StaffAttendance.findByPk(id);
      
      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: 'Registro de asistencia no encontrado'
        });
      }

      await attendance.destroy();

      res.json({
        success: true,
        message: 'Registro de asistencia eliminado'
      });

    } catch (error) {
      console.error('Error deleting attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = new StaffAttendanceController();