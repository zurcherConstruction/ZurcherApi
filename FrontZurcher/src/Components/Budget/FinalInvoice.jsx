import React, { useEffect, useState } from 'react';
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
    const [pdfActionLoading, setPdfActionLoading] = useState(false);
  const [pdfActionError, setPdfActionError] = useState(null);
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

 
  useEffect(() => {
    if (workId) {
      console.log("FinalInvoiceComponent: Fetching invoice for workId", workId);
      dispatch(fetchFinalInvoiceByWorkId(workId));
    }
    
    return () => {
      dispatch(clearFinalInvoiceState());
    };
  }, [dispatch, workId]);

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
        dispatch(updateFinalInvoiceStatus({
            finalInvoiceId: currentInvoice.id,
            statusData: { status: 'paid', paymentDate: new Date().toISOString().split('T')[0] }
        }));
    }
};

const handleGeneratePdf = () => {
    if (currentInvoice) {
      dispatch(generateFinalInvoicePdf(currentInvoice.id));
    }
  };

  
  const handlePdfAction = async (actionType) => {
    if (!currentInvoice?.id) return;

    setPdfActionLoading(true);
    setPdfActionError(null);
    const endpoint = `/final-invoice/${currentInvoice.id}/pdf/${actionType}`; 

    try {
      const response = await api.get(endpoint, {
        responseType: 'blob', 
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      if (actionType === 'view') {
        window.open(url); 
        
      } else if (actionType === 'download') {
        const link = document.createElement('a');
        link.href = url;
        // Crear nombre de archivo sugerido
        link.setAttribute('download', `final_invoice_${currentInvoice.id}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link); // Limpiar
      }

     
      setTimeout(() => window.URL.revokeObjectURL(url), 100);

    } catch (err) {
      console.error(`Error during PDF ${actionType}:`, err);
    
      let errorMessage = `Error al ${actionType === 'view' ? 'ver' : 'descargar'} el PDF.`;
      if (err.response && err.response.data instanceof Blob && err.response.data.type === "application/json") {
          try {
              const errorJson = JSON.parse(await err.response.data.text());
              errorMessage = errorJson.message || errorMessage;
          } catch (parseError) {
              
          }
      } else if (err.response && err.response.data?.message) {
          errorMessage = err.response.data.message;
      } else if (err.message) {
          errorMessage = err.message;
      }
      setPdfActionError(errorMessage);
    } finally {
      setPdfActionLoading(false);
    }
  };

  const handleSendEmail = () => {
    // Añadir log para depurar
    console.log("handleSendEmail - currentInvoice:", currentInvoice);

    if (currentInvoice && currentInvoice.id) { // <-- Verifica también currentInvoice.id
      // Validar email si se ingresó uno
      if (recipientEmail && !/\S+@\S+\.\S+/.test(recipientEmail)) {
        alert('Por favor, ingresa un correo electrónico válido o déjalo vacío para usar el del cliente.');
        return;
      }
      if (window.confirm(`¿Enviar factura a ${recipientEmail || 'cliente principal'}?`)) {
        console.log("Dispatching emailFinalInvoice with ID:", currentInvoice.id); // Log antes de despachar
        dispatch(emailFinalInvoice({ finalInvoiceId: currentInvoice.id, recipientEmail: recipientEmail || undefined }));
        // Limpiar el campo después de intentar enviar
        setRecipientEmail('');
      }
    } else {
        console.error("Error: No se puede enviar email porque currentInvoice o currentInvoice.id no está definido.", currentInvoice);
        alert("Error: No se puede enviar el correo porque la información de la factura no está cargada correctamente.");
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
        <h3 className="text-lg font-semibold mb-3 border-b pb-2">Invoice Final #{currentInvoice.id}</h3>
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
         {currentInvoice.status === 'pending' && (
            <div className="mt-4 text-center">
                <button
                    onClick={handleMarkAsPaid}
                    className="bg-teal-500 hover:bg-teal-600 text-white text-sm py-1 px-3 rounded"
                    disabled={loading}
                >
                    Marcar como Pagada
                </button>
            </div>
        )}
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
             <button type="submit" className="button-add-item mt-2" disabled={loading}>
               {loading ? 'Añadiendo...' : 'Añadir Item Extra'}
             </button>
          </form>
        )}
      </div>

     {/* --- ACTUALIZADO: Opciones Adicionales (PDF, Email) --- */}
     <div className="bg-gray-50 p-4 rounded border border-gray-200 mt-6">
         <h3 className="text-lg font-semibold mb-3 border-b pb-2">Opciones de Factura</h3>
         <div className="space-y-3">

            {/* Generar/Actualizar PDF */}
            <div>
              <button
                onClick={handleGeneratePdf}
                className="button-standard bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-3 rounded disabled:opacity-50"
                disabled={loadingPdf || !currentInvoice || pdfActionLoading} // Deshabilitar si otra acción PDF está en curso
              >
                {loadingPdf ? 'Generando PDF...' : (currentInvoice?.pdfPath ? 'Actualizar PDF' : 'Generar PDF')}
              </button>
              {errorPdf && <p className="text-red-500 text-xs mt-1 ml-2">{errorPdf}</p>}
            </div>

            {/* Ver y Descargar PDF (si existe) - AHORA SON BOTONES */}
            {currentInvoice?.pdfPath && ( // Solo mostrar si el PDF existe en la BD
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handlePdfAction('view')}
                  className="text-sm text-green-600 hover:text-green-800 underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                  disabled={pdfActionLoading || loadingPdf} // Deshabilitar si se está generando/viendo/descargando
                >
                  {pdfActionLoading && 'Cargando...'}
                  {!pdfActionLoading && 'Ver PDF'}
                </button>
                <button
                  onClick={() => handlePdfAction('download')}
                  className="text-sm text-purple-600 hover:text-purple-800 underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                  disabled={pdfActionLoading || loadingPdf} // Deshabilitar si se está generando/viendo/descargando
                >
                   {pdfActionLoading && 'Cargando...'}
                   {!pdfActionLoading && 'Descargar PDF'}
                </button>
              </div>
            )}
            {/* Mostrar error específico de Ver/Descargar */}
            {pdfActionError && <p className="text-red-500 text-xs mt-1">{pdfActionError}</p>}


            {/* Enviar por Email */}
            {currentInvoice?.pdfPath && (
               <div className="pt-3 border-t">
                  {/* ... (Input y botón de enviar email sin cambios) ... */}
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
                        disabled={loadingEmail || pdfActionLoading || loadingPdf} // Deshabilitar si hay acciones PDF/Email en curso
                     />
                     <button
                        onClick={handleSendEmail}
                        className="button-standard bg-teal-500 hover:bg-teal-600 text-white text-sm py-1 px-3 rounded disabled:opacity-50"
                        disabled={loadingEmail || !currentInvoice?.pdfPath || pdfActionLoading || loadingPdf} // Deshabilitar si hay acciones PDF/Email en curso
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
      {/* --- FIN SECCIÓN ACTUALIZADA --- */}
    </div>
  );
};

export default FinalInvoiceComponent;