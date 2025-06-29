import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchBudgets, fetchBudgetById, updateBudget, } from "../../Redux/Actions/budgetActions";
// ✅ AGREGAR ESTAS IMPORTACIONES:
import { fetchBudgetItems } from "../../Redux/Actions/budgetItemActions";
import DynamicCategorySection from './DynamicCategorySection';
import { parseISO, format } from 'date-fns';
import { unwrapResult } from '@reduxjs/toolkit';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import api from "../../utils/axios";

// --- Helper para generar IDs temporales ---
const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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

  // ✅ AGREGAR SELECTOR PARA BUDGET ITEMS:
  const {
    items: budgetItemsCatalog = [],
    loading: loadingCatalog,
    error: catalogError
  } = useSelector(state => state.budgetItems);

  console.log('Value of currentBudget from useSelector:', currentBudget);

  // --- Estados Locales ---
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
  const [formData, setFormData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingFile, setViewingFile] = useState(false);

  const [manualItemData, setManualItemData] = useState({
    category: "",
    name: "",
    unitPrice: "", // Usar string para el input
    quantity: "1", // Default a 1 como string
    notes: "",
    description: "", // ✅ AGREGAR DESCRIPTION
  });

  // ✅ AGREGAR ESTADOS PARA SISTEMA DINÁMICO:
  const [dynamicSectionVisibility, setDynamicSectionVisibility] = useState({});

  // --- Cargar Lista de Budgets para Búsqueda ---
  useEffect(() => {
    dispatch(fetchBudgets());
  }, [dispatch]);

  // ✅ AGREGAR EFECTO PARA CARGAR CATÁLOGO:
  useEffect(() => {
    dispatch(fetchBudgetItems());
  }, [dispatch]);

  // Actualiza el filtro en la línea ~45:
