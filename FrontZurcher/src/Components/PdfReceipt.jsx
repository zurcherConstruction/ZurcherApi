import { useState } from "react";
import { useDispatch } from "react-redux";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { uploadPdf } from "../Redux/Actions/pdfActions";
import { createPermit } from "../Redux/Actions/permitActions";
import { createBudget } from "../Redux/Actions/budgetActions";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

const PdfReceipt = () => {
  const dispatch = useDispatch();
  const [pdfPreview, setPdfPreview] = useState(null);
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
    exavationRequired: "",
    dateIssued: "",
    expirationDate: "",
    pump: "",
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
  });
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      setPdfPreview(fileUrl);
      dispatch(uploadPdf(file)).then((action) => {
        if (action.payload) {
          // Actualizar el estado formData con los datos extraídos del PDF
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
  
    // Crear un objeto FormData para enviar el archivo PDF y los datos del formulario
    const formDataToSend = new FormData();
    formDataToSend.append("file", pdfPreview); // Archivo PDF
    Object.keys(formData).forEach((key) => {
      formDataToSend.append(key, formData[key]); // Agregar los datos del formulario
    });
  
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
        applicantName: formData.applicantName, // Nombre del solicitante
      };
  
      console.log("Datos enviados para crear el presupuesto:", budgetData);
      await dispatch(createBudget(budgetData));
  
      alert("Permiso y presupuesto creados correctamente");
    } catch (error) {
      console.error("Error al crear el permiso o presupuesto:", error);
      alert("Hubo un error al crear el permiso o presupuesto. Por favor, inténtalo de nuevo.");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Gestión de PDF, Permiso y Presupuesto</h1>

      {/* Subir PDF */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Subir PDF</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileUpload}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      {/* Vista previa del PDF */}
      {pdfPreview && (
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">Vista previa del PDF</h2>
          <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js`}>
            <Viewer fileUrl={pdfPreview} plugins={[defaultLayoutPluginInstance]} />
          </Worker>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.keys(formData).map((key) => (
          <div key={key}>
            <label className="block text-sm font-medium capitalize text-gray-700">
              {key.replace(/([A-Z])/g, " $1").trim()} {/* Formatear el nombre del campo */}
            </label>
            <input
              type="text"
              name={key}
              value={formData[key] || ""}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        ))}

        {/* Botón de envío */}
        <button
          type="submit"
          className="col-span-1 md:col-span-2 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
        >
          Guardar
        </button>
      </form>
    </div>
  );
};

export default PdfReceipt;
