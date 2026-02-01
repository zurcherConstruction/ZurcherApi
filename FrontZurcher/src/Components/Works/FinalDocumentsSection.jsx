import React, { useState } from 'react';
import api from '../../utils/axios';

const FinalDocumentsSection = ({
  work,
  idWork,
  isOpen,
  toggleSection,
  formatDateSafe,
  isViewOnly,
  operatingPermitFile,
  setOperatingPermitFile,
  uploadingOperatingPermit,
  setUploadingOperatingPermit,
  maintenanceServiceFile,
  setMaintenanceServiceFile,
  uploadingMaintenanceService,
  setUploadingMaintenanceService,
  onDocumentUploaded
}) => {

  // 🆕 Estados para modal de PPI
  const [showPPIModal, setShowPPIModal] = useState(false);
  const [ppiUrl, setPpiUrl] = useState('');
  const [loadingPPI, setLoadingPPI] = useState(false);

  // 🆕 Handler para ver PPI firmado en modal
  const handleViewPPISigned = async () => {
    if (!work?.Permit?.idPermit) return;
    
    setLoadingPPI(true);
    try {
      const response = await api.get(`/permit/${work.Permit.idPermit}/ppi/signed/view`, {
        responseType: 'blob'
      });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      setPpiUrl(url);
      setShowPPIModal(true);
    } catch (error) {
      console.error('Error al ver PPI firmado:', error);
      alert('No se pudo cargar el PPI firmado.');
    } finally {
      setLoadingPPI(false);
    }
  };

  const handleUploadOperatingPermit = async () => {
    setUploadingOperatingPermit(true);
    try {
      const formData = new FormData();
      formData.append('document', operatingPermitFile);
      
      const response = await api.post(
        `/work/${idWork}/operating-permit`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      if (response.data.success) {
        alert('✅ Permiso de Operación subido exitosamente');
        setOperatingPermitFile(null);
        // Resetear el input file
        const inputElement = document.getElementById('operating-permit-file');
        if (inputElement) inputElement.value = '';
        if (onDocumentUploaded) onDocumentUploaded();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al subir documento: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploadingOperatingPermit(false);
    }
  };

  const handleUploadMaintenanceService = async () => {
    setUploadingMaintenanceService(true);
    try {
      const formData = new FormData();
      formData.append('document', maintenanceServiceFile);
      
      const response = await api.post(
        `/work/${idWork}/maintenance-service`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      if (response.data.success) {
        alert('✅ Servicio de Mantenimiento subido exitosamente');
        setMaintenanceServiceFile(null);
        // Resetear el input file
        const inputElement = document.getElementById('maintenance-service-file');
        if (inputElement) inputElement.value = '';
        if (onDocumentUploaded) onDocumentUploaded();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al subir documento: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploadingMaintenanceService(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 md:p-6 border-l-4 border-green-500">
      <h2
        className="text-lg md:text-xl font-semibold mb-4 cursor-pointer flex items-center justify-between"
        onClick={() => toggleSection("finalDocuments")}
      >
        <span className="flex items-center">
          📄 Documentos
        </span>
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </h2>
      
      {isOpen && (
        <div className="space-y-4">
          {/* Permiso de Operación */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-2xl">🏛️</span>
              Permiso de Operación
            </h3>
            
            {work?.operatingPermitUrl ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Subido el: {formatDateSafe(work.operatingPermitSentAt)}</span>
                </div>
                
                <a
                  href={work.operatingPermitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Ver Documento
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">No se ha subido el Permiso de Operación</p>
                
                {!isViewOnly && (
                  <div className="flex flex-col gap-2">
                    <input
                      id="operating-permit-file"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        setOperatingPermitFile(e.target.files[0]);
                        // Asegurar que no afecte al otro input
                        setMaintenanceServiceFile(null);
                      }}
                      className="text-sm"
                      key={work?.operatingPermitUrl ? 'uploaded' : 'not-uploaded'}
                    />
                    
                    {operatingPermitFile && (
                      <button
                        onClick={handleUploadOperatingPermit}
                        disabled={uploadingOperatingPermit}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {uploadingOperatingPermit ? 'Subiendo...' : '📤 Subir al Sistema'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Servicio de Mantenimiento */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-2xl">🔧</span>
              Servicio de Mantenimiento
            </h3>
            
            {work?.maintenanceServiceUrl ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Subido el: {formatDateSafe(work.maintenanceServiceSentAt)}</span>
                </div>
                
                <a
                  href={work.maintenanceServiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Ver Documento
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">No se ha subido el Servicio de Mantenimiento</p>
                
                {!isViewOnly && (
                  <div className="flex flex-col gap-2">
                    <input
                      id="maintenance-service-file"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        setMaintenanceServiceFile(e.target.files[0]);
                        // Asegurar que no afecte al otro input
                        setOperatingPermitFile(null);
                      }}
                      className="text-sm"
                      key={work?.maintenanceServiceUrl ? 'uploaded' : 'not-uploaded'}
                    />
                    
                    {maintenanceServiceFile && (
                      <button
                        onClick={handleUploadMaintenanceService}
                        disabled={uploadingMaintenanceService}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {uploadingMaintenanceService ? 'Subiendo...' : '📤 Subir al Sistema'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 🆕 PPI Firmado */}
          {work?.Permit?.ppiSignedPdfUrl && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-2xl">📋</span>
                PPI Firmado
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium text-green-700">
                    {work.Permit.ppiSignatureStatus === 'signed' ? 'Firmado' : 'Subido'} el: {formatDateSafe(work.Permit.ppiSignedAt)}
                  </span>
                </div>
                
                <button
                  onClick={handleViewPPISigned}
                  disabled={loadingPPI}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {loadingPPI ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Cargando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Ver PPI Firmado
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 🆕 Modal para ver PPI firmado */}
      {showPPIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-semibold text-gray-800">PPI Firmado</h3>
              <button
                onClick={() => {
                  setShowPPIModal(false);
                  if (ppiUrl) {
                    window.URL.revokeObjectURL(ppiUrl);
                    setPpiUrl('');
                  }
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {ppiUrl && (
                <iframe
                  src={ppiUrl}
                  className="w-full h-full"
                  title="PPI Firmado"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinalDocumentsSection;
