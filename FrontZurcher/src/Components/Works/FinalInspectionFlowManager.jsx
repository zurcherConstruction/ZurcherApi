import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchInspectionsByWork,
    registerInspectionResult,
    requestFinalInspection,
    registerInspectorInvoiceForFinal,
    sendInvoiceToClientForFinal,
    confirmClientPaymentForFinal,
    notifyInspectorPaymentForFinal,
    requestReinspection,
    confirmDirectPaymentForFinal,
} from '../../Redux/Actions/inspectionActions';
import { fetchWorkById } from '../../Redux/Actions/workActions';
import InspectionActionForm from './InspectionActionForm';
import { toast } from 'react-toastify';

const FinalInspectionFlowManager = ({ work, isVisible }) => {
    const dispatch = useDispatch();
    const [activeForm, setActiveForm] = useState(null);

    const {
        inspectionsByWork,
        loading: inspectionLoading,
        error: inspectionError,
    } = useSelector((state) => state.inspection);

    // Refs para depurar cambios de referencia (puedes comentarlos en producción)
    const inspectionsByWorkRef = useRef(inspectionsByWork);
    useEffect(() => {
        if (inspectionsByWorkRef.current !== inspectionsByWork) {
            console.warn('[FinalInspectionFlowManager] REFERENCIA DE inspectionsByWork CAMBIÓ!', { prev: inspectionsByWorkRef.current, current: inspectionsByWork });
            inspectionsByWorkRef.current = inspectionsByWork;
        }
    }, [inspectionsByWork]);

    const currentFinalInspection = useMemo(() => {
        if (!inspectionsByWork || inspectionsByWork.length === 0) {
            return null;
        }
        const finalInspections = inspectionsByWork
            .filter(insp => insp && insp.type === 'final')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Más reciente primero
        return finalInspections.length > 0 ? finalInspections[0] : null;
    }, [inspectionsByWork]);

    const currentFinalInspectionRef = useRef(currentFinalInspection);
    useEffect(() => {
        if (currentFinalInspectionRef.current !== currentFinalInspection) {
            console.warn('[FinalInspectionFlowManager] REFERENCIA DE currentFinalInspection CAMBIÓ!', { prev: currentFinalInspectionRef.current, current: currentFinalInspection });
            currentFinalInspectionRef.current = currentFinalInspection;
        }
    }, [currentFinalInspection]);

    // Efecto para cargar inspecciones
    useEffect(() => {
        if (work?.idWork && isVisible) {
            // console.log('[FinalInspectionFlowManager] Fetching inspections for work ID:', work.idWork);
            dispatch(fetchInspectionsByWork(work.idWork));
        }
    }, [dispatch, work?.idWork, isVisible]);

    // Determinar estados generales de la inspección final
    const finalInspectionApproved = useMemo(() =>
        currentFinalInspection?.finalStatus === 'approved' && currentFinalInspection?.type === 'final',
        [currentFinalInspection]);

    const finalInspectionRejected = useMemo(() =>
        currentFinalInspection?.finalStatus === 'rejected' && currentFinalInspection?.type === 'final',
        [currentFinalInspection]);

    // Manejador de envío de formularios
    const handleActionSubmit = async (itemId, actionCreator, formDataFromForm, successMsgContext) => {
        try {
            // Acciones que SIEMPRE deben enviar FormData (porque el backend usa Multer)
            const actionsAlwaysExpectingFormData = [
                requestFinalInspection,
                registerInspectorInvoiceForFinal, // si sube archivo de invoice
                confirmClientPaymentForFinal,     // si sube comprobante de pago
                registerInspectionResult,         // si sube documentos de resultado
                requestReinspection,              // si sube adjuntos para la reinspección
                requestFinalInspection,
                confirmDirectPaymentForFinal,           // si sube adjuntos para la solicitud final
                // Añade aquí otras acciones que usen Multer en el backend
            ];

            let dataToSend;
            const isActionExpectingFormData = actionsAlwaysExpectingFormData.includes(actionCreator);

            if (isActionExpectingFormData) {
                dataToSend = new FormData();
                for (const key in formDataFromForm) {
                    const value = formDataFromForm[key];
                    if (value !== null && value !== undefined) {
                        if (Array.isArray(value) && value.length > 0 && value.every(item => item instanceof File)) {
                            // Si es un array de Files (ej. para multiple file input)
                            value.forEach(file => {
                                dataToSend.append(key, file, file.name);
                            });
                        } else if (value instanceof File) {
                            // Si es un solo File
                            dataToSend.append(key, value, value.name);
                        } else if (typeof value === 'boolean' || typeof value === 'number' || (typeof value === 'string' && value.trim() !== '') || typeof value === 'object' && !Array.isArray(value) && value !== null) {
                            // Para otros tipos de datos (string, number, boolean, objetos que no son File/Array de Files)
                            // Si es un objeto (que no sea File), se stringifica. Considera si el backend espera esto.
                            // Para campos simples, usualmente son strings.
                            if (typeof value === 'object' && !(value instanceof File)) {
                                // Si es un objeto complejo y no un archivo, considera cómo el backend lo espera.
                                // Para FormData, usualmente los valores son strings o Blobs/Files.
                                // Si necesitas enviar un objeto JSON como string:
                                // dataToSend.append(key, JSON.stringify(value));
                                // Pero para campos simples, solo el valor string es suficiente.
                                dataToSend.append(key, String(value)); // Convertir a string por si acaso
                            } else {
                                dataToSend.append(key, value);
                            }
                        }
                        // Los campos vacíos o nulos (excepto Files) no se añaden,
                        // a menos que el backend los requiera explícitamente como strings vacíos.
                    }
                }
            } else {
                // Para acciones que esperan JSON
                dataToSend = { ...formDataFromForm };
            }

            // console.log(`[FinalInspectionFlowManager] Submitting action: ${successMsgContext}`, { itemId, actionCreatorName: actionCreator.name, dataToSend: isActionExpectingFormData ? 'FormData (ver consola para detalles)' : dataToSend });
            // if (isActionExpectingFormData) {
            //     for (let [key, value] of dataToSend.entries()) {
            //         console.log('[FormData Entry]', key, value);
            //     }
            // }

            let resultAction;
            // Thunks que esperan (itemId, dataToSend)
            const directDispatchActions = [
                registerInspectorInvoiceForFinal,
                requestFinalInspection,
                sendInvoiceToClientForFinal,
                confirmClientPaymentForFinal,
                notifyInspectorPaymentForFinal,
                registerInspectionResult,
                requestReinspection,
                confirmDirectPaymentForFinal,
            ];

            if (directDispatchActions.includes(actionCreator)) {
                resultAction = await dispatch(actionCreator(itemId, dataToSend));
            } else {
                // Si tienes otros thunks (ej. creados con createAsyncThunk) que esperan un solo objeto:
                console.warn(`[FinalInspectionFlowManager] Dispatching con formato de payload no estándar para ${actionCreator.name}. Asumiendo objeto { id: itemId, formData: dataToSend }`);
                resultAction = await dispatch(actionCreator({ id: itemId, formData: dataToSend }));
            }

            // Manejo de la respuesta y toasts (simplificado para brevedad, usa tu lógica existente)
            if (resultAction && (resultAction.error || resultAction.payload?.error)) {
                const errorMessage = resultAction.payload?.message || resultAction.error?.message || resultAction.message || `Error en ${successMsgContext}`;
                console.error(`[FinalInspectionFlowManager] Error en ${successMsgContext}:`, resultAction);
                toast.error(errorMessage);
            } else {
                const successMessage = resultAction?.payload?.message || resultAction?.message || `${successMsgContext} realizado con éxito.`;
                toast.success(successMessage);
                setActiveForm(null);
                if (work?.idWork) {
                    dispatch(fetchWorkById(work.idWork));
                    dispatch(fetchInspectionsByWork(work.idWork));
                }
            }

        } catch (err) { // Captura errores de la lógica de dispatch o construcción de FormData
            const errorData = err.response?.data;
            const errorMessage = errorData?.message || err.message || `Error inesperado en ${successMsgContext}`;
            console.error(`[FinalInspectionFlowManager] Error general en ${successMsgContext}:`, err);
            
            // ✅ Manejo especial para inspecciones ya procesadas
            if (errorData?.alreadyProcessed) {
                const processedDate = errorData.dateProcessed 
                    ? new Date(errorData.dateProcessed).toLocaleString('es-ES')
                    : 'fecha desconocida';
                    
                toast.error(`⚠️ Esta inspección ya fue procesada como "${errorData.existingStatus?.toUpperCase()}" el ${processedDate}. No se puede volver a registrar un resultado.`, {
                    duration: 6000
                });
            } else {
                toast.error(errorMessage);
            }
        }
    };

    // Componente para mostrar detalles de la inspección
    const renderFinalInspectionDetails = (inspection) => {
        if (!inspection) return null;

        const detailItemClass = "py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0";
        const detailLabelClass = "text-sm font-medium text-gray-600";
        const detailValueClass = "mt-1 text-sm text-gray-800 sm:mt-0 sm:col-span-2";
        const inspectionIdDisplay = inspection.idInspection ? inspection.idInspection.substring(0, 8) : 'N/A';

        return (
            <div className="mt-4 p-3 border rounded-md bg-gray-100">
                <h4 className="text-md font-semibold text-gray-700 mb-2">Detalles de Inspección Final (ID: {inspectionIdDisplay})</h4>
                <dl>
                    <div className={detailItemClass}>
                        <dt className={detailLabelClass}>Estado del Proceso</dt>
                        <dd className={detailValueClass}>{inspection.processStatus || 'N/A'}</dd>
                    </div>
                    <div className={detailItemClass}>
                        <dt className={detailLabelClass}>Estado Final</dt>
                        <dd className={detailValueClass}>{inspection.finalStatus || 'Pendiente'}</dd>
                    </div>

                    {inspection.invoiceFromInspectorUrl && (
                        <div className={detailItemClass}>
                            <dt className={detailLabelClass}>Invoice del Inspector</dt>
                            <dd className={detailValueClass}>
                                <a href={inspection.invoiceFromInspectorUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                                    Ver Invoice
                                </a>
                            </dd>
                        </div>
                    )}
                    {inspection.clientPaymentProofUrl && (
                        <div className={detailItemClass}>
                            <dt className={detailLabelClass}>Comprobante de Pago Cliente</dt>
                            <dd className={detailValueClass}>
                                <a href={inspection.clientPaymentProofUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                                    Ver Comprobante
                                </a>
                            </dd>
                        </div>
                    )}
                    {inspection.resultDocumentUrl && (
                        <div className={detailItemClass}>
                            <dt className={detailLabelClass}>Documento(s) de Resultado</dt>
                            <dd className={detailValueClass}>
                                {Array.isArray(inspection.resultDocumentUrl) ? (
                                    inspection.resultDocumentUrl.map((url, index) => (
                                        url && <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline block">
                                            Ver Documento {index + 1}
                                        </a>
                                    ))
                                ) : (
                                    inspection.resultDocumentUrl && <a href={inspection.resultDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                                        Ver Documento
                                    </a>
                                )}
                            </dd>
                        </div>
                    )}
                </dl>
            </div>
        );
    };

    // Memorización de objetos initialData
    const initialDataForRejection = useMemo(() => ({
        notes: `Re-solicitud de inspección final para obra ${work?.propertyAddress || 'N/A'}. Rechazo previo: ${currentFinalInspection?.notes || 'N/A'}`,
        originalInspectionId: currentFinalInspection?.idInspection,
        // Intenta obtener el email del inspector de la inspección rechazada si está en las notas
        inspectorEmail: currentFinalInspection?.notes?.match(/Inspector:\s*([\w@.-]+)/i)?.[1] || '',
        // Asume que selectedWorkImageId está disponible en el objeto 'work' si es necesario
        // Si no, necesitarás obtenerlo de otra manera (ej. props, selector de Redux)
        workImageId: work?.selectedWorkImageId || null
    }), [work, currentFinalInspection]);

    const initialDataForFinalResult = useMemo(() => ({
        finalStatus: 'approved' // Valor por defecto para el formulario
    }), []);

    // Si otros formularios necesitan initialData, definirlos aquí con useMemo:
    // const initialDataForFirstRequest = useMemo(() => ({ ... }), [work?.propertyAddress, ...]);
    // const initialDataForRegisterFinalInvoice = useMemo(() => ({ ... }), [currentFinalInspection?.someField, ...]);


    // Lógica para renderizar acciones y formularios
    const renderActionsForFinalInspection = () => {
        if (!work || !work.status) {
            return <p>Cargando datos de la obra...</p>;
        }

        if (finalInspectionApproved) {
            const resultDate = currentFinalInspection?.dateResultReceived 
                ? new Date(currentFinalInspection.dateResultReceived)
                : (currentFinalInspection?.updatedAt ? new Date(currentFinalInspection.updatedAt) : null);
            
            return (
                <div className="p-4 rounded-lg border-2 bg-green-50 border-green-500">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                            <span className="text-3xl">✅</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-lg font-bold text-green-800 mb-2">
                                Inspección Final APROBADA
                            </h4>
                            {resultDate && (
                                <p className="text-sm text-green-700 mb-1">
                                    <strong>Fecha:</strong> {resultDate.toLocaleDateString('es-ES', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </p>
                            )}
                            {resultDate && (
                                <p className="text-sm text-green-700 mb-2">
                                    <strong>Hora:</strong> {resultDate.toLocaleTimeString('es-ES', { 
                                        hour: '2-digit', 
                                        minute: '2-digit',
                                        second: '2-digit'
                                    })}
                                </p>
                            )}
                            {currentFinalInspection?.notes && (
                                <p className="text-sm text-green-800 mt-2">
                                    <strong>Notas:</strong> {currentFinalInspection.notes}
                                </p>
                            )}
                            <div className="mt-3 p-2 rounded bg-green-100 border border-green-300">
                                <p className="text-xs font-semibold text-green-900">
                                    ⚠️ Esta inspección ya ha sido procesada. No se puede volver a aprobar o rechazar.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (finalInspectionRejected) {
            const resultDate = currentFinalInspection?.dateResultReceived 
                ? new Date(currentFinalInspection.dateResultReceived)
                : (currentFinalInspection?.updatedAt ? new Date(currentFinalInspection.updatedAt) : null);
            
            return (
                <div>
                    <div className="p-4 rounded-lg border-2 bg-red-50 border-red-500 mb-4">
                        <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                                <span className="text-3xl">❌</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-lg font-bold text-red-800 mb-2">
                                    Inspección Final RECHAZADA
                                </h4>
                                {resultDate && (
                                    <p className="text-sm text-red-700 mb-1">
                                        <strong>Fecha:</strong> {resultDate.toLocaleDateString('es-ES', { 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}
                                    </p>
                                )}
                                {resultDate && (
                                    <p className="text-sm text-red-700 mb-2">
                                        <strong>Hora:</strong> {resultDate.toLocaleTimeString('es-ES', { 
                                            hour: '2-digit', 
                                            minute: '2-digit',
                                            second: '2-digit'
                                        })}
                                    </p>
                                )}
                                {currentFinalInspection?.notes && (
                                    <p className="text-sm text-red-800 mt-2">
                                        <strong>Notas del rechazo:</strong> {currentFinalInspection.notes}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setActiveForm('requestReinspectionAfterFinalRejection')} // Cambia el nombre del activeForm
                        className="font-bold py-2 px-4 rounded mb-2 bg-orange-500 hover:bg-orange-600 text-white"
                    >
                        Solicitar Reinspección Final {/* Cambia el texto del botón si quieres */}
                    </button>

                    {activeForm === 'requestReinspectionAfterFinalRejection' && (
                        <InspectionActionForm
                            actionType="requestReinspection" // <--- USA 'requestReinspection'
                            itemId={work.idWork} // itemId es work.idWork para requestReinspection
                            work={work}
                            inspection={currentFinalInspection} // Pasa la inspección rechazada para contexto
                            initialData={initialDataForRejection} // Usa el initialData modificado
                            onSubmit={(formData) => handleActionSubmit(work.idWork, requestReinspection, formData, 'Solicitud de Reinspección Final')} // <--- LLAMA A requestReinspection
                            isLoading={inspectionLoading}
                            onCancel={() => setActiveForm(null)}
                        />
                    )}
                </div>
            );
        }

        // Si no hay inspección final activa
        if (!currentFinalInspection) {
            const canRequestFinal = ['approvedInspection', 'finalRejected', 'paymentReceived', 'covered'].includes(work.status);
            if (canRequestFinal) {
                return (
                    <div>
                        <button
                            onClick={() => setActiveForm('requestFinalInspection')}
                            className="font-bold py-2 px-4 rounded mb-2 bg-green-500 hover:bg-green-600 text-white"
                        >
                            Solicitar Inspección Final
                        </button>
                        {activeForm === 'requestFinalInspection' && (
                            <InspectionActionForm
                                actionType="requestFinalInspection"
                                itemId={work.idWork}
                                work={work}
                                inspection={null} // No hay inspección actual
                                // initialData={initialDataForFirstRequest} // Descomentar y definir si es necesario
                                onSubmit={(formData) => handleActionSubmit(work.idWork, requestFinalInspection, formData, 'Solicitud de Inspección Final')}
                                isLoading={inspectionLoading}
                                onCancel={() => setActiveForm(null)}
                            />
                        )}
                    </div>
                );
            } else {
                return <p className="text-gray-600">La obra no está en un estado válido ({work.status}) para solicitar inspección final.</p>;
            }
        }

        // Flujo si ya existe una currentFinalInspection y no está aprobada/rechazada
        switch (currentFinalInspection?.processStatus) {
            case 'pending_final_request':
            case 'final_requested_to_inspector':
                return (
                    <div>
                        <p className="mb-2 text-yellow-700">Esperando invoice del inspector...</p>
                        <button onClick={() => setActiveForm('registerFinalInvoice')} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                            Registrar Invoice Inspector
                        </button>
                        {activeForm === 'registerFinalInvoice' && (
                            <InspectionActionForm
                                actionType="registerFinalInvoice"
                                itemId={currentFinalInspection.idInspection}
                                inspection={currentFinalInspection}
                                work={work}
                                // initialData={initialDataForRegisterFinalInvoice} // Descomentar y definir si es necesario
                                onSubmit={(formData) => handleActionSubmit(currentFinalInspection.idInspection, registerInspectorInvoiceForFinal, formData, 'Registro de Invoice del Inspector')}
                                isLoading={inspectionLoading}
                                onCancel={() => setActiveForm(null)}
                            />
                        )}
                    </div>
                );
            case 'final_invoice_received':
                return (
                    <div>
                        <p className="mb-2 text-green-700">Invoice del inspector recibido.</p>
                        {currentFinalInspection.invoiceFromInspectorUrl && (
                            <a href={currentFinalInspection.invoiceFromInspectorUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline block mb-2">
                                Ver Invoice del Inspector
                            </a>
                        )}
                        <button onClick={() => setActiveForm('sendInvoiceToClient')} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                            Enviar Invoice al Cliente
                        </button>
                        <button onClick={() => setActiveForm('directPaymentProof')} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded ml-2">
                            Subir Comprobante de Pago (Pago Directo)
                        </button>
                        {activeForm === 'sendInvoiceToClient' && (
                            <InspectionActionForm
                                actionType="sendInvoiceToClient"
                                itemId={currentFinalInspection.idInspection}
                                work={work}
                                inspection={currentFinalInspection}
                                onSubmit={(formData) => handleActionSubmit(currentFinalInspection.idInspection, sendInvoiceToClientForFinal, formData, 'Envío de Invoice al Cliente')}
                                isLoading={inspectionLoading}
                                onCancel={() => setActiveForm(null)}
                            />
                        )}
                        {activeForm === 'directPaymentProof' && (
                            <InspectionActionForm
                                key={`directPaymentProof-${currentFinalInspection?.idInspection || ''}`}
                                actionType="directPaymentProof"
                                itemId={currentFinalInspection.idInspection}
                                work={work}
                                inspection={currentFinalInspection}
                                onSubmit={(formData) => handleActionSubmit(currentFinalInspection.idInspection, confirmDirectPaymentForFinal, formData, 'Registro de Pago Directo')}
                                isLoading={inspectionLoading}
                                onCancel={() => setActiveForm(null)}
                            />
                        )}
                    </div>
                );
            case 'final_invoice_sent_to_client':
                return (
                    <div>
                        <p className="mb-2 text-yellow-700">Invoice enviado al cliente. Esperando confirmación de pago...</p>
                        <button onClick={() => setActiveForm('confirmClientPayment')} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                            Confirmar Pago Cliente
                        </button>
                        {activeForm === 'confirmClientPayment' && (
                            <InspectionActionForm
                                actionType="confirmClientPayment"
                                itemId={currentFinalInspection.idInspection}
                                inspection={currentFinalInspection}
                                work={work}
                                // initialData={...} // Descomentar y definir si es necesario
                                onSubmit={(formData) => handleActionSubmit(currentFinalInspection.idInspection, confirmClientPaymentForFinal, formData, 'Confirmación de Pago del Cliente')}
                                isLoading={inspectionLoading}
                                onCancel={() => setActiveForm(null)}
                            />
                        )}
                    </div>
                );
            case 'final_payment_confirmed':
                return (
                    <div>
                        <p className="mb-2 text-green-700">Pago del cliente confirmado. Notificar al inspector.</p>
                        <button onClick={() => setActiveForm('notifyInspectorPayment')} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                            Notificar Pago a Inspector
                        </button>
                        {activeForm === 'notifyInspectorPayment' && (
                            <InspectionActionForm
                                actionType="notifyInspectorPayment"
                                itemId={currentFinalInspection.idInspection}
                                inspection={currentFinalInspection}
                                work={work}
                                // initialData={...} // Descomentar y definir si es necesario
                                onSubmit={(formData) => handleActionSubmit(currentFinalInspection.idInspection, notifyInspectorPaymentForFinal, formData, 'Notificación de Pago al Inspector')}
                                isLoading={inspectionLoading}
                                onCancel={() => setActiveForm(null)}
                            />
                        )}
                    </div>
                );
            case 'final_payment_notified_to_inspector': // Inspector notificado, esperando resultado
            case 'inspection_completed_pending_result': // Estado genérico de inspección completada
                if (currentFinalInspection.type === 'final') {
                    return (
                        <div>
                            <p className="mb-2 text-blue-700">Esperando resultado de inspección final del inspector...</p>
                            <button onClick={() => setActiveForm('registerFinalResult')} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                                Registrar Resultado Inspección Final
                            </button>
                            {activeForm === 'registerFinalResult' && (
                                <InspectionActionForm
                                    actionType="registerResult" // Asegúrate que este actionType es manejado en InspectionActionForm
                                    itemId={currentFinalInspection.idInspection}
                                    inspection={currentFinalInspection}
                                    work={work}
                                    initialData={initialDataForFinalResult}
                                    onSubmit={(formData) => handleActionSubmit(currentFinalInspection.idInspection, registerInspectionResult, formData, 'Registro de Resultado Inspección Final')}
                                    isLoading={inspectionLoading}
                                    onCancel={() => setActiveForm(null)}
                                />
                            )}
                        </div>
                    );
                }
                break;
            default:
                return <p>Estado de proceso desconocido para inspección final: {currentFinalInspection?.processStatus || 'N/A'}</p>;
        }
        return null; // Fallback por si alguna rama del switch no retorna explícitamente
    };

    // Renderizado principal del componente
    if (!isVisible) {
        return null;
    }

    // Muestra carga inicial si no hay inspecciones y está cargando
    if (inspectionLoading && !currentFinalInspection && (!inspectionsByWork || inspectionsByWork.length === 0)) {
        return <p>Cargando información de inspección final...</p>;
    }

    // Muestra error si falló la carga inicial de inspecciones
    if (inspectionError && !currentFinalInspection && (!inspectionsByWork || inspectionsByWork.length === 0)) {
        const errorMessageString = typeof inspectionError === 'object' ? JSON.stringify(inspectionError) : String(inspectionError);
        return <p className="text-red-500">Error al cargar inspecciones: {errorMessageString}</p>;
    }

    return (
        <div className="my-6 p-4 border rounded-lg shadow-sm bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Gestión de Inspección Final</h3>

            {currentFinalInspection && renderFinalInspectionDetails(currentFinalInspection)}

            {!currentFinalInspection && !inspectionLoading && !finalInspectionApproved && !finalInspectionRejected && work && !['approvedInspection', 'finalRejected', 'paymentReceived', 'covered'].includes(work.status) && (
                <p className="text-gray-600">La obra no está en un estado válido ({work?.status || 'desconocido'}) para iniciar el flujo de inspección final o no hay una inspección final activa.</p>
            )}

            {renderActionsForFinalInspection()}
        </div>
    );
};
export default FinalInspectionFlowManager;