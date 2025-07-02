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
    if (imageFile) {
      const formDataToSend = new FormData();
      Object.entries(dataToSend).forEach(([key, value]) => formDataToSend.append(key, value));
      formDataToSend.append('image', imageFile);
      dispatch(createBudgetItem(formDataToSend));
    } else {
      dispatch(createBudgetItem(dataToSend));
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
          <h3 className="text-xl font-bold mb-6 sticky top-0 bg-white pb-2 z-10 text-blue-800 border-b border-blue-100">Item List ({items.length})</h3>
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