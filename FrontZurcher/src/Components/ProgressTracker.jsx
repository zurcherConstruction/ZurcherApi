import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorks } from "../Redux/Actions/workActions"; // Acción para obtener los works
import { Link } from "react-router-dom";
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid'; // Importar el ícono

const etapas = [
  { backend: "inProgress", display: "Purchase in Progress" },
  { backend: "installed", display: "Installing" },
  { backend: "firstInspectionPending", display: "Inspection Pending" },
  { backend: "coverPending", display: "Cover Pending" },
  { backend: "invoiceFinal", display: "Send Final Invoice" },
  { backend: "paymentReceived", display: "Payment Received" },
  { backend: "finalInspectionPending", display: "Final Inspection Pending" },
  { backend: "maintenance", display: "Maintenance" },
];

const ProgressTracker = () => {
  const dispatch = useDispatch();
  const { works, loading, error } = useSelector((state) => state.work);
  const [search, setSearch] = useState("");
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    dispatch(fetchWorks());
  }, [dispatch]);

  useEffect(() => {
    if (works) {
      setFilteredData(
        works.filter((work) =>
          work.propertyAddress?.toLowerCase().includes(search.toLowerCase())
        )
      );
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
    let statusToFindInFilteredEtapas = currentWorkStatus;

    if (currentWorkStatus === "firstInspectionPending" || currentWorkStatus === "rejectedInspection") {
      statusToFindInFilteredEtapas = "installed";
    } else if (currentWorkStatus === "approvedInspection") {
      statusToFindInFilteredEtapas = "firstInspectionPending";
    } else if (currentWorkStatus === "finalInspectionPending" || currentWorkStatus === "finalRejected") {
      // If coverPending is a distinct step before finalInspectionPending, this might need adjustment
      // For now, assuming final inspection follows covering or invoicing.
      statusToFindInFilteredEtapas = "invoiceFinal"; // Or "coverPending" if that's the immediate precedent
    } else if (currentWorkStatus === "finalApproved") {
      statusToFindInFilteredEtapas = "finalInspectionPending";
    } else if (currentWorkStatus === "covered") { // <-- ADDED CONDITION
      statusToFindInFilteredEtapas = "coverPending"; // 'covered' status makes 'coverPending' the current visual step
    }
    const index = filteredEtapas.findIndex((etapa) => etapa.backend === statusToFindInFilteredEtapas);
    return index;
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
        filteredData.map(({ idWork, propertyAddress, status, Permit }) => {
          
          let permitExpirationAlertIcon = null; // Asegúrate que esta variable esté definida aquí
          if (Permit && Permit.expirationStatus) { // Verificar que Permit y expirationStatus existan
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

          const progressBarIndex = getProgressIndexForBar(status);

          return (
            <Link
              to={`/work/${idWork}`}
              key={idWork}
              className="block bg-white p-4 md:p-4 mb-4 shadow-lg rounded-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="font-varela uppercase text-lg md:text-xl text-gray-700 text-center flex items-center justify-center">
                {propertyAddress}
                {permitExpirationAlertIcon} {/* Aquí se incluye el ícono */}
              </h3>
    
              <div className="hidden sm:flex relative items-center justify-between mt-4">
                <div className="absolute w-full h-2 bg-gray-200 rounded-full"></div>
                <div
                  className="absolute h-2 bg-green-500 rounded-full transition-all duration-500"
                  style={{
                    width: progressBarIndex >= 0 ? `${(progressBarIndex / (filteredEtapas.length - 1)) * 100}%` : '0%',
                  }}
                ></div>
                {filteredEtapas.map((etapa, etapaMapIndex) => {
                  let circleColor = "bg-gray-400";
                  let textColor = "text-gray-600";
                  let isBold = false;
                  let shouldPulse = false;

                  if (progressBarIndex >= 0) {
                    if (etapaMapIndex < progressBarIndex) {
                      circleColor = "bg-green-500";
                    } else if (etapaMapIndex === progressBarIndex) {
                      circleColor = "bg-green-500";
                      if (status === etapa.backend && 
                          status !== "firstInspectionPending" && status !== "rejectedInspection" && status !== "approvedInspection" &&
                          status !== "finalInspectionPending" && status !== "finalRejected") {
                          textColor = "text-green-600";
                          isBold = true;
                          shouldPulse = true;
                        } else if (etapa.backend === "coverPending" && status === "covered") {
                          // Specific case: actual status is 'covered', visual step is 'coverPending'
                          textColor = "text-green-600"; // Text for "Cover Pending" label
                          isBold = true;
                          shouldPulse = true;
                        }
                    }
                  }

                  if (etapa.backend === "firstInspectionPending") {
                    if (status === "firstInspectionPending") {
                      circleColor = "bg-yellow-400"; textColor = "text-yellow-500"; isBold = true; shouldPulse = true;
                    } else if (status === "rejectedInspection") {
                      circleColor = "bg-red-500"; textColor = "text-red-600"; isBold = true; shouldPulse = true;
                    } else if (status === "approvedInspection") {
                      circleColor = "bg-green-500"; 
                      textColor = "text-green-600";
                      isBold = true;
                      // shouldPulse = true; 
                    }
                  } else if (etapa.backend === "finalInspectionPending") {
                    if (status === "finalInspectionPending") {
                      circleColor = "bg-yellow-400"; textColor = "text-yellow-500"; isBold = true; shouldPulse = true;
                    } else if (status === "finalRejected") {
                      circleColor = "bg-red-500"; textColor = "text-red-600"; isBold = true; shouldPulse = true;
                    }
                  }
                  else if (status === etapa.backend && progressBarIndex >= etapaMapIndex && !shouldPulse && 
                           filteredEtapas.some(e => e.backend === status) &&
                           status !== "approvedInspection"
                           ) {
                      circleColor = "bg-green-500";
                      textColor = "text-green-600";
                      isBold = true;
                      shouldPulse = true;
                  }
                  
                  return (
                    <div
                      key={etapa.backend}
                      className="relative flex flex-col items-center"
                      style={{ width: `${100 / filteredEtapas.length}%` }}
                    >
                      <div
                        className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-sm font-bold shadow-md ${circleColor} ${shouldPulse ? 'animate-pulse' : ''}`}
                        style={{ position: "absolute", top: "50%", transform: "translate(-50%, -50%)", left: "50%" }}
                      >
                        {etapaMapIndex + 1}
                      </div>
                      <p
                        className={`text-xs text-center font-varela mt-16 p-1 ${textColor} ${isBold ? 'font-bold' : ''} ${shouldPulse && isBold ? 'animate-pulse' : ''}`}
                      >
                        {etapa.display}
                      </p>
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