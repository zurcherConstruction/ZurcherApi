import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Animated,
  ScrollView,
  Alert,
} from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from "react-redux";
import { fetchWorks } from "../Redux/Actions/workActions";
import { useNavigation } from "@react-navigation/native";

const etapas = [
  { backend: "inProgress", display: "Purchase in Progress" },
  { backend: "installed", display: "Installing" },
  { backend: "firstInspectionPending", display: "Inspection Pending" },
  { backend: "coverPending", display: "Cover Pending" },
  { backend: "invoiceFinal", display: "Send Final Invoice" },
  { backend: "paymentReceived", display: "Payment Received" },
  { backend: "finalInspectionPending", display: "Final Inspection Pending" },
  { backend: "maintenance", display: "Maintenance" },
];

const HomeScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const { works, loading, error } = useSelector((state) => state.work);
  const [search, setSearch] = useState("");
  const [filteredData, setFilteredData] = useState([]);

  const animation = useState(new Animated.Value(0))[0];

  useEffect(() => {
    dispatch(fetchWorks());
  }, [dispatch]);

  useEffect(() => {
    setFilteredData(
      works.filter((work) =>
        work.propertyAddress.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [works, search]);

  const handleSearch = (text) => {
    setSearch(text);
  };

  const getProgressIndex = (status) =>
    etapas.findIndex((etapa) => etapa.backend === status);

  const getDisplayName = (status) => {
    const etapa = etapas.find((etapa) => etapa.backend === status);
    return etapa ? etapa.display : "Unknown Status";
  };

  const filteredEtapas = etapas.filter(
    (etapa) =>
      etapa.backend !== "rejectedInspection" && etapa.backend !== "finalRejected"
  );

  // Function to start the pulsing animation
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1,
          duration: 750,
          useNativeDriver: false,
        }),
        Animated.timing(animation, {
          toValue: 0,
          duration: 750,
          useNativeDriver: false,
        }),
      ])
    ).start();
  };

  useEffect(() => {
    startPulseAnimation();
    return () => {
      animation.stopAnimation(); // Clean up animation on unmount
    };
  }, [animation]);

  // Style for the pulsing effect (applied via style prop as it uses Animated.Value)
  const pulseStyle = {
    transform: [
      {
        scale: animation.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.1, 1],
        }),
      },
    ],
    opacity: animation.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.7, 1, 0.7],
    }),
  };

  return (
    <ScrollView className="flex-1 p-3 bg-gray-100">
      <TextInput
        className="border border-gray-300 p-3 mb-3 rounded-lg bg-white shadow-sm text-base"
        placeholder="Buscar por Dirección"
        value={search}
        onChangeText={handleSearch}
        placeholderTextColor="#9ca3af"
      />

      {loading && (
        <Text className="text-blue-600 text-center text-lg py-4">
          Cargando obras...
        </Text>
      )}
      {error && (
        <Text className="text-red-600 text-center text-lg py-4">
          Error: {error}
        </Text>
      )}

{!loading &&
        !error &&
        filteredData.map(({ idWork, propertyAddress, status, Permit }) => { // Desestructurar Permit
          let permitAlertIcon = null;
          if (Permit) {
            const permitExpStatus = Permit.expirationStatus;
             const permitExpMessage = Permit.expirationMessage; // Puedes usarlo si implementas un Alert onPress

            if (permitExpStatus === "expired" || permitExpStatus === "soon_to_expire") {
              const isError = permitExpStatus === "expired";
              const alertColor = isError ? "#ef4444" : "#f59e0b"; // Rojo para error, Naranja/Amarillo para warning
              
              permitAlertIcon = (
                <Pressable 
                   onPress={() => Alert.alert(isError ? "Permiso Vencido" : "Permiso Próximo a Vencer", permitExpMessage)} // Opcional: mostrar mensaje al presionar
                  style={{ marginLeft: 8 }} // Añade un pequeño margen
                >
                  <MaterialIcons name="warning-amber" size={24} color={alertColor} />
                </Pressable>
              );
            }
          }
          
          const workItemKey = String(idWork || `unknown-work-${Math.random()}`);

          return (
            <Pressable
              key={workItemKey} // Key for the main list item
              className="bg-white p-4 rounded-lg border border-gray-200 mb-3 shadow-md active:bg-gray-100"
              onPress={() => {
                // console.log("Navigating with idWork:", idWork);
                if (idWork) { // Ensure idWork is valid before navigating
                    navigation.navigate("WorkDetail", { idWork });
                } else {
                    console.warn("Attempted to navigate with undefined idWork");
                    Alert.alert("Error", "Cannot open details for this work item.");
                }
              }}
            >
              <View className="flex-row items-center justify-center mb-2">
                <Text className="text-lg font-normal uppercase text-gray-800 text-center">
                  {propertyAddress || "N/A"}
                </Text>
                {permitAlertIcon} 
              </View>
              <Text className="text-sm font-medium text-green-600 text-center mb-4">
                Status: {getDisplayName(status)}
              </Text>

              {/* Progress Bar */}
              <View className="relative flex-row items-center justify-between mt-5 mb-2 h-6">
                <View className="absolute left-0 right-0 top-1/2 h-1 bg-gray-200 rounded-full -translate-y-1/2" />
                <View
                  className="absolute left-0 top-1/2 h-1 bg-green-500 rounded-full -translate-y-1/2 transition-all duration-500"
                  style={{
                    width: `${
                      filteredEtapas.length > 1 ? // Avoid division by zero if only one etapa
                      (getProgressIndex(status) / (filteredEtapas.length - 1)) * 100
                      : (getProgressIndex(status) >= 0 ? 100 : 0) // Handle single etapa case
                    }%`,
                  }}
                />
                {filteredEtapas.map((etapa, index) => {
                  const isActive = getProgressIndex(status) === index;
                  const isCompleted = getProgressIndex(status) > index;
                  const circleBg =
                    isActive || isCompleted ? "bg-green-500" : "bg-gray-400";
                  
                  // Ensure etapa.backend is a string and unique for the key
                  const etapaKey = String(etapa.backend || `unknown-etapa-${index}`);

                  return (
                    <View
                      key={etapaKey} // Key for progress bar steps
                      className="relative flex-1 flex-col items-center"
                    >
                      <Animated.View
                        className={`w-4 h-4 rounded-full justify-center items-center shadow-md ${circleBg}`}
                        style={{
                          top: -8, 
                          position: "absolute",
                          ...(isActive ? pulseStyle : {}),
                        }}
                      >
                        <Text className="text-white font-bold text-xs">
                          {index + 1}
                        </Text>
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

export default HomeScreen;