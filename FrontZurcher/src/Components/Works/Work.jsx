import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorks } from "../../Redux/Actions/workActions"; // Acción para obtener los works
import { useNavigate } from "react-router-dom";

const Works = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // Obtener works desde el estado de Redux
  const { works, loading, error } = useSelector((state) => state.work);

  // Cargar works al montar el componente
  useEffect(() => {
    dispatch(fetchWorks()); // Cargar los works desde el backend
  }, [dispatch]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Works</h1>

      {/* Mostrar estado de carga */}
      {loading && <p className="text-blue-950">Cargando obras...</p>}

      {/* Mostrar error si ocurre */}
      {error && <p className="text-red-500">Error: {error}</p>}

      {/* Mostrar lista de works */}
      {!loading && !error && (
        <>
          {/* Tabla para pantallas grandes y medianas */}
          <div className="hidden lg:block">
            <table className="table-auto w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 px-4 py-2">Address</th>
                  <th className="border border-gray-300 px-4 py-2">State</th>
                  <th className="border border-gray-300 px-4 py-2">Ver Detalle</th>
                </tr>
              </thead>
              <tbody>
                {works.map((work) => (
                  <tr key={work.idWork} className="hover:bg-gray-100">
                    <td className="border border-gray-300 px-4 py-2">{work.propertyAddress}</td>
                    <td className="border text-center border-gray-300 px-4 py-2">{work.status}</td>
                    <td className="border text-center border-gray-300 px-4 py-2">
                      <button
                        onClick={() => navigate(`/work/${work.idWork}`)} // Redirigir al detalle
                        className="px-2 py-1 bg-blue-950 text-white rounded hover:bg-blue-600"
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas para pantallas pequeñas */}
          <div className="block lg:hidden space-y-4">
            {works.map((work) => (
              <div
                key={work.idWork}
                className="border border-gray-300 rounded-lg p-4 shadow-md hover:bg-gray-100"
              >
                <p className="text-sm font-semibold">Address: {work.propertyAddress}</p>
                <p className="text-sm">State: {work.status}</p>
                <div className="mt-2">
                  <button
                    onClick={() => navigate(`/work/${work.idWork}`)} // Redirigir al detalle
                    className="px-3 py-2 bg-blue-950 text-white rounded hover:bg-blue-600"
                  >
                    Ver Detalle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Works;