import React, { useEffect, useState, useMemo } from "react";
import moment from "moment-timezone";
import { useSelector, useDispatch } from "react-redux";
import { fetchAssignedWorks } from "../Redux/Actions/workActions";
import { fetchAssignedMaintenances } from "../Redux/features/maintenanceSlice";
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import UploadScreen from "./UploadScreen";
import MaintenanceFormScreen from "./MaintenanceFormScreen"; // ✅ Formulario nativo de mantenimiento
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useAutoRefresh} from '../utils/useAutoRefresh'; // Importa el hook de auto-refresh
// --- 1. Mover la creación del Stack fuera del componente ---
const Stack = createNativeStackNavigator();

const statusTranslations = {
  pending: "Pendiente",
  assigned: "Asignado",
  inProgress: "En Progreso",
  installed: "Instalado",
  firstInspectionPending: "1ª Inspección Pendiente",
  approvedInspection: "Inspección Aprobada",
  rejectedInspection: "Inspección Rechazada",
  coverPending: "Listo Para Cubrir",
  covered: "Cubierto",
  invoiceFinal: "Factura Final",
  paymentReceived: "Pago Recibido",
  finalInspectionPending: "Inspección Final Pendiente",
  finalApproved: "Aprobado Final",
  finalRejected: "Rechazado Final",
  maintenance: "Mantenimiento",
  maintenance_visit: "Visita de Mantenimiento", // Nuevo status para visitas
};

const WorksListScreen = ({ navigation }) => { // Recibe navigation como prop
  const dispatch = useDispatch();
  const { staff } = useSelector((state) => state.auth);
  const staffId = staff?.id; // Usar staff.id en lugar de idStaff

  const [searchQuery, setSearchQuery] = useState('');
  const { works, loading: reduxLoading, error, lastUpdate } = useSelector((state) => state.work);
  const { assignedMaintenances, loadingAssigned } = useSelector((state) => state.maintenance);
  
  // Auto-refresh: 5 minutos (más lento para reducir carga en el servidor)
  const refreshInterval = 300000; // 5 minutos = 300,000 ms
  const { forceRefresh } = useAutoRefresh(refreshInterval);
  
  // 🔧 Solo en desarrollo - evita logs masivos en producción
  if (__DEV__) {
    console.log("WorksListScreen - Total works:", works?.length || 0);
    console.log("WorksListScreen - Total maintenances:", assignedMaintenances?.length || 0);
  }
  
  useEffect(() => {
    if (staffId) {
      dispatch(fetchAssignedWorks(staffId));
      dispatch(fetchAssignedMaintenances(staffId)); // Cargar también mantenimientos
    }
  }, [dispatch, staffId]);

  const filteredWorks = useMemo(() => {
    if (!works) return [];

    const allowedStatuses = ['assigned', 'inProgress', 'coverPending', 'rejectedInspection', 'maintenance'];

    // Filtrar trabajos normales por estados permitidos
    const worksWithAllowedStatus = works.filter(work =>
      allowedStatuses.includes(work.status)
    );

    // Convertir visitas de mantenimiento a formato compatible con works
    const maintenanceItems = (assignedMaintenances || []).map(visit => ({
      idWork: `maintenance-${visit.id}`, // ID único para el FlatList
      propertyAddress: visit.work?.Permit?.propertyAddress || 'Dirección no disponible',
      status: 'maintenance_visit', // Status especial para identificar mantenimientos
      visitNumber: visit.visitNumber,
      scheduledDate: visit.scheduledDate,
      startDate: visit.scheduledDate, // Usar scheduledDate como startDate para ordenamiento
      maintenanceVisit: visit, // Guardar datos completos de la visita
      budget: {
        applicantName: visit.work?.Permit?.applicant || 'Cliente no disponible'
      }
    }));

    // Combinar trabajos normales y visitas de mantenimiento
    let combinedItems = [...worksWithAllowedStatus, ...maintenanceItems];

    // Filtrar por búsqueda si existe
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      combinedItems = combinedItems.filter(work =>
        work.propertyAddress?.toLowerCase().includes(lowerCaseQuery)
      );
    }

    // ✅ ORDENAR POR FECHA: Más reciente primero (descendente)
    combinedItems.sort((a, b) => {
      const dateA = new Date(a.startDate || a.scheduledDate || 0);
      const dateB = new Date(b.startDate || b.scheduledDate || 0);
      return dateB - dateA; // Orden descendente (más reciente primero)
    });

    return combinedItems;
  }, [works, assignedMaintenances, searchQuery]);
  // --- Estados de carga, error, etc. (sin cambios significativos) ---
  const isLoading = reduxLoading || loadingAssigned;

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

