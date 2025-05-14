// En tu frontend (ej. ChangeOrderResponsePage.js)
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } // O el hook de tu router para query params
from 'react-router-dom'; 
import axios from 'axios'; // o fetch

const ChangeOrderResponsePage = () => {
  const location = useLocation();
  // const navigate = useNavigate(); // Para redirigir después
  const [message, setMessage] = useState('Procesando su respuesta...');
  const [error, setError] = useState('');

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');
    const decision = queryParams.get('decision');
    const coId = queryParams.get('coId');

    let isMounted = true; // Para evitar actualizaciones de estado en un componente desmontado

    const processResponse = async () => {
      if (token && decision && coId) {
        const apiUrlFromEnv = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const backendApiUrl = `${apiUrlFromEnv}/change-orders/respond`; // Asegúrate que esta sea la ruta correcta según tu montaje en routes/index.js
        
        console.log("Frontend llamando a:", backendApiUrl, "con params:", { token, decision, coId });

        try {
          const response = await axios.get(backendApiUrl, { params: { token, decision, coId } });
          console.log("Respuesta del backend (éxito):", response.data);
          if (isMounted) {
            if (response.data && response.data.success) {
              setMessage(response.data.message || '¡Operación exitosa!');
              setError(''); // Limpiar errores previos
            } else {
              // Caso poco probable si es 2xx pero success: false
              setError(response.data.message || 'Ocurrió un error inesperado.');
              setMessage('');
            }
          }
        } catch (err) {
          console.error("Error desde el frontend al llamar a la API:", err.response || err.message);
          if (isMounted) {
            let errorMessage = 'Ocurrió un error al procesar su solicitud.';
            if (err.response) {
              // Manejar errores específicos del backend
              if (err.response.status === 409) { // Conflicto - Ya procesado
                errorMessage = err.response.data.message || 'Esta orden de cambio ya ha sido procesada.';
              } else if (err.response.status === 403) { // Prohibido - Token inválido
                errorMessage = err.response.data.message || 'El enlace es inválido o ha expirado.';
              } else if (err.response.status === 404) { // No encontrado
                errorMessage = err.response.data.message || 'La orden de cambio no fue encontrada.';
              } else if (err.response.data && err.response.data.message) {
                errorMessage = err.response.data.message;
              }
            } else if (err.message) {
              errorMessage = err.message; // Error de red u otro error de Axios
            }
            setError(errorMessage);
            setMessage('');
          }
        }
      } else {
        if (isMounted) {
          setError('Información incompleta en el enlace. No se puede procesar la respuesta.');
          setMessage('');
        }
      }
    };

    processResponse();

    return () => {
      isMounted = false; // Cleanup para evitar setear estado en componente desmontado
    };

  }, [location]);

  return (
    <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'Arial, sans-serif' }}>
      {message && <h1 style={{ color: 'green' }}>{message}</h1>}
      {error && <h1 style={{ color: 'red' }}>{error}</h1>}
      {!message && !error && <p>Procesando su respuesta...</p>}
      {(message || error) && <p><a href="/">Volver al inicio</a></p>}
    </div>
  );
};

export default ChangeOrderResponsePage;