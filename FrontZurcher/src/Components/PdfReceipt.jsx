import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { uploadPdf } from "../Redux/Actions/pdfActions";
import { createPermit } from "../Redux/Actions/permitActions";
// Ya no necesitas createBudget aquí
// import { createBudget } from "../Redux/Actions/budgetActions";
// Ya no necesitas fetchSystemTypes aquí si el precio no se calcula aquí
// import { fetchSystemTypes } from "../Redux/Actions/SystemActions";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

const PdfReceipt = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [pdfPreview, setPdfPreview] = useState(null);
  const [optionalDocPreview, setOptionalDocPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [optionalDocs, setOptionalDocs] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    permitNumber: "",
    applicationNumber: "",
    constructionPermitFor: "",
    applicant: "",
    propertyAddress: "",
    systemType: "", // Mantener para mostrar/editar en el Permit si es necesario
    lot: "",
    block: "",
    gpdCapacity: "", // Mantener para mostrar/editar en el Permit si es necesario
    drainfieldDepth: "", // Mantener para mostrar/editar en el Permit si es necesario
    excavationRequired: "",
    dateIssued: "",
    expirationDate: "",
    pump: "",
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
  });

  // Ya no necesitas systemTypes aquí si no calculas precio
  // const { systemTypes } = useSelector((state) => state.systemType);

  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  // Ya no necesitas cargar systemTypes aquí
  // useEffect(() => {
  //   dispatch(fetchSystemTypes());
  // }, [dispatch]);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    console.log("Archivo seleccionado:", uploadedFile);
    if (uploadedFile) {
      const fileUrl = URL.createObjectURL(uploadedFile);
      setPdfPreview(fileUrl);
      setFile(uploadedFile);
      dispatch(uploadPdf(uploadedFile)).then((action) => {
        if (action.payload && action.payload.data) { // Verificar que payload y data existan
          setFormData((prevFormData) => ({
            ...prevFormData,
            ...action.payload.data,
            // Asegúrate de que los campos extraídos no sobrescriban los editados manualmente si es necesario
          }));
        } else if (action.error) {
            console.error("Error al procesar PDF:", action.error);
            alert("Error al extraer datos del PDF.");
        }
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleOptionalDocUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      const fileUrl = URL.createObjectURL(uploadedFile);
      setOptionalDocPreview(fileUrl);
      setOptionalDocs(uploadedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const confirmPlan = window.confirm(
      "El permit que adjuntaste contiene el plano? Recorda cargarlo!!!"
    );

    // Si el usuario presiona "Cancelar" (o "No"), detener el envío
    if (!confirmPlan) {
      console.log("El usuario canceló el envío para verificar el plano.");
      return; // Detiene la ejecución de handleSubmit
    }

    if (!formData.applicantName) {
      alert("El campo Applicant Name es obligatorio.");
      return;
    }
    if (!file) {
      alert("No se ha seleccionado ningún archivo PDF principal.");
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("pdfData", file);
      if (optionalDocs) {
        formDataToSend.append("optionalDocs", optionalDocs);
      }
      Object.keys(formData).forEach((key) => {
        // Asegurarse de no enviar valores undefined o null si el backend no los maneja bien
        formDataToSend.append(key, formData[key] ?? '');
      });

      console.log("Enviando datos para crear el permiso...");
      // --- 1. Crear el Permiso ---
    // filepath: c:\Users\yaniz\Documents\ZurcherApi\FrontZurcher\src\Components\PdfReceipt.jsx
// ... dentro de handleSubmit ...
const permitAction = await dispatch(createPermit(formDataToSend));
console.log('Respuesta de createPermit:', permitAction); // Verifica esto

// La condición debería funcionar si la estructura es como se espera:
if (permitAction && permitAction.payload && permitAction.payload.idPermit) {
  const newPermitId = permitAction.payload.idPermit; // Correcto
  console.log("Permiso creado con ID:", newPermitId);
  alert("Permiso creado correctamente.");
  navigate(`/createBudget?permitId=${newPermitId}`); // Navega a la página de edición del presupuesto
} else {
  // Si entra aquí, revisa el console.log anterior para ver por qué falló la condición
  console.error("Error: La estructura de permitAction.payload no es la esperada o falta idPermit.", permitAction);
  const errorMessage = permitAction?.error?.message || permitAction?.payload?.error || "No se pudo obtener el ID del permiso de la respuesta.";
  alert(`Error al procesar la respuesta del permiso: ${errorMessage}`);
}
// ...

    } catch (error) {
      // Captura errores generales de la red o del dispatch
      console.error("Error en handleSubmit:", error);
      alert(
        `Hubo un error inesperado. Por favor, inténtalo de nuevo. Detalles: ${error.message}`
      );
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Gestión de PDF y Permiso</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Columna izquierda: Vista previa del PDF */}
        <div className="bg-white shadow-md rounded-lg p-4 col-span-2">
          {/* ... (código de previsualización sin cambios) ... */}
           <h2 className="text-xl font-bold mb-4">Vista previa del PDF</h2>
           <div className="flex justify-between mb-4">
             <button onClick={() => setCurrentPage(1)} className={`py-1 px-2 rounded-md ${ currentPage === 1 ? "bg-blue-950 text-white" : "bg-gray-200 text-gray-700" }`}>Ver PDF Principal</button>
             <button onClick={() => setCurrentPage(2)} className={`py-1 px-2 rounded-md ${ currentPage === 2 ? "bg-blue-950 text-white" : "bg-gray-200 text-gray-700" }`}>Ver Documento Opcional</button>
           </div>
           {currentPage === 1 && pdfPreview ? (
             <div className="overflow-y-auto max-h-[700px] border border-gray-300 rounded-md">
               <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                 <Viewer fileUrl={pdfPreview} plugins={[defaultLayoutPluginInstance]} />
               </Worker>
             </div>
           ) : currentPage === 2 && optionalDocPreview ? (
             <div className="overflow-y-auto max-h-[700px] border border-gray-300 rounded-md">
               <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                 <Viewer fileUrl={optionalDocPreview} plugins={[defaultLayoutPluginInstance]} />
               </Worker>
             </div>
           ) : ( <p className="text-gray-500">{currentPage === 1 ? "No se ha cargado ningún PDF principal." : "No se ha cargado ningún documento opcional."}</p> )}
           {currentPage === 1 && ( <div className="mt-4"><label className="block text-sm font-medium text-gray-700">Cargar PDF Principal</label><input type="file" accept="application/pdf" onChange={handleFileUpload} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/></div> )}
           {currentPage === 2 && ( <div className="mt-4"><label className="block text-sm font-medium text-gray-700">Cargar Documento Opcional</label><input type="file" accept="application/pdf" onChange={handleOptionalDocUpload} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/></div> )}
        </div>

        {/* Columna derecha: Formulario (solo para datos del Permit) */}
        <div className="bg-white shadow-md rounded-lg p-4 col-span-1">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            {/* Mapea los campos del formData como antes */}
            {Object.keys(formData)
              .filter(
                (key) =>
                  key !== "applicationNumber" &&
                  key !== "constructionPermitFor" &&
                  key !== "dateIssued" 
              )
              .map((key) => (
              <div key={key}>
                 {key === "applicantName" && ( <h2 className="text-sm font-semibold mt-2 mb-2 bg-blue-950 text-white p-1 rounded-md">CUSTOMER CLIENT</h2> )}
                 <label className="block text-xs font-medium capitalize text-gray-700">
                   {key === "applicantName" ? "Name" : key === "applicantEmail" ? "Email" : key === "applicantPhone" ? "Phone" : key.replace(/([A-Z])/g, " $1").trim()}
                 </label>
                 {/* Ya no necesitas el select especial para systemType aquí si no afecta el precio */}
                 <input
                   type={key === 'applicantEmail' ? 'email' : key === 'applicantPhone' ? 'tel' : 'text'} // Ajustar tipos de input
                   name={key}
                   value={formData[key] ?? ''} // Usar ?? '' para evitar uncontrolled input warning
                   onChange={handleInputChange}
                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                   required={key === 'applicantName' || key === 'propertyAddress'} // Marcar campos requeridos
                 />
              </div>
            ))}
            <button
              type="submit"
              className="bg-blue-950 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
            >
              Guardar Permiso y Continuar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PdfReceipt;