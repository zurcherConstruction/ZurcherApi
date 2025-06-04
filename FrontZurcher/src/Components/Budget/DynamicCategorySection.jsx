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
    quantity: 1 
  });
  const [customItem, setCustomItem] = useState({ 
    name: '', 
    marca: '', 
    capacity: '', 
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
    
    return {
      hasNames,
      hasMarcas,
      hasCapacities,
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

  const handleSelectionChange = (e) => {
    const { name, value } = e.target;
    setSelection(prev => {
      const newState = { ...prev, [name]: value };
      // Reset dependent fields only if those fields exist
      if (name === 'name') { 
        if (fieldAnalysis.hasMarcas) newState.marca = ''; 
        if (fieldAnalysis.hasCapacities) newState.capacity = ''; 
      }
      if (name === 'marca' && fieldAnalysis.hasCapacities) { 
        newState.capacity = ''; 
      }
      return newState;
    });
    
    if (value !== 'OTROS') {
      setCustomItem({ name: '', marca: '', capacity: '', unitPrice: 0, quantity: 1 });
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

  const handleAddItem = () => {
    // Determinar si es item personalizado
    const isCustom = selection.name === 'OTROS' || 
                    (fieldAnalysis.hasMarcas && selection.marca === 'OTROS') || 
                    (fieldAnalysis.hasCapacities && selection.capacity === 'OTROS');

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
        unitPrice: customItem.unitPrice,
        quantity: customItem.quantity,
        notes: 'Item Personalizado',
      });

      // Reset forms
      setCustomItem({ name: '', marca: '', capacity: '', unitPrice: 0, quantity: 1 });
      setSelection({ name: '', marca: '', capacity: '', quantity: 1 });
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
        
        return match;
      });

      if (!foundItem) {
        alert("No se encontró el item seleccionado en el catálogo.");
        console.error("Búsqueda fallida:", {
          selection,
          fieldAnalysis,
          availableItems: categoryItems.map(i => ({ name: i.name, marca: i.marca, capacity: i.capacity }))
        });
        return;
      }

      // Usar la función de agregar del componente padre
      onAddItem({
        category: category,
        name: foundItem.name,
        marca: foundItem.marca || '',
        capacity: foundItem.capacity || '',
        quantity: selection.quantity,
      });

      setSelection({ name: '', marca: '', capacity: '', quantity: 1 });
    }
  };

  if (categoryItems.length === 0) return null; // No mostrar si no hay items

  // ✅ DETERMINAR LAYOUT DINÁMICO BASADO EN CAMPOS DISPONIBLES
  const availableFieldsCount = [
    fieldAnalysis.hasNames,
    fieldAnalysis.hasMarcas && uniqueMarcas.length > 0,
    fieldAnalysis.hasCapacities && uniqueCapacities.length > 0,
    true // Quantity siempre está presente
  ].filter(Boolean).length;

  // Ajustar grid según número de campos
  const gridCols = availableFieldsCount <= 2 ? 'grid-cols-2' : 
                   availableFieldsCount === 3 ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <div className="border rounded bg-white">
      <button 
        type="button" 
        onClick={onToggle} 
        className="w-full flex justify-between items-center p-2 bg-gray-100 hover:bg-gray-200 rounded-t"
      >
        <span className="font-medium text-sm">{category}</span>
        {isVisible ? 
          <ChevronUpIcon className="h-5 w-5 text-gray-600" /> : 
          <ChevronDownIcon className="h-5 w-5 text-gray-600" />
        }
      </button>
      
      {isVisible && (
        <fieldset className="p-2 border-t">
          {/* Debug info mejorado */}
          <div className="mb-2 p-2 bg-gray-50 rounded">
            <p className="text-xs text-gray-600 font-medium">
              Items disponibles ({categoryItems.length}):
            </p>
            <p className="text-xs text-gray-500">
              {categoryItems.slice(0, 2).map(item => {
                let display = item.name;
                if (fieldAnalysis.hasMarcas && item.marca) display += ` (${item.marca})`;
                if (fieldAnalysis.hasCapacities && item.capacity) display += ` [${item.capacity}]`;
                return display;
              }).join(', ')}
              {categoryItems.length > 2 && '...'}
            </p>
            <p className="text-xs text-blue-500 mt-1">
              Campos: {fieldAnalysis.hasNames ? 'Nombres' : ''} 
              {fieldAnalysis.hasMarcas ? ' | Marcas' : ''} 
              {fieldAnalysis.hasCapacities ? ' | Capacidades' : ''}
            </p>
          </div>
          
          <div className={`grid ${gridCols} gap-2 items-end`}>
            {/* Name - Solo mostrar si hay nombres */}
            {fieldAnalysis.hasNames && (
              <div>
                <label className="block text-xs font-medium text-gray-600">Name</label>
                <select 
                  name="name" 
                  value={selection.name} 
                  onChange={handleSelectionChange} 
                  className="input-style"
                >
                  <option value="">Select Name</option>
                  {uniqueNames.map(name => 
                    <option key={name} value={name}>{name}</option>
                  )}
                  <option value="OTROS">OTROS (Manual)</option>
                </select>
              </div>
            )}

            {/* Marca - Solo mostrar si la categoría tiene marcas Y hay marcas para el nombre seleccionado */}
            {fieldAnalysis.hasMarcas && uniqueMarcas.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600">Brand/Type</label>
                <select 
                  name="marca" 
                  value={selection.marca} 
                  onChange={handleSelectionChange} 
                  className="input-style"
                >
                  <option value="">Select Brand</option>
                  {uniqueMarcas.map(marca => 
                    <option key={marca} value={marca}>{marca}</option>
                  )}
                  <option value="OTROS">OTROS (Manual)</option>
                </select>
              </div>
            )}

            {/* Capacity - Solo mostrar si la categoría tiene capacidades Y hay capacidades disponibles */}
            {fieldAnalysis.hasCapacities && uniqueCapacities.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600">Capacity</label>
                <select 
                  name="capacity" 
                  value={selection.capacity} 
                  onChange={handleSelectionChange} 
                  className="input-style"
                >
                  <option value="">Select Capacity</option>
                  {uniqueCapacities.map(capacity => 
                    <option key={capacity} value={capacity}>{capacity}</option>
                  )}
                  <option value="OTROS">OTROS (Manual)</option>
                </select>
              </div>
            )}

            {/* Quantity - Siempre presente */}
            <div>
              <label className="block text-xs font-medium text-gray-600">Quantity</label>
              <input 
                type="number" 
                name="quantity" 
                value={selection.name === 'OTROS' ? customItem.quantity : selection.quantity} 
                onChange={selection.name === 'OTROS' ? handleCustomChange : handleSelectionChange} 
                min="1" 
                className="input-style" 
              />
            </div>

            {/* Custom Fields - Solo mostrar si se seleccionó OTROS en algún campo disponible */}
            {(selection.name === 'OTROS' || 
              (fieldAnalysis.hasMarcas && selection.marca === 'OTROS') || 
              (fieldAnalysis.hasCapacities && selection.capacity === 'OTROS')) && (
              <>
                <div className={`col-span-${availableFieldsCount <= 2 ? '2' : availableFieldsCount === 3 ? '3' : '2'} border-t mt-2 pt-2`}>
                  <p className="text-xs font-semibold text-blue-600 mb-1">
                    Detalles Personalizados ({category}):
                  </p>
                </div>
                
                {/* Campos personalizados adaptativos */}
                <div>
                  <label className="block text-xs font-medium text-gray-600">Nombre</label>
                  <input 
                    type="text" 
                    name="name" 
                    placeholder="Nombre del item" 
                    value={customItem.name} 
                    onChange={handleCustomChange} 
                    className="input-style" 
                  />
                </div>
                
                {fieldAnalysis.hasMarcas && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Marca/Tipo</label>
                    <input 
                      type="text" 
                      name="marca" 
                      placeholder="Marca o tipo" 
                      value={customItem.marca} 
                      onChange={handleCustomChange} 
                      className="input-style" 
                    />
                  </div>
                )}
                
                {fieldAnalysis.hasCapacities && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Capacidad</label>
                    <input 
                      type="text" 
                      name="capacity" 
                      placeholder="Capacidad" 
                      value={customItem.capacity} 
                      onChange={handleCustomChange} 
                      className="input-style" 
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-medium text-gray-600">Precio Unitario</label>
                  <input 
                    type="number" 
                    name="unitPrice" 
                    placeholder="0.00" 
                    value={customItem.unitPrice} 
                    onChange={handleCustomChange} 
                    min="0" 
                    step="0.01" 
                    className="input-style" 
                  />
                </div>
              </>
            )}

            {/* Add Button */}
            <button 
              type="button" 
              onClick={handleAddItem} 
              className={`button-add-item col-span-${availableFieldsCount <= 2 ? '2' : availableFieldsCount === 3 ? '3' : '2'} mt-2`}
            >
              Add {category}
            </button>
          </div>
        </fieldset>
      )}
    </div>
  );
};

export default DynamicCategorySection;