import React, { useState, useRef } from 'react';

const MediaUpload = ({ onUpload, isUploading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const inputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = [...e.dataTransfer.files];
    handleFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = [...e.target.files];
    handleFiles(files);
  };

  const handleFiles = (files) => {
    console.log('=== MediaUpload handleFiles ===');
    console.log('MediaUpload - Raw files received:', files);
    console.log('MediaUpload - Files array:', Array.from(files));
    
    // Filtrar archivos válidos
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || 
                         file.type.startsWith('video/') || 
                         file.type === 'application/pdf' ||
                         file.type.startsWith('application/');
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB
      
      console.log(`MediaUpload - File: ${file.name}, Type: ${file.type}, Size: ${file.size}, Valid: ${isValidType && isValidSize}`);
      return isValidType && isValidSize;
    });

    console.log('MediaUpload - Valid files:', validFiles);
    setSelectedFiles(validFiles);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    console.log('=== MediaUpload handleUpload ===');
    console.log('MediaUpload - selectedFiles:', selectedFiles);
    console.log('MediaUpload - selectedFiles.length:', selectedFiles.length);
    console.log('MediaUpload - onUpload function:', onUpload);
    
    if (selectedFiles.length > 0) {
      console.log('MediaUpload - Calling onUpload with files:', selectedFiles);
      onUpload(selectedFiles);
      setSelectedFiles([]);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } else {
      console.log('MediaUpload - No files selected');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) {
      return '🖼️';
    } else if (file.type.startsWith('video/')) {
      return '🎥';
    } else if (file.type === 'application/pdf') {
      return '📄';
    } else {
      return '📎';
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="text-gray-400">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Acepta imágenes, videos, PDFs y documentos hasta 50MB
            </p>
            
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Seleccionar archivos
            </button>
          </div>
        </div>
      </div>

      {/* File Input (hidden) */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">
            Archivos seleccionados ({selectedFiles.length})
          </h4>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className="text-lg">{getFileIcon(file)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Botón para subir archivo individual */}
                  <button
                    type="button"
                    onClick={() => {
                      console.log('=== MediaUpload - Botón individual CLICKED ===');
                      console.log('MediaUpload - Subiendo archivo individual:', file);
                      onUpload([file]);
                      setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                    }}
                    disabled={isUploading}
                    className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    Subir
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Upload Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || selectedFiles.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Subiendo...</span>
                </div>
              ) : (
                `Subir ${selectedFiles.length} archivo(s)`
              )}
            </button>
          </div>
        </div>
      )}

      {/* Upload Instructions */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Formatos soportados: JPG, PNG, GIF, MP4, MOV, PDF, DOC, DOCX</p>
        <p>• Tamaño máximo por archivo: 50MB</p>
        <p>• Puedes subir archivos individualmente o todos juntos</p>
        <p>• Usa el botón "Subir" en cada archivo para subirlos por separado</p>
      </div>
    </div>
  );
};

export default MediaUpload;
