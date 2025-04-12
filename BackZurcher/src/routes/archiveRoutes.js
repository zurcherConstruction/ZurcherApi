const express = require("express");
const fs = require("fs");
const path = require("path");
const { getArchivedBudgets } = require("../controllers/archiveController");

const router = express.Router();


// Ruta para obtener la lista de archivos archivados
router.get("/", getArchivedBudgets);

// Ruta para obtener el contenido de un archivo JSON específico
router.get("/:folder/:file", (req, res) => {
    const { folder, file } = req.params;
    const filePath = path.join(__dirname, "../tasks/archives", folder, file);
  
    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Archivo no encontrado" });
    }
  
    // Leer el contenido del archivo
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        return res.status(500).json({ error: "Error al leer el archivo" });
      }
      res.json(JSON.parse(data)); // Devolver el contenido del archivo como JSON
    });
  });
  
module.exports = router;