const renderHeader = () => (
    <View className="p-4 bg-white border-b border-gray-200">
      <View className="flex-row items-center mb-2">
        <Ionicons name="search" size={20} color="gray" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Buscar por dirección..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="flex-1 h-10 text-base"
          clearButtonMode="while-editing"
        />
        <TouchableOpacity 
          onPress={forceRefresh}
          className="ml-2 p-2 bg-blue-100 rounded-lg"
        >
          <Ionicons name="refresh" size={20} color="#1e3a8a" />
        </TouchableOpacity>
      </View>
      {lastUpdate && (
        <Text className="text-xs text-gray-500 text-center">
          Última actualización: {new Date(lastUpdate).toLocaleTimeString()}
        </Text>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-100">
      {renderHeader()}
      <FlatList
        data={filteredWorks}
        keyExtractor={(item) => item.idWork.toString()}
        renderItem={({ item }) => {
          // Determinar si es mantenimiento o trabajo regular
          const isMaintenance = item.status === 'maintenance_visit';
          
          // Determinar el color de fondo de la tarjeta
          let cardBackgroundColor = 'bg-white';
          if (item.status === 'rejectedInspection') {
            cardBackgroundColor = 'bg-red-200'; // Rojo claro para inspección rechazada
          } else if (isMaintenance) {
            cardBackgroundColor = 'bg-orange-50'; // Naranja suave para mantenimientos
          }

          // Determinar el color de fondo y texto para el tag de estado
          let statusTagBackgroundColor = 'bg-sky-800';
          let statusTagTextColor = 'text-gray-200';

          if (item.status === 'rejectedInspection') {
            statusTagBackgroundColor = 'bg-red-600'; // Rojo más oscuro para el tag
            statusTagTextColor = 'text-white';    // Texto blanco para contraste
          } else if (isMaintenance) {
            statusTagBackgroundColor = 'bg-orange-600'; // Naranja para mantenimiento
            statusTagTextColor = 'text-white';
          }
          
          return (
            <TouchableOpacity
              onPress={() => {
                if (__DEV__) {
                  console.log('🔍 Item clicked:', {
                    idWork: item.idWork,
                    status: item.status,
                    isMaintenance,
                    hasMaintenanceVisit: !!item.maintenanceVisit
                  });
                }
                
                if (isMaintenance) {
                  if (__DEV__) {
                    console.log('🔧 Navigating to MaintenanceFormScreen');
                  }
                  navigation.navigate("MaintenanceFormScreen", {
                    visit: item.maintenanceVisit,
                  });
                } else {
                  if (__DEV__) {
                    console.log('📸 Navigating to UploadScreen');
                  }
                  navigation.navigate("UploadScreen", {
                    idWork: item.idWork,
                    propertyAddress: item.propertyAddress,
                  });
                }
              }}
              className={`mb-4 p-4 rounded-lg shadow mx-2 mt-2 ${cardBackgroundColor}`}
            >
              <View className="flex-row items-center mb-2">
                {isMaintenance && (
                  <Ionicons name="construct" size={20} color="#f97316" style={{ marginRight: 8 }} />
                )}
                <Text className="text-lg font-semibold uppercase text-gray-800 flex-1">
                  {item.propertyAddress || "Dirección no disponible"}
                </Text>
              </View>
              <Text className={`text-sm font-semibold uppercase p-1 text-center mb-2 rounded-md ${statusTagBackgroundColor} ${statusTagTextColor}`}>
                {statusTranslations[item.status] || item.status || "Estado no definido"}
              </Text>
              <Text className="text-sm text-blue-600 mb-2">
                <Text className="font-bold text-gray-700">
                  {isMaintenance ? "Fecha Mantenimiento:" : "Fecha Instalación:"}
                </Text>{" "}
                {isMaintenance
                  ? (item.scheduledDate
                      ? moment.tz(item.scheduledDate, "America/New_York").format("MM-DD-YYYY HH:mm")
                      : "Sin fecha programada")
                  : (item.startDate
                      ? moment.tz(item.startDate, "America/New_York").format("MM-DD-YYYY HH:mm")
                      : "Sin Fecha de instalación")}
              </Text>
              {isMaintenance && item.visitNumber && (
                <Text className="text-sm text-gray-600">
                  <Text className="font-bold">Visita #:</Text> {item.visitNumber}
                </Text>
              )}
            </TouchableOpacity>
          );
        }}
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
      <Stack.Screen
        name="MaintenanceFormScreen"
        component={MaintenanceFormScreen} // ✅ Formulario nativo de mantenimiento
        options={({ route }) => ({
          title: route.params?.visit?.work?.Permit?.propertyAddress || 'Maintenance Form',
        })}
      />
    </Stack.Navigator>
  );
};

// --- 3. Exportar el NAVIGATOR ---
export default AssignedWorksStackNavigator; // Exportar el navegador