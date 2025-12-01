import React, { useEffect, useState, useCallback } from 'react';
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
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

  // Form state - Actualizado con formato SI/NO string
  const [formData, setFormData] = useState({
    actualVisitDate: new Date().toISOString().split('T')[0],
    notes: '',

    // INSPECCIÓN GENERAL
    tank_inlet_level: '', // Nivel entrada tanque
    tank_inlet_notes: '',
    tank_outlet_level: '', // Nivel salida tanque
    tank_outlet_notes: '',
    strong_odors: '', // SI/NO
    strong_odors_notes: '',
    water_level_ok: '', // SI/NO
    water_level_notes: '',
    visible_leaks: '', // SI/NO
    visible_leaks_notes: '',
    area_around_dry: '', // SI/NO
    area_around_notes: '',
    septic_access_clear: '', // SI/NO - NUEVO
    septic_access_notes: '',
    needs_pumping: '', // SI/NO
    needs_pumping_notes: '',

    // SISTEMA ATU
    blower_working: '', // SI/NO
    blower_working_notes: '',
    blower_filter_clean: '', // SI/NO
    blower_filter_notes: '',
    diffusers_bubbling: '', // SI/NO
    diffusers_bubbling_notes: '',
    clarified_water_outlet: '', // SI/NO
    clarified_water_notes: '',
    alarm_test: '', // SI/NO - NUEVO
    alarm_test_notes: '',
    discharge_pump_ok: '', // SI/NO
    discharge_pump_notes: '', // NOTA: Backend usa discharge_pump_notes (no discharge_pump_ok_notes)
    cap_green_inspected: '', // SI/NO - T de inspección cap verde
    cap_green_notes: '',

    // LIFT STATION
    pump_running: '', // SI/NO - NUEVO
    pump_running_notes: '',
    float_switches: '', // SI/NO - NUEVO
    float_switches_notes: '',
    alarm_working: '', // SI/NO - NUEVO
    alarm_working_notes: '',
    pump_condition: '', // SI/NO - NUEVO
    pump_condition_notes: '',

    // PBTS
    well_points_quantity: '',
    well_sample_1_url: '',
    well_sample_1_observations: '',
    well_sample_2_url: '',
    well_sample_2_observations: '',
    well_sample_3_url: '',
    well_sample_3_observations: '',

    // VIDEO GENERAL
    system_video_url: '',

    general_notes: ''
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [wellSampleImages, setWellSampleImages] = useState({ sample1: null, sample2: null, sample3: null });
  const [previewImages, setPreviewImages] = useState([]);
  const [fieldImages, setFieldImages] = useState({}); // Imágenes por campo específico
  const [existingMedia, setExistingMedia] = useState([]); // Archivos ya guardados
  const [systemVideoFile, setSystemVideoFile] = useState(null); // Archivo de video del sistema

  useEffect(() => {
    loadVisitDetail();
    
    // Cleanup: liberar blob URL cuando el componente se desmonte
    return () => {
      if (pdfBlobUrl) {
        window.URL.revokeObjectURL(pdfBlobUrl);
      }
    };
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
        
        // Organizar imágenes por fieldName para mostrarlas junto a cada pregunta
        const imagesByField = {};
        currentVisit.mediaFiles.forEach(media => {
          const fieldName = media.fieldName || 'general';
          if (!imagesByField[fieldName]) {
            imagesByField[fieldName] = [];
          }
          imagesByField[fieldName].push({
            url: media.mediaUrl,
            name: media.fileName || 'image',
            isExisting: true, // Marcar como existente para no volver a subir
            id: media.id
          });
        });
        console.log('📸 Imágenes organizadas por campo:', imagesByField);
        setFieldImages(imagesByField);
      }

      // SIEMPRE pre-cargar datos del formulario (sin importar el estado)
      console.log('📝 Cargando datos guardados del formulario...');
      setFormData({
        actualVisitDate: currentVisit.actualVisitDate ? currentVisit.actualVisitDate.split('T')[0] : new Date().toISOString().split('T')[0],
        notes: currentVisit.notes || '',

        // INSPECCIÓN GENERAL - convertir boolean a SI/NO string
        tank_inlet_level: currentVisit.tank_inlet_level || '',
        tank_inlet_notes: currentVisit.tank_inlet_notes || '',
        tank_outlet_level: currentVisit.tank_outlet_level || '',
        tank_outlet_notes: currentVisit.tank_outlet_notes || '',
        strong_odors: currentVisit.strong_odors === true ? 'SI' : currentVisit.strong_odors === false ? 'NO' : '',
        strong_odors_notes: currentVisit.strong_odors_notes || '',
        water_level_ok: currentVisit.water_level_ok === true ? 'SI' : currentVisit.water_level_ok === false ? 'NO' : '',
        water_level_notes: currentVisit.water_level_notes || '',
        visible_leaks: currentVisit.visible_leaks === true ? 'SI' : currentVisit.visible_leaks === false ? 'NO' : '',
        visible_leaks_notes: currentVisit.visible_leaks_notes || '',
        area_around_dry: currentVisit.area_around_dry === true ? 'SI' : currentVisit.area_around_dry === false ? 'NO' : '',
        area_around_notes: currentVisit.area_around_notes || '',
        septic_access_clear: currentVisit.septic_access_clear === true ? 'SI' : currentVisit.septic_access_clear === false ? 'NO' : '',
        septic_access_notes: currentVisit.septic_access_notes || '',
        needs_pumping: currentVisit.needs_pumping === true ? 'SI' : currentVisit.needs_pumping === false ? 'NO' : '',
        needs_pumping_notes: currentVisit.needs_pumping_notes || '',

        // SISTEMA ATU
        blower_working: currentVisit.blower_working === true ? 'SI' : currentVisit.blower_working === false ? 'NO' : '',
        blower_working_notes: currentVisit.blower_working_notes || '',
        blower_filter_clean: currentVisit.blower_filter_clean === true ? 'SI' : currentVisit.blower_filter_clean === false ? 'NO' : '',
        blower_filter_notes: currentVisit.blower_filter_notes || '',
        diffusers_bubbling: currentVisit.diffusers_bubbling === true ? 'SI' : currentVisit.diffusers_bubbling === false ? 'NO' : '',
        diffusers_bubbling_notes: currentVisit.diffusers_bubbling_notes || '',
        clarified_water_outlet: currentVisit.clarified_water_outlet === true ? 'SI' : currentVisit.clarified_water_outlet === false ? 'NO' : '',
        clarified_water_notes: currentVisit.clarified_water_notes || '',
        alarm_test: currentVisit.alarm_test === true ? 'SI' : currentVisit.alarm_test === false ? 'NO' : '',
        alarm_test_notes: currentVisit.alarm_test_notes || '',
        discharge_pump_ok: currentVisit.discharge_pump_ok === true ? 'SI' : currentVisit.discharge_pump_ok === false ? 'NO' : '',
        discharge_pump_notes: currentVisit.discharge_pump_notes || '',
        cap_green_inspected: currentVisit.cap_green_inspected === true ? 'SI' : currentVisit.cap_green_inspected === false ? 'NO' : '',
        cap_green_notes: currentVisit.cap_green_notes || '',

        // LIFT STATION
        pump_running: currentVisit.pump_running === true ? 'SI' : currentVisit.pump_running === false ? 'NO' : '',
        pump_running_notes: currentVisit.pump_running_notes || '',
        float_switches: currentVisit.float_switches === true ? 'SI' : currentVisit.float_switches === false ? 'NO' : '',
        float_switches_notes: currentVisit.float_switches_notes || '',
        alarm_working: currentVisit.alarm_working === true ? 'SI' : currentVisit.alarm_working === false ? 'NO' : '',
        alarm_working_notes: currentVisit.alarm_working_notes || '',
        pump_condition: currentVisit.pump_condition === true ? 'SI' : currentVisit.pump_condition === false ? 'NO' : '',
        pump_condition_notes: currentVisit.pump_condition_notes || '',

        // PBTS
        well_points_quantity: currentVisit.well_points_quantity || '',
        well_sample_1_url: currentVisit.well_sample_1_url || '',
        well_sample_1_observations: currentVisit.well_sample_1_observations || '',
        well_sample_2_url: currentVisit.well_sample_2_url || '',
        well_sample_2_observations: currentVisit.well_sample_2_observations || '',
        well_sample_3_url: currentVisit.well_sample_3_url || '',
        well_sample_3_observations: currentVisit.well_sample_3_observations || '',

        // VIDEO
        system_video_url: currentVisit.system_video_url || '',

        general_notes: currentVisit.general_notes || ''
      });
      console.log('✅ Datos del formulario cargados correctamente');
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

  // Función estable para actualizar campos individuales
  const updateFormField = useCallback((fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  }, []);

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
    // Si ya tenemos el PDF generado, solo abrir el modal
    if (pdfBlobUrl) {
      setPdfModalOpen(true);
      return;
    }

    // Si no existe, generar el PDF
    try {
      setDownloadingPdf(true);
      toast.info('Generando PDF...');

      const response = await api.get(`/maintenance/${visitId}/download-pdf`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Abrir PDF en modal
      setPdfBlobUrl(url);
      setPdfModalOpen(true);
      
      toast.success('PDF generado correctamente');
    } catch (error) {
      console.error('❌ Error al generar PDF:', error);
      toast.error(error.response?.data?.message || 'Error al generar el PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadPdfFromModal = () => {
    if (!pdfBlobUrl) return;
    
    const link = document.createElement('a');
    link.href = pdfBlobUrl;
    
    // Crear nombre descriptivo: Mantenimiento_N°_Direccion.pdf
    const visitNumber = visit.visitNumber || visitId;
    const propertyAddress = visit.work?.propertyAddress || visit.work?.Permit?.propertyAddress || 'Sin_Direccion';
    const cleanAddress = propertyAddress.replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `Mantenimiento_N${visitNumber}_${cleanAddress}.pdf`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('PDF descargado correctamente');
  };

  const closePdfModal = () => {
    setPdfModalOpen(false);
    // NO eliminar el pdfBlobUrl para poder volver a abrir sin regenerar
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
        let value = formData[key];
        
        // Convertir SI/NO a true/false para el backend
        if (value === 'SI') {
          value = 'true';
        } else if (value === 'NO') {
          value = 'false';
        }
        
        if (value !== null && value !== '') {
          submitFormData.append(key, value);
        }
      });

      // Log detallado de lo que se está enviando
      console.log('📋 FormData a enviar:');
      console.log('🔍 CAMPOS ESPECÍFICOS A REVISAR:');
      console.log('  tank_inlet_level:', formData.tank_inlet_level);
      console.log('  tank_outlet_level:', formData.tank_outlet_level);
      console.log('  septic_access_clear:', formData.septic_access_clear);
      console.log('  needs_pumping:', formData.needs_pumping);
      console.log('  alarm_test:', formData.alarm_test);
      console.log('  pump_running:', formData.pump_running);
      console.log('  float_switches:', formData.float_switches);
      console.log('  alarm_working:', formData.alarm_working);
      for (let [key, value] of submitFormData.entries()) {
        console.log(`  ${key}: ${value}`);
      }
      console.log('🖼️ Field Images:', Object.keys(fieldImages).length, 'campos con imágenes');
      console.log('🔬 Well Sample Images:', wellSampleImages);

      // Agregar SOLO las imágenes NUEVAS de todos los campos (filtrar las existentes)
      // Y enviar el fieldName de cada imagen
      Object.keys(fieldImages).forEach(fieldName => {
        const images = fieldImages[fieldName] || [];
        images.forEach((img, index) => {
          // Solo agregar si NO es una imagen existente (tiene la propiedad file)
          if (img.file && !img.isExisting) {
            submitFormData.append('maintenanceFiles', img.file);
            // Enviar el fieldName correspondiente para cada archivo
            submitFormData.append('fieldNames', fieldName);
          }
        });
      });

      console.log('📤 Imágenes a enviar con sus campos:');
      for (let [key, value] of submitFormData.entries()) {
        if (key === 'maintenanceFiles' || key === 'fieldNames') {
          console.log(`  ${key}:`, value instanceof File ? value.name : value);
        }
      }

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

      // Agregar video del sistema si existe
      if (systemVideoFile) {
        submitFormData.append('systemVideo', systemVideoFile);
        console.log('🎬 Video del sistema agregado:', systemVideoFile.name);
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
        setSystemVideoFile(null); // Limpiar video del sistema

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
        let pdfUrl = pdfSource;
        
        // Si es URL de Cloudinary, agregar parámetro para verlo en navegador en vez de descargarlo
        if (pdfUrl.includes('cloudinary.com') && pdfUrl.includes('/raw/upload/')) {
          // Agregar fl_attachment:false para que se muestre en vez de descargar
          pdfUrl = pdfUrl.replace('/raw/upload/', '/raw/upload/fl_attachment:false/');
        }
        
        window.open(pdfUrl, '_blank');
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

  // Componente RadioField para preguntas con SI/NO - Sin re-renders en notas
  const RadioField = React.memo(({ label, fieldName, notesField, photoRequired = false, disabled = false, fieldValue, notesValue, images }) => {
    // Estado local para las notas
    const [localNotes, setLocalNotes] = React.useState(notesValue || '');

    // Sincronizar cuando cambia el valor externo
    React.useEffect(() => {
      setLocalNotes(notesValue || '');
    }, [notesValue]);

    // Actualizar el estado global al perder foco
    const handleNotesBlur = () => {
      if (localNotes !== notesValue) {
        updateFormField(notesField, localNotes);
      }
    };

    return (
      <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-white">
        {/* Fila superior: Label + SI/NO + Miniaturas en línea horizontal */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-800 mb-3 uppercase">
              {label} {photoRequired && <span className="text-red-600 text-xs ml-1">(FOTO)</span>}
            </label>

            {/* Radio buttons SI/NO */}
            <div className="flex gap-8">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={fieldName}
                  value="SI"
                  checked={fieldValue === 'SI'}
                  onChange={(e) => updateFormField(fieldName, e.target.value)}
                  disabled={disabled}
                  className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300"
                />
                <span className="ml-3 text-base font-semibold text-green-700">SI</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={fieldName}
                  value="NO"
                  checked={fieldValue === 'NO'}
                  onChange={(e) => updateFormField(fieldName, e.target.value)}
                  disabled={disabled}
                  className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300"
                />
                <span className="ml-3 text-base font-semibold text-red-700">NO</span>
              </label>
            </div>
          </div>

          {/* Preview de imágenes en línea horizontal */}
          {images && images.length > 0 && (
            <div className="flex gap-2 flex-shrink-0">
              {images.slice(0, 3).map((img, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className="relative">
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeFieldImage(fieldName, idx)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </div>
                  {/* Link "Ver" debajo de la miniatura */}
                  <a
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
                  >
                    Ver
                  </a>
                </div>
              ))}
              {images.length > 3 && (
                <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-lg border-2 border-gray-300 text-xs font-semibold text-gray-600">
                  +{images.length - 3}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notas */}
        {fieldValue && (
          <div className="mb-3">
            <label className="block text-xs text-gray-600 mb-1 font-medium">Notas / Comentarios</label>
            <textarea
              name={notesField}
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              onBlur={handleNotesBlur}
              disabled={disabled}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-sm"
              placeholder="Agregar detalles o comentarios..."
            />
          </div>
        )}

        {/* Botón para agregar/ver todas las fotos */}
        {!disabled && fieldValue && (
          <div>
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
              className={`inline-flex items-center px-3 py-2 ${photoRequired ? 'bg-red-50 text-red-700 border border-red-300' : 'bg-blue-50 text-blue-700'} text-xs font-semibold rounded-lg cursor-pointer hover:opacity-80 transition-colors`}
            >
              <PhotoIcon className="h-4 w-4 mr-1" />
              {photoRequired ? '📸 Agregar Fotos (Requerido)' : 'Agregar Fotos'}
              {images && images.length > 0 && ` (${images.length})`}
            </label>

            {/* Grid completo de imágenes (oculto por defecto, se muestra si hay más de 3) */}
            {images && images.length > 3 && (
              <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-200">
                {images.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-full h-20 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeFieldImage(fieldName, idx)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
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
  });

  // Componente para campos de texto con observaciones y foto (como nivel de tanque) - Sin re-renders
  const TextWithNotesField = React.memo(({ label, fieldName, notesField, photoRequired = false, disabled = false, placeholder = '', fieldValue, notesValue, images }) => {
    // Estados locales para evitar re-renders del padre
    const [localValue, setLocalValue] = React.useState(fieldValue || '');
    const [localNotes, setLocalNotes] = React.useState(notesValue || '');

    // Sincronizar cuando cambia el valor externo (ej: cargar datos guardados)
    React.useEffect(() => {
      setLocalValue(fieldValue || '');
    }, [fieldValue]);

    React.useEffect(() => {
      setLocalNotes(notesValue || '');
    }, [notesValue]);

    // Actualizar el estado global al perder foco
    const handleBlur = () => {
      if (localValue !== fieldValue) {
        updateFormField(fieldName, localValue);
      }
    };

    const handleNotesBlur = () => {
      if (localNotes !== notesValue) {
        updateFormField(notesField, localNotes);
      }
    };

    return (
      <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-white">
        {/* Fila superior: Label + Input + Miniaturas en línea horizontal */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-800 mb-3 uppercase">
              {label} {photoRequired && <span className="text-red-600 text-xs ml-1">(FOTO)</span>}
            </label>

            {/* Campo de texto para el nivel */}
            <input
              type="text"
              name={fieldName}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onBlur={handleBlur}
              disabled={disabled}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-sm font-semibold"
              placeholder={placeholder}
            />
          </div>

          {/* Preview de imágenes en línea horizontal */}
          {images && images.length > 0 && (
            <div className="flex gap-2 flex-shrink-0">
              {images.slice(0, 3).map((img, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className="relative">
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeFieldImage(fieldName, idx)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </div>
                  {/* Link "Ver" debajo de la miniatura */}
                  <a
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
                  >
                    Ver
                  </a>
                </div>
              ))}
              {images.length > 3 && (
                <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-lg border-2 border-gray-300 text-xs font-semibold text-gray-600">
                  +{images.length - 3}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Observaciones */}
        <div className="mb-3">
          <label className="block text-xs text-gray-600 mb-1 font-medium">Observaciones</label>
          <textarea
            name={notesField}
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={handleNotesBlur}
            disabled={disabled}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-sm"
            placeholder="Agregar observaciones..."
          />
        </div>

        {/* Botón para agregar/ver todas las fotos */}
        {!disabled && (
          <div>
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
              className={`inline-flex items-center px-3 py-2 ${photoRequired ? 'bg-red-50 text-red-700 border border-red-300' : 'bg-blue-50 text-blue-700'} text-xs font-semibold rounded-lg cursor-pointer hover:opacity-80 transition-colors`}
            >
              <PhotoIcon className="h-4 w-4 mr-1" />
              {photoRequired ? '📸 Agregar Fotos (Requerido)' : 'Agregar Fotos'}
              {images && images.length > 0 && ` (${images.length})`}
            </label>

            {/* Grid completo de imágenes (oculto por defecto, se muestra si hay más de 3) */}
            {images && images.length > 3 && (
              <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-200">
                {images.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-full h-20 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeFieldImage(fieldName, idx)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
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
  });

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
  const permitData = visit.work?.Permit || visit.work?.permit;

  console.log('🔍 DEBUG - Visit completa:', visit);
  console.log('🔍 DEBUG - Work:', visit.work);
  console.log('🔍 DEBUG - Permit (mayúscula):', visit.work?.Permit);
  console.log('🔍 DEBUG - permit (minúscula):', visit.work?.permit);
  console.log('🔍 DEBUG - permitData final:', permitData);
  console.log('🔍 DEBUG - systemType:', permitData?.systemType);
  console.log('🔍 DEBUG - assignedStaff:', visit.assignedStaff);
  
  // Si systemType es null, mostrar advertencia
  if (permitData && !permitData.systemType) {
    console.warn('⚠️ ADVERTENCIA: El Permit existe pero systemType es NULL');
    console.warn('📋 Datos del Permit:', permitData);
  }

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

                {/* Inspector Asignado */}
                {visit.assignedStaff && (
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <span className="text-xs font-semibold text-green-600 uppercase">Inspector Asignado</span>
                    <p className="text-sm text-green-900 font-bold mt-1">{visit.assignedStaff.name || 'N/A'}</p>
                  </div>
                )}

                {/* Tipo de Sistema - SIEMPRE MOSTRAR */}
                <div className={`p-3 rounded-lg border ${permitData.systemType ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <span className={`text-xs font-semibold uppercase ${permitData.systemType ? 'text-blue-600' : 'text-yellow-600'}`}>
                    Tipo de Sistema
                  </span>
                  <p className={`text-sm font-bold mt-1 ${permitData.systemType ? 'text-blue-900' : 'text-yellow-700'}`}>
                    {permitData.systemType || '⚠️ NO DEFINIDO'}
                  </p>
                </div>


                {visit.scheduledDate && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Fecha Programada</span>
                    <p className="text-sm text-gray-800 font-medium mt-1">{formatDate(visit.scheduledDate)}</p>
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
                  {(permitData.permitPdfUrl || permitData.pdfData) && (
                    <button
                      type="button"
                      onClick={() => openPDF(permitData.permitPdfUrl || permitData.pdfData)}
                      className="flex flex-col items-center p-4 bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg hover:from-red-100 hover:to-red-200 transition-all shadow-sm hover:shadow-md"
                    >
                      <DocumentTextIcon className="h-12 w-12 text-red-600 mb-2" />
                      <span className="text-xs font-bold text-red-700">Permit PDF</span>
                      <span className="text-xs text-red-600 mt-0.5">Click para ver</span>
                    </button>
                  )}
                  {(permitData.optionalDocsUrl || permitData.optionalDocs) && (
                    <button
                      type="button"
                      onClick={() => openPDF(permitData.optionalDocsUrl || permitData.optionalDocs)}
                      className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all shadow-sm hover:shadow-md"
                    >
                      <DocumentTextIcon className="h-12 w-12 text-blue-600 mb-2" />
                      <span className="text-xs font-bold text-blue-700">Site Plan</span>
                      <span className="text-xs text-blue-600 mt-0.5">Click para ver</span>
                    </button>
                  )}
                  {!permitData.permitPdfUrl && !permitData.pdfData && !permitData.optionalDocsUrl && !permitData.optionalDocs && (
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
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="block text-sm font-bold text-blue-900 mb-2 uppercase">
              Fecha de Inspección *
            </label>
            <input
              type="date"
              name="actualVisitDate"
              value={formData.actualVisitDate}
              onChange={(e) => setFormData(prev => ({ ...prev, actualVisitDate: e.target.value }))}
              disabled={isDisabled}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 font-semibold"
              required
            />
          </div>

          {/* === INSPECCIÓN GENERAL === */}
          <div className="mb-8">
            <h3 className="text-lg font-black text-gray-900 mb-4 pb-2 border-b-4 border-blue-500 uppercase bg-blue-50 px-4 py-2 rounded-t-lg">
              🔍 INSPECCIÓN GENERAL
            </h3>

            {/* Niveles del tanque */}
            <TextWithNotesField
              label="Nivel Entrada Tanque"
              fieldName="tank_inlet_level"
              notesField="tank_inlet_notes"
              photoRequired={true}
              disabled={isDisabled}
              placeholder="Ej: 12 pulgadas"
              fieldValue={formData.tank_inlet_level}
              notesValue={formData.tank_inlet_notes}
              images={fieldImages.tank_inlet_level}
            />

            <TextWithNotesField
              label="Nivel Salida Tanque"
              fieldName="tank_outlet_level"
              notesField="tank_outlet_notes"
              photoRequired={true}
              disabled={isDisabled}
              placeholder="Ej: 8 pulgadas"
              fieldValue={formData.tank_outlet_level}
              notesValue={formData.tank_outlet_notes}
              images={fieldImages.tank_outlet_level}
            />

            <RadioField
              label="¿Hay olores fuertes?"
              fieldName="strong_odors"
              notesField="strong_odors_notes"
              photoRequired={false}
              disabled={isDisabled}
              fieldValue={formData.strong_odors}
              notesValue={formData.strong_odors_notes}
              images={fieldImages.strong_odors}
            />

            <RadioField
              label="¿Nivel de agua correcto?"
              fieldName="water_level_ok"
              notesField="water_level_notes"
              photoRequired={true}
              disabled={isDisabled}
              fieldValue={formData.water_level_ok}
              notesValue={formData.water_level_notes}
              images={fieldImages.water_level_ok}
            />

            <RadioField
              label="¿Hay fugas visibles?"
              fieldName="visible_leaks"
              notesField="visible_leaks_notes"
              photoRequired={false}
              disabled={isDisabled}
              fieldValue={formData.visible_leaks}
              notesValue={formData.visible_leaks_notes}
              images={fieldImages.visible_leaks}
            />

            <RadioField
              label="¿El área alrededor está seca?"
              fieldName="area_around_dry"
              notesField="area_around_notes"
              disabled={isDisabled}
              fieldValue={formData.area_around_dry}
              notesValue={formData.area_around_notes}
              images={fieldImages.area_around_dry}
            />
               <RadioField
                label="¿T de inspeccion cap verde?"
                fieldName="cap_green_inspected"
                notesField="cap_green_notes"
                disabled={isDisabled}
                fieldValue={formData.cap_green_inspected}
                notesValue={formData.cap_green_notes}
                images={fieldImages.cap_green_inspected}
              />

            {/* <RadioField
              label="¿Acceso al septico despejado?"
              fieldName="septic_access_clear"
              notesField="septic_access_notes"
              disabled={isDisabled}
              fieldValue={formData.septic_access_clear}
              notesValue={formData.septic_access_notes}
              images={fieldImages.septic_access_clear}
            /> */}

            <RadioField
              label="¿Necesita bombeo?"
              fieldName="needs_pumping"
              notesField="needs_pumping_notes"
              disabled={isDisabled}
              fieldValue={formData.needs_pumping}
              notesValue={formData.needs_pumping_notes}
              images={fieldImages.needs_pumping}
            />
          </div>

          {/* SISTEMA ATU - SIEMPRE MOSTRAR */}
          <div className="bg-blue-50 p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center uppercase">
              <DocumentTextIcon className="h-6 w-6 mr-2" />
              Sistema ATU
            </h3>

            <RadioField
              label="¿Blower funcionando?"
              fieldName="blower_working"
              notesField="blower_working_notes"
              photoRequired={true}
              disabled={isDisabled}
              fieldValue={formData.blower_working}
              notesValue={formData.blower_working_notes}
              images={fieldImages.blower_working}
            />

            <RadioField
              label="¿Filtro del Blower limpio?"
              fieldName="blower_filter_clean"
              notesField="blower_filter_notes"
              photoRequired={true}
              disabled={isDisabled}
              fieldValue={formData.blower_filter_clean}
              notesValue={formData.blower_filter_notes}
              images={fieldImages.blower_filter_clean}
            />

            <RadioField
              label="¿Difusores burbujeando?"
              fieldName="diffusers_bubbling"
              notesField="diffusers_bubbling_notes"
              disabled={isDisabled}
              fieldValue={formData.diffusers_bubbling}
              notesValue={formData.diffusers_bubbling_notes}
              images={fieldImages.diffusers_bubbling}
            />

            <RadioField
              label="¿Bomba de descarga OK?"
              fieldName="discharge_pump_ok"
              notesField="discharge_pump_notes"
              disabled={isDisabled}
              fieldValue={formData.discharge_pump_ok}
              notesValue={formData.discharge_pump_notes}
              images={fieldImages.discharge_pump_ok}
            />

            <RadioField
              label="¿Agua clarificada en salida tanque?"
              fieldName="clarified_water_outlet"
              notesField="clarified_water_notes"
              photoRequired={true}
              disabled={isDisabled}
              fieldValue={formData.clarified_water_outlet}
              notesValue={formData.clarified_water_notes}
              images={fieldImages.clarified_water_outlet}
            />

            {/* <RadioField
              label="¿Prueba de alarma?"
              fieldName="alarm_test"
              notesField="alarm_test_notes"
              disabled={isDisabled}
              fieldValue={formData.alarm_test}
              notesValue={formData.alarm_test_notes}
              images={fieldImages.alarm_test}
            />

            <RadioField
              label="¿T de inspeccion cap verde?"
              fieldName="cap_green_inspected"
              notesField="cap_green_notes"
              disabled={isDisabled}
              fieldValue={formData.cap_green_inspected}
              notesValue={formData.cap_green_notes}
              images={fieldImages.cap_green_inspected}
            /> */}
          </div>

          {/* === LIFT STATION === */}
          <div className="mb-8">
            <h3 className="text-lg font-black text-gray-900 mb-4 pb-2 border-b-4 border-purple-500 uppercase bg-purple-50 px-4 py-2 rounded-t-lg">
              🔌 LIFT STATION
            </h3>

             <RadioField
              label="¿Panel alarma funcionando?"
              fieldName="alarm_working"
              notesField="alarm_working_notes"
              photoRequired={true}
              disabled={isDisabled}
              fieldValue={formData.alarm_working}
              notesValue={formData.alarm_working_notes}
              images={fieldImages.alarm_working}
            />

            <RadioField
              label="¿Bomba funcionando?"
              fieldName="pump_running"
              notesField="pump_running_notes"
              photoRequired={false}
              disabled={isDisabled}
              fieldValue={formData.pump_running}
              notesValue={formData.pump_running_notes}
              images={fieldImages.pump_running}
            />

            <RadioField
              label="¿Flotante en buena condición?"
              fieldName="float_switches"
              notesField="float_switches_notes"
              disabled={isDisabled}
              fieldValue={formData.float_switches}
              notesValue={formData.float_switches_notes}
              images={fieldImages.float_switches}
            />

          </div>

          {/* === PBTS === */}
          <div className="mb-8 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-5">
            <h3 className="text-lg font-black text-amber-900 mb-4 pb-2 border-b-4 border-amber-500 uppercase flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
              PBTS - MUESTRAS DE WELL POINTS (FOTO)
            </h3>

            {/* Cantidad de Well Points */}
            <div className="mb-5 bg-white rounded-lg p-4 border-2 border-amber-200">
              <label className="block text-sm font-bold text-amber-900 mb-2 uppercase">
                Cantidad de Well Points Encontrados
              </label>
              <input
                type="number"
                name="well_points_quantity"
                value={formData.well_points_quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, well_points_quantity: e.target.value }))}
                disabled={isDisabled}
                min="0"
                className="w-full px-4 py-3 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100 font-semibold text-lg"
                placeholder="Ingrese la cantidad"
              />
            </div>

            {/* Muestras FIJAS - siempre 3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {/* Muestra 1 */}
              <div className="bg-white rounded-lg p-4 border-2 border-amber-300 shadow-md">
                <label className="block text-sm font-black text-amber-900 mb-3 text-center uppercase">
                  📸 Muestra 1 (FOTO)
                </label>
                {wellSampleImages.sample1 ? (
                  <div className="relative">
                    <img
                      src={wellSampleImages.sample1.preview}
                      alt="Muestra 1"
                      className="w-full h-40 object-cover rounded-lg border-2 border-amber-400"
                    />
                    {!isDisabled && (
                      <button
                        type="button"
                        onClick={() => removeWellSampleImage(1)}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 shadow-lg"
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
                      className="w-full h-40 object-cover rounded-lg border-2 border-amber-400"
                    />
                  </div>
                ) : !isDisabled ? (
                  <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-amber-400 rounded-lg cursor-pointer hover:border-amber-600 hover:bg-amber-100 transition-colors">
                    <CameraIcon className="h-12 w-12 text-amber-500 mb-2" />
                    <span className="text-xs text-amber-700 font-bold">Agregar Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleWellSampleImage(1, e)}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="h-40 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                    <span className="text-gray-400 text-sm">Sin foto</span>
                  </div>
                )}
                
                {/* Observaciones Muestra 1 */}
                <div className="mt-3">
                  <label className="block text-xs font-bold text-amber-900 mb-1 uppercase">
                    Observaciones
                  </label>
                  <textarea
                    name="well_sample_1_observations"
                    value={formData.well_sample_1_observations}
                    onChange={handleInputChange}
                    disabled={isDisabled}
                    rows="2"
                    className="w-full px-3 py-2 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100 text-sm"
                    placeholder="Observaciones de la muestra 1"
                  />
                </div>
              </div>

              {/* Muestra 2 */}
              <div className="bg-white rounded-lg p-4 border-2 border-amber-300 shadow-md">
                <label className="block text-sm font-black text-amber-900 mb-3 text-center uppercase">
                  📸 Muestra 2 (FOTO)
                </label>
                {wellSampleImages.sample2 ? (
                  <div className="relative">
                    <img
                      src={wellSampleImages.sample2.preview}
                      alt="Muestra 2"
                      className="w-full h-40 object-cover rounded-lg border-2 border-amber-400"
                    />
                    {!isDisabled && (
                      <button
                        type="button"
                        onClick={() => removeWellSampleImage(2)}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 shadow-lg"
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
                      className="w-full h-40 object-cover rounded-lg border-2 border-amber-400"
                    />
                  </div>
                ) : !isDisabled ? (
                  <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-amber-400 rounded-lg cursor-pointer hover:border-amber-600 hover:bg-amber-100 transition-colors">
                    <CameraIcon className="h-12 w-12 text-amber-500 mb-2" />
                    <span className="text-xs text-amber-700 font-bold">Agregar Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleWellSampleImage(2, e)}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="h-40 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                    <span className="text-gray-400 text-sm">Sin foto</span>
                  </div>
                )}
                
                {/* Observaciones Muestra 2 */}
                <div className="mt-3">
                  <label className="block text-xs font-bold text-amber-900 mb-1 uppercase">
                    Observaciones
                  </label>
                  <textarea
                    name="well_sample_2_observations"
                    value={formData.well_sample_2_observations}
                    onChange={handleInputChange}
                    disabled={isDisabled}
                    rows="2"
                    className="w-full px-3 py-2 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100 text-sm"
                    placeholder="Observaciones de la muestra 2"
                  />
                </div>
              </div>

              {/* Muestra 3 */}
              <div className="bg-white rounded-lg p-4 border-2 border-amber-300 shadow-md">
                <label className="block text-sm font-black text-amber-900 mb-3 text-center uppercase">
                  📸 Muestra 3 (FOTO)
                </label>
                {wellSampleImages.sample3 ? (
                  <div className="relative">
                    <img
                      src={wellSampleImages.sample3.preview}
                      alt="Muestra 3"
                      className="w-full h-40 object-cover rounded-lg border-2 border-amber-400"
                    />
                    {!isDisabled && (
                      <button
                        type="button"
                        onClick={() => removeWellSampleImage(3)}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 shadow-lg"
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
                      className="w-full h-40 object-cover rounded-lg border-2 border-amber-400"
                    />
                  </div>
                ) : !isDisabled ? (
                  <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-amber-400 rounded-lg cursor-pointer hover:border-amber-600 hover:bg-amber-100 transition-colors">
                    <CameraIcon className="h-12 w-12 text-amber-500 mb-2" />
                    <span className="text-xs text-amber-700 font-bold">Agregar Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleWellSampleImage(3, e)}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="h-40 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                    <span className="text-gray-400 text-sm">Sin foto</span>
                  </div>
                )}
                
                {/* Observaciones Muestra 3 */}
                <div className="mt-3">
                  <label className="block text-xs font-bold text-amber-900 mb-1 uppercase">
                    Observaciones
                  </label>
                  <textarea
                    name="well_sample_3_observations"
                    value={formData.well_sample_3_observations}
                    onChange={handleInputChange}
                    disabled={isDisabled}
                    rows="2"
                    className="w-full px-3 py-2 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100 text-sm"
                    placeholder="Observaciones de la muestra 3"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* === VIDEO GENERAL === */}
          <div className="mb-8 bg-gradient-to-r from-pink-50 to-rose-50 border-2 border-pink-300 rounded-lg p-5">
            <h3 className="text-lg font-black text-pink-900 mb-4 pb-2 border-b-4 border-pink-500 uppercase flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
              VIDEO GENERAL DEL SISTEMA
            </h3>

            <div className="bg-white rounded-lg p-4 border-2 border-pink-200">
              <p className="text-sm text-pink-700 mb-3 font-medium">
                📹 Grabe un video general del sistema mostrando el estado general de la instalación
              </p>

              {!isDisabled && (
                <>
                  <input
                    type="file"
                    id="system-video"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSystemVideoFile(file); // Guardar el archivo
                        setFormData(prev => ({ ...prev, system_video_url: file.name }));
                        toast.success('Video seleccionado correctamente');
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="system-video"
                    className="inline-flex items-center px-4 py-3 bg-pink-600 text-white text-sm font-bold rounded-lg cursor-pointer hover:bg-pink-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" />
                    </svg>
                    Grabar / Subir Video
                  </label>
                </>
              )}

              {formData.system_video_url && (
                <div className="mt-3 p-3 bg-pink-100 border border-pink-300 rounded-lg">
                  <p className="text-sm font-semibold text-pink-800 mb-2">
                    ✓ Video del Sistema Cargado
                  </p>
                  {formData.system_video_url.startsWith('http') ? (
                    // Video ya subido a Cloudinary - Mostrar player
                    <div className="space-y-2">
                      <video 
                        controls 
                        className="w-full max-w-2xl rounded-lg shadow-md"
                        preload="metadata"
                      >
                        <source src={formData.system_video_url} type="video/mp4" />
                        <source src={formData.system_video_url} type="video/quicktime" />
                        Tu navegador no soporta el elemento de video.
                      </video>
                      <a
                        href={formData.system_video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1 text-pink-600 text-sm hover:text-pink-800 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Descargar Video
                      </a>
                    </div>
                  ) : (
                    // Archivo recién seleccionado (pendiente de subir)
                    <p className="text-xs text-pink-700">
                      {formData.system_video_url}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notas Generales */}
          <div className="mt-6 mb-6 bg-gray-50 border-2 border-gray-300 rounded-lg p-5">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3 uppercase">
              <DocumentTextIcon className="h-6 w-6 text-gray-600" />
              Notas Generales / Observaciones Adicionales
            </label>
            <textarea
              name="general_notes"
              value={formData.general_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, general_notes: e.target.value }))}
              disabled={isDisabled}
              rows={5}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-sm"
              placeholder="Agregue observaciones adicionales, recomendaciones o cualquier información relevante sobre la visita..."
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
                  className={`px-6 py-2 ${downloadingPdf
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
                      {pdfBlobUrl ? 'Ver Reporte PDF' : 'Generar Reporte PDF'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Existing Media Files - SOLO imágenes generales (sin fieldName específico) */}
        {existingMedia.filter(media => !media.fieldName || media.fieldName === 'general' || media.fieldName === 'system_overview_video').length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-5 mt-4">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <PhotoIcon className="h-6 w-6 text-blue-600" />
              Fotos Adicionales / General ({existingMedia.filter(media => !media.fieldName || media.fieldName === 'general' || media.fieldName === 'system_overview_video').length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {existingMedia.filter(media => !media.fieldName || media.fieldName === 'general' || media.fieldName === 'system_overview_video').map((media, index) => (
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

      {/* Modal para visualizar PDF */}
      {pdfModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                📄 Reporte de Mantenimiento - Visita #{visit?.visitNumber || visitId}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdfFromModal}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  Descargar PDF
                </button>
                <button
                  onClick={closePdfModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Cerrar"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Visor de PDF */}
            <div className="flex-1 overflow-hidden">
              {pdfBlobUrl && (
                <iframe
                  src={pdfBlobUrl}
                  className="w-full h-full border-0"
                  title="Vista previa del PDF"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerMaintenanceDetail;

