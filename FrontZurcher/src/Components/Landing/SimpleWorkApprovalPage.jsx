import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import backgroundImage from '../../assets/landing/4.jpeg';

const SimpleWorkApprovalPage = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading, success, already, error
  const [message, setMessage] = useState('Processing your approval...');
  const [workData, setWorkData] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const processApproval = async () => {
      if (!token) {
        if (isMounted) {
          setStatus('error');
          setMessage('Invalid approval link. Token is missing.');
        }
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'https://zurcherapi.up.railway.app';

      try {
        const response = await axios.post(
          `${apiUrl}/simple-works/approve/${token}`,
          {},
          { timeout: 30000 }
        );

        if (isMounted) {
          if (response.data?.alreadyApproved) {
            setStatus('already');
            setMessage('This quote has already been approved.');
            setWorkData(response.data.data);
          } else if (response.data?.success) {
            setStatus('success');
            setMessage('Quote approved successfully!');
            setWorkData(response.data.data);
          }
        }
      } catch (err) {
        if (isMounted) {
          const errorMsg = err.response?.data?.message || 'An error occurred while processing your approval.';
          setStatus('error');
          setMessage(errorMsg);
        }
      }
    };

    processApproval();

    return () => { isMounted = false; };
  }, [token]);

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
          padding: '20px',
          animation: 'fadeIn 1.2s',
        }}
      >
        <style>
          {`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(30px);}
              to { opacity: 1; transform: translateY(0);}
            }
          `}
        </style>

        {/* Company name */}
        <h2 style={{
          color: '#fff',
          fontSize: '1rem',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          marginBottom: '2rem',
          textShadow: '0 2px 12px #000',
          opacity: 0.8,
        }}>
          ZURCHER CONSTRUCTION
        </h2>

        {/* Loading spinner */}
        {status === 'loading' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '50px', height: '50px', border: '4px solid rgba(255,255,255,0.3)',
              borderTop: '4px solid #4ade80', borderRadius: '50%',
              animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: '#fff', fontSize: '1.3rem', textShadow: '0 2px 12px #000' }}>
              {message}
            </p>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <div style={{
              fontSize: '4rem', marginBottom: '1rem',
            }}>✅</div>
            <h1 style={{
              color: '#4ade80', fontSize: '2rem', fontWeight: 'bold',
              textShadow: '0 2px 16px #000', marginBottom: '1rem',
            }}>
              Quote Approved!
            </h1>
            {workData && (
              <div style={{
                background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
                borderRadius: '12px', padding: '20px', marginBottom: '1.5rem',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                {workData.workNumber && (
                  <p style={{ color: '#fff', margin: '5px 0', fontSize: '1rem' }}>
                    <strong>Quote #:</strong> {workData.workNumber}
                  </p>
                )}
                {workData.propertyAddress && (
                  <p style={{ color: '#fff', margin: '5px 0', fontSize: '1rem' }}>
                    <strong>Address:</strong> {workData.propertyAddress}
                  </p>
                )}
                {workData.clientName && (
                  <p style={{ color: '#fff', margin: '5px 0', fontSize: '1rem' }}>
                    <strong>Client:</strong> {workData.clientName}
                  </p>
                )}
              </div>
            )}
            <p style={{ color: '#ddd', fontSize: '1rem', textShadow: '0 1px 8px #000' }}>
              Thank you for your approval. Our team will begin scheduling your project shortly.
            </p>
          </div>
        )}

        {/* Already approved */}
        {status === 'already' && (
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>ℹ️</div>
            <h1 style={{
              color: '#60a5fa', fontSize: '2rem', fontWeight: 'bold',
              textShadow: '0 2px 16px #000', marginBottom: '1rem',
            }}>
              Already Approved
            </h1>
            <p style={{ color: '#ddd', fontSize: '1.1rem', textShadow: '0 1px 8px #000' }}>
              This quote was already approved previously. No further action is needed.
            </p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❌</div>
            <h1 style={{
              color: '#f87171', fontSize: '2rem', fontWeight: 'bold',
              textShadow: '0 2px 16px #000', marginBottom: '1rem',
            }}>
              Approval Error
            </h1>
            <p style={{ color: '#ddd', fontSize: '1.1rem', textShadow: '0 1px 8px #000' }}>
              {message}
            </p>
          </div>
        )}

        {/* Back button */}
        {status !== 'loading' && (
          <Link
            to="/"
            style={{
              marginTop: '2rem', padding: '0.7rem 2.2rem', fontSize: '1.1rem',
              borderRadius: '999px', border: 'none',
              background: 'linear-gradient(90deg, #2563eb 0%, #38bdf8 100%)',
              color: '#fff', fontWeight: 600, boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
              cursor: 'pointer', transition: 'background 0.2s, transform 0.2s',
              textDecoration: 'none', display: 'inline-block',
            }}
            onMouseEnter={e => { e.target.style.transform = 'translateY(-2px) scale(1.04)'; }}
            onMouseLeave={e => { e.target.style.transform = 'none'; }}
          >
            Go to Homepage
          </Link>
        )}
      </div>
    </div>
  );
};

export default SimpleWorkApprovalPage;
