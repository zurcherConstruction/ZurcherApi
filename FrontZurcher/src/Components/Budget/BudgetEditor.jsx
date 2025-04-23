import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { useParams, useNavigate } from "react-router-dom";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import {
  fetchBudgetById,
  updateBudget,
} from "../../Redux/Actions/budgetActions";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

const BudgetEditor = () => {
  const { budgetId: paramBudgetId } = useParams(); // Obtener budgetId desde los parámetros de la URL
  const dispatch = useDispatch();
  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  const budgetState = useSelector((state) => state.budget);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    idBudget: "",
    propertyAddress: "",
    applicantName: "",
    date: "",
    expirationDate: "",
    price: "",
    initialPayment: "",
    systemType: "",
    drainfieldDepth: "",
    gpdCapacity: "",
  });
  const [pdfPreview, setPdfPreview] = useState(null);
  const [manualBudgetId, setManualBudgetId] = useState(""); // Estado para el input del budgetId manual
  const [optionalDocPreview, setOptionalDocPreview] = useState(null); // Documento opcional
  const [currentPage, setCurrentPage] = useState(1); // Página actual (1 = PDF principal, 2 = Documento opcional)

  // Función para cargar el presupuesto por ID
  const loadBudget = (budgetId) => {
    if (budgetId) {
      dispatch(fetchBudgetById(budgetId));
    }
  };

  // Cargar el presupuesto automáticamente si viene desde los parámetros de la URL
  useEffect(() => {
    if (paramBudgetId) {
      loadBudget(paramBudgetId);
    }
  }, [paramBudgetId]);

  // Seleccionar el presupuesto desde el estado de Redux
  const budgetData = useSelector((state) =>
    (state.budget?.budgets || []).find(
      (budget) =>
        budget.idBudget.toString() === (paramBudgetId || manualBudgetId)
    )
  );

  // Actualizar el formulario cuando se recibe el presupuesto
  useEffect(() => {
    if (budgetData) {
      setFormData({
        idBudget: budgetData.idBudget || "",
        propertyAddress: budgetData.propertyAddress || "",
        applicantName: budgetData.applicantName || "",
        date: budgetData.date || "",
        expirationDate: budgetData.expirationDate || "",
        price: budgetData.price || "",
        initialPayment: budgetData.initialPayment || "",
        pdfData: budgetData.pdfData || "",
        systemType: budgetData.systemType || "",
        drainfieldDepth: budgetData.drainfieldDepth || "",
        gpdCapacity: budgetData.gpdCapacity || "",
      });
      if (budgetData.pdfData) {
        setPdfPreview(budgetData.pdfData);
      }
      if (budgetData.optionalDocs) {
        setOptionalDocPreview(budgetData.optionalDocs); // Documento opcional en base64
      }
    }
  }, [budgetData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(updateBudget(formData.idBudget, formData));
    alert("Presupuesto actualizado correctamente.");
    navigate("/budgets");
  };

  const handleManualBudgetIdChange = (e) => {
    setManualBudgetId(e.target.value);
  };

  const handleLoadManualBudget = () => {
    if (manualBudgetId) {
      loadBudget(manualBudgetId);
    } else {
      alert("Por favor, ingresa un ID de presupuesto válido.");
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Columna izquierda: Vista previa de los PDFs */}
        <div className="bg-white shadow-md rounded-lg p-4 col-span-2">
          <h2 className="text-xl font-bold mb-4">Vista previa de los PDFs</h2>

          {/* Botones para alternar entre PDF principal y opcional */}
          <div className="flex justify-between mb-4">
            <button
              onClick={() => setCurrentPage(1)}
              className={`py-1 px-2 rounded-md ${currentPage === 1
                  ? "bg-blue-950 text-white"
                  : "bg-gray-200 text-gray-700"
                }`}
            >
              Ver PDF Principal
            </button>
            <button
              onClick={() => setCurrentPage(2)}
              className={`py-1 px-2 rounded-md ${currentPage === 2
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
        </div>

        {/* Columna derecha: Formulario */}
        <div className="bg-white shadow-md rounded-lg p-4 col-span-1">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            {Object.keys(formData)
              .filter((key) => key !== "pdfData") // Excluir el campo pdfData
              .map((key) => (
                <div key={key}>
                  <label className="block text-sm font-medium capitalize text-gray-700">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </label>
                  <input
                    type="text"
                    name={key}
                    value={formData[key]}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
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

export default BudgetEditor;
