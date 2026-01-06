import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorks } from "../Redux/Actions/workActions"; // Acción para obtener los works
import { Link } from "react-router-dom";
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid'; // Importar el ícono
import { FaFileExcel, FaTimes } from 'react-icons/fa'; // 🆕 Iconos para exportar

const etapas = [
  { backend: "assigned", display: "Purchase in Progress", order: 0 },
  { backend: "inProgress", display: "Installing", order: 1 },
  { backend: "installed", display: "Inspection Pending", order: 2 },
  { backend: "coverPending", display: "Cover Pending", order: 3 },
  { backend: "covered", display: "Send Final Invoice", order: 4 },
  { backend: "invoiceFinal", display: "Payment Received", order: 5 },
  { backend: "paymentReceived", display: "Final Inspection Pending", order: 6 },
  { backend: "maintenance", display: "Maintenance", order: 7 },
];

const ProgressTracker = () => {
  const dispatch = useDispatch();
  const { works, loading, error } = useSelector((state) => state.work);
  const token = useSelector((state) => state.auth.token); // 🆕 Token para export
  const [search, setSearch] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const hasFetched = useRef(false); // 🆕 Prevenir fetch duplicado

  // 🆕 Estados para modal de exportación
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    status: 'all',
    applicantEmail: ''
  });
  const [exporting, setExporting] = useState(false);

  // ✅ Fetch inicial solo una vez (cargar TODOS los works)
  useEffect(() => {
    if (!hasFetched.current) {
      console.log('📄 [ProgressTracker] Cargando TODOS los works (sin límite)...');
      hasFetched.current = true;
      dispatch(fetchWorks(1, 'all')); // ✅ Usar 'all' para obtener TODOS los registros
    }
  }, []); // Sin dependencias para que solo se ejecute al montar

  // ✅ Refresco automático cada 5 min
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('🔄 [ProgressTracker] Auto-refresh TODOS los works (sin límite)...');
      dispatch(fetchWorks(1, 'all')); // ✅ Usar 'all' para obtener TODOS los registros
    }, 300000); // 5 minutos

    return () => {
      console.log('🛑 [ProgressTracker] Limpiando interval...');
      clearInterval(intervalId);
    };
  }, []); // Sin dependencias para que el interval se mantenga estable

  useEffect(() => {
    if (works) {
      // ✅ EXCLUIR works en maintenance (tienen su propio componente)
      const activeWorks = works.filter((work) => work.status !== 'maintenance');
      
      // Filtrar por búsqueda
      const filtered = activeWorks.filter((work) =>
        work.propertyAddress?.toLowerCase().includes(search.toLowerCase())
      );

      // Ordenar por orden de progreso (menor a mayor)
      const sorted = filtered.sort((a, b) => {
        // Función para obtener el orden de progreso de un work
        const getProgressOrder = (status) => {
          // Mapear estados especiales a su etapa visual
          let mappedStatus = status;
          if (["installed", "firstInspectionPending", "approvedInspection", "rejectedInspection"].includes(status)) {
            mappedStatus = "installed";
          } else if (["paymentReceived", "finalInspectionPending", "finalApproved", "finalRejected"].includes(status)) {
            mappedStatus = "paymentReceived";
          }

          // Buscar el orden en las etapas
          const etapa = etapas.find((e) => e.backend === mappedStatus);
          
          // Si no encuentra el estado en las etapas, es un work sin progreso -> va primero (orden -1)
          if (!etapa) {
            return -1;
          }
          
          return etapa.order;
        };

        return getProgressOrder(a.status) - getProgressOrder(b.status);
      });

      setFilteredData(sorted);
    } else {
      setFilteredData([]);
    }
  }, [works, search]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const filteredEtapas = etapas.filter(
    (etapa) =>
      etapa.backend !== "rejectedInspection" && etapa.backend !== "finalRejected"
  );

  const getProgressIndexForBar = (currentWorkStatus) => {
    let visualStageBackendKey;

    // Mapear el estado actual del trabajo a la clave 'backend' de la etapa visual correspondiente
    if (["installed", "firstInspectionPending", "approvedInspection", "rejectedInspection"].includes(currentWorkStatus)) {
      visualStageBackendKey = "installed"; // Todos estos estados activan la etapa visual "Inspection Pending"
    } else if (["paymentReceived", "finalInspectionPending", "finalApproved", "finalRejected"].includes(currentWorkStatus)) {
      visualStageBackendKey = "paymentReceived"; // Todos estos estados activan la etapa visual "Final Inspection Pending"
    } else {
      visualStageBackendKey = currentWorkStatus; // Para otros estados, la clave es directa
    }

    const index = filteredEtapas.findIndex((etapa) => etapa.backend === visualStageBackendKey);
    return index; // Este es el índice de la etapa visual que debe estar "activa"
  };

  const getDisplayName = (status) => {
    const etapaDef = etapas.find((e) => e.backend === status);
    if (!etapaDef) {
        if (status === "rejectedInspection") return "Inspection Rejected";
        if (status === "finalRejected") return "Final Insp. Rejected";
        if (status === "approvedInspection") return "Inspection Approved";
        if (status === "finalApproved") return "Completado ✅";
        if (status === "covered") return "Covered - Awaiting Invoice";
        return "Estado Desconocido";
    }
    return etapaDef.display;
  };

  // 🆕 Función para exportar a Excel
  const handleExport = async () => {
    try {
      setExporting(true);
      
      // Construir query params
      const params = new URLSearchParams();
      if (exportFilters.status) params.append('status', exportFilters.status);
      if (exportFilters.applicantEmail) params.append('applicantEmail', exportFilters.applicantEmail);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/export/works?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Error al exportar');

      // Descargar archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `works-export-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setShowExportModal(false);
      alert('✅ Excel descargado exitosamente');
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('❌ Error al exportar works');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-7xl p-2 mx-auto">
      {/* 🆕 Barra de búsqueda y botón exportar */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar por Dirección"
          value={search}
          onChange={handleSearch}
          className="flex-1 border border-gray-300 p-2 md:p-3 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={() => setShowExportModal(true)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md font-medium transition-colors flex items-center gap-2"
        >
          <FaFileExcel className="text-xl" />
          <span className="hidden md:inline">Exportar Excel</span>
        </button>
      </div>

      {/* 🆕 Modal de opciones de exportación */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-bold text-gray-800">Exportar Works a Excel</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filtrar por Estado
                </label>
                <select
                  value={exportFilters.status}
                  onChange={(e) => setExportFilters({ ...exportFilters, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="all">Todos los Works</option>
                  <option value="active">Activos (Sin Maintenance)</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filtrar por Email/Contacto del Aplicante (opcional)
                </label>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={exportFilters.applicantEmail}
                  onChange={(e) => setExportFilters({ ...exportFilters, applicantEmail: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Columnas incluidas:</strong> Property Address, Applicant Email, Status, Start Date (cuando se instala), Installation Date (inspección inicial), Final Invoice Date (cuando se paga invoice final)
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Exportando...</span>
                  </>
                ) : (
                  <>
                    <FaFileExcel />
                    <span>Descargar Excel</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
  
      {loading && <p className="text-blue-500 text-center">Cargando obras...</p>}
      {error && <p className="text-red-500 text-center">Error: {error}</p>}
  
      {!loading &&
        !error &&
        filteredData.map((work) => {
          const { idWork, propertyAddress, status, Permit, Receipts } = work;

          let permitExpirationAlertIcon = null;
          if (Permit && Permit.expirationStatus) {
            const permitExpStatus = Permit.expirationStatus;
            const permitExpMessage = Permit.expirationMessage;
            if (permitExpStatus === "expired" || permitExpStatus === "soon_to_expire") {
              const isError = permitExpStatus === "expired";
              const alertColorClass = isError ? "text-red-500" : "text-yellow-500";
              const pingColorClass = isError ? "bg-red-400" : "bg-yellow-400";
              const alertMessage = permitExpMessage || (isError ? "Permiso Vencido" : "Permiso Próximo a Vencer");
              permitExpirationAlertIcon = (
                <span 
                  title={alertMessage} 
                  className="relative ml-2 cursor-help inline-flex items-center justify-center h-6 w-6"
                >
                  <span className={`absolute inline-flex h-full w-full rounded-full ${pingColorClass} opacity-75 animate-ping`}></span>
                  <ExclamationTriangleIcon className={`relative z-10 inline-flex h-6 w-6 ${alertColorClass}`} />
                </span>
              );
            }
          }


          // --- ALERTA DE NOTICE TO OWNER ---
          let noticeToOwnerAlert = null;
          // Solo mostrar si hay installationStartDate, no está archivado y está en estados previos a paymentReceived
          const statesAfterPayment = ["paymentReceived", "finalInspectionPending", "finalApproved", "finalRejected", "maintenance"];
          const isAfterPayment = statesAfterPayment.includes(status);
          
          if (work.installationStartDate && !work.noticeToOwnerFiled && !isAfterPayment) {
            const calculateDaysInfo = (startDate) => {
              if (!startDate) return null;
              const [year, month, day] = startDate.split('-').map(Number);
              const start = new Date(year, month - 1, day);
              const deadline = new Date(start);
              deadline.setDate(deadline.getDate() + 45);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const diffTime = deadline - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              const daysFromStart = Math.floor((today - start) / (1000 * 60 * 60 * 24));
              const progressPercent = Math.min(100, Math.max(0, (daysFromStart / 45) * 100));
              
              return { daysRemaining: diffDays, daysFromStart, progressPercent };
            };

            const daysInfo = calculateDaysInfo(work.installationStartDate);
            
            // Mostrar alerta solo a partir del día 30 (15 días restantes)
            if (daysInfo !== null && daysInfo.daysRemaining <= 15) {
              let alertColorClass, textColorClass, message;
              
              if (daysInfo.daysRemaining <= 0) {
                // Vencido (día 45+)
                alertColorClass = "text-orange-500";
                textColorClass = "text-orange-600";
                message = `⚠️ Notice to Owner vencido hace ${Math.abs(daysInfo.daysRemaining)} días`;
              } else if (daysInfo.daysRemaining <= 5) {
                // Día 40-45
                alertColorClass = "text-orange-500";
                textColorClass = "text-orange-600";
                message = `⚠️ Notice to Owner - ${daysInfo.daysRemaining} días restantes`;
              } else {
                // Día 30-40
                alertColorClass = "text-orange-500";
                textColorClass = "text-orange-600";
                message = `📋 Notice to Owner - ${daysInfo.daysRemaining} días restantes`;
              }
              
              noticeToOwnerAlert = (
                <div className="mt-2 p-2 rounded border bg-orange-50 border-orange-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-semibold ${textColorClass}`}>
                      <ExclamationTriangleIcon className={`h-4 w-4 mr-1 ${alertColorClass} ${daysInfo.daysRemaining <= 5 ? 'animate-pulse' : ''} inline`} />
                      {message}
                    </span>
                    <span className={`text-sm font-bold ${textColorClass}`}>
                      {daysInfo.daysFromStart} / 45 días
                    </span>
                  </div>
                  {/* Barra de progreso naranja siempre */}
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden border border-gray-300">
                    <div
                      className="h-full rounded-full transition-all duration-300 bg-orange-500"
                      style={{ width: `${daysInfo.progressPercent}%` }}
                    />
                  </div>
                </div>
              );
            }
          }

          // --- ALERTA DE PRESUPUESTO NO FIRMADO ---
          let budgetNotSignedAlert = null;
          if (work.budget) {
            const budget = work.budget;
            // Si tiene método de firma válido (manual, signnow, o docusign), significa que está firmado
            const hasValidSignatureMethod = budget.signatureMethod === "signnow" || 
                                           budget.signatureMethod === "manual" || 
                                           budget.signatureMethod === "docusign";
            
            // Mostrar alerta solo si NO tiene método de firma válido
            if (!hasValidSignatureMethod) {
              budgetNotSignedAlert = (
                <div className="flex items-center justify-center mt-2 text-xs text-yellow-600 font-semibold">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1 text-yellow-500 animate-pulse" />
                  Presupuesto pendiente de firma
                </div>
              );
            }
          }

          // --- ALERTA DE INSPECCIÓN INICIAL NO ABONADA ---
          let initialInspectionAlert = null;
          if (["installed", "firstInspectionPending"].includes(status)) {
            const hasInitialInspectionReceipt = Array.isArray(Receipts)
              ? Receipts.some(r => r.type === "Inspección Inicial")
              : false;
            if (!hasInitialInspectionReceipt) {
              initialInspectionAlert = (
                <div className="flex items-center justify-center mt-2 text-xs text-red-600 font-semibold">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1 text-red-500 animate-pulse" />
                  No se abonó la Inspección Inicial
                </div>
              );
            }
          }

          const progressBarIndex = getProgressIndexForBar(status);

          // Fondo especial para works de mantenimiento y completados
          const isMaintenance = status === "maintenance";
          const isCompleted = status === "finalApproved";
          const cardBackgroundClass = isMaintenance 
            ? "bg-blue-50 border-blue-200" 
            : isCompleted
            ? "bg-green-50 border-green-200"
            : "bg-white border-gray-200";

          return (
            <Link
              to={`/work/${idWork}`}
              key={idWork}
              className={`block ${cardBackgroundClass} p-4 md:p-4 mb-4 shadow-lg rounded-lg border hover:shadow-xl transition-shadow duration-300`}
            >
              <div className="flex items-center justify-center">
                <h3 className="font-varela uppercase text-lg md:text-xl text-gray-700 text-center flex items-center">
                  {propertyAddress}
                  {permitExpirationAlertIcon}
                </h3>
                {isMaintenance && (
                  <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full border border-blue-300">
                    🔧 Mantenimiento
                  </span>
                )}
                {isCompleted && (
                  <span className="ml-3 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full border border-green-300">
                    ✅ Completado
                  </span>
                )}
                
                {/* ✅ BADGE DE CHECKLIST - Muestra OK si finalReviewCompleted es true */}
                {work.checklist?.finalReviewCompleted && (
                  <span className="ml-3 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full border border-green-300">
                    <span className="flex items-center">
                      <span className="mr-1">✅</span> OK
                    </span>
                  </span>
                )}
              </div>

              {/* Mostrar alertas: Notice to Owner, presupuesto no firmado, inspección */}
              {noticeToOwnerAlert}
              {budgetNotSignedAlert}
              {initialInspectionAlert}
    
              <div className="hidden sm:flex relative items-center justify-between mt-4">
                <div className="absolute w-full h-2 bg-gray-200 rounded-full"></div>
                <div
                  className="absolute h-2 bg-green-500 rounded-full transition-all duration-500"
                  style={{
                    width: progressBarIndex >= 0 ? `${(progressBarIndex / (filteredEtapas.length - 1)) * 100}%` : '0%',
                  }}
                ></div>
          {filteredEtapas.map((etapa, etapaMapIndex) => {
                  // Determinar si esta etapa del map es la etapa visualmente actual
                  const isCurrentVisualStage = etapaMapIndex === progressBarIndex;
                  // Determinar si esta etapa del map es una etapa completada (anterior a la actual)
                  const isCompletedStage = etapaMapIndex < progressBarIndex;

                  // Color del círculo: verde si está completada o es la actual, sino gris
                  const circleColor = isCurrentVisualStage || isCompletedStage ? "bg-green-500" : "bg-gray-400";
                  // Titileo del círculo: solo si es la etapa visualmente actual
                  const pulseCircle = isCurrentVisualStage;

                  // Estilo del texto: verde y negrita si es la etapa visualmente actual, sino gris normal
                  const textColor = isCurrentVisualStage ? "text-green-600" : "text-gray-600";
                  const isBold = isCurrentVisualStage;
                  // Titileo del texto: solo si es la etapa visualmente actual
                  const pulseText = isCurrentVisualStage;
                  
                             let rejectionAlertContent = null;
                  const isRejectedInspectionStage = etapa.backend === 'installed' && status === 'rejectedInspection';
                  const isRejectedFinalInspectionStage = etapa.backend === 'paymentReceived' && status === 'finalRejected';

                  if (isRejectedInspectionStage || isRejectedFinalInspectionStage) {
                    rejectionAlertContent = (
                      <span className="flex items-center justify-center text-red-600 mt-1">
                        <span
                          title={isRejectedInspectionStage ? "Inspección Rechazada" : "Inspección Final Rechazada"}
                          className="relative inline-flex items-center justify-center h-4 w-4 mr-1" // Ícono más pequeño
                        >
                          <span className="absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75 animate-ping"></span>
                          <ExclamationTriangleIcon className="relative z-10 inline-flex h-4 w-4 text-red-500" />
                        </span>
                        Rechazada
                      </span>
                    );
                  }

                  return (
                    <div
                      key={etapa.backend}
                      className="relative flex flex-col items-center"
                      style={{ width: `${100 / filteredEtapas.length}%` }}
                    >
                      <div
                        className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-sm font-bold shadow-md ${circleColor} ${pulseCircle ? 'animate-pulse' : ''}`}
                        style={{ position: "absolute", top: "50%", transform: "translate(-50%, -50%)", left: "50%" }}
                      >
                        {etapaMapIndex + 1}
                      </div>

                     {/* Textos debajo del círculo */}
                      <div className="flex flex-col items-center text-center mt-16">
                        <p
                          className={`text-xs font-varela p-1 ${textColor} ${isBold ? 'font-bold' : ''} ${pulseText ? 'animate-pulse' : ''}`}
                        >
                          {etapa.display}
                        </p>
                       {rejectionAlertContent && (
                          <div className="text-xs font-semibold"> {/* Contenedor para el contenido de la alerta */}
                            {rejectionAlertContent}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
                
              <div className="block sm:hidden mt-2">
                <p className="text-sm text-gray-600 text-center">
                Estado actual:{" "}
                  <span className={`font-semibold ${
                    status === "rejectedInspection" || status === "finalRejected" ? "text-red-600" :
                    status === "firstInspectionPending" || status === "finalInspectionPending" ? "text-yellow-500" :
                    status === "finalApproved" ? "text-green-700 font-bold" : // 🆕 Estilo especial para completado
                    status === "approvedInspection" ? "text-green-600" : 
                    status === "covered" ? "text-cyan-600" :
                    (progressBarIndex === -1 && !["firstInspectionPending", "rejectedInspection", "approvedInspection", "finalInspectionPending", "finalRejected", "covered", "approvedInspection", "finalApproved"].includes(status)) ? "text-gray-700" :
                    "text-green-600"
                  }`}>
                    {getDisplayName(status)}
                  </span>
                </p>
              </div>
            </Link>
          );
        })}
    </div>
  );
};

export default ProgressTracker;