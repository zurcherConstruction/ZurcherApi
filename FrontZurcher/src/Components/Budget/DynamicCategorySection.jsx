import React, { useState, useMemo, useEffect} from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

const DynamicCategorySection = ({
  category,
  normalizedCatalog,
  isVisible,
  onToggle,
  onAddItem,
  generateTempId
}) => {
  const [selection, setSelection] = useState({
    name: '',
    marca: '',
    capacity: '',
    description: '',
    quantity: ''
  });
  const [customItem, setCustomItem] = useState({
    name: '',
    marca: '',
    capacity: '',
    description: '',
    unitPrice: '',
    quantity: ''
  });

  // Obtener todos los items de esta categoría
  // Para la categoría "MATERIALES", igualar ignorando mayúsculas/minúsculas y espacios
  const categoryItems = useMemo(() =>
    normalizedCatalog
      .filter(i => {
        if (category.toString().toUpperCase().trim() === 'MATERIALES') {
          return i.category && i.category.toString().toUpperCase().trim() === 'MATERIALES';
        }
        return i.category === category;
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
    [normalizedCatalog, category]
  );

   useEffect(() => {
    if (category.toUpperCase() === 'LABOR' && !selection.name) {
      const laborFeeItem = categoryItems.find(item => item.name.toUpperCase() === 'LABOR FEE');
      if (laborFeeItem) {
        setSelection(prev => ({
          ...prev,
          name: laborFeeItem.name
        }));
      }
    }
  }, [category, categoryItems, selection.name]);

  // ✅ VERIFICAR QUÉ CAMPOS REALMENTE TIENEN DATOS EN ESTA CATEGORÍA
  const fieldAnalysis = useMemo(() => {
    const hasNames = categoryItems.some(item => item.name && item.name.trim() !== '');
    const hasMarcas = categoryItems.some(item => item.marca && item.marca.trim() !== '');
    const hasCapacities = categoryItems.some(item => item.capacity && item.capacity.trim() !== '');
    // ✅ AGREGAR ANÁLISIS DE DESCRIPTIONS
    const hasDescriptions = categoryItems.some(item => item.description && item.description.trim() !== '');

    return {
      hasNames,
      hasMarcas,
      hasCapacities,
      hasDescriptions, // ✅ NUEVO CAMPO
      // Para debug
      totalItems: categoryItems.length
    };
  }, [categoryItems]);

  console.log(`Análisis de campos para ${category}:`, fieldAnalysis);

  // Obtener valores únicos solo si el campo tiene datos
  const uniqueNames = useMemo(() => {
    if (!fieldAnalysis.hasNames) return [];
    return [...new Set(categoryItems.map(i => i.name || '').filter(name => name.trim() !== ''))].sort();
  }, [categoryItems, fieldAnalysis.hasNames]);

  const uniqueMarcas = useMemo(() => {
    if (!fieldAnalysis.hasMarcas) return [];
    if (!selection.name || selection.name === 'OTROS') return [];

    return categoryItems
      .filter(i => i.name === selection.name)
      .map(i => i.marca || '')
      .filter(marca => marca.trim() !== '')
      .filter((marca, index, self) => self.indexOf(marca) === index) // Eliminar duplicados
      .sort((a, b) => b.localeCompare(a)); 
  }, [categoryItems, selection.name, fieldAnalysis.hasMarcas]);

  const uniqueCapacities = useMemo(() => {
    if (!fieldAnalysis.hasCapacities) return [];
    if (!selection.name || selection.name === 'OTROS') return [];

    let filtered = categoryItems.filter(i => i.name === selection.name);

    if (selection.marca && selection.marca !== 'OTROS' && fieldAnalysis.hasMarcas) {
      filtered = filtered.filter(i => i.marca === selection.marca);
    }

    return [...new Set(filtered.map(i => i.capacity || '').filter(cap => cap.trim() !== ''))].sort();
  }, [categoryItems, selection.name, selection.marca, fieldAnalysis.hasCapacities, fieldAnalysis.hasMarcas]);

  // AGREGAR uniqueDescriptions después de uniqueCapacities (líneas ~75-85):

  const uniqueDescriptions = useMemo(() => {
    if (!fieldAnalysis.hasDescriptions) return [];
    if (!selection.name || selection.name === 'OTROS') return [];

    let filtered = categoryItems.filter(i => i.name === selection.name);

    if (selection.marca && selection.marca !== 'OTROS' && fieldAnalysis.hasMarcas) {
      filtered = filtered.filter(i => i.marca === selection.marca);
    }

    if (selection.capacity && selection.capacity !== 'OTROS' && fieldAnalysis.hasCapacities) {
      filtered = filtered.filter(i => i.capacity === selection.capacity);
    }

    return [...new Set(filtered.map(i => i.description || '').filter(desc => desc.trim() !== ''))].sort();
  }, [categoryItems, selection.name, selection.marca, selection.capacity, fieldAnalysis.hasDescriptions, fieldAnalysis.hasMarcas, fieldAnalysis.hasCapacities]);


 const handleSelectionChange = (e) => {
  const { name, value } = e.target;
  
  if (name === 'quantity') {
    // Permitir valores vacíos y números válidos para quantity
    if (value === '' || (!isNaN(value) && parseFloat(value) >= 0)) {
      setSelection(prev => ({
        ...prev,
        [name]: value
      }));
    }
    return;
  }
  
  // Para otros campos, mantener la lógica original
  setSelection(prev => {
    const newState = { ...prev, [name]: value };
    if (name === 'name') {
      if (fieldAnalysis.hasMarcas) newState.marca = '';
      if (fieldAnalysis.hasCapacities) newState.capacity = '';
      if (fieldAnalysis.hasDescriptions) newState.description = '';
    }
    if (name === 'marca') {
      if (fieldAnalysis.hasCapacities) newState.capacity = '';
      if (fieldAnalysis.hasDescriptions) newState.description = '';
    }
    if (name === 'capacity' && fieldAnalysis.hasDescriptions) {
      newState.description = '';
    }
    return newState;
  });

  if (value !== 'OTROS') {
    setCustomItem({ name: '', marca: '', capacity: '', description: '', unitPrice: '', quantity: '' });
  }
};

const handleCustomChange = (e) => {
  const { name, value } = e.target;
  const isNumeric = ['unitPrice', 'quantity'].includes(name);
  
  if (isNumeric) {
    // Permitir valores vacíos y números válidos
    if (value === '' || (!isNaN(value) && parseFloat(value) >= 0)) {
      setCustomItem(prev => ({
        ...prev,
        [name]: value
      }));
    }
  } else {
    setCustomItem(prev => ({
      ...prev,
      [name]: value
    }));
  }
};

  // MODIFICAR handleAddItem para incluir description (líneas ~120-180):

  const handleAddItem = () => {
  const isCustom = selection.name === 'OTROS' ||
    (fieldAnalysis.hasMarcas && selection.marca === 'OTROS') ||
    (fieldAnalysis.hasCapacities && selection.capacity === 'OTROS') ||
    (fieldAnalysis.hasDescriptions && selection.description === 'OTROS');

  if (isCustom) {
    const unitPrice = parseFloat(customItem.unitPrice) || 0;
    const quantity = parseFloat(customItem.quantity) || 1;
    
    if (!customItem.name || unitPrice <= 0) {
      alert("Por favor complete Nombre y Precio del item personalizado.");
      return;
    }

    onAddItem({
      _tempId: generateTempId(),
      budgetItemId: null,
      name: customItem.name.toUpperCase(),
      category: category,
      marca: customItem.marca.toUpperCase(),
      capacity: customItem.capacity.toUpperCase(),
      description: customItem.description.toUpperCase(),
      unitPrice: unitPrice,
      quantity: quantity,
      notes: 'Item Personalizado',
    });

    setCustomItem({ name: '', marca: '', capacity: '', description: '', unitPrice: '', quantity: '' });
    setSelection({ name: '', marca: '', capacity: '', description: '', quantity: '' });
  } else {
    if (!selection.name) {
      alert("Por favor seleccione un item.");
      return;
    }

    const quantity = parseFloat(selection.quantity) || 1;

      // ✅ BÚSQUEDA INTELIGENTE: Solo considerar campos que existen
      let foundItem = categoryItems.find(i => {
        let match = i.name === selection.name;

        // Solo verificar marca si esta categoría tiene marcas Y se seleccionó una
        if (fieldAnalysis.hasMarcas && selection.marca && selection.marca !== '') {
          match = match && i.marca === selection.marca;
        }

        // Solo verificar capacidad si esta categoría tiene capacidades Y se seleccionó una
        if (fieldAnalysis.hasCapacities && selection.capacity && selection.capacity !== '') {
          match = match && i.capacity === selection.capacity;
        }

        // ✅ Solo verificar description si esta categoría tiene descriptions Y se seleccionó una
        if (fieldAnalysis.hasDescriptions && selection.description && selection.description !== '') {
          match = match && i.description === selection.description;
        }

        return match;
      });

      if (!foundItem) {
        alert("No se encontró el item seleccionado en el catálogo.");
        console.error("Búsqueda fallida:", {
          selection,
          fieldAnalysis,
          availableItems: categoryItems.map(i => ({
            name: i.name,
            marca: i.marca,
            capacity: i.capacity,
            description: i.description // ✅ AGREGAR
          }))
        });
        return;
      }

      // Usar la función de agregar del componente padre
      // Asegurarse de pasar imageUrl si existe
     onAddItem({
      category: category,
      name: foundItem.name,
      marca: foundItem.marca || '',
      capacity: foundItem.capacity || '',
      description: foundItem.description || '',
      imageUrl: foundItem.imageUrl || foundItem.imageurl || '',
      quantity: quantity, // Usar el valor parseado
    });

    setSelection({ name: '', marca: '', capacity: '', description: '', quantity: '' });
  }
};

  if (categoryItems.length === 0) return null; // No mostrar si no hay items

  // Hook para mostrar/ocultar el dropdown custom de materiales
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);

  return (
    <div className="border rounded-lg bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors"
      >
        <span className="font-semibold text-sm text-gray-800">{category}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">({categoryItems.length} items)</span>
          {isVisible ?
            <ChevronUpIcon className="h-5 w-5 text-gray-600" /> :
            <ChevronDownIcon className="h-5 w-5 text-gray-600" />
          }
        </div>
      </button>

      {isVisible && (
        <div className="p-6 border-t space-y-6">
          <div className="space-y-4">
            {fieldAnalysis.hasNames && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                {/* Si la categoría es MATERIALES, renderiza un dropdown custom con imagen y nombre */}
                {category.toString().toUpperCase() === 'MATERIALES' ? (
                  <div className="relative">
                    <button
                      type="button"
                      className="w-full flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-left"
                      onClick={() => setShowMaterialDropdown(v => !v)}
                    >
                      {(() => {
                        const selected = categoryItems.find(i => i.name === selection.name);
                        return selected && selected.imageUrl ? (
                          <img src={selected.imageUrl} alt={selected.name} className="h-8 w-8 object-contain rounded border mr-2" />
                        ) : null;
                      })()}
                      <span className="truncate flex-1">{selection.name || '-- Seleccionar Nombre --'}</span>
                      <ChevronDownIcon className="h-4 w-4 ml-2 text-gray-400" />
                    </button>
                    {showMaterialDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {uniqueNames.map(name => {
                          const item = categoryItems.find(i => i.name === name);
                          return (
                            <div
                              key={name}
                              className={`flex items-center px-3 py-2 cursor-pointer hover:bg-indigo-50 ${selection.name === name ? 'bg-indigo-100' : ''}`}
                              onClick={() => {
                                handleSelectionChange({ target: { name: 'name', value: name } });
                                setShowMaterialDropdown(false);
                              }}
                            >
                              {item && item.imageUrl && (
                                <img src={item.imageUrl} alt={item.name} className="h-8 w-8 object-contain rounded border mr-2" />
                              )}
                              <span className="truncate">{name}</span>
                            </div>
                          );
                        })}
                        {/* Solo muestra "PERSONALIZADO" si la categoría NO es MATERIALES ni LABOR */}
                        {category.toString().toUpperCase() !== 'MATERIALES' && category.toString().toUpperCase() !== 'LABOR' && (
                          <div
                            className="flex items-center px-3 py-2 cursor-pointer hover:bg-yellow-50 bg-yellow-50 font-medium"
                            onClick={() => {
                              handleSelectionChange({ target: { name: 'name', value: 'OTROS' } });
                              setShowMaterialDropdown(false);
                            }}
                          >
                            <span>PERSONALIZADO</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <select
                    name="name"
                    value={selection.name}
                    onChange={handleSelectionChange}
                    disabled={category.toUpperCase() === 'LABOR'}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">-- Seleccionar Nombre --</option>
                    {uniqueNames.map(name =>
                      <option key={name} value={name}>{name}</option>
                    )}
                    {category.toUpperCase() !== 'LABOR' && (
                      <option value="OTROS" className="bg-yellow-50 font-medium">
                        PERSONALIZADO
                      </option>
                    )}
                  </select>
                )}
              </div>
            )}


            {fieldAnalysis.hasMarcas && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                  {uniqueMarcas.length > 0 && <span className="text-red-500">*</span>}
                </label>
                {uniqueMarcas.length > 0 ? (
                  <select
                      name="marca"
                      value={selection.marca}
                      onChange={handleSelectionChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">-- Seleccionar Marca --</option>
                      {uniqueMarcas.map(marca =>
                        <option key={marca} value={marca}>{marca}</option>
                      )}
                      <option value="OTROS" className="bg-yellow-50 font-medium">
                        PERSONALIZADO
                      </option>
                    </select>
                ) : (
                  <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-500 italic">
                    {selection.name ? 'Seleccione un nombre para ver marcas' : 'No hay marcas disponibles'}
                  </div>
                )}
              </div>
            )}

            {fieldAnalysis.hasCapacities && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacidad/Tamaño
                  {uniqueCapacities.length > 0 && <span className="text-red-500">*</span>}
                </label>
                {uniqueCapacities.length > 0 ? (
                  <select
                      name="capacity"
                      value={selection.capacity}
                      onChange={handleSelectionChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">-- Seleccionar Capacidad --</option>
                      {uniqueCapacities.map(capacity =>
                        <option key={capacity} value={capacity}>{capacity}</option>
                      )}
                      <option value="OTROS" className="bg-yellow-50 font-medium">
                        PERSONALIZADO
                      </option>
                    </select>
                ) : (
                  <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-500 italic">
                    {!selection.name ? 'Seleccione un nombre' :
                      !selection.marca && fieldAnalysis.hasMarcas ? 'Seleccione una marca' :
                        'No hay capacidades disponibles'
                    }
                  </div>
                )}
              </div>
            )}

            {fieldAnalysis.hasDescriptions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                  {uniqueDescriptions.length > 0 && <span className="text-red-500">*</span>}
                </label>
                {uniqueDescriptions.length > 0 ? (
                  <select 
                      name="description" 
                      value={selection.description} 
                      onChange={handleSelectionChange} 
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Seleccionar Descripción --</option>
                      {uniqueDescriptions.map(description => 
                        <option key={description} value={description}>{description}</option>
                      )}
                      {/* Solo muestra PERSONALIZADO si la categoría NO es MATERIALES ni LABOR */}
                      {category.toString().toUpperCase() !== 'MATERIALES' && category.toString().toUpperCase() !== 'LABOR' && (
                        <option value="OTROS" className="bg-yellow-50 font-medium">
                          PERSONALIZADO
                        </option>
                      )}
                    </select>
                ) : (
                  <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-500 italic">
                    {!selection.name ? 
                      'Seleccione un nombre' :
                      !selection.marca && fieldAnalysis.hasMarcas ? 
                      'Seleccione una marca' :
                      !selection.capacity && fieldAnalysis.hasCapacities ? 
                      'Seleccione una capacidad' :
                      'No hay descripciones disponibles'
                    }
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={selection.name === 'OTROS' ? customItem.quantity : selection.quantity}
                onChange={selection.name === 'OTROS' ? handleCustomChange : handleSelectionChange}
                min="1"
                max="999"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500"
                placeholder="1"
              />
            </div>
          </div>

          {/* SECCIÓN DE CAMPOS PERSONALIZADOS */}
         {(selection.name === 'OTROS' ||
            (fieldAnalysis.hasMarcas && selection.marca === 'OTROS') ||
            (fieldAnalysis.hasCapacities && selection.capacity === 'OTROS') ||
            (fieldAnalysis.hasDescriptions && selection.description === 'OTROS')) && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-4">
                <h3 className="text-sm font-semibold text-yellow-800">
                  Detalles Personalizados para {category}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Item <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Ej: Tanque especial"
                      value={customItem.name}
                      onChange={handleCustomChange}
                      className="w-full px-3 py-2 text-sm border border-yellow-300 rounded-md focus:ring-1 focus:ring-yellow-500"
                    />
                  </div>
                  
                  {fieldAnalysis.hasMarcas && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Marca/Tipo
                      </label>
                      <input
                        type="text"
                        name="marca"
                        placeholder="Ej: Marca especial"
                        value={customItem.marca}
                        onChange={handleCustomChange}
                        className="w-full px-3 py-2 text-sm border border-yellow-300 rounded-md focus:ring-1 focus:ring-yellow-500"
                      />
                    </div>
                  )}

                  {fieldAnalysis.hasCapacities && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Capacidad/Tamaño
                      </label>
                      <input
                        type="text"
                        name="capacity"
                        placeholder="Ej: 1000L"
                        value={customItem.capacity}
                        onChange={handleCustomChange}
                        className="w-full px-3 py-2 text-sm border border-yellow-300 rounded-md focus:ring-1 focus:ring-yellow-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Precio Unitario ($) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="unitPrice"
                      placeholder="0.00"
                      value={customItem.unitPrice}
                      onChange={handleCustomChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 text-sm border border-yellow-300 rounded-md focus:ring-1 focus:ring-yellow-500"
                    />
                  </div>

                  {fieldAnalysis.hasDescriptions && (
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción
                      </label>
                      <textarea
                        name="description"
                        placeholder="Descripción detallada..."
                        value={customItem.description}
                        onChange={handleCustomChange}
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-yellow-300 rounded-md focus:ring-1 focus:ring-yellow-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAddItem}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
            >
              Agregar {category}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicCategorySection;
