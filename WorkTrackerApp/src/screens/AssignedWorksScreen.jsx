import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchWorks } from '../Redux/Actions/workActions';
import { View, Text, FlatList } from 'react-native';

const AssignedWorksScreen = () => {
  const dispatch = useDispatch();
  const { works, loading, error } = useSelector((state) => state.work);
  const { staff } = useSelector((state) => state.auth);

  useEffect(() => {
    if (staff) {
      dispatch(fetchWorks(staff.idStaff));
    }
  }, [dispatch, staff]);

  if (loading) {
    return <Text style={{ textAlign: 'center', fontSize: 18, color: 'blue' }}>Cargando...</Text>;
  }

  if (error) {
    return <Text style={{ textAlign: 'center', fontSize: 18, color: 'red' }}>Error: {error}</Text>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f4f6', padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#2563eb', marginBottom: 20, textAlign: 'center' }}>
        Trabajos Asignados
      </Text>
      <FlatList
        data={works}
        keyExtractor={(item) => item.idWork.toString()}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 16, padding: 16, backgroundColor: 'white', borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 8 }}>
              {item.propertyAddress || 'Dirección no disponible'}
            </Text>
            <Text style={{ fontSize: 14, color: '#4b5563', marginBottom: 4 }}>
              <Text style={{ fontWeight: 'bold', color: '#374151' }}>Estado:</Text> {item.status || 'Sin estado'}
            </Text>
            <Text style={{ fontSize: 14, color: '#4b5563' }}>
              <Text style={{ fontWeight: 'bold', color: '#374151' }}>Notas:</Text> {item.notes || 'Sin notas'}
            </Text>
          </View>
        )}
      />
    </View>
  );
};

export default AssignedWorksScreen;