import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchInspectionsByWork,
  // fetchInspectionById, // Comentado si no se usa directamente aquí
  requestInitialInspection,
  registerInspectorResponse,
  sendDocumentToApplicant,
  registerSignedApplicantDocument,
  registerInspectionResult,
} from '../../Redux/Actions/inspectionActions';
import { fetchWorkById } from '../../Redux/Actions/workActions';

const InspectionFlowManager = ({ work, selectedWorkImageId, isVisible }) => {
  const dispatch = useDispatch();
  const { inspectionsByWork, selectedInspection, loading, error, successMessage } = useSelector((state) => state.inspection);
  const [activeForm, setActiveForm] = useState(null);

  // --- INICIO: MOVER HOOKS AL NIVEL SUPERIOR ---
  const currentInitialInspection = useMemo(() => {
    return inspectionsByWork.find(insp => insp.type === 'initial');
  }, [inspectionsByWork]);
// Dentro de InspectionFlowManager, antes del if que usa currentInitialInspection
console.log("currentInitialInspection en FlowManager:", currentInitialInspection);
  // Memoizar initialData para 'requestInitial'
  // Se llamará siempre, pero solo se usará condicionalmente en el JSX
  const initialRequestData = useMemo(() => ({ 
    workImageId: selectedWorkImageId 
  }), [selectedWorkImageId]);

  // Memoizar initialData para 'sendToApplicant'
  // Se llamará siempre, pero solo se usará condicionalmente en el JSX
  const sendToApplicantInitialData = useMemo(() => ({
    // Aquí podrías pre-rellenar datos si dependieran de 'currentInitialInspection'
    // Por ejemplo: someField: currentInitialInspection?.someProperty || ''
    // Pero como applicantName/Email se manejan en InspectionActionForm vía 'inspection' prop,
    // un objeto vacío o con valores por defecto es suficiente.
  }), []); // Si depende de currentInitialInspection, añadirlo aquí.

  // Un objeto estable para formularios que no necesitan initialData dinámico
  const defaultInitialDataForForms = useMemo(() => ({}), []);
  // --- FIN: MOVER HOOKS AL NIVEL SUPERIOR ---

  useEffect(() => {
    if (work?.idWork) {
      dispatch(fetchInspectionsByWork(work.idWork));
    }
  }, [dispatch, work?.idWork]);

  const handleActionSubmit = async (itemId, actionCreator, formDataObject, errorMsgContext) => {
    try {
      let dataToSend = { ...formDataObject }; 
      let headers = { 'Content-Type': 'application/json' };

      const actionInvolvesFiles = [
        registerInspectorResponse,
        registerSignedApplicantDocument,
        registerInspectionResult
      ].includes(actionCreator);

      if (actionInvolvesFiles) {
        const fd = new FormData(); 
        Object.keys(dataToSend).forEach(key => {
          if (key === 'resultDocumentFiles' && Array.isArray(dataToSend[key])) { // <--- CAMBIO AQUÍ: Verificar si es un Array
            // Si es resultDocumentFiles y es un Array (de objetos File)
            for (let i = 0; i < dataToSend[key].length; i++) {
              fd.append(key, dataToSend[key][i]); // Añadir cada archivo del array
            }
          } else if (dataToSend[key] instanceof File) { // Para campos de archivo único
            fd.append(key, dataToSend[key]);
          } else if (dataToSend[key] !== undefined && dataToSend[key] !== null) { 
            fd.append(key, String(dataToSend[key])); 
          }
        });
        dataToSend = fd; 
        headers = {}; 
      } else if (actionCreator === requestInitialInspection) {
        if (selectedWorkImageId && !dataToSend.workImageId) {
            dataToSend.workImageId = selectedWorkImageId;
        }
      }

      await dispatch(actionCreator(itemId, dataToSend, headers));
      dispatch(fetchWorkById(work.idWork)); // Asumiendo que work.idWork es correcto
      if (work?.idWork) { // Añadir verificación por si work es undefined
        dispatch(fetchInspectionsByWork(work.idWork));
      }
      setActiveForm(null);
    } catch (err) {
      console.error(errorMsgContext, err);
    }
  };
 
// ...
const renderInspectionDetails = (inspectionToDetail) => {
    if (!inspectionToDetail) return <p className="text-gray-500 italic p-4">No hay información de inspección inicial para esta obra.</p>;
    
    const detailItemClass = "py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0";
    const detailLabelClass = "text-sm font-medium text-gray-600";
    const detailValueClass = "mt-1 text-sm text-gray-800 sm:mt-0 sm:col-span-2";

    return (
      <div className="bg-white overflow-hidden rounded-lg mb-6">
        {/* <h3 className="text-lg font-semibold mb-3 text-gray-800 px-4 pt-4">
            Detalle Inspección Inicial (ID: {inspectionToDetail.idInspection})
        </h3> */}
        <dl className="divide-y divide-gray-200 px-4">
          <div className={detailItemClass}>
            <dt className={detailLabelClass}>Estado del Proceso:</dt>
            <dd className={detailValueClass}>
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                inspectionToDetail.processStatus === 'result_approved' ? 'bg-green-100 text-green-800' :
                inspectionToDetail.processStatus === 'result_rejected' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {inspectionToDetail.processStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </dd>
          </div>
          <div className={detailItemClass}>
            <dt className={detailLabelClass}>Resultado Final:</dt>
            <dd className={`${detailValueClass} ${inspectionToDetail.finalStatus ? (inspectionToDetail.finalStatus === 'approved' ? 'text-green-600 font-bold' : 'text-red-600 font-bold') : 'text-gray-500'}`}>
              {inspectionToDetail.finalStatus ? inspectionToDetail.finalStatus.toUpperCase() : 'Pendiente'}
            </dd>
          </div>
          {inspectionToDetail.inspectorScheduledDate && (
            <div className={detailItemClass}>
              <dt className={detailLabelClass}>Fecha Programada por Inspector:</dt>
              <dd className={detailValueClass}>{new Date(inspectionToDetail.inspectorScheduledDate).toLocaleDateString()}</dd>
            </div>
          )}
          {inspectionToDetail.dateInspectionPerformed && (
            <div className={detailItemClass}>
              <dt className={detailLabelClass}>Fecha Inspección Realizada:</dt>
              <dd className={detailValueClass}>{new Date(inspectionToDetail.dateInspectionPerformed).toLocaleDateString()}</dd>
            </div>
          )}
          
          {inspectionToDetail.documentForApplicantUrl && (
            <div className={detailItemClass}>
              <dt className={detailLabelClass}>Documento para Aplicante:</dt>
              <dd className={detailValueClass}>
                <a href={inspectionToDetail.documentForApplicantUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline">
                  Ver Documento
                </a>
              </dd>
            </div>
          )}
          {inspectionToDetail.signedDocumentFromApplicantUrl && (
            <div className={detailItemClass}>
              <dt className={detailLabelClass}>Documento Firmado por Aplicante:</dt>
              <dd className={detailValueClass}>
                <a href={inspectionToDetail.signedDocumentFromApplicantUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline">
                  Ver Documento Firmado
                </a>
              </dd>
            </div>
          )}
          {inspectionToDetail.resultDocumentUrl && (
            <div className={detailItemClass}>
              <dt className={detailLabelClass}>Documento de Resultado Principal:</dt>
              <dd className={detailValueClass}>
                <a href={inspectionToDetail.resultDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline">
                  Ver Documento de Resultado
                </a>
              </dd>
            </div>
          )}
          {inspectionToDetail.notes?.includes("Archivos de resultado adjuntos:") && (
            <div className={detailItemClass}>
                <dt className={detailLabelClass}>Otros Documentos de Resultado:</dt>
                <dd className={`${detailValueClass} space-y-1`}>
                    {inspectionToDetail.notes.split('\n').filter(line => line.startsWith("- ")).map((line, idx) => {
                        const match = line.match(/- (.*) \((.*)\)/);
                        if (match) {
                            return (
                              <a key={idx} href={match[2]} target="_blank" rel="noopener noreferrer" className="block text-indigo-600 hover:text-indigo-800 hover:underline">
                                {match[1]}
                              </a>
                            );
                        }
                        return null;
                    })}
                </dd>
            </div>
          )}
          <div className={detailItemClass}>
            <dt className={detailLabelClass}>Notas Adicionales:</dt>
            <dd className={`${detailValueClass} whitespace-pre-wrap`}>{inspectionToDetail.notes || 'N/A'}</dd>
          </div>
          <div className={`${detailItemClass} border-b-0 pb-0`}>
            <dt className={detailLabelClass}>Última Actualización:</dt>
            <dd className={detailValueClass}>{new Date(inspectionToDetail.updatedAt).toLocaleString()}</dd>
          </div>
        </dl>
      </div>
    );
  };
// ...

  const renderActions = () => {
    // Ahora se usan las variables memoizadas definidas en el nivel superior
    if (work.status === 'installed' && (!currentInitialInspection || currentInitialInspection.finalStatus)) {
        return (
        <div>
          <button 
            onClick={() => setActiveForm('requestInitial')} 
            disabled={!selectedWorkImageId} 
            className={`font-bold py-2 px-4 rounded mb-2 ${!selectedWorkImageId ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'}`}
          >
            Solicitar Inspección Inicial
          </button>
          {!selectedWorkImageId && work.status === 'installed' && <p className="text-xs text-red-600 mb-2">Debes seleccionar una imagen de "sistema instalado" en la sección de arriba para continuar.</p>}
          {activeForm === 'requestInitial' && selectedWorkImageId && (
            <InspectionActionForm
              actionType="requestInitial"
              initialData={initialRequestData} // <--- USA LA VARIABLE DEL NIVEL SUPERIOR
              onSubmit={(formDataObject) => handleActionSubmit(work.idWork, requestInitialInspection, formDataObject, 'Error al solicitar inspección inicial')}
              isLoading={loading}
            />
          )}
        </div>
      );
    }

    if (currentInitialInspection && !currentInitialInspection.finalStatus) {
      const inspectionForForm = currentInitialInspection; 
      switch (inspectionForForm.processStatus) {
        case 'requested_to_inspectors':
          return (
            <div>
              <p className="mb-2 text-yellow-700">Esperando respuesta de inspectores...</p>
              <button onClick={() => setActiveForm('scheduleReceived')} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                Registrar Respuesta de Inspector
              </button>
              {activeForm === 'scheduleReceived' && (
                <InspectionActionForm
                  inspection={inspectionForForm}
                  actionType="scheduleReceived"
                  initialData={defaultInitialDataForForms} // <--- USA LA VARIABLE DEL NIVEL SUPERIOR
                  onSubmit={(formData) => handleActionSubmit(inspectionForForm.idInspection, registerInspectorResponse, formData, 'Error al registrar respuesta del inspector')}
                  isLoading={loading}
                />
              )}
            </div>
          );
        case 'schedule_received':
          return (
            <div>
              <p className="mb-2 text-green-700">Fecha de inspección programada. Documento listo para enviar al aplicante.</p>
              {inspectionForForm.documentForApplicantUrl && (
                <div className="my-3 p-3 border rounded-md bg-gray-100">
                  <h4 className="text-md font-semibold mb-2">Vista Previa del Documento a Enviar:</h4>
                  {inspectionForForm.documentForApplicantUrl.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={inspectionForForm.documentForApplicantUrl}
                      width="100%"
                      height="300px"
                      title="Vista previa del PDF para aplicante"
                      className="rounded border"
                    ></iframe>
                  ) : (
                    <img 
                      src={inspectionForForm.documentForApplicantUrl} 
                      alt="Vista previa del documento para aplicante" 
                      className="max-w-full h-auto max-h-80 object-contain rounded border"
                    />
                  )}
                  <a 
                    href={inspectionForForm.documentForApplicantUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-indigo-600 hover:text-indigo-800 underline mt-2 block text-sm"
                  >
                    Descargar Documento
                  </a>
                </div>
              )}
              <button onClick={() => setActiveForm('sendToApplicant')} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                Confirmar y Enviar Documento al Aplicante
              </button>
              {activeForm === 'sendToApplicant' && (
              <InspectionActionForm
                inspection={inspectionForForm}
                actionType="sendToApplicant"
                initialData={sendToApplicantInitialData} // <--- USA LA VARIABLE DEL NIVEL SUPERIOR
                onSubmit={(formDataObject) => handleActionSubmit(inspectionForForm.idInspection, sendDocumentToApplicant, formDataObject, 'Error al enviar documento al aplicante')}
                isLoading={loading}
              />
            )}
            </div>
          );
        case 'applicant_document_pending':
          return (
            <div>
              <p className="mb-2 text-yellow-700">Esperando documento firmado del aplicante...</p>
              <button onClick={() => setActiveForm('applicantDocumentReceived')} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                Registrar Documento Firmado Recibido
              </button>
              {activeForm === 'applicantDocumentReceived' && (
                <InspectionActionForm
                  inspection={inspectionForForm}
                  actionType="applicantDocumentReceived"
                  initialData={defaultInitialDataForForms} // <--- USA LA VARIABLE DEL NIVEL SUPERIOR
                  onSubmit={(formData) => handleActionSubmit(inspectionForForm.idInspection, registerSignedApplicantDocument, formData, 'Error al registrar documento firmado')}
                  isLoading={loading}
                />
              )}
            </div>
          );
        case 'applicant_document_received': 
        case 'inspection_completed_pending_result': 
          return (
            <div>
              <p className="mb-2 text-green-700">Documento firmado recibido. Listo para registrar resultado de inspección física.</p>
              <button onClick={() => setActiveForm('registerResult')} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                Registrar Resultado de Inspección
              </button>
              {activeForm === 'registerResult' && (
                <InspectionActionForm
                  inspection={inspectionForForm}
                  actionType="registerResult"
                  initialData={defaultInitialDataForForms} // <--- USA LA VARIABLE DEL NIVEL SUPERIOR
                  onSubmit={(formData) => handleActionSubmit(inspectionForForm.idInspection, registerInspectionResult, formData, 'Error al registrar resultado de inspección')}
                  isLoading={loading}
                />
              )}
            </div>
          );
        case 'result_approved':
        case 'result_rejected':
          return <p className="text-green-700 font-semibold">Proceso de inspección inicial finalizado. Resultado: {inspectionForForm.finalStatus?.toUpperCase()}</p>;
        default:
          return <p>Estado de proceso desconocido: {inspectionForForm.processStatus}</p>;
      }
    }
    return null;
  };

  if (!isVisible) { // <--- ¡ESTA ES LA LÍNEA CLAVE!
    return null; 
  }

  if (loading && inspectionsByWork.length === 0 && !selectedInspection) return <p>Cargando información de inspecciones...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div className="my-6 p-4 border rounded-lg shadow-sm bg-gray-50">

      {successMessage && <p className="text-green-600 bg-green-100 p-2 rounded mb-3">{successMessage}</p>}
      
      {renderInspectionDetails(currentInitialInspection)}
      {renderActions()}
    </div>
  );
};

// Componente InspectionActionForm (asumiendo que la versión que arregló el bucle infinito está aquí)
// Asegúrate que InspectionActionForm esté definido correctamente después de InspectionFlowManager
// o importado si está en otro archivo.
const InspectionActionForm = ({ inspection, actionType, onSubmit, isLoading, initialData = {} }) => {
    const memoizedInitialFormData = useMemo(() => {
        let baseData = { ...initialData };
        if (actionType === 'sendToApplicant' && inspection?.Work) {
            baseData.applicantEmail = inspection.Work.Permit?.applicantEmail || initialData.applicantEmail || '';
            baseData.applicantName = inspection.Work.budget?.applicantName || initialData.applicantName || '';
        }
        baseData.inspectorEmail = baseData.inspectorEmail || '';
        baseData.inspectorScheduledDate = baseData.inspectorScheduledDate || '';
        baseData.finalStatus = baseData.finalStatus || '';
        baseData.dateInspectionPerformed = baseData.dateInspectionPerformed || '';
        baseData.notes = baseData.notes || '';
        return baseData;
    }, [inspection, actionType, initialData]); 

    const [formData, setFormData] = useState(memoizedInitialFormData);
    const [files, setFiles] = useState({});
     

    useEffect(() => {
        setFormData(memoizedInitialFormData); 
    }, [memoizedInitialFormData]);

    const handleInputChange = (e) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    };
  
 // ...dentro de handleFileChange en InspectionActionForm...
 const handleFileChange = (e) => {
    console.log('Evento de cambio de archivo:', e);
    console.log('e.target.name:', e.target.name);
    console.log('e.target.files:', e.target.files);

    const { name, files: newFilesSelectedFromEvent } = e.target; // Renombrar para claridad

    console.log('Nombre del campo:', name);
    console.log('Archivos seleccionados del evento (newFilesSelectedFromEvent):', newFilesSelectedFromEvent);

    if (actionType === 'registerResult' && name === 'resultDocumentFiles') {
        console.log('Entrando a la lógica de registerResult para resultDocumentFiles');

        // --- Construir newFilesArray FUERA del callback de setFiles ---
        let newFilesArray = [];
        if (newFilesSelectedFromEvent && newFilesSelectedFromEvent.length > 0) {
            for (let i = 0; i < newFilesSelectedFromEvent.length; i++) {
                newFilesArray.push(newFilesSelectedFromEvent[i]);
            }
        }
        console.log('Nuevos archivos convertidos a array (newFilesArray) ANTES de setFiles:', newFilesArray);
        // --- Fin de la construcción de newFilesArray ---

        if (newFilesArray.length === 0 && newFilesSelectedFromEvent && newFilesSelectedFromEvent.length > 0) {
            console.error("ALERTA: newFilesSelectedFromEvent tenía archivos, pero newFilesArray está vacío después del bucle. Algo muy raro pasa.");
        }


        setFiles(prevFilesState => {
            console.log('Estado previo de files (prevFilesState):', prevFilesState);
            const existingFilesForField = prevFilesState[name] ? Array.from(prevFilesState[name]) : [];
            console.log('Archivos existentes para el campo (existingFilesForField):', existingFilesForField);
            
            // Ahora newFilesArray ya está construido y se pasa al closure del callback
            console.log('Usando newFilesArray DENTRO de setFiles:', newFilesArray);

            const combinedFiles = [...existingFilesForField];
            newFilesArray.forEach(newFile => { // Este newFilesArray es el que se construyó fuera
                if (!combinedFiles.some(existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size)) {
                    combinedFiles.push(newFile);
                }
            });
            console.log('Archivos combinados (combinedFiles):', combinedFiles); 
            return { ...prevFilesState, [name]: combinedFiles };
        });
    } else {
        // Lógica para otros campos de archivo
        if (newFilesSelectedFromEvent && newFilesSelectedFromEvent.length > 0) {
            setFiles(prevFilesState => ({ ...prevFilesState, [name]: newFilesSelectedFromEvent[0] }));
        } else {
             setFiles(prevFilesState => ({ ...prevFilesState, [name]: null }));
        }
    }
    e.target.value = null; 
};
// ...

    // Función para eliminar un archivo específico de la lista de resultDocumentFiles
    const handleRemoveResultFile = (fileNameToRemove) => {
        setFiles(prevFilesState => {
            const existingFiles = prevFilesState.resultDocumentFiles ? Array.from(prevFilesState.resultDocumentFiles) : [];
            const updatedFiles = existingFiles.filter(file => file.name !== fileNameToRemove);
            return { ...prevFilesState, resultDocumentFiles: updatedFiles };
        });
    };
  
    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToSubmit = { ...formData };
        
        Object.keys(files).forEach(key => {
            if (key === 'resultDocumentFiles' && Array.isArray(files[key])) {
                // Para resultDocumentFiles, nos aseguramos de que se pase el array de archivos
                // handleActionSubmit en el padre ya espera un FileList o un Array para este campo
                // y lo convertirá a FormData correctamente.
                dataToSubmit[key] = files[key]; 
            } else {
                dataToSubmit[key] = files[key]; // Para archivos únicos
            }
        });
        onSubmit(dataToSubmit); 
      };
  
    const renderFields = () => {
      switch (actionType) {
        case 'requestInitial':
          return (
            <>
              <div className="mb-4">
                <label htmlFor="inspectorEmail" className="block text-sm font-medium text-gray-700">Email del Inspector</label>
                <input type="email" name="inspectorEmail" id="inspectorEmail" required onChange={handleInputChange} value={formData.inspectorEmail || ''} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              {formData.workImageId && <p className="text-sm text-gray-600">ID de Imagen de Referencia: {formData.workImageId}</p>}
            </>
          );
      case 'scheduleReceived':
        return (
          <>
            <div className="mb-4">
              <label htmlFor="inspectorScheduledDate" className="block text-sm font-medium text-gray-700">Fecha Programada (YYYY-MM-DD)</label>
              <input type="date" name="inspectorScheduledDate" id="inspectorScheduledDate" required onChange={handleInputChange} value={formData.inspectorScheduledDate || ''} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div className="mb-4">
              <label htmlFor="documentForApplicantFile" className="block text-sm font-medium text-gray-700">Documento para Aplicante (PDF/Imagen)</label>
              <input type="file" name="documentForApplicantFile" id="documentForApplicantFile" required onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
            </div>
          </>
        );
        case 'sendToApplicant':
            return (
             <>
               <div className="mb-4">
                 <label htmlFor="applicantEmail" className="block text-sm font-medium text-gray-700">Email del Aplicante</label>
                 <input 
                   type="email" 
                   name="applicantEmail" 
                   id="applicantEmail" 
                   required 
                   onChange={handleInputChange} 
                   value={formData.applicantEmail || ''}
                   className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
                 />
               </div>
               <div className="mb-4">
                 <label htmlFor="applicantName" className="block text-sm font-medium text-gray-700">Nombre del Aplicante</label>
                 <input 
                   type="text" 
                   name="applicantName" 
                   id="applicantName" 
                   required 
                   onChange={handleInputChange} 
                   value={formData.applicantName || ''}
                   className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
                 />
               </div>
             </>
            );
      case 'applicantDocumentReceived':
        return (
          <div className="mb-4">
            <label htmlFor="signedDocumentFile" className="block text-sm font-medium text-gray-700">Documento Firmado por Aplicante</label>
            <input type="file" name="signedDocumentFile" id="signedDocumentFile" required onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
          </div>
        );
        case 'registerResult':
            return (
              <>
                <div className="mb-4">
                  <label htmlFor="finalStatus" className="block text-sm font-medium text-gray-700">Resultado Final</label>
                  <select name="finalStatus" id="finalStatus" required onChange={handleInputChange} value={formData.finalStatus || ''} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    <option value="">Seleccionar...</option>
                    <option value="approved">Aprobado</option>
                    <option value="rejected">Rechazado</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="dateInspectionPerformed" className="block text-sm font-medium text-gray-700">Fecha de Inspección Realizada (YYYY-MM-DD)</label>
                  <input type="date" name="dateInspectionPerformed" id="dateInspectionPerformed" onChange={handleInputChange} value={formData.dateInspectionPerformed || ''} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
                <div className="mb-4">
                <label htmlFor="resultDocumentFiles" className="block text-sm font-medium text-gray-700">
                  Documento(s) de Resultado
                </label>
                <input 
                  type="file" 
                  name="resultDocumentFiles" 
                  id="resultDocumentFiles" 
                  multiple 
                  onChange={handleFileChange} 
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {/* Mostrar la lista de archivos acumulados con opción de eliminar */}
                {files.resultDocumentFiles && files.resultDocumentFiles.length > 0 && (
              <div className="mt-2 text-xs text-gray-600">
                <p>Archivos seleccionados ({files.resultDocumentFiles.length}):</p>
                {/* Añade un console.log aquí también si es necesario */}
                {/* console.log('Rendering files:', files.resultDocumentFiles) */}
                <ul className="list-disc pl-5">
                  {Array.from(files.resultDocumentFiles).map((file, index) => ( // Array.from es una buena práctica aquí
                    <li key={index} className="flex justify-between items-center">
                      <span>- {file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                      <button 
                            type="button" 
                            onClick={() => handleRemoveResultFile(file.name)}
                            className="ml-2 text-red-500 hover:text-red-700 text-xs"
                            title="Eliminar archivo"
                          >
                            &times; {/* Símbolo de cruz para eliminar */}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              </>
            );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 my-4 p-4 border rounded-md bg-gray-50">
      {renderFields()}
      <div className="mb-4">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notas Adicionales</label>
        <textarea name="notes" id="notes" rows="2" onChange={handleInputChange} value={formData.notes || ''} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
      </div>
      <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300">
        {isLoading ? 'Procesando...' : 'Enviar'}
      </button>
    </form>
  );
};

export default InspectionFlowManager;