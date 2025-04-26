import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";

// Actions necesarias
import { fetchBudgetItems } from "../../Redux/Actions/budgetItemActions";
import { fetchPermitById } from "../../Redux/Actions/permitActions"; // Para cargar datos al crear
import {
  fetchBudgetById,
  createBudget,
  updateBudget,
} from "../../Redux/Actions/budgetActions";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

// --- Helper para generar IDs temporales ---
const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// --- Hook para leer Query Params ---
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const CreateBudget = () => {
  const { budgetId: paramBudgetId } = useParams(); // ID para editar
  const query = useQuery();
  const permitIdFromQuery = query.get("permitId"); // ID de Permit para crear
  const isEditing = !!paramBudgetId; // Determinar si estamos editando o creando

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  // --- Estado del Catálogo y Carga ---
  const { items: budgetItemsCatalog = [], loading: loadingCatalog, error: errorCatalog } = useSelector(state => state.budgetItems) || {};

  console.log("Catálogo de items:", budgetItemsCatalog);
  const { currentBudget, loading: loadingBudget, error: errorBudget } = useSelector(state => state.budget) || {};

  // --- CORRECCIÓN AQUÍ ---
  // Accede al slice 'permit' y desestructura 'selectedPermit'
  const { selectedPermit, loading: loadingPermit, error: errorPermit } = useSelector(state => state.permit) || {};
  console.log("Permit seleccionado:", selectedPermit);
  // -------------------------
  const [pdfPreview, setPdfPreview] = useState(null);
  const [optionalDocPreview, setOptionalDocPreview] = useState(null);
  // --- Estado del Formulario (Nueva Estructura) ---
  const [formData, setFormData] = useState({
    // Campos Generales
    permitNumber: "",
    propertyAddress: "",
    applicantName: "",
    lot: "",
    block: "",
    applicant: "",
    date: new Date().toISOString().split('T')[0],
    expirationDate: "",
    initialPayment: 0,
    status: "created",
    discountDescription: "",
    discountAmount: 0,
    generalNotes: "",
    // Array de items
    lineItems: [], // Objetos: { _tempId, id?, budgetItemId, quantity, notes, name, category, unitPrice }
    // Campos calculados y UI
    subtotalPrice: 0,
    totalPrice: 0,
    initialPaymentPercentage: '60',
  });

  // --- Estado para la UI (PDFs) ---

  const [currentPage, setCurrentPage] = useState(1);

  // --- Cargar Datos Iniciales (Catálogo, Permit o Budget) ---
  useEffect(() => {
    // Siempre cargar catálogo
    dispatch(fetchBudgetItems());

    if (isEditing && paramBudgetId) {
      // Modo Edición: Cargar Budget existente
      console.log(`Modo Edición: Cargando Budget ID ${paramBudgetId}`);
      dispatch(fetchBudgetById(paramBudgetId));
      // Aquí podrías también cargar el Permit asociado si necesitas sus PDFs
      // dispatch(fetchPermitByAddress(budgetData.propertyAddress)) o similar
    } else if (permitIdFromQuery) {
      // Modo Creación: Cargar Permit para pre-rellenar
      console.log(`Modo Creación: Cargando Permit ID ${permitIdFromQuery}`);
      dispatch(fetchPermitById(permitIdFromQuery)); // Esto debería actualizar state.permit.selectedPermit
    }
  }, [dispatch, isEditing, paramBudgetId, permitIdFromQuery]);

  // --- Efecto para poblar el formulario cuando los datos cargan ---
  useEffect(() => {
    // --- CORRECCIÓN AQUÍ ---
    // Depende de 'selectedPermit' en lugar de 'currentPermit'
    console.log("Effect para poblar formulario ejecutado. selectedPermit:", selectedPermit);
    if (isEditing && currentBudget) {
      // Poblar desde Budget existente
      console.log("Poblando formulario desde Budget existente:", currentBudget);
      setFormData(prev => ({
        ...prev,
        permitNumber: currentBudget.permitNumber || "",
        propertyAddress: currentBudget.propertyAddress || "",
        applicantName: currentBudget.applicantName || "",
        lot: currentBudget.lot || "",
        block: currentBudget.block || "",
        date: currentBudget.date ? currentBudget.date.split('T')[0] : new Date().toISOString().split('T')[0],
        expirationDate: currentBudget.expirationDate ? currentBudget.expirationDate.split('T')[0] : "",
        initialPayment: parseFloat(currentBudget.initialPayment) || 0,
        status: currentBudget.status || "created",
        discountDescription: currentBudget.discountDescription || "",
        discountAmount: parseFloat(currentBudget.discountAmount) || 0,
        generalNotes: currentBudget.generalNotes || "",
        lineItems: (currentBudget.lineItems || []).map(item => ({
          _tempId: generateTempId(),
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
      }));

      // Cargar PDFs si vienen con el Budget o su Permit asociado
      // setPdfPreview(currentBudget.Permit?.pdfDataUrl || null);
      // setOptionalDocPreview(currentBudget.Permit?.optionalDocsUrl || null);

    } else if (!isEditing && selectedPermit) { // <-- Usa selectedPermit
      // Poblar desde Permit (Modo Creación)
      console.log("Poblando formulario desde Permit:", selectedPermit); // <-- Usa selectedPermit
      setFormData(prev => ({
        ...prev,
        permitNumber: selectedPermit.permitNumber || "",
        propertyAddress: selectedPermit.propertyAddress || "",
        applicantName: selectedPermit.applicantName || selectedPermit.applicant || "",
        lot: selectedPermit.lot || "",
        block: selectedPermit.block || "",
        lineItems: [],
        discountAmount: 0,
        discountDescription: "",
        generalNotes: "",
        initialPayment: 0,
      }));
      if (selectedPermit.pdfData) {
        setPdfPreview(selectedPermit.pdfData.data);
      }
      if (selectedPermit.optionalDocs) {
        setOptionalDocPreview(selectedPermit.optionalDocs.data); // Documento opcional en base64
      }
    }
    // --- CORRECCIÓN AQUÍ ---
    // Añade 'selectedPermit' a las dependencias
  }, [isEditing, currentBudget, selectedPermit]);
  // -------------------------

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

    setFormData(prev => ({
      ...prev,
      subtotalPrice: subtotal,
      totalPrice: total,
      initialPayment: payment,
    }));
  }, [formData.lineItems, formData.discountAmount, formData.initialPaymentPercentage]);

  // --- Handlers para Inputs Generales ---
  const handleGeneralInputChange = (e) => {
    const { name, value } = e.target;
    const isNumeric = ['discountAmount'].includes(name);

    // Ya NO se calcula expirationDate aquí
    setFormData(prev => ({
      ...prev,
      [name]: isNumeric ? parseFloat(value) || 0 : value,
    }));
  };

  // ... (otros handlers y useEffects) ...

  // --- NUEVO: Effect para calcular Expiration Date siempre que Date cambie ---
  useEffect(() => {
    if (formData.date) { // Solo si hay una fecha de inicio
      try {
        const startDate = new Date(formData.date + 'T00:00:00'); // Interpretar como fecha local
        if (!isNaN(startDate.getTime())) { // Verificar si la fecha es válida
          const expiration = new Date(startDate);
          expiration.setDate(startDate.getDate() + 30); // Añadir 30 días
          const expirationString = expiration.toISOString().split('T')[0]; // Formato YYYY-MM-DD

          // Actualizar el estado SOLO si el valor calculado es diferente al actual
          // para evitar bucles infinitos si algo saliera mal.
          if (expirationString !== formData.expirationDate) {
            setFormData(prev => ({ ...prev, expirationDate: expirationString }));
          }
        } else if (formData.expirationDate !== "") {
           // Si la fecha de inicio no es válida, pero expirationDate tenía algo, limpiarla.
           setFormData(prev => ({ ...prev, expirationDate: "" }));
        }
      } catch (error) {
        console.error("Error calculating expiration date:", error);
         if (formData.expirationDate !== "") { // Limpiar en caso de error
             setFormData(prev => ({ ...prev, expirationDate: "" }));
          }
      }
    } else if (formData.expirationDate !== "") {
       // Si la fecha de inicio se borra, limpiar también la de expiración.
       setFormData(prev => ({ ...prev, expirationDate: "" }));
    }
  }, [formData.date]); 

  const handlePaymentPercentageChange = (e) => {
    setFormData(prev => ({ ...prev, initialPaymentPercentage: e.target.value }));
  };

  // --- Handlers para Manejar Line Items ---
  const addOrUpdateLineItem = (itemDetails) => {
    console.log("Buscando item con:", itemDetails);
    const foundItem = budgetItemsCatalog.find(catalogItem => {
      let match = catalogItem.category === itemDetails.category;
      if (match && itemDetails.name) match = catalogItem.name === itemDetails.name;
      if (match && itemDetails.marca !== undefined) match = (catalogItem.marca || '') === itemDetails.marca;
      if (match && itemDetails.capacity !== undefined) match = (catalogItem.capacity || '') === itemDetails.capacity;
      return match;
    });

    if (!foundItem) {
      alert(`No se encontró un item en el catálogo para: ${JSON.stringify(itemDetails)}`);
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
        newLineItems[existingItemIndex] = {
          ...newLineItems[existingItemIndex],
          quantity: itemDetails.quantity,
          notes: itemDetails.notes || newLineItems[existingItemIndex].notes,
          unitPrice: newLineItems[existingItemIndex].unitPrice || foundItem.unitPrice,
        };
      } else {
        console.log("Añadiendo nuevo item");
        const newItem = {
          _tempId: generateTempId(),
          budgetItemId: foundItem.id,
          quantity: itemDetails.quantity,
          notes: itemDetails.notes || '',
          name: foundItem.name,
          category: foundItem.category,
          marca: foundItem.marca,
          capacity: foundItem.capacity,
          unitPrice: foundItem.unitPrice,
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

  // --- Estados y Handlers específicos para cada sección del formulario ---
  // (NOTA: Implementa la lógica completa para estos handlers y useMemo/useEffect si es necesario)

  // System Type
  const [systemTypeSelection, setSystemTypeSelection] = useState({ type: '', brand: '', capacity: '', quantity: 1 });
  // --- Añadir estado para inputs manuales ---
  const [systemTypeManualBrand, setSystemTypeManualBrand] = useState('');
  const [systemTypeManualCapacity, setSystemTypeManualCapacity] = useState('');
  // -----------------------------------------
  const systemTypeCategoryString = 'SYSTEM TYPE';
  const systemTypeTypes = useMemo(() => [...new Set(budgetItemsCatalog.filter(i => i.category.toUpperCase() === systemTypeCategoryString).map(i => i.name || ''))], [budgetItemsCatalog]);
  const systemTypeBrands = useMemo(() => [...new Set(budgetItemsCatalog.filter(i => i.category.toUpperCase() === systemTypeCategoryString && i.name === systemTypeSelection.type).map(i => i.marca || ''))], [budgetItemsCatalog, systemTypeSelection.type]);
  const systemTypeCapacities = useMemo(() => [...new Set(budgetItemsCatalog.filter(i => i.category.toUpperCase() === systemTypeCategoryString && i.name === systemTypeSelection.type && (i.marca || '') === systemTypeSelection.brand).map(i => i.capacity || ''))], [budgetItemsCatalog, systemTypeSelection.type, systemTypeSelection.brand]);

  const handleSystemTypeChange = (e) => {
    const { name, value } = e.target;

    setSystemTypeSelection(prev => {
      const newState = { ...prev, [name]: value };
      // Resetear campos dependientes y manuales si cambia el tipo o marca
      if (name === 'type') {
        newState.brand = '';
        newState.capacity = '';
        setSystemTypeManualBrand(''); // Resetear manual
        setSystemTypeManualCapacity(''); // Resetear manual
      }
      if (name === 'brand') {
        newState.capacity = '';
        setSystemTypeManualCapacity(''); // Resetear manual
        // Si la nueva marca no es 'OTROS', limpiar input manual de marca
        if (value !== 'OTROS') setSystemTypeManualBrand('');
      }
      // Si la nueva capacidad no es 'OTROS', limpiar input manual de capacidad
      if (name === 'capacity' && value !== 'OTROS') {
        setSystemTypeManualCapacity('');
      }
      return newState;
    });
  };

  // --- Handler para los inputs manuales ---
  const handleSystemTypeManualChange = (e) => {
    const { name, value } = e.target;
    if (name === 'manualBrand') setSystemTypeManualBrand(value);
    if (name === 'manualCapacity') setSystemTypeManualCapacity(value);
  };
  // ---------------------------------------

  const addSystemTypeItem = () => {
    // --- Validar también los inputs manuales si 'OTROS' está seleccionado ---
    if (!systemTypeSelection.type ||
      !systemTypeSelection.brand || (systemTypeSelection.brand === 'OTROS' && !systemTypeManualBrand) ||
      !systemTypeSelection.capacity || (systemTypeSelection.capacity === 'OTROS' && !systemTypeManualCapacity)) {
      alert("Por favor complete todos los campos de System Type, incluyendo los manuales si seleccionó 'OTROS'.");
      return;
    }
    // ----------------------------------------------------------------------

    // --- Usar valor manual si 'OTROS' está seleccionado ---
    const brandToAdd = systemTypeSelection.brand === 'OTROS' ? systemTypeManualBrand : systemTypeSelection.brand;
    const capacityToAdd = systemTypeSelection.capacity === 'OTROS' ? systemTypeManualCapacity : systemTypeSelection.capacity;
    // ----------------------------------------------------

    addOrUpdateLineItem({
      category: systemTypeCategoryString,
      name: systemTypeSelection.type,
      // --- Usar los valores determinados ---
      marca: brandToAdd,
      capacity: capacityToAdd,
      // -----------------------------------
      quantity: systemTypeSelection.quantity,
    });
    // Resetear selección y manuales
    setSystemTypeSelection({ type: '', brand: '', capacity: '', quantity: 1 });
    setSystemTypeManualBrand('');
    setSystemTypeManualCapacity('');
  };


  // Drainfield
  const [drainfieldSelection, setDrainfieldSelection] = useState({ system: '', quantity: 1, sf: '' });
  // --- Define la categoría esperada (en mayúsculas) ---
  const drainfieldCategoryString = 'SISTEMA CHAMBERS'; // Ajusta si la categoría real es otra
  // --- Usa .toUpperCase() en la comparación ---
  const drainfieldSystems = useMemo(() => [...new Set(budgetItemsCatalog.filter(i => i.category.toUpperCase() === drainfieldCategoryString).map(i => i.name || ''))], [budgetItemsCatalog]);

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
      // --- Pasa la categoría normalizada ---
      category: drainfieldCategoryString,
      name: drainfieldSelection.system,
      quantity: drainfieldSelection.quantity,
      notes: drainfieldSelection.sf ? `SF: ${drainfieldSelection.sf}` : '', // Añadir SF como nota
    });
    // Resetear selección si se desea
    // setDrainfieldSelection({ system: '', quantity: 1, sf: '' });
  };

  // Pump
  const [pumpSelection, setPumpSelection] = useState({ addPump: 'No', capacity: '', quantity: 1 });
  // --- Define la categoría esperada (en mayúsculas) ---
  const pumpCategoryString = 'PUMP';
  // --- Usa .toUpperCase() en la comparación ---
  const pumpCapacities = useMemo(() => [...new Set(budgetItemsCatalog.filter(i => i.category.toUpperCase() === pumpCategoryString && i.name === 'TANQUE').map(i => i.capacity || ''))], [budgetItemsCatalog]);

  const handlePumpChange = (e) => {
    const { name, value } = e.target;
    setPumpSelection(prev => ({ ...prev, [name]: value, ...(name === 'addPump' && value === 'No' && { capacity: '' }) }));
  };

  // Efecto para añadir/quitar bomba automáticamente
  useEffect(() => {
    if (pumpSelection.addPump === 'Yes' && pumpSelection.capacity) {
      addOrUpdateLineItem({
        // --- Pasa la categoría normalizada ---
        category: pumpCategoryString,
        name: 'TANQUE', // Asumiendo que el nombre es siempre TANQUE
        capacity: pumpSelection.capacity,
        quantity: pumpSelection.quantity,
      });
    } else if (pumpSelection.addPump === 'No') {
      // Intentar remover el item PUMP si existe
      const pumpItem = formData.lineItems.find(item => item.category.toUpperCase() === pumpCategoryString); // Comparar en mayúsculas
      if (pumpItem) {
        handleRemoveItem(pumpItem._tempId);
      }
    }
  }, [pumpSelection.addPump, pumpSelection.capacity, pumpSelection.quantity]);

  // Arena
  const [sandSelection, setSandSelection] = useState({ capacity: '', quantity: 1, location: '' });
  // --- Define la categoría esperada (en mayúsculas) ---
  const sandCategoryString = 'ARENA'; // Ajusta si la categoría real es otra (ej. 'MATERIAL')
  // --- Usa .toUpperCase() en la comparación ---
  // Asumiendo que la categoría es 'ARENA' y el nombre también es 'ARENA'
  const sandCapacities = useMemo(() => [...new Set(budgetItemsCatalog.filter(i => i.category.toUpperCase() === sandCategoryString && i.name.toUpperCase() === sandCategoryString).map(i => i.capacity || ''))], [budgetItemsCatalog]);

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
      // --- Pasa la categoría normalizada ---
      category: sandCategoryString,
      name: sandCategoryString, // Asumiendo que el nombre es igual a la categoría
      capacity: sandSelection.capacity,
      quantity: sandSelection.quantity,
      notes: sandSelection.location ? `Location: ${sandSelection.location}` : '',
    });
    // Resetear selección si se desea
    // setSandSelection({ capacity: '', quantity: 1, location: '' });
  };


  // Inspección
  const [inspectionSelection, setInspectionSelection] = useState({ marca: '', quantity: 1 });
  // --- Define la categoría esperada (en mayúsculas) ---
  const inspectionCategoryString = 'INSPECCION INICIAL AND FEE HEALTH DEPARMENT'; // Ajusta si la categoría real es otra
  // --- Usa .toUpperCase() en la comparación ---
  const inspectionMarcas = useMemo(() => [...new Set(budgetItemsCatalog.filter(i => i.category.toUpperCase() === inspectionCategoryString).map(i => i.marca || ''))], [budgetItemsCatalog]);

  const handleInspectionChange = (e) => {
    const { name, value } = e.target;
    setInspectionSelection(prev => ({ ...prev, [name]: value }));
  };

  const addInspectionItem = () => {
    if (!inspectionSelection.marca) {
      alert("Por favor seleccione la marca/tipo de Inspección.");
      return;
    }
    // Encontrar el nombre correspondiente en el catálogo
    const inspectionName = budgetItemsCatalog.find(i => i.category.toUpperCase() === inspectionCategoryString && i.marca === inspectionSelection.marca)?.name || 'Inspection Fee';

    addOrUpdateLineItem({
      // --- Pasa la categoría normalizada ---
      category: inspectionCategoryString,
      marca: inspectionSelection.marca,
      quantity: inspectionSelection.quantity,
      name: inspectionName, // Usar el nombre encontrado
      unitPrice: 0, // Asumiendo que no tiene precio unitario específico
    });
    // Resetear selección si se desea
    // setInspectionSelection({ marca: '', quantity: 1 });
  };

  // Labor Fee
  const [laborSelection, setLaborSelection] = useState({ name: '', quantity: 1 });
  // --- Define la categoría esperada (en mayúsculas) ---
  const laborCategoryString = 'LABOR FEE';
  // --- Usa .toUpperCase() en la comparación ---
  const laborNames = useMemo(() => [...new Set(budgetItemsCatalog.filter(i => i.category.toUpperCase() === laborCategoryString).map(i => i.name || ''))], [budgetItemsCatalog]);

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
      // --- Pasa la categoría normalizada ---
      category: laborCategoryString,
      name: laborSelection.name,
      quantity: laborSelection.quantity,
    });
    // Resetear selección si se desea
    // setLaborSelection({ name: '', quantity: 1 });
  };
  // --- Submit Handler (Crear o Actualizar) ---
  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.lineItems.length === 0) {
      alert("Debe añadir al menos un item al presupuesto.");
      return;
    }

    const dataToSend = {
      permitNumber: formData.permitNumber,
      propertyAddress: formData.propertyAddress,
      applicantName: formData.applicantName,
      lot: formData.lot,
      block: formData.block,
      date: formData.date,
      expirationDate: formData.expirationDate || null, // Enviar null si está vacío
      initialPayment: formData.initialPayment,
      status: formData.status,
      discountDescription: formData.discountDescription,
      discountAmount: formData.discountAmount,
      generalNotes: formData.generalNotes,
      lineItems: formData.lineItems.map(item => ({
        // Enviar 'id' solo si estamos editando y el item ya existía (tiene un id numérico, no _tempId)
        id: isEditing && typeof item.id === 'number' ? item.id : undefined,
        budgetItemId: item.budgetItemId,
        quantity: item.quantity,
        notes: item.notes,
      })),
      permitId: !isEditing ? permitIdFromQuery : undefined,
    };
  
    console.log("Enviando al backend:", dataToSend);

    if (isEditing) {
      // --- LÓGICA PARA ACTUALIZAR ---
      dispatch(updateBudget(paramBudgetId, dataToSend)).then(result => {
        // Asumiendo que updateBudget también retorna los datos actualizados o un indicador de éxito
        if (result) { // Ajusta esta condición según lo que retorne tu thunk updateBudget
          alert("Presupuesto actualizado exitosamente!");
          navigate(`/budgets/${paramBudgetId}`); // Navegar a la vista del budget actualizado
        } else {
          console.error("Error al actualizar presupuesto (thunk devolvió undefined o backend falló)");
          alert(`Error al actualizar el presupuesto. Verifique los detalles.`);
        }
      }).catch(error => {
        console.error("Error inesperado en dispatch updateBudget o su .then():", error);
        alert(`Error inesperado al actualizar: ${error.message}`);
      });

    } else {
      // --- LÓGICA PARA CREAR ---
      dispatch(createBudget(dataToSend)).then(result => {
        // Si 'result' existe, significa que el thunk retornó 'response.data' (éxito)
        if (result) {
          const newBudgetId = result.idBudget;
          alert("Presupuesto creado exitosamente!");
          // Navegar a la vista del budget recién creado
          navigate(newBudgetId ? `/budgets/${newBudgetId}` : '/budgets'); // Ajusta la ruta si es necesario
        } else {
          // Si 'result' es undefined, significa que el thunk entró en el catch (error 400/500 del backend)
          console.error("Error al crear presupuesto (thunk devolvió undefined o backend falló)");
          alert(`Error al crear el presupuesto. Verifique los detalles o la consola del backend.`);
        }
      }).catch(error => {
        // Este catch es para errores inesperados en la ejecución del thunk o del .then()
        console.error("Error inesperado en dispatch createBudget o su .then():", error);
        alert(`Error inesperado al crear: ${error.message}`);
      });
    }
  };

  // --- Render ---
  // --- CORRECCIÓN AQUÍ ---
  // Usa loadingPermit y errorPermit que vienen del selector corregido
  const isLoading = loadingCatalog || (isEditing && loadingBudget) || (!isEditing && loadingPermit);
  const hasError = errorCatalog || (isEditing && errorBudget) || (!isEditing && errorPermit);
  // -------------------------

  if (isLoading && !hasError) return <div className="container mx-auto p-4">Cargando datos...</div>;
  if (hasError) return <div className="container mx-auto p-4 text-red-600">Error cargando datos: {JSON.stringify(hasError)}</div>;

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Columna izquierda: Vista previa de los PDFs */}
        <div className="bg-white shadow-md rounded-lg p-4 col-span-2">
          <h2 className="text-xl font-bold mb-4">Vista previa de los PDFs</h2>

          {/* Botones para alternar entre PDF principal y opcional */}
          <div className="flex justify-between mb-4">
            <button
              onClick={() => setCurrentPage(1)}
              className={`py-1 px-2 rounded-md ${currentPage === 1
                ? "bg-blue-950 text-white"
                : "bg-gray-200 text-gray-700"
                }`}
            >
              Ver PDF Principal
            </button>
            <button
              onClick={() => setCurrentPage(2)}
              className={`py-1 px-2 rounded-md ${currentPage === 2
                ? "bg-blue-950 text-white"
                : "bg-gray-200 text-gray-700"
                }`}
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


        {/* --- Formulario --- */}
      {/* --- Formulario (Columna Derecha - Reestructurada) --- */}
      <div className="bg-white shadow-md rounded-lg p-4 md:col-span-1">
          <h2 className="text-xl font-bold mb-4">{isEditing ? "Editar Presupuesto" : "Crear Nuevo Presupuesto"}</h2>
          {/* --- Cambiar space-y-4 por grid grid-cols-4 gap-4 --- */}
          <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-4">

            {/* --- Sección Información General (4 columnas) --- */}
            <div className="col-span-2"> {/* Ocupa 2 de 4 columnas */}
              <label className="block text-sm font-medium text-gray-700">Permit Number: {formData.permitNumber}</label>
             
            </div>
            <div className="col-span-2"> {/* Ocupa 2 de 4 columnas */}
              <label className="block text-sm font-medium text-gray-700">Applicant: {formData.applicantName}</label>
              
            </div>

            <div className="col-span-2"> {/* Ocupa 2 de 4 columnas */}
              <label className="block text-sm font-medium text-gray-700">Property Address:<br></br> {formData.propertyAddress}</label>
             
            </div>
            <div className="col-span-1"> {/* Ocupa 1 de 4 columnas */}
              <label className="block text-sm font-medium text-gray-700">Lot: {formData.lot}</label>
            
            </div>
            <div className="col-span-1"> {/* Ocupa 1 de 4 columnas */}
              <label className="block text-sm font-medium text-gray-700">Block:  {formData.block}</label>
              
            </div>

            <div className="col-span-2"> {/* Ocupa 2 de 4 columnas */}
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input type="date" name="date" value={formData.date} onChange={handleGeneralInputChange} required className="input-style" />
            </div>
            <div className="col-span-2"> {/* Ocupa 2 de 4 columnas */}
              <label className="block text-sm font-medium text-gray-700">Expiration Date</label>
              <input
                type="date"
                name="expirationDate"
                value={formData.expirationDate}
                className="input-style"
                readOnly // Mantenlo readOnly
              />
            </div>

            {/* --- Línea Divisoria --- */}
            <hr className="col-span-4 my-4 border-t border-gray-300" />

           

            {/* --- Sección Items Presupuestables --- */}
            <div className="col-span-4 border p-3 rounded mt-2 space-y-4"> {/* Ajustado mt-2 */}
             

              {/* System Type */}
              <fieldset className="border p-2 rounded">
                <legend className="text-sm font-medium">System Type</legend>
                {/* Grid interno para los controles de System Type */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 items-end"> {/* Ajustado gap-x-4 */}

                  {/* Fila 1: Type Dropdown (ocupa ambas columnas) */}
                  <div className="col-span-2">
                    <label htmlFor="systemType_type" className="block text-xs font-medium text-gray-600">Type</label>
                    <select id="systemType_type" name="type" value={systemTypeSelection.type} onChange={handleSystemTypeChange} className="input-style">
                      <option value="">Select Type</option>
                      {systemTypeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Fila 2: Brand Dropdown o Manual Input */}
                  <div>
                    <label htmlFor="systemType_brand" className="block text-xs font-medium text-gray-600">Brand</label>
                    <select id="systemType_brand" name="brand" value={systemTypeSelection.brand} onChange={handleSystemTypeChange} disabled={!systemTypeSelection.type} className="input-style">
                      <option value="">Select Brand</option>
                      {/* Asegúrate que el valor de la opción 'OTROS' sea 'OTROS' */}
                      {systemTypeBrands.map(b => <option key={b} value={b}>{b}</option>)}
                      {/* Añadir opción OTROS si no viene del catálogo */}
                      {!systemTypeBrands.includes('OTROS') && <option value="OTROS">OTROS</option>}
                    </select>
                  </div>
                  <div>
                    {/* Mostrar input manual SOLO si Brand es 'OTROS' */}
                    {systemTypeSelection.brand === 'OTROS' ? (
                      <>
                        <label htmlFor="systemType_manualBrand" className="block text-xs font-medium text-gray-600">Ingrese Marca</label>
                        <input
                          id="systemType_manualBrand"
                          type="text"
                          name="manualBrand"
                          placeholder="Marca Manual"
                          value={systemTypeManualBrand}
                          onChange={handleSystemTypeManualChange}
                          className="input-style"
                          disabled={!systemTypeSelection.type} // Habilitado si hay tipo
                        />
                      </>
                    ) : (
                      // Espacio vacío si no es 'OTROS' para mantener alineación
                      <div></div>
                    )}
                  </div>

                  {/* Capacity Dropdown (SOLO si Brand NO es 'OTROS') */}
                  {systemTypeSelection.brand !== 'OTROS' ? (
                    <select
                      name="capacity"
                      value={systemTypeSelection.capacity}
                      onChange={handleSystemTypeChange}
                      disabled={!systemTypeSelection.brand} // Deshabilitado si no hay marca seleccionada
                      className="input-style"
                    >
                      <option value="">Select Capacity</option>
                      {/* Asegúrate que el valor de la opción 'OTROS' sea 'OTROS' si aplica aquí también */}
                      {systemTypeCapacities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    // Manual Capacity Input (SOLO si Brand ES 'OTROS')
                    <input
                      type="text"
                      name="manualCapacity"
                      placeholder="Ingrese Capacidad"
                      value={systemTypeManualCapacity}
                      onChange={handleSystemTypeManualChange}
                      className="input-style"
                      // Considera deshabilitar si la marca manual está vacía
                      disabled={!systemTypeManualBrand}
                    />
                  )}

                  {/* Espaciador para la 4ta celda de la fila de capacidad/manual */}
                  <div></div>

                  {/* Quantity */}
                  <label className="text-sm">Quantity</label>
                  <input type="number" name="quantity" value={systemTypeSelection.quantity} onChange={handleSystemTypeChange} min="1" className="input-style" />

                  {/* Botón Add */}
                  <button type="button" onClick={addSystemTypeItem} className="button-add-item col-span-2">Add System</button>
                </div>
              </fieldset>


              {/* Drainfield */}
              <fieldset className="border p-2 rounded">
                <legend className="text-sm font-medium">Drainfield</legend>
                <div className="grid grid-cols-2 gap-2 items-end">
                  <select name="system" value={drainfieldSelection.system} onChange={handleDrainfieldChange} className="input-style"><option value="">Select System</option>{drainfieldSystems.map(s => <option key={s} value={s}>{s}</option>)}</select>
                  <input type="number" name="quantity" value={drainfieldSelection.quantity} onChange={handleDrainfieldChange} min="1" className="input-style" />
                  <input type="text" name="sf" placeholder="SF (Optional)" value={drainfieldSelection.sf} onChange={handleDrainfieldChange} className="input-style" />
                  
                  <button type="button" onClick={addDrainfieldItem} className="button-add-item col-span-2">Add Drainfield</button>
                </div>
              </fieldset>

              {/* Pump */}
              <fieldset className="border p-2 rounded">
                <legend className="text-sm font-medium">Pump</legend>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <label className="text-sm">Add Pump?</label>
                  <select name="addPump" value={pumpSelection.addPump} onChange={handlePumpChange} className="input-style">
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                  {pumpSelection.addPump === 'Yes' && (
                    <>
                      <label className="text-sm">Capacity</label>
                      <select name="capacity" value={pumpSelection.capacity} onChange={handlePumpChange} className="input-style"><option value="">Select Capacity</option>{pumpCapacities.map(c => <option key={c} value={c}>{c}</option>)}</select>
                      <label className="text-sm">Quantity</label>
                      <input type="number" name="quantity" value={pumpSelection.quantity} onChange={handlePumpChange} min="1" className="input-style" />
                    </>
                  )}
                </div>
              </fieldset>

              {/* Arena */}
              <fieldset className="border p-2 rounded">
                <legend className="text-sm font-medium">Arena</legend>
                <div className="grid grid-cols-2 gap-2 items-end">
                  <select name="capacity" value={sandSelection.capacity} onChange={handleSandChange} className="input-style"><option value="">Select Type/Capacity</option>{sandCapacities.map(c => <option key={c} value={c}>{c}</option>)}</select>
                  <input type="number" name="quantity" value={sandSelection.quantity} onChange={handleSandChange} min="1" className="input-style" />
                  <input type="text" name="location" placeholder="Location (Optional)" value={sandSelection.location} onChange={handleSandChange} className="input-style" />
                  <button type="button" onClick={addSandItem} className="button-add-item col-span-2">Add Sand</button>
                </div>
              </fieldset>

              {/* Inspección */}
              <fieldset className="border p-2 rounded">
                <legend className="text-sm font-medium">Inspección/Fee</legend>
                <div className="grid grid-cols-2 gap-2 items-end">
                  <select name="marca" value={inspectionSelection.marca} onChange={handleInspectionChange} className="input-style"><option value="">Select Type</option>{inspectionMarcas.map(m => <option key={m} value={m}>{m}</option>)}</select>
                  <input type="number" name="quantity" value={inspectionSelection.quantity} onChange={handleInspectionChange} min="1" className="input-style" />
                  <button type="button" onClick={addInspectionItem} className="button-add-item col-span-2">Add Inspection</button>
                </div>
              </fieldset>

              {/* Labor Fee */}
              <fieldset className="border p-2 rounded">
                <legend className="text-sm font-medium">Labor Fee</legend>
                <div className="grid grid-cols-2 gap-2 items-end">
                  <select name="name" value={laborSelection.name} onChange={handleLaborChange} className="input-style"><option value="">Select Fee</option>{laborNames.map(n => <option key={n} value={n}>{n}</option>)}</select>
                  <input type="number" name="quantity" value={laborSelection.quantity} onChange={handleLaborChange} min="1" className="input-style" />
                  <button type="button" onClick={addLaborItem} className="button-add-item col-span-2">Add Labor Fee</button>
                </div>
              </fieldset>

              {/* --- Lista de Items Añadidos --- */}
              <div className="mt-4 border-t pt-4">
                <h4 className="text-md font-medium mb-2">Items Añadidos:</h4>
                {formData.lineItems.length === 0 ? (
                  <p className="text-gray-500 text-sm">Aún no se han añadido items.</p>
                ) : (
                  <ul className="space-y-2">
                    {formData.lineItems.map(item => (
                      <li key={item._tempId} className="flex justify-between items-center text-sm border-b pb-1">
                        <div>
                          <span>{item.name} ({item.marca || item.capacity || item.category}) x {item.quantity} @ ${parseFloat(item.unitPrice).toFixed(2)}</span>
                          {item.notes && <span className="block text-xs text-gray-500 italic ml-2">- {item.notes}</span>}
                        </div>
                        <button type="button" onClick={() => handleRemoveItem(item._tempId)} className="text-red-500 hover:text-red-700 text-xs ml-2">Eliminar</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* --- Línea Divisoria --- */}
            <hr className="col-span-4 my-4 border-t border-gray-300" />

            {/* --- Descuento (Ocupa las 4 columnas, grid interno de 3) --- */}
            <fieldset className="col-span-4 border p-3 rounded">
              <legend className="text-lg font-medium">Descuento</legend>
              {/* Usar grid aquí también para alinear descripción y monto */}
              <div className="grid grid-cols-4 gap-4"> {/* Grid interno de 4 */}
                <div className="col-span-3"> {/* Descripción ocupa 3 */}
                  <label className="block text-sm font-medium text-gray-700">Descripción</label>
                  <input type="text" name="discountDescription" value={formData.discountDescription} onChange={handleGeneralInputChange} className="input-style" />
                </div>
                <div className="col-span-1"> {/* Monto ocupa 1 */}
                  <label className="block text-sm font-medium text-gray-700">Monto ($)</label>
                  <input type="number" name="discountAmount" value={formData.discountAmount} onChange={handleGeneralInputChange} min="0" step="0.01" className="input-style" />
                </div>
              </div>
            </fieldset>


            {/* --- Totales y Pago Inicial --- */}
            <div className="col-span-4 mt-2 text-right space-y-1 border-t pt-4"> {/* Ajustado mt-2 */}
              <p className="text-lg">Subtotal: <span className="font-semibold">${formData.subtotalPrice.toFixed(2)}</span></p>
              {formData.discountAmount > 0 && (
                <p className="text-lg text-red-600">Descuento ({formData.discountDescription || 'General'}): <span className="font-semibold">-${formData.discountAmount.toFixed(2)}</span></p>
              )}
              <p className="text-xl font-bold">Total: <span className="font-semibold">${formData.totalPrice.toFixed(2)}</span></p>
              <div className="flex justify-end items-center space-x-2 mt-2">
                <label className="text-sm font-medium">Pago Inicial:</label>
                <select name="initialPaymentPercentage" value={formData.initialPaymentPercentage} onChange={handlePaymentPercentageChange} className="input-style w-auto">
                  <option value="60">60%</option>
                  <option value="total">Total (100%)</option>
                </select>
                <span className="text-lg font-semibold">(${formData.initialPayment.toFixed(2)})</span>
              </div>
            </div>

            {/* --- Notas Generales --- */}
            <div className="col-span-4">
              <label className="block text-sm font-medium text-gray-700">Notas Generales</label>
              <textarea name="generalNotes" value={formData.generalNotes} onChange={handleGeneralInputChange} rows="3" className="input-style w-full"></textarea>
            </div>

            {/* --- Botón Submit --- */}
            <div className="col-span-4 mt-4"> {/* Añadido margen superior */}
                <button
                  type="submit"
                  className="w-full bg-blue-950 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  disabled={isLoading || formData.lineItems.length === 0}
                >
                  {isLoading ? 'Guardando...' : (isEditing ? "Guardar Cambios" : "Crear Presupuesto")}
                </button>
            </div>
          </form>
        </div>
      </div>
      {/* Estilos simples */}
      <style>{`
        .input-style { border: 1px solid #ccc; border-radius: 4px; padding: 8px; width: 100%; margin-top: 4px; }
        .input-style:disabled { background-color: #f3f4f6; cursor: not-allowed; }
        .button-add-item { background-color: #e0e7ff; color: #3730a3; padding: 6px 10px; border-radius: 4px; font-size: 0.875rem; border: 1px solid #c7d2fe; cursor: pointer; transition: background-color 0.2s; }
        .button-add-item:hover { background-color: #c7d2fe; }
        label { margin-bottom: 2px; }
        fieldset { margin-top: 1rem; }
        legend { padding: 0 0.5rem; font-weight: 500; color: #4b5563; }
      `}</style>
    </div>
  );
};

export default CreateBudget;