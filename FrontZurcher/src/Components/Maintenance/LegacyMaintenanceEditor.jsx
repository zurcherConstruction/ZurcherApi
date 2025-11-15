import React, { useState, useEffect } from 'react';
import { 
  PencilIcon, 
  XMarkIcon, 
  CheckIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentTextIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/axios';

const LegacyMaintenanceEditor = () => {
  const [legacyWorks, setLegacyWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estado para edición
  const [editingWork, setEditingWork] = useState(null);
  const [editFormData, setEditFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    permitId: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Estados para upload de PDFs
  const [uploadingPermitPdf, setUploadingPermitPdf] = useState(false);
  const [uploadingOptionalDocs, setUploadingOptionalDocs] = useState(false);
  const [permitPdfFile, setPermitPdfFile] = useState(null);
  const [optionalDocsFile, setOptionalDocsFile] = useState(null);

  // Cargar trabajos legacy al montar
  useEffect(() => {
    loadLegacyWorks();
  }, []);

  const loadLegacyWorks = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/legacy-maintenance');
      if (response.data && response.data.data) {
        setLegacyWorks(response.data.data);
      }
    } catch (err) {
      console.error('Error al cargar trabajos legacy:', err);
      setError(err.response?.data?.message || 'Error al cargar los trabajos legacy');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (work) => {
    setEditingWork(work);
    setEditFormData({
      clientName: work.Permit?.applicantName || '', // ✅ Leer del Permit
      clientEmail: work.Permit?.applicantEmail || '', // ✅ Leer del Permit
      clientPhone: work.Permit?.applicantPhone || '', // ✅ Leer del Permit
      // permitId eliminado - no es necesario
      notes: work.notes || ''
    });
    setSaveError('');
  };

  const handleCancelEdit = () => {
    setEditingWork(null);
    setEditFormData({
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      permitId: '',
      notes: ''
    });
    setSaveError('');
    setPermitPdfFile(null);
    setOptionalDocsFile(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');

    console.log('🟢 [FRONTEND] Enviando datos:', {
      idWork: editingWork.idWork,
      clientName: editFormData.clientName,
      clientEmail: editFormData.clientEmail,
      clientPhone: editFormData.clientPhone,
      permitId: editFormData.permitId,
      notes: editFormData.notes
    });

    try {
      const response = await api.put(`/legacy-maintenance/${editingWork.idWork}`, {
        clientName: editFormData.clientName,
        clientEmail: editFormData.clientEmail,
        clientPhone: editFormData.clientPhone,
        // permitId se omite - el Permit está vinculado automáticamente por propertyAddress
        notes: editFormData.notes
      });

      console.log('🟢 [FRONTEND] Respuesta recibida:', response.data);

      // Backend retorna { error: false, message, data }
      if (!response.data.error) {
        console.log('🟢 [FRONTEND] Datos del Work actualizado:', {
          'Permit.applicantName': response.data.data.Permit?.applicantName,
          'Permit.applicantEmail': response.data.data.Permit?.applicantEmail,
          'Permit.applicantPhone': response.data.data.Permit?.applicantPhone
        });

        // Actualizar la lista local con los datos frescos
        setLegacyWorks(prev => prev.map(work => 
          work.idWork === editingWork.idWork ? response.data.data : work
        ));
        alert('✅ Datos guardados correctamente');
        handleCancelEdit();
      }
    } catch (err) {
      console.error('🔴 [FRONTEND] Error al guardar:', err);
      setSaveError(err.response?.data?.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPermitPdf = async () => {
    console.log('🔵 [UPLOAD PERMIT PDF] Iniciando...', {
      hasFile: !!permitPdfFile,
      fileName: permitPdfFile?.name,
      fileSize: permitPdfFile?.size,
      permitId: editingWork?.Permit?.idPermit
    });

    if (!permitPdfFile || !editingWork?.Permit?.idPermit) {
      console.log('❌ [UPLOAD PERMIT PDF] Falta archivo o Permit ID');
      alert('Por favor selecciona un archivo PDF');
      return;
    }

    setUploadingPermitPdf(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('pdfData', permitPdfFile);

      console.log('📤 [UPLOAD PERMIT PDF] Enviando a:', `/permit/${editingWork.Permit.idPermit}/replace-pdf`);

      const response = await api.put(`/permit/${editingWork.Permit.idPermit}/replace-pdf`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('✅ [UPLOAD PERMIT PDF] Respuesta:', response.data);
      alert('✅ PDF del Permit subido exitosamente');
      setPermitPdfFile(null);
      
      // Recargar la lista
      loadLegacyWorks();
    } catch (err) {
      console.error('❌ [UPLOAD PERMIT PDF] Error completo:', err);
      console.error('❌ [UPLOAD PERMIT PDF] Response:', err.response?.data);
      alert(err.response?.data?.message || err.response?.data?.error || 'Error al subir el PDF del Permit');
    } finally {
      setUploadingPermitPdf(false);
    }
  };

  const handleUploadOptionalDocs = async () => {
    console.log('🔵 [UPLOAD OPTIONAL DOCS] Iniciando...', {
      hasFile: !!optionalDocsFile,
      fileName: optionalDocsFile?.name,
      fileSize: optionalDocsFile?.size,
      permitId: editingWork?.Permit?.idPermit
    });

    if (!optionalDocsFile || !editingWork?.Permit?.idPermit) {
      console.log('❌ [UPLOAD OPTIONAL DOCS] Falta archivo o Permit ID');
      alert('Por favor selecciona un archivo PDF');
      return;
    }

    setUploadingOptionalDocs(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('optionalDocs', optionalDocsFile);

      console.log('📤 [UPLOAD OPTIONAL DOCS] Enviando a:', `/permit/${editingWork.Permit.idPermit}/replace-optional-docs`);

      const response = await api.put(`/permit/${editingWork.Permit.idPermit}/replace-optional-docs`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('✅ [UPLOAD OPTIONAL DOCS] Respuesta:', response.data);
      alert('✅ Optional Docs subidos exitosamente');
      setOptionalDocsFile(null);
      
      // Recargar la lista
      loadLegacyWorks();
    } catch (err) {
      console.error('❌ [UPLOAD OPTIONAL DOCS] Error completo:', err);
      console.error('❌ [UPLOAD OPTIONAL DOCS] Response:', err.response?.data);
      alert(err.response?.data?.message || err.response?.data?.error || 'Error al subir Optional Docs');
    } finally {
      setUploadingOptionalDocs(false);
    }
  };

  const isPlaceholder = (value) => {
    return value?.includes('⚠️') || value?.includes('editar@') || value?.includes('000-000');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando trabajos legacy...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center mb-2">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
            <h2 className="text-lg font-semibold text-red-800">Error</h2>
          </div>
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadLegacyWorks}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Editor de Trabajos de Mantenimiento
          </h1>
          <p className="text-blue-100">
            Gestiona todos los trabajos de mantenimiento ({legacyWorks.length} total)
          </p>
          <div className="mt-4 flex items-center gap-4 text-sm text-blue-100">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-1" />
              <span>            Con placeholder: {legacyWorks.filter(w => isPlaceholder(w.Permit?.applicantName)).length}</span>
            </div>
            <div className="flex items-center">
              <CheckIcon className="h-5 w-5 mr-1" />
              <span>            Completados: {legacyWorks.filter(w => !isPlaceholder(w.Permit?.applicantName)).length}</span>
            </div>
            <div className="flex items-center text-yellow-200">
              🏷️ Legacy: {legacyWorks.filter(w => w.isLegacy).length}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de trabajos */}
      <div className="max-w-7xl mx-auto space-y-4">
        {legacyWorks.map((work) => {
          const isEditing = editingWork?.idWork === work.idWork;
          const needsEditing = isPlaceholder(work.Permit?.applicantName); // ✅ Leer del Permit

          return (
            <div
              key={work.idWork}
              className={`bg-white rounded-lg shadow-md overflow-hidden transition-all ${
                needsEditing ? 'border-2 border-orange-400' : 'border border-gray-200'
              }`}
            >
              {/* Header del trabajo */}
              <div className={`px-6 py-4 flex items-center justify-between ${
                needsEditing ? 'bg-orange-50' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-3">
                  <HomeIcon className="h-6 w-6 text-gray-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {work.propertyAddress}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span className="flex items-center">
                        <CalendarDaysIcon className="h-4 w-4 mr-1" />
                        Visita: {work.scheduledDate ? new Date(work.scheduledDate + 'T12:00:00').toLocaleDateString('es-ES') : 'N/A'}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Work #{work.idWork}
                      </span>
                      {work.isLegacy && (
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded font-medium">
                          🏷️ Legacy
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {needsEditing && (
                  <div className="flex items-center text-orange-600 text-sm font-medium">
                    <ExclamationTriangleIcon className="h-5 w-5 mr-1" />
                    Requiere edición
                  </div>
                )}

                {!isEditing && (
                  <button
                    onClick={() => handleEdit(work)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <PencilIcon className="h-4 w-4" />
                    Editar
                  </button>
                )}
              </div>

              {/* Contenido */}
              {isEditing ? (
                // Formulario de edición
                <form onSubmit={handleSave} className="p-6 space-y-4">
                  {saveError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{saveError}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nombre del cliente */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <UserIcon className="h-4 w-4 inline mr-1" />
                        Nombre del Cliente *
                      </label>
                      <input
                        type="text"
                        name="clientName"
                        value={editFormData.clientName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nombre completo"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <EnvelopeIcon className="h-4 w-4 inline mr-1" />
                        Email *
                      </label>
                      <input
                        type="email"
                        name="clientEmail"
                        value={editFormData.clientEmail}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="email@ejemplo.com"
                      />
                    </div>

                    {/* Teléfono */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <PhoneIcon className="h-4 w-4 inline mr-1" />
                        Teléfono *
                      </label>
                      <input
                        type="tel"
                        name="clientPhone"
                        value={editFormData.clientPhone}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="239-555-1234"
                      />
                    </div>

                  {/* Permit Info - SOLO LECTURA */}
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <DocumentTextIcon className="h-4 w-4 inline mr-1" />
                      Permit Vinculado (por dirección)
                    </label>
                    <p className="text-sm text-gray-700">
                      <strong>Permit #:</strong> {work.Permit?.permitNumber || 'No disponible'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ID: {work.Permit?.idPermit || 'No vinculado'}
                    </p>
                    <p className="text-xs text-gray-500">
                      ℹ️ El Permit está vinculado automáticamente por la dirección de la propiedad
                    </p>
                  </div>
                  </div>

                  {/* Notas */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <DocumentTextIcon className="h-4 w-4 inline mr-1" />
                      Notas
                    </label>
                    <textarea
                      name="notes"
                      value={editFormData.notes}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Notas adicionales sobre este trabajo..."
                    />
                  </div>

                  {/* Upload de PDFs del Permit */}
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-md font-semibold text-gray-800 mb-3">📄 Documentos del Permit</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Upload Permit PDF (pdfData) */}
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          📋 PDF del Permit (Site Plan)
                        </label>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setPermitPdfFile(e.target.files[0])}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 mb-2"
                        />
                        {permitPdfFile && (
                          <p className="text-xs text-gray-600 mb-2">
                            Archivo: {permitPdfFile.name}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            console.log('🔴 [BUTTON CLICK] Botón de Permit PDF clickeado');
                            handleUploadPermitPdf();
                          }}
                          disabled={!permitPdfFile || uploadingPermitPdf}
                          className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {uploadingPermitPdf ? 'Subiendo...' : 'Subir Site Plan'}
                        </button>
                        {work.Permit?.pdfDataUrl && (
                          <a
                            href={work.Permit.pdfDataUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mt-2 text-xs text-blue-600 hover:underline"
                          >
                            Ver PDF actual
                          </a>
                        )}
                      </div>

                      {/* Upload Optional Docs */}
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          📎 Documentos Opcionales
                        </label>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setOptionalDocsFile(e.target.files[0])}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 mb-2"
                        />
                        {optionalDocsFile && (
                          <p className="text-xs text-gray-600 mb-2">
                            Archivo: {optionalDocsFile.name}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            console.log('🟢 [BUTTON CLICK] Botón de Optional Docs clickeado');
                            handleUploadOptionalDocs();
                          }}
                          disabled={!optionalDocsFile || uploadingOptionalDocs}
                          className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {uploadingOptionalDocs ? 'Subiendo...' : 'Subir Docs Opcionales'}
                        </button>
                        {work.Permit?.optionalDocsUrl && (
                          <a
                            href={work.Permit.optionalDocsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mt-2 text-xs text-green-600 hover:underline"
                          >
                            Ver docs actuales
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-4 w-4" />
                          Guardar Cambios
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                // Vista de datos actuales
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Cliente</label>
                    <p className={`mt-1 text-sm ${isPlaceholder(work.Permit?.applicantName) ? 'text-orange-600 font-medium' : 'text-gray-900'}`}>
                      {work.Permit?.applicantName || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                    <p className={`mt-1 text-sm ${isPlaceholder(work.Permit?.applicantEmail) ? 'text-orange-600 font-medium' : 'text-gray-900'}`}>
                      {work.Permit?.applicantEmail || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Teléfono</label>
                    <p className={`mt-1 text-sm ${isPlaceholder(work.Permit?.applicantPhone) ? 'text-orange-600 font-medium' : 'text-gray-900'}`}>
                      {work.Permit?.applicantPhone || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Permit</label>
                    <p className="mt-1 text-sm text-gray-900">
                      #{work.Permit?.idPermit} - {work.Permit?.permitNumber}
                    </p>
                  </div>
                  {work.notes && (
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase">Notas</label>
                      <p className="mt-1 text-sm text-gray-900">{work.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {legacyWorks.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <HomeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay trabajos de mantenimiento cargados</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LegacyMaintenanceEditor;
