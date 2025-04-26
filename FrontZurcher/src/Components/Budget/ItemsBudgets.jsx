import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBudgetItems,
  createBudgetItem,
  updateBudgetItem,
  deleteBudgetItem, // Esta action ahora debe realizar un hard delete en el backend
} from "../../Redux/Actions/budgetItemActions";

const ItemsBudgets = () => {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.budgetItems);

  const initialFormState = {
    name: "",
    description: "", // Ya no es obligatorio
    category: "",
    marca: "",
    capacity: "",
    unitPrice: "",
    supplierName: "",
    supplierLocation: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    // Fetch ahora puede traer solo activos si ya no gestionas inactivos
    // O mantener 'all' si prefieres, aunque no habrá botón de reactivar
    dispatch(fetchBudgetItems()); // Puedes quitar { active: 'all' } si el backend ahora solo devuelve activos o si no importa
  }, [dispatch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateOrUpdate = (e) => {
    e.preventDefault();
    const dataToSend = {
        ...formData,
        unitPrice: parseFloat(formData.unitPrice) || 0,
    };

    if (editingId) {
      dispatch(updateBudgetItem(editingId, dataToSend));
    } else {
      dispatch(createBudgetItem(dataToSend));
    }
    setFormData(initialFormState);
    setEditingId(null);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name || "",
      description: item.description || "", // Sigue poblando el campo
      category: item.category || "",
      marca: item.marca || "",
      capacity: item.capacity || "",
      unitPrice: item.unitPrice || "",
      supplierName: item.supplierName || "",
      supplierLocation: item.supplierLocation || "",
    });
  };

  // handleDelete ahora realiza una eliminación permanente
  const handleDelete = (id) => {
    // Cambia el mensaje de confirmación
    if (window.confirm("¿Estás seguro de que deseas ELIMINAR PERMANENTEMENTE este item? Esta acción no se puede deshacer.")) {
      dispatch(deleteBudgetItem(id)); // Llama a la action que ahora debe hacer hard delete
    }
  };

  // handleReactivate ya no es necesario y se elimina
  // const handleReactivate = (id) => { ... }

  if (loading && items.length === 0) {
    return <div>Cargando Items...</div>;
  }

  if (error) {
    return <div>Error al cargar items: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4 mt-8 border-t pt-6">
      <h2 className="text-2xl font-bold mb-4">Gestión de Items Presupuestables</h2>

      <form
        onSubmit={handleCreateOrUpdate}
        className="bg-white shadow-md rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <h3 className="text-lg font-semibold mb-2 md:col-span-2">
          {editingId ? "Editar Item" : "Crear Nuevo Item"}
        </h3>

        {/* Columna 1 */}
        <div>
          <label className="block text-sm font-medium text-gray-700">CATEGORIA (Materiales, systemtype Tanques, Inspections, Otros)</label>
          <input type="text" name="category" value={formData.category} onChange={handleInputChange} className="mt-1 block w-full input-style" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">NOMBRE (atu, regular,  chambers, arena, PUMP, etc) </label>
          {/* Se quita 'required' */}
          <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="mt-1 block w-full input-style" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">MARCA (marca ejemplo: fuji, infiltrator, )</label>
          <input type="text" name="marca" value={formData.marca} onChange={handleInputChange} className="mt-1 block w-full input-style" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">DESCRIPCION (OPCIONAL)</label>
          <input type="text" name="description" value={formData.description} onChange={handleInputChange} className="mt-1 block w-full input-style" />
        </div>

        {/* Columna 2 */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Capacidad / Especificación / TAMAÑO (ejem GDP MAXIMO  500, 750)</label>
          <input type="text" name="capacity" value={formData.capacity} onChange={handleInputChange} className="mt-1 block w-full input-style" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Precio Unitario</label>
          <input type="number" step="0.01" name="unitPrice" value={formData.unitPrice} onChange={handleInputChange} className="mt-1 block w-full input-style" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre Proveedor</label>
          <input type="text" name="supplierName" value={formData.supplierName} onChange={handleInputChange} className="mt-1 block w-full input-style" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Ubicación Proveedor</label>
          <input type="text" name="supplierLocation" value={formData.supplierLocation} onChange={handleInputChange} className="mt-1 block w-full input-style" />
        </div>

        {/* Botones */}
        <div className="md:col-span-2 flex items-center mt-2">
          <button type="submit" className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-800">
            {editingId ? "Actualizar Item" : "Crear Item"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setFormData(initialFormState);
              }}
              className="ml-4 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-700"
            >
              Cancelar Edición
            </button>
          )}
        </div>
      </form>

      {/* Listado de BudgetItems */}
      <div className="bg-white shadow-md rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Listado de Items</h3>
        {loading && items.length > 0 && <p>Actualizando lista...</p>}
        {items.length === 0 && !loading ? (
          <p>No hay items presupuestables disponibles.</p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              // Se quita la lógica de estilo condicional basada en isActive
              <li
                key={item.id}
                className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 rounded border border-gray-200"
              >
                <div className="mb-2 md:mb-0 md:flex-1">
                  {/* Se quita la indicación '(Inactivo)' */}
                  <p className="text-sm font-medium text-gray-900">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-600">{item.description}</p>
                  <p className="text-xs text-gray-500">
                    Cat: {item.category} {item.marca ? `> ${item.marca}` : ''} {item.capacity ? `(${item.capacity})` : ''}
                  </p>
                  <p className="text-xs text-gray-500">
                    Precio: ${parseFloat(item.unitPrice).toFixed(2)}
                  </p>
                   {item.supplierName && <p className="text-xs text-gray-500">Prov: {item.supplierName} ({item.supplierLocation || 'N/A'})</p>}
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(item)}
                    className="bg-blue-500 text-white py-1 px-2 rounded-md hover:bg-blue-700 text-xs"
                    // Se quita 'disabled={!item.isActive}'
                  >
                    Editar
                  </button>
                  {/* Se elimina el bloque condicional y el botón Reactivar */}
                  <button
                      onClick={() => handleDelete(item.id)}
                      className="bg-red-500 text-white py-1 px-2 rounded-md hover:bg-red-700 text-xs"
                  >
                      Eliminar {/* Texto del botón cambiado */}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <style>{`.input-style { border: 1px solid #ccc; border-radius: 4px; padding: 8px; }`}</style>
    </div>
  );
};

export default ItemsBudgets;