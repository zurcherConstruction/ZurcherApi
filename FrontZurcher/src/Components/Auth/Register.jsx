import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchStaff,
  createStaff,
  updateStaff,
  deactivateOrDeleteStaff,
} from "../../Redux/Actions/adminActions";
import { validateForm } from "../../utils/validation";

const Register = () => {
  const dispatch = useDispatch();

  
  const { staffList: staff, loading, error } = useSelector((state) => state.admin);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "admin",
    phone: "",
    name: "",
    address: "",
    isActive: true,
  });
  const [editingStaff, setEditingStaff] = useState(null); 
  const [idFrontImage, setIdFrontImage] = useState(null);
  const [idBackImage, setIdBackImage] = useState(null);
  // Estados para previsualizar las imágenes existentes al editar
  const [previewIdFrontUrl, setPreviewIdFrontUrl] = useState(null);
  const [previewIdBackUrl, setPreviewIdBackUrl] = useState(null);
  const [expandedStaffId, setExpandedStaffId] = useState(null); // Nuevo estado
  const [newPassword, setNewPassword] = useState(""); // Para editar contraseña
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  
  
  useEffect(() => {
    dispatch(fetchStaff());
  }, [dispatch]);

  // ...existing code...
  const handleToggleExpand = (staffId) => {
    setExpandedStaffId(expandedStaffId === staffId ? null : staffId);
  };
// ...existing code...
const handleInputChange = (e) => {
  const { name, value, type, checked } = e.target;
  if (name === "newPassword") {
    setNewPassword(value);
  } else {
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : (name === 'isActive' ? (value === "true") : value),
    });
  }
};

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      if (name === "idFrontImage") {
        setIdFrontImage(files[0]);
        setPreviewIdFrontUrl(URL.createObjectURL(files[0])); // Previsualización inmediata
      } else if (name === "idBackImage") {
        setIdBackImage(files[0]);
        setPreviewIdBackUrl(URL.createObjectURL(files[0])); // Previsualización inmediata
      }
    }
  };
 
  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateForm(formData, !!editingStaff, newPassword); // Pasar newPassword a la validación si es necesario
    if (Object.keys(errors).length > 0) {
      alert("Por favor corrige los siguientes errores:\n" + Object.values(errors).join("\n"));
      return;
    }

    const dataToSend = new FormData();
    for (const key in formData) {
      if (key === 'password' && editingStaff) continue; // No enviar la contraseña vacía del formData al editar
      dataToSend.append(key, formData[key]);
    }

    if (editingStaff && newPassword) {
      dataToSend.append('password', newPassword); // Añadir nueva contraseña si se está editando y se proporcionó
    } else if (!editingStaff && formData.password) {
      // Ya se añade desde el bucle for si es creación
    }


    if (idFrontImage) dataToSend.append('idFrontImage', idFrontImage);
    if (idBackImage) dataToSend.append('idBackImage', idBackImage);
  
    if (editingStaff) {
      dispatch(updateStaff(editingStaff.id, dataToSend));
      setEditingStaff(null);
    } else {
      dispatch(createStaff(dataToSend));
    }
  
    setFormData({
      email: "", password: "", role: "admin", phone: "",
      name: "", address: "", isActive: true,
    });
    setNewPassword("");
    setShowPassword(false);
    setShowNewPassword(false);
    setIdFrontImage(null);
    setIdBackImage(null);
    setPreviewIdFrontUrl(null);
    setPreviewIdBackUrl(null);
    if (document.getElementById('idFrontImage')) document.getElementById('idFrontImage').value = null;
    if (document.getElementById('idBackImage')) document.getElementById('idBackImage').value = null;
  };

  const handleEdit = (staffMember) => {
    setEditingStaff(staffMember);
    setFormData({
      email: staffMember.email,
      password: "", // No rellenar la contraseña antigua
      role: staffMember.role,
      phone: staffMember.phone || "",
      name: staffMember.name,
      address: staffMember.address || "",
      isActive: staffMember.isActive,
    });
    setNewPassword(""); // Limpiar campo de nueva contraseña
    setShowPassword(false);
    setShowNewPassword(false);
    setPreviewIdFrontUrl(staffMember.idFrontUrl || null);
    setPreviewIdBackUrl(staffMember.idBackUrl || null);
    setIdFrontImage(null); 
    setIdBackImage(null);
    window.scrollTo(0, 0);
  };
  
 
