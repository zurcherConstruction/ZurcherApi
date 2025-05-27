import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify'; 

const InspectionActionForm = ({ 
    inspection, 
    actionType, 
    onSubmit, 
    isLoading, 
    initialData = {}, 
    itemId,
    onCancel,
    work,
}) => {
    const memoizedInitialFormData = useMemo(() => {
        // console.log('[InspectionActionForm] Recalculating memoizedInitialFormData. actionType:', actionType, 'initialData:', initialData, 'inspection:', inspection, 'work:', work);
        let baseData = { ...initialData };
        
        if (actionType === 'sendToApplicant' && inspection?.Work) {
            baseData.applicantEmail = inspection.Work.Permit?.applicantEmail || initialData.applicantEmail || '';
            baseData.applicantName = inspection.Work.budget?.applicantName || initialData.applicantName || '';
        }
        if (actionType === 'requestReinspection') {
            baseData.originalInspectionId = inspection?.idInspection || initialData.originalInspectionId || null;
            baseData.inspectorEmail = baseData.inspectorEmail || (inspection?.notes?.match(/Inspector: ([\w@.]+)/)?.[1]) || '';
        }
        if (actionType === 'requestFinalInspection') {
            baseData.applicantEmail = initialData.applicantEmail || work?.Permit?.applicantEmail || work?.Budget?.applicantEmail || '';
            baseData.applicantName = initialData.applicantName || work?.Budget?.applicantName || work?.Permit?.applicantName || '';
            baseData.inspectorEmail = initialData.inspectorEmail || '';
        }
        if (actionType === 'sendInvoiceToClient') {
            baseData.clientEmail = initialData.clientEmail || work?.Permit?.applicantEmail || work?.Budget?.applicantEmail || '';
            baseData.clientName = initialData.clientName || work?.Budget?.applicantName || work?.Permit?.applicantName || '';
        }
        if (actionType === 'notifyInspectorPayment') {
             baseData.inspectorEmail = initialData.inspectorEmail || inspection?.notes?.match(/Inspector:\s*([\w@.-]+)/i)?.[1] || '';
        }
        if (actionType === 'registerInspectionResult' && initialData.finalStatus === undefined) {
            baseData.finalStatus = 'approved';
        }

        baseData.inspectorScheduledDate = baseData.inspectorScheduledDate || '';
        baseData.dateInspectionPerformed = baseData.dateInspectionPerformed || '';
        baseData.notes = baseData.notes || '';
        baseData.finalStatus = baseData.finalStatus || '';

        return baseData;
    }, [inspection, actionType, initialData, work]);

    const [formData, setFormData] = useState(() => memoizedInitialFormData); // Inicializar con una función para que solo se ejecute una vez
    const [files, setFiles] = useState({});
    
    // Ref para comparar el valor anterior de memoizedInitialFormData
    const prevMemoizedInitialFormDataRef = useRef(memoizedInitialFormData);

    useEffect(() => {
        if (JSON.stringify(prevMemoizedInitialFormDataRef.current) !== JSON.stringify(memoizedInitialFormData)) {
            setFormData(memoizedInitialFormData);
            setFiles({}); // Resetea los archivos cuando los datos iniciales cambian significativamente
            prevMemoizedInitialFormDataRef.current = memoizedInitialFormData;
        }
    }, [memoizedInitialFormData]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };


     const handleFileChange = (e) => {
        const { name, files: filesFromEvent } = e.target; // 'name' es el atributo name del input
        
        if (filesFromEvent && filesFromEvent.length > 0) {
            const newFile = filesFromEvent[0]; // Tomamos el primer archivo para campos de un solo archivo

            // Para campos que esperan un solo archivo (como invoiceFile)
            if (name === 'invoiceFile' || name === 'paymentProofFile') {
                setFiles(prevFilesState => ({
                    ...prevFilesState,
                    [name]: [newFile] // Almacena como un array con un solo archivo
                }));
            } else { // Para campos que pueden aceptar múltiples archivos (como attachments)
                const newFilesArray = Array.from(filesFromEvent);
                setFiles(prevFilesState => {
                    const existingFilesForField = prevFilesState[name] ? Array.from(prevFilesState[name]) : [];
                    const combinedFiles = [...existingFilesForField];
                    newFilesArray.forEach(fileToAdd => {
                        if (!combinedFiles.some(existingFile => existingFile.name === fileToAdd.name && existingFile.size === fileToAdd.size)) {
                            combinedFiles.push(fileToAdd);
                        }
                    });
                    return { ...prevFilesState, [name]: combinedFiles };
                });
            }
        } else {
            // Si el usuario cancela la selección de archivos, limpia el campo correspondiente
            setFiles(prevFilesState => ({
                ...prevFilesState,
                [name]: [] 
            }));
        }
        e.target.value = null; // Permite re-seleccionar el mismo archivo
    };

    const handleRemoveFile = (fieldName, fileNameToRemove) => {
        setFiles(prevFilesState => {
            const existingFiles = prevFilesState[fieldName] ? Array.from(prevFilesState[fieldName]) : [];
            const updatedFiles = existingFiles.filter(file => file.name !== fileNameToRemove);
            return { ...prevFilesState, [fieldName]: updatedFiles };
        });
    };

  const handleSubmit = (e) => {
        e.preventDefault();

        if (actionType === 'registerFinalInvoice') {
            if (!files.invoiceFile || files.invoiceFile.length === 0) {
                toast.error("Por favor, selecciona el archivo PDF del invoice del inspector.");
                return; 
            }
        }
        
        const dataPayload = { ...formData }; // formData es el estado con los valores de los inputs (ej. notes)
        
        // Añadir archivos al dataPayload
        Object.keys(files).forEach(fieldName => {
            if (files[fieldName] && files[fieldName].length > 0) {
                if (fieldName === 'invoiceFile' || fieldName === 'paymentProofFile' /* u otros campos de un solo archivo */) {
                    dataPayload[fieldName] = files[fieldName][0]; // Adjunta el objeto File directamente
                } else { // Para campos de múltiples archivos
                    dataPayload[fieldName] = files[fieldName]; // Adjunta el array de Files
                }
            }
        });
        
        // No pases itemId desde aquí si el padre ya lo tiene y lo usa para llamar a handleActionSubmit
        onSubmit(dataPayload); // <--- SOLO PASAR EL OBJETO DE DATOS/ARCHIVOS
    };

    const renderSelectedFiles = (fieldName, isMultiple = true) => {
        const currentFiles = files[fieldName];
        if (currentFiles && ( (Array.isArray(currentFiles) && currentFiles.length > 0) || currentFiles instanceof File) ) {
            const filesArray = Array.isArray(currentFiles) ? currentFiles : [currentFiles];
            return (
                <div className="mt-2 text-xs text-gray-600">
                    <p>Archivos seleccionados ({filesArray.length}):</p>
                    <ul className="list-disc pl-5">
                        {filesArray.map((file, index) => (
                            <li key={`${fieldName}-${index}-${file.name}`} className="flex justify-between items-center">
                                <span>- {file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveFile(fieldName, file.name)}
                                    className="ml-2 text-red-500 hover:text-red-700 text-xs"
                                    title="Eliminar archivo"
                                >
                                    &times;
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            );
        }
        return null;
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
                            <label htmlFor="documentForApplicantFile" className="block text-sm font-medium text-gray-700">Documento(s) para Aplicante (PDF/Imagen)</label>
                            <input
                                type="file"
                                name="documentForApplicantFile"
                                id="documentForApplicantFile"
                                onChange={handleFileChange}
                                multiple
                                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                            {renderSelectedFiles('documentForApplicantFile')}
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
                        <label htmlFor="signedDocumentFile" className="block text-sm font-medium text-gray-700">Documento(s) Firmado(s) por Aplicante</label>
                        <input
                            type="file"
                            name="signedDocumentFile"
                            id="signedDocumentFile"
                            onChange={handleFileChange}
                            multiple
                            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                        {renderSelectedFiles('signedDocumentFile')}
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
                            {renderSelectedFiles('resultDocumentFiles')}
                        </div>
                    </>
                );
              case 'requestReinspection':
                // Determinar si es una reinspección de tipo 'final'
                // 'inspection' es la inspección original que fue rechazada
                const isFinalReinspection = inspection?.type === 'final'; 

                return (
                    <>
                        <p className="text-sm text-orange-600 mb-3">
                            Solicitando reinspección {isFinalReinspection ? 'final' : 'inicial'}. 
                            Asegúrate de que los problemas anteriores hayan sido corregidos.
                        </p>
                        {formData.originalInspectionId && (
                            <p className="text-xs text-gray-500 mb-2">
                                Esto es una reinspección de la inspección ID: {formData.originalInspectionId.substring(0,8)}... 
                                (Tipo Original: {inspection?.type || 'N/A'})
                            </p>
                        )}
                        
                        <div className="mb-4">
                            <label htmlFor="inspectorEmail" className="block text-sm font-medium text-gray-700">
                                Email del Inspector (puede ser el mismo o uno nuevo)
                            </label>
                            <input 
                                type="email" 
                                name="inspectorEmail" 
                                id="inspectorEmail" 
                                onChange={handleInputChange} 
                                value={formData.inspectorEmail || ''} 
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
                                required // El email del inspector es crucial para la notificación
                            />
                        </div>

                        {/* --- CAMPO DE ARCHIVOS, ESPECIALMENTE PARA REINSPECCIÓN FINAL --- */}
                        {isFinalReinspection && ( // Mostrar siempre para reinspección final
                            <div className="mb-4">
                                <label htmlFor="attachments" className="block text-sm font-medium text-gray-700 mb-1">
                                    Adjuntar Archivos para Reinspección Final (ej. video, imágenes) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="file"
                                    name="attachments" // Nombre del campo que espera el backend (Multer)
                                    id="attachments"
                                    multiple
                                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.avi" // Tipos de archivo permitidos
                                    onChange={handleFileChange} // Tu manejador de cambio de archivos
                                    // Podrías hacerlo 'required' aquí si para la reinspección final siempre se necesita un archivo.
                                    // O manejar la validación en handleSubmit o en el backend.
                                    // required 
                                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                                {renderSelectedFiles('attachments')}
                                <p className="text-xs text-gray-500 mt-1">
                                    Para reinspecciones finales, es importante adjuntar evidencia de la corrección (ej. video de alarma funcionando).
                                </p>
                            </div>
                        )}
                        
                        {/* Mensaje sobre la imagen de referencia, ajustar según el tipo */}
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            {(initialData.workImageId && typeof initialData.workImageId === 'string') ? (
                                <p className="text-sm text-blue-700">
                                    Se utilizará la imagen de referencia de la obra seleccionada actualmente (ID: {initialData.workImageId.substring(0,8)}...).
                                    {!isFinalReinspection && (
                                        <span className="block mt-1">Si deseas cambiarla, selecciona otra imagen en la sección "Imágenes de la Obra" antes de enviar.</span>
                                    )}
                                </p>
                            ) : (
                                <p className={`text-sm ${isFinalReinspection ? 'text-gray-600' : 'text-yellow-700'}`}>
                                    {!isFinalReinspection ? 'Advertencia: ' : ''}
                                    No se ha seleccionado una imagen de referencia para esta reinspección.
                                    {!isFinalReinspection && (
                                         <span className="block mt-1">Si deseas adjuntar una, selecciónala en la sección "Imágenes de la Obra" antes de enviar.</span>
                                    )}
                                    {isFinalReinspection && (
                                        <span className="block mt-1">Para reinspecciones finales, el archivo adjunto principal (video/imagen) es más importante que la imagen de referencia general de la obra.</span>
                                    )}
                                </p>
                            )}
                        </div>
                        
                        {/* El campo de notas genérico se renderizará fuera de este switch */}
                    </>
                );
            case 'requestFinalInspection':
                return (
                    <>
                        <div className="mb-4">
                            <label htmlFor="inspectorEmail" className="block text-sm font-medium text-gray-700">Email del Inspector Final</label>
                            <input type="email" name="inspectorEmail" id="inspectorEmail" required onChange={handleInputChange} value={formData.inspectorEmail || ''} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="applicantEmail" className="block text-sm font-medium text-gray-700">Email del Aplicante (para notificaciones)</label>
                            <input type="email" name="applicantEmail" id="applicantEmail" required onChange={handleInputChange} value={formData.applicantEmail || ''} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="applicantName" className="block text-sm font-medium text-gray-700">Nombre del Aplicante</label>
                            <input type="text" name="applicantName" id="applicantName" required onChange={handleInputChange} value={formData.applicantName || ''} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                       <div className="mb-4">
                            <label htmlFor="attachments" className="block text-sm font-medium text-gray-700 mb-1">
                                Adjuntos (opcional)
                            </label>
                            <input
                                type="file"
                                name="attachments" // Clave para el estado 'files'
                                id="attachments"
                                multiple
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                            {files.attachments && files.attachments.length > 0 && (
                                <div className="mt-2 text-sm text-gray-600">
                                    <p className="font-medium">Archivos seleccionados:</p>
                                    <ul>
                                        {files.attachments.map((file, index) => (
                                            <li key={index} className="flex justify-between items-center py-1">
                                                <span>- {file.name}</span>
                                                <button type="button" onClick={() => handleRemoveFile('attachments', file.name)} className="ml-2 text-red-500 hover:text-red-700 font-semibold">&times;</button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                       
                    </>
                );
          case 'registerFinalInvoice': // Acción para cargar el invoice del inspector
                return (
                    <>
                        <div className="mb-4">
                            <label htmlFor="invoiceFile" className="block text-sm font-medium text-gray-700 mb-1">
                                Archivo del Invoice del Inspector (PDF)
                            </label>
                            <input
                                type="file"
                                name="invoiceFile" // Esta es la clave para el estado 'files'
                                id="invoiceFile"
                                accept=".pdf" // Aceptar solo PDF
                                onChange={handleFileChange}
                                // NO AÑADIR 'required' aquí, se maneja en handleSubmit
                                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                            {/* Mostrar el archivo seleccionado para invoiceFile */}
                            {files.invoiceFile && files.invoiceFile.length > 0 && (
                                <div className="mt-2 text-sm text-gray-600">
                                    <p className="font-medium">Archivo seleccionado:</p>
                                    <ul>
                                        {files.invoiceFile.map((file, index) => (
                                            <li key={index} className="flex justify-between items-center py-1">
                                                <span>- {file.name} ({ (file.size / 1024).toFixed(2) } KB)</span>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveFile('invoiceFile', file.name)}
                                                    className="ml-2 text-red-500 hover:text-red-700 font-semibold"
                                                    title="Eliminar archivo"
                                                >
                                                    &times;
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                       
                    </>
                );
                
            case 'sendInvoiceToClient': // Este no tiene campos de formulario editables por el usuario, solo confirma la acción
                return (
                    <>
                        <p className="text-sm text-gray-700 mb-2">Se enviará el invoice al siguiente cliente:</p>
                        <p className="text-sm font-medium">Email: {formData.clientEmail || 'No especificado'}</p>
                        <p className="text-sm font-medium">Nombre: {formData.clientName || 'No especificado'}</p>
                        <p className="text-xs text-gray-500 mt-1">Si los datos no son correctos, cancile y asegúrese de que la información de la obra/presupuesto esté actualizada.</p>
                    </>
                );
            case 'confirmClientPayment':
                return (
                    <div className="mb-4">
                        <label htmlFor="paymentProofFile" className="block text-sm font-medium text-gray-700">Comprobante de Pago del Cliente (Opcional)</label>
                        <input
                            type="file"
                            name="paymentProofFile" // El backend espera 'paymentProofFile'
                            id="paymentProofFile"
                            onChange={handleFileChange}
                            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                        {renderSelectedFiles('paymentProofFile', false)} {/* isMultiple = false */}
                    </div>
                );
            case 'notifyInspectorPayment': // Similar a sendInvoiceToClient, más una confirmación
                 return (
                    <>
                        <p className="text-sm text-gray-700 mb-2">Se notificará el pago al siguiente inspector:</p>
                        <div className="mb-4">
                             <label htmlFor="inspectorEmail" className="block text-sm font-medium text-gray-700">Email del Inspector</label>
                             <input type="email" name="inspectorEmail" id="inspectorEmail" required onChange={handleInputChange} value={formData.inspectorEmail || ''} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Confirmar o ingresar email del inspector"/>
                        </div>
                        {inspection?.clientPaymentProofUrl && (
                            <p className="text-xs text-gray-500 mt-1">Se adjuntará el comprobante de pago del cliente si está disponible.</p>
                        )}
                    </>
                );
            default:
                return <p className="text-red-500">Tipo de acción de formulario no reconocido: {actionType}</p>;
        }
    };

     return (
        <form onSubmit={handleSubmit} className="space-y-4 my-4 p-6 border border-gray-200 rounded-lg bg-white shadow">
            {renderFields()}
            <div className="mb-4">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notas Adicionales (para esta acción)</label>
                <textarea name="notes" id="notes" rows="3" onChange={handleInputChange} value={formData.notes || ''} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
            </div>
            <div className="flex items-center justify-end space-x-3">
                {typeof onCancel === 'function' && (
                    <button 
                        type="button" 
                        onClick={onCancel}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Cancelar
                    </button>
                )}
                <button 
                    type="submit" 
                    disabled={isLoading} 
                    className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Procesando...
                        </>
                    ) : 'Enviar'}
                </button>
            </div>
        </form>
    );
};
export default InspectionActionForm