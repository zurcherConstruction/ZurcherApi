import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logoseptic.png'; // Import the logo

const Materiales = () => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    client: '',
    obraAddress: '',
    materials: [{ material: '', quantity: '', comment: '' }],
    comments: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleMaterialChange = (index, e) => {
    const { name, value } = e.target;
    const newMaterials = formData.materials.map((material, i) => (
      i === index ? { ...material, [name]: value } : material
    ));
    setFormData({
      ...formData,
      materials: newMaterials
    });
  };

  const addMaterial = () => {
    setFormData({
      ...formData,
      materials: [...formData.materials, { material: '', quantity: '', comment: '' }]
    });
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.addImage(logo, 'PNG', 10, 10, 30, 30); // Adjust logo size
    doc.setFontSize(12);
    doc.text(`Fecha: ${formData.date}`, 150, 15); // Add date
    doc.text(`Cliente: ${formData.client}`, 150, 25); // Add client
    doc.setFontSize(16);
    doc.text(`Materiales para ${formData.obraAddress}`, 10, 50); // Add title
    autoTable(doc, {
      startY: 60,
      head: [['Material', 'Cantidad', 'Comentario']],
      body: formData.materials.map(material => [
        material.material,
        material.quantity,
        material.comment
      ])
    });
    if (formData.comments) {
      doc.text('Comentarios adicionales:', 10, doc.lastAutoTable.finalY + 10);
      doc.text(formData.comments, 10, doc.lastAutoTable.finalY + 20);
    }
    doc.save('materiales.pdf');
  };

  return (
    <div className="container mx-auto p-4 md:p-8 lg:p-12">
      <h2 className="text-2xl font-semibold mb-4">Materiales</h2>
      <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className="block text-gray-700 text-sm font-bold mb-2">
            Fecha:
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <div>
          <label htmlFor="client" className="block text-gray-700 text-sm font-bold mb-2">
            Cliente:
          </label>
          <input
            type="text"
            id="client"
            name="client"
            value={formData.client}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Ingrese el nombre del cliente"
          />
        </div>
        <div>
          <label htmlFor="obraAddress" className="block text-gray-700 text-sm font-bold mb-2">
            Dirección de Obra:
          </label>
          <input
            type="text"
            id="obraAddress"
            name="obraAddress"
            value={formData.obraAddress}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Ingrese la dirección de obra"
          />
        </div>
        {formData.materials.map((material, index) => (
          <div key={index} className="flex gap-4">
            <div className="flex-1">
              <label htmlFor={`material-${index}`} className="block text-gray-700 text-sm font-bold mb-2">
                Material:
              </label>
              <select
                id={`material-${index}`}
                name="material"
                value={material.material}
                onChange={(e) => handleMaterialChange(index, e)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                <option value="">Seleccione un material</option>
                <option value="Tanque ATU 500 Infiltrator">Tanque ATU 500 Infiltrator</option>
                <option value="Kit alarma compresor">Kit alarma compresor</option>
                <option value="Clean Out">Clean Out</option>
                <option value="Cruz de 4">Cruz de 4</option>
                <option value="Codos de 90">Codos de 90</option>
                <option value="T de 4">T de 4</option>
                <option value="Chambers arc24">Chambers arc24</option>
                {/* Add more materials as needed */}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor={`quantity-${index}`} className="block text-gray-700 text-sm font-bold mb-2">
                Cantidad/Descripción:
              </label>
              <input
                type="text"
                id={`quantity-${index}`}
                name="quantity"
                value={material.quantity}
                onChange={(e) => handleMaterialChange(index, e)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Ingrese la cantidad o descripción"
              />
            </div>
            <div className="flex-1">
              <label htmlFor={`comment-${index}`} className="block text-gray-700 text-sm font-bold mb-2">
                Comentario:
              </label>
              <input
                type="text"
                id={`comment-${index}`}
                name="comment"
                value={material.comment}
                onChange={(e) => handleMaterialChange(index, e)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Ingrese un comentario"
              />
            </div>
          </div>
        ))}
        <div className="md:col-span-2">
          <button
            type="button"
            onClick={addMaterial}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full md:w-auto"
          >
            Añadir Material
          </button>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="comments" className="block text-gray-700 text-sm font-bold mb-2">
            Comentarios adicionales:
          </label>
          <textarea
            id="comments"
            name="comments"
            value={formData.comments}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Ingrese comentarios adicionales"
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="button"
            onClick={generatePDF}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full md:w-auto"
          >
            Generar PDF
          </button>
        </div>
      </form>
    </div>
  );
};

export default Materiales;
