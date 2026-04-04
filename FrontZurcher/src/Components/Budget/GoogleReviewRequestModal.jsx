import React, { useState, useEffect } from 'react';

/**
 * Modal profesional para solicitar Review de Google al cliente
 * Colores de la empresa: #445868 (customBlue), #0f766e (customGreen), #f6d02c (dash)
 */
const GoogleReviewRequestModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  primaryEmail, 
  notificationEmails = [], 
  clientName 
}) => {
  const [includeReview, setIncludeReview] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [sendToPrimary, setSendToPrimary] = useState(true);
  const [sendToNotifications, setSendToNotifications] = useState(true);

  // Reset al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setSendToPrimary(true);
      setSendToNotifications(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    
    // Construir lista de emails seleccionados
    const selectedEmails = [];
    if (sendToPrimary && primaryEmail) {
      selectedEmails.push(primaryEmail);
    }
    if (sendToNotifications && notificationEmails.length > 0) {
      selectedEmails.push(...notificationEmails);
    }
    
    await onConfirm(includeReview, selectedEmails);
    setIsLoading(false);
  };

  const displayEmail = primaryEmail || 'No disponible';
  const displayName = clientName || 'Cliente';
  const hasMultipleEmails = notificationEmails.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-[95vw] sm:max-w-md md:max-w-lg transform transition-all max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con color de la empresa */}
        <div className="bg-gradient-to-r from-[#445868] to-[#0f766e] text-white px-4 sm:px-5 py-3 rounded-t-lg sticky top-0 z-10">
          <h3 className="text-base sm:text-lg font-bold flex items-center">
            <svg 
              className="w-5 h-5 mr-2 flex-shrink-0" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
              />
            </svg>
            <span className="truncate">Send Final Invoice</span>
          </h3>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5">
          {/* Información del cliente */}
          <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs sm:text-sm text-gray-600 break-words">
              <span className="font-semibold text-gray-700">Client:</span> {displayName}
            </p>
          </div>

          {/* Selección de destinatarios */}
          <div className="mb-4 p-3 bg-white rounded-lg border-2 border-[#445868]/30">
            <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2 text-[#0f766e] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
              Send invoice to:
            </p>
            
            {/* Email principal */}
            <label className="flex items-start cursor-pointer group mb-2">
              <div className="flex items-center h-5 mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={sendToPrimary}
                  onChange={(e) => setSendToPrimary(e.target.checked)}
                  className="w-4 h-4 text-[#0f766e] border-gray-300 rounded focus:ring-[#0f766e] focus:ring-2 cursor-pointer"
                />
              </div>
              <div className="ml-2 sm:ml-3 min-w-0 flex-1">
                <span className="text-xs sm:text-sm font-medium text-gray-800 group-hover:text-[#0f766e] transition-colors">
                  📧 Primary Email
                </span>
                <p className="text-xs text-gray-600 mt-0.5 break-all">
                  {displayEmail}
                </p>
              </div>
            </label>

            {/* Emails informativos si existen */}
            {hasMultipleEmails && (
              <label className="flex items-start cursor-pointer group">
                <div className="flex items-center h-5 mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={sendToNotifications}
                    onChange={(e) => setSendToNotifications(e.target.checked)}
                    className="w-4 h-4 text-[#0f766e] border-gray-300 rounded focus:ring-[#0f766e] focus:ring-2 cursor-pointer"
                  />
                </div>
                <div className="ml-2 sm:ml-3 min-w-0 flex-1">
                  <span className="text-xs sm:text-sm font-medium text-gray-800 group-hover:text-[#0f766e] transition-colors">
                    📬 Additional Emails ({notificationEmails.length})
                  </span>
                  <div className="text-xs text-gray-600 mt-0.5 space-y-0.5">
                    {notificationEmails.map((email, idx) => (
                      <p key={idx} className="break-all">• {email}</p>
                    ))}
                  </div>
                </div>
              </label>
            )}
          </div>

          {/* Opción de Review */}
          <div className="mb-3 sm:mb-4 p-3 bg-gradient-to-br from-[#f6d02c]/10 to-[#0f766e]/10 rounded-lg border-2 border-[#0f766e]/20">
            <label className="flex items-start cursor-pointer group">
              <div className="flex items-center h-6 mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={includeReview}
                  onChange={(e) => setIncludeReview(e.target.checked)}
                  className="w-4 h-4 text-[#0f766e] border-gray-300 rounded focus:ring-[#0f766e] focus:ring-2 cursor-pointer"
                />
              </div>
              <div className="ml-2 sm:ml-3 min-w-0 flex-1">
                <span className="text-sm font-semibold text-gray-800 group-hover:text-[#0f766e] transition-colors">
                  ⭐ Request Google Review
                </span>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 leading-relaxed">
                  Include an invitation in the email asking the client to leave a review on Google about our service
                </p>
              </div>
            </label>
          </div>

          {/* Preview del mensaje cuando está seleccionado */}
          {includeReview && (
            <div className="mb-3 p-3 sm:p-4 bg-gradient-to-br from-[#1a3a5c] to-[#2563a8] rounded-lg border-2 border-[#f6d02c] text-center">
              <div className="text-3xl mb-2 tracking-wider">⭐⭐⭐⭐⭐</div>
              <p className="text-sm sm:text-base text-[#f6d02c] font-bold mb-3 drop-shadow-lg">
                WE VALUE YOUR FEEDBACK
              </p>
              <p className="text-xs sm:text-sm text-gray-50 leading-relaxed mb-2 drop-shadow-md">
                If we made your project <strong className="text-[#fde047] font-extrabold">simple and stress-free</strong>, we'd love to hear from you.
              </p>
              <p className="text-xs text-gray-50 leading-relaxed mb-3 drop-shadow-md">
                Your review helps other homeowners choose a reliable septic company—and helps us keep improving every day.
              </p>
              <p className="text-xs sm:text-sm text-[#fde047] font-bold mb-3 drop-shadow-lg">
                👉 Share your experience in 30 seconds
              </p>
              <div className="inline-block bg-[#f6d02c] text-black px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold border-2 border-black shadow-md">
                <span style={{textShadow: '0 0 8px rgba(26,58,92,0.9), 0 2px 4px rgba(26,58,92,1)'}}>⭐</span> Leave Your Review
              </div>
              <p className="text-xs sm:text-sm text-gray-50 font-semibold mt-3 drop-shadow-md">
                Thank you for trusting Zurcher Septic!
              </p>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="w-full sm:flex-1 px-4 py-2 bg-gradient-to-r from-[#0f766e] to-[#059669] hover:from-[#0d6962] hover:to-[#047857] text-white font-bold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <svg 
                    className="w-4 h-4 mr-2 flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
                    />
                  </svg>
                  <span className="truncate">Send Invoice</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleReviewRequestModal;
