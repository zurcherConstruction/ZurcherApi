import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorkById, updateWork } from "../../Redux/Actions/workActions";
import { balanceActions } from "../../Redux/Actions/balanceActions";
import {
  fetchIncomesAndExpensesRequest,
  fetchIncomesAndExpensesSuccess,
  fetchIncomesAndExpensesFailure,
} from "../../Redux/Reducer/balanceReducer"; // Ajusta esta ruta si es necesario
import {fetchInspectionsByWork} from '../../Redux/Actions/inspectionActions'
import { useParams } from "react-router-dom";
//import api from "../../utils/axios";
import FinalInvoice from "../Budget/FinalInvoice"
import InspectionFlowManager from "./InspectionFlowManager";


const WorkDetail = () => {
  const { idWork } = useParams();
  const dispatch = useDispatch();

 
 
  const {
    selectedWork: work,
    loading: workLoading, // Renombrado para evitar conflicto si FinalInvoice usa 'loading'
    error: workError,     // Renombrado
  } = useSelector((state) => state.work);


  console.log("Datos de la obra:", work); // Para depuración
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

      consolidated.push({
        idReceipt: `budget-${work.budget.idBudget}-payment`, // ID único generado
        fileUrl: work.budget.paymentInvoice,
        mimeType: mimeType,
        originalName: 'Comprobante Pago Inicial',
        notes: `Pago inicial del presupuesto por $${work.budget.initialPayment || 'N/A'}`,
        type: 'Comprobante Pago Inicial', // Tipo específico
        relatedRecordType: 'Presupuesto', // Indicar que pertenece al Budget
        relatedRecordDesc: `Pago Inicial - $${work.budget.initialPayment || 'N/A'}`,
        // createdAt: work.budget.updatedAt || work.budget.createdAt // Opcional: usar fecha del budget
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
        console.error("Error al establecer la URL del archivo:", error);
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
          console.log("Incomes/Expenses data received:", data);
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

   // Lógica para determinar el botón a mostrar en el encabezado
   let displayHeaderButton = false;
   let headerButtonText = "";
   let headerButtonAction = null;
   let headerButtonClasses = "text-white font-bold py-2 px-4 rounded shadow-lg transition duration-150 ease-in-out";
 
   // --- LÓGICA DEL BOTÓN AJUSTADA ---

   // Caso 1: Si work.status es 'approvedInspection', mostrar botón para cambiar a 'coverPending'
   if (work?.status === 'approvedInspection') {
    displayHeaderButton = true;
    headerButtonText = "Inspección Aprobada, Pasar a Cubierta"; 
    headerButtonClasses += " bg-green-500 hover:bg-green-600";
    headerButtonAction = async () => {
      console.log(`Cambiando estado de obra ${idWork} de 'approvedInspection' a 'coverPending'`);
      await dispatch(updateWork(idWork, { status: "coverPending" }));
      // dispatch(fetchWorkById(idWork)); // Opcional: Redux debe manejar la actualización del store
    };
   } else if (work?.status === 'covered') { // <-- ESTE ES EL BLOQUE PARA 'COVERED'
     displayHeaderButton = true;
    
     headerButtonText = "Marcar Factura Final Enviada"; 
     headerButtonClasses += " bg-purple-600 hover:bg-purple-700"; // Color distintivo
     headerButtonAction = async () => {
       console.log(`Cambiando estado de obra ${idWork} de 'covered' a 'invoiceFinal'`);
       await dispatch(updateWork(idWork, { status: "invoiceFinal" }));
       // dispatch(fetchWorkById(idWork)); // Opcional: Redux debe manejar la actualización del store
     };
   }


   if (workLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex justify-center items-center h-screen">
        <p className="text-xl text-gray-700">Cargando detalles de la obra...</p>
      </div>
      </div>
    );
  }

  if (workError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl font-semibold text-red-500">Error: {error}</p>
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



  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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


  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      {/* Título principal con dirección y estado */}
      <div className="bg-blue-500 text-white p-6 rounded-lg shadow-md mb-6 flex justify-between items-center">
        <div> {/* Contenedor para título y estado */}
          <h1 className="text-2xl font-semibold uppercase">
            {work.propertyAddress}
          </h1>
          <p className="text-xl text-slate-800 p-1 uppercase mt-2 flex items-center">
            <strong>Status: </strong>
            <span className="ml-2 px-3 py-2 text-sm font-medium tracking-wider text-white bg-sky-500 rounded-full shadow-md"> {/* Estilo de badge */}
              {work.status}
            </span>
            {work.status === 'installed' && (
              <span className="ml-4 px-3 py-1 bg-yellow-400 text-black text-sm font-bold rounded-full animate-pulse">
                PEDIR INSPECCIÓN
              </span>
            )}
          </p>
        </div>
        {/* Botón dinámico en el encabezado */}
        {displayHeaderButton && headerButtonAction && (
          <button
            onClick={() => {
              headerButtonAction().catch(err => {
                console.error("Error al ejecutar la acción del botón:", err);
                // Aquí podrías despachar una notificación de error a la UI si lo deseas
              });
            }}
            className={headerButtonClasses}
          >
            {headerButtonText}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda: Tarjetas desplegables */}
        <div className="space-y-6">
          {/* Tarjeta: Información principal */}
          <div className="bg-white shadow-md rounded-lg p-6 border-l-4 border-blue-500">
            <h2
              className="text-xl font-semibold mb-4 cursor-pointer"
              onClick={() => toggleSection("info")}
            >
              Información Principal
            </h2>
            {openSections.info && (
              <>
                <p>
                  <strong>Aplicante:</strong>{" "}
                  {work.budget?.applicantName || "No disponible"}
                </p>
                <p>
                  <strong>Permit N°:</strong>{" "}
                  {work.Permit?.permitNumber || "No disponible"}
                </p>
                <p>
                  <strong>Aplicante Email:</strong>{" "}
                  {work.Permit?.applicantEmail || "No disponible"}
                </p>

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
            <div className="bg-white shadow-md rounded-lg p-6 border-l-4 border-blue-500">
              <h2
                className="text-xl font-semibold mb-4 cursor-pointer flex justify-between items-center"
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

                  {/* Pago Inicial */}
                  <p className="mb-1 text-green-700">
                    <strong>Pago Inicial ({work.budget.initialPaymentPercentage || 0}%):</strong> ${parseFloat(work.budget.initialPayment || 0).toFixed(2)}
                  </p>

                  {/* Restante */}
                  <p className="mb-1 text-orange-700">
                    <strong>Restante ({100 - (work.budget.initialPaymentPercentage || 0)}%):</strong> ${
                      (parseFloat(work.budget.totalPrice || 0) - parseFloat(work.budget.initialPayment || 0)).toFixed(2)
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
            </div>
          )}

          {/* --- 2. SECCIÓN DE COMPROBANTES ACTUALIZADA --- */}
          {allReceipts && allReceipts.length > 0 && (
            <div className="bg-white shadow-md rounded-lg p-6 border-l-4 border-yellow-500">
              <h2
                className="text-xl font-semibold mb-4 cursor-pointer"
                onClick={() => toggleSection("allReceipts")} // Cambiar ID si es necesario
              >
                Todos los Comprobantes ({allReceipts.length})
              </h2>
              {openSections.allReceipts && (
                // Contenedor con scroll
                <div className="max-h-[600px] overflow-y-auto pr-2"> {/* Ajusta max-h según necesites */}
                  <ul className="space-y-4">
                    {allReceipts.map((receipt) => ( // Iterar sobre el array consolidado
                      <li
                        key={receipt.idReceipt} // Usar idReceipt como key único
                        className="border p-4 rounded shadow bg-gray-50" // Fondo ligero para diferenciar
                      >
                        {/* Mostrar a qué registro pertenece */}
                        <p className="text-sm font-medium text-blue-700 mb-1">
                          Asociado a: {receipt.relatedRecordType} ({receipt.relatedRecordDesc})
                        </p>
                        <p>
                          <strong>Tipo (Recibo):</strong> {receipt.type}
                        </p>
                        <p>
                          <strong>Notas:</strong> {receipt.notes || "Sin notas"}
                        </p>
                        {/* Visualización del archivo (igual que antes) */}
                        {receipt.fileUrl && receipt.mimeType ? (
                          <div className="mt-2">
                            {receipt.mimeType.startsWith('image/') ? (
                              <img
                                src={receipt.fileUrl}
                                alt={`Comprobante ${receipt.originalName || receipt.type}`}
                                className="rounded w-full h-auto object-contain max-h-[200px] border" // Altura ajustada
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : receipt.mimeType === 'application/pdf' ? (
                              <iframe
                                src={`https://docs.google.com/gview?url=${encodeURIComponent(receipt.fileUrl)}&embedded=true`}
                                width="100%"
                                height="200px" // Altura ajustada
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
          {/* --- FIN SECCIÓN COMPROBANTES ACTUALIZADA --- */}


          {/* Tarjeta: Imágenes */}
          <div className="bg-white shadow-md rounded-lg p-6 border-l-4 border-yellow-500">
            <h2
              className="text-xl font-semibold mb-4 cursor-pointer"
              onClick={() => toggleSection("images")}
            >
              Imágenes de la Obra
            </h2>
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
                    <div className="flex overflow-x-auto space-x-4 p-2">
                      {images.map((image) => (
                        <div
                          key={image.id}
                          className="flex-shrink-0 cursor-pointer bg-gray-50 p-2 rounded-lg shadow hover:shadow-md transition-shadow"
                          onClick={() => setSelectedImage(image)}
                        >
                          <img
                            src={image.imageUrl}
                            alt={stage}
                            className="w-24 h-24 object-cover rounded-md shadow"
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
                            <p className="text-xs text-gray-600 mt-1 italic truncate max-w-[96px]" title={image.comment}>
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
          {work?.status === 'installed' && installedImages.length > 0 && (
            <div className="my-6 p-4 border rounded-lg shadow-sm bg-white">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Seleccionar Imagen de Referencia (Sistema Instalado)</h3>
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
                  Imagen seleccionada para inspección: ID {selectedInstalledImage.id}
                </p>
              )}
              {!selectedInstalledImage && (
                <p className="text-sm text-yellow-600 mt-2">
                  Por favor, selecciona una imagen de "sistema instalado" como referencia para la inspección.
                </p>
              )}
            </div>
          )}

          {/* Pasar la imagen seleccionada (o su ID) a InspectionFlowManager */}
          {work && ( 
            <div className="bg-white shadow-md rounded-lg border-l-4 border-teal-500"> 
              <h2
                className="text-xl font-semibold p-6 cursor-pointer flex justify-between items-center"
                onClick={() => toggleSection("inspectionFlow")} // <-- PARECE CORRECTO
              >
                <span>Gestión de Inspección</span>
                <span className="text-gray-600 transform transition-transform duration-200">
                  {openSections.inspectionFlow ? ( // <-- PARECE CORRECTO
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
              <InspectionFlowManager
                work={work}
                selectedWorkImageId={selectedInstalledImage?.id || null}
                isVisible={openSections.inspectionFlow} // <-- PARECE CORRECTO
              />
            </div>
          )}
        </div>



        {/* Columna derecha: Tarjetas de gastos e ingresos */}
        <div className="space-y-6">
          {/* --- 2. TARJETA DE BALANCE TOTAL --- */}
          <div className={`
            shadow-lg rounded-lg p-6 border-l-8
            ${balance > 0 ? 'bg-green-100 border-green-500' : ''}
            ${balance < 0 ? 'bg-red-100 border-red-500' : ''}
            ${balance === 0 ? 'bg-gray-100 border-gray-500' : ''}
          `}>
            <h2 className="text-2xl font-bold mb-3 text-center text-gray-800">
              Balance de la Obra
            </h2>
            <div className="text-center">
              <p className={`text-4xl font-extrabold mb-1
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
          {/* --- FIN TARJETA BALANCE --- */}
          {/* Tarjeta: Gastos */}
          <div className="bg-red-100 shadow-md rounded-lg p-6 border-l-4 border-red-500">
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
                  // *** USAR 'expenses' del useSelector ***
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
          <div className="bg-green-100 shadow-md rounded-lg p-6 border-l-4 border-green-500">
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
                  // *** USAR 'incomes' del useSelector ***
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
        </div>
      </div>
      {/* --- SECCIÓN PARA FACTURA FINAL --- */}
      {/* Mostrar solo si la obra está en un estado apropiado (ej: 'completed', 'finalApproved') */}
      {canShowFinalInvoiceSection && (
        <div className="mt-6 bg-white shadow-md rounded-lg p-6 border-l-4 border-purple-500">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Factura Final</h2>
            <button
              onClick={() => setShowFinalInvoice(!showFinalInvoice)}
              className="text-sm text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded"
            >
              {showFinalInvoice ? 'Ocultar' : 'Ver/Gestionar'} Factura Final
            </button>
          </div>

          {/* Renderizar el componente de la factura final condicionalmente basado en showFinalInvoice */}
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
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" // Añadido p-4 para dar espacio alrededor
          onClick={(e) => {
            // Cerrar solo si se hace clic en el fondo, no en el contenido del modal
            if (e.target === e.currentTarget) {
              setSelectedImage(null);
            }
          }}
        >
          {/* Contenedor del contenido del modal */}
          <div
            className="relative bg-white p-4 rounded shadow-lg flex flex-col max-h-[90vh] w-auto max-w-3xl" // max-h-[90vh] para limitar altura, w-auto y max-w-3xl para ancho responsivo
            onClick={(e) => e.stopPropagation()} // Evitar que el clic se propague al fondo
          >
            {/* Contenedor de la imagen con scroll si es necesario */}
            <div className="overflow-y-auto flex-grow mb-4">
              <img
                src={selectedImage.imageUrl}
                alt="Imagen ampliada"
                className="w-full h-auto object-contain rounded" // h-auto para mantener proporción, object-contain para asegurar que se vea completa
              />
            </div>
            <p className="text-center text-sm text-gray-600">{selectedImage.dateTime}</p>
            {selectedImage.comment && (
              <p className="text-center text-xs text-gray-500 mt-1 italic">"{selectedImage.comment}"</p>
            )}
            <div className="flex justify-around mt-4 pt-4 border-t"> {/* justify-around para espaciar botones */}
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded text-sm"
                onClick={() => setSelectedImage(null)}
              >
                Cerrar
              </button>
              <a
                href={selectedImage.imageUrl}
                download={`imagen_${selectedImage.id}_${selectedImage.stage}.jpg`} // Nombre de descarga más descriptivo
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded text-sm"
              >
                Descargar
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
};

export default WorkDetail;
