const moment = require('moment');

const extractWithPdfJs = async (buffer) => {
    const { default: pdfjsLib } = await import('pdfjs-dist/legacy/build/pdf.js');
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    const lines = {};
    let previousLine = null; // Variable para almacenar la línea anterior

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        textContent.items.forEach(item => {
            const y = item.transform[5]; // Coordenada Y
            const text = item.str.trim(); // Texto extraído
            if (!lines[y]) lines[y] = [];
            lines[y].push(text);
        });
    }

    // Ordenar las líneas por coordenada Y (de arriba hacia abajo)
    const sortedY = Object.keys(lines).sort((a, b) => b - a);
    const linesArray = sortedY.map(y => lines[y].join(' '));

    // Log para depurar las líneas extraídas
    console.log('Líneas extraídas del PDF:', linesArray);

    const result = {};

    // Procesar cada línea para extraer datos
    linesArray.forEach((line, index) => {
        console.log('Procesando línea:', line); // Log para depurar cada línea

        // Capturar permitNumber
        if (/PERMIT #/i.test(line)) {
            const candidate = linesArray[index - 1]?.trim(); // El valor está en la línea anterior
            if (/^\d{2}-[A-Z]{2}-\d{7}$/i.test(candidate)) { // Validar formato esperado
                result.permitNumber = candidate;
            }
        }

        // Capturar applicationNumber
        if (/APPLICATION #/i.test(line)) {
            const candidate = linesArray[index + 1]?.trim(); // El valor está en la línea siguiente
            if (/^[A-Z0-9]+$/i.test(candidate)) { // Validar formato esperado
                result.applicationNumber = candidate;
            }
        }

        // Capturar documentNumber
        if (/DOCUMENT #/i.test(line)) {
            const match = line.match(/DOCUMENT #\s*:? ?([A-Z0-9\-]+)/i);
            if (match) {
                result.documentNumber = match[1];
            }
        }

        // Capturar constructionPermitFor
        if (/CONSTRUCTION PERMIT FOR/i.test(line)) {
            const candidate = linesArray[index + 1]?.trim(); // El valor está en la línea siguiente
            if (candidate && candidate.length < 50) { // Validar longitud razonable
                result.constructionPermitFor = candidate;
            }
        }

        // Capturar applicant
        if (/APPLICANT/i.test(line)) {
            const candidate = linesArray[index + 1]?.trim(); // El valor está en la línea siguiente
            if (candidate && /^\(.*\)$/i.test(candidate)) { // Validar que el valor esté entre paréntesis
                result.applicant = candidate;
            }
        }

        // Capturar propertyAddress
        if (/PROPERTY ADDRESS/i.test(line)) {
            result.propertyAddress = linesArray[index + 1]?.trim(); // El valor está en la línea siguiente
        }

        // Capturar lot y block
        if (/LOT:\s*BLOCK:/i.test(line)) {
            const candidate = linesArray[index + 1]?.trim(); // El valor está en la línea siguiente
            const match = candidate.match(/(\d+)\s+(\d+)/); // Buscar dos números separados por espacios
            if (match) {
                result.lot = match[1];
                result.block = match[2];
                console.log('Capturado lot y block:', result.lot, result.block);
            }
        }

        // Capturar gpdCapacity
        if (/GALLONS\s*\/\s*GPD CAPACITY/i.test(line)) {
            const candidate = linesArray[index + 1]?.trim(); // El valor está en la línea siguiente
            if (/^\d+$/.test(candidate)) { // Validar que sea un número
                result.gpdCapacity = candidate;
                console.log('Capturado gpdCapacity:', result.gpdCapacity);
            }
        }

        // Capturar excavationRequired
        if (/D FILL\s*REQUIRED/i.test(line)) {
            const candidate = linesArray[index + 1]?.trim(); // El valor está en la línea siguiente
            const match = candidate.match(/\d+\.\d+\s+(\d+\.\d+)/); // Buscar el segundo número decimal
            if (match) {
                result.excavationRequired = parseInt(match[1], 10); // Convertir a entero
                console.log('Capturado excavationRequired:', result.excavationRequired);
            }
        }

        // Capturar systemType
        if (/Class I NSF245 ATU Tank/i.test(line)) {
            result.systemType = 'Class I NSF245 ATU Tank';
        }

        // Capturar excavationRequired
        if (/EXCAVATION REQUIRED/i.test(line)) {
            console.log('Línea con EXCAVATION REQUIRED encontrada:', line);
            const match = line.match(/(\d+)\s*INCHES/i);
            if (match) {
                result.excavationRequired = match[1];
                console.log('Capturado excavationRequired:', result.excavationRequired);
            }
        }

        if (/DATE ISSUED:\s*EXPIRATION DATE:/i.test(line)) {
            const dateIssued = linesArray[index + 1]?.trim(); // La fecha está en la línea siguiente
            const expirationDate = linesArray[index + 2]?.trim(); // La fecha está dos líneas después

            if (moment(dateIssued, 'MM/DD/YYYY', true).isValid()) {
                result.dateIssued = moment(dateIssued, 'MM/DD/YYYY').format('YYYY-MM-DD');
                console.log('Capturado dateIssued:', result.dateIssued);
            }

            if (moment(expirationDate, 'MM/DD/YYYY', true).isValid()) {
                result.expirationDate = moment(expirationDate, 'MM/DD/YYYY').format('YYYY-MM-DD');
                console.log('Capturado expirationDate:', result.expirationDate);
            }
        }
        // Actualizar la línea anterior
        previousLine = line;
    });

    // Log para depurar los datos extraídos
    console.log('Datos extraídos del PDF:', result);

    return result;
};

module.exports = { extractWithPdfJs };