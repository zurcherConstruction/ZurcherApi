import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import api from '../utils/axios';
import { fetchStaff } from '../Redux/Actions/adminActions';


const SendNotification = () => {
    const dispatch = useDispatch();
  const [message, setMessage] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const { staff, loading, error } = useSelector((state) => state.admin);

  useEffect(() => {
    dispatch(fetchStaff()); // Llama a la acción para cargar el staff
  }, [dispatch]);


  const handleSendNotification = async () => {
    if (!message || !recipientId) {
      alert('Por favor, completa todos los campos.');
      return;
    }

    try {
      await api.post('/notification', {
        staffId: recipientId,
        message,
        type: 'alerta',
      });
      alert('Notificación enviada con éxito.');
      setMessage('');
      setRecipientId('');
    } catch (error) {
      console.error('Error al enviar la notificación:', error);
      alert('Hubo un error al enviar la notificación.');
    }
  };

  if (loading) return <p>Cargando lista de staff...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="p-4 bg-white shadow rounded">
      <h2 className="text-lg font-bold mb-4">Enviar Notificación</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Seleccionar destinatario:</label>
        <select
          value={recipientId}
          onChange={(e) => setRecipientId(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="">Selecciona un compañero</option>
          {staff.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.name} ({staff.email})
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Mensaje:</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          rows="3"
        />
      </div>
      <button
        onClick={handleSendNotification}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Enviar Notificación
      </button>
    </div>
  );
};

export default SendNotification;