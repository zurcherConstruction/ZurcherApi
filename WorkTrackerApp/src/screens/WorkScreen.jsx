import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWorks } from '../Redux/Actions/workActions';

const WorksScreen = () => {
  const dispatch = useDispatch();
  const { works, loading, error } = useSelector((state) => state.work);
  const { staff } = useSelector((state) => state.auth);
  const [selectedWorkId, setSelectedWorkId] = useState(null);
  
  useEffect(() => {
    if (staff) {
      dispatch(fetchWorks(staff.idStaff)); // recuerda que en login guardas staff.idStaff o staff.id según corresponda  
    }
  }, [dispatch, staff]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-blue-500 text-lg">Cargando...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-red-500 text-lg">Error: {error}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100 p-5">
      <Text className="text-3xl font-extrabold text-blue-600 mb-5 text-center">
        Trabajos Asignados
      </Text>
      
      {/* Si quieres usar un select para elegir una obra */}
      <View className="border border-gray-300 rounded-lg mb-5">
        <Picker
          selectedValue={selectedWorkId}
          onValueChange={(itemValue) => setSelectedWorkId(itemValue)}>
          <Picker.Item label="Selecciona una obra" value={null} />
          {works.map((work) => (
            <Picker.Item
              key={work.idWork}
              label={work.propertyAddress || 'Sin dirección'}
              value={work.idWork}
            />
          ))}
        </Picker>
      </View>
      
      {/* Mostrar detalles de la obra seleccionada o listar todas */}
      {selectedWorkId ? (
        <FlatList
          data={works.filter(work => work.idWork === selectedWorkId)}
          keyExtractor={(item) => item.idWork.toString()}
          renderItem={({ item }) => (
            <View className="mb-4 p-5 bg-white shadow-md rounded-lg">
              <Text className="text-xl font-semibold text-gray-800 mb-2">
                {item.propertyAddress || 'Dirección no disponible'}
              </Text>
              <Text className="text-sm text-gray-600 mb-1">
                <Text className="font-bold text-gray-700">Estado:</Text> {item.status || 'Sin estado'}
              </Text>
              <Text className="text-sm text-gray-600">
                <Text className="font-bold text-gray-700">Notas:</Text> {item.notes || 'Sin notas'}
              </Text>
            </View>
          )}
        />
      ) : (
        // Si no se selecciona una obra, puedes listar todas
        <FlatList
          data={works}
          keyExtractor={(item) => item.idWork.toString()}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedWorkId(item.idWork)}
              className="mb-4 p-5 bg-white shadow-md rounded-lg"
            >
              <Text className="text-xl font-semibold text-gray-800 mb-2">
                {item.propertyAddress || 'Dirección no disponible'}
              </Text>
              <Text className="text-sm text-gray-600 mb-1">
                <Text className="font-bold text-gray-700">Estado:</Text> {item.status || 'Sin estado'}
              </Text>
              <Text className="text-sm text-gray-600">
                <Text className="font-bold text-gray-700">Notas:</Text> {item.notes || 'Sin notas'}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
};

export default WorksScreen;