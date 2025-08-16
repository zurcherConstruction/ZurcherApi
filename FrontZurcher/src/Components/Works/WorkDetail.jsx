import { useEffect, useState, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorkById, updateWork, sendChangeOrderToClient, deleteChangeOrder, addImagesToWork } from "../../Redux/Actions/workActions";
import { balanceActions } from "../../Redux/Actions/balanceActions";
import {
  fetchIncomesAndExpensesRequest,
  fetchIncomesAndExpensesSuccess,
  fetchIncomesAndExpensesFailure,
} from "../../Redux/Reducer/balanceReducer"; // Ajusta esta ruta si es necesario
import { fetchInspectionsByWork } from '../../Redux/Actions/inspectionActions'
import { useParams } from "react-router-dom";
//import api from "../../utils/axios";
import FinalInvoice from "../Budget/FinalInvoice"
import InspectionFlowManager from "./InspectionFlowManager";
import FinalInspectionFlowManager from "./FinalInspectionFlowManager"
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid'; // Para el banner
import CreateChangeOrderModal from './CreateChangeOrderModal'; // Importar el nuevo modal
import api from "../../utils/axios";
import useAutoRefresh from "../../utils/useAutoRefresh";
import PdfModal from "../Budget/PdfModal"; // Asegúrate de que esta ruta sea correcta


const WorkDetail = () => {
  const { idWork } = useParams();
  const dispatch = useDispatch();

  // Refresco automático cada 60 segundos
  useAutoRefresh(() => fetchWorkById(idWork), 360000, [idWork]);



  const {
    selectedWork: work,
    loading: workLoading, // Renombrado para evitar conflicto si FinalInvoice usa 'loading'
    error: workError,     // Renombrado
  } = useSelector((state) => state.work);

const workRef = useRef(work);

  useEffect(() => {
    // Compara la referencia actual de work con la guardada
    if (workRef.current !== work) {
     
      workRef.current = work; // Actualiza la referencia guardada
    } else {
     
    }
  }, [work]);

  
  const [selectedImage, setSelectedImage] = useState(null);
  const [fileBlob, setFileBlob] = useState(null);
  const [openSections, setOpenSections] = useState({}); // Cambiado a un objeto para manejar múltiples secciones
  const [showFinalInvoice, setShowFinalInvoice] = useState(false);
  const [selectedInstalledImage, setSelectedInstalledImage] = useState(null);
  const {
    incomes,
    expenses,
    loading: balanceLoading, // Renombrado para evitar conflicto
    error: balanceError, // Renombrado para evitar conflicto
  } = useSelector((state) => state.balance);

  const [showCreateCOModal, setShowCreateCOModal] = useState(false);
  const [showEditCOModal, setShowEditCOModal] = useState(false); // Estado para el modal de edición
  const [editingCO, setEditingCO] = useState(null); // Estado para la CO que se está editando
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrlCo, setPdfUrlCo] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [showUploadFinalInspectionImage, setShowUploadFinalInspectionImage] = useState(false);
  const [finalInspectionImageFile, setFinalInspectionImageFile] = useState(null);
  const [uploadingFinalImage, setUploadingFinalImage] = useState(false);
  const [showUploadInstalledImage, setShowUploadInstalledImage] = useState(false);
  const [installedImageFile, setInstalledImageFile] = useState(null);
  const [uploadingInstalledImage, setUploadingInstalledImage] = useState(false);
  const [installedImageComment, setInstalledImageComment] = useState('');
 const [showBudgetPdfModal, setShowBudgetPdfModal] = useState(false);
