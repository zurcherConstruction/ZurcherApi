import React, { useState, useEffect, useMemo } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorks, fetchWorkById } from "../Redux/Actions/workActions";
import logo from '../../public/logo.png'; // Asegúrate de que la ruta sea correcta
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
import { createMaterial } from "../Redux/Actions/materialActions";

const Materiales = () => {
  const dispatch = useDispatch();

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
  // Memorizar la URL del PDF del permiso
  const permitPdfUrl = useMemo(() => {
    if (selectedAddress && work?.Permit?.pdfData) {
      return URL.createObjectURL(new Blob([new Uint8Array(work.Permit.pdfData.data)], { type: "application/pdf" }));
    }
    return null;
  }, [selectedAddress, work]);

  const optionalDocs = useMemo(() => {
    if (selectedAddress && work?.Permit?.optionalDocs) {
      return URL.createObjectURL(new Blob([new Uint8Array(work.Permit.optionalDocs.data)], { type: "application/pdf" }));
    }
    return null;
  }, [selectedAddress, work]);

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
    const pdfUrl = URL.createObjectURL(pdfBlob);
    setPdfUrl(pdfUrl);

    await saveMaterials();
  };

  if (loading) {
    return <p>Cargando datos...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div className="p-4 bg-white shadow-md rounded-lg max-w-screen-lg mx-auto">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Columna izquierda: Formulario y tabla de materiales */}
        <div className="flex-1">
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
                  .filter((work) => work.status === "pending" || work.status === "assigned")
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
        </div>
  
        {/* Columna derecha: Vista previa del PDF del permiso y PDF generado */}
        <div className="flex-1">
          {permitPdfUrl && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Permit</h3>
              <div className="relative overflow-hidden">
                <iframe
                  src={permitPdfUrl}
                  className="w-full h-64 sm:h-72 md:h-80 lg:h-96"
                  title="Vista previa del PDF del Permit"
                ></iframe>
              </div>
            </div>
          )}
             {optionalDocs && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Permit Optional</h3>
              <div className="relative overflow-hidden">
                <iframe
                  src={optionalDocs}
                  className="w-full h-64 sm:h-72 md:h-80 lg:h-96"
                  title="Vista previa del PDF del Permit"
                ></iframe>
              </div>
            </div>
          )}
          {pdfUrl && (
            <div>
              <h3 className="text-lg font-bold">Vista previa del PDF de Materiales</h3>
              <div className="relative overflow-hidden">
                <iframe
                  src={pdfUrl}
                  className="w-full h-64 sm:h-72 md:h-80 lg:h-96"
                  title="Vista previa del PDF de Materiales"
                ></iframe>
              </div>
              <a
                href={pdfUrl}
                download="materiales.pdf"
                className="btn btn-primary mt-2 inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Descargar PDF
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );}
export default Materiales;