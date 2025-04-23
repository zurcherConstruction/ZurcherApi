import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { uploadPdf } from "../Redux/Actions/pdfActions";
import { createPermit } from "../Redux/Actions/permitActions";
import { createBudget } from "../Redux/Actions/budgetActions";
import { fetchSystemTypes } from "../Redux/Actions/SystemActions"; // Importar la acción para obtener los systemTypes
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

const PdfReceipt = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [pdfPreview, setPdfPreview] = useState(null); // Previsualización del PDF principal
  const [optionalDocPreview, setOptionalDocPreview] = useState(null); // Previsualización del documento opcional
  const [file, setFile] = useState(null); // Archivo PDF principal
  const [optionalDocs, setOptionalDocs] = useState(null); // Documento opcional
  const [currentPage, setCurrentPage] = useState(1); 
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

  const { systemTypes } = useSelector(
    (state) => state.systemType
  ); // Obtener los systemTypes desde Redux

  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  useEffect(() => {
    dispatch(fetchSystemTypes()); // Obtener los systemTypes al cargar el componente
  }, [dispatch]);

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

  const handleOptionalDocUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      const fileUrl = URL.createObjectURL(uploadedFile);
      setOptionalDocPreview(fileUrl); // Previsualización del documento opcional
      setOptionalDocs(uploadedFile); // Guardar el archivo opcional
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar si applicantName está vacío
    if (!formData.applicantName) {
      alert("El campo Applicant Name es obligatorio.");
      return;
    }

    if (!file) {
      alert("No se ha seleccionado ningún archivo PDF.");
      return;
    }

    try {
      // Crear un objeto FormData para enviar el archivo PDF y los datos del formulario
      const formDataToSend = new FormData();
      formDataToSend.append("pdfData", file); // Archivo principal
      if (optionalDocs) {
        formDataToSend.append("optionalDocs", optionalDocs); // Documentación opcional
      }
      Object.keys(formData).forEach((key) => {
        formDataToSend.append(key, formData[key]);
      });

      // Enviar los datos al backend para crear el permiso
      console.log("Datos enviados para crear el permiso:", formData);
      await dispatch(createPermit(formDataToSend)); // Enviar FormData al backend

      // Crear el presupuesto
      const currentDate = new Date();
      const expirationDate = new Date(currentDate);
      expirationDate.setDate(currentDate.getDate() + 30);

      const selectedSystemType = systemTypes.find(
        (type) => type.name === formData.systemType
      );
      const price = selectedSystemType ? selectedSystemType.price : 0;
      const initialPayment = price * 0.6;

      const budgetData = {
        date: currentDate.toISOString().split("T")[0], // Fecha actual
        expirationDate: expirationDate.toISOString().split("T")[0], // Fecha de expiración
        price, // Precio calculado
        initialPayment, // Pago inicial calculado
        status: "created", // Estado inicial
        propertyAddress: formData.propertyAddress, // Dirección de la propiedad
        applicantName: formData.applicantName, // Nombre del solicitante
        systemType: formData.systemType, // Tipo de sistema
        drainfieldDepth: formData.drainfieldDepth, // Profundidad del campo de drenaje
        gpdCapacity: formData.gpdCapacity, // Capacidad en GPD
      };

      console.log("Datos enviados para crear el presupuesto:", budgetData);

      // Crear el presupuesto usando la acción createBudget
      const createBudgetAction = await dispatch(createBudget(budgetData));
      console.log("Respuesta de createBudgetAction:", createBudgetAction);

      // Verificar si la respuesta tiene la estructura esperada
      if (createBudgetAction && createBudgetAction.idBudget) {
        const newBudgetId = createBudgetAction.idBudget;
        alert("Permiso y presupuesto creados correctamente");
        navigate(`/editBudget/${newBudgetId}`);
      } else {
        console.error(
          "La respuesta de createBudget no contiene idBudget:",
          createBudgetAction
        );
        alert("Error al crear el presupuesto.");
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
      <h1 className="text-2xl font-bold mb-4">Gestión de PDF y Permiso</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Columna izquierda: Vista previa del PDF */}
        <div className="bg-white shadow-md rounded-lg p-4 col-span-2">
          <h2 className="text-xl font-bold mb-4">Vista previa del PDF</h2>

          {/* Botones para alternar entre PDF principal y opcional */}
          <div className="flex justify-between mb-4">
            <button
              onClick={() => setCurrentPage(1)}
              className={`py-1 px-2 rounded-md ${
                currentPage === 1
                  ? "bg-blue-950 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              Ver PDF Principal
            </button>
            <button
              onClick={() => setCurrentPage(2)}
              className={`py-1 px-2 rounded-md ${
                currentPage === 2
                  ? "bg-blue-950 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              Ver Documento Opcional
            </button>
          </div>

          {/* Vista previa del PDF */}
          {currentPage === 1 && pdfPreview ? (
            <div className="overflow-y-auto max-h-[700px] border border-gray-300 rounded-md">
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                <Viewer
                  fileUrl={pdfPreview}
                  plugins={[defaultLayoutPluginInstance]}
                />
              </Worker>
            </div>
          ) : currentPage === 2 && optionalDocPreview ? (
            <div className="overflow-y-auto max-h-[700px] border border-gray-300 rounded-md">
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                <Viewer
                  fileUrl={optionalDocPreview}
                  plugins={[defaultLayoutPluginInstance]}
                />
              </Worker>
            </div>
          ) : (
            <p className="text-gray-500">
              {currentPage === 1
                ? "No se ha cargado ningún PDF principal."
                : "No se ha cargado ningún documento opcional."}
            </p>
          )}

          {/* Inputs para cargar los documentos */}
          {currentPage === 1 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Cargar PDF Principal
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          )}
          {currentPage === 2 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Cargar Documento Opcional
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleOptionalDocUpload}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          )}
        </div>

        {/* Columna derecha: Formulario */}
        <div className="bg-white shadow-md rounded-lg p-4 col-span-1">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            {Object.keys(formData)
              .filter(
                (key) =>
                  key !== "applicationNumber" &&
                  key !== "constructionPermitFor" &&
                  key !== "dateIssued" // Excluir estos campos
              )
              .map((key) => (
              <div key={key}>
                 {key === "applicantName" && (
            <h2 className="text-sm font-semibold mt-2 mb-2 bg-blue-950 text-white p-1 rounded-md">
              CUSTOMER CLIENT
            </h2>
          )}
          <label className="block text-xs font-medium capitalize text-gray-700">
            {key === "applicantName"
              ? "Name"
              : key === "applicantEmail"
              ? "Email"
              : key === "applicantPhone"
              ? "Phone"
              : key.replace(/([A-Z])/g, " $1").trim()}
          </label>
                {key === "systemType" ? (
                  <select
                    name={key}
                    value={formData[key]}
                    onChange={handleInputChange}
                    className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Seleccione un tipo de sistema</option>
                    {systemTypes.map((type) => (
                      <option key={type.id} value={type.name}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name={key}
                    value={formData[key]}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                )}
              </div>
            ))}
            <button
              type="submit"
              className="bg-blue-950 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
            >
              Guardar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};


export default PdfReceipt;
