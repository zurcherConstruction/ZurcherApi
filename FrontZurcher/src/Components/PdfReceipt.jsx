import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { uploadPdf } from "../Redux/Actions/pdfActions";
import { createPermit, checkPermitByAddress } from "../Redux/Actions/permitActions";
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

  const [expirationWarning, setExpirationWarning] = useState({ type: "", message: "" });
  const [excavationUnit, setExcavationUnit] = useState("INCH"); 
  const [uploadType, setUploadType] = useState("main"); // "main" o "optional"
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  useEffect(() => {
    if (formData.expirationDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Comparar solo fechas

      // El input type="date" devuelve 'YYYY-MM-DD'
      // new Date('YYYY-MM-DD') puede tener problemas de zona horaria (interpretarse como UTC).
      // Es más seguro construir la fecha así para asegurar que es la fecha local:
      const dateParts = formData.expirationDate.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // Mes es 0-indexado
        const day = parseInt(dateParts[2], 10);
        
        const expDate = new Date(year, month, day);
        expDate.setHours(0,0,0,0);

        if (isNaN(expDate.getTime())) {
          setExpirationWarning({ type: "error", message: "Fecha de expiración inválida." });
          return;
        }

        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        if (expDate < today) {
          const msg = `¡Vencido! La fecha (${expDate.toLocaleDateString()}) ya pasó.`;
          setExpirationWarning({ type: "error", message: msg });
        } else if (expDate <= thirtyDaysFromNow) {
          const msg = `Próximo a vencer: La fecha (${expDate.toLocaleDateString()}) es en menos de 30 días.`;
          setExpirationWarning({ type: "warning", message: msg });
        } else {
          setExpirationWarning({ type: "", message: "" }); // Válido y no próximo a vencer
        }
      } else {
         setExpirationWarning({ type: "error", message: "Formato de fecha inválido." });
      }
    } else {
      setExpirationWarning({ type: "", message: "" }); // Sin fecha, sin advertencia
    }
  }, [formData.expirationDate]);
  
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

         // Asegurar que expirationDate sea un string YYYY-MM-DD si viene de la extracción
         let finalExpirationDate = extractedData.expirationDate;
         if (finalExpirationDate) {
           try {
               // Intentar normalizar a YYYY-MM-DD si es una fecha válida
               const d = new Date(finalExpirationDate);
               // Verificar si la fecha es válida (getTime() no es NaN)
               // y también que el año sea razonable (ej. no año 0001 si el parseo falla parcialmente)
               if (!isNaN(d.getTime()) && d.getFullYear() > 1000) { 
                   const year = d.getFullYear();
                   const month = String(d.getMonth() + 1).padStart(2, '0');
                   const day = String(d.getDate()).padStart(2, '0');
                   finalExpirationDate = `${year}-${month}-${day}`;
               } else {
                   console.warn("Extracted expiration date was invalid or couldn't be parsed reliably:", extractedData.expirationDate);
                   finalExpirationDate = ""; // o null, o mantener el valor original si se prefiere
               }
           } catch (parseError) {
               console.warn("Error parsing extracted expiration date:", parseError, extractedData.expirationDate);
               finalExpirationDate = ""; // o null
           }
         }


         setFormData((prevFormData) => ({
           ...prevFormData,
           ...extractedData,
           expirationDate: finalExpirationDate || prevFormData.expirationDate, 
         }));
         setExcavationUnit(detectedUnit);

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

  const checkExistingPermit = async (address) => {
    try {
      // La acción de Redux devuelve la data directamente o lanza un error
      const result = await dispatch(checkPermitByAddress(address));
      return result; // Esto será { exists: boolean, permit: object|null, hasBudget: boolean, message: string }
    } catch (error) {
      console.error("Error en checkExistingPermit (capturado en componente):", error);
      toast.error(error.message || `Error al verificar permiso existente.`);
      throw error; // Re-lanzar para que handleSubmit lo maneje si es necesario
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

    if (expirationWarning.type === "error" && formData.expirationDate) {
      const confirmExpired = await Swal.fire({
          title: 'Permiso Vencido',
          text: `${expirationWarning.message} ¿Aún así deseas crearlo? El presupuesto podría ser rechazado.`,
          icon: 'error',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'Sí, crear igualmente',
          cancelButtonText: 'Cancelar'
      });
      if (!confirmExpired.isConfirmed) {
          return; // Detener si el usuario cancela
      }
  } else if (expirationWarning.type === "warning" && formData.expirationDate) {
       const confirmSoonToExpire = await Swal.fire({
          title: 'Permiso Próximo a Vencer',
          text: `${expirationWarning.message} ¿Deseas continuar?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Sí, continuar',
          cancelButtonText: 'Cancelar'
      });
      if (!confirmSoonToExpire.isConfirmed) {
          return; 
      }
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

      loadingToastId = toast.loading("Procesando permiso...");

      // --- PASO 1: VERIFICAR SI EL PERMIT YA EXISTE ---
      // Aquí usamos la función checkExistingPermit que llama a la acción de Redux
      const existingPermitCheck = await checkExistingPermit(formData.propertyAddress);

      if (existingPermitCheck.exists) {
        if (existingPermitCheck.hasBudget) {
          toast.dismiss(loadingToastId);
          Swal.fire({
            title: 'Permiso Existente',
            text: `Ya existe un permiso para "${formData.propertyAddress}" y tiene presupuestos asociados. No se puede crear uno nuevo ni proceder.`,
            icon: 'info'
          });
          return; // Detener el proceso
        } else {
          // Permit existe pero NO tiene budget
          toast.dismiss(loadingToastId);
          const continueWithExisting = await Swal.fire({
            title: 'Permiso Existente Sin Presupuesto',
            text: `Ya existe un permiso para "${formData.propertyAddress}" pero no tiene presupuestos. ¿Deseas continuar para crear un presupuesto con este permiso?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'No, cancelar'
          });

          if (continueWithExisting.isConfirmed) {
            // Navegar a la creación del budget usando el ID del permit existente
            navigate(`/createBudget?permitId=${existingPermitCheck.permit.idPermit}`);
            return; // Detener el proceso actual
          } else {
            return; // El usuario decidió no continuar
          }
        }
      }
      if (toast.isActive(loadingToastId)) {
        // No es necesario reabrirlo si ya está activo
      } else {
        loadingToastId = toast.loading("Guardando nuevo permiso...");
      }
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

      if (error.message.includes("verificar permiso existente")) { // O alguna otra forma de identificar el origen
        // El error ya fue (o debería haber sido) mostrado por checkExistingPermit
        // No hacer nada más aquí o mostrar un mensaje genérico si es necesario.
        console.log("Error durante la verificación del permiso, ya manejado o será manejado por checkExistingPermit.");
    } else if (errorDetails && errorDetails.code === '23505' && errorDetails.constraint === 'Permits_propertyAddress_key1') {
      displayMessage = `Dirección ya existe: "${formData.propertyAddress}".`;
      toast.error(displayMessage, { autoClose: 7000 });
    } else if (errorDetails && errorDetails.message) {
      displayMessage = errorDetails.message;
      toast.error(`Error: ${displayMessage}`);
    } else if (error.message) {
      displayMessage = error.message;
      toast.error(`Error: ${displayMessage}`);
    } else {
      toast.error(displayMessage);
    }
  }
};
    // --- FIN SIMPLIFICADO try/catch ---
  

  return (
    <div className="max-w-7xl mx-auto p-4 min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-blue-900 flex items-center gap-3">
        <span className="inline-block bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-lg font-semibold">Permits & PDF</span>
        <span className="text-base font-normal text-gray-400">Document & Data Management</span>
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Panel PDF */}
        <div className="bg-white shadow-xl rounded-2xl p-6 col-span-2 flex flex-col">
          {/* Barra de acciones arriba con select y un solo input */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(1)} className={`py-2 px-2 rounded-lg font-semibold transition-all duration-200 ${currentPage === 1 ? "bg-blue-700 text-white shadow" : "bg-gray-100 text-blue-700 hover:bg-blue-50"}`}>Permit</button>
              <button onClick={() => setCurrentPage(2)} className={`py-2 px-2 rounded-lg font-semibold transition-all duration-200 ${currentPage === 2 ? "bg-blue-700 text-white shadow" : "bg-gray-100 text-blue-700 hover:bg-blue-50"}`}>Site Plan</button>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
             
              <select
                value={uploadType}
                onChange={e => setUploadType(e.target.value)}
                className="border border-gray-300 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="main">Permit</option>
                <option value="optional">Site Plane</option>
              </select>
              {uploadType === "main" ? (
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="block border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white p-2 w-full md:w-auto"
                />
              ) : (
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleOptionalDocUpload}
                  className="block border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white p-2 w-full md:w-auto"
                />
              )}
            </div>
          </div>
          <div className="flex-1 flex flex-col">
            {currentPage === 1 && pdfPreview ? (
              <div className="overflow-y-auto max-h-[600px] border border-gray-200 rounded-lg shadow-inner bg-gray-50">
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                  <Viewer fileUrl={pdfPreview} plugins={[defaultLayoutPluginInstance]} />
                </Worker>
              </div>
            ) : currentPage === 2 && optionalDocPreview ? (
              <div className="overflow-y-auto max-h-[600px] border border-gray-200 rounded-lg shadow-inner bg-gray-50">
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                  <Viewer fileUrl={optionalDocPreview} plugins={[defaultLayoutPluginInstance]} />
                </Worker>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-lg min-h-[200px]">{currentPage === 1 ? "No main PDF uploaded." : "No optional document uploaded."}</div>
            )}
          </div>
        </div>
        {/* Panel Formulario */}
        <div className="bg-white shadow-xl rounded-2xl p-6 col-span-1">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5">
            <h2 className="text-lg font-bold text-blue-800 mb-2">Permit Data</h2>
            {Object.keys(formData)
              .filter(
                (key) =>
                  key !== "applicationNumber" &&
                  key !== "constructionPermitFor" &&
                  key !== "dateIssued"
              )
              .map((key) => (
                <div key={key} className="mb-1">
                  {key === "applicantName" && (
                    <h3 className="text-xs font-semibold mt-2 mb-2 bg-blue-100 text-blue-800 p-1 rounded">CUSTOMER CLIENT</h3>
                  )}
                  <label className="block text-xs font-medium capitalize text-gray-700 mb-1">
                    {key === "applicantName"
                      ? "Name"
                      : key === "applicantEmail"
                      ? "Email"
                      : key === "applicantPhone"
                      ? "Phone"
                      : key === "propertyAddress"
                      ? "Property Address"
                      : key === "systemType"
                      ? "System Type"
                      : key === "lot"
                      ? "Lot"
                      : key === "block"
                      ? "Block"
                      : key === "gpdCapacity"
                      ? "GPD Capacity"
                      : key === "drainfieldDepth"
                      ? "Drainfield Depth"
                      : key === "excavationRequired"
                      ? "Excavation Required"
                      : key === "expirationDate"
                      ? "Expiration Date"
                      : key === "pump"
                      ? "Pump"
                      : key.replace(/([A-Z])/g, " $1").trim()}
                  </label>
                  {/* --- RENDERIZADO CONDICIONAL --- */}
                  {key === "excavationRequired" ? (
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        type="text"
                        name="excavationRequired"
                        value={formData.excavationRequired ?? ""}
                        onChange={handleInputChange}
                        className="block w-2/3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50"
                        placeholder="Value or description"
                      />
                      <select
                        name="excavationUnit"
                        value={excavationUnit}
                        onChange={(e) => setExcavationUnit(e.target.value)}
                        className="block w-1/3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50"
                      >
                        <option value="INCH">INCH</option>
                        <option value="FEET">FEET</option>
                      </select>
                    </div>
                  ) : (
                    <input
                      type={
                        key === "applicantEmail"
                          ? "email"
                          : key === "applicantPhone"
                          ? "tel"
                          : key === "expirationDate"
                          ? "date"
                          : "text"
                      }
                      name={key}
                      value={formData[key] ?? ""}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full border ${
                        key === "expirationDate" && expirationWarning.type === "error"
                          ? "border-red-500 bg-red-100 text-red-700 placeholder-red-700"
                          : key === "expirationDate" && expirationWarning.type === "warning"
                          ? "border-yellow-500 bg-yellow-100 text-yellow-700 placeholder-yellow-700"
                          : "border-gray-300 bg-gray-50"
                      } rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                      required={key === "applicantName" || key === "propertyAddress"}
                    />
                  )}
                  {key === "expirationDate" && expirationWarning.message && (
                    <p
                      className={`text-xs mt-1 ${
                        expirationWarning.type === "error"
                          ? "text-red-600 font-semibold"
                          : "text-yellow-600 font-semibold"
                      }`}
                    >
                      {expirationWarning.message}
                    </p>
                  )}
                  {/* --- FIN RENDERIZADO CONDICIONAL --- */}
                </div>
              ))}
            <button
              type="submit"
              className="bg-blue-700 text-white py-3 px-4 rounded-lg font-bold shadow hover:bg-blue-800 transition-all duration-200 mt-2"
            >
              Save Permit and Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PdfReceipt;