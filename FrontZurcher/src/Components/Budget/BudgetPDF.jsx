import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import PropTypes from "prop-types";
import logo from "../../../public/logo.png"; // Asegúrate de que la ruta sea correcta

const BudgetPDF = ({ budget, editMode = false }) => {
  const generatePDF = (budget) => {
    if (!budget || !budget.applicantName) {
      console.error(
        "El objeto budget no tiene las propiedades necesarias:",
        budget
      );
      return null;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    };

    // Función para agregar contenido a una página
    const addPageContent = (language, pageType) => {
      doc.addImage(logo, "PNG", 10, 10, 30, 30);
      doc.line(10, 40, pageWidth - 10, 40);

      doc.setFontSize(10);
      doc.setFont("helvetica");
      doc.text("Zurcher Construction", 10, 45);
      doc.setFont("helvetica", "normal");
      doc.text("Septic Tank Division - CFC1433240", 10, 50);
      doc.text("zurcherseptic@gmail.com", 10, 55);
      doc.text("+1 (407) 419-4495", 10, 60);

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(
        `${language === "es" ? "Presupuesto N°" : "Budget No."}: ${
          budget.idBudget
        }`,
        pageWidth - 10,
        20,
        { align: "right" }
      );

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Date: ${formatDate(budget.date)}`, pageWidth - 10, 28, {
        align: "right",
      });
      doc.text(
        `${language === "es" ? "Validez" : "Validity"}: ${
          formatDate(budget.expirationDate) || "N/A"
        }`,
        pageWidth - 10,
        34,
        { align: "right" }
      );

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Client: ${budget.applicantName}`, pageWidth - 10, 45, {
        align: "right",
      });
      doc.text(` ${budget.propertyAddress || "N/A"}`, pageWidth - 10, 50, {
        align: "right",
      });

      if (pageType === "payment") {
        doc.line(10, 65, pageWidth - 10, 65);

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(
          `${
            language === "es"
              ? "EL SIGUIENTE PRESUPUESTO INCLUYE:"
              : "THE FOLLOWING PROPOSAL INCLUDES:"
          }`,
          10,
          75
        );

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(
          `${
            language === "es"
              ? `Sistema séptico con capacidad para ${
                  budget.drainfieldDepth
                } galones por día (GPD) utilizando un modelo ${
                  budget.systemType === "Septic Tank"
                    ? "Regular Infiltrator."
                    : budget.systemType
                }`
              : `Sewage system with a capacity for ${
                  budget.drainfieldDepth
                } gallons per day (GPD) using a ${
                  budget.systemType === "Septic Tank"
                    ? "Regular Infiltrator."
                    : budget.systemType
                }`
          }`,
          10,
          80
        );

        // Agregar el texto adicional
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const additionalText =
          language === "es"
            ? `El costo abarca tanto la mano de obra como el suministro hasta 4 cargas de arena.
Servicio de mantenimiento dos veces al año, por dos años para el tanque.
La inspección inicial será llevada a cabo por un proveedor privado como parte del precio acordado.
Una vez que se hayan completado las etapas de instalación, incluyendo la siembra de césped, la
instalación de canalones y la terminación del pozo, estaremos listos para la inspección final. En caso
de preferir una inspección final a cargo de un proveedor privado, se aplicará un cargo adicional de
$200. Si prefiere evitar este cargo, puede notificar al Departamento de Salud del Condado y solicitar
que la inspección final sea realizada por el departamento.`
            : `The cost includes both labor and the supply of up to 4 loads of sand.
Maintenance service twice a year, for two years for the tank.
The initial inspection will be carried out by a private provider as part of the agreed price.
Once the installation stages have been completed, including grass planting,
gutter installation, and well completion, we will be ready for the final inspection. If
you prefer a final inspection by a private provider, an additional charge of $200 will apply.
If you prefer to avoid this charge, you can notify the County Health Department and request
that the final inspection be carried out by the department.`;

        const lines = doc.splitTextToSize(additionalText, 190); // Ajusta el ancho del texto
        doc.text(lines, 10, 90);

        autoTable(doc, {
          startY: 135,

          head: [
            language === "es"
              ? [
                  "Servicio",
                  "Modelo",
                  "Precio unitario",
                  "Cantidad",
                  "Precio total",
                ]
              : ["Service", "Model", "Unit Price", "Quantity", "Total Price"],
          ],
          body: [
            [
              language === "es"
                ? "Nueva instalación de sistema séptico"
                : "New septic system installation",
              `${budget.systemType}`,
              `$${budget.price}`,
              `${budget.drainfieldDepth} SQFT DRAINFIELD`,
              `${
                language === "es"
                  ? `$${budget.price.toFixed(2)} por instalación`
                  : `$${budget.price.toFixed(2)} per installation`
              }`, // Ejemplo de cálculo de precio total
            ],
          ],
          styles: { halign: "center", valign: "middle" },
          headStyles: {
            fillColor: [200, 200, 200],
            textColor: 0,
            fontStyle: "bold",
          },
          columnStyles: {
            0: { cellWidth: 40 }, // Servicio/Service
            1: { cellWidth: 50 }, // Modelo/Model
            2: { cellWidth: 30 }, // Precio unitario/Unit Price
            3: { cellWidth: 30 }, // Cantidad/Quantity
            4: { cellWidth: 30 },
          },
        });

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(
          `${language === "es" ? "CRONOGRAMA DE PAGOS" : "PAYMENT SCHEDULE:"}`,
          10,
          170
        );

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${language === "es" ? "1ER PAGO" : "1ST PAYMENT"}`, 10, 180);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(
          `${
            language === "es"
              ? "La primera transferencia de dinero será del 60% del monto total acordado."
              : "The first money transfer will be 60% of the total agreed amount."
          }`,
          10,
          185
        );

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(
          `${
            language === "es"
              ? "El pago debe realizarse al momento de firmar el contrato."
              : "The payment must be made at the time of signing the contract."
          }`,
          10,
          189
        );

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(
          `${
            language === "es"
              ? `Total: $${budget.initialPayment}`
              : `Total: $${budget.initialPayment}`
          }`,
          10,
          193
        );

        const textWidth = doc.getTextWidth(
          language === "es"
            ? `Total: $${budget.initialPayment}`
            : `Total: $${budget.initialPayment}`
        );
        doc.line(10, 194, 10 + textWidth, 194);

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${language === "es" ? "2DO PAGO" : "2ND PAYMENT"}`, 10, 207);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(
          `${
            language === "es"
              ? "La segunda transferencia de dinero será del 40% del monto total acordado."
              : "The second money transfer will be 40% of the total agreed amount."
          }`,
          10,
          212
        );

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(
          `${
            language === "es"
              ? "El pago debe realizarse al completarse el proyecto."
              : "The payment must be made upon completion of the project."
          }`,
          10,
          216
        );

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(
          `${
            language === "es"
              ? `Total: $${(budget.price - budget.initialPayment).toFixed(2)}`
              : `Total: $${(budget.price - budget.initialPayment).toFixed(2)}`
          }`,
          10,
          220
        );

        const textWidth2 = doc.getTextWidth(
          language === "es"
            ? `Total: $${(budget.price - budget.initialPayment).toFixed(2)}`
            : `Total: $${(budget.price - budget.initialPayment).toFixed(2)}`
        );
        doc.line(10, 221, 10 + textWidth2, 221);
      }

      doc.setTextColor(0, 0, 0);

      if (pageType === "additional") {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        const subtitle = language === "es"
          ? "Estación de Bombeo y Costos Adicionales:"
          : "Pumping Station and Additional Costs:";
        const subtitleWidth = doc.getTextWidth(subtitle);
        const subtitleX = 10;
        const subtitleY = 80;
      
        doc.text(subtitle, subtitleX, subtitleY);
        doc.line(subtitleX, subtitleY + 2, subtitleX + subtitleWidth, subtitleY + 2);
      
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
      
        const additionalText = language === "es"
          ? `-Si no es posible lograr una caída por gravedad y se necesita una estación de bombeo para la instalación del sistema, se instalará una estación de bombeo, una bomba y una alarma audiovisual por un costo de $2,750.
      -Este costo no cubre la instalación de césped ni cualquier trabajo eléctrico necesario para alimentar la estación de bombeo, si es requerido.`
          : `-If it is not possible to achieve a gravity drop and a pumping station is required for the system installation, a pumping station, a pump, and an audiovisual alarm will be installed at a cost of $2,750.
      -This cost does not cover grass installation or any electrical work required to power the pumping station, if needed.`;
      
        const lines = doc.splitTextToSize(additionalText, 190);
        let currentY = subtitleY + 10;
        doc.text(lines, subtitleX, currentY);
      
        // ⬇️ Cambios de Precio
        currentY += lines.length * 5 + 10;
      
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        const changeTitle = language === "es"
          ? "Cambios de Precio y Notificación:"
          : "Price Changes and Notification:";
        const changeTitleWidth = doc.getTextWidth(changeTitle);
        doc.text(changeTitle, subtitleX, currentY);
        doc.line(subtitleX, currentY + 2, subtitleX + changeTitleWidth, currentY + 2);
      
        currentY += 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const changeText = language === "es"
          ? `Debido a la volatilidad en los precios y la disponibilidad de los materiales, los precios están sujetos a cambios.
      En caso de que se requiera un ajuste en el precio, se enviará una notificación por escrito antes de iniciar cualquier nuevo trabajo con el precio actualizado.`
          : `Due to the volatility in prices and the availability of materials, prices are subject to change.
      If a price adjustment is required, a written notice will be sent before starting any new work with the updated price.`;
      
        const changeLines = doc.splitTextToSize(changeText, 190);
        doc.text(changeLines, subtitleX, currentY);
      
        // ⬇️ Mantenimiento y Reparaciones
        currentY += changeLines.length * 5 + 10;
      
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        const maintenanceTitle = language === "es"
          ? "Mantenimiento y Reparaciones:"
          : "Maintenance and Repairs:";
        const maintenanceTitleWidth = doc.getTextWidth(maintenanceTitle);
        doc.text(maintenanceTitle, subtitleX, currentY);
        doc.line(subtitleX, currentY + 2, subtitleX + maintenanceTitleWidth, currentY + 2);
      
        currentY += 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const maintenanceText = language === "es"
          ? `Aunque se llevará a cabo el mantenimiento, la reparación de las piezas del tanque no está incluida y debe gestionarse directamente con el fabricante.`
          : `Although maintenance will be performed, repair of tank parts is not included and must be handled directly with the manufacturer.`;
      
        const maintenanceLines = doc.splitTextToSize(maintenanceText, 190);
        doc.text(maintenanceLines, subtitleX, currentY);
      
        // ⬇️ Excavación Profunda
        currentY += maintenanceLines.length * 5 + 10;
      
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        const excavationTitle = language === "es"
          ? "Excavación Profunda y Cargos Adicionales:"
          : "Deep Excavation and Additional Charges:";
        const excavationTitleWidth = doc.getTextWidth(excavationTitle);
        doc.text(excavationTitle, subtitleX, currentY);
        doc.line(subtitleX, currentY + 2, subtitleX + excavationTitleWidth, currentY + 2);
      
        currentY += 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const excavationText = language === "es"
          ? `Tenga en cuenta que si hay una excavación profunda, es probable que se necesite más arena de la que se incluye en esta estimación.
        Se aplicarán cargos adicionales si es necesario utilizar un martillo debido a la presencia de rocas u otro material duro, como se indica a continuación:
        $350 por la primera hora.
        $250 por la segunda hora.
        $200 por cada hora extra adicional (con un mínimo de 2 horas).`
          : `Please note that if there is deep excavation, more sand than included in this estimate may be required.
        Additional charges will apply if a hammer is needed due to rocks or other hard materials, as outlined below:
        $350 for the first hour.
        $250 for the second hour.
        $200 for each additional extra hour (minimum of 2 hours).`;
      
        const excavationLines = doc.splitTextToSize(excavationText, 190);
        doc.text(excavationLines, subtitleX, currentY);
      }}

    // Página 1: Español (Pago)
    addPageContent("es", "payment");
    doc.addPage();

    // Página 2: Inglés (Pago)
    addPageContent("en", "payment");
    doc.addPage();

    // Página 3: Español (Contenido adicional)
    addPageContent("es", "additional");
    doc.addPage();

    // Página 4: Inglés (Contenido adicional)
    addPageContent("en", "additional");
    doc.addPage();

  // Encabezado
