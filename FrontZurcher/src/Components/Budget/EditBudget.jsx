import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { fetchBudgets, fetchBudgetById, updateBudget, } from "../../Redux/Actions/budgetActions";
// ✅ AGREGAR ESTAS IMPORTACIONES:
import { fetchBudgetItems } from "../../Redux/Actions/budgetItemActions";
import { fetchStaff } from "../../Redux/Actions/adminActions"; // 🆕 Para cargar sales reps
import DynamicCategorySection from './DynamicCategorySection';
import EditClientDataModal from './EditClientDataModal';
import EditPermitFieldsModal from './EditPermitFieldsModal'; // 🆕 NUEVO
import { parseISO, format } from 'date-fns';
import { unwrapResult } from '@reduxjs/toolkit';
import { ArrowTopRightOnSquareIcon, PencilIcon } from '@heroicons/react/24/outline';
import api from "../../utils/axios";

// --- Helper para generar IDs temporales ---
const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const EditBudget = () => {
  

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { budgetId } = useParams(); // ✅ Obtener budgetId de la URL

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

  // ✅ AGREGAR SELECTOR PARA STAFF (Sales Reps):
  const { staffList = [], loading: loadingStaff } = useSelector(state => state.admin) || {};
  const salesReps = staffList.filter(s => s.role === 'sales_rep' && s.isActive);
 

 

  // --- Estados Locales ---
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
  const [formData, setFormData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingFile, setViewingFile] = useState(false);
  const [showClientDataModal, setShowClientDataModal] = useState(false);
  const [showEditPermitFieldsModal, setShowEditPermitFieldsModal] = useState(false); // 🆕 NUEVO
  const [forceFormDataRefresh, setForceFormDataRefresh] = useState(0); // 🆕 Para forzar actualización

  // Estados para reemplazar PDFs del Permit
  const [showReplacePermitPdfModal, setShowReplacePermitPdfModal] = useState(false);
  const [showReplaceOptionalDocsModal, setShowReplaceOptionalDocsModal] = useState(false);
  const [newPermitPdfFile, setNewPermitPdfFile] = useState(null);
  const [newOptionalDocsFile, setNewOptionalDocsFile] = useState(null);
  const [uploadingPermitPdf, setUploadingPermitPdf] = useState(false);
  const [uploadingOptionalDocs, setUploadingOptionalDocs] = useState(false);

  const [manualItemData, setManualItemData] = useState({
    category: "",
    customCategory: "",
    name: "",
    unitPrice: "", // Usar string para el input
    quantity: "1", // Default a 1 como string
    notes: "",
    description: "", // ✅ AGREGAR DESCRIPTION
  });

  // ✅ AGREGAR ESTADOS PARA SISTEMA DINÁMICO:
  const [dynamicSectionVisibility, setDynamicSectionVisibility] = useState({});

  // 🆕 Estado para información de referidos externos
  const [externalReferralInfo, setExternalReferralInfo] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    commissionAmount: ''
  });

  // --- Cargar Lista de Budgets para Búsqueda ---
  useEffect(() => {
    // Cargar TODOS los presupuestos disponibles (hasta 1000)
    dispatch(fetchBudgets({ pageSize: 1000, page: 1 }));
  }, [dispatch]);

  // ✅ AGREGAR EFECTO PARA CARGAR CATÁLOGO:
  useEffect(() => {
    dispatch(fetchBudgetItems());
  }, [dispatch]);

  // 🆕 Cargar lista de staff al montar
  useEffect(() => {
    dispatch(fetchStaff()); // Usar la acción correcta
  }, [dispatch]);

  // ✅ NUEVO: Cargar presupuesto automáticamente si viene budgetId en la URL
  useEffect(() => {
    if (budgetId && !selectedBudgetId) {
      console.log('🔍 Cargando presupuesto desde URL:', budgetId);
      const numericId = Number(budgetId);
      setSelectedBudgetId(numericId);
      dispatch(fetchBudgetById(numericId));
    }
  }, [budgetId, selectedBudgetId, dispatch]);

  // Actualiza el filtro en la línea ~45:
