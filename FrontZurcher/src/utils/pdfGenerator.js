import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../../public/logo.png"; // Ajusta la ruta si es necesario

export const generatePDF = (budget) => {
    if (!budget || !budget.applicantName) {
        console.error("El objeto budget no tiene las propiedades necesarias:", budget);
        return null;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Formatear fechas
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    // Convertir valores numéricos
    const subtotalPrice = parseFloat(budget.subtotalPrice) || 0;
    const discountAmount = parseFloat(budget.discountAmount) || 0;
    const totalPrice = parseFloat(budget.totalPrice) || 0;
    const initialPayment = parseFloat(budget.initialPayment) || 0;

    // Validar lineItems
    const lineItems = Array.isArray(budget.lineItems) ? budget.lineItems : [];

    // Encabezado
    doc.addImage(logo, "PNG", 10, 10, 30, 30); // Logo
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Zurcher Construction", 50, 20);
    doc.setFont("helvetica", "normal");
    doc.text("Septic Tank Division - CFC1433240", 50, 25);
    doc.text("zurcherseptic@gmail.com", 50, 30);
    doc.text("+1 (407) 419-4495", 50, 35);

    // Información del presupuesto
    doc.setFontSize(10);
    doc.text(`Presupuesto N°: ${budget.idBudget}`, pageWidth - 10, 20, { align: "right" });
    doc.text(`Fecha: ${formatDate(budget.date)}`, pageWidth - 10, 25, { align: "right" });
    doc.text(`Validez: ${formatDate(budget.expirationDate) || "N/A"}`, pageWidth - 10, 30, { align: "right" });

    // Información del cliente
    doc.setFontSize(10);
    doc.text(`Cliente: ${budget.applicantName}`, 10, 50);
    doc.text(`Dirección: ${budget.propertyAddress}`, 10, 55);

    // Tabla de items
    autoTable(doc, {
        startY: 65,
        head: [["Servicio", "Cantidad", "Precio Unitario", "Precio Total"]],
        body: lineItems.map((item) => [
            `Item ID: ${item.budgetItemId}`,
            item.quantity,
            `$${parseFloat(item.priceAtTimeOfBudget).toFixed(2)}`,
            `$${parseFloat(item.lineTotal).toFixed(2)}`,
        ]),
        styles: { halign: "center", valign: "middle" },
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: "bold" },
    });

    // Resumen de precios
    const summaryStartY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Subtotal: $${subtotalPrice.toFixed(2)}`, 10, summaryStartY);
    doc.text(`Descuento: $${discountAmount.toFixed(2)}`, 10, summaryStartY + 5);
    doc.text(`Total: $${totalPrice.toFixed(2)}`, 10, summaryStartY + 10);
    doc.text(`Pago Inicial: $${initialPayment.toFixed(2)}`, 10, summaryStartY + 15);

    // Firma
    const pageHeight = doc.internal.pageSize.getHeight();
    const signatureY = pageHeight - 30;
    doc.line(10, signatureY, 80, signatureY); // Línea para la firma
    doc.text("Firma del Cliente", 10, signatureY + 5);

    // Devuelve el objeto PDF
    return doc;
};