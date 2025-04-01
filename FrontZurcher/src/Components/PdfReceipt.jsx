import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { uploadPdf } from "../Redux/Actions/pdfActions";
import { createPermit } from "../Redux/Actions/permitActions";
import { createBudget } from "../Redux/Actions/budgetActions";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

const PdfReceipt = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [pdfPreview, setPdfPreview] = useState(null);
  const [file, setFile] = useState(null); // Estado para el objeto File real
  const [formData, setFormData] = useState({
    permitNumber: "",
    applicationNumber: "",
    constructionPermitFor: "",
    applicant: "",
    propertyAddress: "",
    systemType: "",
    lot: "",
    block: "",
    gpdCapacity: "",
    drainfieldDepth: "",
    excavationRequired: "",
    dateIssued: "",
    expirationDate: "",
    pump: "",
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
  });
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    console.log("Archivo seleccionado:", uploadedFile);
    if (uploadedFile) {
      const fileUrl = URL.createObjectURL(uploadedFile);
      setPdfPreview(fileUrl); // Para la previsualización
      setFile(uploadedFile); // Guardar el objeto File real
      dispatch(uploadPdf(uploadedFile)).then((action) => {
        if (action.payload) {
          setFormData((prevFormData) => ({
            ...prevFormData,
            ...action.payload.data,
          }));
        }
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value, // Actualiza el campo correspondiente
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar si applicantName está vacío
    if (!formData.applicantName) {
      alert("El campo Applicant Name es obligatorio.");
      return;
    }

    console.log("Archivo PDF seleccionado:", file);
    if (!file) {
      alert("No se ha seleccionado ningún archivo PDF.");
      return;
    }

    // Crear un objeto FormData para enviar el archivo PDF y los datos del formulario
    const formDataToSend = new FormData();
    formDataToSend.append("file", file); // Usa el objeto File real
    Object.keys(formData).forEach((key) => {
      formDataToSend.append(key, formData[key]);
    });

    console.log("Contenido del FormData:");
    for (let [key, value] of formDataToSend.entries()) {
      if (key === "file") {
        console.log("Archivo:", value.name, value.size, value.type);
      } else {
        console.log(`${key}:`, value);
      }
    }

    try {
      // Crear el permiso
      console.log("Datos enviados para crear el permiso:", formData);
      await dispatch(createPermit(formDataToSend)); // Enviar FormData al backend

      // Crear el presupuesto
      const currentDate = new Date();
      const expirationDate = new Date(currentDate);
      expirationDate.setDate(currentDate.getDate() + 30);

      const price = formData.systemType?.includes("ATU") ? 15300 : 8900;
      const initialPayment = price * 0.6;

      const budgetData = {
        date: currentDate.toISOString().split("T")[0], // Fecha actual
        expirationDate: expirationDate.toISOString().split("T")[0], // Fecha de expiración
        price, // Precio calculado
        initialPayment, // Pago inicial calculado
        status: "created", // Estado inicial
        propertyAddress: formData.propertyAddress, // Dirección de la propiedad
        applicantName:formData.applicantName, // Nombre del solicitante
        systemType: formData.systemType, // Tipo de sistema
        drainfieldDepth: formData.drainfieldDepth, // Profundidad del campo de drenaje
        gpdCapacity: formData.gpdCapacity, // Capacidad en GPD
      };

      console.log("Datos enviados para crear el presupuesto:", budgetData);
      // Crear el presupuesto usando la acción createBudget

      // Suponiendo que createBudget devuelve el presupuesto creado con su id en createBudgetAction.payload.data.id

      console.log("Datos enviados para crear el presupuesto:", budgetData);
      const createBudgetAction = await dispatch(createBudget(budgetData));
      console.log("Respuesta de createBudgetAction:", createBudgetAction);

      // Verifica si la respuesta tiene la estructura esperada
      if (createBudgetAction && createBudgetAction.idBudget) {
        const newBudgetId = createBudgetAction.idBudget;
        alert("Permiso y presupuesto creados correctamente");
        navigate(`/editBudget/${newBudgetId}`);
      } else {
        console.error(
          "La respuesta de createBudget no contiene idBudget:",
          createBudgetAction
        );
        alert("Error al crear el presupuesto. No se recibió el id.");
      }
    } catch (error) {
      console.error("Error al crear el permiso o presupuesto:", error);
      alert(
        "Hubo un error al crear el permiso o presupuesto. Por favor, inténtalo de nuevo."
      );
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Gestión de PDF, Permiso y Presupuesto
      </h1>
  
      {/* Contenedor principal con diseño responsivo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Columna izquierda: Vista previa del PDF */}
        <div className="bg-white shadow-md rounded-lg p-4 col-span-1 md:col-span-2">
        
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Subir PDF
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
  
          {pdfPreview && (
            <div
              className="overflow-y-auto max-h-[700px] border border-gray-300 rounded-md"
              style={{ height: "700px" }} // Altura máxima para el contenedor del PDF
            >
              <Worker
                workerUrl={`https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js`}
              >
                <Viewer
                  fileUrl={pdfPreview}
                  plugins={[defaultLayoutPluginInstance]} // Habilitar scroll y navegación
                />
              </Worker>
            </div>
          )}
        </div>
  
        {/* Columna derecha: Formulario */}
        <div className="bg-white shadow-md rounded-lg p-4 col-span-1">
         
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-4"
          >
            {Object.keys(formData).map((key) => (
              <div key={key}>
                <label className="block text-xs font-medium capitalize text-gray-700">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </label>
                <input
                  type="text"
                  name={key}
                  value={formData[key] || ""}
                  onChange={handleInputChange}
                  className=" block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-xs"
                />
              </div>
            ))}
  
            {/* Botón de envío */}
            <button
              type="submit"
              className="bg-blue-950 text-white text-sm py-1 px-2 rounded-md hover:bg-indigo-700"
            >
              Guardar
            </button>
          </form>
        </div>
      </div>
    </div>
  );}

export default PdfReceipt;
