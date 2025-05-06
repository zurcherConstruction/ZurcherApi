import React, { useEffect, useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchAssignedWorks } from "../Redux/Actions/workActions";
import { View, Text, FlatList, TouchableOpacity,TextInput, ActivityIndicator} from "react-native";
import UploadScreen from "./UploadScreen";
import { createStackNavigator } from "@react-navigation/stack";
import Ionicons from 'react-native-vector-icons/Ionicons'; 

const Stack = createStackNavigator();

const AssignedWorksScreen = ({staffId}) => {
  const dispatch = useDispatch();
 
  const [searchQuery, setSearchQuery] = useState('');
  const { works, loading: reduxLoading, error } = useSelector((state) => state.work);

  useEffect(() => {
    if (staffId) {
      dispatch(fetchAssignedWorks(staffId)); // Filtrar trabajos por staffId
    }
  }, [dispatch, staffId]);

 // --- Filtrar trabajos basados en la búsqueda ---
 const filteredWorks = useMemo(() => {
  if (!works) return [];
  if (!searchQuery) return works; // Si no hay búsqueda, mostrar todos

  const lowerCaseQuery = searchQuery.toLowerCase();
  return works.filter(work =>
    work.propertyAddress?.toLowerCase().includes(lowerCaseQuery)
  );
}, [works, searchQuery]);
// --- ---

  useEffect(() => {
    console.log("Datos de trabajos asignados:", works);
  }, [works]);


  const isLoading = reduxLoading || !works;

  if (isLoading && !error) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text className="text-lg text-blue-600 mt-4">Cargando trabajos asignados...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <Text className="text-lg text-red-600">Error: {error}</Text>
      </View>
    );
  }
  if (!isLoading && filteredWorks.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100 p-5">
        <Text className="text-lg text-gray-600 text-center">
          {searchQuery
            ? `No se encontraron trabajos asignados para "${searchQuery}".`
            : "No tienes trabajos pendientes de instalación."}
        </Text>
      </View>
    );
  }
  

  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
    <Stack.Screen
      name=" Works Assigned"
     
    >
      {({ navigation }) => (
       <View className="flex-1 bg-gray-100">
       {/* --- Barra de Búsqueda --- */}
       <View className="p-4 bg-white border-b border-gray-200 flex-row items-center">
         <Ionicons name="search" size={20} color="gray" style={{ marginRight: 8 }} />
         <TextInput
           placeholder="Buscar por dirección..."
           value={searchQuery}
           onChangeText={setSearchQuery}
           className="flex-1 h-10 text-base" // Ajusta estilos según necesites
           clearButtonMode="while-editing" // Botón para limpiar (iOS)
         />
       </View>
              <FlatList
            data={filteredWorks} 
            keyExtractor={(item) => item.idWork.toString()}
            renderItem={({ item }) => (
              // --- Envolver toda la tarjeta en TouchableOpacity ---
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("UploadScreen", {
                    idWork: item.idWork,
                    propertyAddress: item.propertyAddress,
                    images: item.images, // Asegúrate de que 'images' esté incluido en los datos de 'works'
                  })
                }
                className="mb-4 p-4 bg-white rounded-lg shadow" // Mover estilos al TouchableOpacity
              >
                {/* --- Contenido de la tarjeta (sin cambios) --- */}
                <Text className="text-lg font-semibold uppercase text-gray-800 mb-2">
                  {item.propertyAddress || "Dirección no disponible"}
                </Text>
                <Text className="text-sm text-gray-600 mb-2">
                  <Text className="font-bold text-gray-700">Estado:</Text>{" "}
                  {item.status || "Sin estado"}
                </Text>

               
              </TouchableOpacity> // --- Fin TouchableOpacity ---
            )}
          />
        </View>
      )}
    </Stack.Screen>
    <Stack.Screen name="UploadScreen" component={UploadScreen} />
  </Stack.Navigator>
  );
};

export default AssignedWorksScreen;