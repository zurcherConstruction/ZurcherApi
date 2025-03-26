import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorkById } from "../../Redux/Actions/workActions";
import { useParams } from "react-router-dom";

const WorkDetail = () => {
    const { idWork } = useParams();
  const dispatch = useDispatch();

  // Obtener el estado de la obra desde Redux
  const { selectedWork: work, loading, error } = useSelector((state) => state.work);

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
    <div className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-bold mb-4">Detalles de la Obra</h2>
      <p><strong>ID:</strong> {work.idWork}</p>
      <p><strong>Dirección:</strong> {work.propertyAddress}</p>
      <p><strong>Estado:</strong> {work.status}</p>
      <p><strong>Notas:</strong> {work.notes}</p>
      <p><strong>Presupuesto:</strong> {work.budget?.price || "No disponible"}</p>
      <p><strong>Permiso:</strong> {work.permit?.idPermit || "No disponible"}</p>
      
      
      {pdfUrl && (
        <div>
          <h3 className="text-lg font-bold mt-4">Vista previa del permiso</h3>
          <iframe src={pdfUrl} width="100%" height="500px" title="Vista previa del PDF"></iframe>
        </div>
      )}
      {/* Agrega más campos según sea necesario */}
    </div>
  );
};

export default WorkDetail;