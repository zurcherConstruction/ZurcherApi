import React, { useEffect, useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchAssignedWorks } from "../Redux/Actions/workActions";
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from "react-native";
import UploadScreen from "./UploadScreen";
import { createStackNavigator } from "@react-navigation/stack";
import Ionicons from 'react-native-vector-icons/Ionicons';

const Stack = createStackNavigator();

// Función para obtener el estilo del item basado en el estado
const getItemStyleByStatus = (status) => {
  let backgroundColor = '#ffffff'; // Blanco por defecto (e.g., inProgress)
  let textColor = '#1f2937'; // Tailwind gray-800
  let borderColor = '#e5e7eb'; // Tailwind gray-300

  switch (status) {
    case 'maintenance':
      backgroundColor = '#dcfce7'; // Tailwind green-100
      borderColor = '#22c55e';     // Tailwind green-500
      textColor = '#166534';       // Tailwind green-800
      break;
    case 'firstInspectionPending':
      backgroundColor = '#fef9c3'; // Tailwind yellow-100
      borderColor = '#facc15';     // Tailwind yellow-400
      textColor = '#854d0e';       // Tailwind yellow-800
      break;
    case 'coverPending':
      backgroundColor = '#ede9fe'; // Tailwind violet-100 (como sustituto de marrón claro)
      borderColor = '#8b5cf6';     // Tailwind violet-500
      textColor = '#5b21b6';       // Tailwind violet-700
      break;
      case 'covered': // <-- NUEVO ESTADO Y COLOR
      backgroundColor = '#cffafe'; // Tailwind cyan-100
      borderColor = '#22d3ee';     // Tailwind cyan-400
      textColor = '#0e7490';       // Tailwind cyan-700
      break;
    case 'rejectedInspection':
    case 'finalRejected':
      backgroundColor = '#fee2e2'; // Tailwind red-100
      borderColor = '#ef4444';     // Tailwind red-500
      textColor = '#991b1b';       // Tailwind red-800
      break;
    case 'inProgress': // Explícitamente blanco o un gris muy claro si se prefiere
      backgroundColor = '#f9fafb'; // Tailwind gray-50
      borderColor = '#d1d5db';     // Tailwind gray-300
      textColor = '#374151';       // Tailwind gray-700
      break;
    default: // Otros estados
      backgroundColor = '#ffffff';
      borderColor = '#d1d5db';
      textColor = '#374151';
      break;
  }
  return { backgroundColor, textColor, borderColor };
};

const AllWorksListComponent = ({ navigation }) => {
  const dispatch = useDispatch();
  const { staff } = useSelector((state) => state.auth);
  const staffId = staff?.idStaff;

  const [searchQuery, setSearchQuery] = useState('');
  const { works, loading: reduxLoading, error } = useSelector((state) => state.work);

  useEffect(() => {
    if (staffId) {
      dispatch(fetchAssignedWorks(staffId)); // Reutilizamos la acción, ya que trae todas las asignadas
    }
  }, [dispatch, staffId]);

  const processedWorks = useMemo(() => {
    if (!works) return [];

    let worksToDisplay = [...works]; // Copiar para no mutar el estado original

    // 1. Ordenar por fecha (más reciente primero)
    // Usaremos 'startDate' o 'createdAt'. Ajusta si tienes otro campo de fecha relevante.
    worksToDisplay.sort((a, b) => {
      const dateA = new Date(a.startDate || a.createdAt || 0);
      const dateB = new Date(b.startDate || b.createdAt || 0);
      return dateB - dateA; // Descendente para más reciente primero
    });

    // 2. Filtrar por búsqueda si existe
    if (!searchQuery) return worksToDisplay;
    
    const lowerCaseQuery = searchQuery.toLowerCase();
    return worksToDisplay.filter(work =>
      work.propertyAddress?.toLowerCase().includes(lowerCaseQuery)
    );
  }, [works, searchQuery]);

  const isLoading = reduxLoading;

  if (isLoading && !error) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text style={styles.loadingText}>Cargando todas tus obras...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!isLoading && processedWorks.length === 0) {
    return (
      <View style={styles.containerFlex}>
         <View style={styles.searchBarContainer}>
           <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
           <TextInput
             placeholder="Buscar por dirección..."
             value={searchQuery}
             onChangeText={setSearchQuery}
             style={styles.searchInput}
             placeholderTextColor="#6b7280"
             clearButtonMode="while-editing"
           />
         </View>
        <View style={styles.centeredContainerFlex1}>
            <Text style={styles.emptyText}>
            {searchQuery
                ? `No se encontraron obras para "${searchQuery}".`
                : "No tienes obras asignadas."}
            </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.containerFlex}>
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          placeholder="Buscar por dirección..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          placeholderTextColor="#6b7280"
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        data={processedWorks}
        keyExtractor={(item) => item.idWork.toString()}
        renderItem={({ item }) => {
          const { backgroundColor, textColor, borderColor } = getItemStyleByStatus(item.status);
          return (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("UploadScreenForMyAllWorks", { // Ruta única para este stack
                  idWork: item.idWork,
                  propertyAddress: item.propertyAddress,
                })
              }
              style={[
                styles.itemContainer,
                { backgroundColor, borderColor }
              ]}
            >
              <Text style={[styles.itemAddress, { color: textColor }]}>
                {item.propertyAddress || "Dirección no disponible"}
              </Text>
              <Text style={[styles.itemStatus, { color: textColor }]}>
                <Text style={[styles.itemStatusLabel, { color: textColor }]}>Estado:</Text>{" "}
                {item.status || "Sin estado"}
              </Text>
            
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.listContentContainer}
      />
    </View>
  );
};

const AllMyWorksScreen = () => { // Este es el Stack Navigator que se exportará
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="AllMyWorksList"
        component={AllWorksListComponent}
        options={{ title: 'Todas Mis Obras' }}
      />
      <Stack.Screen
        name="UploadScreenForMyAllWorks" // Nombre de ruta único
        component={UploadScreen}
        options={({ route }) => ({
          title: route.params?.propertyAddress || 'Cargar Imágenes',
        })}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  containerFlex: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  centeredContainerFlex1: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#1e3a8a',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
  },
  emptyText: {
    fontSize: 17,
    color: '#4b5563',
    textAlign: 'center',
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#111827',
  },
  itemContainer: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    // Sombras sutiles
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.00,
    elevation: 1,
  },
  itemAddress: {
    fontSize: 17,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  itemStatus: {
    fontSize: 14,
    marginBottom: 4,
  },
  itemStatusLabel: {
    fontWeight: 'bold',
  },
  itemDate: {
    fontSize: 12,
    opacity: 0.8,
  },
  listContentContainer: {
    paddingBottom: 16,
  },
});

export default AllMyWorksScreen;