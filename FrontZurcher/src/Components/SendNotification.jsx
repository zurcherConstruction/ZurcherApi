import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import api from '../utils/axios';
import { fetchStaff } from '../Redux/Actions/adminActions';

const SendNotification = () => {
  const dispatch = useDispatch();
  const [message, setMessage] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const { staffList: staff, loading, error } = useSelector((state) => state.admin);

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
    <div className="bg-gradient-to-br from-blue-50 to-gray-100 min-h-screen flex items-center justify-center py-8 px-2">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        <h2 className="text-2xl font-bold text-blue-900 mb-6 text-center tracking-tight">
          Send Notification
        </h2>
        <form className="space-y-6">
          {/* Recipient */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Recipient
            </label>
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base p-2 bg-gray-50"
            >
              <option value="">Select a team member</option>
              {staff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.email})
                </option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base p-2 bg-gray-50 resize-none"
              rows="4"
              placeholder="Type your message here..."
            />
          </div>

          {/* Send Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSendNotification}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendNotification;