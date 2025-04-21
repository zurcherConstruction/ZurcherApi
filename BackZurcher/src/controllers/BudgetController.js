const { Budget, Permit, Work, Income } = require('../data');
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
      const { date, expirationDate, price, initialPayment, status } = req.body; 

      if (!date && !price && !initialPayment && !status && !expirationDate) {
        return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
      }
  
      let budget; // Definir budget fuera del if para usarlo después

      // Validar que el COMPROBANTE esté cargado si el estado es "approved"
      if (status === "approved") {
        budget = await Budget.findByPk(idBudget); // Obtener el budget aquí
        // Asegúrate que 'paymentInvoice' es el campo correcto para la URL del COMPROBANTE
        if (!budget || !budget.paymentInvoice) { 
          return res.status(400).json({ error: 'Debe cargar el comprobante de pago antes de aprobar el presupuesto.' });
        }
      }

      // Actualizar presupuesto
      const [updated] = await Budget.update(
        // No incluyas paymentInvoice aquí si solo se actualiza en la ruta de subida
        { date, expirationDate, price, initialPayment, status }, 
        { where: { idBudget } }
      );

      if (!updated) {
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }
  
      // --- LÓGICA AL APROBAR ---
      if (status === "approved") {
        // Si no obtuvimos el budget antes, obtenerlo ahora
        if (!budget) {
          budget = await Budget.findByPk(idBudget);
        }
        
        if (!budget) {
           // Esto no debería pasar si updated fue exitoso, pero por seguridad
           console.error(`Error: Budget con ID ${idBudget} no encontrado después de actualizar.`);
           return res.status(404).json({ error: 'Presupuesto no encontrado después de actualizar.' });
        }

        let workRecord; // Para guardar la referencia al Work creado o existente

        // Verificar si ya existe un Work asociado
        const existingWork = await Work.findOne({ where: { idBudget: budget.idBudget } });
      
        if (!existingWork) {
          console.log(`Creando Work para Budget ID: ${budget.idBudget}`);
          workRecord = await Work.create({
            propertyAddress: budget.propertyAddress,
            status: 'pending', // O el estado inicial que corresponda
            idBudget: budget.idBudget,
            notes: `Work creado a partir del presupuesto N° ${budget.idBudget}`,
            initialPayment: budget.initialPayment, // Guardar el pago inicial en Work también puede ser útil
            // Asegúrate de incluir otros campos necesarios para Work si los hay
          });
          console.log(`Work creado con ID: ${workRecord.idWork}`);

          // --- CREAR REGISTRO DE INGRESO (Income) ---
          try {
            console.log(`Creando Income para Work ID: ${workRecord.idWork}`);
            await Income.create({
              date: new Date(), // Usar la fecha actual para el ingreso
              amount: budget.initialPayment, // El monto del pago inicial
              typeIncome: 'Factura Pago Inicial Budget', // Tipo específico
              notes: `Pago inicial recibido para Budget #${budget.idBudget}`,
              workId: workRecord.idWork // Asociar al Work recién creado
            });
            console.log(`Income creado exitosamente para Work ID: ${workRecord.idWork}`);
          } catch (incomeError) {
            // Manejar error si falla la creación del Income
            console.error(`Error al crear el registro Income para Work ID ${workRecord.idWork}:`, incomeError);
            // Considera qué hacer si falla: ¿revertir algo? ¿solo loggear?
            // Por ahora, solo logueamos y continuamos.
          }
          // --- FIN CREAR INGRESO ---

        } else {
          console.log(`Work ya existente para Budget ID: ${budget.idBudget}, ID: ${existingWork.idWork}`);
          workRecord = existingWork; 
          // Podrías verificar si ya existe un Income para este pago inicial y evitar duplicados
          const existingIncome = await Income.findOne({
            where: {
              workId: workRecord.idWork,
              typeIncome: 'Factura Pago Inicial Budget' 
              // Podrías añadir más condiciones si es necesario para identificarlo unívocamente
            }
          });
          if (!existingIncome) {
             console.warn(`Advertencia: Work ${workRecord.idWork} existía pero no se encontró Income de pago inicial. Creando ahora.`);
             // Intentar crear el Income si no existía (situación anómala)
             try {
               await Income.create({
                 date: new Date(), 
                 amount: budget.initialPayment, 
                 typeIncome: 'Factura Pago Inicial Budget', 
                 notes: `Pago inicial (creado tardíamente) para Budget #${budget.idBudget}`,
                 workId: workRecord.idWork 
               });
             } catch (lateIncomeError) {
                console.error(`Error al crear registro Income tardío para Work ID ${workRecord.idWork}:`, lateIncomeError);
             }
          }
        }
      }
      // --- FIN LÓGICA AL APROBAR ---
      
      // Devolver el presupuesto actualizado (puede que no tenga el Work asociado si no se incluyó)
      const updatedBudget = await Budget.findByPk(idBudget); 
      res.status(200).json(updatedBudget);
    } catch (error) {
      console.error('Error al actualizar el presupuesto:', error);
      res.status(400).json({ error: error.message });
    }
  },

  async uploadInvoice(req, res) { // Considera renombrar esta función a uploadPaymentProof para claridad
    try {
      const { idBudget } = req.params;

      // Verificar si el archivo fue recibido
      console.log("ID del presupuesto recibido:", idBudget);
      console.log("Archivo recibido:", req.file);

      if (!req.file) {
        // Esta ruta debe usar el middleware 'upload' de multer.js
        return res.status(400).json({ error: 'No se recibió ningún archivo de comprobante' }); 
      }

      // --- 1. Determinar el tipo de archivo ---
      let proofType;
      if (req.file.mimetype.startsWith('image/')) {
        proofType = 'image';
      } else if (req.file.mimetype === 'application/pdf') {
        proofType = 'pdf';
      } else {
        // Salvaguarda por si el filtro de Multer falla
        console.log("Tipo de archivo no soportado:", req.file.mimetype);
        return res.status(400).json({ error: 'Tipo de archivo de comprobante no soportado (PDF o Imagen requeridos)' });
      }
      console.log("Tipo de archivo determinado:", proofType);
      // --- Fin Determinar tipo ---

      const buffer = req.file.buffer;
      // Nombres genéricos para comprobantes
      const fileName = `payment_proof_${idBudget}_${Date.now()}`; 
      const folderName = 'payment_proofs'; // Carpeta genérica
      console.log("Nombre del archivo:", fileName);
      console.log("Carpeta de destino en Cloudinary:", folderName);

      // Subir a Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type:proofType === 'pdf' ? 'raw' : 'image', // 'auto' para PDF o Imagen
            folder: folderName,
            public_id: fileName,
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary error:', error); 
              reject(error);
            } else {
              console.log("Resultado de la subida a Cloudinary:", result);
              resolve(result);
            }
          }
        ).end(buffer);
      });

      // Buscar presupuesto
      console.log("Buscando presupuesto con ID:", idBudget);
      const budget = await Budget.findByPk(idBudget);
      if (!budget) {
        console.log("Presupuesto no encontrado. Eliminando archivo de Cloudinary...");
        try { 
          await cloudinary.uploader.destroy(uploadResult.public_id, { resource_type: uploadResult.resource_type || 'raw' }); 
        } catch (e) {
          console.error("Error al eliminar archivo de Cloudinary:", e);
        }
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }
      console.log("Presupuesto encontrado:", budget);

      // --- 2. Guardar URL y TIPO ---
      budget.paymentInvoice = uploadResult.secure_url; // Guarda URL en este campo
      budget.paymentProofType = proofType;             // Guarda TIPO en el nuevo campo
      await budget.save();
      console.log("Presupuesto actualizado con comprobante:", budget);
      // --- Fin Guardar ---

      res.status(200).json({
        message: 'Comprobante de pago cargado exitosamente', // Mensaje actualizado
        cloudinaryUrl: uploadResult.secure_url,
        proofType: proofType // Devuelve el tipo (opcional)
      });
    } catch (error) {
      console.error('Error al subir el comprobante de pago:', error); // Mensaje actualizado
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
