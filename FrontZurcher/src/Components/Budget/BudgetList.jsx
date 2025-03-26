import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchBudgets, updateBudget } from "../../Redux/Actions/budgetActions"; // Asegúrate de que esta ruta sea correcta
import { createWork } from "../../Redux/Actions/workActions";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../../assets/logoseptic.png"; // Ruta del logo

const BudgetList = () => {
  const dispatch = useDispatch();

  // Obtener el estado de budgets desde Redux
  const { budgets, loading, error } = useSelector((state) => state.Budget);

  // Llamar a la acción para obtener los budgets al montar el componente
  useEffect(() => {
    dispatch(fetchBudgets());
  }, [dispatch]);

  // Función para generar el PDF de un presupuesto específico
  const generatePDF = (budget) => {
    const doc = new jsPDF();

    // Agregar logo en la esquina superior izquierda
    doc.addImage(logo, "PNG", 10, 10, 30, 30);
      // Información de la empresa al lado del logo
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ZURCHER CONSTRUCTION LLC.", 50, 20);
  doc.setFont("helvetica", "normal");
  doc.text("9837 Clear Cloud Aly", 50, 25);
  doc.text("Winter Garden, FL 34787", 50, 30);
  doc.text("+1 (407) 419-4495", 50, 35);


    // Resaltar aplicante y dirección de propiedad
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(` ${budget.applicantName}`, 10, 50);
    doc.text(` ${budget.propertyAddress || "No especificada"}`, 10, 60);

    // Agregar número de presupuesto y fechas en la esquina superior derecha
    const pageWidth = doc.internal.pageSize.getWidth(); // Obtener el ancho de la página
    const rightX = pageWidth - 10; // Margen derecho

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Presupuesto N°: ${budget.idBudget}`, rightX, 20, { align: "right" });

    // Convertir las fechas al formato dd-mm-aaaa
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

doc.setFontSize(8);
doc.setFont("helvetica", "normal");
doc.text(`Date: ${formatDate(budget.date)}`, rightX, 28, { align: "right" }); // Reducir el espaciado
doc.text(`Validity: ${formatDate(budget.expirationDate) || "N/A"}`, rightX, 34, { align: "right" }); // Reducir el espaciado
    // Dibujar una línea fina que divida la sección superior
    doc.setDrawColor(200); // Color gris claro
    doc.setLineWidth(0.5); // Línea fina
    doc.line(10, 70, pageWidth - 10, 70); // Línea horizontal

    // Crear tabla con los detalles del presupuesto
    autoTable(doc, {
      startY: 80,
      head: [["", ""]],
      body: [
        ["Total Amount", `$ ${budget.price}`],
        ["Septic Installation 60% Initial ", `$ ${budget.initialPayment}`],
       
      ],
      
    });
  // Dibujar una línea fina que divida la tabla de la sección de pago
  const paymentStartY = doc.lastAutoTable.finalY + 10; // Posición debajo de la tabla
  doc.setDrawColor(200); // Color gris claro
  doc.setLineWidth(0.5); // Línea fina
  doc.line(10, paymentStartY, pageWidth - 10, paymentStartY); // Línea horizontal

  // Agregar título "Payment Information" y detalles alineados
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Payment Information:", 10, paymentStartY + 10); // Título alineado

  doc.setFont("helvetica", "normal");
  doc.text("Bank: Bank of America", 10, paymentStartY + 20);
  doc.text("N° ruta: 063100277", 10, paymentStartY + 25);
  doc.text("N° cuenta: 898138399808", 10, paymentStartY + 30);
  doc.text("Email: zurcherconstruction.fl@gmail.com", 10, paymentStartY + 40);

  // Agregar enlace clickeable al lado derecho
  const linkX = pageWidth - 50; // Posición del enlace a la derecha
  const linkY = paymentStartY + 10; // Alinear con el título
  doc.setTextColor(0, 0, 255); // Color azul para el enlace
  doc.textWithLink("Pagar ahora", linkX, linkY, {
    url: "https://quickbooks.intuit.com",
  });
  doc.setTextColor(0, 0, 0); // Restaurar color del texto a negro

    // Guardar el PDF con un nombre único
    doc.save(`presupuesto_${budget.idBudget || budget.propertyAddress}.pdf`);
  };

   // Función para manejar el cambio de estado del presupuesto
   const handleUpdateStatus = (idBudget, newStatus, budget) => {
    dispatch(updateBudget(idBudget, { status: newStatus })).then(() => {
      // Si el estado cambia a "approved", crear automáticamente el Work
      if (newStatus === 'approved') {
        const workData = {
          propertyAddress: budget.propertyAddress,
          idBudget: budget.idBudget,
          status: 'pending', // Estado inicial del Work
        };
  
        dispatch(createWork(workData))
          .then(() => {
            console.log('Work creado exitosamente');
          })
          .catch((error) => {
            console.error('Error al crear el Work:', error);
          });
      }
    });
  };

  // Verificar automáticamente si han pasado 48 horas desde que el estado es "send"
  useEffect(() => {
    const interval = setInterval(() => {
      budgets.forEach((budget) => {
        if (budget.status === "send") {
          const sentTime = new Date(budget.updatedAt); // Suponiendo que `updatedAt` contiene la última fecha de actualización
          const currentTime = new Date();
          const diffInHours = (currentTime - sentTime) / (1000 * 60 * 60); // Diferencia en horas

          if (diffInHours >= 48) {
            handleUpdateStatus(budget.idBudget, "notResponded");
          }
        }
      });
    }, 60000); // Verificar cada minuto

    return () => clearInterval(interval); // Limpiar el intervalo al desmontar el componente
  }, [budgets]);

  // Función para obtener el color de fondo según el estado
  const getStatusColor = (status) => {
    switch (status) {
      case "created":
        return "bg-white"; // Blanco
      case "send":
        return "bg-yellow-200"; // Amarillo
      case "approved":
        return "bg-green-200"; // Verde
      case "notResponded":
        return "bg-orange-200"; // Naranja
      case "rejected":
        return "bg-red-200"; // Rojo
      default:
        return "bg-white"; // Blanco por defecto
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Presupuestos</h1>

      {/* Mostrar estado de carga */}
      {loading && <p className="text-blue-500">Cargando presupuestos...</p>}

      {/* Mostrar error si ocurre */}
      {error && <p className="text-red-500">Error: {error}</p>}

      {/* Mostrar lista de presupuestos */}
      {!loading && !error && (
        <table className="table-auto w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 px-4 text-xs">Aplicant</th>
              <th className="border border-gray-300 px-4 text-xs">Date</th>
              <th className="border border-gray-300 px-4 text-xs">End Date</th>
              <th className="border border-gray-300 px-4 text-xs">Precio</th>
              <th className="border border-gray-300 px-4 text-xs">Pago 60%</th>
              <th className="border border-gray-300 px-4 text-xs">Estate</th>
              <th className="border border-gray-300 px-4 text-xs">Adress</th>
              <th className="border border-gray-300 px-4 text-xs">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((budget) => (
              <tr
                key={budget.idBudget}
                className={`hover:bg-gray-100 ${getStatusColor(budget.status)}`}
              >
                <td className="border border-gray-300 px-4 text-xs">{budget.applicantName}</td>
                <td className="border border-gray-300 px-4 text-xs">{budget.date}</td>
                <td className="border border-gray-300 px-4 text-xs">{budget.expirationDate || "N/A"}</td>
                <td className="border border-gray-300 px-4 text-xs">${budget.price}</td>
                <td className="border border-gray-300 px-4 text-xs">${budget.initialPayment}</td>
                <td className="border border-gray-300 px-4 text-xs">{budget.status}</td>
                <td className="border border-gray-300 px-4 text-xs">
                  {budget.propertyAddress || "No especificada"}
                </td>
                <td className="border border-gray-300 px-4 ">
                  <button
                    onClick={() => generatePDF(budget)}
                    className="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-700 mr-2 mb-1"
                  >
                     PDF Budget 
                  </button>
                  <select
  value={budget.status} // Mostrar el estado actual como seleccionado
  onChange={(e) => handleUpdateStatus(budget.idBudget, e.target.value, budget)} // Pasar el objeto budget
  className="bg-gray-100 border border-gray-300 text-xs rounded px-1 py-1"
>
  <option value="send" disabled={budget.status === "send"}>
    {budget.status === "send" ? "Enviado" : "Enviar"}
  </option>
  <option value="approved">Aprobado</option>
  <option value="rejected">Rechazado</option>
</select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default BudgetList;