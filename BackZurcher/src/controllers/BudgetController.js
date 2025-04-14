const { Budget, Permit, Work } = require('../data');
const { cloudinary } = require('../utils/cloudinaryConfig.js');

const BudgetController = {
  async createBudget(req, res) {
    try {
      console.log("Cuerpo de la solicitud recibido:", req.body);

      // Validar si el cuerpo de la solicitud está vacío
      if (!req.body) {
        return res.status(400).json({ error: "El cuerpo de la solicitud está vacío." });
      }

      const {
        date,
        expirationDate,
        price,
        initialPayment,
        status,
        applicantName,
        propertyAddress,
        systemType,
        drainfieldDepth,
        gpdCapacity,
      } = req.body;

      // Validar campos obligatorios
      if (
        !date ||
        !price ||
        !initialPayment ||
        !status ||
        !applicantName ||
        !propertyAddress||
        !systemType ||
        !drainfieldDepth ||
        !gpdCapacity
      ) {
        return res.status(400).json({ error: "Faltan campos obligatorios." });
      }

        // Verificar si ya existe un presupuesto con la misma dirección de propiedad
    const existingBudget = await Budget.findOne({ where: { propertyAddress } });
    if (existingBudget) {
      return res.status(400).json({
        error: "Ya existe un presupuesto para esta dirección de propiedad.",
      });
    }


      // Verificar si el propertyAddress existe en Permit
      const permit = await Permit.findOne({ where: { propertyAddress } });
      if (!permit) {
        return res
          .status(404)
          .json({ error: "No se encontró un permiso con esa dirección de propiedad." });
      }

      console.log("Permiso encontrado:", permit);

      // Crear presupuesto
      const budget = await Budget.create({
        date,
        expirationDate,
        price,
        initialPayment,
        status,
        applicantName,
        propertyAddress,
        systemType,
        drainfieldDepth,
        gpdCapacity

      });

      console.log("Presupuesto creado:", budget);

      res.status(201).json(budget);
    } catch (error) {
      console.error("Error al crear el presupuesto:", error);
      res.status(400).json({ error: error.message });
    }
  },

 
  async getBudgets(req, res) {
    try {
      // Incluir el modelo Permit para obtener el campo propertyAddress
      const budgets = await Budget.findAll({
        include: {
          model: Permit,
          attributes: ['propertyAddress'], // Solo incluye el campo propertyAddress
        },
      });

      res.status(200).json(budgets);
    } catch (error) {
      console.error('Error al obtener los presupuestos:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async getBudgetById(req, res) {
    try {
      const budget = await Budget.findByPk(req.params.idBudget, {
        include: {
          model: Permit,
          attributes: ['propertyAddress', 'permitNumber'], // Incluye los campos que necesitas
        },
      });
  
      if (!budget) {
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }
  
      res.status(200).json(budget);
    } catch (error) {
      console.error('Error al obtener el presupuesto:', error);
      res.status(500).json({ error: error.message });
    }
  },

  
  async updateBudget(req, res) {
    try {
      const { idBudget } = req.params;
      const { date, expirationDate, price, initialPayment, status, paymentInvoice } = req.body;

      // Validar campos obligatorios
      if (!date && !price && !initialPayment && !status && !expirationDate) {
        return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
      }
  
      // Validar que la factura esté cargada si el estado es "approved"
      if (status === "approved") {
        const budget = await Budget.findByPk(idBudget);
        if (!budget.paymentInvoice && !paymentInvoice) {
          return res.status(400).json({ error: 'Debe cargar la factura antes de aprobar el presupuesto.' });
        }
      }

      // Actualizar presupuesto
      const [updated] = await Budget.update(
        { date, expirationDate, price, initialPayment, status, paymentInvoice },
        { where: { idBudget } }
      );

      if (!updated) {
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }
  
      if (status === "approved") {
        const budget = await Budget.findByPk(idBudget);
      
        // Verificar si ya existe un Work asociado
        const existingWork = await Work.findOne({ where: { idBudget: budget.idBudget } });
      
        if (!existingWork) {
          await Work.create({
            propertyAddress: budget.propertyAddress,
            status: 'pending',
            idBudget: budget.idBudget, // Asegúrate de que este campo se esté asignando correctamente
            notes: `Work creado a partir del presupuesto N° ${budget.idBudget}`,
            initialPayment: budget.initialPayment,
          });
        }
      }
      

      const updatedBudget = await Budget.findByPk(idBudget);
      res.status(200).json(updatedBudget);
    } catch (error) {
      console.error('Error al actualizar el presupuesto:', error);
      res.status(400).json({ error: error.message });
    }
  },

  async uploadInvoice(req, res) {
    try {
      const { idBudget } = req.params;
  
      if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo' });
      }
  
      const buffer = req.file.buffer;
      const fileName = `factura_${idBudget}_${Date.now()}`;
  
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'raw',
            folder: 'facturas',
            public_id: fileName,
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary error:', error); // <- Agregado
              reject(error);
            } else {
              resolve(result);
            }
          }
        ).end(buffer);
      });
  
      const budget = await Budget.findByPk(idBudget);
      if (!budget) {
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }
  
      budget.paymentInvoice = uploadResult.secure_url;
      await budget.save();
  
      res.status(200).json({
        message: 'Factura cargada exitosamente',
        cloudinaryUrl: uploadResult.secure_url,
      });
    } catch (error) {
      console.error('Error al subir la factura:', error);
      res.status(500).json({ error: error.message });
    }
  },
  

  
  async deleteBudget(req, res) {
    try {
      const { idBudget } = req.params;

      // Eliminar presupuesto
      const deleted = await Budget.destroy({ where: { idBudget } });
      if (!deleted) {
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error al eliminar el presupuesto:', error);
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = BudgetController;
