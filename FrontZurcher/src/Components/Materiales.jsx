import React, { useState, useEffect, useMemo } from "react";
import moment from "moment-timezone";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorks, fetchWorkById, updateWork } from "../Redux/Actions/workActions";
import logo from '../../public/logo.png'; // Asegúrate de que la ruta sea correcta
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrash, faUpload } from "@fortawesome/free-solid-svg-icons";
import { createMaterial } from "../Redux/Actions/materialActions";
import { createReceipt } from "../Redux/Actions/receiptActions";
import { expenseActions } from "../Redux/Actions/balanceActions";
import { toast } from 'react-toastify';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import {
  CubeIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ClipboardDocumentListIcon,
  HashtagIcon,
  ChatBubbleBottomCenterTextIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  DocumentIcon,
} from "@heroicons/react/24/outline";
import DynamicCategorySection from "./Budget/DynamicCategorySection";
import { fetchBudgetItems } from '../Redux/Actions/budgetItemActions';
import { PAYMENT_METHODS_GROUPED } from '../utils/paymentConstants';

const Materiales = () => {
  const dispatch = useDispatch();
  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  // Obtener todas las obras desde Redux
  const { works, selectedWork: work, loading, error } = useSelector((state) => state.work);

  const [selectedAddress, setSelectedAddress] = useState(""); // Dirección seleccionada
  
  // Helper para obtener fecha local en formato YYYY-MM-DD
  const getLocalDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [formData, setFormData] = useState({
    date: getLocalDateString(),
    materials: [],
    comments: "",
  });
  const [newPredefinedMaterial, setNewPredefinedMaterial] = useState({
    material: "",
    selectedOption: "",
    quantity: "",
  });
  
  const [newManualMaterial, setNewManualMaterial] = useState({
    material: "",
    quantity: "",
    comment: "",
  });
  const [editingIndex, setEditingIndex] = useState(null); // Índice del material que se está editando
  const [pdfUrl, setPdfUrl] = useState(null);
  const [currentPdfView, setCurrentPdfView] = useState('permit');
  const [showReceiptModal, setShowReceiptModal] = useState(false); // Estado para el modal

   // Nuevo estado para el archivo del comprobante de materiales iniciales
   const [initialReceiptFile, setInitialReceiptFile] = useState(null);
   // Nuevo estado para controlar si se está subiendo el comprobante
   const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
   // Nuevo estado para el monto del gasto de materiales iniciales
   const [initialMaterialsAmount, setInitialMaterialsAmount] = useState(""); 
   // 🆕 Nuevo estado para el método de pago de materiales iniciales
   const [initialPaymentMethod, setInitialPaymentMethod] = useState('');
   
   // Obtener staffId del estado de autenticación (asumiendo que está disponible)
   const staff = useSelector((state) => state.auth.currentStaff);

  // Agrega el catálogo dinámico de materiales
  const { items: budgetItemsCatalog = [], loading: loadingCatalog, error: errorCatalog } = useSelector(state => state.budgetItems) || {};
  // Forzar fetch si el catálogo está vacío
  useEffect(() => {
    if (!loadingCatalog && (!budgetItemsCatalog || budgetItemsCatalog.length === 0)) {
      dispatch(fetchBudgetItems());
    }
  }, [budgetItemsCatalog, loadingCatalog, dispatch]);

  const [dynamicSectionVisible, setDynamicSectionVisible] = useState(true);
  // Catálogo flexible: acepta "materiales" en cualquier formato
  // Catálogo flexible: acepta "materiales" en cualquier formato y mantiene imageUrl
  const normalizedCatalog = useMemo(() =>
    (budgetItemsCatalog || [])
      .filter(item => item.isActive && item.category && item.category.toString().toLowerCase().trim() === "materiales")
      .map(item => ({
        ...item,
        category: item.category?.toUpperCase().trim() || '',
        name: item.name?.toUpperCase().trim() || '',
        marca: item.marca?.toUpperCase().trim() || '',
        capacity: item.capacity?.toUpperCase().trim() || '',
        imageUrl: item.imageUrl || item.imageurl || '', // Asegura que imageUrl se mantenga
      })),
    [budgetItemsCatalog]
  );
  const addMaterialFromDynamicSection = (item) => {
    // Asegura que imageUrl se preserve en el array de materiales
    setFormData(prev => ({
      ...prev,
      materials: [
        ...prev.materials,
        {
          ...item,
          imageUrl: item.imageUrl || item.imageurl || '',
        },
      ],
    }));
  };

  const saveMaterials = async () => {
    const materialsData = {
      materials: formData.materials.map((material) => ({
        material: material.material,
        quantity: material.quantity,
        comment: material.comment || "",
      })),
      workId: work?.idWork, // ID de la obra seleccionada
      purchaseDate: formData.date, // Fecha asignada
    };
  
    console.log('Datos que se enviarán al backend:', materialsData);
  
    try {
      await dispatch(createMaterial(materialsData)); // Usar la acción para guardar el conjunto de materiales
      alert('Materiales guardados exitosamente.');
  
      // Limpiar el formulario
      setFormData({
        date: getLocalDateString(),
        materials: [],
        comments: "",
      });
      setNewPredefinedMaterial({ material: "", selectedOption: "", quantity: "" });
      setNewManualMaterial({ material: "", quantity: "", comment: "" });
      setEditingIndex(null); // Salir del modo de edición
    } catch (error) {
      console.error('Error al guardar los materiales:', error);
      alert('Hubo un error al guardar los materiales.');
    }
  };
  // Cargar todas las obras al montar el componente
  useEffect(() => {
    dispatch(fetchWorks());
  }, [dispatch]);

// Cuando se selecciona una dirección, cargar detalles de la obra
useEffect(() => {
  if (selectedAddress) {
    const selectedWork = works.find((work) => work.propertyAddress === selectedAddress);
    if (selectedWork) {
      dispatch(fetchWorkById(selectedWork.idWork)); // Cargar detalles del trabajo
      setFormData({
        ...formData,
        date: selectedWork.startDate || getLocalDateString(), // Usar startDate si está disponible
      });
    }
  }
  // eslint-disable-next-line
}, [selectedAddress, works, dispatch]);

// Cuando cambian los detalles de la obra seleccionada, actualizar la fecha en el formulario
useEffect(() => {
  if (work && work.startDate) {
    setFormData(prev => ({
      ...prev,
      date: work.startDate
    }));
  }
}, [work?.startDate]);

// Helper para formatear fecha a MM-DD-YYYY HH:mm en horario Miami
const formatDate = (isoDate) => {
  if (!isoDate) return '';
  try {
    return moment.tz(isoDate, "America/New_York").format("MM-DD-YYYY HH:mm");
  } catch {
    return '';
  }
};




  const permitPdfUrl = useMemo(() => {
    if (!selectedAddress || !work?.Permit) return null;
    
    // ✅ Primero intentar URL de Cloudinary (nuevo sistema)
    if (work.Permit.permitPdfUrl) {
      return work.Permit.permitPdfUrl;
    }
    
    // 🔄 Fallback: Si es legacy con pdfUrl
    if (work.Permit.isLegacy && work.Permit.pdfUrl) {
      return work.Permit.pdfUrl;
    }
    
    // ⚠️ Fallback temporal: crear Blob desde pdfData (deprecated)
    if (work.Permit.pdfData?.data) {
      try {
        return URL.createObjectURL(new Blob([new Uint8Array(work.Permit.pdfData.data)], { type: "application/pdf" }));
      } catch (e) {
        console.error("Error creando URL para permitPdfUrl:", e);
        return null;
      }
    }
    
    return null;
  }, [selectedAddress, work?.Permit]);

  const optionalDocsUrl = useMemo(() => {
    if (!selectedAddress || !work?.Permit) return null;
    
    // ✅ Primero intentar URL de Cloudinary (nuevo sistema)
    if (work.Permit.optionalDocsUrl) {
      return work.Permit.optionalDocsUrl;
    }
    
    // 🔄 Fallback: Si es legacy con optionalDocsUrl antiguo
    if (work.Permit.isLegacy && work.Permit.optionalDocsUrl) {
      return work.Permit.optionalDocsUrl;
    }
    
    // ⚠️ Fallback temporal: crear Blob desde optionalDocs (deprecated)
    if (work.Permit.optionalDocs?.data) {
      try {
        return URL.createObjectURL(new Blob([new Uint8Array(work.Permit.optionalDocs.data)], { type: "application/pdf" }));
      } catch (e) {
        console.error("Error creando URL para optionalDocsUrl:", e);
        return null;
      }
    }
    
    return null;
  }, [selectedAddress, work?.Permit]);

  const handleNewMaterialChange = (e) => {
    const { name, value } = e.target;
    setNewMaterial({
      ...newMaterial,
      [name]: value,
    });
  };
  const addPredefinedMaterial = () => {
    if (newPredefinedMaterial.material && newPredefinedMaterial.quantity) {
      const materialToAdd = {
        material: newPredefinedMaterial.material,
        option: newPredefinedMaterial.selectedOption || "N/A",
        quantity: parseInt(newPredefinedMaterial.quantity, 10), // Asegúrate de convertir la cantidad a número
        comment: "", // No hay comentarios para materiales predefinidos
      };
  
      setFormData({
        ...formData,
        materials: [...formData.materials, materialToAdd],
      });
  
      // Reiniciar el formulario de materiales predefinidos
      setNewPredefinedMaterial({ material: "", selectedOption: "", quantity: "" });
    } else {
      alert("Por favor, selecciona un material y una cantidad válida.");
    }
  };

  const addManualMaterial = () => {
    if (newManualMaterial.material && newManualMaterial.quantity) {
      const materialToAdd = {
        material: newManualMaterial.material,
        option: "N/A", // No hay subopciones para materiales manuales
        quantity: newManualMaterial.quantity,
        comment: newManualMaterial.comment || "",
      };
  
      setFormData({
        ...formData,
        materials: [...formData.materials, materialToAdd],
      });
  
      // Reiniciar el formulario de materiales manuales
      setNewManualMaterial({ material: "", quantity: "", comment: "" });
    }
  };
  const addOrUpdateMaterial = () => {
    if (editingIndex !== null) {
      // Actualizar material existente
      const updatedMaterials = [...formData.materials];
  
      if (newPredefinedMaterial.material) {
        // Actualizar material predefinido
        updatedMaterials[editingIndex] = {
          material: newPredefinedMaterial.material,
          option: newPredefinedMaterial.selectedOption || "N/A",
          quantity: parseInt(newPredefinedMaterial.quantity, 10),
          comment: "", // No hay comentarios para materiales predefinidos
        };
      } else if (newManualMaterial.material) {
        // Actualizar material manual
        updatedMaterials[editingIndex] = {
          material: newManualMaterial.material,
          option: "N/A", // No hay subopciones para materiales manuales
          quantity: parseInt(newManualMaterial.quantity, 10),
          comment: newManualMaterial.comment || "",
        };
      }
  
      setFormData({ ...formData, materials: updatedMaterials });
      setEditingIndex(null); // Salir del modo de edición
      setNewPredefinedMaterial({ material: "", selectedOption: "", quantity: "" });
      setNewManualMaterial({ material: "", quantity: "", comment: "" });
    } else {
      alert("No hay material seleccionado para editar.");
    }
  };
  const editMaterial = (index) => {
    const materialToEdit = formData.materials[index];
  
    if (predefinedMaterials.some((m) => m.material === materialToEdit.material)) {
      // Es un material predefinido
      setNewPredefinedMaterial({
        material: materialToEdit.material,
        selectedOption: materialToEdit.option !== "N/A" ? materialToEdit.option : "",
        quantity: materialToEdit.quantity.toString(), // Convertir a string para el input
      });
  
      // Limpiar el estado de materiales manuales
      setNewManualMaterial({ material: "", quantity: "", comment: "" });
    } else {
      // Es un material manual
      setNewManualMaterial({
        material: materialToEdit.material,
        quantity: materialToEdit.quantity.toString(),
        comment: materialToEdit.comment || "",
      });
  
      // Limpiar el estado de materiales predefinidos
      setNewPredefinedMaterial({ material: "", selectedOption: "", quantity: "" });
    }
  
    setEditingIndex(index); // Establecer el índice del material que se está editando
  };

  const deleteMaterial = (index) => {
    const updatedMaterials = formData.materials.filter((_, i) => i !== index);
    setFormData({ ...formData, materials: updatedMaterials });
  };

  const generatePDF = async() => {
    const doc = new jsPDF();
    doc.addImage(logo, 'PNG', 10, 10, 30, 30); // Adjust logo size
    doc.setFontSize(12);
    doc.text(`Fecha: ${formatDate(formData.date)}`, 150, 15);
    doc.text(`Cliente: ${work?.Permit?.applicantName || "No disponible"}`, 150, 25);
    doc.setFontSize(16);
    doc.text(`Materiales para:`, 10, 50);
    doc.text(`${work?.propertyAddress || "No disponible"}`, 10, 60);

    // Cartel de fecha de inicio si existe
    if (work?.startDate) {
      doc.setFontSize(13);
      doc.setTextColor(0, 102, 204);
      doc.text(`MATERIALES PARA FECHA DE INICIO: ${formatDate(work.startDate)}`, 10, 70);
      doc.setTextColor(0,0,0);
    }

    autoTable(doc, {
      startY: work?.startDate ? 80 : 80,
      head: [["Material", "Descripción", "Cantidad", "Comentario"]],
      body: formData.materials.map((material) => [
        material.material || material.name || "N/A",
        material.description || "",
        material.quantity,
        material.comment || "",
      ]),
    });
    let lastY = doc.lastAutoTable.finalY;
    if (formData.comments) {
      doc.text("Comentarios adicionales:", 10, lastY + 10);
      doc.text(formData.comments, 10, lastY + 20);
    }

    const pdfBlob = doc.output("blob");
    const generatedPdfUrl = URL.createObjectURL(pdfBlob);
    setPdfUrl(generatedPdfUrl); // Guardar la URL del PDF de materiales
    setCurrentPdfView('materials'); // Cambiar automáticamente a la vista del PDF de materiales

    await saveMaterials();
  };
  // Handler for initial materials receipt file selection
  const handleInitialReceiptFileChange = (e) => {
    setInitialReceiptFile(e.target.files[0]); // Guarda el primer archivo seleccionado en el estado
  };
  // ...existing code...
  // ...existing code...
  const handleUploadInitialReceipt = async () => {
    // --- Validaciones ---
    if (!selectedAddress || !work?.idWork) {
      toast.error("Por favor, seleccione una dirección primero.");
      return;
    }
    if (!initialReceiptFile) {
      toast.error("Por favor, seleccione un archivo de comprobante.");
      return;
    }
    if (!initialMaterialsAmount || parseFloat(initialMaterialsAmount) <= 0) {
      toast.error("Por favor, ingrese un monto válido para el gasto.");
      return;
    }
    // 🆕 Validar método de pago
    if (!initialPaymentMethod) {
      toast.error("⚠️ Por favor, selecciona un método de pago. Este campo es obligatorio.");
      return;
    }
    if (!['pending', 'assigned', 'inProgress'].includes(work.status)) {
    toast.warn(`La obra con dirección ${work.propertyAddress} ya tiene estado '${work.status}' y no permite carga de materiales iniciales.`);
    setInitialReceiptFile(null);
    setInitialMaterialsAmount("");
    if(document.getElementById('initialReceiptFile')) {
      document.getElementById('initialReceiptFile').value = null;
    }
    return;
  }

    setIsUploadingReceipt(true);
    let createdExpenseId = null;

    try {
      // --- Paso 1: Crear el registro de Gasto (Expense) ---
      const expenseData = {
        date: getLocalDateString(),
        amount: parseFloat(initialMaterialsAmount),
        notes: `Gasto de materiales iniciales para ${work.propertyAddress}`, // Nota automática
        workId: work.idWork,
        staffId: staff?.id, // Asegúrate de que 'staff' y 'staff.id' estén disponibles
        typeExpense: "Materiales Iniciales", // Tipo de gasto específico
        paymentMethod: initialPaymentMethod, // 🆕 Método de pago obligatorio
      };

      console.log('Datos a enviar para crear Gasto (Expense):', expenseData);
      // ASUME que expenseActions.create devuelve el objeto creado con su ID
      // Ajusta esto según cómo funcione tu acción `expenseActions.create`
      const createdExpense = await expenseActions.create(expenseData); 
      
      if (!createdExpense || !createdExpense.idExpense) { // Ajusta 'idExpense' si el nombre del ID es diferente
          throw new Error("No se pudo obtener el ID del gasto de materiales iniciales creado.");
      }
      createdExpenseId = createdExpense.idExpense;
      toast.success("Gasto de materiales iniciales registrado.");
      console.log('Gasto de materiales iniciales creado con ID:', createdExpenseId);

      // --- Paso 2: Crear el Comprobante (Receipt) asociado al Gasto ---
      const receiptFormData = new FormData();
      receiptFormData.append('file', initialReceiptFile);
      receiptFormData.append('relatedModel', 'Expense'); // Asociar al modelo Expense
      receiptFormData.append('relatedId', createdExpenseId); // ID del gasto recién creado
      receiptFormData.append('type', 'Materiales Iniciales'); // Tipo de comprobante
      receiptFormData.append('date', getLocalDateString());
      // receiptFormData.append('notes', `Comprobante de materiales iniciales para ${work.propertyAddress}`); // Opcional

      console.log('Datos a enviar para crear Comprobante (Receipt):', Object.fromEntries(receiptFormData));
      await dispatch(createReceipt(receiptFormData));
      toast.success('Comprobante de materiales iniciales subido y asociado al gasto.');
      console.log('Comprobante de materiales iniciales subido.');

       // --- Paso 3: Actualizar el estado SOLO si no está ya en inProgress ---
    if (work.status !== 'inProgress') {
      const workUpdateData = {
        status: 'inProgress',
        startDate: work.startDate || getLocalDateString(), 
      };
      await dispatch(updateWork(work.idWork, workUpdateData));
      toast.success(`Estado de la obra para "${work.propertyAddress}" actualizado a "En Progreso".`);
    } else {
      toast.info('La obra ya estaba en progreso. Comprobante registrado exitosamente.');
    }


      // --- Limpieza del formulario ---
      setInitialReceiptFile(null);
      setInitialMaterialsAmount("");
      setInitialPaymentMethod(''); // 🆕 Limpiar método de pago
      if(document.getElementById('initialReceiptFile')) {
        document.getElementById('initialReceiptFile').value = null;
      }
      
      dispatch(fetchWorkById(work.idWork)); // Re-fetch para actualizar UI

    } catch (error) {
      console.error("Error en el proceso:", error);
      const errorMsg = error?.response?.data?.message || error?.message || "Ocurrió un error en el proceso.";
      toast.error(errorMsg);
    } finally {
      setIsUploadingReceipt(false);
    }
  };
// ...existing code...


  if (loading) {
    return <p>Cargando datos...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header con controles principales */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg">
                <CubeIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Gestión de Materiales</h2>
                <p className="text-gray-600">Administra los materiales utilizados en cada obra</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Selección de obra */}
              <div className="min-w-0 flex-1 sm:min-w-[300px]">
                <label htmlFor="address" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <BuildingOffice2Icon className="h-4 w-4 mr-2 text-gray-500" />
                  Seleccionar Obra
                </label>
                <select
                  id="address"
                  name="address"
                  value={selectedAddress}
                  onChange={(e) => setSelectedAddress(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">Seleccione una dirección</option>
                  {works
                    .filter((work) => work.status === "pending" || work.status === "assigned" || work.status === "inProgress")
                    .map((work) => (
                      <option key={work.idWork} value={work.propertyAddress}>
                        {work.propertyAddress}
                      </option>
                    ))}
                </select>
              </div>

              {/* Fecha y botón de comprobante */}
              <div className="flex gap-3">
                <div className="min-w-[150px]">
                  <label htmlFor="date" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <CalendarDaysIcon className="h-4 w-4 mr-2 text-gray-500" />
                    Fecha
                  </label>
                  <input
                    type="text"
                    id="date"
                    name="date"
                    value={formatDate(formData.date)}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-600"
                  />
                </div>

                {/* Botón para abrir modal de comprobante */}
                {work && ['pending', 'assigned', 'inProgress'].includes(work.status) && selectedAddress && (
                  <div className="flex items-end">
                    <button
                      onClick={() => setShowReceiptModal(true)}
                      className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center space-x-2"
                    >
                      <ArrowUpTrayIcon className="h-5 w-5" />
                      <span className="hidden sm:inline">Materiales Iniciales</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Layout principal con grid responsive */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Cartel de fecha de inicio de la obra seleccionada */}
          {work?.startDate && (
            <div className="col-span-full mb-2 w-full">
              <div className="bg-blue-100 border border-blue-300 text-blue-800 rounded-lg px-4 py-3 text-center font-semibold text-base shadow">
                Fecha de inicio asignada a la obra: {formatDate(work.startDate)}
              </div>
            </div>
          )}
          {/* Columna izquierda: Formularios de materiales */}
          <div className="space-y-6 min-w-0 w-full">
            {/* Dynamic Materials Catalog Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 w-full">
              <div className="flex items-center space-x-3 mb-4">
                <ClipboardDocumentListIcon className="h-5 w-5 text-green-500" />
                <h3 className="text-lg font-semibold text-gray-800">Seleccionar Materiales del Catálogo</h3>
              </div>
              <DynamicCategorySection
                category="MATERIALES"
                normalizedCatalog={normalizedCatalog}
                isVisible={dynamicSectionVisible}
                onToggle={() => setDynamicSectionVisible(v => !v)}
                onAddItem={addMaterialFromDynamicSection}
                generateTempId={() => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`}
              />
            </div>

            {/* Manual Materials Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 w-full">
              <div className="flex items-center space-x-3 mb-4">
                <PencilIcon className="h-5 w-5 text-purple-500" />
                <h3 className="text-lg font-semibold text-gray-800">Material Manual</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="manualMaterial" className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Material
                  </label>
                  <input
                    type="text"
                    id="manualMaterial"
                    name="material"
                    placeholder="Escriba el nombre del material"
                    value={newManualMaterial.material}
                    onChange={(e) =>
                      setNewManualMaterial({ ...newManualMaterial, material: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div>
                  <label htmlFor="manualQuantity" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <HashtagIcon className="h-4 w-4 mr-2 text-gray-500" />
                    Cantidad
                  </label>
                  <input
                    type="number"
                    id="manualQuantity"
                    name="quantity"
                    placeholder="Ingrese la cantidad"
                    value={newManualMaterial.quantity}
                    onChange={(e) =>
                      setNewManualMaterial({ ...newManualMaterial, quantity: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div>
                  <label htmlFor="manualComment" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <ChatBubbleBottomCenterTextIcon className="h-4 w-4 mr-2 text-gray-500" />
                    Detalle/Comentario
                  </label>
                  <input
                    type="text"
                    id="manualComment"
                    name="comment"
                    placeholder="Detalles adicionales (opcional)"
                    value={newManualMaterial.comment}
                    onChange={(e) =>
                      setNewManualMaterial({ ...newManualMaterial, comment: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <button
                  type="button"
                  onClick={editingIndex !== null ? addOrUpdateMaterial : addManualMaterial}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  <div className="flex items-center justify-center space-x-2">
                    {editingIndex !== null ? (
                      <>
                        <PencilIcon className="h-5 w-5" />
                        <span>Actualizar Material</span>
                      </>
                    ) : (
                      <>
                        <PlusIcon className="h-5 w-5" />
                        <span>Añadir Material</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Columna derecha: Vista de PDFs/documentos y lista de materiales */}
          <div className="space-y-6 min-w-0 w-full">
            {/* Vista de Documentos PDFs */}
            {(permitPdfUrl || optionalDocsUrl || pdfUrl) && (
              <div className="bg-white rounded-xl shadow-lg p-6">
               
               
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {permitPdfUrl && (
                    <button
                      onClick={() => setCurrentPdfView('permit')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        currentPdfView === 'permit' 
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg" 
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <DocumentTextIcon className="h-4 w-4" />
                        <span>Permiso Principal</span>
                      </div>
                    </button>
                  )}
                  {optionalDocsUrl && (
                    <button
                      onClick={() => setCurrentPdfView('optional')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        currentPdfView === 'optional' 
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg" 
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <DocumentIcon className="h-4 w-4" />
                        <span>Documentos Opcionales</span>
                      </div>
                    </button>
                  )}
                  {pdfUrl && (
                    <button
                      onClick={() => setCurrentPdfView('materials')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        currentPdfView === 'materials' 
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg" 
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <CubeIcon className="h-4 w-4" />
                        <span>Materiales</span>
                      </div>
                    </button>
                  )}
                </div>

                <div className="relative bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                  {currentPdfView === 'permit' && permitPdfUrl ? (
                    <div className="h-[600px] lg:h-[700px]"> 
                      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                        <Viewer
                          fileUrl={permitPdfUrl}
                          plugins={[defaultLayoutPluginInstance]}
                        />
                      </Worker>
                    </div>
                  ) : currentPdfView === 'optional' && optionalDocsUrl ? (
                    <div className="h-[600px] lg:h-[700px]">
                      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                        <Viewer
                          fileUrl={optionalDocsUrl}
                          plugins={[defaultLayoutPluginInstance]}
                        />
                      </Worker>
                    </div>
                  ) : currentPdfView === 'materials' && pdfUrl ? (
                    <div className="h-[600px] lg:h-[700px]">
                      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                        <Viewer
                          fileUrl={pdfUrl}
                          plugins={[defaultLayoutPluginInstance]}
                        />
                      </Worker>
                    </div>
                  ) : (
                    <div className="h-[500px] lg:h-[600px] flex items-center justify-center">
                      <div className="text-center">
                        <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 text-sm">
                          {currentPdfView === 'permit' ? "PDF Principal no disponible" :
                           currentPdfView === 'optional' ? "Documento Opcional no disponible" :
                           "PDF de Materiales no generado"}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          {currentPdfView === 'materials' ? "Genere un PDF agregando materiales" : "Seleccione una obra con documentos"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botón de descarga para PDF de materiales */}
                {currentPdfView === 'materials' && pdfUrl && (
                  <div className="mt-4">
                    <a
                      href={pdfUrl}
                      download={`materiales_${work?.propertyAddress?.replace(/\s+/g, '_') || 'obra'}.pdf`}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 inline-flex items-center justify-center space-x-2"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5" />
                      <span>Descargar PDF de Materiales</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Lista de Materiales Agregados */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <ClipboardDocumentListIcon className="h-5 w-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-800">Materiales Agregados</h3>
                </div>
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                  {formData.materials.length} materiales
                </span>
              </div>

              {formData.materials.length === 0 ? (
                <div className="text-center py-12">
                  <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">No hay materiales agregados</p>
                  <p className="text-gray-400 text-xs mt-1">Agregue materiales usando los formularios de la izquierda</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {formData.materials.map((material, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        {/* Imagen y nombre alineados horizontalmente */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {material.imageUrl && (
                            <img src={material.imageUrl} alt={material.material || material.name} className="h-12 w-12 object-contain rounded border shadow flex-shrink-0" />
                          )}
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                                #{index + 1}
                              </span>
                              <h4 className="font-medium text-gray-900 truncate">{material.material || material.name}</h4>
                               <h4 className="font-medium text-gray-900 truncate">{material.material || material.description}</h4>
                            </div>
                            
                            <div className="text-sm text-gray-600 space-y-1">
                              {material.option && material.option !== "N/A" && (
                                <p>Especificación: <span className="font-medium">{material.option}</span></p>
                              )}
                              <p>Cantidad: <span className="font-medium text-blue-600">{material.quantity}</span></p>
                              {material.comment && (
                                <p>Comentario: <span className="italic">{material.comment}</span></p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => editMaterial(index)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Editar material"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteMaterial(index)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Eliminar material"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              {formData.materials.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                  <button
                    onClick={generatePDF}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <ArrowDownTrayIcon className="h-5 w-5" />
                      <span>Generar PDF y Guardar</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Initial Materials Receipt Card */}
            {work && ['pending', 'assigned', 'inProgress'].includes(work.status) && selectedAddress && (
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-blue-500">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                    <ArrowUpTrayIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Materiales Iniciales</h3>
                    <p className="text-sm text-gray-600">Confirmar compra y cambiar estado</p>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <div className="p-1 bg-blue-500 rounded-full">
                      <CheckCircleIcon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-800 font-medium">
                        Obra: <span className="font-semibold">{work.propertyAddress}</span>
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {work.status !== 'inProgress' 
                          ? "Al subir el comprobante, la obra cambiará a estado 'En Progreso'"
                          : "Registro de comprobante para obra en progreso"
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="initialMaterialsAmount" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <CurrencyDollarIcon className="h-4 w-4 mr-2 text-gray-500" />
                      Monto del Gasto
                    </label>
                    <input
                      type="number"
                      id="initialMaterialsAmount"
                      value={initialMaterialsAmount}
                      onChange={(e) => setInitialMaterialsAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  {/* 🆕 Método de Pago - OBLIGATORIO */}
                  <div>
                    <label htmlFor="initialPaymentMethod" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <CurrencyDollarIcon className="h-4 w-4 mr-2 text-gray-500" />
                      Método de Pago <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      id="initialPaymentMethod"
                      value={initialPaymentMethod}
                      onChange={(e) => setInitialPaymentMethod(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    >
                      <option value="">Seleccionar método de pago...</option>
                      <optgroup label="🏦 Cuentas Bancarias">
                        {PAYMENT_METHODS_GROUPED.bank.map(method => (
                          <option key={method.value} value={method.value}>{method.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="💳 Tarjetas">
                        {PAYMENT_METHODS_GROUPED.card.map(method => (
                          <option key={method.value} value={method.value}>{method.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="💰 Otros Métodos">
                        {PAYMENT_METHODS_GROUPED.other.map(method => (
                          <option key={method.value} value={method.value}>{method.label}</option>
                        ))}
                      </optgroup>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Especifica con qué cuenta/método se pagó este gasto
                    </p>
                  </div>

                  <div>
                    <label htmlFor="initialReceiptFile" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <DocumentTextIcon className="h-4 w-4 mr-2 text-gray-500" />
                      Archivo del Comprobante
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        id="initialReceiptFile"
                        onChange={handleInitialReceiptFileChange}
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    {initialReceiptFile && (
                      <p className="text-xs text-green-600 mt-2 flex items-center">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Archivo seleccionado: {initialReceiptFile.name}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleUploadInitialReceipt}
                    disabled={!initialReceiptFile || !initialMaterialsAmount || !initialPaymentMethod || isUploadingReceipt}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:transform-none disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      {isUploadingReceipt ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Procesando...</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpTrayIcon className="h-5 w-5" />
                          <span>Registrar Gasto y Comprobante</span>
                        </>
                      )}
                    </div>
                  </button>

                  {isUploadingReceipt && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-700 text-center flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                        <span>Procesando, por favor espere...</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
           {/* Mensaje si la obra ya no está pendiente o asignada */}
           {work && !['pending', 'assigned', 'inProgress'].includes(work.status) && selectedAddress && (
             <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-l-green-500">
               <div className="flex items-center space-x-3 mb-4">
                 <div className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-lg">
                   <CheckCircleIcon className="h-5 w-5 text-white" />
                 </div>
                 <div>
                   <h3 className="text-lg font-semibold text-gray-800">Estado Completado</h3>
                   <p className="text-sm text-gray-600">Los materiales iniciales ya fueron procesados</p>
                 </div>
               </div>
               
               <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                 <p className="text-sm text-green-700">
                   La obra en <span className="font-semibold">{work.propertyAddress}</span> ya tiene el estado: 
                   <span className="font-bold ml-1 px-2 py-1 bg-green-100 rounded text-green-800">{work.status}</span>
                 </p>
                 <p className="text-xs text-green-600 mt-2">
                   Los materiales iniciales ya fueron procesados o la obra está en una etapa posterior.
                 </p>
               </div>
             </div>
           )}
          </div>
        </div>

        {/* Modal para carga de comprobante de materiales iniciales */}
        {showReceiptModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                    <ArrowUpTrayIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Materiales Iniciales</h3>
                    <p className="text-sm text-gray-600">Confirmar compra y cambiar estado</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="p-1 bg-blue-500 rounded-full">
                    <CheckCircleIcon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-800 font-medium">
                      Obra: <span className="font-semibold">{work?.propertyAddress}</span>
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {work?.status !== 'inProgress' 
                        ? "Al subir el comprobante, la obra cambiará a estado 'En Progreso'"
                        : "Registro de comprobante para obra en progreso"
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="modalInitialMaterialsAmount" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <CurrencyDollarIcon className="h-4 w-4 mr-2 text-gray-500" />
                    Monto del Gasto
                  </label>
                  <input
                    type="number"
                    id="modalInitialMaterialsAmount"
                    value={initialMaterialsAmount}
                    onChange={(e) => setInitialMaterialsAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                {/* 🆕 Método de Pago - OBLIGATORIO */}
                <div>
                  <label htmlFor="modalInitialPaymentMethod" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <CurrencyDollarIcon className="h-4 w-4 mr-2 text-gray-500" />
                    Método de Pago <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    id="modalInitialPaymentMethod"
                    value={initialPaymentMethod}
                    onChange={(e) => setInitialPaymentMethod(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  >
                    <option value="">Seleccionar método de pago...</option>
                    <optgroup label="🏦 Cuentas Bancarias">
                      {PAYMENT_METHODS_GROUPED.bank.map(method => (
                        <option key={method.value} value={method.value}>{method.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="💳 Tarjetas">
                      {PAYMENT_METHODS_GROUPED.card.map(method => (
                        <option key={method.value} value={method.value}>{method.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="💰 Otros Métodos">
                      {PAYMENT_METHODS_GROUPED.other.map(method => (
                        <option key={method.value} value={method.value}>{method.label}</option>
                      ))}
                    </optgroup>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Especifica con qué cuenta/método se pagó este gasto
                  </p>
                </div>

                <div>
                  <label htmlFor="modalInitialReceiptFile" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <DocumentTextIcon className="h-4 w-4 mr-2 text-gray-500" />
                    Archivo del Comprobante
                  </label>
                  <input
                    type="file"
                    id="modalInitialReceiptFile"
                    onChange={handleInitialReceiptFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {initialReceiptFile && (
                    <p className="text-xs text-green-600 mt-2 flex items-center">
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Archivo seleccionado: {initialReceiptFile.name}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-all duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleUploadInitialReceipt();
                      setShowReceiptModal(false);
                    }}
                    disabled={!initialReceiptFile || !initialMaterialsAmount || !initialPaymentMethod || isUploadingReceipt}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:transform-none disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      {isUploadingReceipt ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Procesando...</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpTrayIcon className="h-5 w-5" />
                          <span>Registrar</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>

                {isUploadingReceipt && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-700 text-center flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                      <span>Procesando, por favor espere...</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Materiales;