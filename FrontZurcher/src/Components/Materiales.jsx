import React, { useState, useEffect, useMemo } from "react";
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

const Materiales = () => {
  const dispatch = useDispatch();
  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  // Obtener todas las obras desde Redux
  const { works, selectedWork: work, loading, error } = useSelector((state) => state.work);

  const [selectedAddress, setSelectedAddress] = useState(""); // Dirección seleccionada
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
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

   // Nuevo estado para el archivo del comprobante de materiales iniciales
   const [initialReceiptFile, setInitialReceiptFile] = useState(null);
   // Nuevo estado para controlar si se está subiendo el comprobante
   const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
   // Nuevo estado para el monto del gasto de materiales iniciales
   const [initialMaterialsAmount, setInitialMaterialsAmount] = useState(""); 
   
   // Obtener staffId del estado de autenticación (asumiendo que está disponible así)
   const staff = useSelector((state) => state.auth.currentStaff);

  const predefinedMaterials = [
    {
      material: "Tanque Atu",
      options: ["1060 Galones", "900 Galones", "700 Galones", "500 Galones"], // Subopciones para "Tanque"
    },
    {
      material: "Tanque Regular",
      options: ["1060 Galones", "900 Galones", "700 Galones", "500 Galones"], // Subopciones para "Tanque"
    },
    {
      material: "Chambers",
      options: ["arc24", "LP", "Drip", "Bundles"], // Subopciones para "Tanque"
    },
    {
      material: "Kit Atu",
       
    },
    {
      material: "End Cap",
      options: ["arc24", "LP", "Bundles"], 
    },
    {
      material: "Racer",
      options: ["12'", "6'"], 
    },
    {
      material: "Clean Out",
    },
    {
      material: "Cruz de 4",
    },
    {
      material: "Reducción de 4' a 3' ",
    },
    
    {
      material: "Caños",
      options: ["Verdes", "3/4 x 10'"], 
    },
    {
      material: "Codos ",
      options: ["de 90* de 4", "de 90* de 3/4"],
    },
    {
      material: "T de 4'",
    },
    {
      material: "Filtro",
    }
    // Agrega más materiales según sea necesario
  ];
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
        date: new Date().toISOString().split("T")[0],
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

  // Cuando se selecciona una dirección
useEffect(() => {
  if (selectedAddress) {
    const selectedWork = works.find((work) => work.propertyAddress === selectedAddress);
    if (selectedWork) {
      dispatch(fetchWorkById(selectedWork.idWork)); // Cargar detalles del trabajo
      setFormData({
        ...formData,
        date: selectedWork.startDate || new Date().toISOString().split("T")[0], // Usar startDate si está disponible
      });
    }
  }
}, [selectedAddress, works, dispatch]);
console.log("selectedAddress:", selectedAddress, "work:", work);
  // Memorizar la URL del PDF del permiso


  const permitPdfUrl = useMemo(() => {
    if (selectedAddress && work?.Permit?.pdfData?.data) { // Verificación más robusta
      try {
        return URL.createObjectURL(new Blob([new Uint8Array(work.Permit.pdfData.data)], { type: "application/pdf" }));
      } catch (e) {
        console.error("Error creando URL para permitPdfUrl:", e);
        return null;
      }
    }
    return null;
  }, [selectedAddress, work?.Permit?.pdfData]);

  const optionalDocsUrl = useMemo(() => { // Renombrado para claridad
    if (selectedAddress && work?.Permit?.optionalDocs?.data) { // Verificación más robusta
      try {
        return URL.createObjectURL(new Blob([new Uint8Array(work.Permit.optionalDocs.data)], { type: "application/pdf" }));
      } catch (e) {
        console.error("Error creando URL para optionalDocsUrl:", e);
        return null;
      }
    }
    return null;
  }, [selectedAddress, work?.Permit?.optionalDocs]);

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
    doc.text(`Fecha: ${formData.date}`, 150, 15);
    doc.text(`Cliente: ${work?.Permit?.applicantName || "No disponible"}`, 150, 25);
    doc.setFontSize(16);
    doc.text(`Materiales para:`, 10, 50);
    doc.text(`${work?.propertyAddress || "No disponible"}`, 10, 60);
    autoTable(doc, {
      startY: 80,
      head: [["Material","Opción", "Cantidad", "Comentario"]],
      body: formData.materials.map((material) => [
        material.material,
        material.option || "N/A",
        material.quantity,
        material.comment,
      ]),
    });
    if (formData.comments) {
      doc.text("Comentarios adicionales:", 10, doc.lastAutoTable.finalY + 10);
      doc.text(formData.comments, 10, doc.lastAutoTable.finalY + 20);
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
        date: new Date().toISOString().split("T")[0],
        amount: parseFloat(initialMaterialsAmount),
        notes: `Gasto de materiales iniciales para ${work.propertyAddress}`, // Nota automática
        workId: work.idWork,
        staffId: staff?.id, // Asegúrate de que 'staff' y 'staff.id' estén disponibles
        typeExpense: "Materiales Iniciales", // Tipo de gasto específico
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
      receiptFormData.append('date', new Date().toISOString().split("T")[0]);
      // receiptFormData.append('notes', `Comprobante de materiales iniciales para ${work.propertyAddress}`); // Opcional

      console.log('Datos a enviar para crear Comprobante (Receipt):', Object.fromEntries(receiptFormData));
      await dispatch(createReceipt(receiptFormData));
      toast.success('Comprobante de materiales iniciales subido y asociado al gasto.');
      console.log('Comprobante de materiales iniciales subido.');

       // --- Paso 3: Actualizar el estado SOLO si no está ya en inProgress ---
    if (work.status !== 'inProgress') {
      const workUpdateData = {
        status: 'inProgress',
        startDate: work.startDate || new Date().toISOString(), 
      };
      await dispatch(updateWork(work.idWork, workUpdateData));
      toast.success(`Estado de la obra para "${work.propertyAddress}" actualizado a "En Progreso".`);
    } else {
      toast.info('La obra ya estaba en progreso. Comprobante registrado exitosamente.');
    }


      // --- Limpieza del formulario ---
      setInitialReceiptFile(null);
      setInitialMaterialsAmount("");
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
    <div className="p-4 bg-white shadow-md rounded-lg max-w-screen-2xl mx-auto"> {/* o el max-w que prefieras */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Columna izquierda: Formulario y tabla de materiales */}
        <div className="lg:w-2/5 xl:w-1/3">
          <h2 className="text-xl font-bold mb-4">Formulario de Materiales</h2>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="address" className="block text-gray-700 text-sm font-bold mb-2">
                Dirección:
              </label>
              <select
                id="address"
                name="address"
                value={selectedAddress}
                onChange={(e) => setSelectedAddress(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
            <div>
  <label htmlFor="date" className="block text-gray-700 text-sm font-bold mb-2">
    Fecha:
  </label>
  <input
    type="date"
    id="date"
    name="date"
    value={formData.date}
    readOnly // Deshabilitar edición
    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200 cursor-not-allowed"
  />
</div>

<div className="flex-1 p-4 border-2 border-gray-300 rounded-lg shadow-md">
  {/* Material predefinido */}
  <div className="flex-1">
  <label htmlFor="material" className="block text-gray-700 text-sm font-bold mb-2">
      Material:
    </label>
    <select
      id="predefinedMaterial"
      name="predefinedMaterial"
      value={newPredefinedMaterial.material}
      onChange={(e) => {
        const selectedMaterial = predefinedMaterials.find(
          (material) => material.material === e.target.value
        );
        setNewPredefinedMaterial({
          ...newPredefinedMaterial,
          material: selectedMaterial ? selectedMaterial.material : "",
          selectedOption: "",
        });
      }}
      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
    >
      <option value="">Seleccione un material</option>
      {predefinedMaterials.map((material) => (
        <option key={material.material} value={material.material}>
          {material.material}
        </option>
      ))}
    </select>
  </div>

  {/* Subopción */}
  {newPredefinedMaterial.material &&
      predefinedMaterials.find((m) => m.material === newPredefinedMaterial.material)?.options && (
        <div className="flex-1">
          <label htmlFor="subOption" className="block text-gray-700 text-sm font-bold mb-1">
            Subopción:
          </label>
          <select
            id="subOption"
            name="subOption"
            value={newPredefinedMaterial.selectedOption}
            onChange={(e) =>
              setNewPredefinedMaterial({ ...newPredefinedMaterial, selectedOption: e.target.value })
            }
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="">Seleccione una subopción</option>
            {predefinedMaterials
              .find((m) => m.material === newPredefinedMaterial.material)
              ?.options.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
          </select>
        </div>
      )}


  {/* Cantidad */}
  <div className="flex-1">
      <label htmlFor="quantity" className="block text-gray-700 text-sm font-bold mb-1">
        Cantidad:
      </label>
      <input
        type="number"
        id="quantity"
        name="quantity"
        value={newPredefinedMaterial.quantity}
        onChange={(e) =>
          setNewPredefinedMaterial({ ...newPredefinedMaterial, quantity: e.target.value })
        }
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      />
    </div>
    <button
    type="button"
    onClick={editingIndex !== null ? addOrUpdateMaterial : addPredefinedMaterial}
    className="bg-blue-950 w-full hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
  >
    {editingIndex !== null ? "Actualizar" : "Añadir"}
  </button>

</div>


<div className="flex-1 p-4 border-2 border-gray-300 rounded-lg shadow-md">
              <label htmlFor="material" className="block text-gray-700 text-sm font-bold mb-2">
                Escribir Manual:
              </label>
              <input
        type="text"
        id="manualMaterial"
        name="material"
        placeholder="Material"
        value={newManualMaterial.material}
        onChange={(e) =>
          setNewManualMaterial({ ...newManualMaterial, material: e.target.value })
        }
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      />
      <label htmlFor="quantity" className="block text-gray-700 text-sm font-bold mb-1">
        Cantidad:
      </label>
               <input
        type="number"
        id="manualQuantity"
        name="quantity"
        placeholder="Cantidad"
        value={newManualMaterial.quantity}
        onChange={(e) =>
          setNewManualMaterial({ ...newManualMaterial, quantity: e.target.value })
        }
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      />
      <label htmlFor="quantity" className="block text-gray-700 text-sm font-bold mb-1">
        Detalle:
      </label>
              <input
        type="text"
        id="manualComment"
        name="comment"
        placeholder="Comentario"
        value={newManualMaterial.comment}
        onChange={(e) =>
          setNewManualMaterial({ ...newManualMaterial, comment: e.target.value })
        }
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      />
              <button
    type="button"
    onClick={editingIndex !== null ? addOrUpdateMaterial : addManualMaterial}
    className="bg-blue-950 w-full hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
  >
    {editingIndex !== null ? "Actualizar" : "Añadir"}
  </button>
            </div>
          </form>
  
          {/* Tabla para pantallas grandes */}
          <div className="flex-1 p-4 border-2 mt-2 border-gray-300 rounded-lg shadow-md">
        
            <div className="overflow-x-auto">
              <table className="table-auto w-full mt-2">
              <thead>
  <tr>
    <th className="px-4 py-2 font-Montserrat text-sm">Material</th>
    <th className="px-4 py-2 font-Montserrat text-sm">Subopción</th>
    <th className="px-4 py-2 font-Montserrat text-sm">Cantidad</th>
    <th className="px-4 py-2 font-Montserrat text-sm">Comentario</th>
    <th className="px-4 py-2 font-Montserrat text-sm">Acciones</th>
  </tr>
</thead>
<tbody>
  {formData.materials.map((material, index) => (
    <tr key={index}>
      <td className="border px-4 py-2 font-Montserrat text-sm">{material.material}</td>
      <td className="border px-4 py-2 font-Montserrat text-sm">{material.option}</td>
      <td className="border px-4 py-2 font-Montserrat text-sm">{material.quantity}</td>
      <td className="border px-4 py-2 font-Montserrat text-sm">{material.comment}</td>
      <td className="border px-4 py-2 font-Montserrat text-sm">
      <div className="flex items-center gap-2"> {/* Flexbox para alinear los botones */}
          <button
            onClick={() => editMaterial(index)}
            className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded"
          >
            <FontAwesomeIcon icon={faEdit} /> {/* Ícono de editar */}
          </button>
          <button
            onClick={() => deleteMaterial(index)}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
          >
            <FontAwesomeIcon icon={faTrash} /> {/* Ícono de eliminar */}
          </button>
        </div>
      </td>
    </tr>
  ))}
</tbody>
              </table>
            </div>
          </div>
  
         
          <button
            type="button"
            onClick={generatePDF}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
          >
            Generar PDF de Materiales
          </button>

          
{work && ['pending', 'assigned', 'inProgress'].includes(work.status) && selectedAddress && (
  <div className="mt-6 p-4 border-2 border-dashed border-blue-500 rounded-lg shadow-md">
    <h3 className="text-lg font-semibold mb-3 text-blue-700">Confirmar Compra de Materiales Iniciales</h3>
    <p className="text-sm text-gray-600 mb-3">
      Sube el comprobante y registra el gasto de los materiales iniciales para la obra en <span className="font-semibold">{work.propertyAddress}</span>.
      {work.status !== 'inProgress' && " Esto cambiará el estado de la obra a 'En Progreso'."}
    </p>
              {/* Campo para el Monto */}
              <div className="mb-3">
                <label htmlFor="initialMaterialsAmount" className="block text-gray-700 text-sm font-bold mb-1">
                  Monto del Gasto de Materiales Iniciales:
                </label>
                <input
                  type="number"
                  id="initialMaterialsAmount"
                  value={initialMaterialsAmount}
                  onChange={(e) => setInitialMaterialsAmount(e.target.value)}
                  placeholder="Ingrese el monto total"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-3">
                <label htmlFor="initialReceiptFile" className="block text-gray-700 text-sm font-bold mb-1">
                  Archivo del Comprobante:
                </label>
                <input
                  type="file"
                  id="initialReceiptFile" // ID para poder resetearlo
                  onChange={handleInitialReceiptFileChange} // Nuevo manejador
                  accept=".pdf,.jpg,.jpeg,.png" // Tipos de archivo aceptados
                  className="block w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 cursor-pointer focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleUploadInitialReceipt} // Nuevo manejador
                disabled={!initialReceiptFile || !initialMaterialsAmount || isUploadingReceipt} // Se deshabilita si no hay archivo, monto o si está cargando
                className="bg-blue-600 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full disabled:opacity-50 flex items-center justify-center"
              >
                <FontAwesomeIcon icon={faUpload} className="mr-2"/>
                {isUploadingReceipt ? "Procesando..." : "Registrar Gasto, Subir Comprobante y Marcar 'En Progreso'"}
              </button>
              {isUploadingReceipt && <p className="text-sm text-blue-600 text-center mt-2">Procesando, por favor espere...</p>}
            </div>
          )}
           {/* Mensaje si la obra ya no está pendiente o asignada */}
           {work && !['pending', 'assigned', 'inProgress'].includes(work.status) && selectedAddress && (
  <div className="mt-6 p-4 border-2 border-green-500 bg-green-50 rounded-lg shadow-md">
    <p className="text-sm text-green-700">
      La obra en <span className="font-semibold">{work.propertyAddress}</span> ya tiene el estado: <span className="font-bold">{work.status}</span>.
      Los materiales iniciales ya fueron procesados o la obra está en una etapa posterior.
    </p>
  </div>
           )}
        </div>
      
  
        {/* Columna derecha: Vista previa del PDF del permiso y PDF generado */}
        <div className="flex-1">
          {(permitPdfUrl || optionalDocsUrl || pdfUrl) && ( // Condición para mostrar la sección de PDFs
            <div className="mb-4">
             
              <div className="flex justify-center space-x-2 sm:space-x-4 mb-4">
                {permitPdfUrl && (
                  <button
                    onClick={() => setCurrentPdfView('permit')}
                    className={`py-1 px-2 sm:px-3 rounded-md text-xs sm:text-sm ${currentPdfView === 'permit' ? "bg-blue-950 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Permiso Principal
                  </button>
                )}
                {optionalDocsUrl && (
                  <button
                    onClick={() => setCurrentPdfView('optional')}
                    className={`py-1 px-2 sm:px-3 rounded-md text-xs sm:text-sm ${currentPdfView === 'optional' ? "bg-blue-950 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Doc. Opcional
                  </button>
                )}
                {pdfUrl && ( // Botón para el PDF de materiales
                  <button
                    onClick={() => setCurrentPdfView('materials')}
                    className={`py-1 px-2 sm:px-3 rounded-md text-xs sm:text-sm ${currentPdfView === 'materials' ? "bg-green-700 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    PDF Materiales
                  </button>
                )}
              </div>


            
              <div className="relative overflow-hidden border border-gray-300 rounded-md">
                {currentPdfView === 'permit' && permitPdfUrl ? (
                  <div className="h-auto w-full md:h-[600px] lg:h-[700px]"> 
                    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                      <Viewer
                        fileUrl={permitPdfUrl}
                        plugins={[defaultLayoutPluginInstance]}
                      />
                    </Worker>
                  </div>
                ) : currentPdfView === 'optional' && optionalDocsUrl ? (
                  <div className="h-auto w-full md:h-[600px] lg:h-[700px]">
                    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                      <Viewer
                        fileUrl={optionalDocsUrl}
                        plugins={[defaultLayoutPluginInstance]}
                      />
                    </Worker>
                  </div>
                ) : currentPdfView === 'materials' && pdfUrl ? ( // Vista para el PDF de materiales
                  <div className="h-auto w-full md:h-[600px] lg:h-[700px]">
                     {/* Puedes usar Viewer también si prefieres, o mantener el iframe */}
                    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                      <Viewer
                        fileUrl={pdfUrl} // URL del PDF de materiales
                        plugins={[defaultLayoutPluginInstance]}
                      />
                    </Worker>
                    {/* O si prefieres iframe para este en particular:
                    <iframe
                      src={pdfUrl}
                      className="w-full h-full" // Asegúrate que el iframe llene el div
                      title="Vista previa del PDF de Materiales"
                    ></iframe>
                    */}
                  </div>
                ) : (
                  <div className="h-auto w-full md:h-[600px] lg:h-[700px] flex items-center justify-center">
                    <p className="text-gray-500 p-4 text-center">
                      {currentPdfView === 'permit' ? "PDF Principal no disponible o no seleccionado." :
                       currentPdfView === 'optional' ? "Documento Opcional no disponible o no seleccionado." :
                       "PDF de Materiales no disponible o no generado."}
                    </p>
                  </div>
                )}
              </div>
              {/* Botón de descarga solo para el PDF de materiales si está visible */}
              {currentPdfView === 'materials' && pdfUrl && (
                <div className="mt-4 text-center">
                    <a
                    href={pdfUrl}
                    download={`materiales_${work?.propertyAddress?.replace(/\s+/g, '_') || 'obra'}.pdf`}
                    className="btn btn-primary inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                    Descargar PDF de Materiales
                    </a>
                </div>
              )}
            </div>
          )}
          {/* La sección original para el PDF de materiales se elimina de aquí si la integras arriba */}
          {/* 
          {pdfUrl && (
            <div className="mt-6"> ... </div> // ESTA SECCIÓN SE ELIMINARÍA
          )} 
          */}
        </div>
      </div>
    </div>
  );
}
export default Materiales;