import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchAssignedWorks } from "../Redux/Actions/workActions";
import { View, Text, FlatList, TouchableOpacity, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Buffer } from "buffer";
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import UploadScreen from './UploadScreen'; // Importa UploadScreen
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

const AssignedWorksScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const { works, loading, error } = useSelector((state) => state.work);

  useEffect(() => {
    dispatch(fetchAssignedWorks());
  }, [dispatch]);

  const handleOpenPdf = async (pdfData) => {
    try {
      const base64Pdf = Buffer.from(pdfData.data).toString("base64");
      const fileUri = `${FileSystem.cacheDirectory}temp.pdf`;

      await FileSystem.writeAsStringAsync(fileUri, base64Pdf, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log("PDF guardado en:", fileUri);

      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(fileUri);

        const intent = {
          action: 'android.intent.action.VIEW',
          data: contentUri,
          flags: 1,
          type: 'application/pdf',
        };

        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', intent);
      } else if (Platform.OS === 'ios') {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartir PDF',
          UTI: 'com.adobe.pdf',
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
      <Text style={{ textAlign: "center", fontSize: 18, color: "blue" }}>
        Cargando...
      </Text>
    );
  }

  if (error) {
    return (
      <Text style={{ textAlign: "center", fontSize: 18, color: "red" }}>
        Error: {error}
      </Text>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AssignedWorksList" options={{headerShown: false}} >
       {({navigation}) => (
          <View style={{ flex: 1, backgroundColor: "#f3f4f6", padding: 20 }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: "#2563eb",
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              Trabajos Asignados
            </Text>
            <FlatList
              data={works}
              keyExtractor={(item) => item.idWork.toString()}
              renderItem={({ item }) => (
                <View
                  style={{
                    marginBottom: 16,
                    padding: 16,
                    backgroundColor: "white",
                    borderRadius: 8,
                    shadowColor: "#000",
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "600",
                      color: "#1f2937",
                      marginBottom: 8,
                    }}
                  >
                    {item.propertyAddress || "Dirección no disponible"}
                  </Text>
                  <Text style={{ fontSize: 14, color: "#4b5563", marginBottom: 4 }}>
                    <Text style={{ fontWeight: "bold", color: "#374151" }}>
                      Estado:
                    </Text>{" "}
                    {item.status || "Sin estado"}
                  </Text>
                  <Text style={{ fontSize: 14, color: "#4b5563" }}>
                    <Text style={{ fontWeight: "bold", color: "#374151" }}>
                      Notas:
                    </Text>{" "}
                    {item.notes || "Sin notas"}
                  </Text>
                  {item.Permit?.pdfData && (
                    <TouchableOpacity
                      onPress={() => handleOpenPdf(item.Permit.pdfData)}
                      style={{
                        marginTop: 10,
                        padding: 10,
                        backgroundColor: "#2563eb",
                        borderRadius: 5,
                      }}
                    >
                    <Text style={{ color: "white", textAlign: "center" }}>
                      Leer PDF
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => navigation.navigate("UploadScreen", { idWork: item.idWork })}
                  style={{
                    marginTop: 10,
                    padding: 10,
                    backgroundColor: "#10b981",
                    borderRadius: 5,
                  }}
                >
                  <Text style={{ color: "white", textAlign: "center" }}>
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