doc.addImage(logo, "PNG", 10, 10, 30, 30); // Logo
doc.line(10, 40, pageWidth - 10, 40); // Línea debajo del encabezado

doc.setFontSize(10);
doc.setFont("helvetica");
doc.text("Zurcher Construction", 10, 45);
doc.setFont("helvetica", "normal");
doc.text("Septic Tank Division - CFC1433240", 10, 50);
doc.text("zurcherseptic@gmail.com", 10, 55);
doc.text("+1 (407) 419-4495", 10, 60);

// Título de sección
doc.setFontSize(14);
doc.setFont("helvetica", "bold");
doc.text("Terms and Conditions", 10, 75);

// Texto principal
doc.setFontSize(10);
doc.setFont("helvetica", "normal");

const termsText = `
Terms and Conditions Acceptance Agreement for the Installation of a Septic System

Considering that:
The Provider is engaged in the installation of septic systems and offers its services in accordance with applicable legal and technical regulations. The Client is interested in contracting the service for the installation of a septic system on the property located at 503 Thompson Ave, Lehigh Acres, FL 33972. Both parties wish to establish the terms and conditions under which the service will be provided.

They agree as follows:

Acceptance of the Terms and Conditions:
The Client declares to have read, understood, and accepted the terms and conditions set forth in this agreement. Acceptance of these terms is mandatory for the provision of the septic system installation service.

Provider's Obligations:
The Provider agrees to:
• Perform the installation of the septic system on the Client's property in accordance with the agreed-upon plans and specifications, complying with all applicable technical and legal regulations.
• Provide the necessary materials and labor for the installation, ensuring the quality and durability of the septic system.
• Conduct the necessary tests to ensure the proper functioning of the septic system upon completion of the installation.

Client's Obligations:
The Client agrees to:
• Provide access to the property for the installation of the septic system and to facilitate the Provider with all the necessary information for the execution of the work.
• Fulfill the agreed-upon payments as set forth in this contract, in accordance with the established amounts and deadlines.
• Obtain and provide any required permits or authorizations for the installation of the septic system, unless otherwise agreed upon with the Provider.

Execution Period:
The Provider agrees to commence the installation of the septic system on the agreed-upon date and complete the work promptly, subject to weather conditions and other factors beyond the Provider's control.

Contract Termination:
This contract may be terminated under the following circumstances:
• For breach of any of the contractual obligations by either party, upon prior written notification.
• By mutual agreement between both parties.
• By unilateral decision of the Client, upon prior notification, subject to payment for services already rendered.

Limitation of Liability:
The Provider will not be responsible for direct, indirect, incidental, or consequential damages that may arise from the use or inability to use the septic system after installation.
`;

