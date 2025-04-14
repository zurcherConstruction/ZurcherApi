import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { useParams, useNavigate } from "react-router-dom";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { fetchBudgetById, updateBudget } from "../../Redux/Actions/budgetActions";
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
    drainfieldDepth:"",
    gpdCapacity: ""
  });
  const [pdfPreview, setPdfPreview] = useState(null);
  const [manualBudgetId, setManualBudgetId] = useState(""); // Estado para el input del budgetId manual

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
      (budget) => budget.idBudget.toString() === (paramBudgetId || manualBudgetId)
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
        pdfUrl: budgetData.pdfUrl || "",
        systemType: budgetData.systemType || "",
        drainfieldDepth: budgetData.drainfieldDepth || "",
        gpdCapacity: budgetData.gpdCapacity || "",
      });
      if (budgetData.pdfUrl) {
        setPdfPreview(budgetData.pdfUrl);
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
      {/* Card superior: Datos para editar */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-xl font-bold mb-4">Review Budget</h1>

        {pdfPreview && (
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-2">Preview PDF</h2>
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
              <Viewer
                fileUrl={pdfPreview}
                plugins={[defaultLayoutPluginInstance]}
              />
            </Worker>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {Object.keys(formData).map((key) => {
            if (key === "pdfUrl") return null;
            return (
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
            );
          })}
          <button
            type="submit"
            className="col-span-1 md:col-span-2 bg-blue-950 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
          >
            Save
          </button>
        </form>
      </div>

      {/* Card inferior: Búsqueda de presupuesto */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Search Budget</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Id Budget
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={manualBudgetId}
              onChange={handleManualBudgetIdChange}
              placeholder="Ingresa el ID del presupuesto"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <button
              onClick={handleLoadManualBudget}
              className="bg-blue-950 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetEditor;