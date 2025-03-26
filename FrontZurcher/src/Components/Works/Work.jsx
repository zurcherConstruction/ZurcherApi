import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWorks } from '../../Redux/Actions/workActions'; // Acción para obtener los works

const Works = () => {
  const dispatch = useDispatch();

  // Obtener works desde el estado de Redux
  const { works, loading, error } = useSelector((state) => state.work);

  // Cargar works al montar el componente
  useEffect(() => {
    dispatch(fetchWorks()); // Cargar los works desde el backend
  }, [dispatch]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Lista de Obras</h1>

      {/* Mostrar estado de carga */}
      {loading && <p className="text-blue-500">Cargando obras...</p>}

      {/* Mostrar error si ocurre */}
      {error && <p className="text-red-500">Error: {error}</p>}

      {/* Mostrar lista de works */}
      {!loading && !error && (
        <table className="table-auto w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 px-4 py-2">Dirección</th>
              <th className="border border-gray-300 px-4 py-2">Estado</th>
              <th className="border border-gray-300 px-4 py-2">Fecha de Inicio</th>
              <th className="border border-gray-300 px-4 py-2">Fecha de Fin</th>
              <th className="border border-gray-300 px-4 py-2">Notas</th>
            </tr>
          </thead>
          <tbody>
            {works.map((work) => (
              <tr key={work.idWork} className="hover:bg-gray-100">
                <td className="border border-gray-300 px-4 py-2">{work.propertyAddress}</td>
                <td className="border border-gray-300 px-4 py-2">{work.status}</td>
                <td className="border border-gray-300 px-4 py-2">{work.startDate || 'No definida'}</td>
                <td className="border border-gray-300 px-4 py-2">{work.endDate || 'No definida'}</td>
                <td className="border border-gray-300 px-4 py-2">{work.notes || 'Sin notas'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Works;