import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { uploadPdf } from "../Redux/Actions/pdfActions";
import { createPermit } from "../Redux/Actions/permitActions";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';

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

  
const [excavationUnit, setExcavationUnit] = useState("INCH"); 
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    console.log("Archivo seleccionado:", uploadedFile);
    if (uploadedFile) {
      const fileUrl = URL.createObjectURL(uploadedFile);
      setPdfPreview(fileUrl);
      setFile(uploadedFile);
      dispatch(uploadPdf(uploadedFile)).then((action) => {
        if (action.payload && action.payload.data) {
          const extractedData = action.payload.data;
          let detectedUnit = "INCH"; // Default

          // --- Lógica para detectar unidad en excavationRequired ---
          if (extractedData.excavationRequired) {
            const textValue = String(extractedData.excavationRequired).trim();
            const parts = textValue.split(/\s+/);
            if (parts.length > 1) {
              const lastPartUpper = parts[parts.length - 1].toUpperCase();
              if (["INCH", "FEET"].includes(lastPartUpper)) {
                detectedUnit = lastPartUpper;
                // Opcional: podrías quitar la unidad del valor si siempre es número + unidad
                // extractedData.excavationRequired = parts.slice(0, -1).join(' ');
              }
            }
          }
          // --- Fin Lógica ---

          setFormData((prevFormData) => ({
            ...prevFormData,
            ...extractedData, // Aplica todos los datos extraídos
          }));
          setExcavationUnit(detectedUnit); // Actualiza el estado de la unidad detectada

        } else if (action.error) {
            console.error("Error al procesar PDF:", action.error);
            const errorMsg = action.error.message || "Error desconocido durante la extracción.";
            toast.error(`Error de Extracción: ${errorMsg}`);
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
    const confirmationResult = await Swal.fire({
      title: '¿Plano Cargado?',
      text: "Si este permit requiere un plano (documento opcional), ¿ya lo has cargado?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'No, revisar'
    });

    // Si el usuario presiona "No, revisar" o cierra la alerta, detener el envío
    if (!confirmationResult.isConfirmed) {
      console.log("El usuario canceló el envío para verificar el plano.");
      toast.info("Envío cancelado. Verifica si necesitas cargar el plano opcional."); // Toast informativo
      return;
    }

    if (!formData.applicantName) {
      toast.warn("El campo 'Name' (Applicant Name) es obligatorio.");
      return;
    }
    if (!formData.propertyAddress) {
      toast.warn("El campo 'Property Address' es obligatorio.");
      return;
    }
    if (!file) {
      toast.warn("No se ha seleccionado ningún archivo PDF principal.");
      return;
    }

    let loadingToastId; // Definir fuera para que sea accesible en catch
    try {
      // --- Preparar FormData (sin cambios) ---
      const formDataToSend = new FormData();
      formDataToSend.append("pdfData", file);
      if (optionalDocs) {
        formDataToSend.append("optionalDocs", optionalDocs);
      }
      Object.keys(formData).forEach((key) => {
        let valueToSend = formData[key] ?? ''; // Valor por defecto

        // --- Lógica especial para excavationRequired ---
        if (key === 'excavationRequired') {
          // 1. Obtener el valor original y asegurarse de que sea string, luego trim
          const originalStringValue = String(valueToSend).trim();
          // 2. Intentar parsear el valor trimeado
          const numericValue = parseFloat(originalStringValue);

          // 3. Verificar si el valor trimeado NO está vacío Y es un número válido Y coincide exactamente con su representación numérica
          if (originalStringValue !== '' && !isNaN(numericValue) && String(numericValue) === originalStringValue) {
             // 4. Si es puramente numérico, usar el valor trimeado y añadir la unidad
             valueToSend = `${originalStringValue} ${excavationUnit}`;
          } else {
             // 5. Si no es puramente numérico (o está vacío), usar el valor original trimeado tal cual
             valueToSend = originalStringValue;
          }
        }
        // --- Fin Lógica especial ---

        formDataToSend.append(key, valueToSend);
      });

      console.log("Enviando datos para crear el permiso...");
      loadingToastId = toast.loading("Guardando permiso...");

      // --- Llamar al dispatch ---
      // La acción createPermit debe lanzar un error en caso de fallo
      const permitData = await dispatch(createPermit(formDataToSend));

      // --- Si llegamos aquí, fue exitoso ---
      toast.dismiss(loadingToastId);
      const newPermitId = permitData?.idPermit; // Asumiendo que la acción devuelve los datos en éxito
      if (newPermitId) {
        console.log("Permiso creado con ID:", newPermitId);
        toast.success("¡Permit creado correctamente!");
        navigate(`/createBudget?permitId=${newPermitId}`);
      } else {
        console.error("Respuesta de éxito inesperada:", permitData);
        toast.error("Éxito, pero no se recibió el ID del permiso.");
      }

    } catch (error) {
      // --- Manejo de Error Simplificado ---
      console.error(">>> ERROR CAPTURADO EN handleSubmit:", error); // Log detallado del error
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
      }

      // --- Examinar el error directamente ---
      const errorDetails = error?.details; // Intenta acceder a la propiedad adjunta
      const responseData = error?.response?.data; // Intenta acceder a datos de respuesta Axios (si no se lanzó explícitamente)

      console.log(">>> error.details:", errorDetails);
      console.log(">>> error.response?.data:", responseData);

      let displayMessage = "Error al crear el permiso.";

      // Prioridad 1: Usar error.details si existe y tiene el código específico
      if (errorDetails && errorDetails.code === '23505' && errorDetails.constraint === 'Permits_propertyAddress_key1') {
        displayMessage = `Dirección ya existe: "${formData.propertyAddress}".`;
        toast.error(displayMessage, { autoClose: 7000 });
      }
      // Prioridad 2: Usar error.details.message si existe
      else if (errorDetails && errorDetails.message) {
        displayMessage = errorDetails.message;
        toast.error(`Error: ${displayMessage}`);
      }
      // Prioridad 3: Usar error.message (del objeto Error base)
      else if (error.message) {
        displayMessage = error.message;
        toast.error(`Error: ${displayMessage}`);
      }
      // Prioridad 4: Mensaje genérico
      else {
        toast.error(displayMessage);
      }
    }
    // --- FIN SIMPLIFICADO try/catch ---
  };

  return (
    <div className="container mx-auto p-4">
      <ToastContainer
        position="top-right" // Puedes cambiar la posición
        autoClose={3000} // Duración por defecto
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored" 
        />
      <h1 className="text-xl font-bold">Gestión de PDF y Permit</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
       
        <div className="bg-white shadow-md rounded-lg p-4 col-span-2">
         
          
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
                  {/* --- RENDERIZADO CONDICIONAL --- */}
                  {key === 'excavationRequired' ? (
                   // --- Renderizar Input + Select para Excavation ---
                   <div className="flex items-center space-x-2 mt-1">
                     <input
                       type="text"
                       name="excavationRequired"
                       value={formData.excavationRequired ?? ''}
                       onChange={handleInputChange}
                       className="block w-2/3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                       placeholder="Valor o descripción"
                     />
                     <select
                       name="excavationUnit" // Usa un nombre diferente si es necesario, o maneja en el submit
                       value={excavationUnit}
                       onChange={(e) => setExcavationUnit(e.target.value)}
                       className="block w-1/3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                     >
                       <option value="INCH">INCH</option>
                       <option value="FEET">FEET</option>
                     </select>
                   </div>
                 ) : (
                
                 <input
                   type={key === 'applicantEmail' ? 'email' : key === 'applicantPhone' ? 'tel' : 'text'} // Ajustar tipos de input
                   name={key}
                   value={formData[key] ?? ''} // Usar ?? '' para evitar uncontrolled input warning
                   onChange={handleInputChange}
                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                   required={key === 'applicantName' || key === 'propertyAddress'} // Marcar campos requeridos
                   />
                  )}
                  {/* --- FIN RENDERIZADO CONDICIONAL --- */}
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