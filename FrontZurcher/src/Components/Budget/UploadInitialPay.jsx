import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { uploadInvoice, fetchBudgets, updateBudget } from '../../Redux/Actions/budgetActions';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const UploadInitialPay = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { budgets, loading: budgetsLoading, error: budgetsError } = useSelector((state) => state.budget);

  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [file, setFile] = useState(null);
  const [uploadedAmount, setUploadedAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    dispatch(fetchBudgets());
  }, [dispatch]);

  const handleBudgetSelect = (event) => {
    setSelectedBudgetId(event.target.value);
    setFile(null);
    setUploadedAmount(''); // <--- Resetear monto al cambiar presupuesto
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    const fileInput = event.target;

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Tipo de archivo no permitido. Sube un PDF o una imagen (JPG, PNG, GIF, WEBP).");
      setFile(null);
      fileInput.value = null;
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("El archivo no debe superar los 5 MB.");
      setFile(null);
      fileInput.value = null;
      return;
    }

    setFile(selectedFile);
  };

   const handleAmountChange = (event) => { // <--- Nueva función para manejar cambio de monto
    const value = event.target.value;
    // Permitir solo números y un punto decimal
    if (/^\d*\.?\d*$/.test(value)) {
      setUploadedAmount(value);
    }
  };

 const handleUpload = async () => {
    if (!selectedBudgetId || !file || !uploadedAmount) { // <--- Validar que el monto también esté presente
      toast.error("Por favor, selecciona un presupuesto, un archivo y especifica el monto del comprobante.");
      return;
    }

    const parsedAmount = parseFloat(uploadedAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("El monto del comprobante debe ser un número positivo.");
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);
    let uploadToast;

    try {
      uploadToast = toast.loading("Iniciando la carga del comprobante...");

       const uploadResult = await dispatch(uploadInvoice(selectedBudgetId, file, parsedAmount, (progress) => {
        setUploadProgress(progress);
        if (uploadToast) {
          toast.update(uploadToast, {
            render: `Subiendo: ${progress}%`,
            type: "info",
          });
        }
      }));

      if (!uploadResult?.payload) {
        throw new Error('Error al subir el comprobante');
      }

      toast.update(uploadToast, {
        render: "Actualizando estado del presupuesto...",
        type: "info",
        isLoading: true
      });

      const updateResult = await dispatch(updateBudget(selectedBudgetId, { 
        status: 'approved',
        invoiceUrl: uploadResult.payload.url
      }));

      if (!updateResult?.payload) {
        throw new Error('Error al actualizar el estado del presupuesto');
      }

      toast.update(uploadToast, {
        render: "¡Comprobante subido y presupuesto aprobado!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      // Limpiar formulario
      setSelectedBudgetId('');
      setFile(null);
      setUploadedAmount('');
      setUploadProgress(0);
      const fileInput = document.getElementById('invoice-upload-input');
      if (fileInput) fileInput.value = null;

      // Recargar datos y navegar
      await dispatch(fetchBudgets());
      navigate('/dashboard');

    } catch (error) {
      console.error("Error durante la carga:", error);
      
      if (uploadToast) {
        toast.update(uploadToast, {
          render: error.message.includes('timeout') || error.code === 'ECONNABORTED'
            ? "La carga está tomando más tiempo de lo esperado. Por favor, intenta con un archivo más pequeño."
            : `Error: ${error.message || 'Error desconocido'}`,
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sendBudgets = budgets.filter(b =>b.status === 'send' || b.status === 'sent_for_signature');

  if (budgetsLoading) {
    return <p className="text-blue-500 p-4">Cargando presupuestos...</p>;
  }

  if (budgetsError) {
    return <p className="text-red-500 p-4">Error al cargar presupuestos: {budgetsError}</p>;
  }

  if (sendBudgets.length === 0) {
    return <p className="text-gray-500 text-sm p-4">No hay presupuestos pendientes de comprobante.</p>;
  }

    const selectedBudgetDetails = selectedBudgetId ? budgets.find(b => b.idBudget === parseInt(selectedBudgetId)) : null;

  return (
    <div className="p-4 border border-gray-300 rounded-lg shadow-md my-4 bg-gray-50 max-w-md mx-auto">
      <h2 className="text-md font-semibold mb-3 text-gray-700">Subir Comprobante de Pago Inicial</h2>
      
      <div className="mb-3">
        <label htmlFor="budget-select" className="block text-sm font-medium text-gray-600 mb-1">
          Seleccionar Presupuesto (Estado: Enviado):
        </label>
        <select
          id="budget-select"
          value={selectedBudgetId}
          onChange={handleBudgetSelect}
          className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          <option value="">-- Seleccionar Presupuesto --</option>
          {sendBudgets.map((budget) => (
            <option key={budget.idBudget} value={budget.idBudget}>
              {budget.applicantName} - {budget.propertyAddress}
            </option>
          ))}
        </select>
      </div>

       {selectedBudgetId && (
        <>
          <div className="mb-3">
            <label htmlFor="invoice-upload-input" className="block text-sm font-medium text-gray-600 mb-1">
              Seleccionar Comprobante (PDF o Imagen):
            </label>
            <input
              id="invoice-upload-input"
              name="file"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="mb-3"> {/* <--- Nuevo campo para el monto --> */}
            <label htmlFor="uploaded-amount-input" className="block text-sm font-medium text-gray-600 mb-1">
              Monto del Comprobante:
            </label>
            <input
              id="uploaded-amount-input"
              type="text" // Usar text para permitir validación manual, o number con step="0.01"
              value={uploadedAmount}
              onChange={handleAmountChange}
              placeholder="Ej: 1250.50"
              className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {selectedBudgetDetails && (
              <p className="text-xs text-gray-500 mt-1">
                Pago inicial esperado para este presupuesto: ${parseFloat(selectedBudgetDetails.initialPayment).toFixed(2)}
              </p>
            )}
          </div>
        </>
      )}

      {isLoading && uploadProgress > 0 && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-1 text-center">{uploadProgress}% completado</p>
        </div>
      )}

       {selectedBudgetId && file && uploadedAmount && (
        <button
          onClick={handleUpload}
          disabled={isLoading}
          className={`w-full px-4 py-2 rounded text-white font-semibold text-sm ${
            isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Subiendo...
            </span>
          ) : 'Subir Comprobante y Aprobar'}
        </button>
      )}
    </div>
  );
};

export default UploadInitialPay;