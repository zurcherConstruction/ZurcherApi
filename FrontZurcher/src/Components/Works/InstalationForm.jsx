// import React, { useState, useEffect, useMemo } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { addInstallationDetail, fetchWorks, fetchWorkById } from "../../Redux/Actions/workActions";
// import { openCloudinaryWidget } from "../../cloudinaryConfig";

// const InstallationForm = () => {
//   const dispatch = useDispatch();
//   const { works, selectedWork: work, loading, error } = useSelector((state) => state.work);

//   const [selectedWork, setSelectedWork] = useState(null); // Almacena el objeto completo del trabajo seleccionado
//   const [formData, setFormData] = useState({
//     date: "",
//     extraDetails: "",
//     excavacion: "",
//     extraMaterials: "",
//     images: [],
//   });
//   const [formError, setFormError] = useState("");

//   useEffect(() => {
//     dispatch(fetchWorks());
//   }, [dispatch]);

//   useEffect(() => {
//     if (selectedWork) {
//       setFormData((prev) => ({
//         ...prev,
//         date: selectedWork.startDate || new Date().toISOString().split("T")[0], // Usar startDate si está disponible
//       }));
//     }
//   }, [selectedWork]);

//   // Memorizar la URL del PDF del permiso
//   const permitPdfUrl = useMemo(() => {
//     if (selectedWork?.Permit?.pdfData) {
//       return URL.createObjectURL(
//         new Blob([new Uint8Array(selectedWork.Permit.pdfData.data)], { type: "application/pdf" })
//       );
//     }
//     return null;
//   }, [selectedWork]);
  

//   const handleSelectWork = (work) => {
//     setSelectedWork(work); // Almacena el objeto completo del trabajo seleccionado
//   };
//   const handleWidget = () => {
//     openCloudinaryWidget((uploadedImageUrl) => {
//       setFormData((prev) => ({
//         ...prev,
//         images: [...prev.images, uploadedImageUrl],
//       }));
//     });
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData({ ...formData, [name]: value });
//   };

//   const validateForm = () => {
//     if (!formData.date) {
//       setFormError("La fecha es obligatoria.");
//       return false;
//     }
//     if (!formData.extraDetails && !formData.extraMaterials) {
//       setFormError("Debes proporcionar detalles o materiales extras.");
//       return false;
//     }
//     setFormError("");
//     return true;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;

//     try {
//       await dispatch(addInstallationDetail(selectedWork.idWork, formData));
//       alert("Detalle de instalación agregado correctamente.");
//       setSelectedWork(null);
//       setFormData({
//         date: "",
//         extraDetails: "",
//         excavacion: "",
//         extraMaterials: "",
//         images: [],
//       });
//     } catch (error) {
//       alert("Error al agregar el detalle de instalación.");
//     }
//   };
//   const filteredWorks = works.filter((work) => work.status === "inProgress");
//   return (
//     <div className="p-4 bg-white shadow-md rounded-lg">
//       <h2 className="text-xl font-bold mb-4">Seleccionar Obra</h2>
  
//       {loading && <p>Cargando obras...</p>}
//       {error && <p className="text-red-500">Error al cargar las obras: {error}</p>}
//       {!loading && filteredWorks.length === 0 && <p>No hay obras con estado "inProgress".</p>}
  
//       {!selectedWork && (
//         <ul className="space-y-2">
//           {filteredWorks.map((work) => (
//             <li
//               key={work.idWork}
//               className="border p-2 rounded cursor-pointer hover:bg-gray-100"
//               onClick={() => handleSelectWork(work)}
//             >
//               <p><strong>Dirección:</strong> {work.propertyAddress}</p>
//               <p><strong>Estado:</strong> {work.status}</p>
//             </li>
//           ))}
//         </ul>
//       )}

//       {selectedWork && (
//         <div className="flex flex-col lg:flex-row gap-4">
//           {/* Columna izquierda: Formulario */}
//           <div className="flex-1">
//             <form onSubmit={handleSubmit} className="space-y-4">
//               <h3 className="text-lg font-bold">Agregar Detalle de Instalación</h3>
//               {formError && <p className="text-red-500">{formError}</p>}
//               <div>
//                 <label className="block font-bold">Fecha:</label>
//                 <input
//           type="date"
//           name="date"
//           value={formData.date}
//           readOnly // Deshabilitar edición
//           className="border rounded p-2 w-full bg-gray-200 cursor-not-allowed"
//         />
//               </div>
             
//               <div>
//                 <label className="block font-bold">Materiales Extras:</label>
//                 <textarea
//                   name="extraMaterials"
//                   value={formData.extraMaterials}
//                   onChange={handleInputChange}
//                   className="border rounded p-2 w-full"
//                 />
//               </div>
//               <div>
//                 <label className="block font-bold">Excavación:</label>
//                 <textarea
//                   name="excavacion"
//                   value={formData.excavacion}
//                   onChange={handleInputChange}
//                   className="border rounded p-2 w-full"
//                 />
//               </div>
//               <div>
//             <label className="block font-bold">Detalles Extras:</label>
//             <textarea
//               name="extraDetails"
//               value={formData.extraDetails}
//               onChange={handleInputChange}
//               className="border rounded p-2 w-full"
//             />
//           </div>
//               <div>
//                 <label className="block font-bold">Imágenes:</label>
//                 <button
//                   type="button"
//                   onClick={handleWidget}
//                   className="bg-blue-500 text-white px-4 py-2 rounded"
//                 >
//                   Subir Imágenes
//                 </button>
//                 <div className="mt-2 grid grid-cols-3 gap-2">
//                   {formData.images.map((img, index) => (
//                     <div key={index} className="relative group">
//                       <img
//                         src={img}
//                         alt={`Imagen ${index + 1}`}
//                         className="w-full h-24 object-cover rounded-md"
//                       />
//                       <button
//                         type="button"
//                         onClick={() => {
//                           const newImages = formData.images.filter((_, i) => i !== index);
//                           setFormData((prev) => ({
//                             ...prev,
//                             images: newImages,
//                           }));
//                         }}
//                         className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
//                       >
//                         <svg
//                           xmlns="http://www.w3.org/2000/svg"
//                           className="h-4 w-4"
//                           viewBox="0 0 20 20"
//                           fill="currentColor"
//                         >
//                           <path
//                             fillRule="evenodd"
//                             d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
//                             clipRule="evenodd"
//                           />
//                         </svg>
//                       </button>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//               <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
//                 Agregar Detalle
//               </button>
//             </form>
//           </div>
  
//           {/* Columna derecha: Vista previa del Permit */}
//           <div className="flex-1">
//             {permitPdfUrl ? (
//               <div className="mb-4">
//                 <h3 className="text-lg font-bold">Vista previa del Permit</h3>
//                 <div className="relative overflow-hidden">
//                   <iframe
//                     src={permitPdfUrl}
//                     className="w-full h-64 sm:h-72 md:h-80 lg:h-96"
//                     title="Vista previa del PDF del Permit"
//                   ></iframe>
//                 </div>
//               </div>
//             ) : (
//               <p className="text-gray-500">No hay un Permit disponible para esta obra.</p>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default InstallationForm;