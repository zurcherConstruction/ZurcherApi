import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBudgetItems,
  createBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
} from "../../Redux/Actions/budgetItemActions";

const ItemsBudgets = () => {
  const dispatch = useDispatch();
  // Asegurarse de que 'items' sea un array, incluso si el estado inicial es diferente
  const { items = [], loading, error } = useSelector((state) => state.budgetItems);

  const initialFormState = {
    name: "",
    description: "",
    category: "", // Valor del select
    marca: "",
    capacity: "",
    unitPrice: "",
    supplierName: "",
    supplierLocation: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  // Obtener categorías únicas usando useMemo, manejando 'items' vacío o null
  const uniqueCategories = useMemo(() => {
    if (!items || items.length === 0) return []; // Devuelve array vacío si no hay items
    const categories = items
        .map(item => item.category?.trim().toUpperCase()) // Convertir a mayúsculas aquí también para consistencia
        .filter(Boolean);
    return [...new Set(categories)].sort();
  }, [items]);

  useEffect(() => {
    dispatch(fetchBudgetItems());
  }, [dispatch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "category") {
      if (value === "__NEW__") {
        setShowNewCategoryInput(true);
        setFormData((prev) => ({ ...prev, category: value }));
      } else {
        setShowNewCategoryInput(false);
        setNewCategory("");
        setFormData((prev) => ({ ...prev, category: value }));
      }
    } else if (name === "newCategory") {
      setNewCategory(value);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setShowNewCategoryInput(false);
    setNewCategory("");
  };

  const handleCreateOrUpdate = (e) => {
    e.preventDefault();

    // Determinar la categoría final y convertirla a mayúsculas
    const finalCategory = (showNewCategoryInput ? newCategory.trim() : formData.category)?.toUpperCase();

    // Validar que la categoría final no esté vacía
    if (!finalCategory) {
        alert("Por favor, selecciona o ingresa una categoría.");
        return;
    }

    // Convertir campos de texto a mayúsculas antes de enviar
    const dataToSend = {
      name: formData.name?.trim().toUpperCase() || "",
      description: formData.description?.trim().toUpperCase() || "",
      category: finalCategory, // Ya está en mayúsculas
      marca: formData.marca?.trim().toUpperCase() || "",
      capacity: formData.capacity?.trim().toUpperCase() || "",
      supplierName: formData.supplierName?.trim().toUpperCase() || "",
      supplierLocation: formData.supplierLocation?.trim().toUpperCase() || "",
      unitPrice: parseFloat(formData.unitPrice) || 0,
    };

    // Validaciones adicionales (opcional, pero recomendado)
    if (!dataToSend.name) {
        alert("La marca es obligatoria.");
        return;
    }
    if (dataToSend.unitPrice < 0) { // Permitir 0 pero no negativo
        alert("El precio unitario no puede ser negativo.");
        return;
    }
    // Añadir más validaciones si es necesario...


    if (editingId) {
      dispatch(updateBudgetItem(editingId, dataToSend));
    } else {
      dispatch(createBudgetItem(dataToSend));
    }
    resetForm(); // Resetear el formulario después de enviar
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    // Comprobar contra categorías únicas (que ya están en mayúsculas)
    const categoryExists = uniqueCategories.includes(item.category?.toUpperCase());
    const currentCategoryValue = item.category?.toUpperCase(); // Usar mayúsculas para consistencia

    setFormData({
      name: item.name || "",
      description: item.description || "",
      category: categoryExists ? currentCategoryValue : "__NEW__", // Usar valor en mayúsculas
      marca: item.marca || "",
      capacity: item.capacity || "",
      unitPrice: item.unitPrice || "",
      supplierName: item.supplierName || "",
      supplierLocation: item.supplierLocation || "",
    });

    if (!categoryExists) {
        setShowNewCategoryInput(true);
        setNewCategory(item.category || ""); // Mantener el valor original para editarlo
    } else {
        setShowNewCategoryInput(false);
        setNewCategory("");
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("¿Estás seguro de que deseas ELIMINAR PERMANENTEMENTE este item? Esta acción no se puede deshacer.")) {
      dispatch(deleteBudgetItem(id));
    }
  };

  // --- Renderizado ---

  // Mensaje inicial mientras carga por primera vez
  if (loading && items.length === 0) {
    return <div className="container mx-auto p-4 text-center">Cargando Items...</div>;
  }

  // Mensaje de error si falla la carga inicial
  if (error && items.length === 0) {
    return <div className="container mx-auto p-4 text-center text-red-600">Error al cargar items: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4 mt-8 border-t pt-6">
     

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Columna Izquierda: Formulario */}
        <div className="bg-white shadow-md rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? "Editar Item" : "Crear Nuevo Item"}
          </h3>
          <form onSubmit={handleCreateOrUpdate} className="space-y-4">
            {/* Selector de Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Categoría</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="mt-1 block w-full input-style"
                required={!showNewCategoryInput}
              >
                <option value="">-- Selecciona o crea --</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="__NEW__">-- Nueva Categoría --</option>
              </select>
            </div>

            {/* Input para Nueva Categoría (Condicional) */}
            {showNewCategoryInput && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre Nueva Categoría</label>
                <input
                  type="text"
                  name="newCategory"
                  value={newCategory}
                  onChange={handleInputChange}
                  className="mt-1 block w-full input-style"
                  placeholder="Escribe la nueva categoría"
                  required
                />
              </div>
            )}

            {/* Resto de los campos */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre (Ej: ATU, Regular, Chambers)</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="mt-1 block w-full input-style" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Marca (Ej: Fuji, Infiltrator) *</label>
              <input type="text" name="marca" value={formData.marca} onChange={handleInputChange} className="mt-1 block w-full input-style" required />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700">Descripción (Opcional)</label>
              <input type="text" name="description" value={formData.description} onChange={handleInputChange} className="mt-1 block w-full input-style" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Capacidad / Especificación (Ej: 500 GPD)</label>
              <input type="text" name="capacity" value={formData.capacity} onChange={handleInputChange} className="mt-1 block w-full input-style" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Precio Unitario *</label>
              <input type="number" step="0.01" min="0" name="unitPrice" value={formData.unitPrice} onChange={handleInputChange} className="mt-1 block w-full input-style" required />
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
            <div className="flex items-center mt-4 space-x-4">
              <button type="submit" className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-800 disabled:opacity-50" disabled={loading}>
                {loading ? (editingId ? 'Actualizando...' : 'Creando...') : (editingId ? "Actualizar Item" : "Crear Item")}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-700"
                  disabled={loading}
                >
                  Cancelar Edición
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Columna Derecha: Listado */}
        <div className="bg-white shadow-md rounded-lg p-4 max-h-[80vh] overflow-y-auto"> {/* Ajustado max-h */}
          <h3 className="text-lg font-semibold mb-4 sticky top-0 bg-white pb-2 z-10">Listado de Items ({items.length})</h3>
          {/* Mensaje si la lista está vacía después de cargar */}
          {items.length === 0 && !loading && !error ? (
            <p className="text-gray-500">Todavía no hay items presupuestables creados.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="mb-2 md:mb-0 md:flex-1 mr-2"> {/* Añadido margen derecho */}
                    <p className="text-sm font-medium text-gray-900">
                      {item.name || '(Sin Nombre)'}
                    </p>
                    <p className="text-xs text-gray-500 font-semibold">
                      {item.category}
                    </p>
                     {item.description && <p className="text-xs text-gray-600 italic">"{item.description}"</p>}
                    <p className="text-xs text-gray-500">
                      {item.marca ? `Marca: ${item.marca}` : ''} {item.capacity ? `(${item.capacity})` : ''}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      Precio: ${parseFloat(item.unitPrice).toFixed(2)}
                    </p>
                    {item.supplierName && <p className="text-xs text-gray-500">Prov: {item.supplierName} ({item.supplierLocation || 'N/A'})</p>}
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(item)}
                      className="bg-blue-500 text-white py-1 px-2 rounded-md hover:bg-blue-700 text-xs disabled:opacity-50"
                      disabled={loading} // Deshabilitar botones durante carga
                    >
                      Editar
                    </button>
                    <button
                        onClick={() => handleDelete(item.id)}
                        className="bg-red-500 text-white py-1 px-2 rounded-md hover:bg-red-700 text-xs disabled:opacity-50"
                        disabled={loading} // Deshabilitar botones durante carga
                    >
                        Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
           {/* Indicador de carga si se está actualizando la lista */}
           {loading && items.length > 0 && <p className="text-center text-gray-500 mt-4">Actualizando lista...</p>}
        </div>

      </div> {/* Fin Grid principal */}

      <style>{`.input-style { border: 1px solid #ccc; border-radius: 4px; padding: 8px; width: 100%; } .input-style:disabled { background-color: #f3f4f6; cursor: not-allowed; }`}</style>
    </div>
  );
};

export default ItemsBudgets;