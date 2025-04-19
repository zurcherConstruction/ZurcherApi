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
    <div className="p-6 bg-white shadow-md rounded-md max-w-md mx-auto">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Enviar Notificación</h2>
      <form className="space-y-4">
        {/* Seleccionar destinatario */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Destinatario:
          </label>
          <select
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2"
          >
            <option value="">Selecciona un compañero</option>
            {staff.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name} ({staff.email})
              </option>
            ))}
          </select>
        </div>

        {/* Mensaje */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mensaje:
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2"
            rows="4"
            placeholder="Escribe tu mensaje aquí..."
          />
        </div>

        {/* Botón Enviar */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSendNotification}
            className="bg-blue-500 text-white px-4 py-2 rounded-md shadow hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
};

export default SendNotification;