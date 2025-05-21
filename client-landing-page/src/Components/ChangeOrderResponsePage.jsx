import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import backgroundImage from '../assets/4.jpeg'; 
const ChangeOrderResponsePage = () => {
  const location = useLocation();
  const [message, setMessage] = useState('Procesando su respuesta...');
  const [error, setError] = useState('');

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');
    const decision = queryParams.get('decision');
    const coId = queryParams.get('coId');

    let isMounted = true;

    const processResponse = async () => {
      if (token && decision && coId) {
        const apiUrlFromEnv = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const backendApiUrl = `${apiUrlFromEnv}/change-orders/respond`;

        try {
          const response = await axios.get(backendApiUrl, { params: { token, decision, coId } });
          if (isMounted) {
            if (response.data && response.data.success) {
              setMessage(response.data.message || '¡Operación exitosa!');
              setError('');
            } else {
              setError(response.data.message || 'Ocurrió un error inesperado.');
              setMessage('');
            }
          }
        } catch (err) {
          if (isMounted) {
            let errorMessage = 'Ocurrió un error al procesar su solicitud.';
            if (err.response) {
              if (err.response.status === 409) {
                errorMessage = err.response.data.message || 'Esta orden de cambio ya ha sido procesada.';
              } else if (err.response.status === 403) {
                errorMessage = err.response.data.message || 'El enlace es inválido o ha expirado.';
              } else if (err.response.status === 404) {
                errorMessage = err.response.data.message || 'La orden de cambio no fue encontrada.';
              } else if (err.response.data && err.response.data.message) {
                errorMessage = err.response.data.message;
              }
            } else if (err.message) {
              errorMessage = err.message;
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
      isMounted = false;
    };
  }, [location]);

  

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          animation: 'fadeIn 1.2s',
        }}
      >
        <style>
          {`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(30px);}
              to { opacity: 1; transform: translateY(0);}
            }
            .main-message {
              font-size: 2.3rem;
              font-weight: bold;
              letter-spacing: 1px;
              margin-bottom: 1.5rem;
              color: #fff;
              text-shadow: 0 2px 16px #000, 0 1px 0 #333;
            }
            .error-message {
              color: #fff;
              text-shadow: 0 2px 16px #000, 0 1px 0 #333;
            }
            .success-message {
              color: #4ade80;
              text-shadow: 0 2px 16px #000, 0 1px 0 #333;
            }
            .back-btn {
              margin-top: 2rem;
              padding: 0.7rem 2.2rem;
              font-size: 1.1rem;
              border-radius: 999px;
              border: none;
              background: linear-gradient(90deg, #2563eb 0%, #38bdf8 100%);
              color: #fff;
              font-weight: 600;
              box-shadow: 0 2px 12px rgba(0,0,0,0.15);
              cursor: pointer;
              transition: background 0.2s, transform 0.2s;
            }
            .back-btn:hover {
              background: linear-gradient(90deg, #1e40af 0%, #0ea5e9 100%);
              transform: translateY(-2px) scale(1.04);
            }
          `}
        </style>
        {message && (
          <h1 className="main-message success-message">{message}</h1>
        )}
        {error && (
          <h1 className="main-message error-message">{error}</h1>
        )}
        {!message && !error && (
          <p style={{ color: '#fff', fontSize: '1.3rem', marginTop: '2rem' }}>
            Procesando su respuesta...
          </p>
        )}
        {(message || error) && (
          <a href="/" className="back-btn">
            Volver al inicio
          </a>
        )}
      </div>
    </div>
  );
};

export default ChangeOrderResponsePage;