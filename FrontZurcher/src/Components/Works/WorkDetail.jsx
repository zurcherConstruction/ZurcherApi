import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorkById } from "../../Redux/Actions/workActions";
import { useParams } from "react-router-dom";

const WorkDetail = () => {
  const { idWork } = useParams();
  const dispatch = useDispatch();

  // Obtener el estado de la obra desde Redux
  const { selectedWork: work, loading, error } = useSelector((state) => state.work);

  // Estado para manejar el modal de la imagen
  const [selectedImage, setSelectedImage] = useState(null);

  // Cargar los detalles de la obra al montar el componente
  useEffect(() => {
    dispatch(fetchWorkById(idWork));
  }, [dispatch, idWork]);

  if (loading) {
    return <p>Cargando detalles de la obra...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (!work) {
    return <p>No se encontró la obra.</p>;
  }

  // Convertir el PDF a una URL para mostrarlo
  const pdfUrl = work.Permit?.pdfData
    ? URL.createObjectURL(new Blob([new Uint8Array(work.Permit.pdfData.data)], { type: 'application/pdf' }))
    : null;


  return (
    <div className="p-4 bg-white shadow-md rounded-lg flex flex-col lg:flex-row gap-8">
      {/* Columna izquierda: Detalles principales */}
      <div className="flex-1">
        <h2 className="text-xl font-bold mb-4">Detalles de la Obra</h2>
        <p><strong>Address:</strong> {work.propertyAddress}</p>
        <p><strong>State:</strong> {work.status}</p>
        <p><strong>Presupuesto:</strong> {work.budget?.price || "No disponible"}</p>
        <p><strong>Permiso:</strong> {work.permit?.idPermit || "No disponible"}</p>

        {pdfUrl && (
          <div>
            <h3 className="text-lg font-bold mt-4">Vista previa del Permit</h3>
            <iframe src={pdfUrl} width="100%" height="250px" title="Vista previa del PDF"></iframe>
          </div>
        )}
      </div>

      {/* Columna derecha: Detalles de instalación */}
      <div className="flex-1">
        <h2 className="text-xl font-bold mb-4">Detalles de Instalación</h2>
        {work.installationDetails && work.installationDetails.length > 0 ? (
          <ul className="space-y-4">
            {work.installationDetails.map((detail) => (
              <li key={detail.idInstallationDetail} className="border p-4 rounded shadow">
                <p><strong>Fecha:</strong> {detail.date}</p>
                <p><strong>Detalles Extras:</strong> {detail.extraDetails || "No disponible"}</p>
                <p><strong>Materiales Extras:</strong> {detail.extraMaterials || "No disponible"}</p>
                {detail.images && detail.images.length > 0 && (
                  <div>
                    <p><strong>Imágenes:</strong></p>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {detail.images.map((img, index) => (
                        <img
                          key={index}
                          src={img}
                          alt={`Imagen ${index + 1}`}
                          className="w-full h-24 object-cover rounded cursor-pointer"
                          onClick={() => setSelectedImage(img)} // Abrir el modal con la imagen seleccionada
                        />
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No hay detalles de instalación disponibles.</p>
        )}
      </div>

      {/* Modal para mostrar la imagen ampliada */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)} // Cerrar el modal al hacer clic fuera de la imagen
        >
          <div className="relative">
            <img
              src={selectedImage}
              alt="Imagen ampliada"
              className="max-w-full max-h-screen rounded"
            />
            <button
              className="absolute top-2 right-2 bg-white text-black p-2 rounded-full"
              onClick={() => setSelectedImage(null)} // Cerrar el modal al hacer clic en el botón
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkDetail;