import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom"; // Removed useParams
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { ChevronDownIcon, ChevronUpIcon, DocumentArrowDownIcon, ArrowUturnLeftIcon  } from '@heroicons/react/24/solid';
import { unwrapResult } from '@reduxjs/toolkit';
import api from "../../utils/axios"; // Asegúrate de que la ruta sea correcta
import { fetchBudgetItems } from "../../Redux/Actions/budgetItemActions";
import { fetchPermitById } from "../../Redux/Actions/permitActions";
import { createBudget } from "../../Redux/Actions/budgetActions"; // Removed fetchBudgetById, updateBudget
// import { generatePDF } from "../../utils/pdfGenerator";
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
  const [isSubmitting, setIsSubmitting] = useState(false); // Estado para deshabilitar botón
  const [createdBudgetInfo, setCreatedBudgetInfo] = useState(null); // Para guardar info del budget creado
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false); // Estado para descarga

  //estados items manual 
  const [manualItem, setManualItem] = useState({
    category: "",
    name: "",
    unitPrice: 0,
    quantity: 1,
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
    systemType: false,
    drainfield: false,
    pump: false, // Pump is simpler, maybe doesn't need collapse? Keeping for consistency.
    sand: false,
    inspection: false,
    labor: false,
  });
  const toggleSection = (sectionName) => {
    setSectionVisibility(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  // --- Helper para generar IDs temporales ---
  const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
      // Poblar campos específicos desde el Permit
      if (selectedPermit.drainfieldDepth) {
        setDrainfieldSelection(prev => ({
          ...prev,
          sf: selectedPermit.drainfieldDepth,
        }));
      }

      if (selectedPermit.systemType) {
        setSystemTypeSelection(prev => ({
          ...prev,
          type: selectedPermit.systemType.includes("ATU") ? "ATU" : "REGULAR",
        }));
      }

      if (selectedPermit.excavationRequired) {
        setFormData(prev => ({
          ...prev,
          excavationRequired: selectedPermit.excavationRequired,
        }));
      }

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

  // --- Función addOrUpdateLineItem (Modificada para reemplazar opcionalmente) ---
  const addOrUpdateLineItem = (itemDetails, replaceIfExists = false) => {
    console.log("Buscando item con:", itemDetails);

    // Buscar el item en el catálogo
    const foundItem = normalizedBudgetItemsCatalog.find(catalogItem => {
      let match = catalogItem.category === itemDetails.category?.toUpperCase();
      if (match && itemDetails.name !== undefined) match = catalogItem.name === itemDetails.name?.toUpperCase();
      if (match && itemDetails.marca !== undefined) match = (catalogItem.marca || '') === (itemDetails.marca?.toUpperCase() || '');
      if (match && itemDetails.capacity !== undefined) match = (catalogItem.capacity || '') === (itemDetails.capacity?.toUpperCase() || '');
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
    setManualItem(prev => ({
      ...prev,
      [name]: isNumeric ? parseFloat(value) || 0 : value,
    }));
  };

  const addManualItem = () => {
    if (!manualItem.category || !manualItem.name || manualItem.unitPrice <= 0 || manualItem.quantity <= 0) {
      alert("Por favor complete todos los campos del item manual.");
      return;
    }

    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, {
        _tempId: generateTempId(),
        budgetItemId: null, // Item personalizado
        category: manualItem.category.toUpperCase(),
        name: manualItem.name.toUpperCase(),
        unitPrice: manualItem.unitPrice,
        quantity: manualItem.quantity,
        notes: "Item Manual",
      }],
    }));

    // Resetear el formulario del item manual
    setManualItem({ category: "", name: "", unitPrice: 0, quantity: 1 });
  };

  // --- Estados y Handlers específicos para cada sección del formulario ---

  // --- System Type ---
  const SYSTEM_TYPE_CATEGORY = 'SYSTEM TYPE'; // Usar constante para categoría normalizada
  const [systemTypeSelection, setSystemTypeSelection] = useState({ type: '', brand: '', capacity: '', quantity: 1 });
  const [customSystemType, setCustomSystemType] = useState({ name: '', brand: '', capacity: '', unitPrice: 0, quantity: 1 });
  const selectedSystemTypeUnitPrice = useMemo(() => {
    // Si estamos en modo OTROS o la selección no está completa, no hay precio de catálogo
    if (systemTypeSelection.brand === 'OTROS' || systemTypeSelection.capacity === 'OTROS' ||
        !systemTypeSelection.type || !systemTypeSelection.brand || !systemTypeSelection.capacity) {
      return 0;
    }
    const found = normalizedBudgetItemsCatalog.find(i =>
      i.category === SYSTEM_TYPE_CATEGORY &&
      i.name === systemTypeSelection.type &&
      i.marca === systemTypeSelection.brand &&
      i.capacity === systemTypeSelection.capacity
    );
    return found ? parseFloat(found.unitPrice) || 0 : 0; // Devuelve el precio o 0 si no se encuentra
  }, [normalizedBudgetItemsCatalog, systemTypeSelection.type, systemTypeSelection.brand, systemTypeSelection.capacity]);
  const systemTypeTypes = useMemo(() => [...new Set(normalizedBudgetItemsCatalog.filter(i => i.category === SYSTEM_TYPE_CATEGORY).map(i => i.name || ''))].sort(), [normalizedBudgetItemsCatalog]);
  const systemTypeBrands = useMemo(() => {
    if (!systemTypeSelection.type) return [];
    return [...new Set(normalizedBudgetItemsCatalog.filter(i => i.category === SYSTEM_TYPE_CATEGORY && i.name === systemTypeSelection.type).map(i => i.marca || ''))].sort();
  }, [normalizedBudgetItemsCatalog, systemTypeSelection.type]);
  const systemTypeCapacities = useMemo(() => {
    if (!systemTypeSelection.type || !systemTypeSelection.brand || systemTypeSelection.brand === 'OTROS') return [];
    return [...new Set(normalizedBudgetItemsCatalog.filter(i => i.category === SYSTEM_TYPE_CATEGORY && i.name === systemTypeSelection.type && i.marca === systemTypeSelection.brand).map(i => i.capacity || ''))].sort();
  }, [normalizedBudgetItemsCatalog, systemTypeSelection.type, systemTypeSelection.brand]);

  const handleSystemTypeChange = (e) => {
    const { name, value } = e.target;
    setSystemTypeSelection(prev => {
      const newState = { ...prev, [name]: value };
      if (name === 'type') { newState.brand = ''; newState.capacity = ''; }
      if (name === 'brand') { newState.capacity = ''; }
      // Limpiar custom si se cambia la selección principal
      if (value !== 'OTROS') {
        setCustomSystemType({ name: '', brand: '', capacity: '', unitPrice: 0, quantity: 1 });
      }
      return newState;
    });
  };
  const handleCustomSystemTypeChange = (e) => {
    const { name, value } = e.target;
    const isNumeric = ['unitPrice', 'quantity'].includes(name);
    setCustomSystemType(prev => ({ ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value }));
  };
  const addSystemTypeItem = () => {
    if (systemTypeSelection.brand === 'OTROS' || systemTypeSelection.capacity === 'OTROS') {
      if (!customSystemType.name || !customSystemType.brand || !customSystemType.capacity || customSystemType.unitPrice <= 0) {
        alert("Por favor complete todos los campos del item personalizado (Nombre, Marca, Capacidad, Precio).");
        return;
      }
      setFormData(prev => ({
        ...prev,
        lineItems: [...prev.lineItems, {
          _tempId: generateTempId(),
          budgetItemId: null,
          name: customSystemType.name.toUpperCase(),
          category: SYSTEM_TYPE_CATEGORY,
          marca: customSystemType.brand.toUpperCase(),
          capacity: customSystemType.capacity.toUpperCase(),
          unitPrice: customSystemType.unitPrice,
          quantity: customSystemType.quantity,
          notes: 'Item Personalizado',
        }],
      }));
      setCustomSystemType({ name: '', brand: '', capacity: '', unitPrice: 0, quantity: 1 });
      setSystemTypeSelection({ type: '', brand: '', capacity: '', quantity: 1 });
    } else {
      if (!systemTypeSelection.type || !systemTypeSelection.brand || !systemTypeSelection.capacity) {
        alert("Por favor seleccione Type, Brand y Capacity.");
        return;
      }
      addOrUpdateLineItem({
        category: SYSTEM_TYPE_CATEGORY,
        name: systemTypeSelection.type,
        marca: systemTypeSelection.brand,
        capacity: systemTypeSelection.capacity,
        quantity: systemTypeSelection.quantity,
      });
      setSystemTypeSelection({ type: '', brand: '', capacity: '', quantity: 1 });
    }
  };


  // --- Drainfield ---
  const DRAINFIELD_CATEGORY = 'SISTEMA CHAMBERS';
  const [drainfieldSelection, setDrainfieldSelection] = useState({ system: '', quantity: 1, sf: '' });
  const [customDrainfield, setCustomDrainfield] = useState({ name: '', unitPrice: 0, quantity: 1 });

  const drainfieldSystems = useMemo(() => [...new Set(normalizedBudgetItemsCatalog.filter(i => i.category === DRAINFIELD_CATEGORY).map(i => i.name || ''))].sort(), [normalizedBudgetItemsCatalog]);

  const handleDrainfieldChange = (e) => {
    const { name, value } = e.target;
    setDrainfieldSelection(prev => ({ ...prev, [name]: value }));
    if (value !== 'OTROS') {
      setCustomDrainfield({ name: '', unitPrice: 0, quantity: 1 });
    }
  };
  const handleCustomDrainfieldChange = (e) => {
    const { name, value } = e.target;
    const isNumeric = ['unitPrice', 'quantity'].includes(name);
    setCustomDrainfield(prev => ({ ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value }));
  };
  const addDrainfieldItem = () => {
    const notes = drainfieldSelection.sf ? `SF: ${drainfieldSelection.sf}` : '';
    if (drainfieldSelection.system === 'OTROS') {
      if (!customDrainfield.name || customDrainfield.unitPrice <= 0) {
        alert("Por favor complete Nombre y Precio del sistema personalizado."); return;
      }
      setFormData(prev => ({
        ...prev,
        lineItems: [...prev.lineItems, {
          _tempId: generateTempId(), budgetItemId: null,
          name: customDrainfield.name.toUpperCase(), category: DRAINFIELD_CATEGORY,
          marca: '', capacity: '', unitPrice: customDrainfield.unitPrice,
          quantity: customDrainfield.quantity, notes: `${notes} (Personalizado)`.trim(),
        }],
      }));
      setCustomDrainfield({ name: '', unitPrice: 0, quantity: 1 });
      setDrainfieldSelection({ system: '', quantity: 1, sf: '' });
    } else {
      if (!drainfieldSelection.system) { alert("Por favor seleccione un sistema."); return; }
      addOrUpdateLineItem({
        category: DRAINFIELD_CATEGORY, name: drainfieldSelection.system,
        quantity: drainfieldSelection.quantity, notes: notes,
      });
      setDrainfieldSelection({ system: '', quantity: 1, sf: '' });
    }
  };

  // --- Pump ---
  const PUMP_CATEGORY = 'PUMP';
  const PUMP_NAME = 'TANQUE'; // Asumiendo que el item de bomba siempre se llama TANQUE
  const [pumpSelection, setPumpSelection] = useState({ addPump: 'No', capacity: '', quantity: 1 });
  const [customPump, setCustomPump] = useState({ capacity: '', unitPrice: 0, quantity: 1 });

  const pumpCapacities = useMemo(() => [...new Set(normalizedBudgetItemsCatalog.filter(i => i.category === PUMP_CATEGORY && i.name === PUMP_NAME).map(i => i.capacity || ''))].sort(), [normalizedBudgetItemsCatalog]);

  const handlePumpChange = (e) => {
    const { name, value } = e.target;
    setPumpSelection(prev => ({ ...prev, [name]: value, ...(name === 'addPump' && value === 'No' && { capacity: '', quantity: 1 }) }));
    if (value !== 'OTROS') {
      setCustomPump({ capacity: '', unitPrice: 0, quantity: 1 });
    }
  };
  const handleCustomPumpChange = (e) => {
    const { name, value } = e.target;
    const isNumeric = ['unitPrice', 'quantity'].includes(name);
    setCustomPump(prev => ({ ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value }));
  };
  // Efecto para añadir/quitar bomba automáticamente (simplificado para usar addOrUpdate)
  useEffect(() => {
    const existingPumpItemIndex = formData.lineItems.findIndex(item => item.category === PUMP_CATEGORY);

    if (pumpSelection.addPump === 'Yes') {
      if (pumpSelection.capacity === 'OTROS') {
        if (!customPump.capacity || customPump.unitPrice <= 0) {
          if (existingPumpItemIndex > -1) {
            setFormData(prev => ({ ...prev, lineItems: prev.lineItems.filter((_, index) => index !== existingPumpItemIndex) }));
          }
          return;
        }
        const customPumpData = {
          _tempId: formData.lineItems[existingPumpItemIndex]?._tempId || generateTempId(),
          budgetItemId: null,
          name: PUMP_NAME,
          category: PUMP_CATEGORY,
          marca: '',
          capacity: customPump.capacity.toUpperCase(),
          unitPrice: customPump.unitPrice,
          quantity: customPump.quantity,
          notes: 'Bomba Personalizada',
        };
        setFormData(prev => {
          let newLineItems = [...prev.lineItems];
          if (existingPumpItemIndex > -1) newLineItems[existingPumpItemIndex] = customPumpData;
          else newLineItems.push(customPumpData);
          return { ...prev, lineItems: newLineItems };
        });
      } else if (pumpSelection.capacity) {
        addOrUpdateLineItem({
          category: PUMP_CATEGORY,
          name: PUMP_NAME,
          capacity: pumpSelection.capacity,
          quantity: pumpSelection.quantity,
        }, true);
      }
    } else if (pumpSelection.addPump === 'No' && existingPumpItemIndex > -1) {
      setFormData(prev => ({ ...prev, lineItems: prev.lineItems.filter((_, index) => index !== existingPumpItemIndex) }));
    }
  }, [pumpSelection.addPump, pumpSelection.capacity, pumpSelection.quantity, customPump.capacity, customPump.unitPrice, customPump.quantity]);

  // --- Arena ---
  const SAND_CATEGORY = 'MATERIALES'; // Corregido según imagen/datos
  const SAND_NAME = 'ARENA'; // Asumiendo que el item de arena siempre se llama ARENA
  const [sandSelection, setSandSelection] = useState({ capacity: '', quantity: 1, location: '' });
  const [customSand, setCustomSand] = useState({ capacity: '', unitPrice: 0, quantity: 1 });

  const sandCapacities = useMemo(() => [...new Set(normalizedBudgetItemsCatalog.filter(i => i.category === SAND_CATEGORY && i.name === SAND_NAME).map(i => i.capacity || ''))].sort(), [normalizedBudgetItemsCatalog]);

  const handleSandChange = (e) => {
    const { name, value } = e.target;
    setSandSelection(prev => ({ ...prev, [name]: value }));
    if (value !== 'OTROS') {
      setCustomSand({ capacity: '', unitPrice: 0, quantity: 1 });
    }
  };
  const handleCustomSandChange = (e) => {
    const { name, value } = e.target;
    const isNumeric = ['unitPrice', 'quantity'].includes(name);
    setCustomSand(prev => ({ ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value }));
  };
  const addSandItem = () => {
    const notes = sandSelection.location ? `Location: ${sandSelection.location}` : '';
    if (sandSelection.capacity === 'OTROS') {
      if (!customSand.capacity || customSand.unitPrice <= 0) {
        alert("Por favor complete Capacidad y Precio de la arena personalizada."); return;
      }
      setFormData(prev => ({
        ...prev,
        lineItems: [...prev.lineItems, {
          _tempId: generateTempId(), budgetItemId: null,
          name: SAND_NAME, category: SAND_CATEGORY, marca: '',
          capacity: customSand.capacity.toUpperCase(), unitPrice: customSand.unitPrice,
          quantity: customSand.quantity, notes: `${notes} (Personalizada)`.trim(),
        }],
      }));
      setCustomSand({ capacity: '', unitPrice: 0, quantity: 1 });
      setSandSelection({ capacity: '', quantity: 1, location: '' });
    } else {
      if (!sandSelection.capacity) { alert("Por favor seleccione capacidad."); return; }
      addOrUpdateLineItem({
        category: SAND_CATEGORY, name: SAND_NAME,
        capacity: sandSelection.capacity, quantity: sandSelection.quantity, notes: notes,
      });
      setSandSelection({ capacity: '', quantity: 1, location: '' });
    }
  };

  // --- Inspección ---
  const INSPECTION_CATEGORY = 'INSPECCION';

  const [inspectionSelection, setInspectionSelection] = useState({ marca: '', quantity: 1 });
  const [customInspection, setCustomInspection] = useState({ marca: '', unitPrice: 0, quantity: 1 });

  // Usamos 'marca' para el tipo de inspección (PRIVADA, HEALT DEPARTMENT)
  const inspectionMarcas = useMemo(() =>
    [...new Set(normalizedBudgetItemsCatalog
      .filter(i => i.category === INSPECTION_CATEGORY)
      .map(i => i.marca || '')
    )].sort(),
    [normalizedBudgetItemsCatalog]
  );
  const handleInspectionChange = (e) => {
    const { name, value } = e.target;
    setInspectionSelection(prev => ({ ...prev, [name]: value }));
    if (value !== 'OTROS') {
      setCustomInspection({ marca: '', unitPrice: 0, quantity: 1 });
    }
  };
  const handleCustomInspectionChange = (e) => {
    const { name, value } = e.target;
    const isNumeric = ['unitPrice', 'quantity'].includes(name);
    setCustomInspection(prev => ({ ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value }));
  };
  const addInspectionItem = () => {
    const inspectionName = 'INSPECCION INICIAL AND FEE HEALTH DEPARTMENT'; // Nombre fijo

    if (inspectionSelection.marca === 'OTROS') {
      // Agregar item personalizado
      if (!customInspection.marca || customInspection.unitPrice <= 0) {
        alert("Por favor complete Tipo y Precio de la inspección personalizada.");
        return;
      }
      setFormData(prev => ({
        ...prev,
        lineItems: [...prev.lineItems, {
          _tempId: generateTempId(),
          budgetItemId: null, // Item personalizado
          name: inspectionName,
          category: INSPECTION_CATEGORY,
          marca: customInspection.marca.toUpperCase(),
          unitPrice: customInspection.unitPrice,
          quantity: customInspection.quantity,
          notes: 'Inspección Personalizada',
        }],
      }));
      setCustomInspection({ marca: '', unitPrice: 0, quantity: 1 });
      setInspectionSelection({ marca: '', quantity: 1 });
    } else {
      // Agregar item del catálogo
      if (!inspectionSelection.marca) {
        alert("Por favor seleccione tipo.");
        return;
      }
      addOrUpdateLineItem({
        category: INSPECTION_CATEGORY,
        name: inspectionName,
        marca: inspectionSelection.marca,
        quantity: inspectionSelection.quantity,
      });
      setInspectionSelection({ marca: '', quantity: 1 });
    }
  };

  // --- Labor Fee ---
  const LABOR_CATEGORY = 'LABOR FEE';
  const [laborSelection, setLaborSelection] = useState({ name: '', quantity: 1 });
  const [customLabor, setCustomLabor] = useState({ name: '', unitPrice: 0, quantity: 1 });

  const laborNames = useMemo(() => [...new Set(normalizedBudgetItemsCatalog.filter(i => i.category === LABOR_CATEGORY).map(i => i.name || ''))].sort(), [normalizedBudgetItemsCatalog]);

  const handleLaborChange = (e) => {
    const { name, value } = e.target;
    setLaborSelection(prev => ({ ...prev, [name]: value }));
    if (value !== 'OTROS') {
      setCustomLabor({ name: '', unitPrice: 0, quantity: 1 });
    }
  };
  const handleCustomLaborChange = (e) => {
    const { name, value } = e.target;
    const isNumeric = ['unitPrice', 'quantity'].includes(name);
    setCustomLabor(prev => ({ ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value }));
  };
  const addLaborItem = () => {
    if (laborSelection.name === 'OTROS') {
      if (!customLabor.name || customLabor.unitPrice <= 0) {
        alert("Por favor complete Nombre y Precio del Labor Fee personalizado."); return;
      }
      setFormData(prev => ({
        ...prev,
        lineItems: [...prev.lineItems, {
          _tempId: generateTempId(), budgetItemId: null,
          name: customLabor.name.toUpperCase(), category: LABOR_CATEGORY, marca: '', capacity: '',
          unitPrice: customLabor.unitPrice, quantity: customLabor.quantity, notes: 'Labor Personalizado',
        }],
      }));
      setCustomLabor({ name: '', unitPrice: 0, quantity: 1 });
      setLaborSelection({ name: '', quantity: 1 });
    } else {
      if (!laborSelection.name) { alert("Por favor seleccione tipo."); return; }
      addOrUpdateLineItem({
        category: LABOR_CATEGORY, name: laborSelection.name,
        quantity: laborSelection.quantity,
      });
      setLaborSelection({ name: '', quantity: 1 });
    }
  };

  // --- Submit Handler (Solo Crear) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
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
      discountAmount: formData.discountAmount,
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

      // --- YA NO SE GENERA NI SUBE PDF DESDE AQUÍ ---
      // const doc = generatePDF(newBudget);
      // const pdfBlob = doc.output("blob");
      // const formDataPdf = new FormData();
      // formDataPdf.append("file", pdfBlob, `budget_${newBudget.idBudget}.pdf`);
      // await api.post(`/budget/${newBudget.idBudget}/upload-pdf`, formDataPdf);

      // Guardar la información del budget creado (incluyendo la URL del PDF)
      setCreatedBudgetInfo(newBudget);

      alert(`Presupuesto #${newBudget.idBudget} creado exitosamente.`);
      // Opcional: No navegar inmediatamente, permitir descargar primero
      // navigate('/budgets');

    } catch (error) {
      console.error("Error al crear el presupuesto:", error);
      // Mostrar mensaje de error más detallado si viene del backend
      const errorMsg = error?.error || error?.message || "Error desconocido al crear el presupuesto.";
      alert(`Error al crear el presupuesto: ${errorMsg}`);
    } finally {
      setIsSubmitting(false); // Habilitar botón de nuevo
    }
  };
 // --- Función para manejar la descarga del PDF ---
 const handleDownloadPdf = async (budgetId, filename) => {
  if (!budgetId) return;
  setIsDownloadingPdf(true);
  try {
    // Usa tu instancia de Axios que ya incluye el token
    const response = await api.get(`/budget/${budgetId}/pdf`, {
      responseType: 'blob', // Importante: obtener la respuesta como Blob
    });

    // Crear un enlace temporal para iniciar la descarga
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || `budget_${budgetId}.pdf`);
    document.body.appendChild(link);
    link.click();

    // Limpiar el enlace temporal
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error("Error al descargar el PDF:", error);
    alert(`Error al descargar el PDF: ${error.response?.data?.message || error.message}`);
  } finally {
    setIsDownloadingPdf(false);
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
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500">Property Address</label>
                <p className="text-sm font-semibold text-gray-800">{formData.propertyAddress || 'N/A'}</p>
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-medium text-gray-500">Lot</label>
                <p className="text-sm font-semibold text-gray-800">{formData.lot || 'N/A'}</p>
              </div>
              <div className="col-span-1">
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

              {/* --- System Type --- */}
              <div className="border rounded bg-white">
                <button type="button" onClick={() => toggleSection('systemType')} className="w-full flex justify-between items-center p-2 bg-gray-100 hover:bg-gray-200 rounded-t">
                  <span className="font-medium text-sm">System Type</span>
                  {sectionVisibility.systemType ? <ChevronUpIcon className="h-5 w-5 text-gray-600" /> : <ChevronDownIcon className="h-5 w-5 text-gray-600" />}
                </button>
                {sectionVisibility.systemType && (
                  <fieldset className="p-2 border-t">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 items-end">
                      {/* Type */}
                      <div className="col-span-2">
                        <label htmlFor="systemType_type" className="block text-xs font-medium text-gray-600">Type</label>
                        <select id="systemType_type" name="type" value={systemTypeSelection.type} onChange={handleSystemTypeChange} className="input-style">
                          <option value="">Select Type</option>
                          {systemTypeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                          {/* <option value="OTROS">OTROS (Manual)</option> */} {/* Considerar si el tipo puede ser manual */}
                        </select>
                      </div>
                      {/* Brand */}
                      <div>
                        <label htmlFor="systemType_brand" className="block text-xs font-medium text-gray-600">Brand</label>
                        <select id="systemType_brand" name="brand" value={systemTypeSelection.brand} onChange={handleSystemTypeChange} disabled={!systemTypeSelection.type} className="input-style">
                          <option value="">Select Brand</option>
                          {systemTypeBrands.map(b => <option key={b} value={b}>{b}</option>)}
                          <option value="OTROS">OTROS (Manual)</option>
                        </select>
                      </div>
                      {/* Capacity */}
                      <div>
                        <label htmlFor="systemType_capacity" className="block text-xs font-medium text-gray-600">Capacity</label>
                        <select id="systemType_capacity" name="capacity" value={systemTypeSelection.capacity} onChange={handleSystemTypeChange} disabled={!systemTypeSelection.brand || systemTypeSelection.brand === 'OTROS'} className="input-style">
                          <option value="">Select Capacity</option>
                          {systemTypeCapacities.map(c => <option key={c} value={c}>{c}</option>)}
                          <option value="OTROS">OTROS (Manual)</option>
                        </select>
                      </div>
                      {/* Custom Fields */}
                      {(systemTypeSelection.brand === 'OTROS' || systemTypeSelection.capacity === 'OTROS') && (
                        <>
                          <div className="col-span-2 border-t mt-2 pt-2">
                            <p className="text-xs font-semibold text-blue-600 mb-1">Detalles Personalizados:</p>
                          </div>
                          <div>
                            <label htmlFor="custom_sys_name" className="block text-xs font-medium text-gray-600">Nombre Item</label>
                            <input id="custom_sys_name" type="text" name="name" placeholder="Nombre" value={customSystemType.name} onChange={handleCustomSystemTypeChange} className="input-style" />
                          </div>
                          <div>
                            <label htmlFor="custom_sys_brand" className="block text-xs font-medium text-gray-600">Marca</label>
                            <input id="custom_sys_brand" type="text" name="brand" placeholder="Marca" value={customSystemType.brand} onChange={handleCustomSystemTypeChange} className="input-style" />
                          </div>
                          <div>
                            <label htmlFor="custom_sys_capacity" className="block text-xs font-medium text-gray-600">Capacidad</label>
                            <input id="custom_sys_capacity" type="text" name="capacity" placeholder="Capacidad" value={customSystemType.capacity} onChange={handleCustomSystemTypeChange} className="input-style" />
                          </div>
                          <div>
                            <label htmlFor="custom_sys_price" className="block text-xs font-medium text-gray-600">Precio Unitario</label>
                            <input id="custom_sys_price" type="number" name="unitPrice" placeholder="0.00" value={customSystemType.unitPrice} onChange={handleCustomSystemTypeChange} min="0" step="0.01" className="input-style" />
                          </div>
                        </>
                      )}
                      {/* Quantity */}
                      <div className={(systemTypeSelection.brand === 'OTROS' || systemTypeSelection.capacity === 'OTROS') ? "col-span-1" : "col-span-2"}> {/* Ajustar span si hay custom */}
                        <label htmlFor="systemType_quantity" className="block text-xs font-medium text-gray-600">Quantity</label>
                        <input id="systemType_quantity" type="number" name="quantity" value={(systemTypeSelection.brand === 'OTROS' || systemTypeSelection.capacity === 'OTROS') ? customSystemType.quantity : systemTypeSelection.quantity} onChange={(systemTypeSelection.brand === 'OTROS' || systemTypeSelection.capacity === 'OTROS') ? handleCustomSystemTypeChange : handleSystemTypeChange} min="1" className="input-style" />
                        <p className="text-xs text-gray-500 mt-1">
    Precio Total: $
    {(() => {
      const isCustom = systemTypeSelection.brand === 'OTROS' || systemTypeSelection.capacity === 'OTROS';
      const quantity = parseFloat(isCustom ? customSystemType.quantity : systemTypeSelection.quantity) || 0;
      // Usar el precio unitario calculado (de catálogo o custom)
      const unitPrice = parseFloat(isCustom ? customSystemType.unitPrice : selectedSystemTypeUnitPrice) || 0;

      // Solo mostrar si hay cantidad y precio válidos
      if (quantity > 0 && unitPrice > 0) {
        return (quantity * unitPrice).toFixed(2);
      } else {
        return '0.00'; // O puedes poner 'N/A' si prefieres
      }
    })()}
  </p>
                      </div>
                      {/* Add Button */}
                      <button type="button" onClick={addSystemTypeItem} className="button-add-item col-span-2 mt-2 text-white p-1 bg-blue-400">Add System</button>
                    </div>
                  </fieldset>
                )}
              </div>

              {/* --- Drainfield --- */}
              <div className="border rounded bg-white">
                <button type="button" onClick={() => toggleSection('drainfield')} className="w-full flex justify-between items-center p-2 bg-gray-100 hover:bg-gray-200 rounded-t">
                  <span className="font-medium text-sm">Drainfield</span>
                  {sectionVisibility.drainfield ? <ChevronUpIcon className="h-5 w-5 text-gray-600" /> : <ChevronDownIcon className="h-5 w-5 text-gray-600" />}
                </button>
                {sectionVisibility.drainfield && (
                  <fieldset className="p-2 border-t">
                    <div className="grid grid-cols-2 gap-2 items-end">
                      {/* SF Input */}
                      <div className="col-span-2">
                        <label htmlFor="drainfield_sf" className="block text-xs font-medium text-gray-600">Drainfield SF</label>
                        <input id="drainfield_sf" type="text" name="sf" placeholder="Ingrese SF (ej: 450)" value={drainfieldSelection.sf} onChange={handleDrainfieldChange} className="input-style" />
                      </div>
                      {/* System Selection */}
                      <div>
                        <label htmlFor="drainfield_system" className="block text-xs font-medium text-gray-600">Sistema Chambers</label>
                        <select id="drainfield_system" name="system" value={drainfieldSelection.system} onChange={handleDrainfieldChange} className="input-style">
                          <option value="">Select System</option>
                          {drainfieldSystems.map(s => <option key={s} value={s}>{s}</option>)}
                          <option value="OTROS">OTROS (Manual)</option>
                        </select>
                      </div>
                      {/* Quantity */}
                      <div>
                        <label htmlFor="drainfield_quantity" className="block text-xs font-medium text-gray-600">Quantity (System)</label>
                        <input id="drainfield_quantity" type="number" name="quantity" value={drainfieldSelection.system === 'OTROS' ? customDrainfield.quantity : drainfieldSelection.quantity} onChange={drainfieldSelection.system === 'OTROS' ? handleCustomDrainfieldChange : handleDrainfieldChange} min="1" className="input-style" />
                      </div>
                      {/* Custom Fields */}
                      {drainfieldSelection.system === 'OTROS' && (
                        <>
                          <div className="col-span-2 border-t mt-2 pt-2">
                            <p className="text-xs font-semibold text-blue-600 mb-1">Detalles Personalizados (Sistema):</p>
                          </div>
                          <div>
                            <label htmlFor="custom_drain_name" className="block text-xs font-medium text-gray-600">Nombre Sistema</label>
                            <input id="custom_drain_name" type="text" name="name" placeholder="Nombre" value={customDrainfield.name} onChange={handleCustomDrainfieldChange} className="input-style" />
                          </div>
                          <div>
                            <label htmlFor="custom_drain_price" className="block text-xs font-medium text-gray-600">Precio Unitario</label>
                            <input id="custom_drain_price" type="number" name="unitPrice" placeholder="0.00" value={customDrainfield.unitPrice} onChange={handleCustomDrainfieldChange} min="0" step="0.01" className="input-style" />
                          </div>
                        </>
                      )}
                      {/* Add Button */}
                      <button type="button" onClick={addDrainfieldItem} className="button-add-item col-span-2 mt-2">Add Drainfield System</button>
                    </div>
                  </fieldset>
                )}
              </div>

              {/* --- Pump --- */}
              <fieldset className="border p-2 rounded bg-white">
                <legend className="text-sm font-medium px-1">Pump</legend>
                <div className="grid grid-cols-2 gap-2 items-center pt-1">
                  <label htmlFor="pump_add" className="text-sm">Add Pump?</label>
                  <select id="pump_add" name="addPump" value={pumpSelection.addPump} onChange={handlePumpChange} className="input-style">
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                  {pumpSelection.addPump === 'Yes' && (
                    <>
                      <label htmlFor="pump_capacity" className="text-sm">Tank Capacity</label>
                      <select id="pump_capacity" name="capacity" value={pumpSelection.capacity} onChange={handlePumpChange} className="input-style">
                        <option value="">Select Capacity</option>
                        {pumpCapacities.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="OTROS">OTROS (Manual)</option>
                      </select>
                      {/* Custom Pump Fields */}
                      {pumpSelection.capacity === 'OTROS' && (
                        <>
                          <div className="col-span-2 border-t mt-2 pt-2">
                            <p className="text-xs font-semibold text-blue-600 mb-1">Detalles Personalizados (Bomba):</p>
                          </div>
                          <div>
                            <label htmlFor="custom_pump_capacity" className="block text-xs font-medium text-gray-600">Capacidad</label>
                            <input id="custom_pump_capacity" type="text" name="capacity" placeholder="Capacidad" value={customPump.capacity} onChange={handleCustomPumpChange} className="input-style" />
                          </div>
                          <div>
                            <label htmlFor="custom_pump_price" className="block text-xs font-medium text-gray-600">Precio Unitario</label>
                            <input id="custom_pump_price" type="number" name="unitPrice" placeholder="0.00" value={customPump.unitPrice} onChange={handleCustomPumpChange} min="0" step="0.01" className="input-style" />
                          </div>
                        </>
                      )}
                      {/* Quantity */}
                      <label htmlFor="pump_quantity" className="text-sm">Quantity</label>
                      <input id="pump_quantity" type="number" name="quantity" value={pumpSelection.capacity === 'OTROS' ? customPump.quantity : pumpSelection.quantity} onChange={pumpSelection.capacity === 'OTROS' ? handleCustomPumpChange : handlePumpChange} min="1" className="input-style" />
                    </>
                  )}
                </div>
              </fieldset>

              {/* --- Arena --- */}
              <div className="border rounded bg-white">
                <button type="button" onClick={() => toggleSection('sand')} className="w-full flex justify-between items-center p-2 bg-gray-100 hover:bg-gray-200 rounded-t">
                  <span className="font-medium text-sm">Arena</span>
                  {sectionVisibility.sand ? <ChevronUpIcon className="h-5 w-5 text-gray-600" /> : <ChevronDownIcon className="h-5 w-5 text-gray-600" />}
                </button>
                {sectionVisibility.sand && (
                  <fieldset className="p-2 border-t">
                    <div className="grid grid-cols-2 gap-2 items-end">
                      {/* Capacity */}
                      <div>
                        <label htmlFor="sand_capacity" className="block text-xs font-medium text-gray-600">Capacity</label>
                        <select id="sand_capacity" name="capacity" value={sandSelection.capacity} onChange={handleSandChange} className="input-style">
                          <option value="">Select Capacity</option>
                          {sandCapacities.map(c => <option key={c} value={c}>{c}</option>)}
                          <option value="OTROS">OTROS (Manual)</option>
                        </select>
                      </div>
                      {/* Quantity */}
                      <div>
                        <label htmlFor="sand_quantity" className="block text-xs font-medium text-gray-600">Quantity</label>
                        <input id="sand_quantity" type="number" name="quantity" value={sandSelection.capacity === 'OTROS' ? customSand.quantity : sandSelection.quantity} onChange={sandSelection.capacity === 'OTROS' ? handleCustomSandChange : handleSandChange} min="1" className="input-style" />
                      </div>
                      {/* Custom Fields */}
                      {sandSelection.capacity === 'OTROS' && (
                        <>
                          <div className="col-span-2 border-t mt-2 pt-2">
                            <p className="text-xs font-semibold text-blue-600 mb-1">Detalles Personalizados (Arena):</p>
                          </div>
                          <div>
                            <label htmlFor="custom_sand_capacity" className="block text-xs font-medium text-gray-600">Capacidad</label>
                            <input id="custom_sand_capacity" type="text" name="capacity" placeholder="Capacidad" value={customSand.capacity} onChange={handleCustomSandChange} className="input-style" />
                          </div>
                          <div>
                            <label htmlFor="custom_sand_price" className="block text-xs font-medium text-gray-600">Precio Unitario</label>
                            <input id="custom_sand_price" type="number" name="unitPrice" placeholder="0.00" value={customSand.unitPrice} onChange={handleCustomSandChange} min="0" step="0.01" className="input-style" />
                          </div>
                        </>
                      )}
                      {/* Location */}
                      <div className="col-span-2">
                        <label htmlFor="sand_location" className="block text-xs font-medium text-gray-600">Location (Optional)</label>
                        <input id="sand_location" type="text" name="location" placeholder="Ej: Bajo casa" value={sandSelection.location} onChange={handleSandChange} className="input-style" />
                      </div>
                      {/* Add Button */}
                      <button type="button" onClick={addSandItem} className="button-add-item col-span-2 mt-2">Add Sand</button>
                    </div>
                  </fieldset>
                )}
              </div>

              {/* --- Inspección --- */}
              <div className="border rounded bg-white">
                <button type="button" onClick={() => toggleSection('inspection')} className="w-full flex justify-between items-center p-2 bg-gray-100 hover:bg-gray-200 rounded-t">
                  <span className="font-medium text-sm">Inspección/Fee</span>
                  {sectionVisibility.inspection ? <ChevronUpIcon className="h-5 w-5 text-gray-600" /> : <ChevronDownIcon className="h-5 w-5 text-gray-600" />}
                </button>
                {sectionVisibility.inspection && (
                  <fieldset className="p-2 border-t">
                    <div className="grid grid-cols-2 gap-2 items-end">
                      {/* Type (Marca) */}
                      <div>
                        <label htmlFor="inspection_marca" className="block text-xs font-medium text-gray-600">Type</label>
                        <select id="inspection_marca" name="marca" value={inspectionSelection.marca} onChange={handleInspectionChange} className="input-style">
                          <option value="">Select Type</option>
                          {inspectionMarcas.map(m => <option key={m} value={m}>{m}</option>)}
                          <option value="OTROS">OTROS (Manual)</option>
                        </select>
                      </div>
                      {/* Quantity */}
                      <div>
                        <label htmlFor="inspection_quantity" className="block text-xs font-medium text-gray-600">Quantity</label>
                        <input id="inspection_quantity" type="number" name="quantity" value={inspectionSelection.marca === 'OTROS' ? customInspection.quantity : inspectionSelection.quantity} onChange={inspectionSelection.marca === 'OTROS' ? handleCustomInspectionChange : handleInspectionChange} min="1" className="input-style" />
                      </div>
                      {/* Custom Fields */}
                      {inspectionSelection.marca === 'OTROS' && (
                        <>
                          <div className="col-span-2 border-t mt-2 pt-2">
                            <p className="text-xs font-semibold text-blue-600 mb-1">Detalles Personalizados (Inspección):</p>
                          </div>
                          <div>
                            <label htmlFor="custom_insp_marca" className="block text-xs font-medium text-gray-600">Tipo/Marca</label>
                            <input id="custom_insp_marca" type="text" name="marca" placeholder="Tipo/Marca" value={customInspection.marca} onChange={handleCustomInspectionChange} className="input-style" />
                          </div>
                          <div>
                            <label htmlFor="custom_insp_price" className="block text-xs font-medium text-gray-600">Precio Unitario</label>
                            <input id="custom_insp_price" type="number" name="unitPrice" placeholder="0.00" value={customInspection.unitPrice} onChange={handleCustomInspectionChange} min="0" step="0.01" className="input-style" />
                          </div>
                        </>
                      )}
                      {/* Add Button */}
                      <button type="button" onClick={addInspectionItem} className="button-add-item col-span-2 mt-2">Add Inspection</button>
                    </div>
                  </fieldset>
                )}
              </div>

              {/* --- Labor Fee --- */}
              <div className="border rounded bg-white">
                <button type="button" onClick={() => toggleSection('labor')} className="w-full flex justify-between items-center p-2 bg-gray-100 hover:bg-gray-200 rounded-t">
                  <span className="font-medium text-sm">Labor Fee</span>
                  {sectionVisibility.labor ? <ChevronUpIcon className="h-5 w-5 text-gray-600" /> : <ChevronDownIcon className="h-5 w-5 text-gray-600" />}
                </button>
                {sectionVisibility.labor && (
                  <fieldset className="p-2 border-t">
                    <div className="grid grid-cols-2 gap-2 items-end">
                      {/* Type (Name) */}
                      <div>
                        <label htmlFor="labor_name" className="block text-xs font-medium text-gray-600">Fee Type</label>
                        <select id="labor_name" name="name" value={laborSelection.name} onChange={handleLaborChange} className="input-style">
                          <option value="">Select Fee</option>
                          {laborNames.map(n => <option key={n} value={n}>{n}</option>)}
                          <option value="OTROS">OTROS (Manual)</option>
                        </select>
                      </div>
                      {/* Quantity */}
                      <div>
                        <label htmlFor="labor_quantity" className="block text-xs font-medium text-gray-600">Quantity</label>
                        <input id="labor_quantity" type="number" name="quantity" value={laborSelection.name === 'OTROS' ? customLabor.quantity : laborSelection.quantity} onChange={laborSelection.name === 'OTROS' ? handleCustomLaborChange : handleLaborChange} min="1" className="input-style" />
                      </div>
                      {/* Custom Fields */}
                      {laborSelection.name === 'OTROS' && (
                        <>
                          <div className="col-span-2 border-t mt-2 pt-2">
                            <p className="text-xs font-semibold text-blue-600 mb-1">Detalles Personalizados (Labor):</p>
                          </div>
                          <div>
                            <label htmlFor="custom_labor_name" className="block text-xs font-medium text-gray-600">Nombre Fee</label>
                            <input id="custom_labor_name" type="text" name="name" placeholder="Nombre" value={customLabor.name} onChange={handleCustomLaborChange} className="input-style" />
                          </div>
                          <div>
                            <label htmlFor="custom_labor_price" className="block text-xs font-medium text-gray-600">Precio Unitario</label>
                            <input id="custom_labor_price" type="number" name="unitPrice" placeholder="0.00" value={customLabor.unitPrice} onChange={handleCustomLaborChange} min="0" step="0.01" className="input-style" />
                          </div>
                        </>
                      )}
                      {/* Add Button */}
                      <button type="button" onClick={addLaborItem} className="button-add-item col-span-2 mt-2">Add Labor Fee</button>
                    </div>
                  </fieldset>
                )}
              </div>
              <div className="border rounded bg-white">
                <button type="button" onClick={() => toggleSection('manualItem')} className="w-full flex justify-between items-center p-2 bg-gray-100 hover:bg-gray-200 rounded-t">
                  <span className="font-medium text-sm">Agregar Item Manual</span>
                  {sectionVisibility.manualItem ? <ChevronUpIcon className="h-5 w-5 text-gray-600" /> : <ChevronDownIcon className="h-5 w-5 text-gray-600" />}
                </button>
                {sectionVisibility.manualItem && (
                  <fieldset className="p-2 border-t">
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <div>
                        <label htmlFor="manual_category" className="block text-xs font-medium text-gray-600">Categoría</label>
                        <input id="manual_category" type="text" name="category" value={manualItem.category} onChange={handleManualItemChange} placeholder="Ej: SYSTEM TYPE" className="input-style" />
                      </div>
                      <div>
                        <label htmlFor="manual_name" className="block text-xs font-medium text-gray-600">Nombre</label>
                        <input id="manual_name" type="text" name="name" value={manualItem.name} onChange={handleManualItemChange} placeholder="Ej: INFIL" className="input-style" />
                      </div>
                      <div>
                        <label htmlFor="manual_price" className="block text-xs font-medium text-gray-600">Precio Unitario</label>
                        <input id="manual_price" type="number" name="unitPrice" value={manualItem.unitPrice} onChange={handleManualItemChange} min="0" step="0.01" placeholder="0.00" className="input-style" />
                      </div>
                      <div>
                        <label htmlFor="manual_quantity" className="block text-xs font-medium text-gray-600">Cantidad</label>
                        <input id="manual_quantity" type="number" name="quantity" value={manualItem.quantity} onChange={handleManualItemChange} min="1" placeholder="1" className="input-style" />
                      </div>
                      <button type="button" onClick={addManualItem} className="button-add-item col-span-2 mt-2">Agregar Item Manual</button>
                    </div>
                  </fieldset>
                )}
              </div>

              {/* --- Lista de Items Añadidos --- */}
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
                          {item.marca && <span className="text-gray-600"> ({item.marca})</span>}
                          {item.capacity && <span className="text-gray-600"> [{item.capacity}]</span>}
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
      
       <div className="mt-6 border-t pt-4">
              {!createdBudgetInfo ? (
                <button
                  type="submit"
                  className="w-full bg-blue-950 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting || isLoading || formData.lineItems.length === 0 || !selectedPermit}
                >
                  {isSubmitting ? 'Creando...' : "Crear Presupuesto"}
                </button>
              ) : (
                <div className="text-center p-4 bg-green-100 border border-green-300 rounded-md">
                  <p className="font-semibold text-green-800">¡Presupuesto #{createdBudgetInfo.idBudget} creado!</p>
                  {/* --- REEMPLAZO DE <a> POR <button> --- */}
                  {createdBudgetInfo.pdfPath ? ( // Verificar si hay ruta (o budgetPdfUrl si lo prefieres)
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(createdBudgetInfo.idBudget, `budget_${createdBudgetInfo.idBudget}.pdf`)}
                      disabled={isDownloadingPdf}
                      className="mt-2 inline-flex items-center justify-center bg-blue-600 text-white py-1 px-3 rounded-md hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-wait"
                    >
                      {isDownloadingPdf ? (
                         <svg className="animate-spin h-4 w-4 mr-1 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                         </svg>
                      ) : (
                        <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                      )}
                      Descargar PDF
                    </button>
                  ) : (
                    <p className="text-sm text-yellow-700 mt-1">(PDF aún no disponible para descarga)</p>
                  )}
                  {/* --- FIN REEMPLAZO --- */}
                  <button
                    type="button"
                    onClick={() => navigate('/budgets')} // Navega a la lista
                    className="mt-3 inline-flex items-center text-sm text-indigo-600 hover:underline" // Usar inline-flex para alinear icono y texto
                  >
                    <ArrowUturnLeftIcon className="h-4 w-4 mr-1" /> {/* Icono de atrás */}
                    Back {/* Nuevo texto */}
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>


    </div>
  );
};

export default CreateBudget;