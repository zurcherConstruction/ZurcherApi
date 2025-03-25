// import { useLocation, useNavigate } from 'react-router-dom';
// import { Viewer, Worker } from '@react-pdf-viewer/core';
// import { useState } from 'react';
// import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
// import '@react-pdf-viewer/core/lib/styles/index.css';
// import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// const PdfViewerPage = () => {
//   const location = useLocation();
//   const navigate = useNavigate();
//   const { pdfPreview, formData: initialFormData } = location.state || {};
//   const [formData, setFormData] = useState(initialFormData || {});
//   const defaultLayoutPluginInstance = defaultLayoutPlugin();

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prevFormData) => ({
//       ...prevFormData,
//       [name]: value, // Actualiza el campo correspondiente
//     }));
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();

//     // Validar si applicantName está vacío
//     if (!formData.applicantName) {
//       alert('El campo Applicant Name es obligatorio.');
//       return;
//     }

//     // Crear el presupuesto
//     const currentDate = new Date();
//     const expirationDate = new Date(currentDate);
//     expirationDate.setDate(currentDate.getDate() + 30);

//     const price = formData.systemType?.includes('ATU') ? 15300 : 8900;
//     const initialPayment = price * 0.6;

//     const budgetData = {
//       date: currentDate.toISOString().split('T')[0], // Fecha actual
//       expirationDate: expirationDate.toISOString().split('T')[0], // Fecha de expiración
//       price, // Precio calculado
//       initialPayment, // Pago inicial calculado
//       status: 'created', // Estado inicial
//       propertyAddress: formData.propertyAddress, // Dirección de la propiedad
//       applicantName: formData.applicantName, // Nombre del solicitante
//     };

//     console.log('Datos enviados para crear el presupuesto:', budgetData);

//     // Aquí puedes despachar la acción para crear el presupuesto
//     // dispatch(createBudget(budgetData));

//     alert('Presupuesto creado correctamente');
//     navigate(-1); // Regresar a la página anterior
//   };

//   return (
//     <div className="container mx-auto p-4">
//       <h1 className="text-2xl font-bold mb-4">Revisar y Editar PDF</h1>

//       <div className="mb-4">
//         <h2 className="text-xl font-bold mb-2">Vista previa del PDF</h2>
//         <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js`}>
//           <Viewer fileUrl={pdfPreview} plugins={[defaultLayoutPluginInstance]} />
//         </Worker>
//       </div>

//       <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         {/* Renderizar los campos del formulario */}
//         {Object.keys(formData).map((key) => (
//           <div key={key}>
//             <label className="block text-sm font-medium capitalize text-gray-700">
//               {key.replace(/([A-Z])/g, ' $1').trim()} {/* Formatear el nombre del campo */}
//             </label>
//             <input
//               type="text"
//               name={key}
//               value={formData[key] || ''}
//               onChange={handleInputChange}
//               className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
//             />
//           </div>
//         ))}

//         {/* Botón de envío */}
//         <button
//           type="submit"
//           className="col-span-1 md:grid-cols-2 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
//         >
//           Guardar
//         </button>
//       </form>
//     </div>
//   );
// };

// export default PdfViewerPage;