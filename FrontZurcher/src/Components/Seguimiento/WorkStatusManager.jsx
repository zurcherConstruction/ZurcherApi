import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchWorks, updateWork } from '../../Redux/Actions/workActions'; // Acciones de Redux
import { toast } from 'react-toastify'; // Asegúrate de instalar react-toastify
import 'react-toastify/dist/ReactToastify.css';

const WorkStatusManager = () => {
  const dispatch = useDispatch();
  const works = useSelector((state) => state.work.works); // Obras desde Redux
  const loading = useSelector((state) => state.work.loading);
  const error = useSelector((state) => state.work.error);

  const [selectedWork, setSelectedWork] = useState(null); // Obra seleccionada

  const statusOrder = [
    'inProgress',
    'installed',
    'firstInspectionPending',
    'approvedInspection',
    'completed',
    'finalInspectionPending',
    'finalApproved',
    'maintenance',
  ];

  useEffect(() => {
    dispatch(fetchWorks()); // Cargar todas las obras al montar el componente
  }, [dispatch]);

  const handleWorkSelect = (e) => {
    const workId = e.target.value;
    const work = works.find((w) => w.idWork === workId);
    setSelectedWork(work);
  };

  const handleStatusChange = (newStatus, confirmationMessage) => {
    if (!selectedWork) return;

    const currentStatusIndex = statusOrder.indexOf(selectedWork.status);
    const newStatusIndex = statusOrder.indexOf(newStatus);

    // Verificar si el nuevo estado es el siguiente en el orden
    if (newStatusIndex !== currentStatusIndex + 1) {
      alert('Hay que completar los pasos anteriores antes de avanzar.');
      return;
    }

    // Confirmación antes de cambiar el estado
    const confirm = window.confirm(confirmationMessage);
    if (!confirm) return;

    // Actualizar el estado en el backend
    dispatch(updateWork(selectedWork.idWork, { status: newStatus }))
      .then(() => {
        toast.success(`Estado actualizado a "${newStatus}"`);
        setSelectedWork({ ...selectedWork, status: newStatus }); // Actualizar el estado local
      })
      .catch(() => {
        toast.error('Error al actualizar el estado');
      });
  };

  return (
    <div className="container mx-auto p-4 md:p-8 lg:p-12">
      <h2 className="text-2xl font-semibold mb-4">Gestión de Estados de Obra</h2>

      {/* Select para elegir la obra */}
      <div className="mb-4">
        <label htmlFor="workSelect" className="block text-gray-700 text-sm font-bold mb-2">
          Seleccione una obra:
        </label>
        {loading && <p>Cargando obras...</p>}
        {error && <p>Error: {error}</p>}
        <select
          id="workSelect"
          onChange={handleWorkSelect}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        >
          <option value="">Seleccione una dirección</option>
          {works.map((work) => (
            <option key={work.idWork} value={work.idWork}>
              {work.propertyAddress}
            </option>
          ))}
        </select>
      </div>

      {/* Detalle de la obra seleccionada */}
      {selectedWork && (
        <div className="p-4 bg-white shadow-md rounded-lg mb-4">
          <h3 className="text-lg font-bold mb-2">Detalles de la Obra</h3>
          <p><strong>Dirección:</strong> {selectedWork.propertyAddress}</p>
          <p><strong>Estado:</strong> {selectedWork.status}</p>
          <p><strong>Notas:</strong> {selectedWork.notes || 'Sin notas'}</p>
        </div>
      )}

      {/* Checkboxes para cambiar el estado */}
      {selectedWork && (
        <div className="space-y-4">
          {statusOrder.map((status, index) => {
            const isChecked = statusOrder.indexOf(selectedWork.status) >= index;
            const isDisabled = statusOrder.indexOf(selectedWork.status) < index - 1;

            const labels = {
              inProgress: 'Materiales Comprados',
              installed: 'Trabajo Instalado',
              firstInspectionPending: 'Ya se pidió 1° Inspección',
              approvedInspection: 'Primera Inspección Aprobada',
              completed: 'Trabajo Completo y Tapado',
              finalInspectionPending: 'Ya se pidió Inspección Final',
              finalApproved: 'Inspección Final Aprobada',
              maintenance: 'Terminado, Pasa a Mantenimiento',
            };

            return (
              <div key={status} className="flex items-center">
                <input
                  type="checkbox"
                  id={status}
                  checked={isChecked}
                  disabled={isDisabled}
                  onChange={() =>
                    handleStatusChange(
                      status,
                      `¿Estás seguro de que deseas cambiar el estado a "${labels[status]}"?`
                    )
                  }
                  className="mr-2"
                />
                <label htmlFor={status} className={`text-gray-700 ${isDisabled ? 'opacity-50' : ''}`}>
                  {labels[status]}
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WorkStatusManager;