import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import { unwrapResult } from '@reduxjs/toolkit';
import { fetchBudgetItems } from "../../Redux/Actions/budgetItemActions";
import { fetchPermitById } from "../../Redux/Actions/permitActions";
import { createBudget } from "../../Redux/Actions/budgetActions";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import Swal from 'sweetalert2';
import DynamicCategorySection from "./DynamicCategorySection";
 
// --- Helper para generar IDs temporales ---
const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// --- Helper para formatear fecha a MM-DD-YYYY ---
const formatDateMMDDYYYY = (isoDateString) => {
  if (!isoDateString || typeof isoDateString !== 'string') {
    return ''; // Devuelve vacío si no hay fecha o no es string
  }
  try {
    // Asegurarse de que la fecha se interprete correctamente (UTC para evitar problemas de zona horaria)
    const date = new Date(isoDateString + 'T00:00:00Z');
    if (isNaN(date.getTime())) {
      return ''; // Devuelve vacío si la fecha no es válida
    }
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${month}-${day}-${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return ''; // Devuelve vacío en caso de error
  }
};
// --- Hook para leer Query Params ---
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const CreateBudget = () => {
  const query = useQuery();
  const permitIdFromQuery = query.get("permitId");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    renderToolbar: (Toolbar) => (
      <Toolbar>
        {(props) => (
          <div
            style={{
              alignItems: 'center',
              display: 'flex',
              width: '100%',
              padding: '0 8px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              minHeight: '40px',
            }}
          >
            <div style={{ padding: '0px 4px' }}>
              <props.GoToPreviousPage />
            </div>
            <div style={{ padding: '0px 4px', display: 'flex', alignItems: 'center', fontSize: '0.875rem' }}>
              <props.CurrentPageInput />
              <span style={{ margin: '0 6px', color: '#64748b' }}>/</span>
              <props.NumberOfPages />
            </div>
            <div style={{ padding: '0px 4px' }}>
              <props.GoToNextPage />
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                <div style={{ padding: '0px 2px' }}>
                    <props.ZoomOut />
                </div>
                <div style={{ padding: '0px 2px' }}>
                    <props.Zoom />
                </div>
                <div style={{ padding: '0px 2px' }}>
                    <props.ZoomIn />
                </div>
            </div>
          </div>
        )}
      </Toolbar>
    ),
  });

  // --- Estado del Catálogo y Carga ---
  const { items: budgetItemsCatalog = [], loading: loadingCatalog, error: errorCatalog } = useSelector(state => state.budgetItems) || {};
  console.log("Catálogo de items:", budgetItemsCatalog);

  // --- Estado del Permit seleccionado ---
  const { selectedPermit, loading: loadingPermit, error: errorPermit } = useSelector(state => state.permit) || {};
  console.log("Permit seleccionado:", selectedPermit);
  const [permitExpirationAlert, setPermitExpirationAlert] = useState({ type: "", message: "" });
  const [pdfPreview, setPdfPreview] = useState(null);
  const [optionalDocPreview, setOptionalDocPreview] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false); // Estado para deshabilitar botón
  const [createdBudgetInfo, setCreatedBudgetInfo] = useState(null); // Para guardar info del budget creado
 
  // Define standard input classes for reuse
  const standardInputClasses = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";
  const readOnlyInputClasses = "mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm cursor-default";

  //estados items manual 
  const [manualItem, setManualItem] = useState({
    category: "",
    customCategory: "",
    name: "",
    unitPrice: "",
    quantity: "",
    description: "", // Added description field
  });
  const [normalizedBudgetItemsCatalog, setNormalizedBudgetItemsCatalog] = useState([]);

  useEffect(() => {
    const normalizedCatalog = budgetItemsCatalog
      .filter(item => item.isActive && item.category) // Filtrar solo items activos y con categoría válida
      .map(item => ({
        ...item,
        category: item.category?.toUpperCase().trim() || '',
        name: item.name?.toUpperCase().trim() || '',
        marca: item.marca?.toUpperCase().trim() || '',
        capacity: item.capacity?.toUpperCase().trim() || '',
      }));
    console.log("Categorías disponibles:", [...new Set(normalizedCatalog.map(item => item.category))]);
    setNormalizedBudgetItemsCatalog(normalizedCatalog);
  }, [budgetItemsCatalog]);

  // --- Estado para visibilidad de secciones de items ---
  const [sectionVisibility, setSectionVisibility] = useState({
    manualItem: false, 
  });
  
  const toggleSection = (sectionName) => {
    setSectionVisibility(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  // --- Estado del Formulario (Inicializado para creación) ---
  const [formData, setFormData] = useState({
    permitNumber: "",
    propertyAddress: "",
    applicantName: "",
    lot: "",
    block: "",
    date: new Date().toISOString().split('T')[0],
    expirationDate: "", // Se calculará automáticamente
    initialPayment: 0,
    status: "created", // Estado inicial por defecto
    discountDescription: "",
    discountAmount: "", // Cambiar de 0 a string vacío
    generalNotes: "",
    lineItems: [],
    subtotalPrice: 0,
    totalPrice: 0,
    initialPaymentPercentage: '60',
    excavationRequired: "",
    drainfieldDepth: "",
    systemType: "",
  });

  // --- Cargar Datos Iniciales (Catálogo y Permit) ---
  useEffect(() => {
    // Siempre cargar catálogo
    dispatch(fetchBudgetItems());

    // Cargar Permit si hay ID en la query
    if (permitIdFromQuery) {
      console.log(`Modo Creación: Cargando Permit ID ${permitIdFromQuery}`);
      dispatch(fetchPermitById(permitIdFromQuery));
    } else {
      console.warn("No se proporcionó permitId en la URL para crear el presupuesto.");
      // Opcional: Redirigir o mostrar un mensaje si el permitId es obligatorio
      // navigate('/ruta-error');
      // alert("Se requiere un ID de permiso para  presupuesto.");
    }
  }, [dispatch, permitIdFromQuery]); // Dependencias simplificadas

  // --- Efecto para poblar el formulario cuando el Permit carga ---
  useEffect(() => {
    console.log("Effect para poblar formulario ejecutado. selectedPermit:", selectedPermit);
    if (selectedPermit && selectedPermit.idPermit === permitIdFromQuery) { // Asegurarse que es el permit correcto
      console.log("Poblando formulario desde Permit:", selectedPermit);
      // Construir los lineItems iniciales
      let initialLineItems = [];
      // Si excavationRequired tiene texto, agregar item EXCAVATION incluido
      if (selectedPermit.excavationRequired && selectedPermit.excavationRequired.trim() !== "") {
        initialLineItems.push({
          _tempId: generateTempId(),
          budgetItemId: null, // Item manual
          category: "EXCAVATION",
          name: "EXCAVATION",
          included: true,
          description: `EXCAVATION DRAINFIELD ${selectedPermit.drainfieldDepth} SF`,
          unitPrice: 0,
          quantity: 1,
          notes: "Incluido automáticamente por excavationRequired"
        });
      }
      setFormData(prev => ({
        ...prev,
        permitNumber: selectedPermit.permitNumber || "",
        propertyAddress: selectedPermit.propertyAddress || "",
        applicantName: selectedPermit.applicantName || selectedPermit.applicant || "", // Considerar ambos campos
        lot: selectedPermit.lot || "",
        block: selectedPermit.block || "",
        // Resetear campos específicos del budget al cargar nuevo permit
        lineItems: initialLineItems,
        discountAmount: "", // Cambiar de 0 a string vacío
        discountDescription: "",
        generalNotes: "",
        initialPayment: 0,
        date: new Date().toISOString().split('T')[0], // Resetear fecha a hoy
        expirationDate: "", // Se recalculará
        status: "created",
        initialPaymentPercentage: '60',
         excavationRequired: selectedPermit.excavationRequired || "",
         drainfieldDepth: selectedPermit.drainfieldDepth || "",
         systemType: selectedPermit.systemType || "",
      }));

       // --- Establecer alerta de expiración del Permit ---
       if (selectedPermit.expirationStatus === "expired" || selectedPermit.expirationStatus === "soon_to_expire") {
        setPermitExpirationAlert({
          type: selectedPermit.expirationStatus === "expired" ? "error" : "warning",
          message: selectedPermit.expirationMessage || 
                   (selectedPermit.expirationStatus === "expired" 
                     ? "El permiso asociado está VENCIDO." 
                     : "El permiso asociado está PRÓXIMO A VENCER.")
        });
      } else if (selectedPermit.expirationStatus === "valid") {
        setPermitExpirationAlert({ type: "", message: "" }); // Limpiar alerta si es válido
      } else if (!selectedPermit.expirationStatus && selectedPermit.expirationDate) {
        // Fallback si expirationStatus no vino pero sí la fecha, recalcular simple
        const today = new Date(); today.setHours(0,0,0,0);
        const expDatePermit = new Date(selectedPermit.expirationDate + 'T00:00:00Z');
        if (!isNaN(expDatePermit.getTime())) {
            if (expDatePermit < today) {
                 setPermitExpirationAlert({type: "error", message: `El permiso asociado expiró el ${expDatePermit.toLocaleDateString()}.`});
            }
        }
      }
   
      if (selectedPermit.pdfData) { // Asumiendo que ahora viene como URL
        setPdfPreview(selectedPermit.pdfData.data);
      } else {
        setPdfPreview(null); // Limpiar si no hay PDF
      }
      if (selectedPermit.optionalDocs) { // Asumiendo que ahora viene como URL
        setOptionalDocPreview(selectedPermit.optionalDocs.data);
      } else {
        setOptionalDocPreview(null); // Limpiar si no hay doc opcional
      }
    } else if (!permitIdFromQuery && !loadingPermit) { 
      setPermitExpirationAlert({ type: "error", message: "No se ha cargado la información del permiso." });
  }
  }, [selectedPermit, permitIdFromQuery, loadingPermit]); // Dependencias ajustadas

  // --- Calcular Totales (Subtotal, Total, Initial Payment) ---
  useEffect(() => {
    const subtotal = formData.lineItems.reduce((sum, item) => {
      const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
      return sum + lineTotal;
    }, 0);

    const discountValue = parseFloat(formData.discountAmount) || 0;
    const total = subtotal - discountValue;

    let payment = 0;
    const percentage = parseFloat(formData.initialPaymentPercentage);
    if (!isNaN(percentage)) {
      payment = (total * percentage) / 100;
    } else if (formData.initialPaymentPercentage === 'total') {
      payment = total;
    }

    // Evitar re-renderizado innecesario si los valores no cambian
    if (subtotal !== formData.subtotalPrice || total !== formData.totalPrice || payment !== formData.initialPayment) {
      setFormData(prev => ({
        ...prev,
        subtotalPrice: subtotal,
        totalPrice: total,
        initialPayment: payment,
      }));
    }
  }, [formData.lineItems, formData.discountAmount, formData.initialPaymentPercentage, formData.subtotalPrice, formData.totalPrice, formData.initialPayment]); // Añadidas dependencias calculadas

  // --- Effect para calcular Expiration Date siempre que Date cambie ---
  useEffect(() => {
    if (formData.date) {
      try {
        const startDate = new Date(formData.date + 'T00:00:00');
        if (!isNaN(startDate.getTime())) {
          const expiration = new Date(startDate);
          expiration.setDate(startDate.getDate() + 30);
          const expirationString = expiration.toISOString().split('T')[0];
          if (expirationString !== formData.expirationDate) {
            setFormData(prev => ({ ...prev, expirationDate: expirationString }));
          }
        } else if (formData.expirationDate !== "") {
          setFormData(prev => ({ ...prev, expirationDate: "" }));
        }
      } catch (error) {
        console.error("Error calculating expiration date:", error);
        if (formData.expirationDate !== "") {
          setFormData(prev => ({ ...prev, expirationDate: "" }));
        }
      }
    } else if (formData.expirationDate !== "") {
      setFormData(prev => ({ ...prev, expirationDate: "" }));
    }
  }, [formData.date, formData.expirationDate]); // Añadida dependencia expirationDate




  // --- Handlers para Inputs Generales ---
const handleGeneralInputChange = (e) => {
  const { name, value } = e.target;
  const isNumeric = ['discountAmount'].includes(name);
  
  if (isNumeric) {
    // Permitir valores vacíos y números válidos
    if (value === '' || (!isNaN(value) && parseFloat(value) >= 0)) {
      setFormData(prev => ({
        ...prev,
        [name]: value // Mantener como string
      }));
    }
  } else {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  }
};

  const handlePaymentPercentageChange = (e) => {
    setFormData(prev => ({ ...prev, initialPaymentPercentage: e.target.value }));
  };

  // --- Función addOrUpdateLineItem (Modificada para reemplazar opcionalmente) ---
  const addOrUpdateLineItem = (itemDetails, replaceIfExists = false) => {
    console.log("Buscando item con:", itemDetails);

    // Buscar el item en el catálogo (comparando también descripción si corresponde)
    const foundItem = normalizedBudgetItemsCatalog.find(catalogItem => {
      let match = catalogItem.category === itemDetails.category?.toUpperCase();
      if (match && itemDetails.name !== undefined) match = catalogItem.name === itemDetails.name?.toUpperCase();
      if (match && itemDetails.marca !== undefined) match = (catalogItem.marca || '') === (itemDetails.marca?.toUpperCase() || '');
      if (match && itemDetails.capacity !== undefined) match = (catalogItem.capacity || '') === (itemDetails.capacity?.toUpperCase() || '');
      if (match && itemDetails.description !== undefined) match = (catalogItem.description || '') === (itemDetails.description?.toUpperCase() || '');
      return match;
    });

    if (!foundItem) {
      alert(`No se encontró un item en el catálogo para: ${itemDetails.category} - ${itemDetails.name || ''} - ${itemDetails.marca || ''} - ${itemDetails.capacity || ''}`);
      console.error("No se encontró item para:", itemDetails, "en", normalizedBudgetItemsCatalog);
      return;
    }

    console.log("Item encontrado en catálogo:", foundItem);

    setFormData(prev => {
      const existingItemIndex = prev.lineItems.findIndex(line => line.budgetItemId === foundItem.id);
      let newLineItems;
      const newItemData = {
        _tempId: generateTempId(),
        budgetItemId: foundItem.id,
        quantity: parseFloat(itemDetails.quantity) || 1,
        notes: itemDetails.notes || '',
        name: foundItem.name,
        category: foundItem.category,
        marca: foundItem.marca || '',
        capacity: foundItem.capacity || '',
        unitPrice: parseFloat(foundItem.unitPrice) || 0,
      };

      if (existingItemIndex > -1) {
        console.log("Item existente encontrado en índice:", existingItemIndex);
        newLineItems = [...prev.lineItems];
        if (replaceIfExists) {
          newItemData._tempId = newLineItems[existingItemIndex]._tempId;
          newLineItems[existingItemIndex] = newItemData;
        } else {
          const currentItem = newLineItems[existingItemIndex];
          const newQuantity = (parseFloat(currentItem.quantity) || 0) + (parseFloat(itemDetails.quantity) || 0);
          newLineItems[existingItemIndex] = { ...currentItem, quantity: newQuantity, notes: itemDetails.notes || currentItem.notes };
        }
      } else {
        console.log("Añadiendo nuevo item.");
        newLineItems = [...prev.lineItems, newItemData];
      }
      return { ...prev, lineItems: newLineItems };
    });
  };

  const handleRemoveItem = (tempIdToRemove) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item._tempId !== tempIdToRemove)
    }));
  };

  //handle item manual
