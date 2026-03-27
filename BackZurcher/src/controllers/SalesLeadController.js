const { SalesLead, LeadNote, Budget, Staff, sequelize } = require('../data');
const { Op } = require('sequelize');

const SalesLeadController = {
  
  // 📝 Crear un nuevo lead
  async createLead(req, res) {
    try {
      const {
        applicantName,
        applicantEmail,
        applicantPhone,
        propertyAddress,
        status,
        priority,
        tags,
        source,
        serviceType,
        estimatedValue,
        notes
      } = req.body;
      
      const createdBy = req.user?.id;

      // Validaciones
      if (!applicantName) {
        return res.status(400).json({ 
          error: 'El nombre del cliente es obligatorio' 
        });
      }

      // Crear el lead
      const lead = await SalesLead.create({
        applicantName: applicantName.trim(),
        applicantEmail: applicantEmail?.trim() || null,
        applicantPhone: applicantPhone?.trim() || null,
        propertyAddress: propertyAddress?.trim() || null,
        status: status || 'new',
        priority: priority || 'medium',
        tags: tags || [],
        source: source || 'website',
        serviceType: serviceType?.trim() || null,
        estimatedValue: estimatedValue || null,
        notes: notes?.trim() || null,
        firstContactDate: status === 'contacted' ? new Date() : null,
        lastActivityDate: new Date(),
        createdBy
      });

      // Cargar el lead con relaciones
      const leadWithCreator = await SalesLead.findByPk(lead.id, {
        include: [
          {
            model: Staff,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      res.status(201).json({
        message: 'Lead creado exitosamente',
        lead: leadWithCreator
      });

    } catch (error) {
      console.error('Error al crear lead:', error);
      res.status(500).json({ 
        error: 'Error al crear el lead',
        details: error.message 
      });
    }
  },

  // � Verificar si ya existe un lead con esa dirección
  async checkLeadByAddress(req, res) {
    try {
      const { propertyAddress } = req.query;
      if (!propertyAddress?.trim()) {
        return res.status(400).json({ error: 'propertyAddress es requerida' });
      }

      const existingLead = await SalesLead.findOne({
        where: { propertyAddress: propertyAddress.trim() },
        attributes: ['id', 'applicantName', 'applicantPhone', 'status', 'priority', 'lastActivityDate']
      });

      if (!existingLead) {
        return res.status(200).json({ exists: false });
      }

      return res.status(200).json({
        exists: true,
        lead: existingLead
      });
    } catch (error) {
      console.error('Error al verificar lead por dirección:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // �📋 Listar leads con filtros y paginación
  async getLeads(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        status,
        priority,
        search,
        tags,
        source,
        sortBy = 'lastActivityDate',
        sortOrder = 'DESC'
      } = req.query;

      // Construir filtros
      const whereClause = {};

      if (status && status !== 'all') {
        whereClause.status = status;
      }

      if (priority && priority !== 'all') {
        whereClause.priority = priority;
      }

      if (source && source !== 'all') {
        whereClause.source = source;
      }

      if (tags) {
        // Buscar leads que contengan al menos uno de los tags
        const tagsArray = Array.isArray(tags) ? tags : [tags];
        whereClause.tags = {
          [Op.overlap]: tagsArray
        };
      }

      if (search) {
        whereClause[Op.or] = [
          { applicantName: { [Op.iLike]: `%${search}%` } },
          { applicantEmail: { [Op.iLike]: `%${search}%` } },
          { applicantPhone: { [Op.iLike]: `%${search}%` } },
          { propertyAddress: { [Op.iLike]: `%${search}%` } },
          { serviceType: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Paginación
      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      // Consulta
      const { count, rows: leads } = await SalesLead.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Staff,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Budget,
            as: 'convertedBudget',
            attributes: ['idBudget', 'propertyAddress', 'status']
          }
        ],
        order: [[sortBy, sortOrder]],
        limit,
        offset
      });

      // Estadísticas
      const stats = await SalesLead.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      const statsMap = {
        new: 0,
        contacted: 0,
        interested: 0,
        quoted: 0,
        negotiating: 0,
        won: 0,
        lost: 0,
        archived: 0
      };

      stats.forEach(stat => {
        statsMap[stat.status] = parseInt(stat.count);
      });

      res.json({
        leads,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(count / parseInt(pageSize)),
        stats: statsMap
      });

    } catch (error) {
      console.error('Error al obtener leads:', error);
      res.status(500).json({ 
        error: 'Error al obtener los leads',
        details: error.message 
      });
    }
  },

  // 🔍 Obtener un lead por ID
  async getLeadById(req, res) {
    try {
      const { id } = req.params;

      const lead = await SalesLead.findByPk(id, {
        include: [
          {
            model: Staff,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Budget,
            as: 'convertedBudget',
            attributes: ['idBudget', 'propertyAddress', 'status', 'totalAmount']
          },
          {
            model: LeadNote,
            as: 'leadNotes',
            include: [
              {
                model: Staff,
                as: 'author',
                attributes: ['id', 'name', 'email']
              }
            ],
            order: [['createdAt', 'DESC']]
          }
        ]
      });

      if (!lead) {
        return res.status(404).json({ 
          error: 'Lead no encontrado' 
        });
      }

      res.json({ lead });

    } catch (error) {
      console.error('Error al obtener lead:', error);
      res.status(500).json({ 
        error: 'Error al obtener el lead',
        details: error.message 
      });
    }
  },

  // ✏️ Actualizar un lead
  async updateLead(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const lead = await SalesLead.findByPk(id);
      
      if (!lead) {
        return res.status(404).json({ 
          error: 'Lead no encontrado' 
        });
      }

      // Si cambia a 'contacted' y no tiene firstContactDate, establecerla
      if (updates.status === 'contacted' && !lead.firstContactDate) {
        updates.firstContactDate = new Date();
      }

      // Actualizar lastActivityDate
      updates.lastActivityDate = new Date();

      await lead.update(updates);

      // Recargar con relaciones
      const updatedLead = await SalesLead.findByPk(id, {
        include: [
          {
            model: Staff,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Budget,
            as: 'convertedBudget',
            attributes: ['idBudget', 'propertyAddress', 'status']
          }
        ]
      });

      res.json({
        message: 'Lead actualizado exitosamente',
        lead: updatedLead
      });

    } catch (error) {
      console.error('Error al actualizar lead:', error);
      res.status(500).json({ 
        error: 'Error al actualizar el lead',
        details: error.message 
      });
    }
  },

  // 🗑️ Archivar un lead
  async archiveLead(req, res) {
    try {
      const { id } = req.params;

      const lead = await SalesLead.findByPk(id);
      
      if (!lead) {
        return res.status(404).json({ 
          error: 'Lead no encontrado' 
        });
      }

      await lead.update({ 
        status: 'archived',
        lastActivityDate: new Date()
      });

      res.json({
        message: 'Lead archivado exitosamente',
        lead
      });

    } catch (error) {
      console.error('Error al archivar lead:', error);
      res.status(500).json({ 
        error: 'Error al archivar el lead',
        details: error.message 
      });
    }
  },

  // 🔄 Convertir lead a presupuesto
  async convertToBudget(req, res) {
    try {
      const { id } = req.params;
      const { budgetData } = req.body;

      const lead = await SalesLead.findByPk(id);
      
      if (!lead) {
        return res.status(404).json({ 
          error: 'Lead no encontrado' 
        });
      }

      if (lead.status === 'won' && lead.convertedToBudgetId) {
        return res.status(400).json({ 
          error: 'Este lead ya fue convertido a presupuesto',
          budgetId: lead.convertedToBudgetId
        });
      }

      // Crear el presupuesto con los datos del lead
      const budget = await Budget.create({
        propertyAddress: lead.propertyAddress || '',
        clientName: lead.applicantName,
        clientEmail: lead.applicantEmail,
        clientPhone: lead.applicantPhone,
        status: budgetData?.status || 'draft',
        ...budgetData
      });

      // Actualizar el lead
      await lead.update({
        status: 'won',
        convertedToBudgetId: budget.idBudget,
        conversionDate: new Date(),
        lastActivityDate: new Date()
      });

      // Crear una nota automática
      await LeadNote.create({
        leadId: lead.id,
        staffId: req.user?.id,
        message: `✅ Lead convertido a presupuesto #${budget.idBudget}`,
        noteType: 'status_change',
        priority: 'medium',
        relatedStatus: 'won'
      });

      res.json({
        message: 'Lead convertido exitosamente a presupuesto',
        lead,
        budget
      });

    } catch (error) {
      console.error('Error al convertir lead:', error);
      res.status(500).json({ 
        error: 'Error al convertir el lead a presupuesto',
        details: error.message 
      });
    }
  },

  // 📊 Dashboard de estadísticas
  async getDashboardStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const whereClause = {};
      
      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      // Stats por estado
      const statsByStatus = await SalesLead.findAll({
        where: whereClause,
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('estimated_value')), 'totalValue']
        ],
        group: ['status'],
        raw: true
      });

      // Stats por prioridad
      const statsByPriority = await SalesLead.findAll({
        where: whereClause,
        attributes: [
          'priority',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['priority'],
        raw: true
      });

      // Stats por fuente
      const statsBySource = await SalesLead.findAll({
        where: whereClause,
        attributes: [
          'source',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['source'],
        raw: true
      });

      // Tasa de conversión
      const totalLeads = await SalesLead.count({ where: whereClause });
      const wonLeads = await SalesLead.count({ 
        where: { ...whereClause, status: 'won' } 
      });
      const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

      res.json({
        statsByStatus,
        statsByPriority,
        statsBySource,
        totals: {
          total: totalLeads,
          won: wonLeads,
          conversionRate: conversionRate.toFixed(2)
        }
      });

    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({ 
        error: 'Error al obtener estadísticas',
        details: error.message 
      });
    }
  }
};

module.exports = SalesLeadController;
