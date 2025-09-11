import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBudgetItems,
  createBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
  exportBudgetItems,
  importBudgetItems,
} from "../../Redux/Actions/budgetItemActions";

const ItemsBudgets = () => {
  const dispatch = useDispatch();
  const { items = [], loading, error } = useSelector((state) => state.budgetItems);

  const initialFormState = {
    name: "",
    category: "",
    marca: "",
    description: "",
    capacity: "",
    unitPrice: "",
    supplierName: "",
    supplierLocation: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const uniqueCategories = useMemo(() => {
    if (!items || items.length === 0) return [];
    const categories = items
      .map((item) => item.category?.trim().toUpperCase())
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
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
    }
  };

const handleCreateOrUpdate = (e) => {
  e.preventDefault();
  const finalCategory = (showNewCategoryInput ? newCategory.trim() : formData.category)?.toUpperCase();
  if (!finalCategory) {
    alert("Please select or enter a category.");
    return;
  }
  const dataToSend = {
    name: formData.name?.trim().toUpperCase() || "",
    category: finalCategory,
    marca: formData.marca?.trim().toUpperCase() || "",
    description: formData.description?.trim().toUpperCase() || "",
    capacity: formData.capacity?.trim().toUpperCase() || "",
    supplierName: formData.supplierName?.trim().toUpperCase() || "",
    supplierLocation: formData.supplierLocation?.trim().toUpperCase() || "",
    unitPrice: parseFloat(formData.unitPrice) || 0,
  };
  if (!dataToSend.name) {
    alert("Name is required.");
    return;
  }
  if (dataToSend.unitPrice < 0) {
    alert("Unit price cannot be negative.");
    return;
  }

  // Aquí está el cambio importante: verificar si estamos editando o creando
  if (editingId) {
    // EDITAR: usar updateBudgetItem
    if (imageFile) {
      const formDataToSend = new FormData();
      Object.entries(dataToSend).forEach(([key, value]) => formDataToSend.append(key, value));
      formDataToSend.append('image', imageFile);
      dispatch(updateBudgetItem(editingId, formDataToSend));
    } else {
      dispatch(updateBudgetItem(editingId, dataToSend));
    }
  } else {
    // CREAR: usar createBudgetItem
    if (imageFile) {
      const formDataToSend = new FormData();
      Object.entries(dataToSend).forEach(([key, value]) => formDataToSend.append(key, value));
      formDataToSend.append('image', imageFile);
      dispatch(createBudgetItem(formDataToSend));
    } else {
      dispatch(createBudgetItem(dataToSend));
    }
  }
  resetForm();
};

  const handleEdit = (item) => {
    setEditingId(item.id);
    const categoryExists = uniqueCategories.includes(item.category?.toUpperCase());
    const currentCategoryValue = item.category?.toUpperCase();
    setFormData({
      name: item.name || "",
      category: categoryExists ? currentCategoryValue : "__NEW__",
      marca: item.marca || "",
      description: item.description || "",
      capacity: item.capacity || "",
      unitPrice: item.unitPrice || "",
      supplierName: item.supplierName || "",
      supplierLocation: item.supplierLocation || "",
    });
    if (!categoryExists) {
      setShowNewCategoryInput(true);
      setNewCategory(item.category || "");
    } else {
      setShowNewCategoryInput(false);
      setNewCategory("");
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to PERMANENTLY DELETE this item? This action cannot be undone.")) {
      dispatch(deleteBudgetItem(id));
    }
  };

  // --- FUNCIONES DE IMPORTACIÓN/EXPORTACIÓN ---
  const handleExportItems = async (format = 'excel') => {
    try {
      await dispatch(exportBudgetItems(format));
      alert(`✅ Items exportados exitosamente en formato ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert(`❌ Error al exportar items: ${error.message}`);
    }
  };




  const handleImportItems = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.csv')) {
      alert('❌ Por favor selecciona un archivo Excel (.xlsx) o CSV (.csv)');
      event.target.value = ''; 
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('❌ El archivo es demasiado grande. Máximo 10MB');
      event.target.value = '';
      return;
    }

    try {
      const result = await dispatch(importBudgetItems(file));
      
      // Mostrar resultados detallados
      const { summary, results } = result.data;
      let message = `🎉 IMPORTACIÓN COMPLETADA:\n\n`;
      message += `✅ Creados: ${summary.created}\n`;
      message += `🔄 Actualizados: ${summary.updated}\n`;
      message += `❌ Errores: ${summary.errors}\n`;

      if (results.errors.length > 0) {
        message += `\n📝 ERRORES DETALLADOS:\n`;
        results.errors.forEach(error => {
          message += `- Fila ${error.row}: ${error.error}\n`;
        });
      }

      alert(message);
    } catch (error) {
      console.error('Error al importar:', error);
      alert(`❌ Error al importar items: ${error.message}`);
    }

    // Clear input para permitir seleccionar el mismo archivo de nuevo
    event.target.value = '';
  };

  if (loading && items.length === 0) {
    return <div className="container mx-auto p-8 text-center text-lg text-blue-700 animate-pulse">Loading items...</div>;
  }
  if (error && items.length === 0) {
    return <div className="container mx-auto p-8 text-center text-red-600 font-semibold">Error loading items: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4 mt-8 border-t pt-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-[80vh]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Form */}
        <div className="bg-white shadow-xl rounded-2xl p-6 border border-blue-100">
          <h3 className="text-xl font-bold mb-6 text-blue-800 tracking-wide border-b pb-2 border-blue-100">
            {editingId ? "Edit Item" : "Create New Item"}
          </h3>
          <form onSubmit={handleCreateOrUpdate} className="space-y-5">
            {/* Category Selector */}
            <div>
              <label className="block text-xs font-semibold text-blue-700 mb-1">Category <span className="text-gray-400 font-normal">(SYSTEM TYPE, DRAINFIELD, PUMP, MATERIALS, INSPECTION, LABOR FEE...)</span></label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="input-style focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
                required={!showNewCategoryInput}
              >
                <option value="">-- Select or create --</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="__NEW__">-- New Category --</option>
              </select>
            </div>
            {showNewCategoryInput && (
              <div>
                <label className="block text-xs font-semibold text-blue-700 mb-1">New Category Name</label>
                <input
                  type="text"
                  name="newCategory"
                  value={newCategory}
                  onChange={handleInputChange}
                  className="input-style focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
                  placeholder="Type the new category"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-blue-700 mb-1">Name <span className="text-gray-400 font-normal">(e.g. ATU, Regular, Chambers, Arena, Tank, Location)</span></label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="input-style focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-700 mb-1">Brand <span className="text-gray-400 font-normal">(e.g. Fuji, Infiltrator, arc24, low profile...)</span></label>
              <input type="text" name="marca" value={formData.marca} onChange={handleInputChange} className="input-style focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-700 mb-1">Description</label>
              <input type="text" name="description" value={formData.description} onChange={handleInputChange} className="input-style focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-700 mb-1">Capacity / Specification <span className="text-gray-400 font-normal">(e.g. 500 GPD)</span></label>
              <input type="text" name="capacity" value={formData.capacity} onChange={handleInputChange} className="input-style focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-700 mb-1">Unit Price *</label>
              <input type="number" step="0.01" min="0" name="unitPrice" value={formData.unitPrice} onChange={handleInputChange} className="input-style focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-700 mb-1">Supplier Name</label>
              <input type="text" name="supplierName" value={formData.supplierName} onChange={handleInputChange} className="input-style focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-700 mb-1">Supplier Location</label>
              <input type="text" name="supplierLocation" value={formData.supplierLocation} onChange={handleInputChange} className="input-style focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-700 mb-1">Imagen (opcional)</label>
              <input type="file" accept="image/*" onChange={handleImageChange} />
              {imagePreview && (
                <div className="mt-2">
                  <img src={imagePreview} alt="Preview" className="h-24 rounded shadow border" />
                </div>
              )}
            </div>
            <div className="flex items-center mt-6 space-x-4">
              <button type="submit" className="bg-blue-600 text-white py-2 px-6 rounded-lg shadow hover:bg-blue-800 transition font-semibold disabled:opacity-50" disabled={loading}>
                {loading ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? "Update Item" : "Create Item")}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-400 text-white py-2 px-6 rounded-lg shadow hover:bg-gray-600 transition font-semibold"
                  disabled={loading}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>
        {/* Right Column: List */}
        <div className="bg-white shadow-xl rounded-2xl p-6 border border-blue-100 max-h-[80vh] overflow-y-auto">
          <div className="sticky top-0 bg-white pb-2 z-10 border-b border-blue-100 mb-6">
            <h3 className="text-xl font-bold text-blue-800 mb-4">Item List ({items.length})</h3>
            
            {/* Import/Export Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleExportItems('excel')}
                disabled={loading || items.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Excel
              </button>
              
              <button
                onClick={() => handleExportItems('csv')}
                disabled={loading || items.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
              
              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportItems}
                  accept=".xlsx,.csv"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  Import Items
                </button>
              </div>
            </div>
          </div>
          
          {items.length === 0 && !loading && !error ? (
            <p className="text-gray-400 text-center">No budget items created yet.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-xl border border-gray-200 bg-gradient-to-r from-blue-50 to-white hover:shadow-lg transition-colors"
                >
                  <div className="mb-2 md:mb-0 md:flex-1 mr-2 flex items-center gap-4">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="h-16 w-16 object-contain rounded border shadow" />
                    )}
                    <div>
                      <p className="text-base font-bold text-blue-700">
                        {item.category || '(No Name)'}
                      </p>
                      <p className="text-xs text-gray-600 font-semibold">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.marca ? `Brand: ${item.marca}` : ''} {item.capacity ? `(${item.capacity})` : ''}
                      </p>
                      <p className="text-xs text-blue-700 font-bold">
                        Price: ${parseFloat(item.unitPrice).toFixed(2)}
                      </p>
                      {item.supplierName && <p className="text-xs text-gray-500">Supplier: {item.supplierName} ({item.supplierLocation || 'N/A'})</p>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(item)}
                      className="bg-blue-500 text-white py-1 px-3 rounded-lg hover:bg-blue-700 text-xs font-semibold shadow disabled:opacity-50"
                      disabled={loading}
                    >
                      Edit
                    </button>
                    <button
                        onClick={() => handleDelete(item.id)}
                        className="bg-red-500 text-white py-1 px-3 rounded-lg hover:bg-red-700 text-xs font-semibold shadow disabled:opacity-50"
                        disabled={loading}
                    >
                        Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {loading && items.length > 0 && <p className="text-center text-blue-400 mt-4">Updating list...</p>}
        </div>
      </div>
      <style>{`.input-style { border: 1.5px solid #bcd0ee; border-radius: 8px; padding: 10px; width: 100%; background: #f8fafc; font-size: 1rem; transition: border 0.2s; } .input-style:disabled { background-color: #f3f4f6; cursor: not-allowed; }`}</style>
    </div>
  );
};

export default ItemsBudgets;