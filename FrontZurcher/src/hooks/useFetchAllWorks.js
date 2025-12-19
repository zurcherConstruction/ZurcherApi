/**
 * Hook personalizado para obtener TODOS los trabajos de manera eficiente
 * Reutilizable en cualquier componente que necesite la lista completa
 */
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { fetchWorks } from '../Redux/Actions/workActions';

export const useFetchAllWorks = (dependencies = []) => {
  const dispatch = useDispatch();
  const hasFetched = useRef(false);

  useEffect(() => {
    const fetchAllWorksData = async () => {
      try {
        console.log('🚀 useFetchAllWorks: Obteniendo todos los trabajos...');
        
        // ✅ Usar el parámetro especial "all" para obtener todos los registros
        const response = await dispatch(fetchWorks(1, 'all'));
        
        console.log('✅ useFetchAllWorks: Total obtenidos:', response?.works?.length || 0);
        
        hasFetched.current = true;
        return response;
      } catch (error) {
        console.error('❌ useFetchAllWorks error:', error);
        // Fallback: intentar con límite alto
        try {
          return await dispatch(fetchWorks(1, 2000));
        } catch (fallbackError) {
          console.error('❌ useFetchAllWorks fallback error:', fallbackError);
        }
      }
    };

    fetchAllWorksData();
  }, dependencies);

  return hasFetched.current;
};

export default useFetchAllWorks;