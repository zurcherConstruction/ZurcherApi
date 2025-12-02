import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorks } from "../Redux/Actions/workActions"; // Acción para obtener los works
import { Link } from "react-router-dom";
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid'; // Importar el ícono

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
  const [search, setSearch] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const hasFetched = useRef(false); // 🆕 Prevenir fetch duplicado

  // ✅ Fetch inicial solo una vez
  useEffect(() => {
    if (!hasFetched.current) {
      console.log('📊 [ProgressTracker] Cargando works inicial...');
      hasFetched.current = true;
      dispatch(fetchWorks());
    }
  }, []); // Sin dependencias para que solo se ejecute al montar

  // ✅ Refresco automático cada 5 min
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('🔄 [ProgressTracker] Auto-refresh works...');
      dispatch(fetchWorks());
    }, 300000); // 5 minutos

    return () => {
      console.log('🛑 [ProgressTracker] Limpiando interval...');
      clearInterval(intervalId);
    };
  }, []); // Sin dependencias para que el interval se mantenga estable

  useEffect(() => {
    if (works) {
      // Filtrar por búsqueda
      const filtered = works.filter((work) =>
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
        if (status === "finalApproved") return "Final Insp. Approved";
        if (status === "covered") return "Covered - Awaiting Invoice";
        return "Estado Desconocido";
    }
    return etapaDef.display;
  };

  return (
    <div className="max-w-7xl p-2 mx-auto">
      <input
        type="text"
        placeholder="Buscar por Dirección"
        value={search}
        onChange={handleSearch}
        className="border border-gray-300 p-2 md:p-3 mb-6 w-full rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
  
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
          // Solo mostrar si hay installationStartDate, no está archivado y el trabajo NO está completamente pago
          const isFullyPaid = work.totalPaid >= work.totalCost;
          
          if (work.installationStartDate && !work.noticeToOwnerFiled && !isFullyPaid) {
            const calculateDaysRemaining = (startDate) => {
              if (!startDate) return null;
              const [year, month, day] = startDate.split('-').map(Number);
              const start = new Date(year, month - 1, day);
              const deadline = new Date(start);
              deadline.setDate(deadline.getDate() + 45);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const diffTime = deadline - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays;
            };

            const daysRemaining = calculateDaysRemaining(work.installationStartDate);
            
            // Mostrar alerta solo a partir del día 30 (15 días restantes)
            if (daysRemaining !== null && daysRemaining <= 15) {
              let alertColorClass, textColorClass, message;
              
              if (daysRemaining <= 0) {
                // Vencido (día 45+) - Rojo
                alertColorClass = "text-red-500";
                textColorClass = "text-red-600";
                message = `⚠️ Notice to Owner vencido (${Math.abs(daysRemaining)} días)`;
              } else if (daysRemaining <= 5) {
                // Día 40-45 - Amarillo
                alertColorClass = "text-yellow-500";
                textColorClass = "text-yellow-600";
                message = `⚠️ Notice to Owner - ${daysRemaining} días restantes`;
              } else {
                // Día 30-40 - Azul
                alertColorClass = "text-blue-500";
                textColorClass = "text-blue-600";
                message = `📋 Notice to Owner - ${daysRemaining} días restantes`;
              }
              
              noticeToOwnerAlert = (
                <div className={`flex items-center justify-center mt-2 text-xs ${textColorClass} font-semibold`}>
                  <ExclamationTriangleIcon className={`h-4 w-4 mr-1 ${alertColorClass} ${daysRemaining <= 5 ? 'animate-pulse' : ''}`} />
                  {message}
                </div>
              );
            }
          }

          // --- ALERTA DE PRESUPUESTO NO FIRMADO ---
          let budgetNotSignedAlert = null;
          if (work.budget) {
            const budget = work.budget;
            // Si tiene método de firma válido (manual o signnow), significa que está firmado
            const hasValidSignatureMethod = budget.signatureMethod === "signnow" || budget.signatureMethod === "manual";
            
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

          // Fondo especial para works de mantenimiento
          const isMaintenance = status === "maintenance";
          const cardBackgroundClass = isMaintenance 
            ? "bg-blue-50 border-blue-200" 
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
                    status === "approvedInspection" || status === "finalApproved" ? "text-green-600" : 
                    status === "covered" ? "text-cyan-600" : // <-- ADDED FOR COVERED
                    (progressBarIndex === -1 && !["firstInspectionPending", "rejectedInspection", "approvedInspection", "finalInspectionPending", "finalRejected", "covered", "approvedInspection", "finalApproved"].includes(status)) ? "text-gray-700" : // Fallback for unknown/default
                    "text-green-600" // Default for other "positive" or completed steps
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