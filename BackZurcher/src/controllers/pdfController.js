const fs = require('fs');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { Permit } = require('../data');
const { application } = require('express');
const moment = require('moment');

/* ----------------------------------------------------------------------
   Configuración de multer para almacenar el archivo en memoria
---------------------------------------------------------------------- */
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Solo se permiten archivos PDF'), false);
        }
        cb(null, true);
    }
});

/* ----------------------------------------------------------------------
   Función para limpiar el texto extraído
---------------------------------------------------------------------- */
const cleanText = (text) => {
    // Normaliza saltos de línea comunes
    text = text.replace(/\r\n|\r|\n/g, '\n');
    // Remueve saltos de línea ocultos (Unicode U+2028 o U+2029)
    text = text.replace(/[\u2028\u2029]/g, ' ');
    text = text.replace(/\s{2,}/g, ' ');
    text = text.replace(/[^\x20-\x7E\n]/g, '');
    return text.trim();
};

/* ----------------------------------------------------------------------
   Funciones de extracción condicional para los dos modelos
---------------------------------------------------------------------- */
// Modelo 1: se identifica, por ejemplo, que aparece "PEmxIT #:" en el texto
const extractModel1 = (text) => {
    const result = {};
    result.permitNumber = (text.match(/PEmxIT #:\s*(\S+)/i) || [])[1] || null;
    result.applicationNumber = (text.match(/ION #:\s*(\S+)/i) || [])[1] || null;
    // Se extrae el applicant suponiendo que está dentro de paréntesis después de "APPLICANT:"
    const applicantMatch = text.match(/APPLICANT:\s*\(([^)]+)\)/i);
    result.applicant = applicantMatch ? applicantMatch[1].trim() : null;
    // Para la dirección: suponemos que está entre "PROPERTY ADDRESS:" y "LOT:"
    const addrMatch = text.match(/PROPERTY ADDRESS:\s*(.*?)\s+LOT:/i);
    result.propertyAddress = addrMatch ? addrMatch[1].trim() : null;
    return result;
};

// Modelo 2: se usa el formato más estándar con etiquetas "APPLICATION #:" y "PERMIT #:"
const extractModel2 = (text) => {
    const result = {};
    result.permitNumber = (text.match(/PERMIT #:\s*(\S+)/i) || [])[1] || null;
    result.applicationNumber = (text.match(/APPLICATION #:\s*(\S+)/i) || [])[1] || null;
    // Se extrae applicant: el contenido luego de "APPLICANT:" hasta el salto de línea
    const applicantLine = text.match(/APPLICANT:\s*([^\n]+)/i);
    result.applicant = applicantLine ? applicantLine[1].trim() : null;
    // Se extrae la dirección: entre "PROPERTY ADDRESS:" y "LOT:"
    const addrMatch = text.match(/PROPERTY ADDRESS:\s*(.*?)\s+LOT:/i);
    result.propertyAddress = addrMatch ? addrMatch[1].trim() : null;
    return result;
};

// Función que decide qué modelo usar basándose en "huellas" en el texto
const extractDataConditional = (cleanedText) => {
    let result = {};
    if (cleanedText.includes("PEmxIT #:")) {
        console.log("Formato Modelo 1 detectado");
        result = extractModel1(cleanedText);
    } else {
        console.log("Formato Modelo 2 detectado");
        result = extractModel2(cleanedText);
    }
    console.log("Datos extraídos (condicional):", result);
    return result;
};

// Función de extracción complementaria para campos comunes basados en posiciones o patrones
const extractOtherFields = (cleanedText) => {
    let permitNumber = null;
    let applicationNumber = null;
    let constructionPermitFor = null;
    let dateIssued = null;
    let expirationDate = null;

    // Intentamos extraer utilizando alguna lógica basada en posiciones o patrones
    const finalInspectionIndex = cleanedText.indexOf('FINAL INSPECTION');
    if (finalInspectionIndex !== -1) {
        const linesFromInspection = cleanedText.substring(finalInspectionIndex).split('\n');
        if (linesFromInspection.length >= 5) {
            permitNumber = linesFromInspection[3]?.trim() || null;
            applicationNumber = linesFromInspection[4]?.trim() || null;
        }
    } else {
        const permitLineMatch = cleanedText.match(/PERMIT\s+#:\s*\n(.*?)\n/i);
        if (permitLineMatch && permitLineMatch.length > 1) {
            permitNumber = permitLineMatch[1].trim();
        }
    }
    console.log('Permit Number (pre-pattern):', permitNumber);
    const permitNumberMatch = cleanedText.match(/36-SN-\d+/);
    permitNumber = permitNumberMatch ? permitNumberMatch[0] : permitNumber;
    console.log('Permit Number (final):', permitNumber);

    // Expiration date (se asume formato MM/DD/YYYY o similar)
    const expirationSection = cleanedText.split("EXPIRATION DATE:")[1];
    console.log('expirationSection:', expirationSection);
    if (expirationSection) {
        const dates = expirationSection.match(/(\d{1,2}\/\d{1,2}\/\d{4})/g);
        console.log('Fechas encontradas:', dates);
        expirationDate = dates && dates.length >= 2 ? dates[1].trim() : null;
        console.log('expirationDate extraído:', expirationDate);
    }
    if (expirationDate) {
        const mexpirationDate = moment(expirationDate, 'DD/MM/YYYY', true);
        console.log('Fecha parseada:', mexpirationDate);
        expirationDate = mexpirationDate.isValid() ? mexpirationDate.format('YYYY-MM-DD') : null;
        console.log('expirationDate formateado:', expirationDate);
    }

    const applicationNumberMatch = cleanedText.match(/AP\d+/);
    applicationNumber = applicationNumberMatch ? applicationNumberMatch[0] : applicationNumber;
    console.log('Application Number:', applicationNumber);

    const lines = cleanedText.split('\n');
    constructionPermitFor = lines.length >= 106 ? lines[105].trim() : null;
    dateIssued = lines.length >= 41 ? lines[40].trim() : null;
    console.log('constructionPermitFor:', constructionPermitFor);
    console.log('dateIssued (raw):', dateIssued);
    if (dateIssued) {
        const mDateIssued = moment(dateIssued, 'DD/MM/YYYY', true);
        dateIssued = mDateIssued.isValid() ? mDateIssued.format('YYYY-MM-DD') : null;
    }
    console.log('dateIssued (formateado):', dateIssued);

    // Se puede incluir la extracción del bloque "EXCAVATION REQUIRED:" si fuese necesaria
    // Por ejemplo, para obtener datos adicionales relacionados con 'applicant' o 'propertyAddress'
    const excavationSection = cleanedText.split("EXCAVATION REQUIRED:")[1];
    console.log('excavationSection:', excavationSection);
    let excavationApplicant = null;
    let excavationPropertyAddress = null;
    if (excavationSection) {
        const excavationLines = excavationSection.split('\n').map(line => line.trim()).filter(line => line);
        console.log('Líneas de excavación:', excavationLines);
        excavationPropertyAddress = excavationLines.length >= 21 ? excavationLines[20] : null;
        console.log('PropertyAddress (excavation):', excavationPropertyAddress);
        const applicantLine = excavationLines.find(line => line.includes("(ALLIED REALTY"));
        if (applicantLine) {
            const match = applicantLine.match(/\(ALLIED REALTY.*?\)/);
            excavationApplicant = match ? match[0] : null;
        }
        console.log('Applicant (excavation):', excavationApplicant);
    }
    
    return {
        permitNumber,
        applicationNumber,
        expirationDate,
        constructionPermitFor,
        dateIssued,
        // Si en el conditional extraction ya se obtuvo applicant y propertyAddress, se pueden fusionar
        applicant: excavationApplicant,
        propertyAddress: excavationPropertyAddress
    };
};

/* ----------------------------------------------------------------------
   Función principal para extraer datos (fusiona resultados condicionales y comunes)
---------------------------------------------------------------------- */
const extractData = async (text) => {
    const cleanedText = cleanText(text);
    console.log('Texto limpio:', cleanedText);
    
    // Usamos la extracción condicional para datos básicos (según modelo detectado)
    let resultConditional = extractDataConditional(cleanedText);
    
    // Extraemos campos comunes que se obtienen mediante patrones o posiciones
    const otherFields = extractOtherFields(cleanedText);
    
    // Fusionamos los resultados; si hay conflicto, se puede definir un orden de precedencia
    return {
        ...otherFields,
        ...resultConditional,
        documentNumber: cleanedText.match(/DOCUMENT\s+#:(\S+)/i)?.[1]?.trim() || null,
        systemType: cleanedText.match(/A\s+TYPE\s+SYSTEM:(.+?)(?=I\s+CONFIGURATION:)/is)?.[1]?.trim() || null,
        configuration: cleanedText.match(/I\s+CONFIGURATION:(.+?)(?=LOCATION\s+OF\s+BENCHMARK:)/is)?.[1]?.trim() || null,
        locationBenchmark: cleanedText.match(/LOCATION\s+OF\s+BENCHMARK:(.+?)(?=ELEVATION\s+OF\s+PROPOSED)/is)?.[1]?.trim() || null,
        elevation: cleanedText.match(/ELEVATION\s+OF\s+PROPOSED\s+SYSTEM\s+SITE(.+?)(?=BOTTOM\s+OF\s+DRAINFIELD)/is)?.[1]?.trim() || null,
        drainfieldDepth: cleanedText.match(/BOTTOM\s+OF\s+DRAINFIELD\s+TO\s+BE(.+?)(?=FILL\s+REQUIRED:)/is)?.[1]?.trim() || null,
        fillRequired: cleanedText.match(/FILL\s+REQUIRED:(.+?)(?=SPECIFICATIONS\s+BY:)/is)?.[1]?.trim() || null,
        specificationsBy: cleanedText.match(/SPECIFICATIONS\s+BY:(.+?)(?=APPROVED\s+BY:)/is)?.[1]?.trim() || null,
        approvedBy: cleanedText.match(/APPROVED\s+BY:(.+?)(?=DATE\s+ISSUED:)/is)?.[1]?.trim() || null,
        greaseInterceptorCapacity: cleanedText.match(/GREASE\s+INTERCEPTOR\s+CAPACITY\s*[:\]]\s*(\d+)/i)?.[1]?.trim() || null,
        dosingTankCapacity: cleanedText.match(/DOSING\s+TANK\s+CAPACITY\s*[:\]]\s*(\d+)/i)?.[1]?.trim() || null,
        gpdCapacity: cleanedText.match(/\bGPD\s+CAPACITY\s*[:\]]\s*(\d+)/i)?.[1]?.trim() || null,
        squareFeetSystem: cleanedText.match(/\bSQUARE\s+FEET\s+SYSTEM\s*[:\]]\s*(\d+)/i)?.[1]?.trim() || null,
        other: (() => {
            const otherMatch = cleanedText.match(/PERMIT\s+#:\s*(\S+)/i)?.[1]?.trim();
            return otherMatch ? otherMatch.replace(/\n/g, ' ').trim() : null;
        })()
    };
};

/* ----------------------------------------------------------------------
   Función principal para procesar el PDF
---------------------------------------------------------------------- */
const processPdf = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No se recibió ningún archivo' });
    }
    try {
        // Extraer el texto del PDF usando pdf-parse
        const pdfData = await pdfParse(req.file.buffer);
        console.log('pdfData.text:', pdfData.text);
        const text = pdfData.text;
        const cleanedText = cleanText(text);
        console.log('Texto extraído:', cleanedText);
        
        // Guardar el texto extraído en un archivo para revisión o procesamiento futuro
        const outputPath = `${__dirname}/extracted.txt`;
        fs.writeFileSync(outputPath, cleanedText, 'utf-8');
        console.log('Texto guardado en:', outputPath);

        // Extraer los datos combinados
        const result = await extractData(cleanedText);
        console.log("Resultado final:", result);

        // Crear registro en la base de datos con los datos extraídos
        const permitData = await Permit.create({
            ...result,
            pdfData: req.file.buffer
        });

        res.json({
            message: 'PDF procesado correctamente',
            data: permitData
        });
    } catch (err) {
        console.error('Error procesando el PDF:', err);
        res.status(500).json({ message: 'Error al procesar el PDF' });
    }
};

module.exports = {
    upload,
    processPdf
};