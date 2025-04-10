import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorks } from "../Redux/Actions/workActions"; // Acción para obtener los works
import { Link } from "react-router-dom";
// Mapeo de estados del backend a nombres legibles
const etapas = [
  { backend: "inProgress", display: "Purchase in Progress" },// compra en curso
  // { backend: "inProgress", display: "Preparando Instalación" },
  { backend: "installed", display: "Installing" },// instalado
  { backend: "firstInspectionPending", display: "Inspection Pending" },// insp pendiente
  // { backend: "approvedInspection", display: "Inspección Aprobada" },
  { backend: "coverPending", display: "Cover Pending" },// cubierta pendiente
  // { backend: "completed", display: "Covered" },
  { backend: "invoiceFinal", display: "Send Final Invoice" },//enviar fac final
  { backend: "paymentReceived", display: "Payment Received" },// pago recibido
  { backend: "finalInspectionPending", display: "Final Inspection Pending" },
  // { backend: "finalApproved", display: "Inspección Final Aprobada" },
  { backend: "maintenance", display: "Maintenance" },
];

const ProgressTracker = () => {
  const dispatch = useDispatch();

  // Obtener works desde el estado de Redux
  const { works, loading, error } = useSelector((state) => state.work);

  // Estado local para la búsqueda
  const [search, setSearch] = useState("");
  const [filteredData, setFilteredData] = useState([]);

  // Cargar works al montar el componente
  useEffect(() => {
    dispatch(fetchWorks()); // Cargar los works desde el backend
  }, [dispatch]);

  // Actualizar los datos filtrados cuando cambien los works o la búsqueda
  useEffect(() => {
    setFilteredData(
      works.filter((work) =>
        work.propertyAddress.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [works, search]);

  // Manejar la búsqueda
  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  // Obtener el índice de progreso según el estado
  const getProgressIndex = (status) =>
    etapas.findIndex((etapa) => etapa.backend === status);

  // Obtener el nombre legible de la etapa
  const getDisplayName = (status) => {
    const etapa = etapas.find((etapa) => etapa.backend === status);
    return etapa ? etapa.display : "Estado desconocido";
  };

  // Filtrar etapas para excluir estados rechazados
  const filteredEtapas = etapas.filter(
    (etapa) =>
      etapa.backend !== "rejectedInspection" && etapa.backend !== "finalRejected"
  );

  return (
    <div className="max-w-7xl p-2 mx-auto">
      <input
        type="text"
        placeholder="Buscar por Dirección"
        value={search}
        onChange={handleSearch}
        className="border border-gray-300 p-2 md:p-3 mb-6 w-full rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
  
      {/* Mostrar estado de carga */}
      {loading && <p className="text-blue-500 text-center">Cargando obras...</p>}
  
      {/* Mostrar error si ocurre */}
      {error && <p className="text-red-500 text-center">Error: {error}</p>}
  
      {/* Mostrar lista de obras */}
      {!loading &&
        !error &&
        filteredData.map(({ idWork, propertyAddress, status }) => (
          <Link
          to={`/work/${idWork}`} // Redirige al detalle del trabajo
          key={idWork}
          className="block bg-white p-4 md:p-4 shadow-lg rounded-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300"
        >
            <h3 className="font-semibold text-lg md:text-xl text-gray-700 text-center">
              Address: {propertyAddress}
            </h3>
  
{/* Diseño para pantallas grandes */}
<div className="hidden sm:flex relative items-center justify-between">
  {/* Barra de fondo */}
  <div className="absolute w-full h-2 bg-gray-200 rounded-full"></div>
  
  {/* Barra de progreso */}
  <div
    className="absolute h-2 bg-green-500 rounded-full transition-all duration-500"
    style={{
      width: `${
        (getProgressIndex(status) / (filteredEtapas.length - 1)) * 100
      }%`,
    }}
  ></div>

  {filteredEtapas.map((etapa, index) => (
    <div
      key={etapa.backend}
      className="relative flex flex-col items-center"
      style={{
        width: `${100 / filteredEtapas.length}%`,
      }}
    >
      {/* Círculo */}
      <div
       className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-sm font-bold shadow-md ${
        getProgressIndex(status) === index
          ? "bg-green-500 animate-pulse" // Solo el último estado completado tendrá el efecto de destello
          : getProgressIndex(status) > index
          ? "bg-green-500" // Estados completados sin destello
          : "bg-gray-400" // Estados pendientes
      }`}
        style={{
          position: "absolute",
          top: "50%", // Centrar verticalmente
          transform: "translate(-50%, -50%)", // Ajustar para que quede centrado
          left: "50%", // Centrar horizontalmente dentro de su contenedor
        }}
      >
        {index + 1}
      </div>
      <p
  className={`text-xs text-center mt-16 p-1 ${
    getProgressIndex(status) === index
      ? "text-green-600 font-bold animate-pulse" // Resaltar el texto del estado actual
      : "text-gray-600"
  }`}
>
  {etapa.display}
</p>
    </div>
  ))}
</div>
  
            {/* Diseño para móviles */}
            <div className="block sm:hidden">
              <p className="text-sm text-gray-600">
                Estado actual:{" "}
                <span className="font-semibold text-green-600">
                  {getDisplayName(status)}
                </span>
              </p>
            </div>
          </Link>
        ))}
    </div>
  );
};

export default ProgressTracker;

