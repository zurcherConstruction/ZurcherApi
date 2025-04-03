import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchArchivedBudgets } from '../../Redux/Actions/budgetActions';
import api from '../../utils/axios';

const ArchiveBudget = () => {
  const dispatch = useDispatch();
  const { archivedBudgets, loading, error } = useSelector((state) => state.budget);
  const [expandedFolder, setExpandedFolder] = useState(null); // Estado para controlar qué carpeta está expandida
  const [expandedFile, setExpandedFile] = useState(null); // Estado para controlar qué archivo está expandido

  useEffect(() => {
    dispatch(fetchArchivedBudgets());
  }, [dispatch]);

  const handleFileClick = async (folder, file) => {
    try {
      console.log(`Solicitando archivo: /archive/${folder}/${file}`);
      const response = await api.get(`/archive/${folder}/${file}`); // Realizar la solicitud al backend
      setExpandedFile((prev) =>
        prev?.file === file && prev?.folder === folder ? null : { folder, file, content: response.data }
      ); // Alternar entre expandir y contraer el archivo
    } catch (err) {
      console.error("Error al obtener el archivo:", err);
    }
  };

  const toggleFolder = (folder) => {
    setExpandedFolder(expandedFolder === folder ? null : folder); // Alternar entre expandir y contraer la carpeta
  };

  const renderTable = (data) => {
    if (Array.isArray(data)) {
      // Si el contenido es un arreglo, renderizarlo como una tabla
      return (
        <table className="table-auto w-full border-collapse border border-gray-300 mt-4">
          <thead>
            <tr className="bg-gray-200">
              {Object.keys(data[0]).map((key) => (
                <th key={key} className="border border-gray-300 px-4 py-2">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                {Object.values(item).map((value, idx) => (
                  <td key={idx} className="border border-gray-300 px-4 py-2">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    // Si el contenido es un objeto, renderizarlo como una tabla de propiedades
    return (
      <table className="table-auto w-full border-collapse border border-gray-300 mt-4">
        <tbody>
          {Object.entries(data).map(([key, value]) => (
            <tr key={key}>
              <td className="border border-gray-300 px-4 py-2 font-bold">{key}</td>
              <td className="border border-gray-300 px-4 py-2">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  if (loading) return <p>Cargando archivos archivados...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-4">Budgets Archivados</h1>
      {archivedBudgets.map((archive) => (
        <div key={archive.folder} className="mb-4">
          {/* Carpeta como encabezado del acordeón */}
          <button
            onClick={() => toggleFolder(archive.folder)}
            className="w-full text-left font-bold text-lg bg-gray-200 px-4 py-2 rounded"
          >
            {archive.folder} {expandedFolder === archive.folder ? '-' : '+'}
          </button>

          {/* Mostrar archivos solo si la carpeta está expandida */}
          {expandedFolder === archive.folder && (
            <ul className="list-disc ml-6 mt-2">
              {archive.files.map((file) => (
                <li key={file.name} className="mb-2">
                  <button
                    type="button"
                    onClick={() => handleFileClick(archive.folder, file.name)} // Llamar a la función al hacer clic
                    className="text-blue-500 underline"
                  >
                    {file.name} {expandedFile?.file === file.name && expandedFile?.folder === archive.folder ? '-' : '+'}
                  </button>

                  {/* Mostrar contenido del archivo solo si está expandido */}
                  {expandedFile?.file === file.name && expandedFile?.folder === archive.folder && (
                    <div className="mt-2">
                      {renderTable(expandedFile.content)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};

export default ArchiveBudget;