const editableBudgets = useMemo(() => {
  // ✅ INCLUIR TODOS LOS ESTADOS EDITABLES (incluye rejected y pending_review)
  // 🧪 TESTING MODE: Permitir editar Budgets en cualquier estado (incluyendo con Works)
  const allowedStatus = [
    "draft",             // Borrador
                 // 🆕 NUEVO: Borrador inicial (no enviado) - OPCIONAL
    "pending_review", 
    "created",           // Recién creado
    "send",              // Marcado para enviar
    "sent",              // Enviado
    "pending",           // Pendiente
    "pending_review",    // 🆕 En revisión del cliente
    "rejected",          // 🆕 Rechazado (para reenvío)
    "notResponded",      // Sin respuesta
    "sent_for_signature",// Enviado para firma
    "signed",            // ⚠️ Firmado (agregado para testing - editar Permits)
    "approved"           // ⚠️ Aprobado (agregado para testing - editar Permits)
  ];
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
        description: item.description || '',
        supplierName: item.supplierName || '', // ✅ Incluir supplierName
        imageUrl: item.imageUrl || item.imageurl || '', // ✅ Incluir imageUrl
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

  // ⚠️ Determinar si el Budget tiene comprobante de pago cargado
  // Solo bloquear si ya tiene paymentInvoice o paymentProofAmount (se convirtió en Work)
  const isBudgetLocked = useMemo(() => {
    if (!currentBudget) return false;
    
    // Bloquear si tiene URL de comprobante
    if (currentBudget.paymentInvoice && currentBudget.paymentInvoice.trim() !== '') return true;
    
    // Bloquear si tiene monto de comprobante registrado
    if (currentBudget.paymentProofAmount && parseFloat(currentBudget.paymentProofAmount) > 0) return true;
    
    // Permitir edición en todos los demás casos
    return false;
  }, [currentBudget]);

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

  // --- Cargar Datos del Budget Seleccionado ---
  useEffect(() => {
    // Solo cargar si selectedBudgetId cambió y NO viene de la URL inicial
    if (selectedBudgetId && !budgetId) {
      console.log(`Dispatching fetchBudgetById for ID: ${selectedBudgetId}`);
      setFormData(null);
      dispatch(fetchBudgetById(selectedBudgetId));
    } else if (!selectedBudgetId) {
      setFormData(null);
    }
  }, [selectedBudgetId, budgetId, dispatch]);

  // --- Poblar Estado Local (formData) cuando currentBudget cambia ---
  useEffect(() => {
   

    if (currentBudget && currentBudget.idBudget === selectedBudgetId && (!formData || formData.idBudget !== selectedBudgetId || forceFormDataRefresh > 0)) {
      

      try {
        const permitData = currentBudget.Permit || {};
        const lineItemsData = currentBudget.lineItems || [];

        console.log('🔄 Recreando formData con datos actualizados del Permit:', permitData);
        console.log('📝 Valores clave:', {
          permitNumber: permitData.permitNumber,
          applicantName: permitData.applicantName,
          applicantPhone: permitData.applicantPhone,
          propertyAddress: permitData.propertyAddress,
          lot: permitData.lot,
          block: permitData.block
        });

        const newFormData = {
          idBudget: currentBudget.idBudget,
          permitNumber: permitData.permitNumber || "",
          propertyAddress: permitData.propertyAddress || currentBudget.propertyAddress || "",
          applicantName: permitData.applicantName || currentBudget.applicantName || "",
          applicantEmail: permitData.applicantEmail || "",
          applicantPhone: permitData.applicantPhone || "",
          lot: permitData.lot || "",
          block: permitData.block || "",
          date: currentBudget.date ? currentBudget.date.split('T')[0] : "",
          expirationDate: currentBudget.expirationDate ? currentBudget.expirationDate.split('T')[0] : "",
          status: currentBudget.status || "created",
          discountDescription: currentBudget.discountDescription || "",
          discountAmount: parseFloat(currentBudget.discountAmount) || 0,
          generalNotes: currentBudget.generalNotes || "",
          initialPaymentPercentage: currentBudget.initialPaymentPercentage || '60',
          // 🆕 Campos de comisiones
          leadSource: currentBudget.leadSource || 'web',
          createdByStaffId: currentBudget.createdByStaffId || '',
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
            description: item.itemDetails?.description || item.description || '',
            supplierName: item.itemDetails?.supplierName || item.supplierName || '', // ✅ AGREGAR SUPPLIERNAME
          })),
          pdfDataUrl: permitData.pdfDataUrl || null,
          optionalDocsUrl: permitData.optionalDocsUrl || null,
          pdfDataFile: null,
          optionalDocsFile: null,
          subtotalPrice: 0,
          totalPrice: 0,
          initialPayment: 0,
        };
       
        setFormData(newFormData);
        
        // 🆕 Poblar externalReferralInfo si existe
        if (currentBudget.leadSource === 'external_referral') {
          setExternalReferralInfo({
            name: currentBudget.externalReferralName || '',
            email: currentBudget.externalReferralEmail || '',
            phone: currentBudget.externalReferralPhone || '',
            company: currentBudget.externalReferralCompany || '',
            commissionAmount: currentBudget.salesCommissionAmount || ''
          });
        } else {
          // Resetear si no es external_referral
          setExternalReferralInfo({
            name: '',
            email: '',
            phone: '',
            company: '',
            commissionAmount: ''
          });
        }
        
        // 🆕 Resetear el flag de forzar refresh después de recrear
        if (forceFormDataRefresh > 0) {
          setForceFormDataRefresh(0);
        }
       

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
  }, [currentBudget, selectedBudgetId, formData, forceFormDataRefresh]); // 🆕 Agregado forceFormDataRefresh

  // --- Recalcular Totales ---
  useEffect(() => {
    if (!formData) return;

   

    const subtotal = formData.lineItems.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + (quantity * price);
    }, 0);

    const discount = parseFloat(formData.discountAmount) || 0;
    
    // 🆕 Calcular comisión según leadSource
    let commission = 0;
    if (formData.leadSource === 'sales_rep' && formData.createdByStaffId) {
      commission = 500; // Comisión fija de $500 para sales rep
    } else if (formData.leadSource === 'external_referral' && externalReferralInfo.commissionAmount) {
      commission = parseFloat(externalReferralInfo.commissionAmount) || 0;
    }
    
    const total = subtotal - discount + commission;

    let payment = 0;
    const percentage = parseFloat(formData.initialPaymentPercentage);
    if (!isNaN(percentage)) {
      payment = (total * percentage) / 100;
    } else if (formData.initialPaymentPercentage === 'total') {
      payment = total;
    }

    if (subtotal !== formData.subtotalPrice || total !== formData.totalPrice || payment !== formData.initialPayment) {
      
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
  }, [formData?.lineItems, formData?.discountAmount, formData?.initialPaymentPercentage, formData?.leadSource, formData?.createdByStaffId, externalReferralInfo.commissionAmount, formData?.subtotalPrice, formData?.totalPrice, formData?.initialPayment]);

  // --- Handlers ---
  const handleGeneralInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleManualItemChange = (e) => {
    const { name, value } = e.target;
    if (name === 'category') {
      setManualItemData(prev => ({
        ...prev,
        category: value,
        customCategory: value === 'other' ? prev.customCategory : '',
      }));
      return;
    }
    setManualItemData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddManualItem = () => {
    // Validaciones básicas
    const unitPriceNum = parseFloat(manualItemData.unitPrice);
    const quantityNum = parseFloat(manualItemData.quantity);

  let categoryValue = manualItemData.category === 'other' ? manualItemData.customCategory : manualItemData.category;
  if (!categoryValue.trim() || !manualItemData.name.trim()) {
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
    category: categoryValue.trim(),
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
  setManualItemData({ category: "", customCategory: "", name: "", unitPrice: "", quantity: "1", notes: "", description: "" }); // ✅ RESETEAR DESCRIPTION
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData || !selectedBudgetId) {
      alert("No hay datos de formulario o budget seleccionado.");
      return;
    }
    setIsSubmitting(true);
   

    // --- 1. Preparar datos para la actualización (Incluyendo status: 'send' si aplica) ---
    const dataToSend = {
      date: formData.date,
      expirationDate: formData.expirationDate || null,
      status: formData.status,
      discountDescription: formData.discountDescription,
      discountAmount: parseFloat(formData.discountAmount) || 0,
      generalNotes: formData.generalNotes,
      initialPaymentPercentage: parseFloat(formData.initialPaymentPercentage) || 60,
      // 🆕 Campos de comisiones
      leadSource: formData.leadSource,
      createdByStaffId: formData.createdByStaffId || null,
      // 🆕 Campos de external referral (solo si aplica)
      externalReferralName: formData.leadSource === 'external_referral' ? externalReferralInfo.name : null,
      externalReferralEmail: formData.leadSource === 'external_referral' ? externalReferralInfo.email : null,
      externalReferralPhone: formData.leadSource === 'external_referral' ? externalReferralInfo.phone : null,
      externalReferralCompany: formData.leadSource === 'external_referral' ? externalReferralInfo.company : null,
      salesCommissionAmount: formData.leadSource === 'external_referral' ? parseFloat(externalReferralInfo.commissionAmount) || 0 : 0,
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
      description: item.description,
      supplierName: item.supplierName || undefined, // ✅ INCLUIR SUPPLIERNAME EN PAYLOAD
    }));

    let payload;
    // Verificar si se están actualizando los archivos del PERMIT
    if (formData.pdfDataFile || formData.optionalDocsFile) {
      
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
     
      payload = { ...dataToSend, lineItems: lineItemsPayload };
    }

   

    try {
     
      const resultAction = await dispatch(updateBudget(selectedBudgetId, payload));
      const updatedBudget = unwrapResult(resultAction);
 

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
     
    }
  };

  // --- Handler para actualizar datos de cliente ---
  const handleClientDataUpdated = (updatedData) => {
    console.log('🔄 Datos recibidos en handleClientDataUpdated:', updatedData);
    
    // Actualizar formData con los nuevos datos del budget y permit
    setFormData(prev => {
      const newFormData = {
        ...prev,
        applicantName: updatedData.budget?.applicantName || prev.applicantName,
        propertyAddress: updatedData.budget?.propertyAddress || prev.propertyAddress,
        // Actualizar también los campos del permit
        applicantEmail: updatedData.permit?.applicantEmail || prev.applicantEmail,
        applicantPhone: updatedData.permit?.applicantPhone || prev.applicantPhone,
      };
      
      console.log('🔄 FormData actualizado:', newFormData);
      return newFormData;
    });

    // También refrescar los datos desde el servidor para asegurar sincronización
    dispatch(fetchBudgetById(selectedBudgetId));
  };

  // Handler para reemplazar PDF del Permit
  const handleReplacePermitPdf = async () => {
    if (!newPermitPdfFile || !currentBudget?.PermitIdPermit) {
      alert('Por favor selecciona un archivo PDF');
      return;
    }

    setUploadingPermitPdf(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('pdfData', newPermitPdfFile);

      await api.put(`/permit/${currentBudget.PermitIdPermit}/replace-pdf`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('PDF del Permit reemplazado exitosamente');
      setShowReplacePermitPdfModal(false);
      setNewPermitPdfFile(null);
      
      // Refrescar datos del budget
      dispatch(fetchBudgetById(selectedBudgetId));
    } catch (err) {
      console.error('Error al reemplazar PDF del Permit:', err);
      alert(err.response?.data?.error || 'Error al reemplazar el PDF del Permit');
    } finally {
      setUploadingPermitPdf(false);
    }
  };

  // Handler para reemplazar Optional Docs del Permit
  const handleReplaceOptionalDocs = async () => {
    if (!newOptionalDocsFile || !currentBudget?.PermitIdPermit) {
      alert('Por favor selecciona un archivo PDF');
      return;
    }

    setUploadingOptionalDocs(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('optionalDocs', newOptionalDocsFile);

      await api.put(`/permit/${currentBudget.PermitIdPermit}/replace-optional-docs`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Optional Docs del Permit reemplazados exitosamente');
      setShowReplaceOptionalDocsModal(false);
      setNewOptionalDocsFile(null);
      
      // Refrescar datos del budget
      dispatch(fetchBudgetById(selectedBudgetId));
    } catch (err) {
      console.error('Error al reemplazar Optional Docs del Permit:', err);
      alert(err.response?.data?.error || 'Error al reemplazar los Optional Docs del Permit');
    } finally {
      setUploadingOptionalDocs(false);
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
              
              {/* ⚠️ Mensaje de Advertencia si el Budget está bloqueado */}
              {isBudgetLocked && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-amber-700">
                        <span className="font-semibold">⚠️ Presupuesto con comprobante de pago:</span> Este presupuesto ya tiene un comprobante de pago cargado y se convirtió en Work. Solo puedes editar datos del cliente y reemplazar PDFs del Permit. Los campos del presupuesto están bloqueados para proteger la integridad del trabajo.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* --- Datos del Permit (No editables) --- */}
              <fieldset className="border border-gray-200 p-4 rounded-lg mb-6">
                <legend className="flex items-center justify-between w-full px-2">
                  <span className="text-lg font-semibold text-blue-800">Permit Information</span>
                  <div className="flex items-center gap-2">
                    {currentBudget?.PermitIdPermit && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowReplacePermitPdfModal(true)}
                          className="inline-flex items-center px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                          📄 Reemplazar Permit
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowReplaceOptionalDocsModal(true)}
                          className="inline-flex items-center px-3 py-2 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          📎 Reemplazar Site Plan
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowClientDataModal(true)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Editar Cliente
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditPermitFieldsModal(true)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                    >
                      🔧 Editar Permit
                    </button>
                  </div>
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Permit #</label>
                    <p className="mt-1 text-base text-gray-900 font-semibold">{formData.permitNumber || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500">Property Address</label>
                    <p className="mt-1 text-base text-gray-900 font-semibold">{formData.propertyAddress || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Applicant Name</label>
                    <p className="mt-1 text-base text-gray-900 font-semibold">{formData.applicantName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1 text-base text-gray-900 font-semibold">{formData.applicantEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Phone</label>
                    <p className="mt-1 text-base text-gray-900 font-semibold">{formData.applicantPhone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Lot / Block</label>
                    <p className="mt-1 text-base text-gray-900 font-semibold">{formData.lot || 'N/A'} / {formData.block || 'N/A'}</p>
                  </div>
                </div>
              </fieldset>
              {/* --- Datos Generales del Presupuesto (Editables) --- */}
              <fieldset className="border border-gray-200 p-4 rounded-lg mb-6" disabled={isBudgetLocked}>
                <legend className="text-lg font-semibold text-blue-800 px-2">
                  Budget Details
                  {isBudgetLocked && <span className="ml-2 text-xs text-amber-600">(🔒 Bloqueado)</span>}
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
                    <input type="date" id="date" name="date" value={formData.date} onChange={handleGeneralInputChange} className="input-style mt-1" disabled={isBudgetLocked} />
                  </div>
                  <div>
                    <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700">Expiration Date</label>
                    <input type="date" id="expirationDate" name="expirationDate" value={formData.expirationDate} onChange={handleGeneralInputChange} className="input-style mt-1" disabled={isBudgetLocked} />
                  </div>
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                    <select id="status" name="status" value={formData.status} onChange={handleGeneralInputChange} className="input-style mt-1" disabled={isBudgetLocked}>
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

                {/* 🆕 Lead Source & Commission Management */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-blue-900">Lead Source & Commissions</h4>
                    
                    {/* 🆕 BADGES DE ESTADO */}
                    <div className="flex gap-2">
                      {formData.leadSource === 'sales_rep' && formData.createdByStaffId && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-300">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                          </svg>
                          Sales Rep ($500)
                        </span>
                      )}
                      {formData.leadSource === 'external_referral' && externalReferralInfo.commissionAmount && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                          </svg>
                          External Ref (${parseFloat(externalReferralInfo.commissionAmount).toFixed(2)})
                        </span>
                      )}
                      {formData.leadSource && !['sales_rep', 'external_referral'].includes(formData.leadSource) && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          No Commission
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* 🆕 INFO PANEL - Resumen del estado actual */}
                  {(formData.leadSource === 'sales_rep' && formData.createdByStaffId) || 
                   (formData.leadSource === 'external_referral' && externalReferralInfo.name) ? (
                    <div className="mb-4 p-3 bg-white border-l-4 border-blue-500 rounded-r-lg shadow-sm">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">Current Commission Configuration:</p>
                          {formData.leadSource === 'sales_rep' && formData.createdByStaffId && (
                            <div className="mt-1 text-sm text-gray-700">
                              <p>• <span className="font-medium">Type:</span> Internal Sales Representative</p>
                              <p>• <span className="font-medium">Assigned to:</span> {salesReps.find(r => r.id === formData.createdByStaffId)?.name || 'Loading...'}</p>
                              <p>• <span className="font-medium">Commission:</span> $500.00 (Fixed)</p>
                            </div>
                          )}
                          {formData.leadSource === 'external_referral' && externalReferralInfo.name && (
                            <div className="mt-1 text-sm text-gray-700">
                              <p>• <span className="font-medium">Type:</span> External Referral (Non-Staff)</p>
                              <p>• <span className="font-medium">Referral:</span> {externalReferralInfo.name}</p>
                              {externalReferralInfo.company && (
                                <p>• <span className="font-medium">Company:</span> {externalReferralInfo.company}</p>
                              )}
                              <p>• <span className="font-medium">Commission:</span> ${parseFloat(externalReferralInfo.commissionAmount || 0).toFixed(2)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  
                  <div className="mb-4">
                    <label htmlFor="leadSource" className="block text-sm font-medium text-gray-700 mb-1">
                      Lead Source <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="leadSource"
                      name="leadSource"
                      value={formData.leadSource}
                      onChange={handleGeneralInputChange}
                      className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      disabled={isBudgetLocked}
                    >
                      <option value="web">Website / Web Form</option>
                      <option value="direct_client">Direct Client (Walk-in/Call)</option>
                      <option value="social_media">Social Media</option>
                      <option value="referral">Referral (Generic)</option>
                      <option value="sales_rep">Sales Representative (Staff)</option>
                      <option value="external_referral">External Referral (Non-Staff)</option>
                    </select>
                  </div>

                  {/* Sales Rep (solo si leadSource === 'sales_rep') */}
                  {formData.leadSource === 'sales_rep' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="createdByStaffId" className="block text-sm font-medium text-gray-700">
                          Sales Representative <span className="text-red-500">*</span>
                        </label>
                        {formData.createdByStaffId && (
                          <span className="text-xs text-indigo-700 font-medium">
                            ✓ Currently assigned: {salesReps.find(r => r.id === formData.createdByStaffId)?.name || 'Unknown'}
                          </span>
                        )}
                      </div>
                      <select
                        id="createdByStaffId"
                        name="createdByStaffId"
                        value={formData.createdByStaffId}
                        onChange={handleGeneralInputChange}
                        required={formData.leadSource === 'sales_rep'}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        disabled={isBudgetLocked}
                      >
                        <option value="">Select a sales representative...</option>
                        {loadingStaff ? (
                          <option disabled>Loading sales reps...</option>
                        ) : salesReps.length === 0 ? (
                          <option disabled>No sales representatives available</option>
                        ) : (
                          salesReps.map(rep => (
                            <option key={rep.id} value={rep.id}>
                              {rep.name} ({rep.email})
                            </option>
                          ))
                        )}
                      </select>
                      <p className="text-xs text-indigo-600 mt-1 font-medium">
                        💰 Fixed commission: $500 USD (increases client's total price)
                      </p>
                    </div>
                  )}

                  {/* External Referral Fields (solo si leadSource === 'external_referral') */}
                  {formData.leadSource === 'external_referral' && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-300 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-bold text-green-900">External Referral Information</h5>
                        {externalReferralInfo.name && (
                          <span className="text-xs text-green-700 font-medium">
                            ✓ Currently configured: {externalReferralInfo.name}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Referral Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={externalReferralInfo.name}
                            onChange={(e) => setExternalReferralInfo(prev => ({
                              ...prev,
                              name: e.target.value
                            }))}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="John Doe"
                            required
                            disabled={isBudgetLocked}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={externalReferralInfo.email}
                            onChange={(e) => setExternalReferralInfo(prev => ({
                              ...prev,
                              email: e.target.value
                            }))}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="referral@example.com"
                            disabled={isBudgetLocked}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input
                            type="tel"
                            value={externalReferralInfo.phone}
                            onChange={(e) => setExternalReferralInfo(prev => ({
                              ...prev,
                              phone: e.target.value
                            }))}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="+1 (555) 123-4567"
                            disabled={isBudgetLocked}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                          <input
                            type="text"
                            value={externalReferralInfo.company}
                            onChange={(e) => setExternalReferralInfo(prev => ({
                              ...prev,
                              company: e.target.value
                            }))}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="ABC Real Estate"
                            disabled={isBudgetLocked}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Commission Amount ($) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={externalReferralInfo.commissionAmount}
                            onChange={(e) => setExternalReferralInfo(prev => ({
                              ...prev,
                              commissionAmount: e.target.value
                            }))}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="500.00"
                            min="0"
                            step="0.01"
                            required
                            disabled={isBudgetLocked}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Commission amount that will be added to the client's total price
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </fieldset>
              {/* --- Líneas de Items (Editables: Cantidad y Notas) --- */}
              <fieldset className="border border-gray-200 p-4 rounded-lg mb-6" disabled={isBudgetLocked}>
                <legend className="text-lg font-semibold text-blue-800 px-2">Budget Items {isBudgetLocked && <span className="text-xs text-orange-600">(🔒 Bloqueado)</span>}</legend>
                <div className="space-y-4">
                  {formData.lineItems.map((item, index) => (
                    <div key={item._tempId || item.id || index} className="border-b border-gray-100 pb-4 last:border-b-0">
                      <p className="font-medium text-blue-900">{item.name} <span className="text-xs text-gray-500">({item.category})</span></p>
                      <p className="text-sm text-gray-600">Brand: {item.marca || 'N/A'} | Capacity: {item.capacity || 'N/A'} | Unit Price: ${item.unitPrice.toFixed(2)}</p>
                      {item.supplierName && (
                        <p className="text-sm text-indigo-600 font-medium">Supplier: {item.supplierName}</p>
                      )}
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
                            disabled={isBudgetLocked}
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
                            disabled={isBudgetLocked}
                          />
                        </div>
                      </div>
                      <button type="button" onClick={() => handleRemoveLineItem(index)} className="text-red-500 text-xs mt-1 hover:underline" disabled={isBudgetLocked}>Remove Item</button>
                    </div>
                  ))}
                </div>
              </fieldset>
              {/* --- Agregar Items del Catálogo --- */}
              {!isBudgetLocked && (
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
              )}
              {/* --- Añadir Item Manualmente --- */}
              {!isBudgetLocked && (
              <fieldset className="border border-gray-200 p-4 rounded-lg mb-6">
                <legend className="text-lg font-semibold text-blue-800 px-2">Add Manual Item</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="manualCategory" className="block text-xs font-medium text-gray-700">Categoría</label>
                    <select
                      id="manualCategory"
                      name="category"
                      value={manualItemData.category}
                      onChange={handleManualItemChange}
                      className="input-style mt-1 text-sm"
                    >
                      <option value="">Seleccione una categoría</option>
                      {availableCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="other">Otra...</option>
                    </select>
                    {manualItemData.category === 'other' && (
                      <input
                        type="text"
                        name="customCategory"
                        value={manualItemData.customCategory}
                        onChange={handleManualItemChange}
                        placeholder="Ingrese nueva categoría"
                        className="input-style mt-1 text-sm"
                      />
                    )}
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
              )}
              {/* --- Descuento y Totales --- */}
              <fieldset className="border border-gray-200 p-4 rounded-lg mb-6" disabled={isBudgetLocked}>
                <legend className="text-lg font-semibold text-blue-800 px-2">Financial Summary {isBudgetLocked && <span className="text-xs text-orange-600">(🔒 Bloqueado)</span>}</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="discountDescription" className="block text-sm font-medium text-gray-700">Discount Description</label>
                    <input type="text" id="discountDescription" name="discountDescription" value={formData.discountDescription} onChange={handleGeneralInputChange} className="input-style mt-1" disabled={isBudgetLocked} />
                  </div>
                  <div>
                    <label htmlFor="discountAmount" className="block text-sm font-medium text-gray-700">Discount Amount ($)</label>
                    <input type="number" id="discountAmount" name="discountAmount" value={formData.discountAmount} onChange={handleGeneralInputChange} className="input-style mt-1" min="0" step="0.01" disabled={isBudgetLocked} />
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-right">
                  <p className="text-sm text-gray-600">Subtotal: <span className="font-medium text-gray-900">${formData.subtotalPrice.toFixed(2)}</span></p>
                  {(parseFloat(formData.discountAmount) || 0) > 0 && (
                    <p className="text-sm text-gray-600">Discount ({formData.discountDescription || 'General'}): <span className="font-medium text-red-600">-${(parseFloat(formData.discountAmount) || 0).toFixed(2)}</span></p>
                  )}
                  {formData.leadSource === 'sales_rep' && formData.createdByStaffId && (
                    <p className="text-sm text-indigo-600 italic">
                      Sales Commission (internal): <span className="font-semibold">+$500.00</span>
                    </p>
                  )}
                  {formData.leadSource === 'external_referral' && externalReferralInfo.commissionAmount && (
                    <p className="text-sm text-green-600 italic">
                      External Referral Commission: <span className="font-semibold">+${parseFloat(externalReferralInfo.commissionAmount || 0).toFixed(2)}</span>
                    </p>
                  )}
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

      {/* Modal para editar datos de cliente */}
      <EditClientDataModal
        isOpen={showClientDataModal}
        onClose={() => setShowClientDataModal(false)}
        budgetId={selectedBudgetId}
        onDataUpdated={handleClientDataUpdated}
      />

      {/* Modal para reemplazar PDF del Permit */}
      {showReplacePermitPdfModal && (
        <div className="fixed inset-0 bg-gray-700 bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setShowReplacePermitPdfModal(false);
                setNewPermitPdfFile(null);
              }}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-bold mb-4 text-center text-indigo-900">Reemplazar PDF del Permit</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar nuevo PDF
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setNewPermitPdfFile(e.target.files[0])}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                />
                {newPermitPdfFile && (
                  <p className="mt-2 text-sm text-green-600">✓ {newPermitPdfFile.name}</p>
                )}
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-xs text-yellow-800">
                  ⚠️ Este archivo reemplazará el PDF actual del Permit. Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowReplacePermitPdfModal(false);
                    setNewPermitPdfFile(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  disabled={uploadingPermitPdf}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReplacePermitPdf}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  disabled={!newPermitPdfFile || uploadingPermitPdf}
                >
                  {uploadingPermitPdf ? 'Subiendo...' : 'Reemplazar PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para reemplazar Optional Docs del Permit */}
      {showReplaceOptionalDocsModal && (
        <div className="fixed inset-0 bg-gray-700 bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setShowReplaceOptionalDocsModal(false);
                setNewOptionalDocsFile(null);
              }}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-bold mb-4 text-center text-green-900">Reemplazar Optional Docs</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar nuevo PDF
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setNewOptionalDocsFile(e.target.files[0])}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                />
                {newOptionalDocsFile && (
                  <p className="mt-2 text-sm text-green-600">✓ {newOptionalDocsFile.name}</p>
                )}
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-xs text-yellow-800">
                  ⚠️ Este archivo reemplazará los Optional Docs actuales. Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowReplaceOptionalDocsModal(false);
                    setNewOptionalDocsFile(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  disabled={uploadingOptionalDocs}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReplaceOptionalDocs}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
                  disabled={!newOptionalDocsFile || uploadingOptionalDocs}
                >
                  {uploadingOptionalDocs ? 'Subiendo...' : 'Reemplazar Docs'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 MODAL: Editar Campos del Permit */}
      {showEditPermitFieldsModal && currentBudget?.PermitIdPermit && (
        <EditPermitFieldsModal
          permitId={currentBudget.PermitIdPermit}
          onClose={() => setShowEditPermitFieldsModal(false)}
          onSuccess={(updatedPermit) => {
            console.log('✅ Permit actualizado, recargando datos...', updatedPermit);
            
            // 1. Forzar recreación de formData con datos actualizados
            setForceFormDataRefresh(prev => prev + 1);
            
            // 2. Recargar budget completo desde el servidor
            // NOTA: fetchBudgetById actualiza TANTO currentBudget como el budget en la lista global
            // (Ver BudgetReducer.jsx línea 51-53: actualiza state.budgets[index])
            dispatch(fetchBudgetById(selectedBudgetId));
            
            // 3. 🆕 Limpiar búsqueda para forzar nueva búsqueda con valores actualizados
            setSearchTerm("");
            setSearchResults([]);
            console.log('🔍 Búsqueda limpiada - busca de nuevo con los valores actualizados');
            
            // 4. Cerrar modal después de un delay
            setTimeout(() => {
              setShowEditPermitFieldsModal(false);
              console.log('✅ Datos recargados y modal cerrado');
            }, 1000);
          }}
        />
      )}

      <style>{`.input-style { border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.75rem 1rem; width: 100%; box-sizing: border-box; font-size: 1rem; } .input-style:focus { outline: 2px solid transparent; outline-offset: 2px; border-color: #2563eb; box-shadow: 0 0 0 2px #bfdbfe; }`}</style>
    </div>
  );
};

export default EditBudget;