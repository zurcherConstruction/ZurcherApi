import React, { useState, useRef, useEffect } from 'react';
import api from '../../utils/axios';

const MentionTextarea = ({ value, onChange, placeholder, rows = 3, maxLength = 5000, className = '' }) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);

  // Cargar lista de staff al montar
  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      console.log('🔍 Cargando staff para menciones...');
      const response = await api.get('/budget-notes/staff/active');
      console.log('✅ Staff cargado:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        setStaffList(response.data);
        console.log(`📋 ${response.data.length} staff disponibles`);
      } else {
        console.warn('⚠️ Respuesta de staff no es un array:', response.data);
        setStaffList([]);
      }
    } catch (error) {
      console.error('❌ Error al cargar staff:', error);
      console.error('Detalles:', error.response?.data || error.message);
      setStaffList([]);
    }
  };

  // Detectar @ y mostrar autocompletado
  const handleTextChange = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(cursorPos);

    // Buscar @ antes del cursor
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      
      // Si no hay espacios después de @, es una mención en progreso
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearch(textAfterAt);
        setShowMentions(true);
        
        // Filtrar staff por nombre
        const filtered = staffList.filter(staff =>
          staff.name.toLowerCase().includes(textAfterAt.toLowerCase())
        );
        setFilteredStaff(filtered);
        setSelectedIndex(0);
        return;
      }
    }
    
    setShowMentions(false);
  };

  // Seleccionar mención con click o Enter
  const selectMention = (staff) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    const newText = 
      value.substring(0, lastAtIndex) + 
      `@${staff.name} ` + 
      textAfterCursor;
    
    onChange(newText);
    setShowMentions(false);
    
    // Devolver foco al textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = lastAtIndex + staff.name.length + 2;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Navegar con teclado
  const handleKeyDown = (e) => {
    if (!showMentions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < filteredStaff.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter' && filteredStaff.length > 0) {
      e.preventDefault();
      selectMention(filteredStaff[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
      />

      {/* Dropdown de menciones */}
      {showMentions && filteredStaff.length > 0 && (
        <div className="absolute z-50 w-64 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <div className="px-2 py-1 text-xs text-gray-500 bg-gray-50 border-b">
            {filteredStaff.length} {filteredStaff.length === 1 ? 'resultado' : 'resultados'}
          </div>
          {filteredStaff.map((staff, index) => (
            <div
              key={staff.id}
              onClick={() => selectMention(staff)}
              className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                index === selectedIndex ? 'bg-blue-100' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
                  {staff.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-sm">{staff.name}</div>
                  <div className="text-xs text-gray-500">{staff.role || 'Staff'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Debug info */}
      {showMentions && filteredStaff.length === 0 && (
        <div className="absolute z-50 w-64 mt-1 bg-white border border-yellow-300 rounded-lg shadow-lg p-3">
          <div className="text-xs text-yellow-700">
            No se encontraron coincidencias para "{mentionSearch}"
            <br />
            <span className="text-gray-500">Staff total: {staffList.length}</span>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-1">
        {value.length}/{maxLength} caracteres • Usa @ para mencionar {staffList.length > 0 && `(${staffList.length} disponibles)`}
      </p>
    </div>
  );
};

export default MentionTextarea;
