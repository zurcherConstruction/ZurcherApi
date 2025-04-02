const fs = require("fs");
const path = require("path");

const getArchivedBudgets = (req, res) => {
  const archivesPath = path.join(__dirname, "../tasks/archives");

  // Leer las carpetas de archivos archivados
  fs.readdir(archivesPath, { withFileTypes: true }, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Error al leer las carpetas" });
    }

    // Filtrar solo carpetas y devolver su contenido
    const folders = files
      .filter((file) => file.isDirectory())
      .map((folder) => {
        const folderPath = path.join(archivesPath, folder.name);
        const filesInFolder = fs.readdirSync(folderPath).map((file) => ({
          name: file,
          path: `/archives/${folder.name}/${file}`, // Ruta relativa para acceder al archivo
        }));
        return { folder: folder.name, files: filesInFolder };
      });

    res.json(folders);
  });
};

module.exports = { getArchivedBudgets };