const handleDelete = (id) => {
  const confirmDelete = window.confirm(
    "¿Estás seguro de que deseas eliminar este miembro del staff?"
  );
  if (confirmDelete) {
    dispatch(deactivateOrDeleteStaff(id, "delete")); 
  }
};
 
  const handleDeactivate = (id) => {
    const confirmDeactivate = window.confirm(
      "¿Estás seguro de que deseas desactivar este miembro del staff?"
    );
    if (confirmDeactivate) {
      dispatch(deactivateOrDeleteStaff(id, "deactivate")); 
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="bg-white shadow-xl rounded-lg p-4 md:p-6 mb-8 max-w-3xl mx-auto">
        <h2 className="text-xl font-medium mb-6 bg-customBlue p-2 text-center text-gray-300">
          {editingStaff ? "Editar Staff" : "Registrar Nuevo Staff"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <input
                type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
                placeholder="Ej: Juan Pérez"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" name="email" id="email" value={formData.email} onChange={handleInputChange} required
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
                placeholder="ejemplo@correo.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel" name="phone" id="phone" value={formData.phone} onChange={handleInputChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
                placeholder="Ej: +54 9 11 12345678"
              />
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                type="text" name="address" id="address" value={formData.address} onChange={handleInputChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
                placeholder="Ej: Av. Siempre Viva 742"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                name="role" id="role" value={formData.role} onChange={handleInputChange} required
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
              >
                <option value="admin">Admin</option>
                <option value="worker">Worker</option>
                <option value="recept">Recept</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            {editingStaff && (
              <div>
                <label htmlFor="isActive" className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  name="isActive" id="isActive" value={formData.isActive.toString()} onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-customBlue focus:border-customBlue sm:text-sm p-2"
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            )}
          </div>

          {/* Campo de Contraseña para CREACIÓN */}
          {!editingStaff && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password" id="password" value={formData.password} onChange={handleInputChange} required
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 pr-10"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Campo de Nueva Contraseña para EDICIÓN */}
          {editingStaff && (
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña (opcional)</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword" id="newPassword" value={newPassword} onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 pr-10"
                  placeholder="Dejar en blanco para no cambiar"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                  title={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showNewPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
              </div>
            </div>
          )}
          
          {/* Sección de Imágenes ID */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-md font-medium text-gray-700 mb-2">Documentos de Identidad (Opcional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="idFrontImage" className="block text-sm font-medium text-gray-700 mb-1">
                  ID Frente (JPG, PNG, PDF):
                </label>
                <input
                  type="file" name="idFrontImage" id="idFrontImage" onChange={handleFileChange} accept=".jpg,.jpeg,.png,.pdf"
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-md"
                />
                {previewIdFrontUrl && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600">Previsualización ID Frente:</p>
                    <img src={previewIdFrontUrl} alt="ID Frente Preview" className="max-h-32 border rounded mt-1 cursor-pointer" onClick={() => window.open(previewIdFrontUrl, '_blank')} />
                    <a href={previewIdFrontUrl} download="id_frente" className="text-xs text-blue-600 hover:underline mt-1 inline-block">Descargar</a>
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="idBackImage" className="block text-sm font-medium text-gray-700 mb-1">
                  ID Dorso (JPG, PNG, PDF):
                </label>
                <input
                  type="file" name="idBackImage" id="idBackImage" onChange={handleFileChange} accept=".jpg,.jpeg,.png,.pdf"
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-md"
                />
                {previewIdBackUrl && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600">Previsualización ID Dorso:</p>
                    <img src={previewIdBackUrl} alt="ID Dorso Preview" className="max-h-32 border rounded mt-1 cursor-pointer" onClick={() => window.open(previewIdBackUrl, '_blank')} />
                    <a href={previewIdBackUrl} download="id_dorso" className="text-xs text-blue-600 hover:underline mt-1 inline-block">Descargar</a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="bg-customBlue text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {editingStaff ? "Guardar Cambios" : "Registrar Staff"}
            </button>
          </div>
        </form>
      </div>
  
      {/* Listado del staff */}
      <div>
        
        {loading && <p className="text-blue-500">Cargando staff...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        {!loading && !error && (
          <>
            {/* Tabla para pantallas grandes */}
            <div className="hidden lg:block">
              <table className="table-auto w-full border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
                    <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Rol</th>
                    <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                    <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {staff && staff.length > 0 ? (
                    staff.map((member) => (
                      <React.Fragment key={member.id}>
                        <tr className="hover:bg-gray-50 border-b border-gray-200">
                          <td className="px-4 py-3">{member.name}</td>
                          <td className="px-4 py-3">{member.email}</td>
                          <td className="px-4 py-3">{member.role}</td>
                          <td className="px-4 py-3">
                            {member.isActive ? (
                              <span className="text-green-600 font-semibold">Activo</span>
                            ) : (
                              <span className="text-red-600 font-semibold">Inactivo</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleExpand(member.id)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-3"
                              title="Ver detalles"
                            >
                              {expandedStaffId === member.id ? 'Ocultar' : 'Detalles'}
                              <span className="ml-1">{expandedStaffId === member.id ? '▲' : '▼'}</span>
                            </button>
                            <button
                              onClick={() => {
                                handleEdit(member);
                                window.scrollTo(0, 0);
                              }}
                              className="bg-yellow-500 text-white text-xs px-2 py-1 rounded hover:bg-yellow-600 mr-2"
                              title="Editar"
                            >
                              Editar
                            </button>
                            {/* Los botones de desactivar/eliminar se pueden mover al desplegable o mantener aquí */}
                          </td>
                        </tr>
                        {expandedStaffId === member.id && (
                          <tr className="bg-gray-50">
                            <td colSpan="5" className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm"><span className="font-semibold">Teléfono:</span> {member.phone || "N/A"}</p>
                                  <p className="text-sm"><span className="font-semibold">Dirección:</span> {member.address || "N/A"}</p>
                                </div>
                                <div>
                                  {(member.idFrontUrl || member.idBackUrl) && (
                                    <>
                                      <p className="text-sm font-semibold mb-1">Documentos ID:</p>
                                      <div className="flex space-x-3">
                                        {member.idFrontUrl && (
                                          <div>
                                            <p className="text-xs text-gray-500">Frente:</p>
                                            <a href={member.idFrontUrl} target="_blank" rel="noopener noreferrer">
                                              <img src={member.idFrontUrl} alt="ID Frente" className="max-h-20 border rounded hover:opacity-80" />
                                            </a>
                                          </div>
                                        )}
                                        {member.idBackUrl && (
                                          <div>
                                            <p className="text-xs text-gray-500">Dorso:</p>
                                            <a href={member.idBackUrl} target="_blank" rel="noopener noreferrer">
                                              <img src={member.idBackUrl} alt="ID Dorso" className="max-h-20 border rounded hover:opacity-80" />
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                                {/* Botones de acción adicionales si se movieron aquí */}
                                {member.isActive && (
                                  <button
                                    onClick={() => handleDeactivate(member.id)}
                                    className="bg-orange-500 text-white text-xs px-2 py-1 rounded hover:bg-orange-600"
                                  >
                                    Desactivar
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(member.id)}
                                  className="bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                    
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        No hay miembros del staff registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
  
            {/* Tarjetas para pantallas pequeñas */}
            <div className="block lg:hidden space-y-4">
              {staff && staff.length > 0 ? (
                staff.map((member) => (
                  <div
                    key={member.id}
                    className="border border-gray-300 rounded-lg shadow-md"
                  >
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-center"
                      onClick={() => handleToggleExpand(member.id)}
                    >
                      <div>
                        <p className="text-md font-semibold">{member.name}</p>
                        <p className="text-sm text-gray-600">{member.email} - {member.role}</p>
                      </div>
                      <span className="text-xl">
                        {expandedStaffId === member.id ? '▲' : '▼'}
                      </span>
                    </div>

                    {expandedStaffId === member.id && (
                      <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <p className="text-sm"><span className="font-semibold">Teléfono:</span> {member.phone || "N/A"}</p>
                        <p className="text-sm"><span className="font-semibold">Dirección:</span> {member.address || "N/A"}</p>
                        <p className="text-sm">
                          <span className="font-semibold">Estado: </span>
                          {member.isActive ? (
                            <span className="text-green-500 font-bold">Activo</span>
                          ) : (
                            <span className="text-red-500 font-bold">Inactivo</span>
                          )}
                        </p>
                        
                        {/* Mostrar Imágenes del ID */}
                        {(member.idFrontUrl || member.idBackUrl) && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm font-semibold mb-1">Documentos ID:</p>
                            <div className="flex space-x-4">
                              {member.idFrontUrl && (
                                <div>
                                  <p className="text-xs text-gray-600">Frente:</p>
                                  <a href={member.idFrontUrl} target="_blank" rel="noopener noreferrer">
                                    <img src={member.idFrontUrl} alt="ID Frente" className="max-h-24 border rounded hover:opacity-80" />
                                  </a>
                                </div>
                              )}
                              {member.idBackUrl && (
                                <div>
                                  <p className="text-xs text-gray-600">Dorso:</p>
                                  <a href={member.idBackUrl} target="_blank" rel="noopener noreferrer">
                                    <img src={member.idBackUrl} alt="ID Dorso" className="max-h-24 border rounded hover:opacity-80" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              handleEdit(member);
                              window.scrollTo(0, 0); // Scroll al formulario de edición
                            }}
                            className="bg-yellow-500 text-white text-xs px-3 py-1.5 rounded hover:bg-yellow-700"
                          >
                            Editar
                          </button>
                          {member.isActive && (
                            <button
                              onClick={() => handleDeactivate(member.id)}
                              className="bg-orange-500 text-white text-xs px-3 py-1.5 rounded hover:bg-orange-700"
                            >
                              Desactivar
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="bg-red-500 text-white text-xs px-3 py-1.5 rounded hover:bg-red-700"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center py-4">No hay miembros del staff registrados.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );}
export default Register;