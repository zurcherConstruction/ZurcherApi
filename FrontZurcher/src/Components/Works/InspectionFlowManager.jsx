import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchInspectionsByWork,
    requestReinspection,
    requestInitialInspection,
    registerInspectorResponse,
    sendDocumentToApplicant,
    registerSignedApplicantDocument,
    registerInspectionResult,
} from '../../Redux/Actions/inspectionActions';
import InspectionActionForm from './InspectionActionForm';
import { fetchWorkById } from '../../Redux/Actions/workActions';

const InspectionFlowManager = ({ work, selectedWorkImageId, isVisible }) => {
    const dispatch = useDispatch();
    const { inspectionsByWork, selectedInspection, loading, error, successMessage } = useSelector((state) => state.inspection);
    const [activeForm, setActiveForm] = useState(null);

    const currentInitialInspection = useMemo(() => {
        const sortedInspections = [...inspectionsByWork].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return sortedInspections.find(insp => insp.type === 'initial');
    }, [inspectionsByWork]);

    console.log("currentInitialInspection en FlowManager:", currentInitialInspection);

    const initialRequestData = useMemo(() => ({
        workImageId: selectedWorkImageId
    }), [selectedWorkImageId]);

    const sendToApplicantInitialData = useMemo(() => ({}), []);
    const defaultInitialDataForForms = useMemo(() => ({}), []);

    // --- NUEVO: Hook para obtener la inspección original rechazada ---
    const originalRejectedInspection = useMemo(() => {
        if (currentInitialInspection?.originalInspectionId) {
            return inspectionsByWork.find(insp => insp.idInspection === currentInitialInspection.originalInspectionId);
        }
        return null;
    }, [currentInitialInspection, inspectionsByWork]);
    // --- FIN NUEVO ---

    useEffect(() => {
        if (work?.idWork) {
            dispatch(fetchInspectionsByWork(work.idWork));
        }
    }, [dispatch, work?.idWork]);

    const handleActionSubmit = async (itemId, actionCreator, formDataObject, errorMsgContext) => {
        try {
            let dataToSend = { ...formDataObject };
            let headers = { 'Content-Type': 'application/json' };
            console.log('[handleActionSubmit] formDataObject recibido:', formDataObject);

            // ✅ VALIDACIÓN específica para requestInitialInspection
            if (actionCreator === requestInitialInspection) {
                if (!dataToSend.inspectorEmail || !dataToSend.inspectorEmail.trim()) {
                    alert('Error: El email del inspector es requerido.');
                    return;
                }
                if (!selectedWorkImageId) {
                    alert('Error: Debe seleccionar una imagen de la obra antes de continuar.');
                    return;
                }
                // ✅ ASEGURAR que workImageId está presente para inspección inicial
                dataToSend.workImageId = selectedWorkImageId;
            }

            // ✅ AGREGAR validación específica para requestReinspection
            if (actionCreator === requestReinspection) {
                if (!dataToSend.inspectorEmail || !dataToSend.inspectorEmail.trim()) {
                    alert('Error: El email del inspector es requerido para la reinspección.');
                    return;
                }
                if (!selectedWorkImageId) {
                    alert('Error: Debe seleccionar una imagen de la obra antes de continuar.');
                    return;
                }
                if (!dataToSend.originalInspectionId) {
                    alert('Error: No se pudo determinar la inspección original para la reinspección.');
                    return;
                }
                // ✅ ASEGURAR que workImageId está presente para reinspección
                dataToSend.workImageId = selectedWorkImageId;
            }

            const actionInvolvesFiles = [
                registerInspectorResponse,
                registerSignedApplicantDocument,
                registerInspectionResult,
                requestReinspection,
            ].includes(actionCreator);

            if (actionInvolvesFiles) {
                console.log('[handleActionSubmit] La acción SÍ involucra archivos.');
                const fd = new FormData();
                const fileFieldKeys = [
                    'documentForApplicantFile',
                    'signedDocumentFile',
                    'resultDocumentFiles',
                    'reinspectionFiles',
                    'attachments'
                ];

                let hasFilesForValidation = false;

                Object.keys(dataToSend).forEach(key => {
                    const value = dataToSend[key];
                    if (fileFieldKeys.includes(key) && Array.isArray(value)) {
                        if (value.length > 0) {
                            hasFilesForValidation = true;
                            for (let i = 0; i < value.length; i++) {
                                if (value[i] instanceof File) {
                                    fd.append(key, value[i]);
                                    console.log(`🐛 DEBUG: Agregando archivo ${value[i].name} al FormData con key ${key}`);
                                }
                            }
                        }
                    } else if (value !== undefined && value !== null) {
                        fd.append(key, String(value));
                    }
                });

                // ✅ VALIDACIÓN específica para registerInspectorResponse
                if (actionCreator === registerInspectorResponse) {
                    if (!hasFilesForValidation) {
                        console.log('🐛 DEBUG: Validación falló - no hay archivos en FormData');
                        alert('Error: Debe cargar un documento para el aplicante antes de continuar.');
                        return;
                    }
                    console.log('🐛 DEBUG: Validación exitosa - archivos encontrados en FormData');
                }

                dataToSend = fd;
                headers = {};

                console.log('🐛 DEBUG FormData keys:', Array.from(fd.keys()));
                console.log('🐛 DEBUG FormData entries:', Array.from(fd.entries()).map(([key, value]) => [key, value instanceof File ? `File: ${value.name}` : value]));

            } else {
                console.log('[handleActionSubmit] La acción NO involucra archivos.');

                // ✅ LÓGICA SIMPLIFICADA para acciones sin archivos
                if (actionCreator === requestInitialInspection) {
                    // Para la inspección inicial, selectedWorkImageId es crucial
                    if (selectedWorkImageId && dataToSend.workImageId !== selectedWorkImageId) {
                        console.log(`[handleActionSubmit] Inspección inicial: Actualizando workImageId de ${dataToSend.workImageId} a ${selectedWorkImageId}`);
                        dataToSend.workImageId = selectedWorkImageId;
                    }
                }

                if (actionCreator === requestReinspection) {
                    // Para la reinspección, usar el selectedWorkImageId más reciente
                    if (selectedWorkImageId && dataToSend.workImageId !== selectedWorkImageId) {
                        console.log(`[handleActionSubmit] Reinspección: Actualizando workImageId de ${dataToSend.workImageId} a ${selectedWorkImageId}`);
                        dataToSend.workImageId = selectedWorkImageId;
                    }

                    // ✅ ASEGURAR que originalInspectionId está presente
                    if (formDataObject.originalInspectionId) {
                        dataToSend.originalInspectionId = formDataObject.originalInspectionId;
                    }
                }
            }

            // ✅ ENVIAR la acción
            const result = await dispatch(actionCreator(itemId, dataToSend, headers));

            // ✅ VERIFICAR si la acción falló
            if (result.error) {
                console.error('[handleActionSubmit] Error en la acción:', result.error);
                alert(`Error: ${result.error.message || 'No se pudo completar la operación'}`);
                return;
            }

            // ✅ Solo continuar si fue exitoso
            dispatch(fetchWorkById(work.idWork));
            if (work?.idWork) {
                dispatch(fetchInspectionsByWork(work.idWork));
            }
            setActiveForm(null);

        } catch (err) {
            console.error(errorMsgContext, err);
            const errorMessage = err.response?.data?.message || err.message || 'Error desconocido';
            alert(`${errorMsgContext}: ${errorMessage}`);
        }
    };

    const renderInspectionDetails = (inspectionToDetail) => {
        if (!inspectionToDetail) return <p className="text-gray-500 italic p-4">No hay información de inspección para esta obra.</p>;

        const detailItemClass = "py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0";
        const detailLabelClass = "text-sm font-medium text-gray-600";
        const detailValueClass = "mt-1 text-sm text-gray-800 sm:mt-0 sm:col-span-2";
        const isReinspection = !!inspectionToDetail.originalInspectionId;

        return (
            <div className="bg-white overflow-hidden rounded-lg mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-800 px-4 pt-4">
                    {isReinspection ? `Detalle Reinspección (ID: ${inspectionToDetail.idInspection})` : `Detalle Inspección (ID: ${inspectionToDetail.idInspection})`}
                </h3>
                <dl className="divide-y divide-gray-200 px-4">
                    <div className={detailItemClass}>
                        <dt className={detailLabelClass}>Estado del Proceso:</dt>
                        <dd className={detailValueClass}>
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${inspectionToDetail.processStatus === 'result_approved' ? 'bg-green-100 text-green-800' :
                                inspectionToDetail.processStatus === 'result_rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                {inspectionToDetail.processStatus?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
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

    // --- NUEVO: Función para renderizar el resumen de la inspección original ---
    const renderOriginalInspectionSummary = (originalInsp) => {
        if (!originalInsp) return null;

        const detailItemClass = "py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0";
        const detailLabelClass = "text-sm font-medium text-gray-600";
        const detailValueClass = "mt-1 text-sm text-gray-800 sm:mt-0 sm:col-span-2";

        return (
            <div className="my-4 p-4 border border-yellow-300 bg-yellow-50 rounded-lg shadow-sm">
                <h4 className="text-md font-semibold mb-2 text-yellow-700">Resumen de Inspección Original Rechazada (ID: {originalInsp.idInspection})</h4>
                <dl className="divide-y divide-gray-200 px-4">
                    <div className={detailItemClass}>
                        <dt className={detailLabelClass}>Resultado Original:</dt>
                        <dd className={`${detailValueClass} text-red-600 font-bold`}>
                            {originalInsp.finalStatus?.toUpperCase()}
                        </dd>
                    </div>
                    {originalInsp.dateInspectionPerformed && (
                        <div className={detailItemClass}>
                            <dt className={detailLabelClass}>Fecha Inspección Original:</dt>
                            <dd className={detailValueClass}>{new Date(originalInsp.dateInspectionPerformed).toLocaleDateString()}</dd>
                        </div>
                    )}
                    <div className={detailItemClass}>
                        <dt className={detailLabelClass}>Notas del Rechazo Original:</dt>
                        <dd className={`${detailValueClass} whitespace-pre-wrap`}>{originalInsp.notes || 'N/A'}</dd>
                    </div>
                    {/* Puedes añadir más campos si lo deseas, como documentos originales */}
                </dl>
            </div>
        );
    };
    // --- FIN NUEVO ---

    const reinspectionInitialData = useMemo(() => {
        if (!currentInitialInspection) return {};

        return {
            inspectorEmail: currentInitialInspection.inspectorEmail || '',
            originalInspectionId: currentInitialInspection.idInspection,
            workImageId: selectedWorkImageId || '', // ✅ AGREGAR esto
            notes: `Reinspección de la inspección inicial rechazada (ID: ${currentInitialInspection.idInspection.substring(0, 8)}...)`
        };
    }, [currentInitialInspection, selectedWorkImageId]);

    const renderActions = () => {
        console.log("[FlowManager] renderActions - INICIO. Work Status:", work?.status, "currentInitialInspection:", currentInitialInspection);

        if (!work || !work.status) {
            return <p>Cargando datos de la obra...</p>;
        }

        if (currentInitialInspection && currentInitialInspection.finalStatus === 'approved') {
            return <p className="text-green-700 font-semibold">Proceso de inspección inicial finalizado. Resultado: APROBADO.</p>;
        }

        const canRequestReinspectionStatus = ['firstInspectionPending', 'rejectedInspection'];
        if (currentInitialInspection && currentInitialInspection.finalStatus === 'rejected' && canRequestReinspectionStatus.includes(work.status)) {
            if (currentInitialInspection.workerHasCorrected) {
                return (
                    <div>
                        <p className="mb-2 text-orange-700 font-semibold">
                            ✅ El empleado ha marcado las correcciones como completadas.
                        </p>
                        <p className="text-sm text-gray-600 mb-4">
                            Ahora puedes solicitar una reinspección para verificar las correcciones.
                        </p>

                        <button
                            onClick={() => setActiveForm('requestReinspection')}
                            disabled={!selectedWorkImageId} // ✅ AGREGAR validación de imagen
                            className={`font-bold py-2 px-4 rounded mb-2 ${!selectedWorkImageId
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                                }`}
                        >
                            Solicitar Reinspección
                        </button>

                        {/* ✅ AGREGAR mensaje de requisito cuando no hay imagen seleccionada */}
                        {!selectedWorkImageId && (
                            <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-sm text-red-600 font-medium">⚠️ Requisito faltante:</p>
                                <p className="text-xs text-red-600">
                                    Debes seleccionar una imagen de "sistema instalado" en la sección de imágenes antes de solicitar la reinspección.
                                </p>
                            </div>
                        )}

                        {/* ✅ AGREGAR && selectedWorkImageId a la condición */}
                        {activeForm === 'requestReinspection' && selectedWorkImageId && (
                            <InspectionActionForm
                                actionType="requestReinspection"
                                initialData={reinspectionInitialData}
                                onSubmit={(formDataObject) => {
                                    console.log("[FlowManager] SUBMITTING requestReinspection con datos:", formDataObject);

                                    // ✅ AGREGAR validaciones antes del envío
                                    if (!formDataObject.inspectorEmail) {
                                        alert('Por favor, ingrese el email del inspector.');
                                        return;
                                    }
                                    if (!selectedWorkImageId) {
                                        alert('Por favor, seleccione una imagen de la obra antes de continuar.');
                                        return;
                                    }

                                    handleActionSubmit(work.idWork, requestReinspection, formDataObject, 'Error al solicitar reinspección');
                                }}
                                isLoading={loading}
                                inspection={currentInitialInspection}
                            />
                        )}
                    </div>
                );
            } else {
                return (
                    <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-md">
                        <p className="mb-2 text-yellow-700 font-semibold">
                            ¡Atención! La inspección inicial fue Rechazada.
                        </p>
                        <p className="text-sm text-yellow-600">
                            Esperando que el empleado realice las correcciones necesarias y las marque en la aplicación móvil.
                        </p>
                        <p className="text-sm text-gray-700 mt-2">
                            <span className="font-medium">Notas del Rechazo:</span> {currentInitialInspection.notes || "No hay notas detalladas."}
                        </p>
                    </div>
                );
            }
        }

        const canRequestInitialInspectionStatus = ['installed'];
        if ((!currentInitialInspection || !currentInitialInspection.finalStatus) && canRequestInitialInspectionStatus.includes(work.status)) {
            if (!currentInitialInspection || (currentInitialInspection && !currentInitialInspection.processStatus) || (currentInitialInspection && !currentInitialInspection.finalStatus && !['result_approved', 'result_rejected'].includes(currentInitialInspection.processStatus))) {
                return (
                    <div>
                        <button
                            onClick={() => setActiveForm('requestInitial')}
                            disabled={!selectedWorkImageId}
                            className={`font-bold py-2 px-4 rounded mb-2 ${!selectedWorkImageId ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                        >
                            Solicitar Inspección Inicial
                        </button>
                        {!selectedWorkImageId && (
                            <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-sm text-red-600 font-medium">⚠️ Requisito faltante:</p>
                                <p className="text-xs text-red-600">Debes seleccionar una imagen de "sistema instalado" en la sección de imágenes antes de solicitar la inspección.</p>
                            </div>
                        )}
                        {activeForm === 'requestInitial' && selectedWorkImageId && (
                            <InspectionActionForm
                                actionType="requestInitial"
                                initialData={initialRequestData}
                                onSubmit={(formDataObject) => {
                                    // ✅ VALIDACIÓN adicional antes del envío
                                    if (!formDataObject.inspectorEmail) {
                                        alert('Por favor, ingrese el email del inspector.');
                                        return;
                                    }
                                    if (!selectedWorkImageId) {
                                        alert('Por favor, seleccione una imagen de la obra antes de continuar.');
                                        return;
                                    }
                                    handleActionSubmit(work.idWork, requestInitialInspection, formDataObject, 'Error al solicitar inspección inicial')
                                }}
                                isLoading={loading}
                            />
                        )}
                    </div>
                );
            }
        }
        if (currentInitialInspection && !currentInitialInspection.finalStatus) {
            const inspectionForForm = currentInitialInspection;
            switch (inspectionForForm.processStatus) {
                case 'pending_request':
                    return (
                        <div>
                            <p className="mb-2 text-blue-700">Solicitud de inspección creada. Esperando respuesta de inspectores...</p>
                            <button onClick={() => setActiveForm('scheduleReceived')} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                                Registrar Respuesta de Inspector
                            </button>
                            {activeForm === 'scheduleReceived' && (
                                <InspectionActionForm
                                    inspection={inspectionForForm}
                                    actionType="scheduleReceived"
                                    initialData={defaultInitialDataForForms}
                                    onSubmit={(formData) => handleActionSubmit(inspectionForForm.idInspection, registerInspectorResponse, formData, 'Error al registrar respuesta del inspector')}
                                    isLoading={loading}
                                />
                            )}
                        </div>
                    );
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
                                    initialData={defaultInitialDataForForms}
                                    onSubmit={(formData) => handleActionSubmit(inspectionForForm.idInspection, registerInspectorResponse, formData, 'Error al registrar respuesta del inspector')}
                                    isLoading={loading}
                                />
                            )}
                        </div>
                    );
                case 'schedule_received':
                    return (
                        <div>
                            <p className="mb-2 text-green-700">Documento listo para enviar al aplicante.</p>
                            {inspectionForForm.documentForApplicantUrl ? (
                                <div className="my-3 p-3 border rounded-md bg-gray-100">
                                    <h4 className="text-md font-semibold mb-2">Documento a Enviar:</h4>

                                    <a
                                        href={inspectionForForm.documentForApplicantUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-600 hover:text-indigo-800 underline mt-2 block text-sm font-semibold"
                                    >
                                        Descargar Documento
                                    </a>
                                    <p className="text-xs text-gray-500 mt-1">Nombre del archivo: {inspectionForForm.documentForApplicantUrl.substring(inspectionForForm.documentForApplicantUrl.lastIndexOf('/') + 1)}</p>
                                </div>
                            ) : (
                                <p className="text-sm text-yellow-600">No hay documento disponible para enviar en este momento.</p>
                            )}
                            <button onClick={() => setActiveForm('sendToApplicant')} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                                Confirmar y Enviar Documento al Aplicante
                            </button>
                            {activeForm === 'sendToApplicant' && (
                                <InspectionActionForm
                                    inspection={inspectionForForm}
                                    actionType="sendToApplicant"
                                    initialData={sendToApplicantInitialData}
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
                                    initialData={defaultInitialDataForForms}
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
                            {inspectionForForm.originalInspectionId ? (
                                <p className="mb-2 text-blue-700 font-semibold">
                                    Reinspección en curso (ID Original: {inspectionForForm.originalInspectionId}).
                                    <br />
                                    Lista para registrar el resultado de la visita del inspector.
                                </p>
                            ) : (
                                <p className="mb-2 text-green-700">Documento firmado recibido. Listo para registrar resultado de inspección física.</p>
                            )}
                            <button
                                onClick={() => setActiveForm('registerResult')}
                                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                            >
                                Registrar Resultado de Inspección {inspectionForForm.originalInspectionId ? "(Reinspección)" : ""}
                            </button>
                            {activeForm === 'registerResult' && (
                                <InspectionActionForm
                                    inspection={inspectionForForm}
                                    actionType="registerResult"
                                    initialData={defaultInitialDataForForms}
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

        if (work.status !== 'installed' && work.status !== 'inprogress' && work.status !== 'rejectedInspection' && work.status !== 'reinspection_pending') {
            return <p className="text-gray-600">La obra no está en un estado que permita acciones de inspección en este momento (Estado actual: {work.status}).</p>;
        }
        return null;
    };

    if (!isVisible) {
        return null;
    }

    if (loading && inspectionsByWork.length === 0 && !selectedInspection) return <p>Cargando información de inspecciones...</p>;
    if (error) return <p className="text-red-500">Error: {error}</p>;

    return (
        <div className="my-6 p-4 border rounded-lg shadow-sm bg-gray-50">
            {successMessage && <p className="text-green-600 bg-green-100 p-2 rounded mb-3">{successMessage}</p>}

            {/* --- NUEVO: Mostrar resumen de la inspección original si aplica --- */}
            {currentInitialInspection?.originalInspectionId && originalRejectedInspection && renderOriginalInspectionSummary(originalRejectedInspection)}
            {/* --- FIN NUEVO --- */}

            {renderInspectionDetails(currentInitialInspection)}
            {renderActions()}
        </div>
    );
};


export default InspectionFlowManager;