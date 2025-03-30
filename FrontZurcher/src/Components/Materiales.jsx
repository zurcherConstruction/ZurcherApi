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

  const addMaterial = () => {
    if (newMaterial.material && newMaterial.quantity) {
      setFormData({
        ...formData,
        materials: [...formData.materials, newMaterial],
      });
      setNewMaterial({ material: "", quantity: "", comment: "" });
    }
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
    <div className="p-4 bg-white shadow-md rounded-lg flex flex-col lg:flex-row gap-8">
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
              {works.map((work) => (
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
              onClick={addMaterial}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-2"
            >
              Añadir Material
            </button>
          </div>
        </form>

        <div className="mt-4">
          <h3 className="text-lg font-bold">Materiales seleccionados</h3>
          <table className="table-auto w-full mt-2">
            <thead>
              <tr>
                <th className="px-4 py-2">Material</th>
                <th className="px-4 py-2">Cantidad</th>
                <th className="px-4 py-2">Comentario</th>
              </tr>
            </thead>
            <tbody>
              {formData.materials.map((material, index) => (
                <tr key={index}>
                  <td className="border px-4 py-2">{material.material}</td>
                  <td className="border px-4 py-2">{material.quantity}</td>
                  <td className="border px-4 py-2">{material.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
            <iframe src={permitPdfUrl} width="100%" height="250px" title="Vista previa del PDF del Permit"></iframe>
          </div>
        )}
        {pdfUrl && (
          <div>
            <h3 className="text-lg font-bold">Vista previa del PDF de Materiales</h3>
            <iframe src={pdfUrl} width="100%" height="250px" title="Vista previa del PDF de Materiales"></iframe>
            <a href={pdfUrl} download="materiales.pdf" className="btn btn-primary">
              Descargar PDF
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default Materiales;