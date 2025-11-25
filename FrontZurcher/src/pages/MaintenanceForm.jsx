import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import MediaUpload from '../Components/Maintenance/MediaUpload';
import MediaGallery from '../Components/Maintenance/MediaGallery';

// Componente de campo con checkbox y notas (SIN opción de subir archivos)
const CheckboxFieldNoMedia = ({ label, name, checked, notes, notesName, onCheckChange, onNotesChange }) => (
  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
    <div className="flex items-center mb-3">
      <input
        type="checkbox"
        id={name}
        checked={checked}
        onChange={(e) => onCheckChange(name, e.target.checked)}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
      />
      <label htmlFor={name} className="ml-2 block text-sm font-medium text-gray-900">
        {label}
      </label>
    </div>
    
    {checked && (
      <div className="mt-3 space-y-3 pl-6">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Observaciones
          </label>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(notesName, e.target.value)}
            rows={2}
            className="w-full text-sm border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Agregue observaciones..."
          />
        </div>
      </div>
    )}
  </div>
);

// Componente de campo con checkbox y notas
const CheckboxField = ({ label, name, checked, notes, notesName, onCheckChange, onNotesChange, files = [], onFileChange }) => (
  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
    <div className="flex items-center mb-3">
      <input
        type="checkbox"
        id={name}
        checked={checked}
        onChange={(e) => onCheckChange(name, e.target.checked)}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
      />
      <label htmlFor={name} className="ml-2 block text-sm font-medium text-gray-900">
        {label}
      </label>
    </div>
    
    {checked && (
      <div className="mt-3 space-y-3 pl-6">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Observaciones
          </label>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(notesName, e.target.value)}
            rows={2}
            className="w-full text-sm border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Agregue observaciones..."
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Adjuntar evidencia (fotos/videos)
          </label>
          <MediaUpload
            onUpload={(newFiles) => onFileChange(name, [...files, ...newFiles])}
            isUploading={false}
          />
          {files.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-600">{files.length} archivo(s) adjunto(s)</p>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);

const MaintenanceForm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const visitId = searchParams.get('visitId');
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [visitData, setVisitData] = useState(null);
  const [permitData, setPermitData] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    // Niveles
    level_inlet: '',
    level_outlet: '',
    
    // Inspección General
    strong_odors: false,
    strong_odors_notes: '',
    water_level_ok: false,
    water_level_notes: '',
    visible_leaks: false,
    visible_leaks_notes: '',
    area_around_dry: false,
    area_around_notes: '',
    cap_green_inspected: false,
    cap_green_notes: '',
    needs_pumping: false,
    
    // Sistema ATU
    blower_working: false,
    blower_working_notes: '',
    blower_filter_clean: false,
    blower_filter_notes: '',
    diffusers_bubbling: false,
    diffusers_bubbling_notes: '',
    discharge_pump_ok: false,
    discharge_pump_notes: '',
    clarified_water_outlet: false,
    clarified_water_notes: '',
    
    // Lift Station - OPCIONALES
    has_lift_station: false, // Control de visibilidad
    alarm_panel_working: false,
    alarm_panel_notes: '',
    pump_working: false,
    pump_working_notes: '',
    float_switch_good: false,
    float_switch_notes: '',
    
    // PBTS - OPCIONALES
    has_pbts: false, // Control de visibilidad
    well_samples: [
      { well: 'Muestra 1', samplePresent: false, notes: '', observations: '', files: [] },
      { well: 'Muestra 2', samplePresent: false, notes: '', observations: '', files: [] },
      { well: 'Muestra 3', samplePresent: false, notes: '', observations: '', files: [] },
    ],
    
    // Generales
    general_notes: '',
  });

  const [files, setFiles] = useState({});
  const [generalMedia, setGeneralMedia] = useState([]);
  const [systemVideo, setSystemVideo] = useState(null);

  useEffect(() => {
    if (!visitId) {
      alert('No se proporcionó ID de visita');
      return;
    }
    fetchVisitData();
  }, [visitId]);

  const fetchVisitData = async () => {
    try {
      setLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      // Obtener datos de la visita con work y permit incluidos
      const response = await axios.get(`${API_URL}/maintenance/${visitId}`, {
        headers: token ? {} : { Authorization: `Bearer ${localStorage.getItem('token')}` },
        params: token ? { token } : {}
      });

      const visit = response.data;
      setVisitData(visit);
      
      if (visit.work?.permit) {
        setPermitData(visit.work.permit);
      }
    } catch (error) {
      console.error('Error fetching visit data:', error);
      alert('Error al cargar datos de la visita');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (fieldName, newFiles) => {
    setFiles(prev => ({ ...prev, [fieldName]: newFiles }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!visitId) {
      alert('ID de visita no válido');
      return;
    }

    // Validación básica
    if (!formData.level_inlet && !formData.level_outlet && !formData.general_notes) {
      alert('Por favor, complete al menos algunos campos del formulario');
      return;
    }

    try {
      setSubmitting(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      const formDataToSend = new FormData();
      
      // Agregar campos del formulario
      Object.keys(formData).forEach(key => {
        if (key === 'well_samples') {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else if (typeof formData[key] === 'boolean') {
          formDataToSend.append(key, formData[key].toString());
        } else if (formData[key]) {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Crear mapeo de archivos a campos
      const fileFieldMapping = {};
      
      // Agregar archivos asociados a campos específicos
      Object.keys(files).forEach(fieldName => {
        const fieldFiles = files[fieldName];
        if (fieldFiles && fieldFiles.length > 0) {
          fieldFiles.forEach(file => {
            formDataToSend.append('maintenanceFiles', file);
            fileFieldMapping[file.name] = fieldName;
          });
        }
      });

      // Agregar archivos generales
      if (generalMedia && generalMedia.length > 0) {
        generalMedia.forEach(file => {
          formDataToSend.append('maintenanceFiles', file);
          fileFieldMapping[file.name] = 'general';
        });
      }

      // Agregar video del sistema
      if (systemVideo) {
        formDataToSend.append('maintenanceFiles', systemVideo);
        fileFieldMapping[systemVideo.name] = 'system_overview_video';
      }

      // Agregar mapeo de archivos
      formDataToSend.append('fileFieldMapping', JSON.stringify(fileFieldMapping));

      // Enviar formulario
      const response = await axios.post(
        `${API_URL}/maintenance/${visitId}/complete`,
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? {} : { Authorization: `Bearer ${localStorage.getItem('token')}` })
          },
          params: token ? { token } : {}
        }
      );

      alert('Formulario de mantenimiento enviado exitosamente');
      
      // Redirigir o cerrar
      if (window.ReactNativeWebView) {
        // Si está en WebView, notificar a la app móvil
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAINTENANCE_COMPLETED', visitId }));
      } else {
        navigate('/maintenance-success');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error al enviar el formulario: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos de mantenimiento...</p>
        </div>
      </div>
    );
  }

  if (!visitData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg">No se pudo cargar la información de la visita</p>
        </div>
      </div>
    );
  }

  const systemType = permitData?.systemType || '';
  const showATU = systemType.includes('ATU');
  const showPBTS = systemType.includes('PBTS');
  const showLiftStation = systemType.includes('Lift Station');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Formulario de Mantenimiento</h1>
          
          {/* Información del Permit */}
          {permitData && (
            <div className="border-t pt-4 mt-4">
              <h2 className="text-xl font-semibold text-gray-700 mb-3">Información del Proyecto</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Dirección de la Propiedad</p>
                  <p className="font-medium text-gray-900">{permitData.propertyAddress}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Aplicante</p>
                  <p className="font-medium text-gray-900">{permitData.applicant}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tipo de Sistema</p>
                  <p className="font-medium text-blue-600">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100">
                      {permitData.systemType}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Permit ID</p>
                  <p className="font-medium text-gray-900">{permitData.id}</p>
                </div>
              </div>
            </div>
          )}

          {/* Info de la inspección */}
          <div className="border-t pt-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Fecha Programada</p>
                <p className="font-medium text-gray-900">
                  {new Date(visitData.scheduledDate + 'T12:00:00').toLocaleDateString('es-ES')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Inspector</p>
                <p className="font-medium text-gray-900">
                  {visitData.assignedStaff?.name || 'No asignado'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sección General - Inspección */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Inspección General</h2>
            
            {/* Niveles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nivel entrada tanque (cm o %)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.level_inlet}
                  onChange={(e) => handleInputChange('level_inlet', e.target.value)}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: 45"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nivel salida tanque
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.level_outlet}
                  onChange={(e) => handleInputChange('level_outlet', e.target.value)}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: 10"
                />
              </div>
            </div>

            {/* Checkboxes con observaciones */}
            <div className="space-y-4">
              <CheckboxFieldNoMedia
                label="¿Olores fuertes?"
                name="strong_odors"
                checked={formData.strong_odors}
                notes={formData.strong_odors_notes}
                notesName="strong_odors_notes"
                onCheckChange={handleInputChange}
                onNotesChange={handleInputChange}
              />

              <CheckboxFieldNoMedia
                label="¿Nivel de agua correcto?"
                name="water_level_ok"
                checked={formData.water_level_ok}
                notes={formData.water_level_notes}
                notesName="water_level_notes"
                onCheckChange={handleInputChange}
                onNotesChange={handleInputChange}
              />

              <CheckboxField
                label="¿Fugas visibles?"
                name="visible_leaks"
                checked={formData.visible_leaks}
                notes={formData.visible_leaks_notes}
                notesName="visible_leaks_notes"
                onCheckChange={handleInputChange}
                onNotesChange={handleInputChange}
                files={files.visible_leaks || []}
                onFileChange={handleFileChange}
              />

              <CheckboxField
                label="¿Área alrededor seca?"
                name="area_around_dry"
                checked={formData.area_around_dry}
                notes={formData.area_around_notes}
                notesName="area_around_notes"
                onCheckChange={handleInputChange}
                onNotesChange={handleInputChange}
                files={files.area_around_dry || []}
                onFileChange={handleFileChange}
              />

              <CheckboxField
                label="¿Tapa inspección cap verde?"
                name="cap_green_inspected"
                checked={formData.cap_green_inspected}
                notes={formData.cap_green_notes}
                notesName="cap_green_notes"
                onCheckChange={handleInputChange}
                onNotesChange={handleInputChange}
                files={files.cap_green_inspected || []}
                onFileChange={handleFileChange}
              />

              <CheckboxField
                label="¿Necesita bombeo?"
                name="needs_pumping"
                checked={formData.needs_pumping}
                notes=""
                notesName=""
                onCheckChange={handleInputChange}
                onNotesChange={() => {}}
                files={[]}
                onFileChange={() => {}}
              />
            </div>
          </div>

          {/* Sección ATU (condicional) */}
          {showATU && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Sistema ATU</h2>
              <div className="space-y-4">
                <CheckboxField
                  label="¿Blower funcionando?"
                  name="blower_working"
                  checked={formData.blower_working}
                  notes={formData.blower_working_notes}
                  notesName="blower_working_notes"
                  onCheckChange={handleInputChange}
                  onNotesChange={handleInputChange}
                  files={files.blower_working || []}
                  onFileChange={handleFileChange}
                />

                <CheckboxField
                  label="¿Filtro del blower limpio?"
                  name="blower_filter_clean"
                  checked={formData.blower_filter_clean}
                  notes={formData.blower_filter_notes}
                  notesName="blower_filter_notes"
                  onCheckChange={handleInputChange}
                  onNotesChange={handleInputChange}
                  files={files.blower_filter_clean || []}
                  onFileChange={handleFileChange}
                />

                <CheckboxField
                  label="¿Difusores burbujeando?"
                  name="diffusers_bubbling"
                  checked={formData.diffusers_bubbling}
                  notes={formData.diffusers_bubbling_notes}
                  notesName="diffusers_bubbling_notes"
                  onCheckChange={handleInputChange}
                  onNotesChange={handleInputChange}
                  files={files.diffusers_bubbling || []}
                  onFileChange={handleFileChange}
                />

                <CheckboxField
                  label="¿Bomba de descarga OK?"
                  name="discharge_pump_ok"
                  checked={formData.discharge_pump_ok}
                  notes={formData.discharge_pump_notes}
                  notesName="discharge_pump_notes"
                  onCheckChange={handleInputChange}
                  onNotesChange={handleInputChange}
                  files={files.discharge_pump_ok || []}
                  onFileChange={handleFileChange}
                />

                <CheckboxField
                  label="¿Agua clarificada salida tanque?"
                  name="clarified_water_outlet"
                  checked={formData.clarified_water_outlet}
                  notes={formData.clarified_water_notes}
                  notesName="clarified_water_notes"
                  onCheckChange={handleInputChange}
                  onNotesChange={handleInputChange}
                  files={files.clarified_water_outlet || []}
                  onFileChange={handleFileChange}
                />
              </div>
            </div>
          )}

          {/* Sección Lift Station (condicional por tipo de sistema) */}
          {showLiftStation && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Lift Station</h2>
              
              {/* Checkbox para controlar si tiene Lift Station */}
              <div className="mb-4 border-b border-gray-200 pb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="has_lift_station"
                    checked={formData.has_lift_station}
                    onChange={(e) => handleInputChange('has_lift_station', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="has_lift_station" className="ml-2 block text-sm font-medium text-gray-900">
                    ¿Tiene Lift Station?
                  </label>
                </div>
              </div>

              {/* Campos solo si tiene Lift Station */}
              {formData.has_lift_station && (
                <div className="space-y-4">
                  <CheckboxField
                    label="¿Panel alarma funcionando?"
                    name="alarm_panel_working"
                    checked={formData.alarm_panel_working}
                    notes={formData.alarm_panel_notes}
                    notesName="alarm_panel_notes"
                    onCheckChange={handleInputChange}
                    onNotesChange={handleInputChange}
                    files={files.alarm_panel_working || []}
                    onFileChange={handleFileChange}
                  />

                  <CheckboxField
                    label="¿Bomba funcionando?"
                    name="pump_working"
                    checked={formData.pump_working}
                    notes={formData.pump_working_notes}
                    notesName="pump_working_notes"
                    onCheckChange={handleInputChange}
                    onNotesChange={handleInputChange}
                    files={files.pump_working || []}
                    onFileChange={handleFileChange}
                  />

                  <CheckboxField
                    label="¿Flotante en buena condición?"
                    name="float_switch_good"
                    checked={formData.float_switch_good}
                    notes={formData.float_switch_notes}
                    notesName="float_switch_notes"
                    onCheckChange={handleInputChange}
                    onNotesChange={handleInputChange}
                    files={files.float_switch_good || []}
                    onFileChange={handleFileChange}
                  />
                </div>
              )}
            </div>
          )}

          {/* Sección PBTS (condicional) */}
          {showPBTS && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">PBTS - Muestras de Pozos</h2>
              
              {/* Checkbox para controlar si tiene PBTS */}
              <div className="mb-4 border-b border-gray-200 pb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="has_pbts"
                    checked={formData.has_pbts}
                    onChange={(e) => handleInputChange('has_pbts', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="has_pbts" className="ml-2 block text-sm font-medium text-gray-900">
                    ¿Tiene PBTS (Pozos)?
                  </label>
                </div>
              </div>

              {/* Muestras solo si tiene PBTS */}
              {formData.has_pbts && (
                <div className="space-y-4">
                  {formData.well_samples.map((sample, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <h3 className="font-medium text-gray-900 mb-3">{sample.well}</h3>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`sample-${index}`}
                            checked={sample.samplePresent}
                            onChange={(e) => {
                              const newSamples = [...formData.well_samples];
                              newSamples[index].samplePresent = e.target.checked;
                              handleInputChange('well_samples', newSamples);
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`sample-${index}`} className="ml-2 block text-sm text-gray-700">
                            Cantidad de well point encontrados
                          </label>
                        </div>

                        {sample.samplePresent && (
                          <>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Observaciones
                              </label>
                              <textarea
                                value={sample.observations || ''}
                                onChange={(e) => {
                                  const newSamples = [...formData.well_samples];
                                  newSamples[index].observations = e.target.value;
                                  handleInputChange('well_samples', newSamples);
                                }}
                                rows={2}
                                className="w-full text-sm border border-gray-300 rounded-md shadow-sm p-2"
                                placeholder="Observaciones de la muestra..."
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Notas adicionales
                              </label>
                              <textarea
                                value={sample.notes}
                                onChange={(e) => {
                                  const newSamples = [...formData.well_samples];
                                  newSamples[index].notes = e.target.value;
                                  handleInputChange('well_samples', newSamples);
                                }}
                                rows={2}
                                className="w-full text-sm border border-gray-300 rounded-md shadow-sm p-2"
                                placeholder="Notas adicionales..."
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Fotos/Videos
                              </label>
                              <MediaUpload
                                onUpload={(newFiles) => {
                                  const newSamples = [...formData.well_samples];
                                  newSamples[index].files = [...(newSamples[index].files || []), ...newFiles];
                                  handleInputChange('well_samples', newSamples);
                                }}
                                isUploading={false}
                              />
                              {sample.files && sample.files.length > 0 && (
                                <p className="text-xs text-gray-600 mt-2">{sample.files.length} archivo(s)</p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange('well_samples', [
                        ...formData.well_samples,
                        { well: `Muestra ${formData.well_samples.length + 1}`, samplePresent: false, notes: '', observations: '', files: [] }
                      ]);
                    }}
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                  >
                    + Agregar otra muestra
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Observaciones y Media Generales */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Observaciones Generales</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas Generales
              </label>
              <textarea
                value={formData.general_notes}
                onChange={(e) => handleInputChange('general_notes', e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Agregue observaciones generales aquí..."
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imágenes/Videos Generales
              </label>
              <MediaUpload
                onUpload={(newFiles) => setGeneralMedia([...generalMedia, ...newFiles])}
                isUploading={false}
              />
              {generalMedia.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">{generalMedia.length} archivo(s) general(es)</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video General del Sistema
              </label>
              <MediaUpload
                onUpload={(newFiles) => setSystemVideo(newFiles[0] || null)}
                isUploading={false}
              />
              {systemVideo && (
                <p className="text-sm text-gray-600 mt-2">Video del sistema: {systemVideo.name}</p>
              )}
            </div>
          </div>

          {/* Botón de envío */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? 'Enviando...' : 'Completar Mantenimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceForm;
