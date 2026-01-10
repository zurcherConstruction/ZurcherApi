const express = require('express');
const router = express.Router();
const staffAttendanceController = require('../controllers/staffAttendanceController');

// GET /api/staff-attendance/monthly - Obtener asistencias de un mes específico
router.get('/monthly', staffAttendanceController.getMonthlyAttendance);

// POST /api/staff-attendance/mark - Marcar/editar asistencia
router.post('/mark', staffAttendanceController.markAttendance);

// GET /api/staff-attendance/yearly-summary - Resumen anual por staff
router.get('/yearly-summary', staffAttendanceController.getYearlySummary);

// GET /api/staff-attendance/available-years - Años disponibles
router.get('/available-years', staffAttendanceController.getAvailableYears);

// DELETE /api/staff-attendance/:id - Eliminar registro de asistencia
router.delete('/:id', staffAttendanceController.deleteAttendance);

module.exports = router;