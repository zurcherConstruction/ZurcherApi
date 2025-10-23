import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchFinalInvoiceByWorkId,
  createFinalInvoice,
  addExtraItemToInvoice,
   updateExtraItem, 
   removeExtraItem, 
  updateFinalInvoiceStatus,
   generateFinalInvoicePdf,
   emailFinalInvoice 
} from '../../Redux/Actions/finalInvoiceActions';
import { clearFinalInvoiceState, clearEmailMessage } from '../../Redux/Reducer/finalInvoiceReducer'; // Para limpiar al desmontar
import api from '../../utils/axios';

const ExtraItemRow = ({ item, onUpdate, onRemove, isEditing, onSave, onCancelEdit, editFormData, onEditFormChange }) => {
  if (isEditing) {
    return (
      <tr className="bg-yellow-50">
        <td><input type="text" name="description" value={editFormData.description} onChange={onEditFormChange} className="input-style text-xs p-1 w-full" /></td>
        <td><input type="number" name="quantity" value={editFormData.quantity} onChange={onEditFormChange} className="input-style text-xs p-1 w-16 text-right" min="0" step="0.01"/></td>
        <td><input type="number" name="unitPrice" value={editFormData.unitPrice} onChange={onEditFormChange} className="input-style text-xs p-1 w-20 text-right" min="0" step="0.01"/></td>
        <td className="text-right text-xs pr-2">${(parseFloat(editFormData.quantity || 0) * parseFloat(editFormData.unitPrice || 0)).toFixed(2)}</td>
        <td className="text-center">
          <button onClick={() => onSave(item.id)} className="text-green-600 hover:text-green-800 text-xs mr-1">Guardar</button>
          <button onClick={onCancelEdit} className="text-gray-500 hover:text-gray-700 text-xs">Cancelar</button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="text-xs py-1">{item.description}</td>
      <td className="text-center text-xs">{parseFloat(item.quantity).toFixed(2)}</td>
      <td className="text-right text-xs pr-2">${parseFloat(item.unitPrice).toFixed(2)}</td>
      <td className="text-right text-xs pr-2 font-medium">${parseFloat(item.lineTotal).toFixed(2)}</td>
      <td className="text-center">
        <button onClick={() => onUpdate(item)} className="text-blue-600 hover:text-blue-800 text-xs mr-1">Editar</button> 
         <button onClick={() => onRemove(item.id)} className="text-red-500 hover:text-red-700 text-xs">Eliminar</button>
         
      </td>
    </tr>
  );
};


const FinalInvoiceComponent = ({ workId }) => {
  //   const [pdfActionLoading, setPdfActionLoading] = useState(false);
  // const [pdfActionError, setPdfActionError] = useState(null);
  const dispatch = useDispatch();
  const {
    currentInvoice,
    loading, 
    error,
    loadingPdf, 
    errorPdf,
    loadingEmail,
    emailSuccessMessage,
    errorEmail
   } = useSelector((state) => state.finalInvoice);
  const { selectedWork } = useSelector((state) => state.work);

  const [newItem, setNewItem] = useState({ description: '', quantity: 1, unitPrice: 0 });
  const [editingItemId, setEditingItemId] = useState(null);
  const [editFormData, setEditFormData] = useState({ description: '', quantity: 0, unitPrice: 0 });
  const [recipientEmail, setRecipientEmail] = useState(''); 

  // Estado para la carga y error de la descarga del PDF
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadPdfError, setDownloadPdfError] = useState(null);
 const [isPreviewing, setIsPreviewing] = useState(false);
  const [selectedChangeOrderIds, setSelectedChangeOrderIds] = useState([]);
  
  useEffect(() => {
    if (workId) {
     
      dispatch(fetchFinalInvoiceByWorkId(workId));
    }
    
    return () => {
      dispatch(clearFinalInvoiceState());
    };
  }, [dispatch, workId]);


   const changeOrders = selectedWork?.changeOrders || [];

  // Filtrar Change Orders que son 'approved' y no están ya en la factura como extraItems
  const addableChangeOrders = useMemo(() => {
    if (!currentInvoice || !changeOrders.length) return [];

    const approvedCOs = changeOrders.filter(co => co.status === 'approved');
    const existingExtraItemDescriptions = currentInvoice.extraItems?.map(item => item.description.toLowerCase()) || [];
    
    return approvedCOs.filter(co => {
        // Crear un identificador único para el CO basado en su número o ID, y descripción
        // Este identificador debe ser similar al que se usa en el backend al agregar COs automáticamente
        const coDescriptionFragment = `Change Order #${co.changeOrderNumber || co.id?.substring(0,8)}`.toLowerCase();
        return !existingExtraItemDescriptions.some(desc => desc.includes(coDescriptionFragment));
    });
  }, [currentInvoice, changeOrders, selectedWork]); // selectedWork añadido como dependencia por si changeOrders cambia

  const handleToggleChangeOrderSelection = (coId) => {
    setSelectedChangeOrderIds(prevSelected =>
        prevSelected.includes(coId)
            ? prevSelected.filter(id => id !== coId)
            : [...prevSelected, coId]
    );
  };

  const handleAddSelectedChangeOrders = () => {
    if (!currentInvoice || selectedChangeOrderIds.length === 0) return;

    selectedChangeOrderIds.forEach(coId => {
        const co = changeOrders.find(c => c.id === coId);
        if (co) {
            const itemData = {
                description: `Change Order #${co.changeOrderNumber || co.id?.substring(0,8)}: ${co.itemDescription || co.description || 'Detalle de Orden de Cambio'}`,
                quantity: 1, // Los COs generalmente se añaden como una unidad global
                unitPrice: parseFloat(co.totalCost) || 0,
            };
            // Solo añadir si tiene un costo válido
            if (itemData.unitPrice > 0 || (itemData.unitPrice === 0 && window.confirm(`La Orden de Cambio #${co.changeOrderNumber || co.id?.substring(0,8)} tiene costo $0. ¿Añadir de todas formas?`))) {
                 dispatch(addExtraItemToInvoice({ finalInvoiceId: currentInvoice.id, itemData }));
            } else if (itemData.unitPrice < 0) {
                 alert(`La Orden de Cambio #${co.changeOrderNumber || co.id?.substring(0,8)} tiene un costo negativo y no se puede añadir.`);
            }
        }
    });
    setSelectedChangeOrderIds([]); // Limpiar selección después de añadir
  };

  const handleCreateInvoice = () => {
    if (window.confirm('¿Seguro que quieres generar la factura final para esta obra?')) {
      dispatch(createFinalInvoice(workId));
    }
  };

  const handleNewItemChange = (e) => {
    const { name, value } = e.target;
    const isNumeric = ['quantity', 'unitPrice'].includes(name);
    setNewItem(prev => ({ ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value }));
  };

  const handleAddExtraItem = (e) => {
    e.preventDefault();
    if (!newItem.description || newItem.quantity <= 0 || newItem.unitPrice <= 0) {
      alert('Completa descripción, cantidad (>0) y precio unitario (>0) del item extra.');
      return;
    }
    if (currentInvoice) {
      dispatch(addExtraItemToInvoice({ finalInvoiceId: currentInvoice.id, itemData: newItem }));
      setNewItem({ description: '', quantity: 1, unitPrice: 0 }); 
    }
  };


  const handleEditClick = (item) => {
    setEditingItemId(item.id);
    setEditFormData({ description: item.description, quantity: item.quantity, unitPrice: item.unitPrice });
  };
  const handleCancelEdit = () => {
    setEditingItemId(null);
  };
  const handleEditFormChange = (e) => {
     const { name, value } = e.target;
     const isNumeric = ['quantity', 'unitPrice'].includes(name);
     setEditFormData(prev => ({ ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value }));
  };
  const handleSaveEdit = (itemId) => {
    dispatch(updateExtraItem({ itemId, itemData: editFormData }));
    console.warn("Update item functionality not fully implemented yet.");
    setEditingItemId(null); 
  };
  const handleRemoveItem = (itemId) => {
    if (window.confirm('¿Seguro que quieres eliminar este item extra?')) {
       dispatch(removeExtraItem(itemId));
      console.warn("Remove item functionality not fully implemented yet.");
    }
  };
 

   const handleMarkAsPaid = () => {
    if (currentInvoice && window.confirm('¿Marcar esta factura como Pagada?')) {
        // Generar fecha local
        const now = new Date();
        const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        dispatch(updateFinalInvoiceStatus({
            finalInvoiceId: currentInvoice.id,
            statusData: { status: 'paid', paymentDate: localDate }
        }));
    }
};

const handleGeneratePdf = () => {
    if (currentInvoice) {
      dispatch(generateFinalInvoicePdf(currentInvoice.id));
    }
  };

   const handlePreviewPdf = async () => {
    if (!currentInvoice?.id) return;

    setIsPreviewing(true);
    const previewUrl = `/final-invoice/${currentInvoice.id}/preview-pdf`;

    try {
      const response = await api.get(previewUrl, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const objectUrl = window.URL.createObjectURL(blob);
      window.open(objectUrl, '_blank');
      window.URL.revokeObjectURL(objectUrl); // Limpia la URL del objeto después de abrirla
    } catch (err) {
      console.error("Error al generar la vista previa del PDF:", err);
      alert("No se pudo generar la vista previa del PDF. Por favor, inténtalo de nuevo.");
    } finally {
      setIsPreviewing(false);
    }
  };

  
 const handleDownloadPdf = async () => {
    if (!currentInvoice?.id) {
      setDownloadPdfError("No hay ID de factura para descargar.");
      return;
    }

    setIsDownloadingPdf(true);
    setDownloadPdfError(null);
    const downloadUrl = `/final-invoice/${currentInvoice.id}/pdf/download`; // Ruta del backend

    try {
      // Usar la instancia de 'api' (axios) para que envíe el token
      const response = await api.get(downloadUrl, {
        responseType: 'blob', // Importante para manejar archivos
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `final_invoice_${currentInvoice.id}.pdf`); // Nombre del archivo
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link); // Limpiar el enlace
      window.URL.revokeObjectURL(url); // Limpiar el objeto URL

    } catch (err) {
      console.error("Error durante la descarga del PDF:", err);
      let errorMessage = "Error al descargar el PDF.";
      if (err.response) {
        if (err.response.data instanceof Blob && err.response.data.type === "application/json") {
            try {
                const errorJson = JSON.parse(await err.response.data.text());
                errorMessage = errorJson.message || errorJson.error || errorMessage;
            } catch (parseError) { /* Mantener mensaje genérico */ }
        } else if (err.response.data?.message) {
            errorMessage = err.response.data.message;
        } else if (err.response.status === 401) {
            errorMessage = "No autorizado. Por favor, inicia sesión de nuevo.";
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setDownloadPdfError(errorMessage);
    } finally {
      setIsDownloadingPdf(false);
    }
  };
  

  const handleSendEmail = () => {
    console.log("handleSendEmail - currentInvoice:", currentInvoice);
    if (currentInvoice && currentInvoice.id && currentInvoice.pdfPath) { // Asegurarse que pdfPath existe
      if (recipientEmail && !/\S+@\S+\.\S+/.test(recipientEmail)) {
        alert('Por favor, ingresa un correo electrónico válido o déjalo vacío para usar el del cliente.');
        return;
      }
      if (window.confirm(`¿Enviar factura a ${recipientEmail || 'cliente principal'}?`)) {
        console.log("Dispatching emailFinalInvoice with ID:", currentInvoice.id);
        dispatch(emailFinalInvoice({ finalInvoiceId: currentInvoice.id, recipientEmail: recipientEmail || undefined }));
        setRecipientEmail('');
      }
    } else {
        console.error("Error: No se puede enviar email porque la información de la factura (ID o PDF) no está cargada.", currentInvoice);
        alert("Error: No se puede enviar el correo. Asegúrate de que la factura y su PDF estén generados.");
    }
  };

 // Limpiar mensajes de email al desmontar o cuando cambie el mensaje
 useEffect(() => {
    // Si hay un mensaje, limpiarlo después de un tiempo (ej: 5 segundos)
    let timer;
    if (emailSuccessMessage || errorEmail) {
        timer = setTimeout(() => {
            dispatch(clearEmailMessage());
        }, 5000); // 5 segundos
    }
    // Limpieza al desmontar
    return () => clearTimeout(timer);
  }, [emailSuccessMessage, errorEmail, dispatch]);





  // --- Renderizado ---
  if (loading) return <p className="text-blue-600">Cargando factura final...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  // Si no hay factura, mostrar botón para crearla
  if (!currentInvoice) {
    return (
      <div className="text-center">
        <p className="mb-4 text-gray-600">Aún no se ha generado la factura final para esta obra.</p>
        <button
          onClick={handleCreateInvoice}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          disabled={loading} // Deshabilitar mientras carga
        >
          {loading ? 'Generando...' : 'Generar Factura Final'}
        </button>
      </div>
    );
  }

  // Si la factura existe, mostrar detalles
  const budget = selectedWork?.budget; // Acceder al budget desde el work seleccionado

  return (
    <div className="space-y-6">
      {/* Resumen Financiero */}
      <div className="bg-gray-50 p-4 rounded border border-gray-200">
        <h3 className="text-lg font-semibold mb-3 border-b pb-2">Invoice Final #{currentInvoice.invoiceNumber || currentInvoice.id}</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-gray-600">Total Budget:</span>
          <span className="text-right font-medium">${parseFloat(currentInvoice.originalBudgetTotal || 0).toFixed(2)}</span>

          <span className="text-gray-600">Initial Payment:</span>
          <span className="text-right font-medium text-green-600">-${parseFloat(currentInvoice.initialPaymentMade || 0).toFixed(2)}</span>

          <span className="text-gray-600">Subtotal Items Extras:</span>
          <span className="text-right font-medium text-orange-600">+${parseFloat(currentInvoice.subtotalExtras || 0).toFixed(2)}</span>

          <span className="text-gray-800 font-bold text-base border-t pt-1 mt-1">Monto Final Pendiente:</span>
          <span className="text-right font-bold text-base border-t pt-1 mt-1">${parseFloat(currentInvoice.finalAmountDue || 0).toFixed(2)}</span>

          <span className="text-gray-600 mt-2">State:</span>
          <span className={`text-right font-semibold mt-2 ${
            currentInvoice.status === 'paid' ? 'text-green-700' :
            currentInvoice.status === 'pending' ? 'text-orange-700' :
            currentInvoice.status === 'cancelled' ? 'text-red-700' : 'text-gray-700'
          }`}>
            {currentInvoice.status?.replace('_', ' ').toUpperCase()}
          </span>
           {currentInvoice.status === 'paid' && currentInvoice.paymentDate && (
             <>
                <span className="text-gray-600 text-xs">Fecha Pago:</span>
                <span className="text-right text-xs">{new Date(currentInvoice.paymentDate + 'T00:00:00').toLocaleDateString()}</span>
             </>
           )}
        </div>
         {/* Botón Marcar como Pagada */}
         {/* {currentInvoice.status === 'pending' && (
            <div className="mt-4 text-center">
                <button
                    onClick={handleMarkAsPaid}
                    className="bg-teal-500 hover:bg-teal-600 text-white text-sm py-1 px-3 rounded"
                    disabled={loading}
                >
                    Marcar como Pagada
                </button>
            </div>
        )} */}
      </div>

      {/* Items Extras */}
      <div className="bg-gray-50 p-4 rounded border border-gray-200">
        <h3 className="text-lg font-semibold mb-3 border-b pb-2">Items Extras Añadidos</h3>
        {currentInvoice.extraItems && currentInvoice.extraItems.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-200 text-xs uppercase">
                <th className="py-1 px-2">Descripción</th>
                <th className="text-center">Cant.</th>
                <th className="text-right pr-2">P. Unit.</th>
                <th className="text-right pr-2">Total</th>
                <th className="text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {currentInvoice.extraItems.map(item => (
                <ExtraItemRow
                  key={item.id}
                  item={item}
                  isEditing={editingItemId === item.id}
                  editFormData={editFormData}
                  onUpdate={handleEditClick} // Cambiado para iniciar edición
                  onRemove={handleRemoveItem}
                  onSave={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onEditFormChange={handleEditFormChange}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 text-sm">No hay items extras añadidos.</p>
        )}

        {/* Formulario para añadir nuevo item extra (solo si no está pagada/cancelada) */}
        {currentInvoice.status !== 'paid' && currentInvoice.status !== 'cancelled' && (
          <form onSubmit={handleAddExtraItem} className="mt-4 pt-4 border-t space-y-2">
            <h4 className="text-md font-semibold">Añadir Nuevo Item Extra</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
              <div className="md:col-span-2">
                <label htmlFor="newDesc" className="block text-xs font-medium text-gray-600">Descripción</label>
                <input type="text" id="newDesc" name="description" value={newItem.description} onChange={handleNewItemChange} className="input-style w-full" required />
              </div>
              <div>
                <label htmlFor="newQty" className="block text-xs font-medium text-gray-600">Cantidad</label>
                <input type="number" id="newQty" name="quantity" value={newItem.quantity} onChange={handleNewItemChange} className="input-style w-full" min="0.01" step="0.01" required />
              </div>
              <div>
                <label htmlFor="newPrice" className="block text-xs font-medium text-gray-600">Precio Unit.</label>
                <input type="number" id="newPrice" name="unitPrice" value={newItem.unitPrice} onChange={handleNewItemChange} className="input-style w-full" min="0.01" step="0.01" required />
              </div>
            </div>
             <button type="submit" className="button-add-item mt-2 bg-blue-500 p-2 rounded text-sm text-white" disabled={loading}>
               {loading ? 'Añadiendo...' : 'Añadir Item '}
             </button>
          </form>
        )}
      {/* SECCIÓN PARA AÑADIR ÓRDENES DE CAMBIO */}
      {currentInvoice && currentInvoice.status !== 'paid' && currentInvoice.status !== 'cancelled' && addableChangeOrders.length > 0 && (
        <div className="bg-gray-50 p-4 rounded border border-gray-200 mt-6">
            <h3 className="text-lg font-semibold mb-3 border-b pb-2">Añadir Change Orders Aprobadas</h3>
            <div className="space-y-2">
                {addableChangeOrders.map(co => (
                    <div key={co.id} className="flex items-center justify-between p-2 border rounded bg-white hover:bg-gray-100">
                        <div>
                            <label htmlFor={`co-${co.id}`} className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    id={`co-${co.id}`}
                                    checked={selectedChangeOrderIds.includes(co.id)}
                                    onChange={() => handleToggleChangeOrderSelection(co.id)}
                                    className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm">
                                    CO #{co.changeOrderNumber || co.id?.substring(0,8)}: {co.itemDescription || co.description || 'Sin descripción específica'}
                                    <span className="text-xs text-gray-600 ml-2 font-medium">(Total: ${parseFloat(co.totalCost || 0).toFixed(2)})</span>
                                </span>
                            </label>
                        </div>
                    </div>
                ))}
            </div>
            {selectedChangeOrderIds.length > 0 && (
                <button
                    onClick={handleAddSelectedChangeOrders}
                    className="button-add-item mt-4 bg-orange-500 hover:bg-orange-600" // Estilo similar al de añadir item, o uno nuevo
                    disabled={loading} // Puedes usar el 'loading' general o uno específico si lo creas
                >
                    {loading ? 'Procesando...' : `Añadir ${selectedChangeOrderIds.length} Órden(es) de Cambio Seleccionada(s)`}
                </button>
            )}
        </div>
      )}

      </div>

    {/* --- Opciones de Factura --- */}
    <div className="bg-gray-50 p-4 rounded border border-gray-200 mt-6">
         <h3 className="text-lg font-semibold mb-3 border-b pb-2">Opciones de Factura</h3>
         <div className="space-y-3">

            {/* Generar/Actualizar PDF */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleGeneratePdf}
                className="button-standard bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-3 rounded disabled:opacity-50"
                disabled={loadingPdf || isDownloadingPdf || isPreviewing}
              >
                {loadingPdf ? 'Procesando...' : (currentInvoice?.pdfPath ? 'Actualizar Invoice PDF' : 'Generar Invoice PDF')}
              </button>
              
              {/* ✅ PASO 3: AÑADE EL NUEVO BOTÓN DE VISTA PREVIA */}
              {currentInvoice?.id && (
                <button
                  onClick={handlePreviewPdf}
                  className="button-standard bg-gray-500 hover:bg-gray-600 text-white text-sm py-1 px-3 rounded disabled:opacity-50"
                  disabled={loadingPdf || isDownloadingPdf || isPreviewing}
                >
                  {isPreviewing ? 'Cargando...' : 'Vista Previa'}
                </button>
              )}
            </div>
            {errorPdf && <p className="text-red-500 text-xs mt-1 ml-2">{errorPdf}</p>}


            {/* Ver y Descargar PDF (si existe) */}
            {currentInvoice?.pdfPath && currentInvoice.id && (
              <div className="flex items-center space-x-4">
                {/* {currentInvoice.pdfUrl && (
                  <button
                    onClick={() => window.open(currentInvoice.pdfUrl, '_blank')}
                    className="text-sm text-green-600 hover:text-green-800 underline disabled:opacity-50"
                    disabled={loadingPdf || isDownloadingPdf}
                  >
                    Ver PDF
                  </button>
                )} */}
                {/* BOTÓN DE DESCARGA ACTUALIZADO */}
                <button
                  onClick={handleDownloadPdf}
                  className="text-sm text-purple-600 hover:text-purple-800 underline disabled:opacity-50"
                  disabled={isDownloadingPdf || loadingPdf} // Deshabilitar si se está descargando o generando PDF
                >
                  {isDownloadingPdf ? 'Descargando...' : 'Descargar Invoice PDF'}
                </button>
              </div>
            )}
            {downloadPdfError && <p className="text-red-500 text-xs mt-1">{downloadPdfError}</p>}


            {/* Enviar por Email */}
            {currentInvoice?.pdfPath && (
               <div className="pt-3 border-t">
                  {/* ... (código existente para enviar email) ... */}
                  <label htmlFor="recipientEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Enviar PDF por Email (Opcional: dejar vacío para usar email del cliente)
                  </label>
                  <div className="flex items-center space-x-2">
                     <input
                        type="email"
                        id="recipientEmail"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="ejemplo@dominio.com"
                        className="input-style flex-grow text-sm"
                        disabled={loadingEmail || loadingPdf || isDownloadingPdf}
                     />
                     <button
                        onClick={handleSendEmail}
                        className="button-standard bg-teal-500 hover:bg-teal-600 text-white text-sm py-1 px-3 rounded disabled:opacity-50"
                        disabled={loadingEmail || loadingPdf || isDownloadingPdf || !currentInvoice?.pdfPath} 
                     >
                        {loadingEmail ? 'Enviando...' : 'Enviar'}
                     </button>
                  </div>
                  {emailSuccessMessage && <p className="text-green-600 text-xs mt-1">{emailSuccessMessage}</p>}
                  {errorEmail && <p className="text-red-500 text-xs mt-1">{errorEmail}</p>}
               </div>
            )}
         </div>
      </div>
    </div>
  );
};


export default FinalInvoiceComponent;