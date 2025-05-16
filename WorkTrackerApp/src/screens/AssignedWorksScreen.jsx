import React, { useEffect, useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchAssignedWorks } from "../Redux/Actions/workActions";
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import UploadScreen from "./UploadScreen";
import { createStackNavigator } from "@react-navigation/stack";
import Ionicons from 'react-native-vector-icons/Ionicons';

// --- 1. Mover la creación del Stack fuera del componente ---
const Stack = createStackNavigator();

const WorksListScreen = ({ navigation }) => { // Recibe navigation como prop
  const dispatch = useDispatch();
  const { staff } = useSelector((state) => state.auth);
  const staffId = staff?.idStaff;

  const [searchQuery, setSearchQuery] = useState('');
  const { works, loading: reduxLoading, error } = useSelector((state) => state.work);
  console.log("WorksListScreen works", works);
  useEffect(() => {
    if (staffId) {
      dispatch(fetchAssignedWorks(staffId));
    }
  }, [dispatch, staffId]);

  const filteredWorks = useMemo(() => {
    if (!works) return [];

    const allowedStatuses = ['inProgress', 'coverPending', 'rejectedInspection'];

    // Primero, filtrar por los estados permitidos
    const worksWithAllowedStatus = works.filter(work =>
      allowedStatuses.includes(work.status)
    );

    // Luego, si hay una búsqueda, filtrar por la dirección
    if (!searchQuery) return worksWithAllowedStatus;

    const lowerCaseQuery = searchQuery.toLowerCase();
    return worksWithAllowedStatus.filter(work =>
      work.propertyAddress?.toLowerCase().includes(lowerCaseQuery)
    );
  }, [works, searchQuery]);
  // --- Estados de carga, error, etc. (sin cambios significativos) ---
  const isLoading = reduxLoading;

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
        <View className="p-4 bg-white border-b border-gray-200 flex-row items-center w-full mb-5">
          <Ionicons name="search" size={20} color="gray" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Buscar por dirección..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 h-10 text-base"
            clearButtonMode="while-editing"
          />
        </View>
        <Text className="text-lg text-gray-600 text-center">
          {searchQuery
            ? `No se encontraron trabajos asignados para "${searchQuery}".`
            : "No tienes trabajos pendientes de instalación."}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <View className="p-4 bg-white border-b border-gray-200 flex-row items-center">
        <Ionicons name="search" size={20} color="gray" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Buscar por dirección..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="flex-1 h-10 text-base"
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        data={filteredWorks}
        keyExtractor={(item) => item.idWork.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("UploadScreen", {
                idWork: item.idWork,
                propertyAddress: item.propertyAddress,
                // NO pasar item.images ni item.Permit si no están completos aquí
              })
            }
            className="mb-4 p-4 bg-white rounded-lg shadow mx-2 mt-2"
          >
            <Text className="text-lg font-semibold uppercase text-gray-800 mb-2">
              {item.propertyAddress || "Dirección no disponible"}
            </Text>
            <Text className="text-sm text-blue-600 mb-2">
              <Text className="font-bold text-gray-700">Fecha Instalacion:</Text>{" "}
              {item.startDate
                ? new Intl.DateTimeFormat('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(item.startDate))
                : "Sin Fecha de instalación"}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 10 }}
      />
    </View>
  );
};

const AssignedWorksStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="WorksList" // Nombre de la pantalla de lista
        component={WorksListScreen} // Componente que muestra la lista
        options={{ title: 'Works Assigned' }}
      />
      <Stack.Screen
        name="UploadScreen"
        component={UploadScreen} // UploadScreen sigue igual
        options={({ route }) => ({
          title: route.params?.propertyAddress || 'Upload Images',
          // Puedes añadir un headerLeft personalizado si necesitas volver
          // a "WorksList" específicamente, aunque el botón "back" estándar debería funcionar.
        })}
      />
    </Stack.Navigator>
  );
};

// --- 3. Exportar el NAVIGATOR ---
export default AssignedWorksStackNavigator; // Exportar el navegador