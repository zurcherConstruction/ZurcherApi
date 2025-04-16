import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchAssignedWorks } from "../Redux/Actions/workActions";
import { View, Text, FlatList, TouchableOpacity, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import UploadScreen from "./UploadScreen";
import { createStackNavigator } from "@react-navigation/stack";

const Stack = createStackNavigator();

const AssignedWorksScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const { works, loading, error } = useSelector((state) => state.work);

  useEffect(() => {
    dispatch(fetchAssignedWorks());
  }, [dispatch]);

  useEffect(() => {
    console.log("Datos de trabajos asignados:", works);
  }, [works]);

  const handleOpenPdf = async (pdfData) => {
    try {
      const base64Pdf = Buffer.from(pdfData.data).toString("base64");
      const fileUri = `${FileSystem.cacheDirectory}temp.pdf`;

      await FileSystem.writeAsStringAsync(fileUri, base64Pdf, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log("PDF guardado en:", fileUri);

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

  const handleUploadImages = (idWork) => {
    navigation.navigate("UploadScreen", { idWork });
  };

  if (loading) {
    return (
      <Text className="text-center text-lg text-blue-600">Cargando...</Text>
    );
  }

  if (error) {
    return (
      <Text className="text-center text-lg text-red-600">Error: {error}</Text>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AssignedWorksList" options={{ headerShown: false }}>
        {({ navigation }) => (
          <View className="flex-1 bg-gray-100 p-5">
            <Text className="text-xl font-bold text-blue-600 mb-5 text-center">
              WORKS ASSIGNED
            </Text>
            <FlatList
              data={works}
              keyExtractor={(item) => item.idWork.toString()}
              renderItem={({ item }) => (
                <View className="mb-4 p-4 bg-white rounded-lg shadow">
                  <Text className="text-lg font-semibold uppercase text-gray-800 mb-2">
                    {item.propertyAddress || "Dirección no disponible"}
                  </Text>
                  <Text className="text-sm text-gray-600 mb-2">
                    <Text className="font-bold text-gray-700">Estado:</Text>{" "}
                    {item.status || "Sin estado"}
                  </Text>

                  {(item.Permit?.pdfData || item.Permit?.optionalDocs) && (
                    <View className="mt-2">
                      {item.Permit?.pdfData && (
                        <TouchableOpacity
                          onPress={() => handleOpenPdf(item.Permit.pdfData)}
                          className="mb-2 py-2 px-4 bg-blue-600 rounded"
                        >
                          <Text className="text-white text-center">
                            Leer PDF Principal
                          </Text>
                        </TouchableOpacity>
                      )}
                      {item.Permit?.optionalDocs && (
                        <TouchableOpacity
                          onPress={() =>
                            handleOpenPdf(item.Permit.optionalDocs)
                          }
                          className="py-2 px-4 bg-yellow-500 rounded"
                        >
                          <Text className="text-white text-center">
                            Leer Documentación Opcional
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate("UploadScreen", {
                        idWork: item.idWork,
                        propertyAddress: item.propertyAddress,
                      })
                    }
                    className="mt-2 py-2 px-4 bg-green-500 rounded"
                  >
                    <Text className="text-white text-center">
                      Cargar Imágenes
                    </Text>
                  </TouchableOpacity>
                </View>
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