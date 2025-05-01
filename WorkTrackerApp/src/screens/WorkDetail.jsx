import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Image,
  Modal,
} from "react-native";
import { Buffer } from "buffer";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorkById } from "../Redux/Actions/workActions";
import { useRoute, useNavigation } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import * as ImageManipulator from "expo-image-manipulator";

const WorkDetail = () => {
  const { idWork } = useRoute().params;
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { work, loading, error } = useSelector((state) => state.work);
  const [imagesWithDataURLs, setImagesWithDataURLs] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    dispatch(fetchWorkById(idWork));
  }, [dispatch, idWork]);

  useEffect(() => {
    if (work && work.images) {
      const processImages = async () => {
        const dataURLs = {};
        for (const image of work.images) {
          try {
            const dataURL = await addDateTimeToImage(
              image.imageData,
              image.dateTime,
              work.propertyAddress
            );
            dataURLs[image.id] = dataURL;
          } catch (error) {
            console.error("Error processing image:", image.id, error);
            dataURLs[image.id] = `data:image/jpeg;base64,${image.imageData}`; 
          }
        }
        setImagesWithDataURLs(dataURLs);
      };
      processImages();
    }
  }, [work]);

  const addDateTimeToImage = async (imageData, dateTime, propertyAddress) => {
    try {
      const base64Image = `data:image/jpeg;base64,${imageData}`;
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        base64Image,
        [],
        {
          text: [
            {
              text: dateTime,
              position: { x: "50%", y: "80%" },
              style: {
                fontSize: 20,
                color: "white",
                textAlign: "center",
              },
            },
            {
              text: propertyAddress,
              position: { x: "50%", y: "85%" },
              style: {
                fontSize: 20,
                color: "white",
                textAlign: "center",
              },
            },
          ],
        }
      );
      return manipulatedImage.uri;
    } catch (error) {
      console.error("Error processing image:", error);
      throw error;
    }
  };

  const handleOpenPdf = async (pdfData) => {
    try {
      
      const base64Pdf =
        pdfData?.data
          ? Buffer.from(pdfData.data).toString("base64") 
          : pdfData.startsWith("data:application/pdf;base64,")
          ? pdfData.split(",")[1] 
          : null;
  
      if (!base64Pdf) {
        throw new Error("El PDF no está en un formato válido.");
      }
  
      const fileUri = `${FileSystem.cacheDirectory}temp.pdf`;
  
    
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

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <Text className="text-lg text-gray-700">Cargando detalles de la obra...</Text>
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

  if (!work) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <Text className="text-lg text-gray-700">No se encontró la obra.</Text>
      </View>
    );
  }

  const groupedImages = work.images.reduce((acc, image) => {
    if (!acc[image.stage]) {
      acc[image.stage] = [];
    }
    acc[image.stage].push(image);
    return acc;
  }, {});

  const openImageModal = (imageUri) => {
    setSelectedImage(imageUri);
    setIsModalVisible(true);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setIsModalVisible(false);
  };


  return (
    <ScrollView className="flex-1 bg-gray-100 p-4">
      <View className="bg-white p-4 rounded-lg shadow-md mb-4">
        <Text className="text-xl uppercase font-semibold text-gray-800 text-center">
          {work.propertyAddress || "Dirección no disponible"}
        </Text>
      </View>
        <View className="bg-white p-4 rounded-lg shadow-md mb-4">
            <Text className="text-lg text-gray-700 mb-4"> 
          <Text className="font-semibold">Status:</Text> {work.status || "Sin estado"}
        </Text>
        <View className="flex-row justify-between items-center">
          {work.Permit?.pdfData ? (
            <TouchableOpacity
              onPress={() => handleOpenPdf(work.Permit.pdfData)}
              className="flex-1 bg-blue-600 py-2 px-3 rounded-lg shadow-md mx-1"
            >
              <Text className="text-white font-bold text-center text-sm">Permit</Text> 
            </TouchableOpacity>
          ) : (
             <View className="flex-1 mx-1" /> 
          )}
          {work.Permit?.optionalDocs ? (
            <TouchableOpacity
              onPress={() => handleOpenPdf(work.Permit.optionalDocs)}
              className="flex-1 bg-green-600 py-2 px-3 rounded-lg shadow-md mx-1">
              <Text className="text-white font-bold text-center text-sm">Permit Flat</Text> 
            </TouchableOpacity>
           ) : (
             <View className="flex-1 mx-1" /> 
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate('WorkBalanceDetail', {
              idWork: work.idWork,
              propertyAddress: work.propertyAddress
            })}
            className="flex-1 bg-purple-600 py-2 px-3 rounded-lg shadow-md mx-1" 
          >
            <Text className="text-white font-bold text-center text-sm">Ver Balance</Text>
          </TouchableOpacity>
           <TouchableOpacity
            onPress={() => navigation.navigate('BalanceUpload', { 
              idWork: work.idWork, 
              propertyAddress: work.propertyAddress 
            })}
            className="flex-1 bg-yellow-500 py-2 px-3 rounded-lg shadow-md" 
          >
            <Text className="text-white font-bold text-center text-sm">Cargar Mov.</Text>
          </TouchableOpacity>
        


        </View>
      </View>

    
      {work.Permit && (
        <View className="bg-white p-4 rounded-lg shadow-md mb-4">
   
          <Text className="text-lg text-gray-700">
            <Text className="font-semibold">Aplicant:</Text>
            {work.Permit.applicantName || "N/A"}
          </Text>
          <Text className="text-lg text-gray-700">
            <Text className="font-semibold">Permit N°:</Text>
            {work.Permit.permitNumber || "N/A"}
          </Text>
        </View>
      )}
      <View>
  {Object.entries(groupedImages).map(([stage, images]) => (
    <View key={stage} className="mb-6">
      <Text className="text-lg font-bold text-gray-700 mb-2">
        {stage} ({images.length} image)
      </Text>
      <ScrollView horizontal className="flex-row">
              {images.map((image) => (
                <TouchableOpacity
                  key={image.id}
                  onPress={() => openImageModal(imagesWithDataURLs[image.id])}
                  className="mr-4"
                >
                  {imagesWithDataURLs[image.id] ? (
                    <Image
                      source={{ uri: imagesWithDataURLs[image.id] }}
                      className="w-32 h-32 rounded-lg"
                    />
                  ) : (
                    <Text className="text-gray-500">Cargando imagen...</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
    </View>
  ))}
</View>

 <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-75">
          <Image
            source={{ uri: selectedImage }}
            className="w-4/5 h-4/5 rounded-lg"
            resizeMode="contain"
          />
          <TouchableOpacity
            onPress={closeImageModal}
            className="absolute top-10 right-10 bg-white p-3 rounded-full"
          >
            <Text className="text-black font-bold">X</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default WorkDetail;