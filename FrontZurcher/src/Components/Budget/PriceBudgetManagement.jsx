import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchSystemTypes,
  createSystemType,
  updateSystemType,
  deleteSystemType,
} from "../../Redux/Actions/SystemActions";

const PriceBudgetManagement = () => {
  const dispatch = useDispatch();
  const { systemTypes, loading, error } = useSelector((state) => state.systemType);

  const [formData, setFormData] = useState({ name: "", price: "" });
  const [editingId, setEditingId] = useState(null); // ID del sistema que se está editando

  useEffect(() => {
    dispatch(fetchSystemTypes());
  }, [dispatch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateOrUpdate = (e) => {
    e.preventDefault();
    if (editingId) {
      // Actualizar un SystemType existente
      dispatch(updateSystemType(editingId, formData));
    } else {
      // Crear un nuevo SystemType
      dispatch(createSystemType(formData));
    }
    setFormData({ name: "", price: "" });
    setEditingId(null);
  };

  const handleEdit = (systemType) => {
    setEditingId(systemType.id);
    setFormData({ name: systemType.name, price: systemType.price });
  };

  const handleDelete = (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este sistema?")) {
      dispatch(deleteSystemType(id));
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Gestión de Precios de Sistemas</h2>

      {/* Formulario para crear o editar un SystemType */}
      <form
        onSubmit={handleCreateOrUpdate}
        className="bg-white shadow-md rounded-lg p-4 mb-6"
      >
        <h3 className="text-lg font-semibold mb-4">
          {editingId ? "Editar Sistema" : "Crear Nuevo Sistema"}
        </h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Nombre del Sistema
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Precio
          </label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-700"
        >
          {editingId ? "Actualizar" : "Crear"}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setFormData({ name: "", price: "" });
            }}
            className="ml-4 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-700"
          >
            Cancelar
          </button>
        )}
      </form>

      {/* Listado de SystemTypes */}
      <div className="bg-white shadow-md rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Listado de Sistemas</h3>
        {systemTypes.length === 0 ? (
          <p>No hay sistemas disponibles.</p>
        ) : (
          <ul>
            {systemTypes.map((systemType) => (
              <li
                key={systemType.id}
                className="flex items-center justify-between mb-4 border-b pb-2"
              >
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {systemType.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Precio: ${systemType.price}
                  </p>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={() => handleEdit(systemType)}
                    className="bg-blue-500 text-white py-1 px-2 rounded-md hover:bg-blue-700 mr-2"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(systemType.id)}
                    className="bg-red-500 text-white py-1 px-2 rounded-md hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PriceBudgetManagement;

