import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchBudgets, fetchBudgetById, updateBudget, } from "../../Redux/Actions/budgetActions";
import { parseISO, format } from 'date-fns';

const EditBudget = () => {
  console.log('--- EditBudget Component Rendered ---');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // --- Selectores de Redux ---
  const {
    budgets = [],
    currentBudget,
    loading: loadingList,
    error: listError,
    loadingCurrent: loadingCurrentBudget,
    errorCurrent: currentBudgetError,
  } = useSelector(state => state.budget);

  console.log('Value of currentBudget from useSelector:', currentBudget);

  // --- Estados Locales ---
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
  const [formData, setFormData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Cargar Lista de Budgets para Búsqueda ---
  useEffect(() => {
    dispatch(fetchBudgets());
  }, [dispatch]);

   // *** NUEVO: Filtrar budgets por estado para la búsqueda ***
   const editableBudgets = useMemo(() => {
    const allowedStatus = ["created", "send", "notResponded", "rejected"];
    // Asegúrate que 'budgets' no sea undefined o null antes de filtrar
    return (budgets || []).filter(budget => allowedStatus.includes(budget.status));
  }, [budgets]); // Depende de la lista completa de budgets


   // --- Obtener Direcciones Únicas para Datalist (desde los editables) ---
   const uniqueAddresses = useMemo(() => {
    if (!editableBudgets || editableBudgets.length === 0) return []; // Usa editableBudgets
    const addresses = editableBudgets // Usa editableBudgets
      .map(budget => budget.propertyAddress?.trim())
      .filter(Boolean);
    return [...new Set(addresses)].sort();
  }, [editableBudgets]); // Depende de la lista filtrada por estado

  // --- Filtrar Budgets basado en searchTerm (desde los editables) ---
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    // *** MODIFICADO: Busca dentro de 'editableBudgets' ***
    const filtered = editableBudgets.filter(budget =>
      budget.propertyAddress?.toLowerCase().includes(lowerCaseSearchTerm) ||
      budget.Permit?.permitNumber?.toLowerCase().includes(lowerCaseSearchTerm) ||
      budget.applicantName?.toLowerCase().includes(lowerCaseSearchTerm)
    );
    setSearchResults(filtered);
  }, [searchTerm, editableBudgets]); // Depende del término y la lista filtrada por estado

  // --- Cargar Datos del Budget Seleccionado (sin cambios) ---
  useEffect(() => {
    if (selectedBudgetId) {
      console.log(`Dispatching fetchBudgetById for ID: ${selectedBudgetId}`);
      setFormData(null);
      dispatch(fetchBudgetById(selectedBudgetId));
    } else {
      setFormData(null);
    }
  }, [dispatch, selectedBudgetId]);

  // --- Poblar Estado Local (formData) cuando currentBudget cambia ---
  useEffect(() => {
    console.log('Form population effect triggered. selectedBudgetId:', selectedBudgetId, 'currentBudget:', currentBudget);

    if (currentBudget && currentBudget.idBudget === selectedBudgetId) {
      console.log(`✅ Condition met: Populating formData for budget ID: ${currentBudget.idBudget}`);
      console.log('Current budget data:', JSON.stringify(currentBudget, null, 2));

      try {
        const permitData = currentBudget.Permit || {};
        const lineItemsData = currentBudget.lineItems || [];

        const newFormData = {
          permitNumber: permitData.permitNumber || "",
          propertyAddress: currentBudget.propertyAddress || "",
          applicantName: currentBudget.applicantName || "",
          lot: permitData.lot || "",
          block: permitData.block || "",
          date: currentBudget.date ? currentBudget.date.split('T')[0] : "",
          expirationDate: currentBudget.expirationDate ? currentBudget.expirationDate.split('T')[0] : "",
          status: currentBudget.status || "created",
          discountDescription: currentBudget.discountDescription || "",
          discountAmount: parseFloat(currentBudget.discountAmount) || 0,
          generalNotes: currentBudget.generalNotes || "",
          initialPaymentPercentage: currentBudget.initialPaymentPercentage || '60',
          lineItems: lineItemsData.map(item => {
            const itemDetails = item.itemDetails || {};
            return {
              id: item.id,
              budgetItemId: item.budgetItemId,
              quantity: parseInt(item.quantity) || 0,
              notes: item.notes || '',
              name: itemDetails.name || 'N/A',
              category: itemDetails.category || 'N/A',
              marca: itemDetails.marca || '',
              capacity: itemDetails.capacity || '',
              unitPrice: parseFloat(item.priceAtTimeOfBudget || itemDetails.unitPrice || 0),
            };
          }),
          pdfDataUrl: permitData.pdfDataUrl || null,
          optionalDocsUrl: permitData.optionalDocsUrl || null,
          pdfDataFile: null,
          optionalDocsFile: null,
          subtotalPrice: 0,
          totalPrice: 0,
          initialPayment: 0,
        };
        console.log('Calling setFormData with:', newFormData);
        setFormData(newFormData);
        console.log('✅ setFormData called successfully.');

      } catch (error) {
        console.error('❌ Error during setFormData:', error, 'currentBudget was:', currentBudget);
        setFormData(null);
      }
    } else {
      if (!currentBudget) {
        console.log('Condition not met: currentBudget is null or undefined (API call might be pending).');
      } else if (currentBudget.idBudget !== selectedBudgetId) {
        console.log(`Condition not met: Mismatch! currentBudget ID (${currentBudget.idBudget}) !== selectedBudgetId (${selectedBudgetId}). Stale data?`);
      } else {
         console.log('Condition not met: Unknown reason.');
      }
    }
  }, [currentBudget, selectedBudgetId]);

  // --- Recalcular Totales ---
  useEffect(() => {
    if (!formData) return;

    console.log('Recalculating totals effect triggered.');

    const subtotal = formData.lineItems.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + (quantity * price);
    }, 0);

    const discount = parseFloat(formData.discountAmount) || 0;
    const total = subtotal - discount;

    let payment = 0;
    const percentage = parseFloat(formData.initialPaymentPercentage);
    if (!isNaN(percentage)) {
      payment = (total * percentage) / 100;
    } else if (formData.initialPaymentPercentage === 'total') {
      payment = total;
    }

    if (subtotal !== formData.subtotalPrice || total !== formData.totalPrice || payment !== formData.initialPayment) {
      console.log(`Updating totals: Subtotal=${subtotal}, Total=${total}, Payment=${payment}`);
      setFormData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          subtotalPrice: subtotal,
          totalPrice: total,
          initialPayment: payment,
        };
      });
    } else {
       console.log('Totals are already up-to-date.');
    }
  }, [formData?.lineItems, formData?.discountAmount, formData?.initialPaymentPercentage, formData?.subtotalPrice, formData?.totalPrice, formData?.initialPayment]);

  // --- Handlers ---
  const handleGeneralInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleLineItemChange = (index, field, value) => {
    setFormData(prev => {
      if (!prev) return null;
      const updatedLineItems = [...prev.lineItems];
      updatedLineItems[index] = { ...updatedLineItems[index], [field]: value };
      return { ...prev, lineItems: updatedLineItems };
    });
  };

  const handleRemoveLineItem = (indexToRemove) => {
    setFormData(prev => {
      if (!prev) return null;
      const updatedLineItems = prev.lineItems.filter((_, index) => index !== indexToRemove);
      return { ...prev, lineItems: updatedLineItems };
    });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files.length > 0) {
      setFormData(prev => prev ? { ...prev, [name]: files[0] } : null);
    }
  };

  const handleSelectBudget = (id) => {
    console.log(`>>> handleSelectBudget called with ID: ${id}`);
    setSelectedBudgetId(id);
    setSearchTerm("");
    setSearchResults([]);
  };

  const handleSearchAgain = () => {
    console.log(">>> handleSearchAgain called");
    setSelectedBudgetId(null);
    setFormData(null);
    setSearchTerm("");
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData || !selectedBudgetId) {
      alert("No hay datos de formulario o budget seleccionado.");
      return;
    }
    setIsSubmitting(true);

    const dataToSend = {};
    let useFormData = false;

    dataToSend.date = formData.date;
    dataToSend.expirationDate = formData.expirationDate || null;
    dataToSend.status = formData.status;
    dataToSend.discountDescription = formData.discountDescription;
    dataToSend.discountAmount = formData.discountAmount;
    dataToSend.generalNotes = formData.generalNotes;
    dataToSend.initialPaymentPercentage = formData.initialPaymentPercentage;

    const lineItemsPayload = formData.lineItems.map(item => ({
      id: item.id,
      budgetItemId: item.budgetItemId,
      quantity: item.quantity,
      notes: item.notes,
    }));

    let payload;
    if (formData.pdfDataFile || formData.optionalDocsFile) {
      useFormData = true;
      payload = new FormData();
      Object.keys(dataToSend).forEach(key => {
        if (dataToSend[key] !== undefined) {
          payload.append(key, dataToSend[key] === null ? '' : dataToSend[key]);
        }
      });
      payload.append('lineItems', JSON.stringify(lineItemsPayload));
      if (formData.pdfDataFile) {
        payload.append('pdfFile', formData.pdfDataFile, formData.pdfDataFile.name);
      }
      if (formData.optionalDocsFile) {
        payload.append('optionalDocFile', formData.optionalDocsFile, formData.optionalDocsFile.name);
      }
    } else {
      payload = { ...dataToSend, lineItems: lineItemsPayload };
    }

    console.log("Enviando actualización para ID:", selectedBudgetId, useFormData ? 'con FormData' : 'como JSON');

    try {
      const resultAction = await dispatch(updateBudget(selectedBudgetId, payload));

      if (resultAction && resultAction.type === 'UPDATE_BUDGET_SUCCESS') {
        alert("Presupuesto actualizado exitosamente!");
        handleSearchAgain();
      } else if (resultAction && resultAction.type === 'UPDATE_BUDGET_FAILURE') {
         const errorMessage = resultAction.payload || "Error desconocido al actualizar.";
         console.error("Error al actualizar:", errorMessage);
         alert(`Error al actualizar: ${errorMessage}`);
      } else {
          console.warn("Resultado inesperado de updateBudget:", resultAction);
          alert("Ocurrió una respuesta inesperada del servidor.");
      }
    } catch (err) {
      console.error("Error inesperado en handleSubmit:", err);
      alert(`Error inesperado: ${err.message || 'Ocurrió un problema de red o del servidor.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Renderizado ---
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Editar Presupuesto</h2>

      {/* --- Sección de Búsqueda --- */}
      {!selectedBudgetId && (
        <div className="mb-6 p-4 bg-gray-100 rounded-lg shadow-md">
           <label htmlFor="searchAddress" className="block text-sm font-medium text-gray-700 mb-1">
            Buscar por Dirección, Permit # o Applicant
          </label>
          <input
            type="text"
            id="searchAddress"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Escribe para buscar..."
            className="input-style w-full border border-gray-300 rounded px-3 py-2"
            list="address-suggestions"
            autoComplete="off"
          />
          <datalist id="address-suggestions">
            {uniqueAddresses.map((address, index) => (
              <option key={index} value={address} />
            ))}
          </datalist>

          {loadingList && <p className="text-sm text-blue-500 mt-2">Buscando presupuestos...</p>}
          {listError && <p className="text-sm text-red-600 mt-2">Error al buscar: {listError}</p>}
          {searchResults.length > 0 && (
             <ul className="mt-4 border border-gray-300 rounded max-h-60 overflow-y-auto bg-white shadow">
              {searchResults.map(budget => (
                <li key={budget.idBudget} className="border-b border-gray-200 last:border-b-0">
                  <button
                    onClick={() => handleSelectBudget(budget.idBudget)}
                    className="w-full text-left p-3 hover:bg-blue-50 focus:outline-none focus:bg-blue-100 transition duration-150 ease-in-out"
                  >
                    <p className="font-medium text-sm text-gray-900">{budget.propertyAddress}</p>
                    <p className="text-xs text-gray-600">
                      Permit: {budget.Permit?.permitNumber || 'N/A'} | Applicant: {budget.applicantName || 'N/A'} | Fecha: {budget.date ? format(parseISO(budget.date), 'MM/dd/yyyy') : 'N/A'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
           {searchTerm && searchResults.length === 0 && !loadingList && (
            <p className="text-sm text-gray-500 mt-2">No se encontraron presupuestos que coincidan.</p>
          )}
        </div>
      )}

      {/* --- Sección de Edición --- */}
      {selectedBudgetId && (
        <>
          <button onClick={handleSearchAgain} className="mb-4 text-sm text-blue-600 hover:text-blue-800 hover:underline">
            &larr; Volver a buscar otro presupuesto
          </button>

          {loadingCurrentBudget && !formData && <div className="text-center p-4 text-blue-600">Cargando datos del presupuesto...</div>}
          {currentBudgetError && !formData && <div className="text-center p-4 text-red-600">Error al cargar datos: {currentBudgetError}</div>}

          {formData && (
            <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow-lg rounded-lg p-6 border border-gray-200">
               <h3 className="text-xl font-semibold border-b border-gray-300 pb-2 mb-4 text-gray-700">Editando Presupuesto #{selectedBudgetId}</h3>

               {/* --- Datos del Permit (No editables) --- */}
               <fieldset className="border border-gray-200 p-4 rounded-md">
                 <legend className="text-lg font-medium text-gray-600 px-2">Información del Permiso</legend>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-500">Permit #</label>
                     <p className="mt-1 text-sm text-gray-900">{formData.permitNumber || 'N/A'}</p>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-500">Dirección</label>
                     <p className="mt-1 text-sm text-gray-900">{formData.propertyAddress || 'N/A'}</p>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-500">Applicant</label>
                     <p className="mt-1 text-sm text-gray-900">{formData.applicantName || 'N/A'}</p>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-500">Lot / Block</label>
                     <p className="mt-1 text-sm text-gray-900">{formData.lot || 'N/A'} / {formData.block || 'N/A'}</p>
                   </div>
                 </div>
               </fieldset>

               {/* --- Datos Generales del Presupuesto (Editables) --- */}
               <fieldset className="border border-gray-200 p-4 rounded-md">
                 <legend className="text-lg font-medium text-gray-600 px-2">Detalles del Presupuesto</legend>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label htmlFor="date" className="block text-sm font-medium text-gray-700">Fecha</label>
                     <input type="date" id="date" name="date" value={formData.date} onChange={handleGeneralInputChange} className="input-style mt-1" />
                   </div>
                   <div>
                     <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700">Fecha de Expiración</label>
                     <input type="date" id="expirationDate" name="expirationDate" value={formData.expirationDate} onChange={handleGeneralInputChange} className="input-style mt-1" />
                   </div>
                   <div>
                     <label htmlFor="status" className="block text-sm font-medium text-gray-700">Estado</label>
                     <select id="status" name="status" value={formData.status} onChange={handleGeneralInputChange} className="input-style mt-1">
                       <option value="created">Creado</option>
                       <option value="sent">Enviado</option>
                       <option value="approved">Aprobado</option>
                       <option value="rejected">Rechazado</option>
                       <option value="expired">Expirado</option>
                     </select>
                   </div>
                   <div>
                     <label htmlFor="initialPaymentPercentage" className="block text-sm font-medium text-gray-700">Pago Inicial (%)</label>
                     <input type="number" id="initialPaymentPercentage" name="initialPaymentPercentage" value={formData.initialPaymentPercentage} onChange={handleGeneralInputChange} className="input-style mt-1" min="0" max="100" step="1" />
                     {/* Podrías añadir opción 'total' si es necesario */}
                   </div>
                 </div>
                 <div className="mt-4">
                   <label htmlFor="generalNotes" className="block text-sm font-medium text-gray-700">Notas Generales</label>
                   <textarea id="generalNotes" name="generalNotes" value={formData.generalNotes} onChange={handleGeneralInputChange} rows="3" className="input-style mt-1"></textarea>
                 </div>
               </fieldset>

               {/* --- Líneas de Items (Editables: Cantidad y Notas) --- */}
               <fieldset className="border border-gray-200 p-4 rounded-md">
                 <legend className="text-lg font-medium text-gray-600 px-2">Items del Presupuesto</legend>
                 <div className="space-y-4">
                   {formData.lineItems.map((item, index) => (
                     <div key={item.id || index} className="border-b border-gray-100 pb-4 last:border-b-0">
                       <p className="font-medium text-gray-800">{item.name} ({item.category})</p>
                       <p className="text-sm text-gray-600">Marca: {item.marca || 'N/A'} | Capacidad: {item.capacity || 'N/A'} | Precio Unitario: ${item.unitPrice.toFixed(2)}</p>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                         <div>
                           <label htmlFor={`quantity-${index}`} className="block text-xs font-medium text-gray-700">Cantidad</label>
                           <input
                             type="number"
                             id={`quantity-${index}`}
                             value={item.quantity}
                             onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                             className="input-style mt-1 text-sm"
                             min="0"
                             step="0.01"
                           />
                         </div>
                         <div className="md:col-span-2">
                           <label htmlFor={`notes-${index}`} className="block text-xs font-medium text-gray-700">Notas del Item</label>
                           <input
                             type="text"
                             id={`notes-${index}`}
                             value={item.notes}
                             onChange={(e) => handleLineItemChange(index, 'notes', e.target.value)}
                             className="input-style mt-1 text-sm"
                           />
                         </div>
                       </div>
                       {/* Botón para eliminar item (opcional) */}
                       {/* <button type="button" onClick={() => handleRemoveLineItem(index)} className="text-red-500 text-xs mt-1">Eliminar Item</button> */}
                     </div>
                   ))}
                 </div>
               </fieldset>

               {/* --- Descuento y Totales --- */}
               <fieldset className="border border-gray-200 p-4 rounded-md">
                 <legend className="text-lg font-medium text-gray-600 px-2">Resumen Financiero</legend>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label htmlFor="discountDescription" className="block text-sm font-medium text-gray-700">Descripción Descuento</label>
                     <input type="text" id="discountDescription" name="discountDescription" value={formData.discountDescription} onChange={handleGeneralInputChange} className="input-style mt-1" />
                   </div>
                   <div>
                     <label htmlFor="discountAmount" className="block text-sm font-medium text-gray-700">Monto Descuento ($)</label>
                     <input type="number" id="discountAmount" name="discountAmount" value={formData.discountAmount} onChange={handleGeneralInputChange} className="input-style mt-1" min="0" step="0.01" />
                   </div>
                 </div>
                 <div className="mt-4 space-y-2 text-right">
                   <p className="text-sm text-gray-600">Subtotal: <span className="font-medium text-gray-900">${formData.subtotalPrice.toFixed(2)}</span></p>
                   <p className="text-sm text-gray-600">Descuento: <span className="font-medium text-red-600">-${formData.discountAmount.toFixed(2)}</span></p>
                   <p className="text-lg font-semibold text-gray-900">Total: ${formData.totalPrice.toFixed(2)}</p>
                   <p className="text-md font-medium text-blue-700">Pago Inicial Requerido: ${formData.initialPayment.toFixed(2)}</p>
                 </div>
               </fieldset>

               {/* --- Archivos Adjuntos --- */}
               <fieldset className="border border-gray-200 p-4 rounded-md">
                 <legend className="text-lg font-medium text-gray-600 px-2">Archivos Adjuntos</legend>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700">Permiso PDF</label>
                     {formData.pdfDataUrl ? (
                       <a href={formData.pdfDataUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm mt-1 block">Ver PDF Actual</a>
                     ) : (
                       <p className="text-sm text-gray-500 mt-1">No disponible</p>
                     )}
                     <label htmlFor="pdfDataFile" className="block text-xs font-medium text-gray-500 mt-2">Reemplazar PDF:</label>
                     <input type="file" id="pdfDataFile" name="pdfDataFile" onChange={handleFileChange} accept=".pdf" className="input-style mt-1 text-sm" />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700">Documentos Opcionales</label>
                     {formData.optionalDocsUrl ? (
                       <a href={formData.optionalDocsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm mt-1 block">Ver Documentos Actuales</a>
                     ) : (
                       <p className="text-sm text-gray-500 mt-1">No disponible</p>
                     )}
                     <label htmlFor="optionalDocsFile" className="block text-xs font-medium text-gray-500 mt-2">Reemplazar Documentos:</label>
                     <input type="file" id="optionalDocsFile" name="optionalDocsFile" onChange={handleFileChange} accept=".pdf,.zip,.rar" className="input-style mt-1 text-sm" />
                   </div>
                 </div>
               </fieldset>

               {/* --- Botón de Envío --- */}
               <div className="flex justify-end pt-4">
                 <button
                   type="submit"
                   disabled={isSubmitting}
                   className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                 >
                   {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                 </button>
               </div>

            </form>
          )}
          {!formData && !loadingCurrentBudget && !currentBudgetError && (
             <div className="text-center p-4 text-orange-600">No se pudieron mostrar los datos del formulario. Verifique la consola.</div>
           )}
        </>
      )}
      {/* Estilo base para inputs si no está global */}
      <style>{`.input-style { border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.5rem 0.75rem; width: 100%; box-sizing: border-box; } .input-style:focus { outline: 2px solid transparent; outline-offset: 2px; border-color: #2563eb; box-shadow: 0 0 0 2px #bfdbfe; }`}</style>
    </div>
  );
};

export default EditBudget;