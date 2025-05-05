import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchAssignedWorks } from "../Redux/Actions/workActions";
import { View, Text, FlatList, TouchableOpacity, Platform, ActivityIndicator} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import UploadScreen from "./UploadScreen";
import { createStackNavigator } from "@react-navigation/stack";

const Stack = createStackNavigator();

const AssignedWorksScreen = ({staffId}) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const { works, loading: reduxLoading, error } = useSelector((state) => state.work);

  useEffect(() => {
    if (staffId) {
      dispatch(fetchAssignedWorks(staffId)); // Filtrar trabajos por staffId
    }
  }, [dispatch, staffId]);



  useEffect(() => {
    console.log("Datos de trabajos asignados:", works);
  }, [works]);

  const handleOpenPdf = async (pdfData) => {
      try {
        // Verificar si el pdfData es un objeto con una propiedad `data` o si ya es una cadena base64
        const base64Pdf =
          pdfData?.data
            ? Buffer.from(pdfData.data).toString("base64") // Si es un objeto con `data`, convertirlo a base64
            : pdfData.startsWith("data:application/pdf;base64,")
            ? pdfData.split(",")[1] // Si ya es una cadena base64, extraer la parte después de "base64,"
            : null;
    
        if (!base64Pdf) {
          throw new Error("El PDF no está en un formato válido.");
        }
    
        const fileUri = `${FileSystem.cacheDirectory}temp.pdf`;
    
        // Guardar el PDF en el sistema de archivos
        await FileSystem.writeAsStringAsync(fileUri, base64Pdf, {
          encoding: FileSystem.EncodingType.Base64,
        });
    
        console.log("PDF guardado en:", fileUri);
    
        // Abrir el PDF según la plataforma
        if (Platform.OS === "android") {
          const contentUri = await FileSystem.getContentUriAsync(fileUri);
    
          const intent = {
            action: "android.intent.action.VIEW",
            data: contentUri,
            flags: 1,
            type: "application/pdf",
          };
    
          await IntentLauncher.startActivityAsync(
            "android.intent.action.VIEW",
            intent
          );
        } else if (Platform.OS === "ios") {
          await Sharing.shareAsync(fileUri, {
            mimeType: "application/pdf",
            dialogTitle: "Compartir PDF",
            UTI: "com.adobe.pdf",
          });
        }
      } catch (error) {
        console.error("Error al abrir el PDF:", error);
      }
    };

  // const handleUploadImages = (idWork) => {
  //   navigation.navigate("UploadScreen", { idWork });
  // };
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
  if (!isLoading && (!works || works.length === 0)) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <Text className="text-lg text-gray-600">
          No tienes trabajos pendientes de instalación.
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
        <View className="flex-1 bg-gray-100 p-5">
              <FlatList
            data={works}
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

                {/* --- Botones PDF (siguen comentados) --- */}
                {/* {(item.Permit?.pdfData || item.Permit?.optionalDocs) && (
                  <View className="mt-2">
                    ... (botones PDF) ...
                  </View>
                )} */}

                {/* --- ELIMINAR ESTE BOTÓN --- */}
                {/*
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("UploadScreen", {
                      idWork: item.idWork,
                      propertyAddress: item.propertyAddress,
                      images: item.images,
                    })
                  }
                  className="mt-2 py-2 px-4 bg-green-500 rounded"
                >
                  <Text className="text-white text-center">Upload Images</Text>
                </TouchableOpacity>
                */}
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