const editableBudgets = useMemo(() => {
  // ✅ CORREGIDO: Incluir más estados editables
  const allowedStatus = ["created", "send","sent", "pending", "notResponded", "rejected", "sent_for_signature"];
  return (budgets || []).filter(budget => allowedStatus.includes(budget.status));
}, [budgets]);
  // ✅ AGREGAR LÓGICA PARA NORMALIZAR CATÁLOGO:
  const normalizedBudgetItemsCatalog = useMemo(() => {
    return (budgetItemsCatalog || [])
      .filter(item => item.isActive)
      .map(item => ({
        id: item.id,
        name: item.name || '',
        category: item.category || '',
        marca: item.marca || '',
        capacity: item.capacity || '',
        unitPrice: parseFloat(item.unitPrice) || 0,
        description: item.description || '', // ✅ Incluir description
      }));
  }, [budgetItemsCatalog]);

  // ✅ AGREGAR CATEGORÍAS DISPONIBLES:
  const availableCategories = useMemo(() => {
    const categories = normalizedBudgetItemsCatalog.map(item => item.category).filter(Boolean);
    return [...new Set(categories)].sort();
  }, [normalizedBudgetItemsCatalog]);

  // --- Obtener Direcciones Únicas para Datalist (desde los editables) ---
  const uniqueAddresses = useMemo(() => {
    if (!editableBudgets || editableBudgets.length === 0) return [];
    const addresses = editableBudgets
      .map(budget => budget.propertyAddress?.trim())
      .filter(Boolean);
    return [...new Set(addresses)].sort();
  }, [editableBudgets]);

  // --- Filtrar Budgets basado en searchTerm (desde los editables) ---
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filtered = editableBudgets.filter(budget =>
      budget.propertyAddress?.toLowerCase().includes(lowerCaseSearchTerm) ||
      budget.Permit?.permitNumber?.toLowerCase().includes(lowerCaseSearchTerm) ||
      budget.applicantName?.toLowerCase().includes(lowerCaseSearchTerm)
    );
    setSearchResults(filtered);
  }, [searchTerm, editableBudgets]);

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

    if (currentBudget && currentBudget.idBudget === selectedBudgetId && (!formData || formData.idBudget !== selectedBudgetId)) {
      console.log(`✅ Condition met: Populating formData for budget ID: ${currentBudget.idBudget}`);
      console.log('Current budget data:', JSON.stringify(currentBudget, null, 2));

      try {
        const permitData = currentBudget.Permit || {};
        const lineItemsData = currentBudget.lineItems || [];

        const newFormData = {
          idBudget: currentBudget.idBudget,
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
          lineItems: (currentBudget.lineItems || []).map(item => ({
            _tempId: generateTempId(),
            id: item.id,
            budgetItemId: item.budgetItemId,
            quantity: parseInt(item.quantity) || 0,
            notes: item.notes || '',
            name: item.itemDetails?.name || item.name || 'N/A',
            category: item.itemDetails?.category || item.category || 'N/A',
            marca: item.itemDetails?.marca || item.marca || '',
            capacity: item.itemDetails?.capacity || item.capacity || '',
            unitPrice: parseFloat(item.priceAtTimeOfBudget || item.itemDetails?.unitPrice || item.unitPrice || 0),
            // ✅ AGREGAR DESCRIPTION:
            description: item.itemDetails?.description || item.description || '',
          })),
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
      // Log por qué no se pobló
      if (!currentBudget) console.log('Condition not met: currentBudget is null/undefined.');
      else if (currentBudget.idBudget !== selectedBudgetId) console.log(`Condition not met: ID mismatch (${currentBudget.idBudget} !== ${selectedBudgetId}).`);
      else if (formData && formData.idBudget === selectedBudgetId) console.log('Condition not met: formData already exists for this budgetId.');
      else console.log('Condition not met: Unknown reason.');
    }
  }, [currentBudget, selectedBudgetId, formData]);

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

  const handleManualItemChange = (e) => {
    const { name, value } = e.target;
    setManualItemData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddManualItem = () => {
    // Validaciones básicas
    const unitPriceNum = parseFloat(manualItemData.unitPrice);
    const quantityNum = parseFloat(manualItemData.quantity);

    if (!manualItemData.category.trim() || !manualItemData.name.trim()) {
        alert("Por favor, completa la categoría y el nombre del item manual.");
        return;
    }
    if (isNaN(unitPriceNum) || unitPriceNum < 0) {
        alert("Por favor, ingresa un precio unitario válido.");
        return;
    }
    if (isNaN(quantityNum) || quantityNum <= 0) {
        alert("Por favor, ingresa una cantidad válida.");
        return;
    }

    const newItem = {
        _tempId: generateTempId(), // ✅ AGREGAR TEMP ID
        id: undefined,
        budgetItemId: null,
        category: manualItemData.category.trim(),
        name: manualItemData.name.trim(),
        unitPrice: unitPriceNum,
        quantity: quantityNum,
        notes: manualItemData.notes.trim(),
        marca: '',
        capacity: '',
        description: manualItemData.description.trim(), // ✅ INCLUIR DESCRIPTION DEL FORMULARIO
    };

    setFormData(prev => {
        if (!prev) return null;
        return {
            ...prev,
            lineItems: [...prev.lineItems, newItem]
        };
    });

    // Resetear formulario manual
    setManualItemData({ category: "", name: "", unitPrice: "", quantity: "1", notes: "", description: "" }); // ✅ RESETEAR DESCRIPTION
  };

  // ✅ AGREGAR HANDLERS PARA SISTEMA DINÁMICO:
  const toggleDynamicSection = (category) => {
    setDynamicSectionVisibility(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const addItemFromDynamicSection = (itemData) => {
    console.log("Agregando item desde sección dinámica:", itemData);
    
    const foundItem = normalizedBudgetItemsCatalog.find(catalogItem => {
      let match = catalogItem.name === itemData.name && catalogItem.category === itemData.category;
      if (itemData.marca && itemData.marca !== '') {
        match = match && catalogItem.marca === itemData.marca;
      }
      if (itemData.capacity && itemData.capacity !== '') {
        match = match && catalogItem.capacity === itemData.capacity;
      }
      return match;
    });

    if (foundItem) {
      const newItem = {
        _tempId: itemData._tempId,
        id: undefined, // Nuevo item, no tiene ID en BD todavía
        budgetItemId: foundItem.id,
        name: foundItem.name,
        category: foundItem.category,
        marca: foundItem.marca || '',
        capacity: foundItem.capacity || '',
        unitPrice: foundItem.unitPrice,
        quantity: itemData.quantity,
        notes: itemData.notes || '',
        description: foundItem.description || '', // ✅ INCLUIR DESCRIPTION
      };

      setFormData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          lineItems: [...prev.lineItems, newItem]
        };
      });
    } else {
      // Item personalizado
      const newItem = {
        _tempId: itemData._tempId,
        id: undefined,
        budgetItemId: null,
        name: itemData.name,
        category: itemData.category,
        marca: itemData.marca || '',
        capacity: itemData.capacity || '',
        unitPrice: itemData.unitPrice,
        quantity: itemData.quantity,
        notes: itemData.notes || '',
        description: '', // ✅ DESCRIPCIÓN VACÍA PARA ITEMS PERSONALIZADOS
      };

      setFormData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          lineItems: [...prev.lineItems, newItem]
        };
      });
    }
  };

  // --- Resto de handlers sin cambios ---
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
    console.log("--- Iniciando handleSubmit (Backend PDF Gen) ---");
    console.log("Datos del formulario (formData) al inicio:", formData);

    // --- 1. Preparar datos para la actualización (Incluyendo status: 'send' si aplica) ---
    const dataToSend = {
      date: formData.date,
      expirationDate: formData.expirationDate || null,
      status: formData.status,
      discountDescription: formData.discountDescription,
      discountAmount: parseFloat(formData.discountAmount) || 0,
      generalNotes: formData.generalNotes,
      initialPaymentPercentage: parseFloat(formData.initialPaymentPercentage) || 60,
      applicantName: formData.applicantName,
      propertyAddress: formData.propertyAddress,
    };

    const lineItemsPayload = formData.lineItems.map(item => ({
      id: item.id,
      budgetItemId: item.budgetItemId,
      category: item.category,
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: parseFloat(item.quantity) || 0,
      notes: item.notes,
      marca: item.marca,
      capacity: item.capacity,
      // ✅ INCLUIR DESCRIPTION EN PAYLOAD:
      description: item.description,
    }));

    let payload;
    // Verificar si se están actualizando los archivos del PERMIT
    if (formData.pdfDataFile || formData.optionalDocsFile) {
      console.log("Detectados archivos del Permit. Usando FormData.");
      payload = new FormData();
      Object.keys(dataToSend).forEach(key => {
        if (dataToSend[key] !== undefined) {
          payload.append(key, dataToSend[key] === null ? '' : dataToSend[key]);
        }
      });
      payload.append('lineItems', JSON.stringify(lineItemsPayload));
      if (formData.pdfDataFile) payload.append('permitPdfFile', formData.pdfDataFile, formData.pdfDataFile.name);
      if (formData.optionalDocsFile) payload.append('permitOptionalDocsFile', formData.optionalDocsFile, formData.optionalDocsFile.name);
    } else {
      console.log("No hay archivos del Permit. Usando JSON.");
      payload = { ...dataToSend, lineItems: lineItemsPayload };
    }

    console.log("Payload para la actualización:", payload);

    try {
      // --- 2. Ejecutar la Actualización (UNA SOLA LLAMADA) ---
      console.log(`Dispatching updateBudget for ID: ${selectedBudgetId}`);
      const resultAction = await dispatch(updateBudget(selectedBudgetId, payload));
      const updatedBudget = unwrapResult(resultAction);
      console.log("✅ Actualización completada por el backend:", updatedBudget);

      alert("Presupuesto actualizado exitosamente!");
      handleSearchAgain();

    } catch (err) {
      console.error("❌ Error durante el proceso de handleSubmit:", err);
      let errorMsg = "Ocurrió un error desconocido.";
      if (err.response) {
        errorMsg = err.response.data?.error || err.response.data?.message || `Error ${err.response.status}`;
      } else if (err.request) {
        errorMsg = "No se pudo conectar con el servidor.";
      } else {
        errorMsg = err.message || errorMsg;
      }
      alert(`Error al actualizar el presupuesto: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
      console.log("--- Finalizando handleSubmit ---");
    }
  };

  // --- Renderizado ---
  return (
    <div className="max-w-4xl mx-auto p-4 min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* --- Sección de Búsqueda --- */}
      {!selectedBudgetId && (
        <div className="mb-8 p-6 bg-white rounded-2xl shadow-xl border border-gray-200">
          <label htmlFor="searchAddress" className="block text-base font-semibold text-blue-900 mb-2">
            Search by Address, Permit # or Applicant
          </label>
          <input
            type="text"
            id="searchAddress"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type to search..."
            className="input-style w-full border border-gray-300 rounded-lg px-4 py-2 text-base focus:ring-2 focus:ring-blue-400 focus:border-blue-500"
            list="address-suggestions"
            autoComplete="off"
          />
          <datalist id="address-suggestions">
            {uniqueAddresses.map((address, index) => (
              <option key={index} value={address} />
            ))}
          </datalist>
          {loadingList && <p className="text-sm text-blue-500 mt-2">Searching budgets...</p>}
          {listError && <p className="text-sm text-red-600 mt-2">Error: {listError}</p>}
          {searchResults.length > 0 && (
            <ul className="mt-4 border border-gray-200 rounded-lg max-h-60 overflow-y-auto bg-white shadow">
              {searchResults.map(budget => (
                <li key={budget.idBudget} className="border-b border-gray-100 last:border-b-0">
                  <button
                    onClick={() => handleSelectBudget(budget.idBudget)}
                    className="w-full text-left p-3 hover:bg-blue-50 focus:outline-none focus:bg-blue-100 transition duration-150 ease-in-out rounded-lg"
                  >
                    <p className="font-medium text-base text-blue-900">{budget.propertyAddress}</p>
                    <p className="text-xs text-gray-600">
                      Permit: {budget.Permit?.permitNumber || 'N/A'} | Applicant: {budget.applicantName || 'N/A'} | Date: {budget.date ? format(parseISO(budget.date), 'MM/dd/yyyy') : 'N/A'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searchTerm && searchResults.length === 0 && !loadingList && (
            <p className="text-sm text-gray-500 mt-2">No matching budgets found.</p>
          )}
        </div>
      )}

      {/* --- Sección de Edición --- */}
      {selectedBudgetId && (
        <>
          <button onClick={handleSearchAgain} className="mb-4 text-sm text-blue-700 hover:text-blue-900 hover:underline font-semibold">
            &larr; Back
          </button>
          {loadingCurrentBudget && !formData && <div className="text-center p-4 text-blue-600">Loading budget data...</div>}
          {currentBudgetError && !formData && <div className="text-center p-4 text-red-600">Error loading data: {currentBudgetError}</div>}
          {formData && (
            <form onSubmit={handleSubmit} className="space-y-8 bg-white shadow-2xl rounded-2xl p-8 border border-gray-200">
              <h3 className="text-2xl font-bold border-b border-gray-200 pb-3 mb-6 text-blue-900">Edit Budget #{selectedBudgetId}</h3>
              {/* --- Datos del Permit (No editables) --- */}
              <fieldset className="border border-gray-200 p-4 rounded-lg mb-6">
                <legend className="text-lg font-semibold text-blue-800 px-2">Permit Information</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Permit #</label>
                    <p className="mt-1 text-base text-gray-900 font-semibold">{formData.permitNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Address</label>
                    <p className="mt-1 text-base text-gray-900 font-semibold">{formData.propertyAddress || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Applicant</label>
                    <p className="mt-1 text-base text-gray-900 font-semibold">{formData.applicantName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Lot / Block</label>
                    <p className="mt-1 text-base text-gray-900 font-semibold">{formData.lot || 'N/A'} / {formData.block || 'N/A'}</p>
                  </div>
                </div>
              </fieldset>
              {/* --- Datos Generales del Presupuesto (Editables) --- */}
              <fieldset className="border border-gray-200 p-4 rounded-lg mb-6">
                <legend className="text-lg font-semibold text-blue-800 px-2">Budget Details</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
                    <input type="date" id="date" name="date" value={formData.date} onChange={handleGeneralInputChange} className="input-style mt-1" />
                  </div>
                  <div>
                    <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700">Expiration Date</label>
                    <input type="date" id="expirationDate" name="expirationDate" value={formData.expirationDate} onChange={handleGeneralInputChange} className="input-style mt-1" />
                  </div>
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                    <select id="status" name="status" value={formData.status} onChange={handleGeneralInputChange} className="input-style mt-1">
                      <option value="created">Created</option>
                      <option value="send">Send</option>
                      <option value="sent">Sent</option>
                      <option value="sent_for_signature">Sent for Signature</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="notResponded">No Response</option>
                      <option value="signed">Signed</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label htmlFor="generalNotes" className="block text-sm font-medium text-gray-700">General Notes</label>
                  <textarea id="generalNotes" name="generalNotes" value={formData.generalNotes} onChange={handleGeneralInputChange} rows="3" className="input-style mt-1"></textarea>
                </div>
              </fieldset>
              {/* --- Líneas de Items (Editables: Cantidad y Notas) --- */}
              <fieldset className="border border-gray-200 p-4 rounded-lg mb-6">
                <legend className="text-lg font-semibold text-blue-800 px-2">Budget Items</legend>
                <div className="space-y-4">
                  {formData.lineItems.map((item, index) => (
                    <div key={item._tempId || item.id || index} className="border-b border-gray-100 pb-4 last:border-b-0">
                      <p className="font-medium text-blue-900">{item.name} <span className="text-xs text-gray-500">({item.category})</span></p>
                      <p className="text-sm text-gray-600">Brand: {item.marca || 'N/A'} | Capacity: {item.capacity || 'N/A'} | Unit Price: ${item.unitPrice.toFixed(2)}</p>
                      {item.description && (
                        <p className="text-sm text-gray-500 italic">Description: {item.description}</p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                        <div>
                          <label htmlFor={`quantity-${index}`} className="block text-xs font-medium text-gray-700">Quantity</label>
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
                          <label htmlFor={`notes-${index}`} className="block text-xs font-medium text-gray-700">Item Notes</label>
                          <input
                            type="text"
                            id={`notes-${index}`}
                            value={item.notes}
                            onChange={(e) => handleLineItemChange(index, 'notes', e.target.value)}
                            className="input-style mt-1 text-sm"
                          />
                        </div>
                      </div>
                      <button type="button" onClick={() => handleRemoveLineItem(index)} className="text-red-500 text-xs mt-1 hover:underline">Remove Item</button>
                    </div>
                  ))}
                </div>
              </fieldset>
              {/* --- Agregar Items del Catálogo --- */}
              <fieldset className="border border-gray-200 p-4 rounded-lg mb-6">
                <legend className="text-lg font-semibold text-blue-800 px-2">Add Catalog Items</legend>
                
                {loadingCatalog && (
                  <p className="text-sm text-blue-500 mb-4">Cargando catálogo de items...</p>
                )}
                
                {catalogError && (
                  <p className="text-sm text-red-600 mb-4">Error al cargar catálogo: {catalogError}</p>
                )}

                {!loadingCatalog && !catalogError && availableCategories.length > 0 && (
                  <div className="space-y-3">
                    {availableCategories.map(category => (
                      <DynamicCategorySection
                        key={category}
                        category={category}
                        normalizedCatalog={normalizedBudgetItemsCatalog}
                        isVisible={dynamicSectionVisibility[category] || false}
                        onToggle={() => toggleDynamicSection(category)}
                        onAddItem={addItemFromDynamicSection}
                        generateTempId={generateTempId}
                      />
                    ))}
                  </div>
                )}

                {!loadingCatalog && !catalogError && availableCategories.length === 0 && (
                  <p className="text-sm text-gray-500">No hay categorías disponibles en el catálogo.</p>
                )}
              </fieldset>
              {/* --- Añadir Item Manualmente --- */}
              <fieldset className="border border-gray-200 p-4 rounded-lg mb-6">
                <legend className="text-lg font-semibold text-blue-800 px-2">Add Manual Item</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="manualCategory" className="block text-xs font-medium text-gray-700">Categoría</label>
                    <input type="text" id="manualCategory" name="category" value={manualItemData.category} onChange={handleManualItemChange} className="input-style mt-1 text-sm" placeholder="Ej: SYSTEM TYPE" />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="manualName" className="block text-xs font-medium text-gray-700">Nombre del Item</label>
                    <input type="text" id="manualName" name="name" value={manualItemData.name} onChange={handleManualItemChange} className="input-style mt-1 text-sm" placeholder="Ej: NEW SYSTEM INSTALLATION" />
                  </div>
                  <div>
                    <label htmlFor="manualUnitPrice" className="block text-xs font-medium text-gray-700">Precio Unitario ($)</label>
                    <input type="number" id="manualUnitPrice" name="unitPrice" value={manualItemData.unitPrice} onChange={handleManualItemChange} className="input-style mt-1 text-sm" placeholder="Ej: 150.00" min="0" step="0.01" />
                  </div>
                  <div>
                    <label htmlFor="manualQuantity" className="block text-xs font-medium text-gray-700">Cantidad</label>
                    <input type="number" id="manualQuantity" name="quantity" value={manualItemData.quantity} onChange={handleManualItemChange} className="input-style mt-1 text-sm" placeholder="Ej: 1" min="0.01" step="0.01" />
                  </div>
                  <div className="md:col-span-3"> {/* ✅ AGREGAR CAMPO DESCRIPTION */}
                    <label htmlFor="manualDescription" className="block text-xs font-medium text-gray-700">Descripción (Opcional)</label>
                    <textarea
                      id="manualDescription"
                      name="description"
                      value={manualItemData.description}
                      onChange={handleManualItemChange}
                      className="input-style mt-1 text-sm"
                      placeholder="Descripción detallada del item..."
                      rows="3"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label htmlFor="manualNotes" className="block text-xs font-medium text-gray-700">Notas (Opcional)</label>
                    <input type="text" id="manualNotes" name="notes" value={manualItemData.notes} onChange={handleManualItemChange} className="input-style mt-1 text-sm" placeholder="Detalles adicionales..." />
                  </div>
                </div>
                <div className="mt-4 text-right">
                  <button
                    type="button"
                    onClick={handleAddManualItem}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Añadir Item Manual al Presupuesto
                  </button>
                </div>
              </fieldset>
              {/* --- Descuento y Totales --- */}
              <fieldset className="border border-gray-200 p-4 rounded-lg mb-6">
                <legend className="text-lg font-semibold text-blue-800 px-2">Financial Summary</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="discountDescription" className="block text-sm font-medium text-gray-700">Discount Description</label>
                    <input type="text" id="discountDescription" name="discountDescription" value={formData.discountDescription} onChange={handleGeneralInputChange} className="input-style mt-1" />
                  </div>
                  <div>
                    <label htmlFor="discountAmount" className="block text-sm font-medium text-gray-700">Discount Amount ($)</label>
                    <input type="number" id="discountAmount" name="discountAmount" value={formData.discountAmount} onChange={handleGeneralInputChange} className="input-style mt-1" min="0" step="0.01" />
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-right">
                  <p className="text-sm text-gray-600">Subtotal: <span className="font-medium text-gray-900">${formData.subtotalPrice.toFixed(2)}</span></p>
                  <p className="text-sm text-gray-600">Discount: <span className="font-medium text-red-600">-${(parseFloat(formData.discountAmount) || 0).toFixed(2)}</span></p>
                  <p className="text-lg font-semibold text-blue-900">Total: ${formData.totalPrice.toFixed(2)}</p>
                  <p className="text-md font-medium text-blue-700">Initial Payment Required: ${formData.initialPayment.toFixed(2)}</p>
                </div>
              </fieldset>
              {/* --- Botón de Envío --- */}
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-blue-700 text-white rounded-lg font-bold shadow hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 text-lg"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
          {!formData && !loadingCurrentBudget && !currentBudgetError && (
            <div className="text-center p-4 text-orange-600">Could not display form data. Check console.</div>
          )}
        </>
      )}
      <style>{`.input-style { border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.75rem 1rem; width: 100%; box-sizing: border-box; font-size: 1rem; } .input-style:focus { outline: 2px solid transparent; outline-offset: 2px; border-color: #2563eb; box-shadow: 0 0 0 2px #bfdbfe; }`}</style>
    </div>
  );
};

export default EditBudget;