import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchBudgets, fetchBudgetById, updateBudget } from "../../Redux/Actions/budgetActions";
import { updateBudgetSuccess, updateBudgetFailure } from "../../Redux/Reducer/BudgetReducer"; // Ajusta la ruta si es necesario
import { parseISO, format } from 'date-fns'; // Asegúrate de importar format y parseISO

const EditBudget = () => {
  // ... (dispatch, navigate, estados de Redux, estados locales: searchTerm, searchResults, selectedBudgetId, formData, isSubmitting) ...
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { budgets = [], currentBudget, loading: loadingList, error: listError } = useSelector(state => state.budget);
  const { loading: loadingCurrent, error: currentError } = useSelector(state => state.budget);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
  const [formData, setFormData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  // --- Cargar Lista de Budgets para Búsqueda ---
  useEffect(() => {
    dispatch(fetchBudgets());
  }, [dispatch]);

  // --- Obtener Direcciones Únicas para Datalist ---
  const uniqueAddresses = useMemo(() => {
    if (!budgets || budgets.length === 0) return [];
    // Extraer direcciones, filtrar nulos/vacíos y obtener únicos
    const addresses = budgets
      .map(budget => budget.propertyAddress?.trim())
      .filter(Boolean);
    return [...new Set(addresses)].sort(); // Ordenar alfabéticamente
  }, [budgets]);

  // --- Filtrar Budgets basado en searchTerm (sin cambios) ---
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filtered = budgets.filter(budget =>
      budget.propertyAddress?.toLowerCase().includes(lowerCaseSearchTerm) ||
      budget.permitNumber?.toLowerCase().includes(lowerCaseSearchTerm) ||
      budget.applicantName?.toLowerCase().includes(lowerCaseSearchTerm)
    );
    setSearchResults(filtered);
  }, [searchTerm, budgets]);

  // --- Cargar Datos del Budget Seleccionado (sin cambios) ---
  useEffect(() => {
    if (selectedBudgetId) {
      setFormData(null);
      dispatch(fetchBudgetById(selectedBudgetId));
    } else {
      setFormData(null);
    }
  }, [dispatch, selectedBudgetId]);

  // --- Poblar Estado Local (formData) (sin cambios) ---
  useEffect(() => {
    if (currentBudget && currentBudget.idBudget === selectedBudgetId) {
      setFormData({
        // ... (misma lógica para poblar formData)
        permitNumber: currentBudget.permitNumber || "",
        propertyAddress: currentBudget.propertyAddress || "",
        applicantName: currentBudget.applicantName || "",
        lot: currentBudget.lot || "",
        block: currentBudget.block || "",
        date: currentBudget.date ? currentBudget.date.split('T')[0] : "",
        expirationDate: currentBudget.expirationDate ? currentBudget.expirationDate.split('T')[0] : "",
        status: currentBudget.status || "created",
        discountDescription: currentBudget.discountDescription || "",
        discountAmount: parseFloat(currentBudget.discountAmount) || 0,
        generalNotes: currentBudget.generalNotes || "",
        lineItems: (currentBudget.lineItems || []).map(item => ({
          id: item.id,
          budgetItemId: item.budgetItemId,
          quantity: item.quantity,
          notes: item.notes || '',
          name: item.itemDetails?.name || 'N/A',
          category: item.itemDetails?.category || 'N/A',
          marca: item.itemDetails?.marca || '',
          capacity: item.itemDetails?.capacity || '',
          unitPrice: item.priceAtTimeOfBudget || item.itemDetails?.unitPrice || 0,
        })),
        subtotalPrice: 0,
        totalPrice: 0,
        initialPayment: parseFloat(currentBudget.initialPayment) || 0,
        initialPaymentPercentage: currentBudget.initialPaymentPercentage || '60',
        pdfDataUrl: currentBudget.Permit?.pdfDataUrl || null,
        optionalDocsUrl: currentBudget.Permit?.optionalDocsUrl || null,
        pdfDataFile: null,
        optionalDocsFile: null,
      });
    }
  }, [currentBudget, selectedBudgetId]);

  // --- Recalcular Totales (sin cambios) ---
   useEffect(() => {
    if (!formData) return;
    const subtotal = formData.lineItems.reduce((sum, item) => {
        const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
        return sum + lineTotal;
      }, 0);
      const total = subtotal - (parseFloat(formData.discountAmount) || 0);
      let payment = 0;
      const percentage = parseFloat(formData.initialPaymentPercentage);
      if (!isNaN(percentage)) {
        payment = (total * percentage) / 100;
      } else if (formData.initialPaymentPercentage === 'total') {
        payment = total;
      }
      if (subtotal !== formData.subtotalPrice || total !== formData.totalPrice || payment !== formData.initialPayment) {
          setFormData(prev => ({
              ...prev,
              subtotalPrice: subtotal,
              totalPrice: total,
              initialPayment: payment,
          }));
      }
  }, [formData?.lineItems, formData?.discountAmount, formData?.initialPaymentPercentage]);


  // --- Handlers (handleGeneralInputChange, handleLineItemChange, handleRemoveLineItem, handleFileChange, handleSelectBudget, handleSearchAgain sin cambios) ---
    const handleGeneralInputChange = (e) => {
    const { name, value, type } = e.target;
    const isNumeric = ['discountAmount'].includes(name);
    const isCheckbox = type === 'checkbox';

    setFormData(prev => ({
      ...prev,
      [name]: isCheckbox ? e.target.checked : (isNumeric ? parseFloat(value) || 0 : value),
    }));
  };

  const handleLineItemChange = (index, field, value) => {
    setFormData(prev => {
      const newLineItems = [...prev.lineItems];
      if (newLineItems[index] && field in newLineItems[index]) {
          newLineItems[index] = {
              ...newLineItems[index],
              [field]: field === 'quantity' ? parseInt(value) || 0 : value,
          };
      } else {
          console.warn(`Campo '${field}' no encontrado en el item ${index}`);
      }
      return { ...prev, lineItems: newLineItems };
    });
  };

  const handleRemoveLineItem = (indexToRemove) => {
    if (window.confirm(`¿Seguro que quieres eliminar el item "${formData.lineItems[indexToRemove]?.name}"?`)) {
        setFormData(prev => ({
            ...prev,
            lineItems: prev.lineItems.filter((_, index) => index !== indexToRemove),
        }));
    }
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files.length > 0) {
      setFormData(prev => ({
        ...prev,
        [name + 'File']: files[0],
      }));
      console.log(`Archivo ${name} seleccionado:`, files[0]);
    }
  };

  const handleSelectBudget = (id) => {
    setSelectedBudgetId(id);
    setSearchTerm("");
    setSearchResults([]);
  };

  const handleSearchAgain = () => {
    setSelectedBudgetId(null);
    setFormData(null);
    setSearchTerm("");
    setSearchResults([]);
  };

  // --- Submit (sin cambios) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData || !selectedBudgetId) return;
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

    if (formData.pdfDataFile) {
        useFormData = true;
        dataToSend.pdfFile = formData.pdfDataFile;
    }
    if (formData.optionalDocsFile) {
        useFormData = true;
        dataToSend.optionalDocFile = formData.optionalDocsFile;
    }

    let payload;
    if (useFormData) {
        payload = new FormData();
        Object.keys(dataToSend).forEach(key => {
            payload.append(key, dataToSend[key]);
        });
        payload.append('lineItems', JSON.stringify(lineItemsPayload));
    } else {
        payload = { ...dataToSend, lineItems: lineItemsPayload };
    }

    console.log("Enviando actualización para ID:", selectedBudgetId, payload);

    try {
      const resultAction = await dispatch(updateBudget(selectedBudgetId, payload));
      if (updateBudgetSuccess.match(resultAction)) {
        alert("Presupuesto actualizado exitosamente!");
        handleSearchAgain();
      } else if (updateBudgetFailure.match(resultAction)) {
         const errorMessage = resultAction.payload || "Error desconocido al actualizar.";
         console.error("Error al actualizar:", errorMessage);
         alert(`Error al actualizar: ${errorMessage}`);
      } else {
          console.warn("Resultado inesperado de updateBudget:", resultAction);
          alert("Ocurrió una respuesta inesperada del servidor.");
      }
    } catch (err) {
      console.error("Error inesperado en handleSubmit:", err);
      alert(`Error inesperado: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };


  // --- Renderizado ---
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h2 className="text-2xl font-bold mb-6 text-center">Editar Presupuesto</h2>

      {/* --- Sección de Búsqueda --- */}
      {!selectedBudgetId && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg shadow">
          <label htmlFor="searchAddress" className="block text-sm font-medium text-gray-700 mb-1">
            Buscar por Dirección, Permit # o Applicant
          </label>
          {/* Input modificado con atributo 'list' */}
          <input
            type="text"
            id="searchAddress"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Escribe o selecciona una dirección..."
            className="input-style w-full"
            list="address-suggestions" // Vincula con el datalist
            autoComplete="off" // Desactivar autocompletado nativo no deseado
          />
          {/* Datalist con las sugerencias */}
          <datalist id="address-suggestions">
            {uniqueAddresses.map((address, index) => (
              <option key={index} value={address} />
            ))}
          </datalist>

          {loadingList && <p className="text-sm text-gray-500 mt-2">Buscando...</p>}
          {listError && <p className="text-sm text-red-500 mt-2">Error al buscar: {listError}</p>}

          {/* Resultados de Búsqueda (sin cambios) */}
          {searchResults.length > 0 && (
            <ul className="mt-4 border rounded max-h-60 overflow-y-auto bg-white">
              {searchResults.map(budget => (
                <li key={budget.idBudget} className="border-b last:border-b-0">
                  <button
                    onClick={() => handleSelectBudget(budget.idBudget)}
                    className="w-full text-left p-3 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                  >
                    <p className="font-medium text-sm">{budget.propertyAddress}</p>
                    <p className="text-xs text-gray-600">
                      Permit: {budget.permitNumber || 'N/A'} - Applicant: {budget.applicantName || 'N/A'} - Fecha: {budget.date ? format(parseISO(budget.date), 'MM/dd/yyyy') : 'N/A'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searchTerm && searchResults.length === 0 && !loadingList && (
            <p className="text-sm text-gray-500 mt-2">No se encontraron presupuestos.</p>
          )}
        </div>
      )}

      {/* --- Sección de Edición (sin cambios en la estructura interna) --- */}
      {selectedBudgetId && (
        <>
          <button onClick={handleSearchAgain} className="mb-4 text-sm text-blue-600 hover:underline">
            &larr; Volver a buscar
          </button>
          {loadingCurrent && !formData && <div className="text-center p-4">Cargando datos del presupuesto...</div>}
          {currentError && <div className="text-center p-4 text-red-600">Error al cargar datos: {currentError}</div>}
          {formData && (
            <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow-md rounded-lg p-6">
              <h3 className="text-xl font-semibold border-b pb-2">Editando Presupuesto #{selectedBudgetId}</h3>
              {/* ... (Todos los fieldsets: Información General, Detalles, Items, Descuento, PDFs, Totales) ... */}
               {/* Sección Información General (Read-Only) */}
              <fieldset className="border p-4 rounded">
                <legend className="text-lg font-semibold px-2">Información General</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <p><span className="font-medium">Permit #:</span> {formData.permitNumber || 'N/A'}</p>
                  <p><span className="font-medium">Applicant:</span> {formData.applicantName || 'N/A'}</p>
                  <p className="md:col-span-2"><span className="font-medium">Address:</span> {formData.propertyAddress || 'N/A'}</p>
                  <p><span className="font-medium">Lot:</span> {formData.lot || 'N/A'}</p>
                  <p><span className="font-medium">Block:</span> {formData.block || 'N/A'}</p>
                </div>
              </fieldset>

              {/* Sección Detalles Editables */}
              <fieldset className="border p-4 rounded">
                <legend className="text-lg font-semibold px-2">Detalles Editables</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha</label>
                    <input type="date" name="date" value={formData.date} onChange={handleGeneralInputChange} className="input-style mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha Expiración</label>
                    <input type="date" name="expirationDate" value={formData.expirationDate} onChange={handleGeneralInputChange} className="input-style mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                    <select name="status" value={formData.status} onChange={handleGeneralInputChange} className="input-style mt-1">
                      <option value="created">Creado</option>
                      <option value="sent">Enviado</option>
                      <option value="approved">Aprobado</option>
                      <option value="rejected">Rechazado</option>
                      <option value="archived">Archivado</option>
                    </select>
                  </div>
                </div>
              </fieldset>

              {/* Sección Line Items */}
              <fieldset className="border p-4 rounded">
                <legend className="text-lg font-semibold px-2">Items del Presupuesto</legend>
                {formData.lineItems.length === 0 ? (
                  <p className="text-gray-500">No hay items en este presupuesto.</p>
                ) : (
                  <div className="space-y-4">
                    {formData.lineItems.map((item, index) => (
                      <div key={item.id || `temp-${index}`} className="grid grid-cols-12 gap-2 items-center border-b pb-2">
                        <div className="col-span-5 text-sm">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-gray-600">{item.category} {item.marca ? `- ${item.marca}`: ''} {item.capacity ? `(${item.capacity})` : ''}</p>
                        </div>
                        <div className="col-span-2 text-sm text-right">
                           ${parseFloat(item.unitPrice).toFixed(2)}
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-600 block text-center">Cant.</label>
                          <input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                            className="input-style w-full text-center p-1"
                          />
                        </div>
                         <div className="col-span-2">
                           <label className="text-xs font-medium text-gray-600 block">Notas</label>
                           <input
                              type="text"
                              value={item.notes}
                              onChange={(e) => handleLineItemChange(index, 'notes', e.target.value)}
                              className="input-style w-full p-1 text-xs"
                              placeholder="Notas..."
                           />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Eliminar Item"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </fieldset>

              {/* Sección Descuento y Notas */}
              <fieldset className="border p-4 rounded">
                <legend className="text-lg font-semibold px-2">Descuento y Notas</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Descripción Descuento</label>
                    <input type="text" name="discountDescription" value={formData.discountDescription} onChange={handleGeneralInputChange} className="input-style mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Monto Descuento ($)</label>
                    <input type="number" step="0.01" min="0" name="discountAmount" value={formData.discountAmount} onChange={handleGeneralInputChange} className="input-style mt-1" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notas Generales</label>
                  <textarea name="generalNotes" value={formData.generalNotes} onChange={handleGeneralInputChange} rows="3" className="input-style mt-1 w-full"></textarea>
                </div>
              </fieldset>

              {/* Sección PDFs */}
              <fieldset className="border p-4 rounded">
                  <legend className="text-lg font-semibold px-2">Documentos PDF</legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Reemplazar PDF Principal</label>
                          {formData.pdfDataUrl && (
                              <a href={formData.pdfDataUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs block mb-1">Ver PDF actual</a>
                          )}
                          <input type="file" name="pdfData" onChange={handleFileChange} accept="application/pdf" className="input-style mt-1 text-sm" />
                          {formData.pdfDataFile && <span className="text-xs text-green-600 block mt-1">Nuevo archivo seleccionado: {formData.pdfDataFile.name}</span>}
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Reemplazar Doc Opcional</label>
                          {formData.optionalDocsUrl && (
                              <a href={formData.optionalDocsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs block mb-1">Ver Doc actual</a>
                          )}
                          <input type="file" name="optionalDocs" onChange={handleFileChange} accept="application/pdf" className="input-style mt-1 text-sm" />
                          {formData.optionalDocsFile && <span className="text-xs text-green-600 block mt-1">Nuevo archivo seleccionado: {formData.optionalDocsFile.name}</span>}
                      </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Nota: Subir un nuevo archivo reemplazará el existente.</p>
              </fieldset>

              {/* Sección Totales */}
              <div className="text-right space-y-1 border-t pt-4 mt-6">
                <p className="text-md">Subtotal: <span className="font-semibold">${formData.subtotalPrice.toFixed(2)}</span></p>
                {formData.discountAmount > 0 && (
                  <p className="text-md text-red-600">Descuento ({formData.discountDescription || 'General'}): <span className="font-semibold">-${formData.discountAmount.toFixed(2)}</span></p>
                )}
                <p className="text-lg font-bold">Total: <span className="font-semibold">${formData.totalPrice.toFixed(2)}</span></p>
                 <div className="flex justify-end items-center space-x-2 mt-2">
                      <label className="text-sm font-medium">Pago Inicial:</label>
                      <select name="initialPaymentPercentage" value={formData.initialPaymentPercentage} onChange={handleGeneralInputChange} className="input-style w-auto p-1 text-sm">
                        <option value="60">60%</option>
                        <option value="total">Total (100%)</option>
                      </select>
                      <span className="text-md font-semibold">(${formData.initialPayment.toFixed(2)})</span>
                    </div>
              </div>

              {/* Botón Guardar */}
              <div className="mt-6">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-800 disabled:opacity-50"
                  disabled={isSubmitting || loadingCurrent}
                >
                  {isSubmitting ? 'Guardando Cambios...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      <style>{`.input-style { border: 1px solid #ccc; border-radius: 4px; padding: 8px; width: 100%; } .input-style:disabled { background-color: #f3f4f6; cursor: not-allowed; }`}</style>
    </div>
  );
};

export default EditBudget;