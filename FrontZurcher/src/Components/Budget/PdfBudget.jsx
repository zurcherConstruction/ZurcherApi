// import React, { useEffect } from "react";
// import { jsPDF } from "jspdf";
// import autoTable from "jspdf-autotable";
// import logo from "../../assets/logoseptic.png"; // Ruta del logo
// import { useDispatch, useSelector } from "react-redux";
// import { fetchBudgets } from "../../Redux/Actions/budgetActions"; // Asegúrate de que esta ruta sea correcta

// const PdfBudget = () => {
//   const dispatch = useDispatch();

//   // Obtener el estado de budgets desde Redux
//   const { budgets, loading, error } = useSelector((state) => state.Budget);

//   // Llamar a la acción para obtener los budgets al montar el componente
//   useEffect(() => {
//     dispatch(fetchBudgets());
//   }, [dispatch]);

//   const generatePDF = () => {
//     const doc = new jsPDF();

//     // Agregar logo
//     doc.addImage(logo, "PNG", 10, 10, 30, 30);

//     // Título del PDF
//     doc.setFontSize(16);
//     doc.text("Presupuestos", 80, 20);

//     // Iterar sobre los presupuestos y generar una tabla
//     budgets.forEach((budget, index) => {
//       const startY = index === 0 ? 50 : doc.lastAutoTable.finalY + 20;

//       // Resaltar aplicante y dirección de propiedad
//       doc.setFontSize(12);
//       doc.text(`Aplicante: ${budget.applicantName}`, 10, startY);
//       doc.text(`Dirección: ${budget.propertyAddress}`, 10, startY + 10);

//       // Crear tabla con los detalles del presupuesto
//       autoTable(doc, {
//         startY: startY + 20,
//         head: [["Campo", "Valor"]],
//         body: [
//           ["Fecha", budget.date],
//           ["Fecha de Expiración", budget.expirationDate || "N/A"],
//           ["Precio", `$${budget.price}`],
//           ["Pago Inicial", `$${budget.initialPayment}`],
//           ["Estado", budget.status],
//         ],
//       });
//     });

//     // Guardar el PDF
//     doc.save("presupuestos.pdf");
//   };

//   return (
//     <div className="p-4">
//       <h1 className="text-2xl font-bold mb-4">Generar PDF de Presupuestos</h1>

//       {/* Mostrar estado de carga */}
//       {loading && <p className="text-blue-500">Cargando presupuestos...</p>}

//       {/* Mostrar error si ocurre */}
//       {error && <p className="text-red-500">Error: {error}</p>}

//       {/* Botón para generar PDF */}
//       {!loading && !error && (
//         <button
//           onClick={generatePDF}
//           className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700"
//         >
//           Generar PDF
//         </button>
//       )}
//     </div>
//   );
// };

// export default PdfBudget;