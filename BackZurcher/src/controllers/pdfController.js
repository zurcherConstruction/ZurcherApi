const fs = require("fs");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { Permit } = require("../data");
const moment = require("moment");

const { extractWithPdfJs } = require("./extractWithPdfJs");

/* ----------------------------------------------------------------------
   Configuración de multer para almacenar el archivo en memoria
---------------------------------------------------------------------- */
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Solo se permiten archivos PDF"), false);
    }
    cb(null, true);
  },
});

/* ----------------------------------------------------------------------
   Función para limpiar el texto extraído
---------------------------------------------------------------------- */
const cleanText = (text) => {
  return text
    .replace(/\r\n|\r|\n/g, " ")
    .replace(/[\u2028\u2029]/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
};

/* ----------------------------------------------------------------------
   Función para extraer datos genéricos
---------------------------------------------------------------------- */
const extractData = async (text) => {
  const result = {};
  const index500 = text.indexOf("500");
  if (index500 !== -1) {
    const contextStart = Math.max(0, index500 - 50);
    const contextEnd = Math.min(text.length, index500 + 50);
    console.log("Contexto alrededor de 500:", text.substring(contextStart, contextEnd));
  } else {
    console.log("No se encontró '500' en el texto.");
  }
  // Debug del texto completo
  console.log("=== TEXTO COMPLETO ===");
  console.log("Texto recibido para la extracción:", text);
  console.log("=== FIN TEXTO COMPLETO ===");
  if (/500/.test(text)) {
    console.log("Se encontró '500'");
  } else {
    console.log("No se encontró '500'");
  }
  // Datos básicos
  result.permitNumber =
    text.match(/PERMIT #:\s*(.+?)(?=\s|$)/i)?.[1]?.trim() || null;
  result.applicationNumber =
    text.match(/APPLICATION #:\s*(.+?)(?=\s|$)/i)?.[1]?.trim() || null;
  result.applicant =
    text.match(/APPLICANT:\s*(.+?)(?=\sPROPERTY ADDRESS:|$)/i)?.[1]?.trim() ||
    null;
  result.propertyAddress =
    text.match(/PROPERTY ADDRESS:\s*(.+?)(?=\sLOT:|$)/i)?.[1]?.trim() || null;
  result.lot = text.match(/LOT:\s*(\d+)/i)?.[1]?.trim() || null;
  result.block = text.match(/BLOCK:\s*(\d+)/i)?.[1]?.trim() || null;
  result.systemType =
    text.match(/Class I NSF245 ATU Tank/i)?.[0]?.trim() || null;

    result.gpdCapacity =
   
    text.match(/CONSTRUCTION NON-COMPLIANCE DATE:\s*\/\s*GPD\s*CAPACITY\s*(\d+)/i)?.[1]?.trim() ||
    null;
  
  // Extrae drainfieldDepth: busca "D SQUARE FEET" seguido de espacios y el número
  result.drainfieldDepth =
    
    text.match(/SQUARE\s*FEET\s*(\d+)/i)?.[1]?.trim() ||
    null;63.


  const expirationDateMatch = text.match(
    /EXPIRATION DATE:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
  );
  if (expirationDateMatch) {
    const parsedDate = moment(expirationDateMatch[1], "MM/DD/YYYY", true);
    result.expirationDate = parsedDate.isValid()
      ? parsedDate.format("YYYY-MM-DD")
      : null;
  }

  // const dateIssuedMatch = text.match(
  //   /DATE ISSUED:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
  // );
  // if (dateIssuedMatch) {
  //   const parsedDate = moment(dateIssuedMatch[1], "MM/DD/YYYY", true);
  //   result.dateIssued = parsedDate.isValid()
  //     ? parsedDate.format("YYYY-MM-DD")
  //     : null;
  // }

  // Otros campos
  result.excavationRequired =
    text.match(/EXCAVATION REQUIRED:\s*(\d+)/i)?.[1] || null;

  // Log final de resultados
  console.log("=== DATOS EXTRAÍDOS ===");
  console.log(JSON.stringify(result, null, 2));
  console.log("=== FIN DATOS EXTRAÍDOS ===");
  
  return result;
};

/* ----------------------------------------------------------------------
   Función de debug
---------------------------------------------------------------------- */
const debugExtraction = (text) => {
  const lines = text.split("\n");
  console.log("\n=== INICIO DEBUG EXTRACCIÓN ===");
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed) {
      console.log(`Línea ${index + 1}: "${trimmed}"`);
    }
  });
  console.log("=== FIN DEBUG EXTRACCIÓN ===\n");
};

/* ----------------------------------------------------------------------
   Función principal para procesar el PDF
---------------------------------------------------------------------- */
const processPdf = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No se recibió ningún archivo" });
  }

  try {
    console.log("=== INICIO PROCESAMIENTO PDF ===");
    console.log("Archivo recibido:", req.file.originalname);

    const extractedData = await extractWithPdfJs(req.file.buffer);

    // Debug de campos específicos
    console.log("Verificando campos específicos:");
    console.log("- gpdCapacity:", extractedData.gpdCapacity || "no encontrado");
    console.log(
      "- drainfieldDepth:",
      extractedData.drainfieldDepth || "no encontrado"
    );

    if (!extractedData.applicationNumber) {
      return res.status(400).json({
        message: "No se pudieron extraer todos los datos necesarios",
        extractedData,
      });
    }

    res.json({
      message: "PDF procesado correctamente",
      data: extractedData,
    });

    console.log("=== FIN PROCESAMIENTO PDF ===");
  } catch (err) {
    console.error("Error procesando el PDF:", err);
    res.status(500).json({ message: "Error al procesar el PDF" });
  }
};

module.exports = {
  upload,
  processPdf,
};