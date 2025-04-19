import  { useState, useEffect } from 'react';
// import PropTypes from 'prop-types'; // Ya no se necesitan propTypes para sendBudgets/onUploadSuccess
import { useDispatch, useSelector } from 'react-redux';
import { uploadInvoice, fetchBudgets, updateBudget } from '../../Redux/Actions/budgetActions';
// Opcional: para navegar después de la carga
 import { useNavigate } from 'react-router-dom'; 

// Ya no recibe props sendBudgets ni onUploadSuccess
const UploadInitialPay = () => { 
  const dispatch = useDispatch();
   const navigate = useNavigate(); 

  // Obtener TODOS los budgets y el estado de carga/error del store
  const { budgets, loading: budgetsLoading, error: budgetsError } = useSelector((state) => state.budget);

  const [selectedBudgetId, setSelectedBudgetId] = useState(''); 
  const [file, setFile] = useState(null); 
  const [isLoading, setIsLoading] = useState(false); // Carga específica del upload

  // Cargar los budgets al montar el componente
  useEffect(() => {
    dispatch(fetchBudgets());
  }, [dispatch]);

  const handleBudgetSelect = (event) => {
    setSelectedBudgetId(event.target.value);
    setFile(null); 
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    const fileInput = event.target; // Guarda referencia al input
    if (!selectedFile) {
      setFile(null);
      return;
    }

    // --- Validación de Tipo (PDF o Imagen) ---
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(selectedFile.type)) {
      alert("Tipo de archivo no permitido. Sube un PDF o una imagen (JPG, PNG, GIF, WEBP).");
      setFile(null);
      fileInput.value = null; // Limpia input
      return;
    }
    // --- Fin Validación de Tipo ---

    // --- Validación de Tamaño ---
    if (selectedFile.size > 5 * 1024 * 1024) { // 5 MB
      alert("El archivo no debe superar los 5 MB.");
      setFile(null);
      fileInput.value = null; // Limpia input
      return;
    }
    // --- Fin Validación de Tamaño ---

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!selectedBudgetId || !file) {
      alert("Por favor, selecciona un presupuesto y un archivo PDF.");
      return;
    }
    setIsLoading(true); 
    try {
      // 1. Sube la factura
      await dispatch(uploadInvoice(selectedBudgetId, file));
      
      // 2. Si la subida fue exitosa, actualiza el estado a 'approved'
      await dispatch(updateBudget(selectedBudgetId, { status: 'approved' })); 

      alert("Pago cargado y presupuesto aprobado exitosamente."); // Mensaje actualizado
      
      setSelectedBudgetId(''); 
      setFile(null);

      const fileInput = document.getElementById('invoice-upload-input');
      if (fileInput) fileInput.value = null;
      
      // 3. Navega al dashboard
      navigate('/dashboard'); // <-- ¡AQUÍ!
      
      // 3. Refresca la lista para asegurar consistencia (opcional pero recomendado)
      dispatch(fetchBudgets()); 
      
      // navigate('/budgets'); // O a donde quieras ir
    } catch (error) {
      // Considera dar mensajes de error más específicos si es posible
      console.error("Error durante la carga o actualización:", error); 
      alert("Error al procesar el comprobante: " + (error.message || "Unknown error"));
    } finally {
      setIsLoading(false); 
      const fileInput = document.getElementById('invoice-upload-input');
      if (fileInput) fileInput.value = null;
    }
  };

  // Filtrar los budgets en estado 'send' DESPUÉS de obtenerlos del store
  const sendBudgets = budgets.filter(b => b.status === 'send');

  // Manejar estado de carga de los budgets
  if (budgetsLoading) {
    return <p className="text-blue-500 p-4">Loading budgets...</p>;
  }
  if (budgetsError) {
    return <p className="text-red-500 p-4">Error loading budgets: {budgetsError}</p>;
  }

  // Si no hay presupuestos en estado 'send' después de cargar
  if (sendBudgets.length === 0) {
    return <p className="text-gray-500 text-sm p-4">No budgets awaiting invoice upload.</p>;
  }

  // El resto del return es igual, usando la variable local 'sendBudgets'
  return (
    <div className="p-4 border border-gray-300 rounded-lg shadow-md my-4 bg-gray-50 max-w-md mx-auto"> {/* Estilo opcional */}
      <h2 className="text-md font-semibold mb-3 text-gray-700">Upload Initial Payment Proof</h2>
      
      {/* Selector de Presupuesto */}
      <div className="mb-3">
        <label htmlFor="budget-select" className="block text-sm font-medium text-gray-600 mb-1">
          Select Budget (Status: Send):
        </label>
        <select
          id="budget-select"
          value={selectedBudgetId}
          onChange={handleBudgetSelect}
          className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          <option value="" disabled>-- Select a Budget --</option>
          {sendBudgets.map((budget) => (
            <option key={budget.idBudget} value={budget.idBudget}>
              {budget.applicantName} - {budget.propertyAddress}
            </option>
          ))}
        </select>
      </div>

      {/* Input de Archivo */}
      {selectedBudgetId && (
        <div className="mb-3">
           {/* Label actualizada */}
          <label htmlFor="invoice-upload-input" className="block text-sm font-medium text-gray-600 mb-1">
            Select Proof (PDF or Image): 
          </label>
          <input
            id="invoice-upload-input"
            type="file"
            // Accept actualizado
            accept="application/pdf,image/jpeg,image/png,image/gif,image/webp" 
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
      )}

      {/* Botón de Carga */}
      {selectedBudgetId && file && (
        <button
          onClick={handleUpload}
          disabled={isLoading}
          className={`w-full px-4 py-2 rounded text-white font-semibold text-sm ${
            isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
           {/* Texto actualizado */}
          {isLoading ? 'Uploading...' : 'Upload Proof & Approve'} 
        </button>
      )}
    </div>
  );
};



export default UploadInitialPay;