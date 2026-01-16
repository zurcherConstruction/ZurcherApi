import React, { useState } from 'react';
import { FaTimes, FaDownload, FaExternalLinkAlt } from 'react-icons/fa';

const SimpleWorkPdfModal = ({ isOpen, onClose, pdfUrl, title }) => {
  const [pdfError, setPdfError] = useState(false);

  if (!isOpen || !pdfUrl) {
    return null;
  }

  // Detect device type
  const screenWidth = window.innerWidth;
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const isLarge = screenWidth >= 1024;
  
  const isIPhone = /iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isSmallIOS = isIPhone || (isMobile && /iPad|iPhone|iPod/.test(navigator.userAgent));

  const handlePdfError = () => {
    console.error('Error loading PDF in iframe');
    setPdfError(true);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `simple-work-${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999]"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isSmallIOS ? '4px' : (isMobile ? '8px' : '16px'),
        overflow: 'hidden',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={{
          width: isSmallIOS ? '98vw' : (isLarge ? '90vw' : isTablet ? '85vw' : '95vw'),
          height: isSmallIOS ? '98vh' : (isLarge ? '90vh' : isTablet ? '88vh' : '96vh'),
          maxWidth: isLarge ? '1400px' : 'none',
          maxHeight: 'none',
          margin: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-3 sm:p-4 md:p-5 lg:p-6 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-gray-800 truncate pr-2 max-w-[70%]">
            {title || "Vista Previa - Trabajo Simple"}
          </h3>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Download button */}
            <button
              onClick={handleDownload}
              className="text-blue-600 hover:text-blue-800 p-1.5 sm:p-2 rounded-full transition-colors"
              title="Descargar PDF"
            >
              <FaDownload size={isMobile ? 14 : 16} />
            </button>
            
            {/* New tab link for mobile/tablet */}
            {(isMobile || isTablet || isSmallIOS) && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm md:text-base underline whitespace-nowrap font-medium flex items-center gap-1"
                title="Abrir en nueva pestaña"
              >
                <FaExternalLinkAlt size={12} />
                Nueva pestaña
              </a>
            )}
            
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 p-1.5 sm:p-2 rounded-full transition-colors"
              title="Cerrar"
            >
              <FaTimes size={isMobile ? 16 : 20} />
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden">
          {pdfError ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="text-red-500 mb-4">
                <FaTimes size={48} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Error al cargar el PDF
              </h3>
              <p className="text-gray-600 mb-4">
                No se pudo mostrar el PDF en el navegador. Puedes intentar:
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleDownload}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <FaDownload />
                  Descargar PDF
                </button>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2 no-underline"
                >
                  <FaExternalLinkAlt />
                  Abrir en nueva pestaña
                </a>
              </div>
            </div>
          ) : (
            <iframe
              src={pdfUrl}
              width="100%"
              height="100%"
              style={{
                border: 'none',
                borderRadius: '0 0 8px 8px'
              }}
              title={title || "Vista Previa - Trabajo Simple"}
              onError={handlePdfError}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleWorkPdfModal;