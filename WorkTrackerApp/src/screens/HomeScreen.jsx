import React, { useEffect, useState, useMemo } from "react"; // Agregado useMemo
import {
  View,
  Text,
  TextInput,
  Pressable,
  Animated,
  ScrollView,
  Alert,
  StyleSheet, // Agregado StyleSheet
} from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from "react-redux";
import { fetchWorks } from "../Redux/Actions/workActions";
import { useNavigation } from "@react-navigation/native";

const etapas = [
  { backend: "inProgress", display: "Purchase in Progress" },
  { backend: "installed", display: "Installing" },
  { backend: "firstInspectionPending", display: "Inspection Pending" },
  { backend: "approvedInspection", display: "Inspection Approved" }, // Añadido para referencia en getDisplayName
  { backend: "coverPending", display: "Cover Pending" },
  { backend: "covered", display: "Covered - Awaiting Final Invoice" }, // <-- ADDED
  { backend: "invoiceFinal", display: "Send Final Invoice" },
  { backend: "paymentReceived", display: "Payment Received" },
  { backend: "finalInspectionPending", display: "Final Inspection Pending" },
  { backend: "finalApproved", display: "Final Insp. Approved" }, // Añadido para referencia
  { backend: "maintenance", display: "Maintenance" },
  // Estados de rechazo no se suelen poner en la línea de progreso visual principal,
  // pero getDisplayName los manejará.
];

// Etapas que se mostrarán visualmente en la barra de progreso
const visualEtapas = etapas.filter(e => ![
    "approvedInspection", // No es una etapa visual separada de firstInspectionPending
    "covered",
    "finalApproved",      // No es una etapa visual separada de finalInspectionPending
    "rejectedInspection",
    "finalRejected"
].includes(e.backend));


const HomeScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const { works, loading, error } = useSelector((state) => state.work);
  const [search, setSearch] = useState("");
  
  const animation = useState(new Animated.Value(0))[0];

  useEffect(() => {
    dispatch(fetchWorks());
  }, [dispatch]);

  const filteredData = useMemo(() => {
    if (!works) return [];
    return works.filter((work) =>
      work.propertyAddress?.toLowerCase().includes(search.toLowerCase())
    );
  }, [works, search]);

  const handleSearch = (text) => {
    setSearch(text);
  };

  const getProgressIndexForBar = (currentWorkStatus) => {
    let statusToFindInVisualEtapas = currentWorkStatus;

    if (currentWorkStatus === "firstInspectionPending" || currentWorkStatus === "rejectedInspection") {
      statusToFindInVisualEtapas = "installed";
    } else if (currentWorkStatus === "approvedInspection") {
      statusToFindInVisualEtapas = "firstInspectionPending";
    } else if (currentWorkStatus === "finalInspectionPending" || currentWorkStatus === "finalRejected") {
      statusToFindInVisualEtapas = "coverPending";
    } else if (currentWorkStatus === "finalApproved") {
      statusToFindInVisualEtapas = "finalInspectionPending";
    } else if (currentWorkStatus === "covered") { // <-- ADDED CONDITION
      statusToFindInVisualEtapas = "coverPending";
    }
    
    const index = visualEtapas.findIndex((etapa) => etapa.backend === statusToFindInVisualEtapas);
    return index;
  };

  const getDisplayName = (status) => {
    const etapaDef = etapas.find((e) => e.backend === status);
    if (etapaDef) return etapaDef.display;

    // Casos especiales no en la lista principal de 'etapas' para display
    if (status === "rejectedInspection") return "Inspection Rejected";
    if (status === "finalRejected") return "Final Insp. Rejected";
    return "Unknown Status";
  };


  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animation, { toValue: 1, duration: 750, useNativeDriver: false }),
        Animated.timing(animation, { toValue: 0, duration: 750, useNativeDriver: false }),
      ])
    ).start();
  };

  useEffect(() => {
    startPulseAnimation();
    return () => animation.stopAnimation();
  }, [animation]);

  const pulseStyle = {
    transform: [{ scale: animation.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.05, 1] }) }],
    // Opacity can be adjusted if needed, but scale is often enough for a subtle pulse
  };

  const getStatusTextStyle = (currentStatus) => {
    if (currentStatus === "rejectedInspection" || currentStatus === "finalRejected") {
      return styles.statusTextRejected;
    }
    if (currentStatus === "firstInspectionPending" || currentStatus === "finalInspectionPending") {
      return styles.statusTextPending;
    }
    if (currentStatus === "approvedInspection" || currentStatus === "finalApproved") {
      return styles.statusTextApproved;
    }
    if (currentStatus === "covered") { // <-- ADDED CONDITION
      return styles.statusTextCovered;
    }
    // Podrías añadir un caso para "Estado Desconocido" si quieres un color específico
    // if (progressBarIndex === -1 && !["firstInspectionPending", ...].includes(currentStatus)) {
    //   return styles.statusTextUnknown;
    // }
    return styles.statusTextDefault; // Verde por defecto para otros estados completados
  };


  return (
    <ScrollView style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar por Dirección"
        value={search}
        onChangeText={handleSearch}
        placeholderTextColor="#9ca3af"
      />

      {loading && <Text style={styles.loadingText}>Cargando obras...</Text>}
      {error && <Text style={styles.errorText}>Error: {error}</Text>}

      {!loading && !error && filteredData.map(({ idWork, propertyAddress, status, Permit }) => {
          let permitAlertIcon = null;
          if (Permit) {
            const permitExpStatus = Permit.expirationStatus;
            const permitExpMessage = Permit.expirationMessage;
            if (permitExpStatus === "expired" || permitExpStatus === "soon_to_expire") {
              const isError = permitExpStatus === "expired";
              const alertColor = isError ? "#ef4444" : "#f59e0b";
              permitAlertIcon = (
                <Pressable onPress={() => Alert.alert(isError ? "Permiso Vencido" : "Permiso Próximo a Vencer", permitExpMessage || (isError ? "El permiso ha vencido." : "El permiso está próximo a vencer."))} style={{ marginLeft: 8 }}>
                  <MaterialIcons name="warning-amber" size={24} color={alertColor} />
                </Pressable>
              );
            }
          }
          
          const workItemKey = String(idWork || `unknown-work-${Math.random()}`);
          const progressBarIndex = getProgressIndexForBar(status);

          return (
            <Pressable
              key={workItemKey}
              style={styles.workItemContainer}
              onPress={() => {
                if (idWork) {
                    navigation.navigate("WorkDetail", { idWork });
                } else {
                    Alert.alert("Error", "No se pueden abrir los detalles para esta obra.");
                }
              }}
            >
              <View style={styles.workItemHeader}>
                <Text style={styles.addressText}>{propertyAddress || "N/A"}</Text>
                {permitAlertIcon} 
              </View>
              <Text style={[styles.statusTextBase, getStatusTextStyle(status)]}>
                Estado: {getDisplayName(status)}
              </Text>

              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarTrack} />
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${visualEtapas.length > 1 ? (progressBarIndex / (visualEtapas.length - 1)) * 100 : (progressBarIndex >= 0 ? 100 : 0)}%` }
                  ]}
                />
                 {visualEtapas.map((etapa, etapaMapIndex) => {
                  let circleBgClassName = styles.circleBgGray;
                  let isPulsing = false;

                  if (progressBarIndex >= 0 && etapaMapIndex < progressBarIndex) {
                    circleBgClassName = styles.circleBgGreen;
                  } else if (progressBarIndex >= 0 && etapaMapIndex === progressBarIndex) {
                    circleBgClassName = styles.circleBgGreen;
                  }

                  if (etapa.backend === "firstInspectionPending") {
                    if (status === "firstInspectionPending") { circleBgClassName = styles.circleBgYellow; isPulsing = true; }
                    else if (status === "rejectedInspection") { circleBgClassName = styles.circleBgRed; isPulsing = true; }
                    else if (status === "approvedInspection") { circleBgClassName = styles.circleBgGreen; isPulsing = true; }
                  } else if (etapa.backend === "finalInspectionPending") {
                    if (status === "finalInspectionPending") { circleBgClassName = styles.circleBgYellow; isPulsing = true; }
                    else if (status === "finalRejected") { circleBgClassName = styles.circleBgRed; isPulsing = true; }
                    else if (status === "finalApproved") { circleBgClassName = styles.circleBgGreen; isPulsing = true; }
                  }
                  
                  // Pulsing logic for the current visual step if not handled by inspection logic
                  if (progressBarIndex === etapaMapIndex && !isPulsing) {
                    const isInspectionVisualStep = etapa.backend === "firstInspectionPending" || etapa.backend === "finalInspectionPending";
                    if (!isInspectionVisualStep) {
                      if (status === etapa.backend) { // Actual status matches this linear visual step
                        isPulsing = true;
                      } else if (etapa.backend === "coverPending" && status === "covered") { // Specific case for 'covered'
                        isPulsing = true;
                      }
                    }
                  }
                  const etapaKey = String(etapa.backend || `unknown-etapa-${etapaMapIndex}`);
                  return (
                    <View key={etapaKey} style={styles.progressStepContainer}>
                      <Animated.View
                        style={[
                          styles.progressCircle,
                          circleBgClassName,
                          isPulsing ? pulseStyle : {},
                        ]}
                      >
                        <Text style={styles.progressCircleText}>{etapaMapIndex + 1}</Text>
                      </Animated.View>
                    </View>
                  );
                })}
              </View>
            </Pressable>
          );
        })}
    </ScrollView>
  );
};

// --- ESTILOS ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12, // Equivalente a p-3
    backgroundColor: '#f3f4f6', // bg-gray-100
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db', // border-gray-300
    padding: 12, // p-3
    marginBottom: 12, // mb-3
    borderRadius: 8, // rounded-lg
    backgroundColor: '#ffffff', // bg-white
    fontSize: 16, // text-base
    // shadow-sm (elevation para Android, shadow para iOS)
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.00,
  },
  loadingText: {
    color: '#2563eb', // text-blue-600
    textAlign: 'center',
    fontSize: 18, // text-lg
    paddingVertical: 16, // py-4
  },
  errorText: {
    color: '#dc2626', // text-red-600
    textAlign: 'center',
    fontSize: 18, // text-lg
    paddingVertical: 16, // py-4
  },
  workItemContainer: {
    backgroundColor: '#ffffff', // bg-white
    padding: 16, // p-4
    borderRadius: 8, // rounded-lg
    borderWidth: 1,
    borderColor: '#e5e7eb', // border-gray-200
    marginBottom: 12, // mb-3
    // shadow-md
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
  },
  workItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8, // mb-2
  },
  addressText: {
    fontSize: 18, // text-lg
    // fontWeight: 'normal', // font-normal (default)
    textTransform: 'uppercase',
    color: '#374151', // text-gray-800
    textAlign: 'center',
  },
  statusTextBase: { // Estilo base para el texto del estado
    fontSize: 14, // text-sm
    textAlign: 'center',
    marginBottom: 16, // mb-4
    fontWeight: '500', // font-medium
  },
  statusTextDefault: { // Verde por defecto
    color: '#16a34a', // text-green-600
  },
  statusTextApproved: {
    color: '#16a34a', // text-green-600
  },
  statusTextPending: {
    color: '#f59e0b', // text-yellow-500 (o un naranja más visible si se prefiere)
  },
  statusTextRejected: {
    color: '#dc2626', // text-red-600
  },
  statusTextCovered: { // <-- ADDED STYLE
    color: '#0e7490', // Tailwind cyan-700 (consistent with AllMyWorksScreen)
  },
  // statusTextUnknown: { color: '#4b5563' /* text-gray-600 */ },
  progressBarContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Cambiado para distribuir los puntos
    marginTop: 20, // mt-5
    marginBottom: 8, // mb-2
    height: 24, // h-6
  },
  progressBarTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 4, // Ajustado para ser más visible
    backgroundColor: '#e5e7eb', // bg-gray-200
    borderRadius: 2, // rounded-full
    transform: [{ translateY: -2 }], // -translate-y-1/2 (aproximado)
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: '50%',
    height: 4, // Ajustado
    backgroundColor: '#22c55e', // bg-green-500
    borderRadius: 2, // rounded-full
    transform: [{ translateY: -2 }], // -translate-y-1/2 (aproximado)
    // transition-all duration-500 (no es directo en RN, la animación de width es más compleja)
  },
  progressStepContainer: { // Contenedor para cada círculo
    position: 'relative', // Para posicionar el círculo
    flex: 1, // Para que se distribuyan equitativamente
    alignItems: 'center', // Centrar el círculo
  },
  progressCircle: {
    width: 24, // w-6 (ajustado para mejor visibilidad del número)
    height: 24, // h-6 (ajustado)
    borderRadius: 12, // rounded-full
    justifyContent: 'center',
    alignItems: 'center',
    // shadow-md
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,
    // top: -8 (se maneja por el layout del contenedor padre)
    // position: 'absolute' (ya no es necesario si el padre es flex y centra)
  },
  progressCircleText: {
    color: '#ffffff', // text-white
    fontWeight: 'bold',
    fontSize: 10, // text-xs
  },
  // Clases de color para los círculos
  circleBgGray: { backgroundColor: '#9ca3af' /* bg-gray-400 */ },
  circleBgGreen: { backgroundColor: '#22c55e' /* bg-green-500 */ },
  circleBgYellow: { backgroundColor: '#f59e0b' /* bg-yellow-400 o similar */ },
  circleBgRed: { backgroundColor: '#ef4444' /* bg-red-500 */ },
});

export default HomeScreen;