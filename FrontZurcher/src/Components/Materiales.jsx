import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logoseptic.png'; // Import the logo
import { useSelector,  useDispatch } from 'react-redux';
import { fetchWorks } from '../Redux/Actions/workActions'; // Asegúrate de tener esta acción

const Materiales = () => {
  const dispatch = useDispatch();
  const works = useSelector((state) => state.work.works); // Accede a las obras desde Redux
  const loading = useSelector((state) => state.work.loading);
  const error = useSelector((state) => state.work.error);
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    dispatch(fetchWorks()); // Cargar obras
  }, [dispatch]);

 

  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    client: '',
    obraAddress: '',
    materials: [],
    comments: ''
  });
  const [newMaterial, setNewMaterial] = useState({ material: '', quantity: '', comment: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
  
    // Si el campo modificado es "obraAddress", busca el cliente correspondiente
    if (name === 'obraAddress') {
      const selectedWork = works.find((work) => work.propertyAddress === value);
      setFormData({
        ...formData,
        [name]: value,
        client: selectedWork ? selectedWork.Permit?.applicantName || '' : '', // Llena el cliente si se encuentra
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

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
      setNewMaterial({ material: '', quantity: '', comment: '' }); // Limpiar el formulario de nuevo material
    }
  };


  const generatePDF = () => {
    const doc = new jsPDF();
    doc.addImage(logo, 'PNG', 10, 10, 30, 30); // Adjust logo size
    doc.setFontSize(12);
    doc.text(`Fecha: ${formData.date}`, 150, 15); // Add date
    doc.text(`Cliente: ${formData.client}`, 150, 25); // Add client
    doc.setFontSize(16);
    doc.text(`Materiales para:`, 10, 50); // Título
  doc.text(`${formData.obraAddress}`, 10, 60); // 
    autoTable(doc, {
      startY: 80,
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
  
    // Generar el PDF como Blob y crear una URL para la vista previa
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    setPdfUrl(pdfUrl);
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
          {loading && <p>Cargando permisos...</p>}
          {error && <p>Error: {error}</p>}
          <select
            id="obraAddress"
            name="obraAddress"
            value={formData.obraAddress}
            onChange={handleChange}
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
        <div className="md:col-span-2">
          <label htmlFor="material" className="block text-gray-700 text-sm font-bold mb-2">
            Material:
          </label>
          <select
            id="material"
            name="material"
            value={newMaterial.material}
            onChange={handleNewMaterialChange}
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
            <option value="Otro">Otro (Especificar manualmente)</option>
          </select>
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
        <div className="md:col-span-2">
          <h3 className="text-lg font-bold mt-4">Materiales seleccionados</h3>
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

      {pdfUrl && (
        <div>
         
          <iframe src={pdfUrl} width="100%" height="500px" title="Vista previa del PDF"></iframe>
          <a href={pdfUrl} download="materiales.pdf" className="btn btn-primary">
            Descargar PDF
          </a>
        </div>
      )}
    </div>
  );
};


export default Materiales;
