const ExcelJS = require('exceljs');
const { Work, Permit, Budget, Inspection, Income } = require('../data/index');
const { Op } = require('sequelize');

/**
 * Exportar works a Excel con filtros
 * GET /api/export/works
 * Query params:
 * - status: 'all', 'maintenance', 'active' (sin maintenance)
 * - applicantEmail: filtrar por email/contacto de aplicante
 */
const exportWorksToExcel = async (req, res) => {
  try {
    const { status = 'all', applicantEmail } = req.query;

    console.log(`📊 [Export Works] Generando Excel...`);
    console.log(`   Filtro estado: ${status}`);
    console.log(`   Filtro email: ${applicantEmail || 'ninguno'}`);

    // Construir filtros
    const whereConditions = {};
    
    // Filtro por estado
    if (status === 'maintenance') {
      // Solo works en maintenance
      whereConditions.status = 'maintenance';
    } else if (status === 'active') {
      // Activos sin maintenance ni cancelled
      whereConditions.status = {
        [Op.notIn]: ['maintenance', 'cancelled']
      };
    }
    // Si es 'all', no agregamos filtro de status

    // Filtro por email del aplicante (búsqueda flexible)
    if (applicantEmail) {
      whereConditions['$Permit.applicantEmail$'] = {
        [Op.iLike]: `%${applicantEmail}%`
      };
    }

    // Obtener works con relaciones
    const works = await Work.findAll({
      where: whereConditions,
      include: [
        {
          model: Permit,
          attributes: ['applicantEmail'],
          required: false
        },
        {
          model: Inspection,
          as: 'inspections',
          attributes: ['dateInspectionPerformed', 'finalStatus', 'type'],
          required: false,
          separate: true,
          order: [['dateInspectionPerformed', 'DESC']]
        },
        {
          model: Income,
          as: 'incomes',
          attributes: ['date', 'typeIncome'],
          required: false,
          separate: true,
          order: [['date', 'DESC']]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log(`✅ Se encontraron ${works.length} works para exportar`);

    // Crear workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Works');

    // Configurar columnas (sin Permit Number ni Cover Date)
    worksheet.columns = [
      { header: 'Property Address', key: 'address', width: 40 },
      { header: 'Applicant Email', key: 'applicantEmail', width: 30 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Start Date', key: 'startDate', width: 15 },
      { header: 'Installation Date', key: 'installationDate', width: 15 },
      { header: 'Final Invoice Date', key: 'finalInvoiceDate', width: 15 }
    ];

    // Estilo para header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Agregar datos
    works.forEach(work => {
      // Buscar fechas específicas en inspections
      const firstInspection = work.inspections?.find(i => i.type === 'initial');
      
      // Buscar el income final más reciente (si existe un income final, ya está pagado)
      const finalIncome = work.incomes?.find(i => 
        i.typeIncome === 'Factura Pago Final Budget'
      );

      const row = worksheet.addRow({
        address: work.propertyAddress || 'N/A',
        applicantEmail: work.Permit?.applicantEmail || 'N/A',
        status: work.status || 'N/A',
        // Start Date: Fecha cuando pasa a firstInspectionPending (instalado)
        startDate: work.installationStartDate ? formatDate(work.installationStartDate) : 'N/A',
        // Installation Date: Fecha de inspección inicial
        installationDate: firstInspection?.dateInspectionPerformed ? formatDate(firstInspection.dateInspectionPerformed) : 'N/A',
        // Final Invoice Date: Fecha del income final pagado
        finalInvoiceDate: finalIncome?.date ? formatDate(finalIncome.date) : 'N/A'
      });

      // Alternar colores de filas
      if (row.number % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' }
        };
      }
    });

    // Ajustar altura de filas
    worksheet.eachRow(row => {
      row.height = 20;
    });

    // Configurar respuesta
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=works-export-${Date.now()}.xlsx`
    );

    // Enviar archivo
    await workbook.xlsx.write(res);
    res.end();

    console.log(`✅ [Export Works] Excel generado y enviado`);
  } catch (error) {
    console.error('❌ [Export Works] Error:', error);
    res.status(500).json({
      error: 'Error al exportar works',
      details: error.message
    });
  }
};

// Helper para formatear fechas
const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}-${day}-${year}`;
};

module.exports = {
  exportWorksToExcel
};
