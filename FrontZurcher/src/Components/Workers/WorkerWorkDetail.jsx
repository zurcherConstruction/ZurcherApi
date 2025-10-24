import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorkById, updateWork, addImagesToWork } from "../../Redux/Actions/workActions";
import {
  ArrowLeftIcon,
  PhotoIcon,
  CheckCircleIcon,
  PlayIcon,
  XMarkIcon,
  TrashIcon,
  CloudArrowUpIcon
} from "@heroicons/react/24/outline";
import { toast } from "react-toastify";

const WorkerWorkDetail = () => {
  const { workId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentWork, loading } = useSelector((state) => state.work);
  const { user, currentStaff } = useSelector((state) => state.auth);
  const authStaff = currentStaff || user;

  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [changingStatus, setChangingStatus] = useState(false);

  useEffect(() => {
    if (workId) {
      dispatch(fetchWorkById(workId));
    }
  }, [workId, dispatch]);

  // Obtener el ID del staff (puede ser 'id' o 'idStaff' dependiendo de la estructura)
  const staffId = authStaff?.idStaff || authStaff?.id;

  // Verificar que el trabajo pertenece al worker actual
  useEffect(() => {
    if (currentWork && currentWork.idWork && currentWork.staffId !== staffId) {
      toast.error('No tienes permiso para ver este trabajo');
      navigate('/worker');
    }
  }, [currentWork, staffId, navigate]);

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + selectedImages.length > 10) {
      toast.warning('Máximo 10 imágenes por vez');
      return;
    }

    setSelectedImages([...selectedImages, ...files]);

    // Crear previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(prev => [...prev, { file, preview: reader.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreview(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadImages = async () => {
    if (selectedImages.length === 0) {
      toast.warning('Selecciona al menos una imagen');
      return;
    }

    setUploadingImages(true);
    try {
      const formData = new FormData();
      selectedImages.forEach((image) => {
        formData.append('images', image);
      });

      await dispatch(addImagesToWork(workId, formData));
      toast.success('Imágenes subidas exitosamente');
      
      // Limpiar selección
      setSelectedImages([]);
      setImagePreview([]);
      
      // Recargar el trabajo
      dispatch(fetchWorkById(workId));
    } catch (error) {
      toast.error('Error al subir imágenes');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleStartWork = async () => {
    if (currentWork.status !== 'assigned') {
      toast.warning('Este trabajo ya fue iniciado');
      return;
    }

    setChangingStatus(true);
    try {
      await dispatch(updateWork(workId, { 
        status: 'inProgress',
        startDate: new Date().toISOString()
      }));
      toast.success('Trabajo iniciado');
      dispatch(fetchWorkById(workId));
    } catch (error) {
      toast.error('Error al iniciar trabajo');
    } finally {
      setChangingStatus(false);
    }
  };

  const handleCompleteWork = async () => {
    if (currentWork.status !== 'inProgress') {
      toast.warning('El trabajo debe estar en progreso');
      return;
    }

    // Verificar que tenga imágenes
    if (!currentWork.images || currentWork.images.length === 0) {
      toast.warning('Debes subir al menos una imagen antes de completar');
      return;
    }

    setChangingStatus(true);
    try {
      await dispatch(updateWork(workId, { 
        status: 'installed'
      }));
      toast.success('Trabajo marcado como instalado');
      dispatch(fetchWorkById(workId));
    } catch (error) {
      toast.error('Error al completar trabajo');
    } finally {
      setChangingStatus(false);
    }
  };

  const openImageModal = (imageUrl) => {
    setSelectedImageUrl(imageUrl);
    setShowImageModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!currentWork && !loading) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Trabajo no encontrado
        </div>
      </div>
    );
  }

  if (!currentWork) {
    return null; // Aún cargando
  }

  const canStart = currentWork.status === 'assigned';
  const canComplete = currentWork.status === 'inProgress';
  const isCompleted = ['installed', 'coverPending', 'covered', 'invoiceFinal', 'paymentReceived', 'maintenance'].includes(currentWork.status);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/worker')}
            className="flex items-center text-white hover:text-green-100 mb-3"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Volver
          </button>
          <h1 className="text-xl font-bold">{currentWork.propertyAddress || 'Trabajo'}</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Work Info Card */}
        <div className="bg-white rounded-lg shadow-md p-5">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Información del Trabajo</h2>
          
          {currentWork.budget && (
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold text-gray-600">Cliente:</span>
                <p className="text-gray-800">{currentWork.budget.applicantName || 'N/A'}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Dirección:</span>
                <p className="text-gray-800">{currentWork.budget.propertyAddress || 'N/A'}</p>
              </div>
              {currentWork.budget.applicantEmail && (
                <div>
                  <span className="font-semibold text-gray-600">Email:</span>
                  <p className="text-gray-800">{currentWork.budget.applicantEmail}</p>
                </div>
              )}
              {currentWork.budget.applicantPhone && (
                <div>
                  <span className="font-semibold text-gray-600">Teléfono:</span>
                  <p className="text-gray-800">{currentWork.budget.applicantPhone}</p>
                </div>
              )}
            </div>
          )}

          {currentWork.startDate && (
            <div className="mt-4 pt-4 border-t">
              <span className="font-semibold text-gray-600">Fecha de inicio:</span>
              <p className="text-gray-800">
                {new Date(currentWork.startDate).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!isCompleted && (
          <div className="bg-white rounded-lg shadow-md p-5">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Acciones</h2>
            <div className="space-y-3">
              {canStart && (
                <button
                  onClick={handleStartWork}
                  disabled={changingStatus}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <PlayIcon className="h-5 w-5 mr-2" />
                  {changingStatus ? 'Iniciando...' : 'Iniciar Trabajo'}
                </button>
              )}
              
              {canComplete && (
                <button
                  onClick={handleCompleteWork}
                  disabled={changingStatus || !currentWork.images || currentWork.images.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  {changingStatus ? 'Completando...' : 'Marcar como Instalado'}
                </button>
              )}
            </div>
            {canComplete && (!currentWork.images || currentWork.images.length === 0) && (
              <p className="text-xs text-orange-600 mt-2 text-center">
                * Debes subir al menos una imagen antes de completar
              </p>
            )}
          </div>
        )}

        {/* Upload Images Section */}
        {!isCompleted && (
          <div className="bg-white rounded-lg shadow-md p-5">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <PhotoIcon className="h-6 w-6 mr-2" />
              Subir Imágenes
            </h2>

            {/* File Input */}
            <label className="block">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
                id="imageInput"
              />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-500 transition-colors">
                <CloudArrowUpIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600">
                  Click para seleccionar imágenes
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Máximo 10 imágenes
                </p>
              </div>
            </label>

            {/* Image Previews */}
            {imagePreview.length > 0 && (
              <div className="mt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {imagePreview.map((item, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={item.preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleUploadImages}
                  disabled={uploadingImages}
                  className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploadingImages ? 'Subiendo...' : `Subir ${selectedImages.length} imagen${selectedImages.length !== 1 ? 'es' : ''}`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Existing Images */}
        {currentWork.images && currentWork.images.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-5">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              Imágenes del Trabajo ({currentWork.images.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {currentWork.images.map((image, index) => (
                <div
                  key={index}
                  onClick={() => openImageModal(image.url)}
                  className="cursor-pointer group relative"
                >
                  <img
                    src={image.url}
                    alt={`Work ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg group-hover:opacity-75 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                    <PhotoIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <XMarkIcon className="h-8 w-8" />
          </button>
          <img
            src={selectedImageUrl}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default WorkerWorkDetail;
