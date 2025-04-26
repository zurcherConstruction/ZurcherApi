import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom"; // Removed useParams
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid'; 
import { unwrapResult } from '@reduxjs/toolkit';
// Actions necesarias
import { fetchBudgetItems } from "../../Redux/Actions/budgetItemActions";
import { fetchPermitById } from "../../Redux/Actions/permitActions";
import { createBudget } from "../../Redux/Actions/budgetActions"; // Removed fetchBudgetById, updateBudget

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

// --- Helper para generar IDs temporales ---
const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// --- Hook para leer Query Params ---
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const CreateBudget = () => {
  // Removed paramBudgetId and isEditing logic
  const query = useQuery();
  const permitIdFromQuery = query.get("permitId");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  // --- Estado del Catálogo y Carga ---
  const { items: budgetItemsCatalog = [], loading: loadingCatalog, error: errorCatalog } = useSelector(state => state.budgetItems) || {};
  console.log("Catálogo de items:", budgetItemsCatalog);

  // --- Estado del Permit seleccionado ---
  const { selectedPermit, loading: loadingPermit, error: errorPermit } = useSelector(state => state.permit) || {};
  console.log("Permit seleccionado:", selectedPermit);

  // --- Estado para la UI (PDFs) ---
  const [pdfPreview, setPdfPreview] = useState(null);
  const [optionalDocPreview, setOptionalDocPreview] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // --- Estado para visibilidad de secciones de items ---
  const [sectionVisibility, setSectionVisibility] = useState({
    systemType: false,
    drainfield: false,
    pump: false, // Pump is simpler, maybe doesn't need collapse? Keeping for consistency.
    sand: false,
    inspection: false,
    labor: false,
  });

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
    discountAmount: 0,
    generalNotes: "",
    lineItems: [],
    subtotalPrice: 0,
    totalPrice: 0,
    initialPaymentPercentage: '60',
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
      // alert("Se requiere un ID de permiso para crear un presupuesto.");
    }
  }, [dispatch, permitIdFromQuery]); // Dependencias simplificadas

  // --- Efecto para poblar el formulario cuando el Permit carga ---
  useEffect(() => {
    console.log("Effect para poblar formulario ejecutado. selectedPermit:", selectedPermit);
    if (selectedPermit && selectedPermit.idPermit === permitIdFromQuery) { // Asegurarse que es el permit correcto
      console.log("Poblando formulario desde Permit:", selectedPermit);
      setFormData(prev => ({
        ...prev,
        permitNumber: selectedPermit.permitNumber || "",
        propertyAddress: selectedPermit.propertyAddress || "",
        applicantName: selectedPermit.applicantName || selectedPermit.applicant || "", // Considerar ambos campos
        lot: selectedPermit.lot || "",
        block: selectedPermit.block || "",
        // Resetear campos específicos del budget al cargar nuevo permit
        lineItems: [],
        discountAmount: 0,
        discountDescription: "",
        generalNotes: "",
        initialPayment: 0,
        date: new Date().toISOString().split('T')[0], // Resetear fecha a hoy
        expirationDate: "", // Se recalculará
        status: "created",
        initialPaymentPercentage: '60',
      }));

      // Mostrar PDFs del Permit
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
    }
  }, [selectedPermit, permitIdFromQuery]); // Dependencias ajustadas

  // --- Calcular Totales (Subtotal, Total, Initial Payment) ---
  useEffect(() => {
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
    setFormData(prev => ({
      ...prev,
      [name]: isNumeric ? parseFloat(value) || 0 : value,
    }));
  };

  const handlePaymentPercentageChange = (e) => {
    setFormData(prev => ({ ...prev, initialPaymentPercentage: e.target.value }));
  };

  // --- Handlers para Manejar Line Items ---
  const addOrUpdateLineItem = (itemDetails) => {
    console.log("Buscando item con:", itemDetails);
    const foundItem = budgetItemsCatalog.find(catalogItem => {
      // Normalizar comparación de categorías y nombres a mayúsculas
      let match = catalogItem.category?.toUpperCase() === itemDetails.category?.toUpperCase();
      if (match && itemDetails.name) match = catalogItem.name?.toUpperCase() === itemDetails.name?.toUpperCase();
      // Comparar marca y capacidad (considerando nulos/vacíos)
      if (match && itemDetails.marca !== undefined) match = (catalogItem.marca || '') === (itemDetails.marca || '');
      if (match && itemDetails.capacity !== undefined) match = (catalogItem.capacity || '') === (itemDetails.capacity || '');
      return match;
    });

    if (!foundItem) {
      alert(`No se encontró un item en el catálogo para: ${itemDetails.category} - ${itemDetails.name} - ${itemDetails.marca || ''} - ${itemDetails.capacity || ''}`);
      console.error("No se encontró item para:", itemDetails, "en", budgetItemsCatalog);
      return;
    }
    console.log("Item encontrado en catálogo:", foundItem);

    setFormData(prev => {
      const existingItemIndex = prev.lineItems.findIndex(line => line.budgetItemId === foundItem.id);
      let newLineItems;

      if (existingItemIndex > -1) {
        console.log("Actualizando item existente");
        newLineItems = [...prev.lineItems];
        const currentItem = newLineItems[existingItemIndex];
        // Sumar cantidad o usar la nueva si se prefiere reemplazar
        const newQuantity = (parseFloat(currentItem.quantity) || 0) + (parseFloat(itemDetails.quantity) || 0);
        newLineItems[existingItemIndex] = {
          ...currentItem,
          quantity: newQuantity, // Sumar cantidades
          notes: itemDetails.notes || currentItem.notes, // Mantener notas existentes si no se proveen nuevas
          // unitPrice se mantiene el del catálogo original al añadir
        };
      } else {
        console.log("Añadiendo nuevo item");
        const newItem = {
          _tempId: generateTempId(),
          budgetItemId: foundItem.id,
          quantity: parseFloat(itemDetails.quantity) || 1, // Asegurar que sea número
          notes: itemDetails.notes || '',
          name: foundItem.name,
          category: foundItem.category,
          marca: foundItem.marca || '', // Asegurar que sea string
          capacity: foundItem.capacity || '', // Asegurar que sea string
          unitPrice: parseFloat(foundItem.unitPrice) || 0, // Asegurar que sea número
        };
        newLineItems = [...prev.lineItems, newItem];
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


  const toggleSection = (sectionName) => {
    setSectionVisibility(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  // --- Estados y Handlers específicos para cada sección del formulario ---

  // System Type
  const [systemTypeSelection, setSystemTypeSelection] = useState({ type: '', brand: '', capacity: '', quantity: 1 });
  const [systemTypeManualBrand, setSystemTypeManualBrand] = useState('');
  const [systemTypeManualCapacity, setSystemTypeManualCapacity] = useState('');
  const systemTypeCategoryString = 'SYSTEM TYPE';
  const systemTypeTypes = useMemo(() => [...new Set(budgetItemsCatalog.filter(i => i.category?.toUpperCase() === systemTypeCategoryString).map(i => i.name || ''))].sort(), [budgetItemsCatalog]);
  const systemTypeBrands = useMemo(() => [...new Set(budgetItemsCatalog.filter(i => i.category?.toUpperCase() === systemTypeCategoryString && i.name === systemTypeSelection.type).map(i => i.marca || ''))].sort(), [budgetItemsCatalog, systemTypeSelection.type]);
  const systemTypeCapacities = useMemo(() => [...new Set(budgetItemsCatalog.filter(i => i.category?.toUpperCase() === systemTypeCategoryString && i.name === systemTypeSelection.type && (i.marca || '') === systemTypeSelection.brand).map(i => i.capacity || ''))].sort(), [budgetItemsCatalog, systemTypeSelection.type, systemTypeSelection.brand]);

  const handleSystemTypeChange = (e) => {
    const { name, value } = e.target;
    setSystemTypeSelection(prev => {
      const newState = { ...prev, [name]: value };
      if (name === 'type') {
        newState.brand = '';
        newState.capacity = '';
        setSystemTypeManualBrand('');
        setSystemTypeManualCapacity('');
      }
      if (name === 'brand') {
        newState.capacity = '';
        setSystemTypeManualCapacity('');
        if (value !== 'OTROS') setSystemTypeManualBrand('');
      }
      if (name === 'capacity' && value !== 'OTROS') {
        setSystemTypeManualCapacity('');
      }
      return newState;
    });
  };

  const handleSystemTypeManualChange = (e) => {
    const { name, value } = e.target;
    if (name === 'manualBrand') setSystemTypeManualBrand(value);
    if (name === 'manualCapacity') setSystemTypeManualCapacity(value);
  };

  const addSystemTypeItem = () => {
    if (!systemTypeSelection.type ||
        !systemTypeSelection.brand || (systemTypeSelection.brand === 'OTROS' && !systemTypeManualBrand.trim()) ||
        (systemTypeSelection.brand !== 'OTROS' && !systemTypeSelection.capacity) || // Capacidad requerida si no es OTROS
        (systemTypeSelection.brand === 'OTROS' && !systemTypeManualCapacity.trim())) { // Capacidad manual requerida si marca es OTROS
      alert("Por favor complete todos los campos de System Type, incluyendo los manuales si seleccionó 'OTROS'.");
      return;
    }

    const brandToAdd = systemTypeSelection.brand === 'OTROS' ? systemTypeManualBrand.trim() : systemTypeSelection.brand;
    // Capacidad es opcional si la marca no es 'OTROS', pero si la marca es 'OTROS', la capacidad manual es requerida.
    const capacityToAdd = systemTypeSelection.brand === 'OTROS' ? systemTypeManualCapacity.trim() : systemTypeSelection.capacity;

    addOrUpdateLineItem({
      category: systemTypeCategoryString,
      name: systemTypeSelection.type,
      marca: brandToAdd,
      capacity: capacityToAdd,
      quantity: systemTypeSelection.quantity,
    });
    setSystemTypeSelection({ type: '', brand: '', capacity: '', quantity: 1 });
    setSystemTypeManualBrand('');
    setSystemTypeManualCapacity('');
  };

  // Drainfield
  const [drainfieldSelection, setDrainfieldSelection] = useState({ system: '', quantity: 1, sf: '' });
  const drainfieldCategoryString = 'SISTEMA CHAMBERS';
  const drainfieldSystems = useMemo(() => [...new Set(budgetItemsCatalog.filter(i => i.category?.toUpperCase() === drainfieldCategoryString).map(i => i.name || ''))].sort(), [budgetItemsCatalog]);

  const handleDrainfieldChange = (e) => {
    const { name, value } = e.target;
    setDrainfieldSelection(prev => ({ ...prev, [name]: value }));
  };

  const addDrainfieldItem = () => {
    if (!drainfieldSelection.system) {
      alert("Por favor seleccione un sistema de Drainfield.");
      return;
    }
    addOrUpdateLineItem({
      category: drainfieldCategoryString,
      name: drainfieldSelection.system,
      quantity: drainfieldSelection.quantity,
      notes: drainfieldSelection.sf ? `SF: ${drainfieldSelection.sf}` : '',
    });
    // Resetear selección
    setDrainfieldSelection({ system: '', quantity: 1, sf: '' });
  };

  // Pump
  const [pumpSelection, setPumpSelection] = useState({ addPump: 'No', capacity: '', quantity: 1 });
  const pumpCategoryString = 'PUMP';
  // Asumiendo que el item de bomba se llama 'TANQUE'
  const pumpCapacities = useMemo(() => [...new Set(budgetItemsCatalog.filter(i => i.category?.toUpperCase() === pumpCategoryString && i.name?.toUpperCase() === 'TANQUE').map(i => i.capacity || ''))].sort(), [budgetItemsCatalog]);

  const handlePumpChange = (e) => {
    const { name, value } = e.target;
    setPumpSelection(prev => ({ ...prev, [name]: value, ...(name === 'addPump' && value === 'No' && { capacity: '', quantity: 1 }) })); // Resetear capacidad y cantidad si se selecciona 'No'
  };

  // Efecto para añadir/quitar bomba automáticamente
  useEffect(() => {
    // Encontrar el item PUMP existente, si lo hay
    const existingPumpItemIndex = formData.lineItems.findIndex(item => item.category?.toUpperCase() === pumpCategoryString);

    if (pumpSelection.addPump === 'Yes' && pumpSelection.capacity) {
      const itemToAdd = {
        category: pumpCategoryString,
        name: 'TANQUE',
        capacity: pumpSelection.capacity,
        quantity: pumpSelection.quantity,
      };
      // Buscar el item específico en el catálogo para obtener ID y precio
      const foundCatalogItem = budgetItemsCatalog.find(ci =>
          ci.category?.toUpperCase() === pumpCategoryString &&
          ci.name?.toUpperCase() === 'TANQUE' &&
          (ci.capacity || '') === pumpSelection.capacity
      );

      if (foundCatalogItem) {
          const newItemData = {
              _tempId: generateTempId(),
              budgetItemId: foundCatalogItem.id,
              quantity: parseFloat(pumpSelection.quantity) || 1,
              notes: '',
              name: foundCatalogItem.name,
              category: foundCatalogItem.category,
              marca: foundCatalogItem.marca || '',
              capacity: foundCatalogItem.capacity || '',
              unitPrice: parseFloat(foundCatalogItem.unitPrice) || 0,
          };

          setFormData(prev => {
              let newLineItems = [...prev.lineItems];
              if (existingPumpItemIndex > -1) {
                  // Reemplazar el existente
                  newLineItems[existingPumpItemIndex] = newItemData;
              } else {
                  // Añadir nuevo
                  newLineItems.push(newItemData);
              }
              return { ...prev, lineItems: newLineItems };
          });
      } else {
          console.warn("No se encontró el item de bomba en el catálogo con capacidad:", pumpSelection.capacity);
      }

    } else if (pumpSelection.addPump === 'No' && existingPumpItemIndex > -1) {
      // Remover el item PUMP si existe y se seleccionó 'No'
      setFormData(prev => ({
          ...prev,
          lineItems: prev.lineItems.filter((_, index) => index !== existingPumpItemIndex)
      }));
    }
  }, [pumpSelection.addPump, pumpSelection.capacity, pumpSelection.quantity, budgetItemsCatalog]); // Añadido budgetItemsCatalog como dependencia


  // Arena
  const [sandSelection, setSandSelection] = useState({ capacity: '', quantity: 1, location: '' });
  const sandCategoryString = 'ARENA';
  const sandCapacities = useMemo(() => [...new Set(budgetItemsCatalog.filter(i => i.category?.toUpperCase() === sandCategoryString && i.name?.toUpperCase() === sandCategoryString).map(i => i.capacity || ''))].sort(), [budgetItemsCatalog]);

  const handleSandChange = (e) => {
    const { name, value } = e.target;
    setSandSelection(prev => ({ ...prev, [name]: value }));
  };

  const addSandItem = () => {
    if (!sandSelection.capacity) {
      alert("Por favor seleccione la capacidad/tipo de Arena.");
      return;
    }
    addOrUpdateLineItem({
      category: sandCategoryString,
      name: sandCategoryString,
      capacity: sandSelection.capacity,
      quantity: sandSelection.quantity,
      notes: sandSelection.location ? `Location: ${sandSelection.location}` : '',
    });
    // Resetear selección
    setSandSelection({ capacity: '', quantity: 1, location: '' });
  };

  // Inspección
  const [inspectionSelection, setInspectionSelection] = useState({ marca: '', quantity: 1 });
  const inspectionCategoryString = 'INSPECCION INICIAL AND FEE HEALTH DEPARMENT';
  const inspectionMarcas = useMemo(() => [...new Set(budgetItemsCatalog.filter(i => i.category?.toUpperCase() === inspectionCategoryString).map(i => i.marca || ''))].sort(), [budgetItemsCatalog]);

  const handleInspectionChange = (e) => {
    const { name, value } = e.target;
    setInspectionSelection(prev => ({ ...prev, [name]: value }));
  };

  const addInspectionItem = () => {
    if (!inspectionSelection.marca) {
      alert("Por favor seleccione la marca/tipo de Inspección.");
      return;
    }
    const inspectionItemDetails = budgetItemsCatalog.find(i => i.category?.toUpperCase() === inspectionCategoryString && i.marca === inspectionSelection.marca);
    const inspectionName = inspectionItemDetails?.name || 'Inspection Fee'; // Usar nombre del catálogo o default

    addOrUpdateLineItem({
      category: inspectionCategoryString,
      marca: inspectionSelection.marca,
      quantity: inspectionSelection.quantity,
      name: inspectionName,
      // unitPrice se tomará del catálogo via addOrUpdateLineItem
    });
    // Resetear selección
    setInspectionSelection({ marca: '', quantity: 1 });
  };

  // Labor Fee
  const [laborSelection, setLaborSelection] = useState({ name: '', quantity: 1 });
  const laborCategoryString = 'LABOR FEE';
  const laborNames = useMemo(() => [...new Set(budgetItemsCatalog.filter(i => i.category?.toUpperCase() === laborCategoryString).map(i => i.name || ''))].sort(), [budgetItemsCatalog]);

  const handleLaborChange = (e) => {
    const { name, value } = e.target;
    setLaborSelection(prev => ({ ...prev, [name]: value }));
  };

  const addLaborItem = () => {
    if (!laborSelection.name) {
      alert("Por favor seleccione el tipo de Labor Fee.");
      return;
    }
    addOrUpdateLineItem({
      category: laborCategoryString,
      name: laborSelection.name,
      quantity: laborSelection.quantity,
      // unitPrice se tomará del catálogo via addOrUpdateLineItem
    });
    // Resetear selección
    setLaborSelection({ name: '', quantity: 1 });
  };

  // --- Submit Handler (Solo Crear) ---
  const handleSubmit = async (e) => { // Make the handler async
    e.preventDefault();

    if (!permitIdFromQuery) {
        alert("Error: No se encontró el ID del permiso asociado.");
        return;
    }
    if (formData.lineItems.length === 0) {
      alert("Debe añadir al menos un item al presupuesto.");
      return;
    }

    // Preparar datos solo para creación
    const dataToSend = {
      permitNumber: formData.permitNumber,
      propertyAddress: formData.propertyAddress,
      applicantName: formData.applicantName,
      lot: formData.lot,
      block: formData.block,
      date: formData.date,
      expirationDate: formData.expirationDate || null,
      initialPayment: formData.initialPayment,
      status: formData.status,
      discountDescription: formData.discountDescription,
      discountAmount: formData.discountAmount,
      generalNotes: formData.generalNotes,
      initialPaymentPercentage: formData.initialPaymentPercentage,
      lineItems: formData.lineItems.map(item => ({
        budgetItemId: item.budgetItemId,
        quantity: item.quantity,
        notes: item.notes,
      })),
      permitId: permitIdFromQuery,
    };

    console.log("Enviando al backend para CREAR:", dataToSend);

    try {
      // Dispatch and wait for the result
      const resultAction = await dispatch(createBudget(dataToSend));

      // --- Debugging Logs ---
      console.log("Raw resultAction from dispatch:", JSON.stringify(resultAction, null, 2));
      // Check the action type and if there's an error property even on success
      if (resultAction.type.endsWith('/rejected')) {
          console.error("Thunk was rejected:", resultAction.payload || resultAction.error);
      } else if (resultAction.type.endsWith('/fulfilled')) {
          console.log("Thunk was fulfilled. Payload:", JSON.stringify(resultAction.payload, null, 2));
      }
      // --- End Debugging Logs ---

      // Unwrap the result
      const originalPromiseResult = unwrapResult(resultAction); // This will throw if the action was rejected

      // --- More Debugging ---
      console.log("Unwrapped Result (Payload):", JSON.stringify(originalPromiseResult, null, 2));
      // --- End Debugging ---

      // Check if the payload is actually what we expect BEFORE accessing idBudget
      if (!originalPromiseResult || typeof originalPromiseResult.idBudget === 'undefined') {
          console.error("Payload after unwrapResult is missing idBudget:", originalPromiseResult);
          // Throw an error to be caught by the catch block with a more specific message
          throw new Error("La respuesta del servidor no incluyó el ID del presupuesto esperado.");
      }

      // Access payload directly from the unwrapped result
      const newBudgetId = originalPromiseResult.idBudget;
      alert("Presupuesto creado exitosamente!");
      navigate('/budgets');

    } catch (error) {
      // unwrapResult throws an error if the thunk promise was rejected,
      // or if we threw a new Error above.
      console.error("Error caught during budget creation:", error); // Log the full error object caught

      // Try to extract a meaningful message
      let errorMessage = "Error desconocido al crear."; // Default message
      if (error instanceof Error) {
          // If it's a standard Error object (like the one we threw)
          errorMessage = error.message;
      } else if (error && error.message) {
           // If the caught object has a message property (common for rejection payloads)
           errorMessage = error.message;
      } else if (typeof error === 'string') {
          // If the caught object is just a string
          errorMessage = error;
      }
      // You might want to check error.payload specifically if your rejectWithValue sends structured data
      // else if (error?.payload?.message) { errorMessage = error.payload.message; }


      console.error("Displaying error message:", errorMessage);
      alert(`Error al crear el presupuesto: ${errorMessage}`);
    }
  };

  // --- Render ---
  const isLoading = loadingCatalog || loadingPermit; // Solo depende de catálogo y permit
  const hasError = errorCatalog || errorPermit; // Solo depende de catálogo y permit

  if (isLoading && !hasError) return <div className="container mx-auto p-4">Cargando datos...</div>;
  // Mostrar error específico si es posible
  if (errorPermit) return <div className="container mx-auto p-4 text-red-600">Error cargando datos del permiso: {errorPermit}</div>;
  if (errorCatalog) return <div className="container mx-auto p-4 text-red-600">Error cargando catálogo de items: {errorCatalog}</div>;
  // Si no hay permitId, mostrar mensaje
  if (!permitIdFromQuery && !isLoading) return <div className="container mx-auto p-4 text-orange-600">No se especificó un permiso para crear el presupuesto. Verifique la URL.</div>;
  // Si el permit cargó pero no se encontró (error 404 simulado por selectedPermit null tras carga)
  if (!selectedPermit && !loadingPermit && permitIdFromQuery && !errorPermit) return <div className="container mx-auto p-4 text-red-600">No se encontró el permiso con ID: {permitIdFromQuery}</div>;


  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Columna izquierda: Vista previa de los PDFs */}
        <div className="bg-white shadow-md rounded-lg p-4 md:col-span-2"> {/* Ajustado a 2 columnas */}
          <h2 className="text-xl font-bold mb-4">Vista previa de los PDFs del Permiso</h2>

          <div className="flex justify-center space-x-4 mb-4"> {/* Centrado y con espacio */}
            <button
              onClick={() => setCurrentPage(1)}
             
              className={`py-1 px-3 rounded-md text-sm ${currentPage === 1 ? "bg-blue-950 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Ver PDF Principal
            </button>
            <button
              onClick={() => setCurrentPage(2)}
             
              className={`py-1 px-3 rounded-md text-sm ${currentPage === 2 ? "bg-blue-950 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Ver Documento Opcional
            </button>
          </div>

          {/* Vista previa del PDF */}
            {currentPage === 1 && pdfPreview ? (
            <div className="overflow-y-auto max-h-[700px] border border-gray-300 rounded-md">
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                <Viewer
                  fileUrl={pdfPreview}
                  plugins={[defaultLayoutPluginInstance]}
                />
              </Worker>
            </div>
            ) : currentPage === 2 && optionalDocPreview ? (
            <div className="overflow-y-auto max-h-[700px] border border-gray-300 rounded-md">
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                <Viewer
                  fileUrl={optionalDocPreview}
                  plugins={[defaultLayoutPluginInstance]}
                />
              </Worker>
            </div>
            ) : (
            <p className="text-gray-500">
                {currentPage === 1
                ? "No se ha cargado ningún PDF principal."
                : "No se ha cargado ningún documento opcional."}
              </p>
            )}
          </div>
      
       {/* --- Formulario (Columna Derecha) --- */}
       <div className="bg-white shadow-md rounded-lg p-4 md:col-span-1">
          <h2 className="text-xl font-bold mb-4">Crear Nuevo Presupuesto</h2>
          <form onSubmit={handleSubmit} className="space-y-4"> {/* Changed from grid to space-y */}

            {/* --- Sección Información General (Grid within Space-y) --- */}
            <div className="grid grid-cols-4 gap-4 border-b pb-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500">Permit Number</label>
                  <p className="text-sm font-semibold text-gray-800">{formData.permitNumber || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500">Applicant</label>
                  <p className="text-sm font-semibold text-gray-800">{formData.applicantName || 'N/A'}</p>
                </div>
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-gray-500">Property Address</label>
                  <p className="text-sm font-semibold text-gray-800">{formData.propertyAddress || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500">Lot</label>
                  <p className="text-sm font-semibold text-gray-800">{formData.lot || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500">Block</label>
                  <p className="text-sm font-semibold text-gray-800">{formData.block || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <label htmlFor="budget_date" className="block text-sm font-medium text-gray-700">Date</label>
                  <input id="budget_date" type="date" name="date" value={formData.date} onChange={handleGeneralInputChange} required className="input-style" />
                </div>
                <div className="col-span-2">
                  <label htmlFor="budget_expiration" className="block text-sm font-medium text-gray-700">Expiration Date</label>
                  <input id="budget_expiration" type="date" name="expirationDate" value={formData.expirationDate} className="input-style bg-gray-100" readOnly />
                </div>
            </div>
             {/* --- Sección Items Presupuestables (Collapsible) --- */}
             <div className="border p-3 rounded space-y-2 bg-gray-50">
              <h3 className="text-lg font-semibold text-center text-gray-700 mb-2">Añadir Items</h3>

              {/* System Type Toggle */}
              <div className="border rounded bg-white">
                <button type="button" onClick={() => toggleSection('systemType')} className="w-full flex justify-between items-center p-2 bg-gray-100 hover:bg-gray-200 rounded-t">
                  <span className="font-medium text-sm">System Type</span>
                  {sectionVisibility.systemType ? <ChevronUpIcon className="h-5 w-5 text-gray-600"/> : <ChevronDownIcon className="h-5 w-5 text-gray-600"/>}
                </button>
                {sectionVisibility.systemType && (
                  <fieldset className="p-2 border-t">
                    {/* Content of System Type fieldset */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 items-end">
                      <div className="col-span-2">
                        <label htmlFor="systemType_type" className="block text-xs font-medium text-gray-600">Type</label>
                        <select id="systemType_type" name="type" value={systemTypeSelection.type} onChange={handleSystemTypeChange} className="input-style">
                          <option value="">Select Type</option>
                          {systemTypeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="systemType_brand" className="block text-xs font-medium text-gray-600">Brand</label>
                        <select id="systemType_brand" name="brand" value={systemTypeSelection.brand} onChange={handleSystemTypeChange} disabled={!systemTypeSelection.type} className="input-style">
                          <option value="">Select Brand</option>
                          {systemTypeBrands.map(b => <option key={b} value={b}>{b}</option>)}
                          <option value="OTROS">OTROS</option>
                        </select>
                      </div>
                      <div>
                        {systemTypeSelection.brand === 'OTROS' ? (
                          <>
                            <label htmlFor="systemType_manualBrand" className="block text-xs font-medium text-gray-600">Ingrese Marca</label>
                            <input id="systemType_manualBrand" type="text" name="manualBrand" placeholder="Marca Manual" value={systemTypeManualBrand} onChange={handleSystemTypeManualChange} className="input-style" disabled={!systemTypeSelection.type} />
                          </>
                        ) : <div></div>}
                      </div>
                      <div>
                        <label htmlFor="systemType_capacity" className="block text-xs font-medium text-gray-600">Capacity</label>
                        {systemTypeSelection.brand !== 'OTROS' ? (
                          <select id="systemType_capacity" name="capacity" value={systemTypeSelection.capacity} onChange={handleSystemTypeChange} disabled={!systemTypeSelection.brand} className="input-style">
                            <option value="">Select Capacity</option>
                            {systemTypeCapacities.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <input id="systemType_manualCapacity" type="text" name="manualCapacity" placeholder="Ingrese Capacidad" value={systemTypeManualCapacity} onChange={handleSystemTypeManualChange} className="input-style" disabled={!systemTypeManualBrand.trim()} />
                        )}
                      </div>
                       <div>
                        <label htmlFor="systemType_quantity" className="block text-xs font-medium text-gray-600">Quantity</label>
                        <input id="systemType_quantity" type="number" name="quantity" value={systemTypeSelection.quantity} onChange={handleSystemTypeChange} min="1" className="input-style" />
                      </div>
                      <button type="button" onClick={addSystemTypeItem} className="button-add-item col-span-2 mt-2">Add System</button>
                    </div>
                  </fieldset>
                )}
              </div>

              {/* Drainfield Toggle */}
              <div className="border rounded bg-white">
                 <button type="button" onClick={() => toggleSection('drainfield')} className="w-full flex justify-between items-center p-2 bg-gray-100 hover:bg-gray-200 rounded-t">
                  <span className="font-medium text-sm">Drainfield</span>
                  {sectionVisibility.drainfield ? <ChevronUpIcon className="h-5 w-5 text-gray-600"/> : <ChevronDownIcon className="h-5 w-5 text-gray-600"/>}
                </button>
                {sectionVisibility.drainfield && (
                  <fieldset className="p-2 border-t">
                    {/* Content of Drainfield fieldset */}
                     <div className="grid grid-cols-2 gap-2 items-end">
                      <div>
                        <label htmlFor="drainfield_system" className="block text-xs font-medium text-gray-600">System</label>
                        <select id="drainfield_system" name="system" value={drainfieldSelection.system} onChange={handleDrainfieldChange} className="input-style"><option value="">Select System</option>{drainfieldSystems.map(s => <option key={s} value={s}>{s}</option>)}</select>
                      </div>
                      <div>
                        <label htmlFor="drainfield_quantity" className="block text-xs font-medium text-gray-600">Quantity</label>
                        <input id="drainfield_quantity" type="number" name="quantity" value={drainfieldSelection.quantity} onChange={handleDrainfieldChange} min="1" className="input-style" />
                      </div>
                      <div className="col-span-2">
                        <label htmlFor="drainfield_sf" className="block text-xs font-medium text-gray-600">SF (Optional)</label>
                        <input id="drainfield_sf" type="text" name="sf" placeholder="Square Footage" value={drainfieldSelection.sf} onChange={handleDrainfieldChange} className="input-style" />
                      </div>
                      <button type="button" onClick={addDrainfieldItem} className="button-add-item col-span-2 mt-2">Add Drainfield</button>
                    </div>
                  </fieldset>
                )}
              </div>

              {/* Pump (Simplified - No Toggle, always visible but styled similarly) */}
              <fieldset className="border p-2 rounded bg-white">
                <legend className="text-sm font-medium px-1">Pump</legend> {/* Use legend for simpler sections */}
                <div className="grid grid-cols-2 gap-2 items-center pt-1">
                  <label htmlFor="pump_add" className="text-sm">Add Pump?</label>
                  <select id="pump_add" name="addPump" value={pumpSelection.addPump} onChange={handlePumpChange} className="input-style">
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                  {pumpSelection.addPump === 'Yes' && (
                    <>
                      <label htmlFor="pump_capacity" className="text-sm">Capacity</label>
                      <select id="pump_capacity" name="capacity" value={pumpSelection.capacity} onChange={handlePumpChange} className="input-style"><option value="">Select Capacity</option>{pumpCapacities.map(c => <option key={c} value={c}>{c}</option>)}</select>
                      <label htmlFor="pump_quantity" className="text-sm">Quantity</label>
                      <input id="pump_quantity" type="number" name="quantity" value={pumpSelection.quantity} onChange={handlePumpChange} min="1" className="input-style" />
                    </>
                  )}
                </div>
              </fieldset>

              {/* Arena Toggle */}
              <div className="border rounded bg-white">
                 <button type="button" onClick={() => toggleSection('sand')} className="w-full flex justify-between items-center p-2 bg-gray-100 hover:bg-gray-200 rounded-t">
                  <span className="font-medium text-sm">Arena</span>
                  {sectionVisibility.sand ? <ChevronUpIcon className="h-5 w-5 text-gray-600"/> : <ChevronDownIcon className="h-5 w-5 text-gray-600"/>}
                </button>
                {sectionVisibility.sand && (
                  <fieldset className="p-2 border-t">
                    {/* Content of Arena fieldset */}
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <div>
                        <label htmlFor="sand_capacity" className="block text-xs font-medium text-gray-600">Type/Capacity</label>
                        <select id="sand_capacity" name="capacity" value={sandSelection.capacity} onChange={handleSandChange} className="input-style"><option value="">Select Type/Capacity</option>{sandCapacities.map(c => <option key={c} value={c}>{c}</option>)}</select>
                      </div>
                      <div>
                        <label htmlFor="sand_quantity" className="block text-xs font-medium text-gray-600">Quantity</label>
                        <input id="sand_quantity" type="number" name="quantity" value={sandSelection.quantity} onChange={handleSandChange} min="1" className="input-style" />
                      </div>
                      <div className="col-span-2">
                        <label htmlFor="sand_location" className="block text-xs font-medium text-gray-600">Location (Optional)</label>
                        <input id="sand_location" type="text" name="location" placeholder="Ej: Bajo casa" value={sandSelection.location} onChange={handleSandChange} className="input-style" />
                      </div>
                      <button type="button" onClick={addSandItem} className="button-add-item col-span-2 mt-2">Add Sand</button>
                    </div>
                  </fieldset>
                )}
              </div>

              {/* Inspección Toggle */}
              <div className="border rounded bg-white">
                 <button type="button" onClick={() => toggleSection('inspection')} className="w-full flex justify-between items-center p-2 bg-gray-100 hover:bg-gray-200 rounded-t">
                  <span className="font-medium text-sm">Inspección/Fee</span>
                  {sectionVisibility.inspection ? <ChevronUpIcon className="h-5 w-5 text-gray-600"/> : <ChevronDownIcon className="h-5 w-5 text-gray-600"/>}
                </button>
                {sectionVisibility.inspection && (
                  <fieldset className="p-2 border-t">
                    {/* Content of Inspección fieldset */}
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <div>
                        <label htmlFor="inspection_marca" className="block text-xs font-medium text-gray-600">Type</label>
                        <select id="inspection_marca" name="marca" value={inspectionSelection.marca} onChange={handleInspectionChange} className="input-style"><option value="">Select Type</option>{inspectionMarcas.map(m => <option key={m} value={m}>{m}</option>)}</select>
                      </div>
                      <div>
                        <label htmlFor="inspection_quantity" className="block text-xs font-medium text-gray-600">Quantity</label>
                        <input id="inspection_quantity" type="number" name="quantity" value={inspectionSelection.quantity} onChange={handleInspectionChange} min="1" className="input-style" />
                      </div>
                      <button type="button" onClick={addInspectionItem} className="button-add-item col-span-2 mt-2">Add Inspection</button>
                    </div>
                  </fieldset>
                )}
              </div>

              {/* Labor Fee Toggle */}
              <div className="border rounded bg-white">
                 <button type="button" onClick={() => toggleSection('labor')} className="w-full flex justify-between items-center p-2 bg-gray-100 hover:bg-gray-200 rounded-t">
                  <span className="font-medium text-sm">Labor Fee</span>
                  {sectionVisibility.labor ? <ChevronUpIcon className="h-5 w-5 text-gray-600"/> : <ChevronDownIcon className="h-5 w-5 text-gray-600"/>}
                </button>
                {sectionVisibility.labor && (
                  <fieldset className="p-2 border-t">
                    {/* Content of Labor Fee fieldset */}
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <div>
                        <label htmlFor="labor_name" className="block text-xs font-medium text-gray-600">Fee Type</label>
                        <select id="labor_name" name="name" value={laborSelection.name} onChange={handleLaborChange} className="input-style"><option value="">Select Fee</option>{laborNames.map(n => <option key={n} value={n}>{n}</option>)}</select>
                      </div>
                      <div>
                        <label htmlFor="labor_quantity" className="block text-xs font-medium text-gray-600">Quantity</label>
                        <input id="labor_quantity" type="number" name="quantity" value={laborSelection.quantity} onChange={handleLaborChange} min="1" className="input-style" />
                      </div>
                      <button type="button" onClick={addLaborItem} className="button-add-item col-span-2 mt-2">Add Labor Fee</button>
                    </div>
                  </fieldset>
                )}
              </div>

              {/* --- Lista de Items Añadidos --- */}
              {/* ... (List remains the same) ... */}
               <div className="mt-6 border-t pt-4 bg-white p-3 rounded shadow-sm">
                <h4 className="text-md font-medium mb-2 text-gray-800">Items Añadidos:</h4>
                {formData.lineItems.length === 0 ? (
                  <p className="text-gray-500 text-sm">Aún no se han añadido items.</p>
                ) : (
                  <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {formData.lineItems.map(item => (
                      <li key={item._tempId} className="flex justify-between items-start text-sm border-b pb-1 hover:bg-gray-50">
                        <div className="flex-grow mr-2">
                          <span className="font-medium text-gray-700">{item.name}</span>
                          <span className="text-gray-600"> ({item.marca || item.capacity || item.category})</span>
                          <span className="text-gray-800"> x {item.quantity} @ ${parseFloat(item.unitPrice).toFixed(2)}</span>
                          {item.notes && <span className="block text-xs text-gray-500 italic ml-2">- {item.notes}</span>}
                        </div>
                        <button type="button" onClick={() => handleRemoveItem(item._tempId)} className="text-red-500 hover:text-red-700 text-xs font-semibold ml-2 flex-shrink-0">Eliminar</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* --- Descuento --- */}
            <fieldset className="border p-3 rounded bg-white">
              <legend className="text-lg font-medium px-1">Descuento</legend>
              <div className="grid grid-cols-4 gap-4 items-center pt-1">
                <div className="col-span-3">
                  <label htmlFor="discount_desc" className="block text-sm font-medium text-gray-700">Descripción</label>
                  <input id="discount_desc" type="text" name="discountDescription" value={formData.discountDescription} onChange={handleGeneralInputChange} className="input-style" />
                </div>
                <div className="col-span-1">
                  <label htmlFor="discount_amount" className="block text-sm font-medium text-gray-700">Monto ($)</label>
                  <input id="discount_amount" type="number" name="discountAmount" value={formData.discountAmount} onChange={handleGeneralInputChange} min="0" step="0.01" className="input-style" />
                </div>
              </div>
            </fieldset>

            {/* --- Totales y Pago Inicial --- */}
            <div className="text-right space-y-1 border-t pt-4">
              {/* ... (Totals display remains the same) ... */}
              <p className="text-lg">Subtotal: <span className="font-semibold">${formData.subtotalPrice.toFixed(2)}</span></p>
              {formData.discountAmount > 0 && (
                <p className="text-lg text-red-600">Descuento ({formData.discountDescription || 'General'}): <span className="font-semibold">-${formData.discountAmount.toFixed(2)}</span></p>
              )}
              <p className="text-xl font-bold">Total: <span className="font-semibold">${formData.totalPrice.toFixed(2)}</span></p>
              <div className="flex justify-end items-center space-x-2 mt-2">
                <label htmlFor="payment_perc" className="text-sm font-medium">Pago Inicial:</label>
                <select id="payment_perc" name="initialPaymentPercentage" value={formData.initialPaymentPercentage} onChange={handlePaymentPercentageChange} className="input-style w-auto">
                  <option value="60">60%</option>
                  <option value="total">Total (100%)</option>
                </select>
                <span className="text-lg font-semibold">(${formData.initialPayment.toFixed(2)})</span>
              </div>
            </div>

            {/* --- Notas Generales --- */}
            <div>
              <label htmlFor="general_notes" className="block text-sm font-medium text-gray-700">Notas Generales</label>
              <textarea id="general_notes" name="generalNotes" value={formData.generalNotes} onChange={handleGeneralInputChange} rows="3" className="input-style w-full"></textarea>
            </div>

            {/* --- Botón Submit --- */}
            <div className="mt-4">
                <button
                  type="submit"
                  className="w-full bg-blue-950 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading || formData.lineItems.length === 0 || !selectedPermit}
                >
                  {isLoading ? 'Cargando...' : "Crear Presupuesto"}
                </button>
            </div>
          </form>
        </div>
      </div>
   
 
    </div>
  );
};

export default CreateBudget;