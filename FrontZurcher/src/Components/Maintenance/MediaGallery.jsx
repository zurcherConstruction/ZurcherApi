import React, { useState } from 'react';

const MediaGallery = ({ mediaFiles = [], onDelete, isDeleting }) => {
  const [selectedMedia, setSelectedMedia] = useState(null);

  const isPDF = (media) => {
    return media.originalName?.toLowerCase().includes('.pdf') || 
           media.mediaUrl?.toLowerCase().includes('.pdf') || 
           media.mimeType === 'application/pdf';
  };

  const getCloudinaryPDFUrl = (url) => {
    // Si es una URL de Cloudinary con raw/upload, intentar convertir para mejor visualización
    if (url.includes('cloudinary.com') && url.includes('raw/upload')) {
      // Intentar convertir a una URL que Google Docs pueda manejar mejor
      return url.replace('/raw/upload/', '/image/upload/fl_attachment/');
    }
    return url;
  };

  const getMediaIcon = (mediaType) => {
    switch (mediaType) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎥';
      case 'document':
        return '📄';
      default:
        return '📎';
    }
  };

  const getMediaTypeColor = (mediaType) => {
    switch (mediaType) {
      case 'image':
        return 'bg-green-100 text-green-800';
      case 'video':
        return 'bg-blue-100 text-blue-800';
      case 'document':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleMediaClick = (media) => {
    console.log('📋 MediaGallery - Clic en media:', {
      originalName: media.originalName,
      mediaType: media.mediaType,
      mediaUrl: media.mediaUrl,
      isPDF: isPDF(media)
    });
    
    // Prevenir la descarga automática de PDFs
    if (isPDF(media)) {
      console.log('📋 Es un PDF, abriendo modal de vista previa');
    }
    
    setSelectedMedia(media);
  };

  const closeModal = () => {
    setSelectedMedia(null);
  };

  if (!mediaFiles || mediaFiles.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <div className="text-gray-400 mb-2">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-gray-600 text-sm">
          No hay archivos adjuntos a esta visita
        </p>
        <p className="text-gray-500 text-xs mt-1">
          Usa el botón "Subir archivos" para añadir fotos, videos o documentos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">
        Archivos adjuntos ({mediaFiles.length})
      </h4>

      {/* Grid de archivos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mediaFiles.map((media) => (
          <div
            key={media.id}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Preview */}
            <div 
              className="aspect-w-16 aspect-h-9 bg-gray-100 cursor-pointer relative"
              onClick={(e) => {
                e.preventDefault();
                handleMediaClick(media);
              }}
            >
              {media.mediaType === 'image' ? (
                <img
                  src={media.mediaUrl}
                  alt={media.originalName || 'Imagen'}
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div className="w-full h-32 flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <div className="text-4xl mb-2">
                      {media.mediaType === 'video' ? '🎥' : 
                       isPDF(media) ? '📋' : 
                       '📄'}
                    </div>
                    <p className="text-xs text-gray-600 font-medium">
                      {media.mediaType === 'video' ? 'Video' : 
                       isPDF(media) ? 'PDF' : 
                       'Documento'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Overlay para videos y documentos */}
              {media.mediaType !== 'image' && (
                <div 
                  className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                  title={`Hacer clic para ${isPDF(media) ? 'previsualizar PDF' : 
                    media.mediaType === 'video' ? 'reproducir video' : 'abrir documento'}`}
                >
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {media.mediaType === 'video' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M9 16h.01M12 3v9m0 0l-3-3m3 3l3-3" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    )}
                  </svg>
                </div>
              )}
            </div>

            {/* Información del archivo */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMediaTypeColor(media.mediaType)}`}>
                  {media.mediaType}
                </span>
                
                <button
                  onClick={() => onDelete(media.id)}
                  disabled={isDeleting}
                  className="text-red-500 hover:text-red-700 p-1 transition-colors disabled:opacity-50"
                  title="Eliminar archivo"
                >
                  {isDeleting ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>

              <p className="text-sm text-gray-900 font-medium truncate" title={media.originalName}>
                {media.originalName || 'Sin nombre'}
              </p>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {new Date(media.createdAt).toLocaleDateString()}
                </span>
                
                {media.mediaType !== 'image' && (
                  <div className="flex space-x-2">
                    {isPDF(media) ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMediaClick(media);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center space-x-1"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Vista previa</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(media.mediaUrl, '_blank');
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center space-x-1"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span>Abrir</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal para vista completa de media */}
      {selectedMedia && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div 
            className="relative max-w-6xl max-h-[95vh] bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors z-10"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Contenido según el tipo de media */}
            {selectedMedia.mediaType === 'image' && (
              <img
                src={selectedMedia.mediaUrl}
                alt={selectedMedia.originalName || 'Imagen'}
                className="max-w-full max-h-[90vh] object-contain"
              />
            )}
            
            {selectedMedia.mediaType === 'video' && (
              <video
                src={selectedMedia.mediaUrl}
                controls
                className="max-w-full max-h-[90vh]"
              >
                Tu navegador no soporta la reproducción de video.
              </video>
            )}
            
            {selectedMedia.mediaType === 'document' && (
              <div className="w-full h-[90vh] p-4">
                {isPDF(selectedMedia) ? (
                  <div className="w-full h-full">
                    {/* Intentar múltiples métodos de visualización para PDFs */}
                    <iframe
                      key={`pdf-viewer-${selectedMedia.id}`}
                      src={`https://docs.google.com/gview?url=${encodeURIComponent(selectedMedia.mediaUrl)}&embedded=true`}
                      title={selectedMedia.originalName || "Vista previa PDF"}
                      width="100%"
                      height="100%"
                      className="rounded-lg border"
                      allow="autoplay"
                      onError={(e) => {
                        console.warn('Error cargando PDF en Google Docs Viewer:', e);
                      }}
                    >
                      {/* Fallback si Google Docs Viewer no funciona */}
                      <div className="flex items-center justify-center h-full bg-gray-50">
                        <div className="text-center p-8">
                          <div className="text-6xl mb-4">📋</div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {selectedMedia.originalName}
                          </h3>
                          <p className="text-gray-600">
                            No se pudo cargar la vista previa del PDF
                          </p>
                        </div>
                      </div>
                    </iframe>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📄</div>
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        {selectedMedia.originalName}
                      </p>
                      <p className="text-gray-600 mb-4">
                        Archivo no previsualizable
                      </p>
                      <a
                        href={selectedMedia.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Abrir en nueva pestaña
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{selectedMedia.originalName}</p>
                  <p className="text-xs opacity-75">
                    {new Date(selectedMedia.createdAt).toLocaleString()} • {selectedMedia.mediaType} {isPDF(selectedMedia) ? '• PDF' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
