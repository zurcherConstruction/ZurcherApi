import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  HomeIcon,
  CalendarIcon,
  CameraIcon,
  PhotoIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import api from '../../utils/axios';

const WorkerMaintenanceDetail = () => {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const workIdFromState = location.state?.workId;
  const readOnly = location.state?.readOnly || false; // Modo solo lectura para owner

  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Form state - actualizado para coincidir con el modelo real del backend
  const [formData, setFormData] = useState({
    actualVisitDate: new Date().toISOString().split('T')[0],
    notes: '',
    level_inlet: '',
    level_outlet: '',
    strong_odors: null,
    strong_odors_notes: '',
    water_level_ok: null,
    water_level_notes: '',
    visible_leaks: null,
    visible_leaks_notes: '',
    area_around_dry: null,
    area_around_notes: '',
    cap_green_inspected: null,
    cap_green_notes: '',
    needs_pumping: null,
    blower_working: null,
    blower_working_notes: '',
    blower_filter_clean: null,
    blower_filter_notes: '',
    diffusers_bubbling: null,
    diffusers_bubbling_notes: '',
    discharge_pump_ok: null,
    discharge_pump_notes: '',
    clarified_water_outlet: null,
    clarified_water_notes: '',
    alarm_panel_working: null,
    alarm_panel_notes: '',
    pump_working: null,
    pump_working_notes: '',
    float_switch_good: null,
    float_switch_notes: '',
    general_notes: '',
    // Campos PBTS/ATU
    well_points_quantity: '',
    well_sample_1_url: '',
    well_sample_2_url: '',
    well_sample_3_url: ''
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [wellSampleImages, setWellSampleImages] = useState({ sample1: null, sample2: null, sample3: null });
  const [previewImages, setPreviewImages] = useState([]);
  const [fieldImages, setFieldImages] = useState({}); // Imágenes por campo específico
  const [existingMedia, setExistingMedia] = useState([]); // Archivos ya guardados

  useEffect(() => {
    loadVisitDetail();
  }, [visitId]);

  const loadVisitDetail = async () => {
    try {
      setLoading(true);
      console.log('🔐 VisitId:', visitId);
      console.log('🔐 WorkId from state:', workIdFromState);
      
      if (!workIdFromState) {
        toast.error('No se pudo obtener el workId');
        navigate('/worker/maintenance');
        return;
      }

      // Obtener detalles de la visita
      console.log('📋 Cargando visitas para workId:', workIdFromState);
      const visitResponse = await api.get(`/maintenance/work/${workIdFromState}`);
      console.log('📋 Visits response:', visitResponse.data);
      
      const visits = visitResponse.data || [];
      const currentVisit = visits.find(v => v.id === visitId);
      
      if (!currentVisit) {
        toast.error('Visita no encontrada');
        navigate('/worker/maintenance');
        return;
      }

      console.log('📋 Visita cargada:', currentVisit);
      console.log('🏠 Work data:', currentVisit.work);
      console.log('📄 Permit data:', currentVisit.work?.Permit);
      setVisit(currentVisit);

      // Cargar archivos existentes si hay
      if (currentVisit.mediaFiles && currentVisit.mediaFiles.length > 0) {
        console.log('📸 Archivos existentes encontrados:', currentVisit.mediaFiles.length);
        console.log('📸 Archivos data:', currentVisit.mediaFiles);
        setExistingMedia(currentVisit.mediaFiles);
      }

      // Pre-cargar datos del formulario (incluso si no está completada)
      if (currentVisit.actualVisitDate || currentVisit.status === 'completed') {
        setFormData({
          actualVisitDate: currentVisit.actualVisitDate ? currentVisit.actualVisitDate.split('T')[0] : new Date().toISOString().split('T')[0],
          notes: currentVisit.notes || '',
          level_inlet: currentVisit.level_inlet || '',
          level_outlet: currentVisit.level_outlet || '',
          strong_odors: currentVisit.strong_odors,
          strong_odors_notes: currentVisit.strong_odors_notes || '',
          water_level_ok: currentVisit.water_level_ok,
          water_level_notes: currentVisit.water_level_notes || '',
          visible_leaks: currentVisit.visible_leaks,
          visible_leaks_notes: currentVisit.visible_leaks_notes || '',
          area_around_dry: currentVisit.area_around_dry,
          area_around_notes: currentVisit.area_around_notes || '',
          cap_green_inspected: currentVisit.cap_green_inspected,
          cap_green_notes: currentVisit.cap_green_notes || '',
          needs_pumping: currentVisit.needs_pumping,
          blower_working: currentVisit.blower_working,
          blower_working_notes: currentVisit.blower_working_notes || '',
          blower_filter_clean: currentVisit.blower_filter_clean,
          blower_filter_notes: currentVisit.blower_filter_notes || '',
          diffusers_bubbling: currentVisit.diffusers_bubbling,
          diffusers_bubbling_notes: currentVisit.diffusers_bubbling_notes || '',
          discharge_pump_ok: currentVisit.discharge_pump_ok,
          discharge_pump_notes: currentVisit.discharge_pump_notes || '',
          clarified_water_outlet: currentVisit.clarified_water_outlet,
          clarified_water_notes: currentVisit.clarified_water_notes || '',
          alarm_panel_working: currentVisit.alarm_panel_working,
          alarm_panel_notes: currentVisit.alarm_panel_notes || '',
          pump_working: currentVisit.pump_working,
          pump_working_notes: currentVisit.pump_working_notes || '',
          float_switch_good: currentVisit.float_switch_good,
          float_switch_notes: currentVisit.float_switch_notes || '',
          general_notes: currentVisit.general_notes || '',
          // Campos PBTS/ATU
          well_points_quantity: currentVisit.well_points_quantity || '',
          well_sample_1_url: currentVisit.well_sample_1_url || '',
          well_sample_2_url: currentVisit.well_sample_2_url || '',
          well_sample_3_url: currentVisit.well_sample_3_url || ''
        });
        console.log('✅ Datos del formulario cargados');
      }
    } catch (error) {
      console.error('❌ Error loading visit:', error);
      console.error('❌ Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Error al cargar la visita');
      navigate('/worker/maintenance');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'radio' ? (value === 'true') : value)
    }));
  };

  // Manejar archivos para campos específicos
  const handleFieldImageSelect = (fieldName, e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const existingImages = fieldImages[fieldName] || [];
    if (existingImages.length + files.length > 5) {
      toast.warning('Máximo 5 imágenes por campo');
      return;
    }

    const newImages = [];
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          newImages.push({
            file: file,
            url: reader.result,
            name: file.name
          });
          
          if (newImages.length === files.length) {
            setFieldImages(prev => ({
              ...prev,
              [fieldName]: [...existingImages, ...newImages]
            }));
          }
        };
        reader.readAsDataURL(file);
      }
    });

    toast.success(`${files.length} imagen(es) agregada(s) a ${fieldName}`);
  };

  const removeFieldImage = (fieldName, index) => {
    setFieldImages(prev => ({
      ...prev,
      [fieldName]: (prev[fieldName] || []).filter((_, i) => i !== index)
    }));
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Limitar a 20 archivos
    if (selectedFiles.length + files.length > 20) {
      toast.warning('Máximo 20 archivos permitidos');
      return;
    }

    setSelectedFiles(prev => [...prev, ...files]);

    // Crear previews para imágenes
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImages(prev => [...prev, {
            file: file,
            url: reader.result,
            name: file.name
          }]);
        };
        reader.readAsDataURL(file);
      }
    });

    toast.success(`${files.length} archivo(s) agregado(s)`);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
  };

  // Manejar imágenes de muestras PBTS/ATU
  const handleWellSampleImage = (sampleNumber, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setWellSampleImages(prev => ({
        ...prev,
        [`sample${sampleNumber}`]: { file, preview: reader.result }
      }));
    };
    reader.readAsDataURL(file);
    toast.success(`Imagen de muestra ${sampleNumber} agregada`);
  };

  const removeWellSampleImage = (sampleNumber) => {
    setWellSampleImages(prev => ({
      ...prev,
      [`sample${sampleNumber}`]: null
    }));
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloadingPdf(true);
      toast.info('Generando PDF...');

      const response = await api.get(`/maintenance/${visitId}/download-pdf`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mantenimiento_visita_${visit.visit_number || visitId}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF descargado correctamente');
    } catch (error) {
      console.error('❌ Error al descargar PDF:', error);
      toast.error(error.response?.data?.message || 'Error al descargar el PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSubmit = async (e, markAsCompleted = false) => {
    e.preventDefault();

    if (visit.status === 'completed') {
      toast.info('Esta visita ya fue completada');
      return;
    }

    try {
      setSubmitting(true);

      const submitFormData = new FormData();
      
      // Indicar si se debe marcar como completado
      submitFormData.append('markAsCompleted', markAsCompleted);
      
      // Agregar todos los datos del formulario
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        if (value !== null && value !== '') {
          submitFormData.append(key, value);
        }
      });

      // Agregar todas las imágenes de todos los campos
      Object.keys(fieldImages).forEach(fieldName => {
        const images = fieldImages[fieldName] || [];
        images.forEach(img => {
          submitFormData.append('maintenanceFiles', img.file);
          // También podríamos agregar metadata sobre qué campo corresponde cada imagen
        });
      });

      // Agregar imágenes de muestras PBTS/ATU si existen
      if (wellSampleImages.sample1?.file) {
        submitFormData.append('wellSample1', wellSampleImages.sample1.file);
      }
      if (wellSampleImages.sample2?.file) {
        submitFormData.append('wellSample2', wellSampleImages.sample2.file);
      }
      if (wellSampleImages.sample3?.file) {
        submitFormData.append('wellSample3', wellSampleImages.sample3.file);
      }

      console.log('📤 Enviando formulario de mantenimiento...');
      const response = await api.post(`/maintenance/${visitId}/complete`, submitFormData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('✅ Formulario enviado:', response.data);
      
      if (markAsCompleted) {
        toast.success('Mantenimiento completado exitosamente');
        setTimeout(() => {
          navigate('/worker/maintenance');
        }, 1500);
      } else {
        toast.success('Progreso guardado exitosamente');
        
        // Limpiar estados de imágenes temporales
        setFieldImages({});
        setWellSampleImages({ sample1: null, sample2: null, sample3: null });
        setSelectedFiles([]);
        setPreviewImages([]);
        
        // Recargar la visita para actualizar los datos
        await loadVisitDetail();
      }

    } catch (error) {
      console.error('Error submitting maintenance:', error);
      toast.error(error.response?.data?.message || 'Error al enviar el formulario');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    // Parse como DATEONLY sin conversión de timezone
    const date = new Date(dateString + 'T12:00:00');
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const openPDF = (pdfSource) => {
    if (!pdfSource) {
      toast.warning('PDF no disponible');
      return;
    }

    try {
      // Si es una URL directa
      if (typeof pdfSource === 'string') {
        window.open(pdfSource, '_blank');
        return;
      }

      // Si es un array (bytes)
      if (Array.isArray(pdfSource) || (pdfSource.data && Array.isArray(pdfSource.data))) {
        const dataArray = pdfSource.data || pdfSource;
        
        // Intentar convertir a string para ver si es una URL
        const firstBytes = String.fromCharCode(...dataArray.slice(0, 100));
        if (firstBytes.startsWith('http')) {
          const fullUrl = String.fromCharCode(...dataArray);
          window.open(fullUrl, '_blank');
          return;
        }

        // Es un PDF binario
        const blob = new Blob([new Uint8Array(dataArray)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 100);
        return;
      }

      // Si tiene propiedad url
      if (pdfSource.url) {
        window.open(pdfSource.url, '_blank');
        return;
      }

      toast.error('Formato de PDF no reconocido');
    } catch (error) {
      console.error('Error opening PDF:', error);
      toast.error('Error al abrir PDF');
    }
  };

  // Componente reutilizable para campos de inspección
  const InspectionField = ({ label, fieldName, notesField, required = false, disabled = false }) => (
    <div className="border border-gray-200 rounded-lg p-4 mb-4">
      <label className="block text-sm font-semibold text-gray-700 mb-3">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      {/* Radio buttons SI/NO */}
      <div className="flex gap-6 mb-3">
        <label className="flex items-center">
          <input
            type="radio"
            name={fieldName}
            value="true"
            checked={formData[fieldName] === true}
            onChange={handleInputChange}
            disabled={disabled}
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">Sí / OK</span>
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            name={fieldName}
            value="false"
            checked={formData[fieldName] === false}
            onChange={handleInputChange}
            disabled={disabled}
            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">No / Problema</span>
        </label>
      </div>

      {/* Notas */}
      {formData[fieldName] !== null && (
        <div className="mb-3">
          <label className="block text-xs text-gray-600 mb-1">Notas / Comentarios</label>
          <textarea
            name={notesField}
            value={formData[notesField] || ''}
            onChange={handleInputChange}
            disabled={disabled}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-sm"
            placeholder="Agregar detalles o comentarios..."
          />
        </div>
      )}

      {/* Upload de imágenes */}
      {!disabled && formData[fieldName] !== null && (
        <div>
          <label className="block text-xs text-gray-600 mb-2">Fotos (máx. 5)</label>
          <input
            type="file"
            id={`${fieldName}-images`}
            multiple
            accept="image/*"
            onChange={(e) => handleFieldImageSelect(fieldName, e)}
            className="hidden"
          />
          <label
            htmlFor={`${fieldName}-images`}
            className="inline-flex items-center px-3 py-2 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
          >
            <PhotoIcon className="h-4 w-4 mr-1" />
            Agregar Fotos
          </label>
          
          {/* Preview de imágenes */}
          {fieldImages[fieldName] && fieldImages[fieldName].length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {fieldImages[fieldName].map((img, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-20 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeFieldImage(fieldName, idx)}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transform translate-x-1 -translate-y-1"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Visita no encontrada
        </div>
      </div>
    );
  }

  const isCompleted = visit.status === 'completed';
  const isDisabled = isCompleted || readOnly; // Deshabilitar si está completado O en modo solo lectura
  const permitData = visit.work?.Permit;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/worker/maintenance')}
            className="flex items-center text-white hover:text-blue-100 mb-3"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Volver
          </button>
          <div>
            <h1 className="text-xl font-bold">Visita #{visit.visitNumber}</h1>
            <div className="flex items-center gap-2 mt-1">
              {isCompleted ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                  <CheckCircleIcon className="h-3 w-3 mr-1" />
                  Completada
                </span>
              ) : (visit.status === 'assigned' || visit.actualVisitDate) ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3 w-3 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  En Proceso
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                  Pendiente
                </span>
              )}
              {visit.actualVisitDate && !isCompleted && (
                <span className="text-xs text-blue-100">
                  Última actualización: {formatDate(visit.actualVisitDate)}
                </span>
              )}
              {isCompleted && visit.actualVisitDate && (
                <span className="text-xs text-blue-100">
                  Completada: {formatDate(visit.actualVisitDate)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Property & Permit Info - SIEMPRE VISIBLE */}
        <div className="bg-white rounded-lg shadow-md p-5">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <HomeIcon className="h-6 w-6 text-blue-600" />
            Información de la Propiedad y Permiso
          </h2>

          {permitData ? (
            <>
              {/* Grid de información completa */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Dirección</span>
                  <p className="text-sm text-gray-800 font-medium mt-1">{permitData.propertyAddress || 'N/A'}</p>
                </div>

              {permitData.applicantName && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Cliente</span>
                  <p className="text-sm text-gray-800 font-medium mt-1">{permitData.applicantName}</p>
                </div>
              )}

              {permitData.applicantEmail && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Email del Cliente</span>
                  <p className="text-sm text-gray-800 font-medium mt-1">{permitData.applicantEmail}</p>
                </div>
              )}

              {permitData.applicantPhone && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Teléfono</span>
                  <p className="text-sm text-gray-800 font-medium mt-1">{permitData.applicantPhone}</p>
                </div>
              )}

              {permitData.systemType && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <span className="text-xs font-semibold text-blue-600 uppercase">Tipo de Sistema</span>
                  <p className="text-sm text-blue-900 font-bold mt-1">{permitData.systemType}</p>
                </div>
              )}

              {permitData.permitNumber && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Número de Permiso</span>
                  <p className="text-sm text-gray-800 font-medium mt-1">{permitData.permitNumber}</p>
                </div>
              )}

              {permitData.expirationDate && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Vencimiento Permiso</span>
                  <p className="text-sm text-gray-800 font-medium mt-1">{formatDate(permitData.expirationDate)}</p>
                </div>
              )}

              {visit.scheduledDate && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Fecha Programada</span>
                  <p className="text-sm text-gray-800 font-medium mt-1">{formatDate(visit.scheduledDate)}</p>
                </div>
              )}

              {permitData.gpdCapacity && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Capacidad GPD</span>
                  <p className="text-sm text-gray-800 font-medium mt-1">{permitData.gpdCapacity}</p>
                </div>
              )}

              {permitData.squareFeetSystem && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Pies Cuadrados Sistema</span>
                  <p className="text-sm text-gray-800 font-medium mt-1">{permitData.squareFeetSystem}</p>
                </div>
              )}

              {permitData.pump && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Bomba</span>
                  <p className="text-sm text-gray-800 font-medium mt-1">{permitData.pump}</p>
                </div>
              )}
            </div>

            {/* Documentos del Permit - MEJORADO */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-gray-600" />
                Documentos del Permiso
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {permitData.pdfData && (
                  <button
                    type="button"
                    onClick={() => openPDF(permitData.pdfData)}
                    className="flex flex-col items-center p-4 bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg hover:from-red-100 hover:to-red-200 transition-all shadow-sm hover:shadow-md"
                  >
                    <DocumentTextIcon className="h-12 w-12 text-red-600 mb-2" />
                    <span className="text-xs font-bold text-red-700">Permit PDF</span>
                    <span className="text-xs text-red-600 mt-0.5">Click para ver</span>
                  </button>
                )}
                {permitData.optionalDocs && (
                  <button
                    type="button"
                    onClick={() => openPDF(permitData.optionalDocs)}
                    className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all shadow-sm hover:shadow-md"
                  >
                    <DocumentTextIcon className="h-12 w-12 text-blue-600 mb-2" />
                    <span className="text-xs font-bold text-blue-700">Site Plan</span>
                    <span className="text-xs text-blue-600 mt-0.5">Click para ver</span>
                  </button>
                )}
                {!permitData.pdfData && !permitData.optionalDocs && (
                  <div className="col-span-2 text-center py-4 text-gray-500 text-sm">
                    No hay documentos disponibles
                  </div>
                )}
              </div>
            </div>
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-yellow-700 text-sm">
                ⚠️ No se pudo cargar la información del Permit. 
                <br />
                <span className="text-xs text-yellow-600">
                  Visit ID: {visit?.id} | Work: {visit?.work ? 'Sí' : 'No'} | Permit: {visit?.work?.Permit ? 'Sí' : 'No'}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Maintenance Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-5">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            {isCompleted ? 'Detalles de la Inspección' : 'Formulario de Inspección'}
          </h2>

          {/* Aviso sobre guardar progreso */}
          {!isCompleted && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">Puedes trabajar en el formulario cuando quieras</p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• <strong>Guardar Progreso:</strong> Guarda tus cambios sin finalizar la visita</li>
                    <li>• <strong>Marcar como Completado:</strong> Finaliza la visita y la marca como completada</li>
                    <li>• Puedes volver a abrir y editar hasta que la marques como completada</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Fecha de Inspección */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fecha de Inspección *
            </label>
            <input
              type="date"
              name="actualVisitDate"
              value={formData.actualVisitDate}
              onChange={handleInputChange}
              disabled={isDisabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              required
            />
          </div>

          {/* Niveles Inlet/Outlet */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nivel Inlet</label>
              <input
                type="text"
                name="level_inlet"
                value={formData.level_inlet}
                onChange={handleInputChange}
                disabled={isDisabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="Ej: 12 pulgadas"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nivel Outlet</label>
              <input
                type="text"
                name="level_outlet"
                value={formData.level_outlet}
                onChange={handleInputChange}
                disabled={isDisabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="Ej: 8 pulgadas"
              />
            </div>
          </div>

          <h3 className="text-md font-bold text-gray-800 mb-3 mt-6">Inspección del Sistema</h3>
          
          {/* Campos de inspección con InspectionField component */}
          <InspectionField label="Olores Fuertes" fieldName="strong_odors" notesField="strong_odors_notes" disabled={isDisabled} />
          <InspectionField label="Nivel de Agua OK" fieldName="water_level_ok" notesField="water_level_notes" disabled={isDisabled} />
          <InspectionField label="Fugas Visibles" fieldName="visible_leaks" notesField="visible_leaks_notes" disabled={isDisabled} />
          <InspectionField label="Área Alrededor Seca" fieldName="area_around_dry" notesField="area_around_notes" disabled={isDisabled} />
          <InspectionField label="Tapa Verde Inspeccionada" fieldName="cap_green_inspected" notesField="cap_green_notes" disabled={isDisabled} />
          
          {/* Necesita Bombeo */}
          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="needs_pumping"
                checked={formData.needs_pumping || false}
                onChange={(e) => setFormData(prev => ({ ...prev, needs_pumping: e.target.checked }))}
                disabled={isDisabled}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm font-semibold text-gray-700">Necesita Bombeo</span>
            </label>
          </div>

          <h3 className="text-md font-bold text-gray-800 mb-3 mt-6">Equipo - Blower y Difusores</h3>
          <InspectionField label="Blower Funcionando" fieldName="blower_working" notesField="blower_working_notes" disabled={isDisabled} />
          <InspectionField label="Filtro del Blower Limpio" fieldName="blower_filter_clean" notesField="blower_filter_notes" disabled={isDisabled} />
          <InspectionField label="Difusores Burbujeando" fieldName="diffusers_bubbling" notesField="diffusers_bubbling_notes" disabled={isDisabled} />

          <h3 className="text-md font-bold text-gray-800 mb-3 mt-6">Bomba y Descarga</h3>
          <InspectionField label="Bomba de Descarga OK" fieldName="discharge_pump_ok" notesField="discharge_pump_notes" disabled={isDisabled} />
          <InspectionField label="Agua Clarificada en Outlet" fieldName="clarified_water_outlet" notesField="clarified_water_notes" disabled={isDisabled} />

          <h3 className="text-md font-bold text-gray-800 mb-3 mt-6">Sistema Eléctrico</h3>
          <InspectionField label="Panel de Alarma Funcionando" fieldName="alarm_panel_working" notesField="alarm_panel_notes" disabled={isDisabled} />
          <InspectionField label="Bomba Funcionando" fieldName="pump_working" notesField="pump_working_notes" disabled={isDisabled} />
          <InspectionField label="Interruptor de Flotador Bueno" fieldName="float_switch_good" notesField="float_switch_notes" disabled={isDisabled} />

          {/* Sección condicional para sistemas ATU y PBTS */}
          {permitData && (permitData.systemType?.toUpperCase().includes('ATU') || permitData.systemType?.toUpperCase().includes('PBTS') || permitData.isPBTS) && (
            <div className="mt-6 mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-5">
              <h3 className="text-md font-bold text-purple-900 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
                Inspección PBTS/ATU - Muestras de Well Points
              </h3>

              {/* Cantidad de Well Points */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-purple-800 mb-2">
                  Cantidad de Well Points Encontrados *
                </label>
                <input
                  type="number"
                  name="well_points_quantity"
                  value={formData.well_points_quantity}
                  onChange={handleInputChange}
                  disabled={isDisabled}
                  min="0"
                  className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="Ingrese la cantidad de well points"
                  required
                />
              </div>

              {/* Muestras con fotos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {/* Muestra 1 */}
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <label className="block text-sm font-bold text-purple-800 mb-2">
                    📸 Muestra 1
                  </label>
                  {wellSampleImages.sample1 ? (
                    <div className="relative">
                      <img
                        src={wellSampleImages.sample1.preview}
                        alt="Muestra 1"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => removeWellSampleImage(1)}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : formData.well_sample_1_url ? (
                    <div className="relative">
                      <img
                        src={formData.well_sample_1_url}
                        alt="Muestra 1"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors">
                      <CameraIcon className="h-10 w-10 text-purple-400 mb-2" />
                      <span className="text-xs text-purple-600 font-semibold">Agregar Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleWellSampleImage(1, e)}
                        disabled={isDisabled}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Muestra 2 */}
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <label className="block text-sm font-bold text-purple-800 mb-2">
                    📸 Muestra 2
                  </label>
                  {wellSampleImages.sample2 ? (
                    <div className="relative">
                      <img
                        src={wellSampleImages.sample2.preview}
                        alt="Muestra 2"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => removeWellSampleImage(2)}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : formData.well_sample_2_url ? (
                    <div className="relative">
                      <img
                        src={formData.well_sample_2_url}
                        alt="Muestra 2"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors">
                      <CameraIcon className="h-10 w-10 text-purple-400 mb-2" />
                      <span className="text-xs text-purple-600 font-semibold">Agregar Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleWellSampleImage(2, e)}
                        disabled={isDisabled}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Muestra 3 */}
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <label className="block text-sm font-bold text-purple-800 mb-2">
                    📸 Muestra 3
                  </label>
                  {wellSampleImages.sample3 ? (
                    <div className="relative">
                      <img
                        src={wellSampleImages.sample3.preview}
                        alt="Muestra 3"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => removeWellSampleImage(3)}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : formData.well_sample_3_url ? (
                    <div className="relative">
                      <img
                        src={formData.well_sample_3_url}
                        alt="Muestra 3"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors">
                      <CameraIcon className="h-10 w-10 text-purple-400 mb-2" />
                      <span className="text-xs text-purple-600 font-semibold">Agregar Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleWellSampleImage(3, e)}
                        disabled={isDisabled}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <p className="text-xs text-purple-600 mt-3 italic">
                ℹ️ Esta sección solo aparece para sistemas ATU y PBTS
              </p>
            </div>
          )}

          {/* Notas Generales */}
          <div className="mt-6 mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notas Generales / Observaciones
            </label>
            <textarea
              name="general_notes"
              value={formData.general_notes}
              onChange={handleInputChange}
              disabled={isDisabled}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="Observaciones adicionales sobre la visita..."
            />
          </div>

          {/* Submit Buttons - Dos opciones: Guardar Progreso y Completar */}
          {!isCompleted && !readOnly && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Botón Guardar Progreso */}
              <button
                type="button"
                onClick={(e) => handleSubmit(e, false)}
                disabled={submitting}
                className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                    </svg>
                    Guardar Progreso
                  </>
                )}
              </button>

              {/* Botón Marcar como Completado */}
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={submitting}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Completando...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5" />
                    Marcar como Completado
                  </>
                )}
              </button>
            </div>
          )}

          {isCompleted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <p className="text-green-700 font-semibold text-center mb-2">
                ✅ Esta visita fue completada el {formatDate(visit.actualVisitDate)}
              </p>
              <p className="text-gray-600 text-sm text-center mb-3">
                Los datos del formulario están siendo mostrados. Puede ver los archivos adjuntos abajo.
              </p>
              
              {/* Botón de descarga PDF */}
              <div className="flex justify-center mt-4">
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloadingPdf}
                  className={`px-6 py-2 ${
                    downloadingPdf 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white rounded-lg transition-colors flex items-center gap-2 font-medium`}
                >
                  {downloadingPdf ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Generando PDF...
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="h-5 w-5" />
                      Descargar Reporte PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Existing Media Files */}
        {existingMedia.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-5 mt-4">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <PhotoIcon className="h-6 w-6 text-blue-600" />
              Archivos Adjuntos ({existingMedia.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {existingMedia.map((media, index) => (
                <div key={media.id || index} className="relative group">
                  {(media.mediaType === 'image' || media.fileType?.startsWith('image/')) ? (
                    <div className="relative">
                      <img
                        src={media.mediaUrl || media.fileUrl}
                        alt={media.originalName || `Imagen ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(media.mediaUrl || media.fileUrl, '_blank')}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                        {media.originalName || `Imagen ${index + 1}`}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="w-full h-32 bg-gray-100 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => window.open(media.mediaUrl || media.fileUrl, '_blank')}
                    >
                      <DocumentTextIcon className="h-10 w-10 text-gray-600 mb-2" />
                      <span className="text-xs text-gray-600 text-center px-2 truncate w-full">
                        {media.originalName || 'Archivo'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerMaintenanceDetail;

