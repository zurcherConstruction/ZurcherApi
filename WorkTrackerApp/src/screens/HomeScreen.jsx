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
   { backend: "assigned", display: "Purchase in Progress" },
  { backend: "inProgress", display: "Installing" },
  { backend: "installed", display: "Inspection Pending" },
  { backend: "approvedInspection", display: "Inspection Approved" }, // Para getDisplayName
  { backend: "coverPending", display: "Cover Pending" },
  { backend: "covered", display: "Send Final Invoice" }, // Esta será la visual para 'covered'
  { backend: "invoiceFinal", display: "Payment Received" },
  { backend: "paymentReceived", display: "Final Inspection Pending" },
  { backend: "finalApproved", display: "Final Insp. Approved" }, // Para getDisplayName
  { backend: "maintenance", display: "Maintenance" },
  // Estados de rechazo no se suelen poner en la línea de progreso visual principal,
  // pero getDisplayName los manejará.
];

// Definir las 8 etapas visuales explícitamente
const visualEtapas = [
  etapas.find(e => e.backend === "assigned"),
  etapas.find(e => e.backend === "inProgress"),
  etapas.find(e => e.backend === "installed"),
  etapas.find(e => e.backend === "coverPending"),
  etapas.find(e => e.backend === "covered" && e.display === "Send Final Invoice"),
  etapas.find(e => e.backend === "invoiceFinal"), // Esta es la etapa "Payment Received"
  etapas.find(e => e.backend === "paymentReceived"), // Esta es la etapa "Final Inspection Pending"
  etapas.find(e => e.backend === "maintenance"),
].filter(Boolean);


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
    let visualStageBackendKey;

    // Mapear el estado actual del trabajo a la clave 'backend' de la etapa visual correspondiente
   if (["installed", "firstInspectionPending", "approvedInspection", "rejectedInspection"].includes(currentWorkStatus)) {
      visualStageBackendKey = "installed";
    } else if (["paymentReceived", "finalInspectionPending", "finalApproved", "finalRejected"].includes(currentWorkStatus)) {
      visualStageBackendKey = "paymentReceived";
    } else if (currentWorkStatus === "invoiceFinal") { // Ser explícito para invoiceFinal
      visualStageBackendKey = "invoiceFinal";
    } else {
      visualStageBackendKey = currentWorkStatus;
    }


    const index = visualEtapas.findIndex((etapa) => etapa && etapa.backend === visualStageBackendKey);
    
    // Para depuración, puedes añadir un console.log aquí:
    // console.log(`HomeScreen - Work Status: ${currentWorkStatus}, VisualKey: ${visualStageBackendKey}, ProgressBarIndex: ${index}`);
    
    return index;
  };

const getDisplayName = (status) => {
    // Busca primero en el array 'etapas' que tiene más definiciones
    const etapaDef = etapas.find((e) => e.backend === status);
    if (etapaDef) return etapaDef.display;

    // Casos especiales para estados que no están en 'etapas' o para darles un nombre específico
    // Asegúrate de que estos no entren en conflicto con los 'display' de 'visualEtapas' si son diferentes.
    if (status === "rejectedInspection") return "Inspection Rejected";
    if (status === "finalRejected") return "Final Insp. Rejected";
    if (status === "approvedInspection") return "Inspection Approved"; // Ya está en etapas
    if (status === "finalApproved") return "Final Insp. Approved"; // Ya está en etapas
    if (status === "covered" && !etapaDef) return "Covered - Awaiting Invoice"; // Fallback si 'covered' no tiene el display esperado

    return "Estado Desconocido";
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

      {!loading && !error && filteredData.map((work) => {
          const { idWork, propertyAddress, status, Permit, Receipts, budget } = work;
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

          // --- ALERTA DE PRESUPUESTO NO FIRMADO ---
          let budgetNotSignedAlert = null;
          if (budget && budget.status !== "signed") {
            budgetNotSignedAlert = (
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 2}}>
                <MaterialIcons name="warning-amber" size={18} color="#f59e0b" style={{marginRight: 4}} />
                <Text style={{color: '#f59e0b', fontSize: 13, fontWeight: 'bold'}}>Presupuesto pendiente de firma</Text>
              </View>
            );
          }

          // --- ALERTA DE INSPECCIÓN INICIAL NO ABONADA ---
          let initialInspectionAlert = null;
          if (["installed", "firstInspectionPending"].includes(status)) {
            const hasInitialInspectionReceipt = Array.isArray(Receipts)
              ? Receipts.some(r => r.type === "Inspección Inicial")
              : false;
            if (!hasInitialInspectionReceipt) {
              initialInspectionAlert = (
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 2}}>
                  <MaterialIcons name="warning-amber" size={18} color="#ef4444" style={{marginRight: 4}} />
                  <Text style={{color: '#ef4444', fontSize: 13, fontWeight: 'bold'}}>No se abonó la Inspección Inicial</Text>
                </View>
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
              {/* Mostrar primero la alerta de presupuesto no firmado, luego la de inspección si corresponde */}
              {budgetNotSignedAlert}
              {initialInspectionAlert}
              <Text style={[styles.statusTextBase, getStatusTextStyle(status)]}>
                Estado: {getDisplayName(status)}
              </Text>

               <View style={styles.progressBarContainer}>
                <View style={styles.progressBarTrack} />
                <View
                  style={[
                    styles.progressBarFill,
                    { width: progressBarIndex >= 0 && visualEtapas.length > 1 ? `${(progressBarIndex / (visualEtapas.length - 1)) * 100}%` : (progressBarIndex >= 0 && visualEtapas.length === 1 ? '100%' : '0%') }
                  ]}
                />
                 {visualEtapas.map((etapa, etapaMapIndex) => {
                  if (!etapa) return null; // Si alguna etapa en visualEtapas es undefined

                  // Determinar si esta etapa del map es la etapa visualmente actual
                  const isCurrentVisualStage = etapaMapIndex === progressBarIndex;
                  // Determinar si esta etapa del map es una etapa completada (anterior a la actual)
                  const isCompletedStage = etapaMapIndex < progressBarIndex;

                  // Color del círculo: verde si está completada o es la actual, sino gris
                  const circleBgStyle = (isCurrentVisualStage || isCompletedStage) ? styles.circleBgGreen : styles.circleBgGray;
                  
                  // Titileo del círculo: solo si es la etapa visualmente actual
                  const isPulsing = isCurrentVisualStage;
                  
                  const etapaKey = String(etapa.backend || `unknown-etapa-${etapaMapIndex}-${Math.random()}`);
                  return (
                    <View key={etapaKey} style={styles.progressStepContainer}>
                      <Animated.View
                        style={[
                          styles.progressCircle,
                          circleBgStyle, // Aplicar el estilo de fondo determinado
                          isPulsing ? pulseStyle : {}, // Aplicar titileo si es la etapa actual
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