// Imprime el texto (dividido para que no desborde)
const formattedLines = doc.splitTextToSize(termsText.trim(), 270);
doc.text(formattedLines, 10, 85);

// ==== Firma como en la imagen ====

// Signature section
// Signature section
const pageHeight = doc.internal.pageSize.getHeight();
const lineY = pageHeight - 30; // Adjusted line position (further down)
const labelY = lineY + 5; // Adjusted label position (closer to the line)
const leftX = pageWidth / 4 - 40; // Centered left line
const rightX = (pageWidth * 3) / 4 - 40; // Centered right line
const lineWidth = 80; // Consistent line width

doc.setLineWidth(0.5);
doc.line(leftX, lineY, leftX + lineWidth, lineY);
doc.line(rightX, lineY, rightX + lineWidth, lineY);

doc.setFontSize(9);
doc.setFont("helvetica", "normal");

const signatureLabel = "Client Signature";
const dateLabel = "Date";

const signatureLines = doc.splitTextToSize(signatureLabel, lineWidth);
const dateLines = doc.splitTextToSize(dateLabel, lineWidth);

// Calculate vertical offset for multi-line labels
const signatureOffset = signatureLines.length > 1 ? (signatureLines.length - 1) * 3 : 0;
const dateOffset = dateLines.length > 1 ? (dateLines.length - 1) * 3 : 0;

doc.text(signatureLines, leftX + lineWidth / 2, labelY - signatureOffset, {
  align: "center",
  maxWidth: lineWidth,
});
doc.text(dateLines, rightX + lineWidth / 2, labelY - dateOffset, { align: "center", maxWidth: lineWidth });

    // Devuelve el objeto PDF
    return doc;
  };

  const handleDownload = () => {
    const doc = generatePDF(budget);
    if (!doc) return;
    doc.save(`presupuesto_${budget.idBudget}.pdf`);
  };

  return (
    <div>
      <button
        onClick={handleDownload}
        className="bg-blue-950 text-white text-xs py-1 px-2 rounded-md hover:bg-indigo-700 p-2"
      >
        {editMode ? "Download PDF edit" : "Download PDF"}
      </button>
    </div>
  );
};

BudgetPDF.propTypes = {
  budget: PropTypes.shape({
    idBudget: PropTypes.number.isRequired,
    applicantName: PropTypes.string.isRequired,
    propertyAddress: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    initialPayment: PropTypes.number.isRequired,
    expirationDate: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    drainfieldDepth: PropTypes.string.isRequired,
    systemType: PropTypes.string.isRequired,
  }).isRequired,
  editMode: PropTypes.bool,
};

export default BudgetPDF;
