import React, { useState, useEffect, useRef } from 'react';
import { FaUpload, FaTrash, FaImage, FaVideo, FaTimes, FaSpinner, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3500';

const GalleryManager = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [notification, setNotification] = useState(null);
  const [filter, setFilter] = useState('all'); // all, image, video
  const fileInputRef = useRef(null);

  // Cargar media existente
  const fetchMedia = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/gallery/work_gallery/all`);
      if (response.data.success) {
        setMedia(response.data.resources);
      }
    } catch (error) {
      console.error('Error cargando galería:', error);
      showNotification('Error cargando la galería', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  // Mostrar notificación
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Manejar selección de archivos
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setSelectedFiles(files);

    // Generar previsualizaciones
    const previews = files.map(file => {
      const isVideo = file.type.startsWith('video/');
      return {
        file,
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2), // MB
        type: isVideo ? 'video' : 'image',
        preview: URL.createObjectURL(file)
      };
    });
    setPreviewFiles(previews);
  };

  // Drag and Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (validFiles.length === 0) {
      showNotification('Solo se permiten imágenes y videos', 'error');
      return;
    }

    // Simular evento de input
    const dataTransfer = new DataTransfer();
    validFiles.forEach(file => dataTransfer.items.add(file));
    if (fileInputRef.current) {
      fileInputRef.current.files = dataTransfer.files;
      handleFileSelect({ target: { files: dataTransfer.files } });
    }
  };

  // Subir archivos
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      showNotification('Selecciona archivos primero', 'error');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('folder', 'work_gallery');

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/gallery/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress({ percent: percentCompleted });
          }
        }
      );

      if (response.data.success) {
        const hasVideos = selectedFiles.some(file => file.type.startsWith('video/'));
        const message = hasVideos 
          ? `${response.data.uploaded.length} archivos subidos. Los videos grandes se están procesando en segundo plano.`
          : `${response.data.uploaded.length} archivos subidos correctamente`;
        
        showNotification(message, 'success');
        
        // Limpiar selección
        setSelectedFiles([]);
        setPreviewFiles([]);
        setUploadProgress({});
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        // Recargar galería
        await fetchMedia();
      }
    } catch (error) {
      console.error('Error subiendo archivos:', error);
      showNotification(
        error.response?.data?.message || 'Error al subir archivos',
        'error'
      );
    } finally {
      setUploading(false);
    }
  };

  // Eliminar archivo
  const handleDelete = async (publicId, resourceType) => {
    if (!window.confirm('¿Estás seguro de eliminar este archivo?')) return;

    try {
      const token = localStorage.getItem('token');
      // El public_id puede contener "/" entonces lo codificamos
      const encodedPublicId = encodeURIComponent(publicId);
      
      const response = await axios.delete(
        `${API_URL}/gallery/${encodedPublicId}?resource_type=${resourceType}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        showNotification('Archivo eliminado correctamente', 'success');
        await fetchMedia();
      }
    } catch (error) {
      console.error('Error eliminando archivo:', error);
      showNotification('Error al eliminar archivo', 'error');
    }
  };

  // Cancelar selección
  const handleCancelSelection = () => {
    setSelectedFiles([]);
    setPreviewFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filtrar media
  const filteredMedia = filter === 'all' 
    ? media 
    : media.filter(item => item.type === filter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Gallery Manager</h1>
          <p className="text-slate-300">Administra las imágenes y videos de la galería pública</p>
        </div>

        {/* Notificación */}
        {notification && (
          <div className={`mb-6 p-4 rounded-lg border ${
            notification.type === 'success' 
              ? 'bg-green-500/20 border-green-500 text-green-400'
              : 'bg-red-500/20 border-red-500 text-red-400'
          } flex items-center gap-3 animate-fade-in-up`}>
            {notification.type === 'success' ? <FaCheck /> : <FaExclamationTriangle />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <FaUpload className="text-blue-400" />
            Subir Archivos
          </h2>

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-lg p-12 text-center cursor-pointer transition-all duration-300 hover:bg-slate-700/30"
          >
            <FaUpload className="text-5xl text-slate-400 mx-auto mb-4" />
            <p className="text-xl text-slate-300 mb-2">
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-sm text-slate-500">
              Formatos: JPG, PNG, GIF, WebP, MP4, MOV, AVI, WebM (máx. 200MB por archivo)
            </p>
            <p className="text-xs text-slate-600 mt-2">
              📹 Los videos grandes se procesarán en segundo plano
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Preview Files */}
          {previewFiles.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Archivos seleccionados ({previewFiles.length})
                </h3>
                <button
                  onClick={handleCancelSelection}
                  className="text-red-400 hover:text-red-300 flex items-center gap-2"
                >
                  <FaTimes /> Cancelar
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {previewFiles.map((file, index) => (
                  <div key={index} className="relative bg-slate-700/50 rounded-lg overflow-hidden">
                    {file.type === 'image' ? (
                      <img src={file.preview} alt={file.name} className="w-full h-32 object-cover" />
                    ) : (
                      <video src={file.preview} className="w-full h-32 object-cover" />
                    )}
                    <div className="p-2">
                      <p className="text-xs text-slate-300 truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">{file.size} MB</p>
                    </div>
                    <div className="absolute top-2 right-2">
                      {file.type === 'video' ? (
                        <FaVideo className="text-white bg-purple-500 p-1 rounded" size={24} />
                      ) : (
                        <FaImage className="text-white bg-blue-500 p-1 rounded" size={24} />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Subiendo... {uploadProgress.percent}%
                  </>
                ) : (
                  <>
                    <FaUpload />
                    Subir {previewFiles.length} archivo{previewFiles.length > 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Gallery Section */}
        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              Galería Actual ({filteredMedia.length})
            </h2>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter('image')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  filter === 'image'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <FaImage /> Imágenes
              </button>
              <button
                onClick={() => setFilter('video')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  filter === 'video'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <FaVideo /> Videos
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <FaSpinner className="animate-spin text-4xl text-blue-400" />
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredMedia.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg">No hay archivos en la galería</p>
            </div>
          )}

          {/* Media Grid */}
          {!loading && filteredMedia.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMedia.map((item) => (
                <div
                  key={item.public_id}
                  className="relative group bg-slate-700/50 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
                >
                  {/* Media Preview */}
                  {item.type === 'image' ? (
                    <img
                      src={item.thumbnail}
                      alt={item.public_id}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="relative">
                      <video
                        src={item.url}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <FaVideo className="text-white text-4xl" />
                      </div>
                    </div>
                  )}

                  {/* Overlay Controls */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
                    >
                      Ver
                    </a>
                    <button
                      onClick={() => handleDelete(item.public_id, item.type)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
                    >
                      <FaTrash /> Eliminar
                    </button>
                  </div>

                  {/* Type Badge */}
                  <div className="absolute top-2 right-2">
                    {item.type === 'video' ? (
                      <FaVideo className="text-white bg-purple-500 p-2 rounded shadow-lg" size={28} />
                    ) : (
                      <FaImage className="text-white bg-blue-500 p-2 rounded shadow-lg" size={28} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 bg-slate-800/80">
                    <p className="text-xs text-slate-400 truncate">{item.public_id}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GalleryManager;