const [budgetPdfUrl, setBudgetPdfUrl] = useState('');
 
  // --- 1. CALCULAR TOTALES Y BALANCE ---
  const { totalIncome, totalExpense, balance } = useMemo(() => {
    const incomeSum = incomes?.reduce((sum, income) => sum + parseFloat(income.amount || 0), 0) || 0;
    const expenseSum = expenses?.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0) || 0;
    const calculatedBalance = incomeSum - expenseSum;
    return {
      totalIncome: incomeSum,
      totalExpense: expenseSum,
      balance: calculatedBalance,
    };
  }, [incomes, expenses]);


  // --- 1. Consolidar todos los recibos usando useMemo ---
  const allReceipts = useMemo(() => {
    const consolidated = [];

    // --- AÑADIR COMPROBANTE PAGO INICIAL (BUDGET) ---
    if (work?.budget?.paymentInvoice && work.budget.idBudget) { // Asegurarse que hay URL y ID de budget
      let mimeType = 'application/octet-stream'; // Tipo por defecto
      if (work.budget.paymentProofType === 'pdf') {
        mimeType = 'application/pdf';
      } else if (work.budget.paymentProofType === 'image') {
        // Intentar inferir tipo de imagen desde la URL si es posible, sino usar genérico
        const extension = work.budget.paymentInvoice.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg'].includes(extension)) mimeType = 'image/jpeg';
        else if (extension === 'png') mimeType = 'image/png';
        else if (extension === 'gif') mimeType = 'image/gif';
        else mimeType = 'image/jpeg'; // O un tipo de imagen genérico
      }

      // Determinar el monto a mostrar para el comprobante inicial
      const initialPaymentDisplayAmount = work.budget.paymentProofAmount !== null && !isNaN(parseFloat(work.budget.paymentProofAmount))
        ? parseFloat(work.budget.paymentProofAmount).toFixed(2)
        : parseFloat(work.budget.initialPayment || 0).toFixed(2);

      const paymentNotes = work.budget.paymentProofAmount !== null && !isNaN(parseFloat(work.budget.paymentProofAmount))
        ? `Comprobante cargado por $${initialPaymentDisplayAmount}`
        : `Pago inicial del presupuesto por $${initialPaymentDisplayAmount}`;

      consolidated.push({
        idReceipt: `budget-${work.budget.idBudget}-payment`,
        fileUrl: work.budget.paymentInvoice,
        mimeType: mimeType,
        originalName: 'Comprobante Pago Inicial',
        notes: paymentNotes,
        type: 'Comprobante Pago Inicial',
        relatedRecordType: 'Presupuesto',
        relatedRecordDesc: `Pago Inicial (Comprobante: $${initialPaymentDisplayAmount})`,
        // createdAt: work.budget.updatedAt || work.budget.createdAt 
      });
    }
    // --- FIN AÑADIR COMPROBANTE PAGO INICIAL ---

    // Recibos de Work
    if (work?.Receipts) {
      consolidated.push(...work.Receipts.map(r => ({ ...r, relatedRecordType: 'Obra', relatedRecordDesc: work.propertyAddress })));
    }

    // Recibos de Income
    if (incomes) {
      incomes.forEach(income => {
        if (income.Receipts) {
          consolidated.push(...income.Receipts.map(r => ({ ...r, relatedRecordType: 'Ingreso', relatedRecordDesc: `${income.typeIncome} - $${income.amount}` })));
        }
      });
    }

    // Recibos de Expense
    if (expenses) {
      expenses.forEach(expense => {
        if (expense.Receipts) {
          consolidated.push(...expense.Receipts.map(r => ({ ...r, relatedRecordType: 'Gasto', relatedRecordDesc: `${expense.typeExpense} - $${expense.amount}` })));
        }
      });
    }

    // Opcional: Ordenar por fecha si los recibos tienen createdAt/updatedAt
    consolidated.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return consolidated;
  }, [work?.budget, work?.Receipts, incomes, expenses, work?.propertyAddress]); // Dependencias


  useEffect(() => {
    if (idWork) { // Asegúrate de que idWork no sea undefined
      dispatch(fetchWorkById(idWork));
    }
  }, [dispatch, idWork]);

  useEffect(() => {
    const setInvoiceUrl = () => {
      try {
        if (work?.budget?.paymentInvoice) {
          // Si la URL viene del backend, usarla directamente
          setFileBlob(work.budget.paymentInvoice);
        } else {
          setFileBlob(null);
        }
      } catch (error) {
       
        setFileBlob(null);
      }
    };

    setInvoiceUrl();
  }, [work?.budget?.paymentInvoice]);

  useEffect(() => {
    const fetchBalanceData = async () => {
      if (!idWork) return; // Asegurarse de que idWork exista

      dispatch(fetchIncomesAndExpensesRequest()); // Inicia la carga
      try {
        // Pasar idWork a la acción
        const data = await balanceActions.getIncomesAndExpensesByWorkId(idWork);
        if (data.error) {
          console.error("Error fetching incomes/expenses:", data.message);
          dispatch(fetchIncomesAndExpensesFailure(data.message));
        } else {
          
          // El payload debe ser { incomes: [...], expenses: [...] } según el reducer
          dispatch(fetchIncomesAndExpensesSuccess(data));
        }
      } catch (err) {
        console.error("Unexpected error fetching incomes/expenses:", err);
        dispatch(fetchIncomesAndExpensesFailure(err.message));
      }
    };

    fetchBalanceData();
    // Dependencia: dispatch y idWork
  }, [dispatch, idWork]);

  // Filtrar imágenes de "sistema instalado"
  const installedImages = useMemo(() => {
    return Array.isArray(work?.images)
      ? work.images.filter(img => img.stage === 'sistema instalado')
      : [];
  }, [work?.images]);

   // Define los estados en los que se debe poder seleccionar una imagen para inspección/reinspección
  const canSelectInspectionImageStates = [
    'installed', // Para inspección inicial
    'rejectedInspection', // Para reinspección de inicial
    'finalRejected' // Para reinspección de final (si tienes un estado así)
    // Añade otros estados si es necesario, por ejemplo, si una reinspección puede pedirse desde 'workerCorrected'
  ];

  // Lógica para determinar el botón a mostrar en el encabezado
  let displayHeaderButton = false;
  let headerButtonText = "";
  let headerButtonAction = null;
  let headerButtonClasses = "text-white font-bold py-2 px-4 rounded shadow-lg transition duration-150 ease-in-out";

  // --- LÓGICA DEL BOTÓN AJUSTADA (SOLO PARA CASOS ESPECIALES) ---

  // Nota: Las transiciones principales ahora son automáticas:
  // - approvedInspection → coverPending (automático cuando se aprueba inspección inicial)
  // - covered → invoiceFinal (automático cuando se envía factura final)
  
  // Solo mantener botones para casos especiales o de respaldo
  if (work?.status === 'approvedInspection') {
    // Botón de respaldo por si la automatización falla
    displayHeaderButton = true;
    headerButtonText = "⚠️ Manual: Cambiar a Pendiente de Cubrir";
    headerButtonClasses += " bg-yellow-500 hover:bg-yellow-600"; // Color de advertencia
    headerButtonAction = async () => {
      
      await dispatch(updateWork(idWork, { status: "coverPending" }));
    };
  } else if (work?.status === 'covered') {
    // Botón de respaldo por si la automatización falla
    displayHeaderButton = true;
    headerButtonText = "⚠️ Manual: Marcar Factura Final Enviada";
    headerButtonClasses += " bg-yellow-600 hover:bg-yellow-700"; // Color de advertencia
    headerButtonAction = async () => {
      
      await dispatch(updateWork(idWork, { status: "invoiceFinal" }));
    };
  }

  const needsStoneExtractionCO = work?.stoneExtractionCONeeded === true;

  const handleSendCOToClient = async (coId) => {
    if (!coId) {
      console.error("ID de Orden de Cambio no válido para enviar.");
      alert("Error: ID de Orden de Cambio no válido.");
      return;
    }
   
    try {
      const result = await dispatch(sendChangeOrderToClient(coId));
      if (result && !result.error) {
        alert(result.message || 'Orden de Cambio enviada al cliente exitosamente!');
        // Refrescar los datos de la obra para ver el estado actualizado de la CO
        dispatch(fetchWorkById(work.idWork));
      } else {
        alert(`Error al enviar la Orden de Cambio: ${result?.message || 'Error desconocido'}`);
      }
    } catch (error) {
      alert(`Error al enviar la Orden de Cambio: ${error.message}`);
    }
    // Opcional: Ocultar indicador de carga
  };
  const handleEditCO = (coToEdit) => {
   
    setEditingCO(coToEdit);
    setShowEditCOModal(true);
  };

  const handleDeleteCO = async (coId) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta Orden de Cambio? Esta acción no se puede deshacer.")) return;
    try {
      const result = await dispatch(deleteChangeOrder(coId));
      if (result && result.success) {
        alert("Orden de Cambio eliminada correctamente.");
        dispatch(fetchWorkById(work.idWork)); // Refresca la lista
      } else {
        alert(result?.message || "Error al eliminar la Orden de Cambio.");
      }
    } catch (error) {
      alert(error.message || "Error inesperado al eliminar la Orden de Cambio.");
    }
  };

    const handleFinalInspectionImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setFinalInspectionImageFile(event.target.files[0]);
    }
  };

  const handleUploadFinalInspectionImage = async () => {
    if (!finalInspectionImageFile || !work?.idWork) {
      alert("Por favor, selecciona un archivo y asegúrate de que la obra esté cargada.");
      return;
    }

    setUploadingFinalImage(true);
    const formData = new FormData();
    formData.append("imageFile", finalInspectionImageFile); // El backend espera 'images' como un array de archivos
    formData.append("stage", "inspeccion final");
    // Puedes añadir más campos al formData si tu backend los espera para esta etapa, ej: comment, dateTime
    // formData.append("comment", "Imagen para inspección final subida por el administrador.");
    // formData.append("dateTime", new Date().toISOString());

    try {
      const result = await dispatch(addImagesToWork(work.idWork, formData));
      if (result && !result.error) {
        alert("Imagen para inspección final subida correctamente.");
        setFinalInspectionImageFile(null);
        setShowUploadFinalInspectionImage(false);
        // Opcional: refrescar los datos de la obra para ver la nueva imagen inmediatamente
        dispatch(fetchWorkById(work.idWork));
      } else {
        alert(`Error al subir la imagen: ${result?.message || 'Error desconocido'}`);
      }
    } catch (error) {
      alert(`Error al subir la imagen: ${error.message}`);
    } finally {
      setUploadingFinalImage(false);
    }
  };

   // Lógica para determinar qué gestor de flujo mostrar
  const showInitialInspectionManager = useMemo(() => {
    if (!work?.status) return false;
    // Estados de la OBRA en los que se muestra el gestor de inspección INICIAL
    const initialWorkStates = [
      'installed',              // Listo para solicitar inspección inicial
      'firstInspectionPending', // Inspección inicial en curso
      'rejectedInspection',     // Inspección inicial rechazada (para gestionar reinspección)
    ];
    return initialWorkStates.includes(work.status);
  }, [work?.status]);

  const showFinalInspectionManager = useMemo(() => {
    if (!work?.status) return false;
    // Estados de la OBRA en los que se muestra el gestor de inspección FINAL
    const finalWorkStates = [
      'approvedInspection',     // Inspección inicial aprobada, listo para flujo final
      'coverPending',           // Si el flujo final puede comenzar o continuar aquí
      'covered',                // Si el flujo final puede comenzar o continuar aquí
      'invoiceFinal',           // Si el flujo final puede comenzar o continuar aquí
      'paymentReceived',        // Si el flujo final puede comenzar o continuar aquí
      'finalInspectionPending', // Inspección final en curso
      'finalRejected',          // Inspección final rechazada (para gestionar nueva solicitud/reinspección final)
      // Los siguientes estados indican que el flujo final ha concluido o está en su etapa final.
      // El FinalInspectionFlowManager puede mostrar un estado de "completado".
      'finalApproved',          // Inspección final aprobada (estado de obra)
      'maintenance',            // Obra en mantenimiento post-aprobación final
    ];
    return finalWorkStates.includes(work.status);
  }, [work?.status]);

  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleInstalledImageChange = (event) => {
  if (event.target.files && event.target.files[0]) {
    setInstalledImageFile(event.target.files[0]);
  }
};

