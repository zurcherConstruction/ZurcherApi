import React, { useState, useEffect, useMemo } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorks, fetchWorkById } from "../Redux/Actions/workActions";
import logo from '../assets/logoseptic.png';
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
  const [newMaterial, setNewMaterial] = useState({ material: "", quantity: "", comment: "" });
  const [editingIndex, setEditingIndex] = useState(null); // Índice del material que se está editando
  const [pdfUrl, setPdfUrl] = useState(null);

  // Cargar todas las obras al montar el componente
  useEffect(() => {
    dispatch(fetchWorks());
  }, [dispatch]);

  // Cargar los detalles de la obra seleccionada
  useEffect(() => {
    if (selectedAddress) {
      const selectedWork = works.find((work) => work.propertyAddress === selectedAddress);
      if (selectedWork) {
        dispatch(fetchWorkById(selectedWork.idWork));
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

  const handleNewMaterialChange = (e) => {
    const { name, value } = e.target;
    setNewMaterial({
      ...newMaterial,
      [name]: value,
    });
  };

  const addOrUpdateMaterial = () => {
    if (newMaterial.material && newMaterial.quantity) {
      if (editingIndex !== null) {
        // Actualizar material existente
        const updatedMaterials = [...formData.materials];
        updatedMaterials[editingIndex] = newMaterial;
        setFormData({ ...formData, materials: updatedMaterials });
        setEditingIndex(null); // Salir del modo de edición
      } else {
        // Agregar nuevo material
        setFormData({
          ...formData,
          materials: [...formData.materials, newMaterial],
        });
      }
      setNewMaterial({ material: "", quantity: "", comment: "" });
    }
  };

  const editMaterial = (index) => {
    setNewMaterial(formData.materials[index]);
    setEditingIndex(index);
  };

  const deleteMaterial = (index) => {
    const updatedMaterials = formData.materials.filter((_, i) => i !== index);
    setFormData({ ...formData, materials: updatedMaterials });
  };

  const generatePDF = () => {
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
      head: [["Material", "Cantidad", "Comentario"]],
      body: formData.materials.map((material) => [
        material.material,
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
    .filter((work) => work.status === "pending") // Filtrar solo las obras con estado "pending"
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
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="material" className="block text-gray-700 text-sm font-bold mb-2">
                Material:
              </label>
              <input
                type="text"
                name="material"
                placeholder="Material"
                value={newMaterial.material}
                onChange={handleNewMaterialChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
              <input
                type="text"
                name="quantity"
                placeholder="Cantidad"
                value={newMaterial.quantity}
                onChange={handleNewMaterialChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mt-2"
              />
              <input
                type="text"
                name="comment"
                placeholder="Comentario"
                value={newMaterial.comment}
                onChange={handleNewMaterialChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mt-2"
              />
              <button
                type="button"
                onClick={addOrUpdateMaterial}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-2"
              >
                {editingIndex !== null ? "Actualizar Material" : "Añadir Material"}
              </button>
            </div>
          </form>
  
          <div className="mt-4">
            <h3 className="text-lg font-bold">Materiales seleccionados</h3>
            <div className="overflow-x-auto">
              <table className="table-auto w-full mt-2">
                <thead>
                  <tr>
                    <th className="px-4 py-2">Material</th>
                    <th className="px-4 py-2">Cantidad</th>
                    <th className="px-4 py-2">Comentario</th>
                    <th className="px-4 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.materials.map((material, index) => (
                    <tr key={index}>
                      <td className="border px-4 py-2">{material.material}</td>
                      <td className="border px-4 py-2">{material.quantity}</td>
                      <td className="border px-4 py-2">{material.comment}</td>
                      <td className="border px-4 py-2">
                        <button
                          onClick={() => editMaterial(index)}
                          className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded mr-2"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteMaterial(index)}
                          className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                        >
                          Eliminar
                        </button>
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
      <h3 className="text-lg font-bold">Vista previa del Permit</h3>
      <div className="relative overflow-hidden">
        <iframe
          src={permitPdfUrl}
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
  );
}
export default Materiales;