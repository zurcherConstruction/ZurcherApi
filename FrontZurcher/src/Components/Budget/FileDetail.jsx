import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../utils/axios';

const FileDetail = () => {
  const { folder, file } = useParams(); // Obtener los parámetros de la URL
  const [fileContent, setFileContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFileContent = async () => {
      try {
        const response = await api.get(`/archive/${folder}/${file}`);
        setFileContent(response.data);
      } catch (err) {
        setError('Error al obtener el archivo');
      } finally {
        setLoading(false);
      }
    };

    fetchFileContent();
  }, [folder, file]);

  if (loading) return <p>Load file...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  // Si el contenido es un arreglo, renderizarlo como una tabla
  const renderTable = (data) => {
    if (Array.isArray(data)) {
      return (
        <table className="table-auto w-full border-collapse border border-gray-300">
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
      <table className="table-auto w-full border-collapse border border-gray-300">
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

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-4">File Detail</h1>
      {renderTable(fileContent)}
    </div>
  );
};

export default FileDetail;