const handleUploadInstalledImage = async () => {
  if (!installedImageFile || !work?.idWork) {
    alert("Por favor, selecciona un archivo y asegúrate de que la obra esté cargada.");
    return;
  }

  setUploadingInstalledImage(true);
  const formData = new FormData();
  formData.append("imageFile", installedImageFile);
  formData.append("stage", "sistema instalado");
  formData.append("comment", installedImageComment || "Imagen del sistema instalado subida manualmente desde administración");
  formData.append("dateTime", new Date().toISOString());

  try {
    const result = await dispatch(addImagesToWork(work.idWork, formData));
    if (result && !result.error) {
      alert("Imagen del sistema instalado subida correctamente.");
      setInstalledImageFile(null);
      setInstalledImageComment('');
      setShowUploadInstalledImage(false);
      // Refrescar los datos de la obra para ver la nueva imagen
      dispatch(fetchWorkById(work.idWork));
    } else {
      alert(`Error al subir la imagen: ${result?.message || 'Error desconocido'}`);
    }
  } catch (error) {
    alert(`Error al subir la imagen: ${error.message}`);
  } finally {
    setUploadingInstalledImage(false);
  }
};

const handleShowBudgetPdf = async () => {
  // Si tienes la URL pública:
  if (work?.budget?.pdfPath) {
    setBudgetPdfUrl(work.budget.pdfPath);
    setShowBudgetPdfModal(true);
    return;
  }
  // Si necesitas pedirlo como blob:
  try {
    const response = await api.get(`/budget/${work.budget.idBudget}/preview`, { responseType: 'blob' });
    const objectUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    setBudgetPdfUrl(objectUrl);
    setShowBudgetPdfModal(true);
  } catch (e) {
    alert('No se pudo cargar el PDF del presupuesto');
  }
};



  if (workLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex justify-center items-center h-screen">
          <p className="text-xl text-gray-700">Cargando detalles de la obra...</p>
        </div>
      </div>
    );

  } // probando spiner
  

  if (workError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl font-semibold text-red-500">Error: {workError}</p>
      </div>
    );
  }

  if (!work) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl font-semibold">No se encontró la obra.</p>
      </div>
    );
  }

  const groupedImages = Array.isArray(work.images)
    ? work.images.reduce((acc, image) => {
      if (!acc[image.stage]) acc[image.stage] = [];
      acc[image.stage].push(image);
      return acc;
    }, {})
    : {};

  const pdfUrl = work.Permit?.pdfData //optionalDocs
    ? URL.createObjectURL(
      new Blob([new Uint8Array(work.Permit.pdfData.data)], {
        type: "application/pdf",
      })
    )
    : null;

  const optionalDocs = work.Permit?.optionalDocs //optionalDocs
    ? URL.createObjectURL(
      new Blob([new Uint8Array(work.Permit.optionalDocs.data)], {
        type: "application/pdf",
      })
    )
    : null;



  // const toggleSection = (section) => {
  //   setOpenSections((prev) => ({
  //     ...prev,
  //     [section]: !prev[section],
  //   }));
  // };

  const finalInvoiceVisibleStates = [
    'approvedInspection',
    'rejectedInspection',
    'coverPending',
    'covered',
    'invoiceFinal',
    'paymentReceived',
    'finalInspectionPending',
    'finalApproved',
    'finalRejected',
    'maintenance',
  ];

  const canShowFinalInvoiceSection = finalInvoiceVisibleStates.includes(work.status);


  const handlePreviewPdf = async (coId) => {
    setPdfLoading(true);
    setPdfError('');
    setPdfUrlCo(''); // Limpiar URL anterior
    setShowPdfModal(true); // Mostrar modal inmediatamente con indicador de carga

    try {
      // La instancia 'api' ya tiene la baseURL y enviará el token
      const response = await api.get(`/change-orders/${coId}/preview-pdf`, {
        responseType: 'blob', // Importante: para recibir datos binarios
      });

      if (response.data) {
        const file = new Blob([response.data], { type: 'application/pdf' });
        const fileURL = URL.createObjectURL(file);
        setPdfUrlCo(fileURL);
      } else {
        throw new Error("No se recibieron datos del PDF.");
      }
    } catch (error) {
      console.error("Error al cargar la vista previa del PDF:", error);
      let message = "Error al cargar el PDF.";
      if (error.response) {
        // Intentar decodificar el error si es un blob (json de error)
        if (error.response.data instanceof Blob && error.response.data.type === "application/json") {
          try {
            const errorJson = JSON.parse(await error.response.data.text());
            message = errorJson.message || message;
          } catch (e) {
            // No hacer nada si no se puede parsear
          }
        } else if (error.response.data && error.response.data.message) {
          message = error.response.data.message;
        } else if (error.response.statusText) {
          message = error.response.statusText;
        }
      } else if (error.message) {
        message = error.message;
      }
      setPdfError(message);
    } finally {
      setPdfLoading(false);
    }
  };


  return (
    <div className="p-4 md:p-6 bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Título principal con dirección y estado */}
        <div className="bg-blue-500 text-white p-4 md:p-6 rounded-lg shadow-md mb-6 flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold uppercase break-words">
              {work.propertyAddress}
            </h1>
            <p className="text-lg md:text-xl text-slate-800 p-1 uppercase mt-2 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0">
              <strong>Status: </strong>
              <span className="ml-0 sm:ml-2 px-3 py-2 text-sm font-medium tracking-wider text-white bg-sky-500 rounded-full shadow-md inline-block">
                {work.status}
              </span>
              {work.status === 'installed' && (
                <span className="ml-0 sm:ml-4 px-3 py-1 bg-yellow-400 text-black text-sm font-bold rounded-full animate-pulse">
                  PEDIR INSPECCIÓN
                </span>
              )}
            </p>
          </div>
          {/* Botón dinámico en el encabezado */}
          {displayHeaderButton && headerButtonAction && (
            <div className="flex-shrink-0 w-full lg:w-auto">
              <button
                onClick={() => {
                  headerButtonAction().catch(err => {
                    console.error("Error al ejecutar la acción del botón:", err);
                  });
                }}
                className={`${headerButtonClasses} w-full lg:w-auto`}
              >
                {headerButtonText}
              </button>
            </div>
          )}
        </div>

        {/* --- BANNER Y BOTÓN PARA ORDEN DE CAMBIO POR EXTRACCIÓN DE PIEDRAS --- */}
        {needsStoneExtractionCO && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 md:p-6 shadow-md rounded-md">
            <div className="flex flex-col md:flex-row">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
                </div>
                <div className="ml-3 flex-grow">
                  <h3 className="text-md md:text-lg font-semibold text-yellow-800">
                    Acción Requerida: Orden de Cambio
                  </h3>
                  <div className="mt-1 text-sm md:text-base text-yellow-700">
                    <p>
                      Se han registrado imágenes/costos por "extracción de piedras" desde la aplicación móvil. Es necesario generar una Orden de Cambio para formalizar estos trabajos/costos adicionales.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 md:mt-0 md:ml-auto md:pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    type="button"
                    onClick={() => setShowCreateCOModal(true)}
                    className="w-full md:w-auto inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    Generar CO
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Columna izquierda: Tarjetas desplegables */}
          <div className="space-y-6">
            {/* Tarjeta: Información principal */}
            <div className="bg-white shadow-md rounded-lg p-4 md:p-6 border-l-4 border-blue-500">
              <h2
                className="text-lg md:text-xl font-semibold mb-4 cursor-pointer"
                onClick={() => toggleSection("info")}
              >
                Información Principal
              </h2>
              {openSections.info && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <p><strong>Aplicante:</strong> {work.budget?.applicantName || "No disponible"}</p>
                    <p><strong>Permit N°:</strong> {work.Permit?.permitNumber || "No disponible"}</p>
                    <p className="sm:col-span-2"><strong>Aplicante Email:</strong> {work.Permit?.applicantEmail || "No disponible"}</p>
                  </div>

                  {pdfUrl && (
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold">Permit</h3>
                      <iframe
                        src={pdfUrl}
                        width="100%"
                        height="250px"
                        title="Vista previa del PDF"
                        className="rounded"
                      ></iframe>
                    </div>
                  )}
                  {optionalDocs && (
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold">Optional Docs</h3>
                      <iframe
                        src={optionalDocs}
                        width="100%"
                        height="250px"
                        title="Vista previa del PDF"
                        className="rounded"
                      ></iframe>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Tarjeta: Presupuesto */}
            {work.budget && (
              <div className="bg-white shadow-md rounded-lg p-4 md:p-6 border-l-4 border-blue-500">
                <h2
                  className="text-lg md:text-xl font-semibold mb-4 cursor-pointer flex justify-between items-center"
                  onClick={() => toggleSection("budget")}
                >
                  <span>Presupuesto</span>
                  <span>{openSections.budget ? "▲" : "▼"}</span>
                </h2>
                {openSections.budget && (
                  <>
                    {/* Total */}
                    <p className="mb-1">
                      <strong>Total Presupuesto:</strong> ${parseFloat(work.budget.totalPrice || 0).toFixed(2)}
                    </p>

                    {/* Pago Inicial Esperado */}
                    <p className="mb-1 text-gray-700">
                      <strong>Pago Inicial Esperado ({work.budget.initialPaymentPercentage || 0}%):</strong> ${parseFloat(work.budget.initialPayment || 0).toFixed(2)}
                    </p>

                    {/* Monto del Comprobante Cargado (si existe) */}
                    {work.budget.paymentProofAmount !== null && !isNaN(parseFloat(work.budget.paymentProofAmount)) && (
                      <p className="mb-1 text-green-700 font-semibold">
                        <strong>Monto Comprobante Cargado:</strong> ${parseFloat(work.budget.paymentProofAmount).toFixed(2)}
                        {parseFloat(work.budget.paymentProofAmount).toFixed(2) !== parseFloat(work.budget.initialPayment || 0).toFixed(2) && (
                          <span className="ml-2 text-xs text-orange-500">(Difiere del esperado)</span>
                        )}
                      </p>
                    )}

                    {/* Restante (basado en el monto del comprobante cargado si existe, sino en el initialPayment esperado) */}
                    <p className="mb-1 text-orange-700">
                    <strong>Restante (vs. Total):</strong> ${
                      (
                        parseFloat(work.budget.totalPrice || 0) -
                        (
                          work.budget.paymentProofAmount !== null && !isNaN(parseFloat(work.budget.paymentProofAmount))
                            ? parseFloat(work.budget.paymentProofAmount)
                            : parseFloat(work.budget.initialPayment || 0)
                        )
                      ).toFixed(2)
                    }
                  </p>
                    {/* Otros Datos */}
                    <p className="mt-3 text-sm text-gray-600">
                      <strong>Fecha:</strong> {new Date(work.budget.date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Estado:</strong> {work.budget.status}
                    </p>
                  </>
                )}
                <button
    className="bg-blue-600 text-white px-3 py-2 rounded shadow hover:bg-blue-700"
    onClick={handleShowBudgetPdf}
  >
    Ver Presupuesto PDF
  </button>
              </div>
            )}

            {/* --- 2. SECCIÓN DE COMPROBANTES ACTUALIZADA --- */}
            {allReceipts && allReceipts.length > 0 && (
              <div className="bg-white shadow-md rounded-lg p-4 md:p-6 border-l-4 border-yellow-500">
                <h2
                  className="text-lg md:text-xl font-semibold mb-4 cursor-pointer"
                  onClick={() => toggleSection("allReceipts")}
                >
                  Todos los Comprobantes ({allReceipts.length})
                </h2>
                {openSections.allReceipts && (
                  <div className="max-h-[400px] md:max-h-[600px] overflow-y-auto pr-2">
                    <ul className="space-y-4">
                      {allReceipts.map((receipt) => (
                        <li
                          key={receipt.idReceipt}
                          className="border p-4 rounded shadow bg-gray-50"
                        >
                          <p className="text-sm font-medium text-blue-700 mb-1">
                            Asociado a: {receipt.relatedRecordType} ({receipt.relatedRecordDesc})
                          </p>
                          <p><strong>Tipo (Recibo):</strong> {receipt.type}</p>
                          <p><strong>Notas:</strong> {receipt.notes || "Sin notas"}</p>
                          {receipt.fileUrl && receipt.mimeType ? (
                            <div className="mt-2">
                              {receipt.mimeType.startsWith('image/') ? (
                                <img
                                  src={receipt.fileUrl}
                                  alt={`Comprobante ${receipt.originalName || receipt.type}`}
                                  className="rounded w-full h-auto object-contain max-h-[200px] border"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              ) : receipt.mimeType === 'application/pdf' ? (
                                <iframe
                                  src={`https://docs.google.com/gview?url=${encodeURIComponent(receipt.fileUrl)}&embedded=true`}
                                  width="100%"
                                  height="200px"
                                  title={`Vista previa de ${receipt.originalName || receipt.type}`}
                                  className="rounded border"
                                  onError={(e) => { e.target.outerHTML = '<p class="text-red-500 text-xs">No se pudo cargar la vista previa.</p>'; }}
                                ></iframe>
                              ) : (
                                <p className="text-gray-600 text-xs">Archivo no previsualizable.</p>
                              )}
                              <a
                                href={receipt.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700 underline text-xs mt-1 block"
                              >
                                Ver/Descargar {receipt.originalName || receipt.type}
                              </a>
                            </div>
                          ) : (
                            <p className="text-gray-500 text-xs mt-1">Info de archivo incompleta.</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Tarjeta: Imágenes */}
            <div className="bg-white shadow-md rounded-lg p-4 md:p-6 border-l-4 border-yellow-500">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-2 sm:space-y-0">
                <h2
                  className="text-lg md:text-xl font-semibold cursor-pointer"
                  onClick={() => toggleSection("images")}
                >
                  Imágenes de la Obra
                </h2>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  {/* Botón para subir imagen de sistema instalado */}
                  {work?.status && ['inProgress', 'installed'].includes(work.status) && (
                    <button
                      onClick={() => setShowUploadInstalledImage(!showUploadInstalledImage)}
                      className="w-full sm:w-auto text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-3 rounded shadow"
                    >
                      {showUploadInstalledImage ? 'Cancelar' : 'Subir Img. Sistema'}
                    </button>
                  )}
                  
                  {/* Botón existente para inspección final */}
                  {work?.status && (work.status === 'paymentReceived' || work.status === 'finalRejected' || work.status === 'finalInspectionPending') && (
                    <button
                      onClick={() => setShowUploadFinalInspectionImage(!showUploadFinalInspectionImage)}
                      className="w-full sm:w-auto text-sm bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-3 rounded shadow"
                    >
                      {showUploadFinalInspectionImage ? 'Cancelar Subida' : 'Subir Img. Insp. Final'}
                    </button>
                  )}
                </div>
              </div>

              {/* Sección para subir imagen del sistema instalado */}
              {showUploadInstalledImage && (
                <div className="my-4 p-4 border border-gray-300 rounded-md bg-blue-50">
                  <h3 className="text-md font-semibold text-gray-700 mb-2">
                    Subir Imagen del Sistema Instalado
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Esta imagen será necesaria para solicitar la inspección inicial.
                  </p>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Seleccionar imagen:
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleInstalledImageChange}
                      className="block w-full text-sm text-gray-500
                                 file:mr-4 file:py-2 file:px-4
                                 file:rounded-full file:border-0
                                 file:text-sm file:font-semibold
                                 file:bg-blue-50 file:text-blue-700
                                 hover:file:bg-blue-100"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comentario (opcional):
                    </label>
                    <input
                      type="text"
                      value={installedImageComment}
                      onChange={(e) => setInstalledImageComment(e.target.value)}
                      placeholder="Describe la imagen del sistema instalado..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {installedImageFile && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-600 mb-2">
                        Archivo seleccionado: {installedImageFile.name}
                      </p>
                      <img 
                        src={URL.createObjectURL(installedImageFile)} 
                        alt="Previsualización" 
                        className="max-h-40 rounded border shadow-sm"
                      />
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      onClick={handleUploadInstalledImage}
                      disabled={!installedImageFile || uploadingInstalledImage}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {uploadingInstalledImage ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Subiendo...
                        </span>
                      ) : (
                        'Subir Imagen del Sistema'
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowUploadInstalledImage(false);
                        setInstalledImageFile(null);
                        setInstalledImageComment('');
                      }}
                      className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Mensaje informativo si no hay imágenes del sistema instalado */}
              {work?.status === 'installed' && installedImages.length === 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        Atención: No hay imágenes del sistema instalado
                      </p>
                      <p className="text-xs text-yellow-700">
                        Necesitas subir al menos una imagen del sistema instalado para poder solicitar la inspección inicial.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sección para subir imagen de inspección final */}
              {showUploadFinalInspectionImage && (
                <div className="my-4 p-4 border border-gray-300 rounded-md bg-gray-50">
                  <h3 className="text-md font-semibold text-gray-700 mb-2">Subir Imagen para Inspección Final</h3>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFinalInspectionImageChange}
                    className="block w-full text-sm text-gray-500
                               file:mr-4 file:py-2 file:px-4
                               file:rounded-full file:border-0
                               file:text-sm file:font-semibold
                               file:bg-blue-50 file:text-blue-700
                               hover:file:bg-blue-100 mb-3"
                  />
                  {finalInspectionImageFile && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-600">Archivo seleccionado: {finalInspectionImageFile.name}</p>
                      <img src={URL.createObjectURL(finalInspectionImageFile)} alt="Previsualización" className="mt-2 max-h-40 rounded border"/>
                    </div>
                  )}
                  <button
                    onClick={handleUploadFinalInspectionImage}
                    disabled={!finalInspectionImageFile || uploadingFinalImage}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
                  >
                    {uploadingFinalImage ? 'Subiendo...' : 'Confirmar y Subir Imagen'}
                  </button>
                </div>
              )}

              {openSections.images &&
                Object.entries(groupedImages).map(([stage, images]) => {
                  const truckSumStages = ['camiones de arena', 'camiones de tierra'];
                  let totalTrucksInStage = 0;

                  if (truckSumStages.includes(stage)) {
                    totalTrucksInStage = images.reduce((sum, image) => {
                      return sum + (Number(image.truckCount) || 0);
                    }, 0);
                  }

                  return (
                    <div key={stage} className="mb-6">
                      <h3 className="text-sm text-white bg-indigo-900 p-1 text-center uppercase font-semibold mb-2">
                        {stage}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4 p-2">
                        {images.map((image) => (
                          <div
                            key={image.id}
                            className="cursor-pointer bg-gray-50 p-2 rounded-lg shadow hover:shadow-md transition-shadow"
                            onClick={() => setSelectedImage(image)}
                          >
                            <img
                              src={image.imageUrl}
                              alt={stage}
                              className="w-full aspect-square object-cover rounded-md shadow"
                            />
                            <p className="text-xs text-gray-500 mt-1 truncate" title={image.dateTime}>
                              {image.dateTime ? new Date(image.dateTime).toLocaleString() : 'Sin fecha'}
                            </p>
                            {(stage === 'camiones de arena' || stage === 'camiones de tierra') && image.truckCount != null && image.truckCount > 0 && (
                              <p className="text-xs font-semibold text-blue-600 mt-1">
                                {image.truckCount} {image.truckCount === 1 ? 'Camión' : 'Camiones'}
                              </p>
                            )}
                            {image.comment && (
                              <p className="text-xs text-gray-600 mt-1 italic truncate" title={image.comment}>
                                "{image.comment}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      {truckSumStages.includes(stage) && totalTrucksInStage > 0 && (
                        <div className="mt-3 text-right pr-2">
                          <p className="text-xl font-bold text-indigo-700 bg-indigo-100 px-4 py-2 rounded-full inline-block shadow-lg">
                            Total Camiones: {totalTrucksInStage}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>

            {canSelectInspectionImageStates.includes(work?.status) && installedImages.length > 0 && (
              <div className="my-6 p-4 border rounded-lg shadow-sm bg-white">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">
                  Seleccionar Imagen de Referencia para Inspección
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-72 overflow-y-auto p-2 border rounded-md">
                  {installedImages.map(image => (
                    <div
                      key={image.id}
                      className={`cursor-pointer border-2 p-1 rounded-md hover:border-green-500 transition-all ${selectedInstalledImage?.id === image.id ? 'border-green-600 ring-2 ring-green-500' : 'border-gray-200'}`}
                      onClick={() => setSelectedInstalledImage(image)}
                    >
                      <img
                        src={image.imageUrl}
                        alt={`Sistema Instalado - ${image.id}`}
                        className="w-full h-28 object-cover rounded"
                      />
                      <p className="text-xs text-center mt-1 truncate" title={`ID: ${image.id}`}>ID: {image.id}</p>
                    </div>
                  ))}
                </div>
                {selectedInstalledImage && (
                  <p className="text-sm text-green-700 mt-2">
                    Imagen de referencia seleccionada: ID {selectedInstalledImage.id}
                  </p>
                )}
                {!selectedInstalledImage && installedImages.length > 0 && (
                  <p className="text-sm text-yellow-600 mt-2">
                    Por favor, selecciona una imagen de "sistema instalado" como referencia para la inspección.
                  </p>
                )}
              </div>
            )}

            {(work?.status === 'paymentReceived' || work?.status === 'finalRejected' || work?.status === 'finalInspectionPending') && (
              <div className="my-6 p-4 border rounded-lg shadow-sm bg-white">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">
                  Seleccionar Imagen para Inspección Final
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-72 overflow-y-auto p-2 border rounded-md">
                  {(groupedImages['inspeccion final'] || []).map(image => (
                    <div
                      key={image.id}
                      className={`cursor-pointer border-2 p-1 rounded-md hover:border-green-500 transition-all ${selectedInstalledImage?.id === image.id ? 'border-green-600 ring-2 ring-green-500' : 'border-gray-200'}`}
                      onClick={() => setSelectedInstalledImage(image)}
                    >
                      <img
                        src={image.imageUrl}
                        alt={`Inspección Final - ${image.id}`}
                        className="w-full h-28 object-cover rounded"
                      />
                      <p className="text-xs text-center mt-1 truncate" title={`ID: ${image.id}`}>ID: {image.id}</p>
                    </div>
                  ))}
                  {(groupedImages['inspeccion final'] === undefined || groupedImages['inspeccion final'].length === 0) && (
                    <p className="col-span-full text-center text-sm text-gray-500 py-4">
                      No hay imágenes cargadas para la etapa 'inspección final'.
                      Puedes subir una usando el botón de arriba.
                    </p>
                  )}
                </div>
                {selectedInstalledImage && groupedImages['inspeccion final']?.some(img => img.id === selectedInstalledImage.id) && (
                  <p className="text-sm text-green-700 mt-2">
                    Imagen para inspección final seleccionada: ID {selectedInstalledImage.id}
                  </p>
                )}
              </div>
            )}

            {/* Pasar la imagen seleccionada (o su ID) a InspectionFlowManager */}
            {work && (showInitialInspectionManager || showFinalInspectionManager) && (
              <div className="bg-white shadow-md rounded-lg border-l-4 border-teal-500">
                <h2
                  className="text-xl font-semibold p-6 cursor-pointer flex justify-between items-center"
                  onClick={() => toggleSection("inspectionFlow")}
                >
                  <span>Gestión de Inspección</span>
                  <span className="text-gray-600 transform transition-transform duration-200">
                    {openSections.inspectionFlow ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    )}
                  </span>
                </h2>
                
                {/* Renderizado condicional del gestor de flujo apropiado */}
                {showInitialInspectionManager && (
                  <InspectionFlowManager
                    work={work}
                    selectedWorkImageId={selectedInstalledImage?.id || null}
                    isVisible={openSections.inspectionFlow}
                  />
                )}

                {showFinalInspectionManager && !showInitialInspectionManager && (
                  <FinalInspectionFlowManager
                    work={work}
                    isVisible={openSections.inspectionFlow}
                  />
                )}
              </div>
            )}
          </div>

          {/* Columna derecha: Tarjetas de gastos e ingresos */}
          <div className="space-y-6">
            {/* --- 2. TARJETA DE BALANCE TOTAL --- */}
            <div className={`
              shadow-lg rounded-lg p-4 md:p-6 border-l-8
              ${balance > 0 ? 'bg-green-100 border-green-500' : ''}
              ${balance < 0 ? 'bg-red-100 border-red-500' : ''}
              ${balance === 0 ? 'bg-gray-100 border-gray-500' : ''}
            `}>
              <h2 className="text-xl md:text-2xl font-bold mb-3 text-center text-gray-800">
                Balance de la Obra
              </h2>
              <div className="text-center">
                <p className={`text-3xl md:text-4xl font-extrabold mb-1
                  ${balance > 0 ? 'text-green-700' : ''}
                  ${balance < 0 ? 'text-red-700' : ''}
                  ${balance === 0 ? 'text-gray-700' : ''}
                `}>
                  ${balance.toFixed(2)}
                </p>
                <p className={`text-lg font-semibold
                  ${balance > 0 ? 'text-green-600' : ''}
                  ${balance < 0 ? 'text-red-600' : ''}
                  ${balance === 0 ? 'text-gray-600' : ''}
                `}>
                  {balance > 0 ? 'Ganancia' : (balance < 0 ? 'Pérdida' : 'Equilibrio')}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-300 flex justify-around text-sm">
                <div className="text-center">
                  <p className="font-semibold text-green-600">Ingresos Totales</p>
                  <p className="text-gray-700">${totalIncome.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-red-600">Gastos Totales</p>
                  <p className="text-gray-700">${totalExpense.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Tarjeta: Gastos */}
            <div className="bg-red-100 shadow-md rounded-lg p-4 md:p-6 border-l-4 border-red-500">
              <h2
                className="text-xl font-bold mb-4 cursor-pointer flex justify-between items-center"
                onClick={() => toggleSection("expenses")}
              >
                Gastos
                <span className="text-red-700 font-semibold">
                  {expenses && expenses.length > 0
                    ? `$${expenses
                      .reduce(
                        (total, expense) =>
                          total + parseFloat(expense.amount || 0),
                        0
                      )
                      .toFixed(2)}`
                    : "$0.00"}
                </span>
                <span>{openSections.expenses ? "▲" : "▼"}</span>
              </h2>
              {openSections.expenses && (
                <>
                  {balanceLoading && <p>Cargando gastos...</p>}
                  {balanceError && (
                    <p className="text-red-500">
                      Error al cargar gastos: {balanceError}
                    </p>
                  )}
                  {!balanceLoading &&
                    !balanceError &&
                    (expenses && expenses.length > 0 ? (
                      <ul className="space-y-3">
                        {expenses.map((expense) => (
                          <li
                            key={expense.idExpense}
                            className="border-b pb-3 last:border-b-0"
                          >
                            <p>
                              <strong>Tipo:</strong> {expense.typeExpense}
                            </p>
                            <p>
                              <strong>Monto:</strong> $
                              {parseFloat(expense.amount).toFixed(2)}
                            </p>
                            <p>
                              <strong>Fecha:</strong>{" "}
                              {new Date(expense.date).toLocaleDateString()}
                            </p>
                            {expense.notes && (
                              <p>
                                <strong>Notas:</strong> {expense.notes}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">
                        No hay gastos registrados para esta obra.
                      </p>
                    ))}
                </>
              )}
            </div>

            {/* Tarjeta: Ingresos */}
            <div className="bg-green-100 shadow-md rounded-lg p-4 md:p-6 border-l-4 border-green-500">
              <h2
                className="text-xl font-bold mb-4 cursor-pointer flex justify-between items-center"
                onClick={() => toggleSection("incomes")}
              >
                Ingresos
                <span className="text-green-700 font-semibold">
                  {incomes && incomes.length > 0
                    ? `$${incomes
                      .reduce(
                        (total, income) =>
                          total + parseFloat(income.amount || 0),
                        0
                      )
                      .toFixed(2)}`
                    : "$0.00"}
                </span>
                <span>{openSections.incomes ? "▲" : "▼"}</span>
              </h2>
              {openSections.incomes && (
                <>
                  {balanceLoading && <p>Cargando ingresos...</p>}
                  {balanceError && (
                    <p className="text-red-500">
                      Error al cargar ingresos: {balanceError}
                    </p>
                  )}
                  {!balanceLoading &&
                    !balanceError &&
                    (incomes && incomes.length > 0 ? (
                      <ul className="space-y-3">
                        {incomes.map((income) => (
                          <li
                            key={income.idIncome}
                            className="border-b pb-3 last:border-b-0"
                          >
                            <p>
                              <strong>Tipo:</strong> {income.typeIncome}
                            </p>
                            <p>
                              <strong>Monto:</strong> $
                              {parseFloat(income.amount).toFixed(2)}
                            </p>
                            <p>
                              <strong>Fecha:</strong>{" "}
                              {new Date(income.date).toLocaleDateString()}
                            </p>
                            {income.notes && (
                              <p>
                                <strong>Notas:</strong> {income.notes}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">
                        No hay ingresos registrados para esta obra.
                      </p>
                    ))}
                </>
              )}
            </div>

            <div className="bg-white shadow-md rounded-lg p-4 md:p-6 border-l-4 border-orange-500">
              <h3
                className="text-lg font-semibold mb-4 text-gray-700 flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection("changeOrders")}
              >
                <span>Changes Orders</span>
                <button
                  className="bg-blue-600 hover:bg-blue-800 text-white px-3 py-2 rounded-xl shadow ml-4"
                  onClick={e => {
                    e.stopPropagation();
                    setShowCreateCOModal(true);
                  }}
                >
                  Generate Change Order
                </button>
                <span className="ml-2">
                  {openSections.changeOrders ? "▲" : "▼"}
                </span>
              </h3>
              {openSections.changeOrders && (
                work?.changeOrders && work.changeOrders.length > 0 ? (
                  <ul className="space-y-4">
                    {work.changeOrders.map(co => {
                      // Determinar el color y el texto del badge de estado
                      let statusColor = 'bg-gray-500'; // Color por defecto
                      let statusTextColor = 'text-white';
                      let statusText = co.status;

                      switch (co.status) {
                        case 'approved':
                          statusColor = 'bg-green-500';
                          statusText = 'Aprobada';
                          break;
                        case 'rejected':
                          statusColor = 'bg-red-600';
                          statusText = 'Rechazada';
                          break;
                        case 'pendingClientApproval':
                          statusColor = 'bg-yellow-500';
                          statusTextColor = 'text-yellow-800';
                          statusText = 'Pendiente Cliente';
                          break;
                        case 'pendingAdminReview':
                          statusColor = 'bg-blue-500';
                          statusText = 'Pendiente Revisión';
                          break;
                        case 'draft':
                          statusColor = 'bg-gray-400';
                          statusTextColor = 'text-gray-800';
                          statusText = 'Borrador';
                          break;
                        default:
                          statusText = co.status;
                      }

                      return (
                        <li key={co.id} className="border p-4 rounded-lg shadow-sm bg-gray-50 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-gray-800">
                                CO #: {co.changeOrderNumber || co.id.substring(0, 8)}
                              </p>
                              <p className="text-sm text-gray-700">
                                <strong>Descripción:</strong> {co.description}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 text-xs font-bold rounded-full ${statusColor} ${statusTextColor} shadow-sm`}
                            >
                              {statusText.toUpperCase()}
                            </span>
                          </div>

                          {co.itemDescription && co.itemDescription !== co.description && (
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Detalle:</strong> {co.itemDescription}
                            </p>
                          )}
                          <p className="text-sm text-gray-700 mb-1">
                            <strong>Costo Total:</strong> ${parseFloat(co.totalCost || 0).toFixed(2)}
                          </p>

                          {co.respondedAt && (
                            <p className="text-xs text-gray-500 mt-1">
                              <strong>Respondida por Cliente:</strong> {new Date(co.respondedAt).toLocaleString()}
                            </p>
                          )}

                          {co.clientMessage && (
                            <div className="mt-2 text-xs p-2 bg-blue-50 border border-blue-200 rounded">
                              <p className="font-semibold text-blue-700">Mensaje para el Cliente (al enviar):</p>
                              <p className="text-gray-700">{co.clientMessage}</p>
                            </div>
                          )}

                          <div className="mt-3 flex flex-wrap items-center space-x-2">
                            {(co.status === 'draft' || co.status === 'pendingAdminReview') && (
                              <button
                                onClick={() => handlePreviewPdf(co.id)}
                                className="ml-2 px-3 py-1 text-xs font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
                              >
                                Ver Borrador PDF
                              </button>
                            )}

                            {(co.status === 'draft' || co.status === 'pendingAdminReview' || co.status === 'rejected') && (
                              <button
                                onClick={() => handleEditCO(co)}
                                className="ml-2 px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                              >
                                Editar CO
                              </button>
                            )}
                            {(co.status === 'draft' || co.status === 'pendingAdminReview' || co.status === 'rejected') && (
                              <button
                                onClick={() => handleDeleteCO(co.id)}
                                className="ml-2 px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                              >
                                Eliminar
                              </button>
                            )}
                            {(co.status === 'draft' || co.status === 'pendingAdminReview') && !co.pdfUrl && (
                              <button
                                onClick={() => handleSendCOToClient(co.id)}
                                className="ml-2 px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                              >
                                Enviar al Cliente
                              </button>
                            )}

                            {/* Enlace para ver el PDF enviado/actual */}
                            {co.pdfUrl && !co.pdfUrl.startsWith('file:///') && (co.status === 'pendingClientApproval' || co.status === 'approved' || co.status === 'rejected') && (
                              <a
                                href={co.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1"
                              >
                                Ver PDF
                              </a>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-4 text-gray-600">No hay Órdenes de Cambio registradas para esta obra.</p>
                )
              )}
            </div>
          </div>
        </div>

        {/* --- SECCIÓN PARA FACTURA FINAL --- */}
        {canShowFinalInvoiceSection && (
          <div className="mt-6 bg-white shadow-md rounded-lg p-4 md:p-6 border-l-4 border-purple-500">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
              <h2 className="text-xl font-semibold">Factura Final</h2>
              <button
                onClick={() => setShowFinalInvoice(!showFinalInvoice)}
                className="text-sm text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded"
              >
                {showFinalInvoice ? 'Ocultar' : 'Ver/Gestionar'} Factura Final
              </button>
            </div>

            {showFinalInvoice && (
              <div className="mt-4 border-t pt-4">
                <FinalInvoice workId={idWork} />
              </div>
            )}
          </div>
        )}

        {/* Modal para mostrar la imagen ampliada */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedImage(null);
              }
            }}
          >
            <div
              className="relative bg-white p-4 md:p-6 rounded shadow-lg flex flex-col max-h-[90vh] w-auto max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="overflow-y-auto flex-grow mb-4">
                <img
                  src={selectedImage.imageUrl}
                  alt="Imagen ampliada"
                  className="w-full h-auto object-contain rounded"
                />
              </div>
              <p className="text-center text-sm text-gray-600">{selectedImage.dateTime}</p>
              {selectedImage.comment && (
                <p className="text-center text-xs text-gray-500 mt-1 italic">"{selectedImage.comment}"</p>
              )}
              <div className="flex flex-col sm:flex-row justify-around mt-4 pt-4 border-t space-y-2 sm:space-y-0">
                <button
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded text-sm"
                  onClick={() => setSelectedImage(null)}
                >
                  Cerrar
                </button>
                <a
                  href={selectedImage.imageUrl}
                  download={`imagen_${selectedImage.id}_${selectedImage.stage}.jpg`}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded text-sm text-center"
                >
                  Descargar
                </a>
              </div>
            </div>
          </div>
        )}

        {/* --- MODAL PARA CREAR ORDEN DE CAMBIO --- */}
        {work && (
          <>
           
            <CreateChangeOrderModal
              isOpen={showCreateCOModal}
              onClose={() => setShowCreateCOModal(false)}
              idWork={work.idWork}
              workPropertyAddress={work?.propertyAddress}
              currentTotalBudget={parseFloat(work.budget?.totalPrice || 0)}
              onCOCreated={() => {
                setShowCreateCOModal(false);
                dispatch(fetchWorkById(work.idWork));
              }}
            />
          </>
        )}
        {editingCO && showEditCOModal && (
          <CreateChangeOrderModal
            isOpen={showEditCOModal}
            onClose={() => {
              setShowEditCOModal(false);
              setEditingCO(null);
            }}
            idWork={work.idWork}
            workPropertyAddress={work?.propertyAddress}
            isEditing={true}
            initialCOData={editingCO}
            onCOCreated={() => {
              setShowEditCOModal(false);
              setEditingCO(null);
              dispatch(fetchWorkById(work.idWork));
            }}
          />
        )}
        {/* Modal para mostrar el PDF */}
        {showPdfModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-4 rounded shadow-lg w-full max-w-3xl h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Vista Previa del PDF</h3>
                <button
                  onClick={() => {
                    setShowPdfModal(false);
                    if (pdfUrlCo) {
                      URL.revokeObjectURL(pdfUrlCo);
                    }
                    setPdfUrlCo('');
                    setPdfError('');
                  }}
                  className="text-black text-2xl"
                >
                  &times;
                </button>
              </div>
              {pdfLoading && <p className="text-center">Cargando PDF...</p>}
              {pdfError && <p className="text-center text-red-500">Error: {pdfError}</p>}
              {pdfUrlCo && !pdfLoading && !pdfError && (
                <iframe
                  src={pdfUrlCo}
                  title="Vista previa del PDF"
                  className="w-full h-full border-0"
                />
              )}
            </div>
          </div>
        )}
      </div>
      <PdfModal
  isOpen={showBudgetPdfModal}
  onClose={() => {
    setShowBudgetPdfModal(false);
    if (budgetPdfUrl) URL.revokeObjectURL(budgetPdfUrl);
    setBudgetPdfUrl('');
  }}
  pdfUrl={budgetPdfUrl}
  title={`Presupuesto #${work?.budget?.idBudget}`}
/>
    </div>
  );
};

export default WorkDetail;