const handleManualItemChange = (e) => {
  const { name, value } = e.target;
  const isNumeric = ['unitPrice', 'quantity'].includes(name);
  if (name === 'category') {
    setManualItem(prev => ({
      ...prev,
      category: value,
      // Reset customCategory if not 'other'
      customCategory: value === 'other' ? prev.customCategory : '',
    }));
    return;
  }
  if (isNumeric) {
    if (value === '' || (!isNaN(value) && parseFloat(value) >= 0)) {
      setManualItem(prev => ({
        ...prev,
        [name]: value
      }));
    }
  } else {
    setManualItem(prev => ({
      ...prev,
      [name]: value,
    }));
  }
};

// Modificar la validación en addManualItem
const addManualItem = () => {
  const unitPrice = parseFloat(manualItem.unitPrice) || 0;
  const quantity = parseFloat(manualItem.quantity) || 1;
  let categoryValue = manualItem.category === 'other' ? manualItem.customCategory : manualItem.category;
  if (!categoryValue || !manualItem.name || unitPrice <= 0 || quantity <= 0) {
    alert("Por favor complete todos los campos del item manual.");
    return;
  }
  setFormData(prev => ({
    ...prev,
    lineItems: [...prev.lineItems, {
      _tempId: generateTempId(),
      budgetItemId: null,
      category: categoryValue.toUpperCase(),
      name: manualItem.name.toUpperCase(),
      unitPrice: unitPrice,
      quantity: quantity,
      description: manualItem.description,
      notes: "Item Manual",
    }],
  }));
  setManualItem({ category: "", customCategory: "", name: "", unitPrice: "", quantity: "", description: "" });
};


 // --- Obtener todas las categorías disponibles dinámicamente ---
