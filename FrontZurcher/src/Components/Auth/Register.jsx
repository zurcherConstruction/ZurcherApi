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
    isActive: true,
  });
  const [editingStaff, setEditingStaff] = useState(null); 
  
  useEffect(() => {
    dispatch(fetchStaff());
  }, [dispatch]);

  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

 
  const handleSubmit = (e) => {
    e.preventDefault();
  
    // Pasar el estado de edición a la función de validación
    const errors = validateForm(formData, !!editingStaff);
    if (Object.keys(errors).length > 0) {
      alert("Por favor corrige los siguientes errores:\n" + Object.values(errors).join("\n"));
      return;
    }
  
    if (editingStaff) {
      // Actualizar miembro del staff
      dispatch(updateStaff(editingStaff.id, formData));
      setEditingStaff(null);
    } else {
      // Crear nuevo miembro del staff
      dispatch(createStaff(formData));
    }
  
    // Reiniciar el formulario
    setFormData({
      email: "",
      password: "",
      role: "admin",
      phone: "",
      name: "",
      isActive: true,
    });
  };
 
  const handleEdit = (staff) => {
    setEditingStaff(staff);
    setFormData({
      email: staff.email,
      password: "", 
      role: staff.role,
      phone: staff.phone,
      name: staff.name,
      isActive: staff.isActive,
    });
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
    <div className="p-4">
      {/* Formulario de registro/edición */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">
          {editingStaff ? "Editar Staff" : "Registrar Staff"}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full border rounded px-3 py-2"
              placeholder="Nombre completo"
            />
          </div>
          <div>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full border rounded px-3 py-2"
              placeholder="Email"
            />
          </div>
          <div>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
              className="w-full border rounded px-3 py-2"
              placeholder="Teléfono"
            />
          </div>
          <div>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              required
              className="w-full border rounded px-3 py-2"
            >
              <option value="admin">Admin</option>
              <option value="worker">Worker</option>
              <option value="recept">Recept</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          {editingStaff && (
            <div>
              <select
                name="isActive"
                value={formData.isActive}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2"
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          )}
          {!editingStaff && (
            <div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full border rounded px-3 py-2"
                placeholder="Contraseña"
              />
            </div>
          )}
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="bg-blue-950 text-white px-2 py-1 rounded hover:bg-blue-700"
            >
              {editingStaff ? "Guardar Cambios" : "Registrar"}
            </button>
          </div>
        </form>
      </div>
  
      {/* Listado del staff */}
      <div>
        <h2 className="text-lg font-bold mb-2">Staff</h2>
        {loading && <p className="text-blue-500">Cargando staff...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        {!loading && !error && (
          <>
            {/* Tabla para pantallas grandes */}
            <div className="hidden lg:block">
              <table className="table-auto w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-300 px-4 py-2">Nombre</th>
                    <th className="border border-gray-300 px-4 py-2">Email</th>
                    <th className="border border-gray-300 px-4 py-2">Teléfono</th>
                    <th className="border border-gray-300 px-4 py-2">Rol</th>
                    <th className="border border-gray-300 px-4 py-2">Estado</th>
                    <th className="border border-gray-300 px-4 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {staff && staff.length > 0 ? (
                    staff.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-100">
                        <td className="border border-gray-300 px-4 py-2">{member.name}</td>
                        <td className="border border-gray-300 px-4 py-2">{member.email}</td>
                        <td className="border border-gray-300 px-4 py-2">{member.phone}</td>
                        <td className="border border-gray-300 px-4 py-2">{member.role}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          {member.isActive ? (
                            <span className="text-green-500 font-bold">Activo</span>
                          ) : (
                            <span className="text-red-500 font-bold">Inactivo</span>
                          )}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <button
                            onClick={() => handleEdit(member)}
                            className="bg-yellow-500 text-white text-xs px-2 py-1 rounded hover:bg-yellow-700 mr-2"
                          >
                            Editar
                          </button>
                          {member.isActive && (
                            <button
                              onClick={() => handleDeactivate(member.id)}
                              className="bg-orange-500 text-white text-xs px-2 py-1 rounded hover:bg-orange-700 mr-2"
                            >
                              Desactivar
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-700"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
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
                    className="border border-gray-300 rounded-lg p-4 shadow-md hover:bg-gray-100"
                  >
                    <p className="text-sm font-semibold">Nombre: {member.name}</p>
                    <p className="text-sm">Email: {member.email}</p>
                    <p className="text-sm">Teléfono: {member.phone}</p>
                    <p className="text-sm">Rol: {member.role}</p>
                    <p className="text-sm">
                      Estado:{" "}
                      {member.isActive ? (
                        <span className="text-green-500 font-bold">Activo</span>
                      ) : (
                        <span className="text-red-500 font-bold">Inactivo</span>
                      )}
                    </p>
                    <div className="mt-2">
                      <button
                        onClick={() => handleEdit(member)}
                        className="bg-yellow-500 text-white text-xs px-2 py-1 rounded hover:bg-yellow-700 mr-2"
                      >
                        Editar
                      </button>
                      {member.isActive && (
                        <button
                          onClick={() => handleDeactivate(member.id)}
                          className="bg-orange-500 text-white text-xs px-2 py-1 rounded hover:bg-orange-700 mr-2"
                        >
                          Desactivar
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
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