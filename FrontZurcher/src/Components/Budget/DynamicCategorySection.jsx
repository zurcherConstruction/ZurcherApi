import React, { useState, useMemo } from 'react';
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
    quantity: 1
  });
  const [customItem, setCustomItem] = useState({
    name: '',
    marca: '',
    capacity: '',
    description: '',
    unitPrice: 0,
    quantity: 1
  });

  // Obtener todos los items de esta categoría
  const categoryItems = useMemo(() =>
    normalizedCatalog
      .filter(i => i.category === category)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [normalizedCatalog, category]
  );

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
      .sort();
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
    setSelection(prev => {
      const newState = { ...prev, [name]: value };
      // Reset dependent fields only if those fields exist
      if (name === 'name') {
        if (fieldAnalysis.hasMarcas) newState.marca = '';
        if (fieldAnalysis.hasCapacities) newState.capacity = '';
        if (fieldAnalysis.hasDescriptions) newState.description = ''; // ✅ RESET DESCRIPTION
      }
      if (name === 'marca') {
        if (fieldAnalysis.hasCapacities) newState.capacity = '';
        if (fieldAnalysis.hasDescriptions) newState.description = ''; // ✅ RESET DESCRIPTION
      }
      if (name === 'capacity' && fieldAnalysis.hasDescriptions) {
        newState.description = ''; // ✅ RESET DESCRIPTION
      }
      return newState;
    });

    if (value !== 'OTROS') {
      setCustomItem({ name: '', marca: '', capacity: '', description: '', unitPrice: 0, quantity: 1 });
    }
  };

  const handleCustomChange = (e) => {
    const { name, value } = e.target;
    const isNumeric = ['unitPrice', 'quantity'].includes(name);
    setCustomItem(prev => ({
      ...prev,
      [name]: isNumeric ? parseFloat(value) || 0 : value
    }));
  };

  // MODIFICAR handleAddItem para incluir description (líneas ~120-180):

  const handleAddItem = () => {
    // Determinar si es item personalizado
    const isCustom = selection.name === 'OTROS' ||
      (fieldAnalysis.hasMarcas && selection.marca === 'OTROS') ||
      (fieldAnalysis.hasCapacities && selection.capacity === 'OTROS') ||
      (fieldAnalysis.hasDescriptions && selection.description === 'OTROS'); // ✅ AGREGAR

    if (isCustom) {
      // Validar item personalizado
      if (!customItem.name || customItem.unitPrice <= 0) {
        alert("Por favor complete Nombre y Precio del item personalizado.");
        return;
      }

      // Agregar item personalizado
      onAddItem({
        _tempId: generateTempId(),
        budgetItemId: null,
        name: customItem.name.toUpperCase(),
        category: category,
        marca: customItem.marca.toUpperCase(),
        capacity: customItem.capacity.toUpperCase(),
        description: customItem.description.toUpperCase(), // ✅ AGREGAR
        unitPrice: customItem.unitPrice,
        quantity: customItem.quantity,
        notes: 'Item Personalizado',
      });

      // Reset forms
      setCustomItem({ name: '', marca: '', capacity: '', description: '', unitPrice: 0, quantity: 1 });
      setSelection({ name: '', marca: '', capacity: '', description: '', quantity: 1 });
    } else {
      // Agregar item del catálogo
      if (!selection.name) {
        alert("Por favor seleccione un item.");
        return;
      }

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
      onAddItem({
        category: category,
        name: foundItem.name,
        marca: foundItem.marca || '',
        capacity: foundItem.capacity || '',
        description: foundItem.description || '', // ✅ AGREGAR
        quantity: selection.quantity,
      });

      setSelection({ name: '', marca: '', capacity: '', description: '', quantity: 1 });
    }
  };

  if (categoryItems.length === 0) return null; // No mostrar si no hay items

  // ✅ DETERMINAR LAYOUT DINÁMICO BASADO EN CAMPOS DISPONIBLES
  // MODIFICAR el conteo de campos disponibles (líneas ~150-160):

  const availableFieldsCount = [
    fieldAnalysis.hasNames,
    fieldAnalysis.hasMarcas && uniqueMarcas.length > 0,
    fieldAnalysis.hasCapacities && uniqueCapacities.length > 0,
    fieldAnalysis.hasDescriptions && uniqueDescriptions.length > 0, // ✅ AGREGAR DESCRIPTION
    true // Quantity siempre está presente
  ].filter(Boolean).length;

  // Ajustar grid según número de campos
  const gridCols = availableFieldsCount <= 2 ? 'grid-cols-2' :
    availableFieldsCount === 3 ? 'grid-cols-3' :
      availableFieldsCount === 4 ? 'grid-cols-2' : 'grid-cols-2';

  // REEMPLAZAR el return del componente DynamicCategorySection (líneas ~200-350):

  return (
    <div className="border rounded-lg bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors"
      >
        <span className="font-semibold text-sm text-gray-800">{category}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">({categoryItems.length} items)</span>
          {isVisible ?
            <ChevronUpIcon className="h-5 w-5 text-gray-600" /> :
            <ChevronDownIcon className="h-5 w-5 text-gray-600" />
          }
        </div>
      </button>

      {isVisible && (
        <div className="p-4 border-t">
          {/* ✅ INFORMACIÓN DE DEBUG MEJORADA */}
          {/* <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-800 mb-1">
              {category} - {categoryItems.length} items disponibles
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {fieldAnalysis.hasNames && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Nombres</span>
              )}
              {fieldAnalysis.hasDescriptions && (
                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">Descripciones</span>
              )}
              {fieldAnalysis.hasMarcas && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Marcas/Tipos</span>
              )}
              {fieldAnalysis.hasCapacities && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">Capacidades</span>
              )}
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">Cantidad</span>
            </div>
          </div> */}

          {/* ✅ GRID DINÁMICO CON MEJOR ESPACIADO */}
          <div className={`grid ${gridCols} gap-4`}>

            {/* ✅ CAMPO NOMBRE (siempre disponible si hasNames) */}
            {fieldAnalysis.hasNames && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Nombre del Item
                  <span className="text-red-500">*</span>
                </label>
                <select
                  name="name"
                  value={selection.name}
                  onChange={handleSelectionChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="">-- Seleccionar Nombre --</option>
                  {uniqueNames.map(name =>
                    <option key={name} value={name}>{name}</option>
                  )}
                  <option value="OTROS" className="bg-yellow-50 font-medium">
                    PERSONALIZADO (Escribir manualmente)
                  </option>
                </select>
                {selection.name && (
                  <p className="text-xs text-gray-500">
                    Seleccionado: <span className="font-medium">{selection.name}</span>
                  </p>
                )}
              </div>
            )}

            {/* ✅ CAMPO MARCA/TIPO (solo si la categoría tiene marcas Y hay opciones) */}
            {fieldAnalysis.hasMarcas && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Marca/Tipo
                  {uniqueMarcas.length > 0 && <span className="text-red-500">*</span>}
                </label>
                {uniqueMarcas.length > 0 ? (
                  <>
                    <select
                      name="marca"
                      value={selection.marca}
                      onChange={handleSelectionChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="">-- Seleccionar Marca --</option>
                      {uniqueMarcas.map(marca =>
                        <option key={marca} value={marca}>{marca}</option>
                      )}
                      <option value="OTROS" className="bg-yellow-50 font-medium">
                        PERSONALIZADO
                      </option>
                    </select>
                    {selection.marca && (
                      <p className="text-xs text-gray-500">
                        Marca: <span className="font-medium">{selection.marca}</span>
                      </p>
                    )}
                  </>
                ) : (
                  <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-600">
                    {selection.name ?
                      'Primero selecciona un nombre' :
                      'No hay marcas disponibles'
                    }
                  </div>
                )}
              </div>
            )}

            {/* ✅ CAMPO CAPACIDAD (solo si la categoría tiene capacidades Y hay opciones) */}
            {fieldAnalysis.hasCapacities && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Capacidad/Tamaño
                  {uniqueCapacities.length > 0 && <span className="text-red-500">*</span>}
                </label>
                {uniqueCapacities.length > 0 ? (
                  <>
                    <select
                      name="capacity"
                      value={selection.capacity}
                      onChange={handleSelectionChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="">-- Seleccionar Capacidad --</option>
                      {uniqueCapacities.map(capacity =>
                        <option key={capacity} value={capacity}>{capacity}</option>
                      )}
                      <option value="OTROS" className="bg-yellow-50 font-medium">
                        PERSONALIZADO
                      </option>
                    </select>
                    {selection.capacity && (
                      <p className="text-xs text-gray-500">
                        Capacidad: <span className="font-medium">{selection.capacity}</span>
                      </p>
                    )}
                  </>
                ) : (
                  <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-600">
                    {!selection.name ?
                      'Primero selecciona un nombre' :
                      !selection.marca && fieldAnalysis.hasMarcas ?
                        'Primero selecciona una marca' :
                        'No hay capacidades disponibles'
                    }
                  </div>
                )}
              </div>
            )}
              {fieldAnalysis.hasDescriptions && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Descripción
                  {uniqueDescriptions.length > 0 && <span className="text-red-500">*</span>}
                </label>
                {uniqueDescriptions.length > 0 ? (
                  <>
                    <select 
                      name="description" 
                      value={selection.description} 
                      onChange={handleSelectionChange} 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="">-- Seleccionar Descripción --</option>
                      {uniqueDescriptions.map(description => 
                        <option key={description} value={description}>{description}</option>
                      )}
                      <option value="OTROS" className="bg-yellow-50 font-medium">
                        PERSONALIZADO
                      </option>
                    </select>
                    {selection.description && (
                      <p className="text-xs text-gray-500">
                        Descripción: <span className="font-medium">{selection.description}</span>
                      </p>
                    )}
                  </>
                ) : (
                  <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-600">
                    {!selection.name ? 
                      'Primero selecciona un nombre' :
                      !selection.marca && fieldAnalysis.hasMarcas ? 
                      'Primero selecciona una marca' :
                      !selection.capacity && fieldAnalysis.hasCapacities ? 
                      'Primero selecciona una capacidad' :
                      'No hay descripciones disponibles'
                    }
                  </div>
                )}
              </div>
            )}

            {/* ✅ CAMPO CANTIDAD (siempre presente) */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Cantidad
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={selection.name === 'OTROS' ? customItem.quantity : selection.quantity}
                onChange={selection.name === 'OTROS' ? handleCustomChange : handleSelectionChange}
                min="1"
                max="999"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="1"
              />
              <p className="text-xs text-gray-500">
                Unidades a agregar
              </p>
            </div>
          </div>

          {/* ✅ SECCIÓN DE CAMPOS PERSONALIZADOS (solo si se seleccionó OTROS) */}
         {(selection.name === 'OTROS' ||
  (fieldAnalysis.hasMarcas && selection.marca === 'OTROS') ||
  (fieldAnalysis.hasCapacities && selection.capacity === 'OTROS') ||
  (fieldAnalysis.hasDescriptions && selection.description === 'OTROS')) && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-semibold text-yellow-800">
                    Detalles Personalizados para {category}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nombre personalizado */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Nombre del Item <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Ej: Tanque especial, Tubería custom..."
                      value={customItem.name}
                      onChange={handleCustomChange}
                      className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                  </div>
                  {fieldAnalysis.hasDescriptions && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Descripción
                      </label>
                      <textarea
                        name="description"
                        placeholder="Ej: Descripción detallada del item..."
                        value={customItem.description}
                        onChange={handleCustomChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      />
                    </div>
                  )}

                  {/* Marca personalizada (solo si la categoría maneja marcas) */}
                  {fieldAnalysis.hasMarcas && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Marca/Tipo
                      </label>
                      <input
                        type="text"
                        name="marca"
                        placeholder="Ej: Marca especial, Tipo custom..."
                        value={customItem.marca}
                        onChange={handleCustomChange}
                        className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      />
                    </div>
                  )}

                  {/* Capacidad personalizada (solo si la categoría maneja capacidades) */}
                  {fieldAnalysis.hasCapacities && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Capacidad/Tamaño
                      </label>
                      <input
                        type="text"
                        name="capacity"
                        placeholder="Ej: 1000L, 24 pulgadas, Custom..."
                        value={customItem.capacity}
                        onChange={handleCustomChange}
                        className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      />
                    </div>
                  )}

                  {/* Precio unitario */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
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
                      className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                  </div>
                </div>
              </div>
            )}

          {/* ✅ BOTÓN DE AGREGAR MEJORADO */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleAddItem}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
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