const customCategoryOrder = [
  'SYSTEM TYPE',
  'SISTEMA CHAMBERS',
  'ACCESORIOS',
  'PUMP',
  'SAND',
  'DIRT',
  'ROCK',
  'INSPECTION',
  'LABOR FEE',
  // El resto aparecerá después
];
  const availableCategories = useMemo(() => {
    const categories = [...new Set(normalizedBudgetItemsCatalog.map(item => item.category))];
    // Filtrar para NO mostrar la categoría "MATERIALES"
    const filtered = categories.filter(cat => (cat || '').toUpperCase().trim() !== 'MATERIALES');
    // Ordenar según customCategoryOrder, el resto al final
    return filtered.sort((a, b) => {
      const aIdx = customCategoryOrder.indexOf((a || '').toUpperCase());
      const bIdx = customCategoryOrder.indexOf((b || '').toUpperCase());
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [normalizedBudgetItemsCatalog]);

  // --- Estado para visibilidad de secciones dinámicas ---
  const [dynamicSectionVisibility, setDynamicSectionVisibility] = useState({});

  // Inicializar visibilidad para nuevas categorías
  useEffect(() => {
    const newVisibility = {};
    availableCategories.forEach(category => {
      if (!(category in dynamicSectionVisibility)) {
        newVisibility[category] = false; // Por defecto cerradas
      }
    });
    if (Object.keys(newVisibility).length > 0) {
      setDynamicSectionVisibility(prev => ({ ...prev, ...newVisibility }));
    }
  }, [availableCategories, dynamicSectionVisibility]);

  const toggleDynamicSection = (category) => {
    setDynamicSectionVisibility(prev => ({ 
      ...prev, 
      [category]: !prev[category] 
    }));
  };

  // --- Función para agregar items desde secciones dinámicas ---
  const addItemFromDynamicSection = (itemData) => {
    if (itemData.budgetItemId === null) {
      // Item personalizado - agregar directamente
      setFormData(prev => ({
        ...prev,
        lineItems: [...prev.lineItems, itemData],
      }));
    } else {
      // Item del catálogo - usar la función existente
      addOrUpdateLineItem(itemData);
    }
  };



  // --- Submit Handler (Solo Crear) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
     // Aunque permitamos crear, podríamos mostrar una confirmación extra si el permiso está vencido
     if (permitExpirationAlert.type === 'error') {
      const confirmExpired = await Swal.fire({
          title: 'Permiso Vencido',
          text: `${permitExpirationAlert.message} ¿Estás seguro de que deseas crear un presupuesto para este permiso vencido?`,
          icon: 'warning', // Usar warning para confirmación, no error para no bloquear
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Sí, crear presupuesto',
          cancelButtonText: 'Cancelar'
      });
      if (!confirmExpired.isConfirmed) {
          setIsSubmitting(false);
          return; // Detener si el usuario cancela
      }
  }
    setIsSubmitting(true); // Deshabilitar botón
    setCreatedBudgetInfo(null); // Limpiar info previa

    if (!permitIdFromQuery) {
      alert("Error: No se encontró el ID del permiso asociado.");
      setIsSubmitting(false);
      return;
    }
    if (formData.lineItems.length === 0) {
      alert("Debe añadir al menos un item al presupuesto.");
      setIsSubmitting(false);
      return;
    }

    // Preparar datos para la creación del presupuesto
    const dataToSend = {
      permitId: permitIdFromQuery, // Asegúrate que este es el nombre correcto esperado por el backend
      date: formData.date,
      expirationDate: formData.expirationDate || null,
      status: formData.status, // Enviar el estado ('created' o el que sea)
      discountDescription: formData.discountDescription,
      discountAmount: parseFloat(formData.discountAmount) || 0, // Convertir a número
      generalNotes: formData.generalNotes,
      initialPaymentPercentage: formData.initialPaymentPercentage,
      lineItems: formData.lineItems.map(item => ({
        budgetItemId: item.budgetItemId || null,
        quantity: item.quantity,
        notes: item.notes || null,
        // Enviar datos de item manual si es necesario
        ...(item.budgetItemId === null && {
          category: item.category,
          name: item.name,
          unitPrice: item.unitPrice, // El backend usará este
          description: item.description || null, // Added description field
        }),
        // Enviar otros campos si el backend los espera
        marca: item.marca || null,
        capacity: item.capacity || null,
        // priceAtTimeOfBudget y unitPrice (para items de catálogo) los determinará el backend
      })),
      // No enviar totales, el backend los calcula
    };

    console.log("Enviando al backend para CREAR:", dataToSend);

    try {
      // Llamar a la acción createBudget
      const resultAction = await dispatch(createBudget(dataToSend));
      const newBudget = unwrapResult(resultAction); // Obtener el budget creado desde la respuesta

      console.log("Presupuesto creado exitosamente por backend:", newBudget);

     

      // Guardar la información del budget creado (incluyendo la URL del PDF)
      setCreatedBudgetInfo(newBudget);

      alert(`Presupuesto #${newBudget.idBudget} creado exitosamente.`);
      // Opcional: No navegar inmediatamente, permitir descargar primero
       navigate('/budgets');

    } catch (error) {
      console.error("Error al crear el presupuesto:", error);
      // Mostrar mensaje de error más detallado si viene del backend
      const errorMsg = error?.error || error?.message || "Error desconocido al crear el presupuesto.";
      alert(`Error al crear el presupuesto: ${errorMsg}`);
    } finally {
      setIsSubmitting(false); // Habilitar botón de nuevo
    }
  };


  // --- Render ---
  const isLoading = loadingCatalog || loadingPermit; // Solo depende de catálogo y permit
  const hasError = errorCatalog || errorPermit; // Solo depende de catálogo y permit

  if (isLoading && !hasError) return <div className="container mx-auto p-6 lg:p-8">Cargando datos...</div>;
  // Mostrar error específico si es posible
  if (errorPermit) return <div className="container mx-auto p-6 lg:p-8 text-red-600">Error cargando datos del permiso: {errorPermit}</div>;
  if (errorCatalog) return <div className="container mx-auto p-6 lg:p-8 text-red-600">Error cargando catálogo de items: {errorCatalog}</div>;
  // Si no hay permitId, mostrar mensaje
  if (!permitIdFromQuery && !isLoading) return <div className="container mx-auto p-6 lg:p-8 text-orange-600">No se especificó un permiso para crear el presupuesto. Verifique la URL.</div>;
  // Si el permit cargó pero no se encontró (error 404 simulado por selectedPermit null tras carga)
  if (!selectedPermit && !loadingPermit && permitIdFromQuery && !errorPermit) return <div className="container mx-auto p-6 lg:p-8 text-red-600">No se encontró el permiso con ID: {permitIdFromQuery}</div>;


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto p-3 lg:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
          {/* Columna izquierda: Vista previa de los PDFs */}
          <div className="bg-white shadow-xl rounded-xl p-4 lg:col-span-3 flex flex-col max-h-[calc(100vh-6rem)]">
           

            <div className="flex justify-center space-x-3 mb-1">
              <button
                onClick={() => setCurrentPage(1)}
                className={`py-1 px-2 rounded-lg text-xs  transition-all duration-200 ${
                  currentPage === 1 
                    ? "bg-indigo-600 text-white shadow-lg transform scale-105" 
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-indigo-300"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Permit</span>
                </div>
              </button>
              <button
                onClick={() => setCurrentPage(2)}
                className={`py-1 px-2 rounded-lg text-xs  transition-all duration-200 ${
                  currentPage === 2 
                    ? "bg-indigo-600 text-white shadow-lg transform scale-105" 
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-indigo-300"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>Planos</span>
                </div>
              </button>
            </div>

            {/* Vista previa del PDF */}
            <div className="flex-grow overflow-y-auto border-2 border-gray-200 rounded-xl shadow-inner bg-gradient-to-br from-gray-50 to-gray-100">
              {currentPage === 1 && pdfPreview ? (
                <div className="h-full w-full">
                  <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                    <Viewer
                      fileUrl={pdfPreview}
                      plugins={[defaultLayoutPluginInstance]}
                    />
                  </Worker>
                </div>
              ) : currentPage === 2 && optionalDocPreview ? (
                <div className="h-full w-full">
                  <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                    <Viewer
                      fileUrl={optionalDocPreview}
                      plugins={[defaultLayoutPluginInstance]}
                    />
                  </Worker>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
                  <div className="text-center">
                    <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-500 mb-2">No hay documento disponible</h3>
                    <p className="text-sm text-gray-400">
                      {currentPage === 1
                        ? "No se ha cargado el documento del permiso"
                        : "No se han cargado los planos"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* --- Formulario (Columna Derecha) --- */}
          <div className="bg-white shadow-xl rounded-xl p-6 lg:col-span-2 space-y-6 max-h-[calc(100vh-6rem)] overflow-y-auto">
          
            
            <form onSubmit={handleSubmit} className="space-y-6">

          
            {/* --- Sección Información General (Reestructurada) --- */}
            <div className="border border-gray-200 rounded-lg shadow-sm">
              {/* --- Título de la Sección --- */}
              <div className="bg-gray-50 p-4 border-b border-gray-200 rounded-t-lg">
                <h3 className="text-lg font-semibold text-gray-800">General Information</h3>
               
              </div>

              <div className="p-6 space-y-6">
                {/* --- Detalles del Permiso --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Permit Number</label>
                    <p className="text-sm font-semibold text-gray-800 mt-1">{formData.permitNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Applicant</label>
                    <p className="text-sm font-semibold text-gray-800 mt-1">{formData.applicantName || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500">Property Address</label>
                    <p className="text-sm font-semibold text-gray-800 mt-1">{formData.propertyAddress || 'N/A'}</p>
                  </div>
                </div>

                {/* --- Línea Divisoria --- */}
                <div className="border-t border-gray-200"></div>

                {/* --- Detalles Técnicos --- */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Lot</label>
                    <p className="text-sm font-semibold text-gray-800 mt-1">{formData.lot || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Block</label>
                    <p className="text-sm font-semibold text-gray-800 mt-1">{formData.block || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500">System Type</label>
                    <p className="text-sm font-semibold text-gray-800 mt-1 uppercase">{formData.systemType || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Excavation</label>
                    <p className="text-sm font-semibold text-gray-800 mt-1">{formData.excavationRequired || 'N/A'}</p>
                  </div>
                  {formData.drainfieldDepth && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Drainfield Depth</label>
                      <p className="text-sm font-semibold text-gray-800 mt-1">{formData.drainfieldDepth}</p>
                    </div>
                  )}
                </div>

                {/* --- Alerta de Expiración (si existe) --- */}
                {permitExpirationAlert.message && (
                  <div className={`col-span-full p-4 rounded-md border ${
                    permitExpirationAlert.type === 'error' ? 'bg-red-50 border-red-400 text-red-700' : 'bg-yellow-50 border-yellow-400 text-yellow-700'
                  }`}>
                    <p className="font-bold text-sm flex items-center">
                      <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                      {permitExpirationAlert.type === 'error' ? '¡Permiso Vencido!' : '¡Atención! Permiso Próximo a Vencer'}
                    </p>
                    <p className="text-sm mt-1 pl-7">{permitExpirationAlert.message}</p>
                  </div>
                )}

                {/* --- Línea Divisoria --- */}
                <div className="border-t border-gray-200"></div>

                {/* --- Fechas del Presupuesto --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label htmlFor="budget_date" className="block text-sm font-medium text-gray-700">Date</label>
                    <input id="budget_date" type="date" name="date" value={formData.date} onChange={handleGeneralInputChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  </div>
                  <div>
                    <label htmlFor="budget_expiration" className="block text-sm font-medium text-gray-700">Expiration Date</label>
                    <input id="budget_expiration" type="text" name="expirationDate" value={formatDateMMDDYYYY(formData.expirationDate)} className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm cursor-default" readOnly />
                  </div>
                </div>
              </div>
            </div>
           {/* // --- Sección Items Presupuestables (Collapsible) --- */}
            <div className="border p-4 rounded-lg space-y-4 bg-gray-50">
           

             
          {/* --- Sección Items Presupuestables (Dinámicas) --- */}
      <div className="space-y-4"> 
       
        {/* Generar secciones dinámicamente para cada categoría */}
        {availableCategories.map(category => (
          <DynamicCategorySection
            key={category}
            category={category}
            normalizedCatalog={normalizedBudgetItemsCatalog}
            isVisible={dynamicSectionVisibility[category] || false}
            onToggle={() => toggleDynamicSection(category)}
            onAddItem={addItemFromDynamicSection}
            generateTempId={generateTempId}
            // Pass standardInputClasses for consistent styling within DynamicCategorySection if it uses inputs
            // standardInputClasses={standardInputClasses} 
          />
        ))}

        {/* --- Item Manual (mantener como opción adicional) --- */}
        <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
          <button 
            type="button" 
            onClick={() => toggleSection('manualItem')} 
            className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors"
          >
            <span className="font-semibold text-base text-gray-800">Añadir Item Manual</span>
            {sectionVisibility.manualItem ? 
              <ChevronUpIcon className="h-5 w-5 text-gray-500" /> : 
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            }
          </button>
          {sectionVisibility.manualItem && (
            <fieldset className="p-6 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label htmlFor="manual_category" className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    id="manual_category"
                    name="category"
                    value={manualItem.category}
                    onChange={handleManualItemChange}
                    className={`${standardInputClasses} text-sm`}
                  >
                    <option value="">Seleccione una categoría</option>
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="other">Otra...</option>
                  </select>
                  {manualItem.category === 'other' && (
                    <input
                      type="text"
                      name="customCategory"
                      value={manualItem.customCategory}
                      onChange={handleManualItemChange}
                      placeholder="Ingrese nueva categoría"
                      className={`${standardInputClasses} text-sm mt-2`}
                    />
                  )}
                </div>
                <div>
                  <label htmlFor="manual_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <input 
                    id="manual_name" 
                    type="text" 
                    name="name" 
                    value={manualItem.name} 
                    onChange={handleManualItemChange} 
                    placeholder="Ej: Item Especial" 
                    className={`${standardInputClasses} text-sm`}
                  />
                </div>
                <div>
                  <label htmlFor="manual_price" className="block text-sm font-medium text-gray-700 mb-1">
                    Precio 
                  </label>
                  <input 
                    id="manual_price" 
                    type="number" 
                    name="unitPrice" 
                    value={manualItem.unitPrice} 
                    onChange={handleManualItemChange} 
                    min="0" 
                    step="0.01" 
                    placeholder="0.00" 
                    className={`${standardInputClasses} text-sm`}
                  />
                </div>
                <div>
                  <label htmlFor="manual_quantity" className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad
                  </label>
                  <input 
                    id="manual_quantity" 
                    type="number" 
                    name="quantity" 
                    value={manualItem.quantity} 
                    onChange={handleManualItemChange} 
                    min="1" 
                    placeholder="1" 
                    className={`${standardInputClasses} text-sm`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="manual_description" className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción (Opcional)
                  </label>
                  <textarea
                    id="manual_description"
                    name="description"
                    value={manualItem.description}
                    onChange={handleManualItemChange}
                    placeholder="Detalles adicionales del item manual"
                    rows="3"
                    className={`${standardInputClasses} w-full text-sm`}
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end mt-2">
                  <button 
                    type="button" 
                    onClick={addManualItem} 
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-5 rounded-lg shadow-sm transition-colors text-sm"
                  >
                    Agregar Item Manual
                  </button>
                </div>
              </div>
            </fieldset>
          )}
        </div>
            </div>

              

              {/* --- Lista de Items Añadidos --- */}
              <div className="mt-6 border-t border-gray-200 pt-5 bg-white p-4 rounded-lg shadow">
                <h4 className="text-sm font-semibold mb-4 text-gray-700">Items Añadidos</h4>
                {formData.lineItems.length === 0 ? (
                  <p className="text-gray-500 text-sm py-3 text-center">Aún no se han añadido items.</p>
                ) : (
                  (() => {
                    // --- Custom order for categories ---
                    const customOrder = [
                      'SYSTEM TYPE',
                      'SISTEMA CHAMBERS',
                      'ACCESORIOS',
                      'PUMP',
                      'SAND',
                      'DIRT',
                      'ROCK',
                      'INSPECTION',
                      'LABOR FEE'
                    ];
                    // Sort items: first by custom order, then the rest
                    const orderedItems = [...formData.lineItems].sort((a, b) => {
                      const aIdx = customOrder.indexOf((a.category || '').toUpperCase());
                      const bIdx = customOrder.indexOf((b.category || '').toUpperCase());
                      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                      if (aIdx !== -1) return -1;
                      if (bIdx !== -1) return 1;
                      // If both are not in custom order, keep their original order
                      return 0;
                    });
                    return (
                      <ul className="space-y-3 max-h-80 overflow-y-auto pr-2 -mr-2">
                        {orderedItems.map(item => (
                          <li key={item._tempId} className="flex justify-between items-start text-sm p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors rounded-md">
                            <div className="flex-grow mr-3">
                              <p className="font-semibold text-gray-800">{item.name}</p>
                              <p className="text-gray-600 text-xs">
                                {item.marca && <span>{item.marca}</span>}
                                {item.marca && item.capacity && <span> &bull; </span>}
                                {item.capacity && <span>{item.capacity}</span>}
                              </p>
                              <p className="text-gray-700 text-xs mt-1">Cant: {item.quantity} @ ${parseFloat(item.unitPrice).toFixed(2)} c/u</p>
                              {item.notes && <p className="text-xs text-gray-500 italic mt-1.5 ml-2">- {item.notes}</p>}
                            </div>
                            <button type="button" onClick={() => handleRemoveItem(item._tempId)} className="text-gray-400 hover:text-red-600 text-xs font-medium ml-2 flex-shrink-0 transition-colors py-1 px-2 rounded-full hover:bg-red-50">Eliminar</button>
                          </li>
                        ))}
                      </ul>
                    );
                  })()
                )}
              </div>
            </div>
            {/* --- Descuento --- */}
            <fieldset className="border border-gray-200 p-6 rounded-lg bg-white shadow">
              <legend className="text-lg font-semibold px-3 text-gray-700">Descuento</legend>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center pt-3"> {/* Made discount section responsive */}
                <div className="sm:col-span-2">
                  <label htmlFor="discount_desc" className="block text-xs text-gray-700">Descripción</label>
                  <input id="discount_desc" type="text" name="discountDescription" value={formData.discountDescription} onChange={handleGeneralInputChange} className={standardInputClasses} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="discount_amount" className="block text-xs text-gray-700">Monto ($)</label>
                  <input id="discount_amount" type="number" name="discountAmount" value={formData.discountAmount} onChange={handleGeneralInputChange} min="0" step="0.01" placeholder="0.00" className={standardInputClasses} />
                </div>
              </div>
            </fieldset>

            {/* --- Totales y Pago Inicial --- */}
            <div className="text-right space-y-3 border-t border-gray-200 pt-8 mt-8">
              <p className="text-gray-700">Subtotal: <span className="font-semibold text-gray-900">${formData.subtotalPrice.toFixed(2)}</span></p>
              {(parseFloat(formData.discountAmount) || 0) > 0 && (
                <p className="text-red-600">Descuento ({formData.discountDescription || 'General'}): <span className="font-semibold">-${(parseFloat(formData.discountAmount) || 0).toFixed(2)}</span></p>
              )}
              <p className="text-xl font-bold text-gray-800">Total: <span className="font-semibold text-gray-900">${formData.totalPrice.toFixed(2)}</span></p>
              <div className="flex flex-col sm:flex-row justify-end items-center space-y-3 sm:space-y-0 sm:space-x-4 mt-4 pt-3"> {/* Made payment section responsive */}
                <label htmlFor="payment_perc" className="text-sm font-medium text-gray-700">Pago Inicial:</label>
                <select id="payment_perc" name="initialPaymentPercentage" value={formData.initialPaymentPercentage} onChange={handlePaymentPercentageChange} className={`${standardInputClasses} !mt-0 w-auto min-w-[120px]`}>
                  <option value="60">60%</option>
                  <option value="total">Total (100%)</option>
                </select>
                <span className="text-xl font-semibold text-gray-900">(${formData.initialPayment.toFixed(2)})</span>
              </div>
            </div>

            {/* --- Notas Generales --- */}
            <div className="pt-4">
              <label htmlFor="general_notes" className="block text-sm font-medium text-gray-700 mb-2">Notas Generales</label>
              <textarea id="general_notes" name="generalNotes" value={formData.generalNotes} onChange={handleGeneralInputChange} rows="4" className={`${standardInputClasses} w-full`}></textarea>
            </div>

            {/* --- Botón Submit --- */}
      
       <div className="mt-10 border-t border-gray-200 pt-8">
              {!createdBudgetInfo ? (
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
                  disabled={isSubmitting || isLoading || formData.lineItems.length === 0 || !selectedPermit}
                >
                  {isSubmitting ? 'Creando Presupuesto...' : "Crear Presupuesto"}
                </button>
              ) : (
                <div className="text-center p-4 bg-green-50 border border-green-300 rounded-md">
                  <p className="text-lg font-semibold text-green-700">¡Presupuesto creado exitosamente!</p>
                  <p className="text-sm text-gray-600 mt-1">ID del Presupuesto: {createdBudgetInfo.idBudget}</p> {/* Assuming idBudget from your previous code */}
                  <p className="text-sm text-gray-600">Fecha de Creación: {new Date(createdBudgetInfo.createdAt).toLocaleDateString()}</p>
                  {/* You might want to add a button to view the budget or navigate away */}
                </div>
               
              )}
            </div>
          </form>
        </div>
      </div>

</div>
    </div>
  );
};

export default CreateBudget;