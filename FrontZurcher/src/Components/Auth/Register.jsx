import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchStaff,
  createStaff,
  updateStaff,
  deactivateOrDeleteStaff,
} from "../../Redux/Actions/adminActions";

const Register = () => {
  const dispatch = useDispatch();

  // Obtener el estado del staff desde Redux
  const { staff, loading, error } = useSelector((state) => state.admin);

  // Estados locales
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "admin",
    phone: "",
    name: "",
    isActive: true,
  });
  const [editingStaff, setEditingStaff] = useState(null); // Staff seleccionado para edición

  // Cargar el listado del staff al montar el componente
  useEffect(() => {
    dispatch(fetchStaff());
  }, [dispatch]);

  // Manejar cambios en los campos del formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Manejar la creación o edición del staff
  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingStaff) {
      // Actualizar staff existente
      dispatch(updateStaff(editingStaff.id, formData));
      setEditingStaff(null); // Salir del modo de edición
    } else {
      // Crear nuevo staff
      dispatch(createStaff(formData));
    }
    setFormData({
      email: "",
      password: "",
      role: "admin",
      phone: "",
      name: "",
      isActive: true,
    });
  };

  // Manejar la edición de un miembro del staff
  const handleEdit = (staff) => {
    setEditingStaff(staff);
    setFormData({
      email: staff.email,
      password: "", // No se muestra la contraseña actual
      role: staff.role,
      phone: staff.phone,
      name: staff.name,
      isActive: staff.isActive,
    });
  };

  // Manejar la eliminación de un miembro del staff
 // Manejar la eliminación de un miembro del staff
const handleDelete = (id) => {
  const confirmDelete = window.confirm(
    "¿Estás seguro de que deseas eliminar este miembro del staff?"
  );
  if (confirmDelete) {
    dispatch(deactivateOrDeleteStaff(id, "delete")); // No necesitas actualizar el estado local
  }
};
  // Manejar la desactivación de un miembro del staff
  const handleDeactivate = (id) => {
    const confirmDeactivate = window.confirm(
      "¿Estás seguro de que deseas desactivar este miembro del staff?"
    );
    if (confirmDeactivate) {
      dispatch(deactivateOrDeleteStaff(id, "deactivate")); // Acción para desactivar
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Gestión de Staff</h1>

      {/* Formulario de registro/edición */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-2">
          {editingStaff ? "Editar Staff" : "Registrar Staff"}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">Nombre:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Email:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Teléfono:</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Rol:</label>
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
              <label className="block text-sm font-bold mb-1">Estado:</label>
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
              <label className="block text-sm font-bold mb-1">Contraseña:</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full border rounded px-3 py-2"
              />
            </div>
          )}
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {editingStaff ? "Guardar Cambios" : "Registrar"}
            </button>
          </div>
        </form>
      </div>

      {/* Listado del staff */}
      <div>
        <h2 className="text-lg font-bold mb-2">Listado de Staff</h2>
        {loading && <p className="text-blue-500">Cargando staff...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        {!loading && !error && (
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
        )}
      </div>
    </div>
  );
};
export default Register;