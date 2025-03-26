import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorks } from "../Redux/Actions/workActions"; // Acción para obtener los works

// Mapeo de estados del backend a nombres legibles
const etapas = [
  { backend: "pending", display: "Esperando Materiales" },
  { backend: "inProgress", display: "Preparando Instalación" },
  { backend: "installed", display: "Instalado" },
  { backend: "firstInspectionPending", display: "Inspección Pendiente" },
  { backend: "approvedInspection", display: "Inspección Aprobada" },
  { backend: "completed", display: "Completado" },
  { backend: "finalInspectionPending", display: "Inspección Final Pendiente" },
  { backend: "finalApproved", display: "Inspección Final Aprobada" },
  { backend: "maintenance", display: "Mantenimiento" },
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
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      
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
          <div
            key={idWork}
            className=" bg-white p-4 md:p-4 shadow-lg rounded-lg border border-gray-200"
          >
            <h3 className="font-semibold text-lg md:text-xl text-gray-700  text-center">
              Address: {propertyAddress}
            </h3>
            <div className="relative flex items-center justify-between">
              {/* Barra de fondo */}
              <div className="absolute w-full h-2 bg-gray-200 rounded-full"></div>
              {/* Barra de progreso */}
              <div
                className="absolute h-2 bg-green-500 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    (getProgressIndex(status) / (filteredEtapas.length - 1)) *
                    100
                  }%`,
                }}
              ></div>
{filteredEtapas.map((etapa, index) => (
  <div
    key={etapa.backend}
    className="relative flex flex-col items-center"
    style={{
      width: `${100 / filteredEtapas.length}%`,
      position: "relative", // Para posicionar los círculos y texto
    }}
  >
    {/* Línea de progreso */}
    {index < filteredEtapas.length - 1 && (
      <div
        className="absolute top-1/2 left-1/2 h-2 bg-gray-200"
        style={{
          width: "100%",
          transform: "translateY(-50%)", // Centrar la línea verticalmente
          backgroundColor:
            getProgressIndex(status) >= index + 1 ? "green" : "gray",
          zIndex: 0, // Asegurar que esté detrás de los círculos
        }}
      ></div>
    )}

    {/* Círculo */}
    <div
      className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-sm font-bold shadow-md ${
        getProgressIndex(status) >= index
          ? "bg-green-500"
          : "bg-gray-400"
      }`}
      style={{
        position: "absolute", // Posicionar el círculo
        top: "50%", // Centrar verticalmente sobre la línea
        transform: "translateY(-50%)", // Ajustar para que quede cortado por la línea
        zIndex: 1, // Asegurar que esté sobre la línea
      }}
    >
      {index + 1}
    </div>

    {/* Contenedor del texto */}
    <div
      style={{
        marginTop: "4rem", // Separar el texto del círculo y la barra
      }}
    >
      <p
        className="text-xs text-center text-gray-600"
        style={{
          minHeight: "1.5rem", // Altura mínima fija para el texto
          margin: 0, // Eliminar márgenes laterales
        }}
      >
        {etapa.display}
      </p>
    </div>
  </div>
))}
            </div>
            <p className="text-gray-600 text-sm mt-4 text-center">
              Estado actual:{" "}
              <span className="font-semibold text-green-600">
                {getDisplayName(status)}
              </span>
            </p>
          </div>
        ))}
    </div>
  );
};

export default ProgressTracker;

//diseño de flechas progress
// import React, { useEffect, useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { fetchWorks } from "../Redux/Actions/workActions"; // Acción para obtener los works

// // Mapeo de estados del backend a nombres legibles
// const etapas = [
//   { backend: "pending", display: "Esperando Materiales" },
//   { backend: "inProgress", display: "Preparando Instalación" },
//   { backend: "installed", display: "Instalado" },
//   { backend: "firstInspectionPending", display: "Inspección Pendiente" },
//   { backend: "approvedInspection", display: "Inspección Aprobada" },
//   { backend: "completed", display: "Completado" },
//   { backend: "finalInspectionPending", display: "Inspección Final Pendiente" },
//   { backend: "finalApproved", display: "Inspección Final Aprobada" },
//   { backend: "maintenance", display: "Mantenimiento" },
// ];

// const ProgressTracker = () => {
//   const dispatch = useDispatch();

//   // Obtener works desde el estado de Redux
//   const { works, loading, error } = useSelector((state) => state.work);

//   // Estado local para la búsqueda
//   const [search, setSearch] = useState("");
//   const [filteredData, setFilteredData] = useState([]);

//   // Cargar works al montar el componente
//   useEffect(() => {
//     dispatch(fetchWorks()); // Cargar los works desde el backend
//   }, [dispatch]);

//   // Actualizar los datos filtrados cuando cambien los works o la búsqueda
//   useEffect(() => {
//     setFilteredData(
//       works.filter((work) =>
//         work.propertyAddress.toLowerCase().includes(search.toLowerCase())
//       )
//     );
//   }, [works, search]);

//   // Manejar la búsqueda
//   const handleSearch = (e) => {
//     setSearch(e.target.value);
//   };

//   // Obtener el índice de progreso según el estado
//   const getProgressIndex = (status) =>
//     etapas.findIndex((etapa) => etapa.backend === status);

//   return (
//     <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
//       <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-6">
//         Seguimiento de Progreso
//       </h1>
//       <input
//         type="text"
//         placeholder="Buscar por Dirección"
//         value={search}
//         onChange={handleSearch}
//         className="border border-gray-300 p-2 md:p-3 mb-6 w-full rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
//       />

//       {/* Mostrar estado de carga */}
//       {loading && <p className="text-blue-500 text-center">Cargando obras...</p>}

//       {/* Mostrar error si ocurre */}
//       {error && <p className="text-red-500 text-center">Error: {error}</p>}

//       {/* Mostrar lista de obras */}
//       {!loading &&
//         !error &&
//         filteredData.map(({ idWork, propertyAddress, status }) => (
//           <div
//             key={idWork}
//             className="mb-6 bg-white p-4 md:p-6 shadow-lg rounded-lg border border-gray-200"
//           >
//             <h3 className="font-semibold text-lg md:text-xl text-gray-700 mb-4 text-center">
//               Dirección: {propertyAddress}
//             </h3>
//             <div className="flex items-center">
//               {etapas.map((etapa, index) => (
//                 <div
//                   key={etapa.backend}
//                   className={`relative flex items-center justify-center w-24 h-20 text-white font-medium text-xs md:text-sm ${
//                     getProgressIndex(status) >= index
//                       ? "bg-green-500"
//                       : "bg-gray-300"
//                   }`}
//                   style={{
//                     clipPath:
//                       index === etapas.length - 1
//                         ? "polygon(0 0, 100% 0, 100% 100%, 0 100%)"
//                         : "polygon(0 0, 90% 0, 100% 50%, 90% 100%, 0 100%)",
//                   }}
//                 >
//                   <span className="text-center leading-tight">{etapa.display}</span>
//                 </div>
//               ))}
//             </div>
//             <p className="text-gray-600 text-sm mt-4 text-center">
//               Estado actual:{" "}
//               <span className="font-semibold text-green-600">
//                 {etapas[getProgressIndex(status)].display}
//               </span>
//             </p>
//           </div>
//         ))}
//     </div>
//   );
// };

// export default ProgressTracker;