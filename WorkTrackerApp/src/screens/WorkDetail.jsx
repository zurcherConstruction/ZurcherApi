import React, { useEffect, useState, useCallback } from "react";
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
import Ionicons from 'react-native-vector-icons/Ionicons'; // Agregar esto
import PdfViewer from '../utils/PdfViewer'; 

const WorkDetail = () => {
  const { idWork } = useRoute().params;
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { work, loading, error } = useSelector((state) => state.work);
  const [imagesWithDataURLs, setImagesWithDataURLs] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pdfViewerVisible, setPdfViewerVisible] = useState(false);
  const [selectedPdfUri, setSelectedPdfUri] = useState(null);

  useEffect(() => {
    dispatch(fetchWorkById(idWork));
  }, [dispatch, idWork]);



  const handleOpenPdf = async (pdfSource) => {
  try {
    let fileUri;
    let isDownloadedTempFile = false;

    // Verificar si pdfSource es una URL
    if (typeof pdfSource === 'string' && (pdfSource.startsWith('http://') || pdfSource.startsWith('https://'))) {
      const tempFileName = `temp_download_${Date.now()}.pdf`;
      fileUri = `${FileSystem.cacheDirectory}${tempFileName}`;
      console.log(`Intentando descargar PDF desde: ${pdfSource} a ${fileUri}`);
      
      const downloadResult = await FileSystem.downloadAsync(pdfSource, fileUri);
      
      if (downloadResult.status !== 200) {
        throw new Error(`Error al descargar PDF (status ${downloadResult.status}).`);
      }
      console.log('PDF descargado exitosamente:', downloadResult.uri);
      isDownloadedTempFile = true; 
    } else {
      // Lógica existente para base64
      const base64Pdf =
        pdfSource?.data
          ? Buffer.from(pdfSource.data).toString("base64")
          : typeof pdfSource === 'string' && pdfSource.startsWith("data:application/pdf;base64,")
            ? pdfSource.split(",")[1]
            : typeof pdfSource === 'string'
              ? pdfSource 
              : null;

      if (!base64Pdf) {
        throw new Error("El PDF no está en un formato válido (base64) o no se encontró.");
      }
      const tempFileNameBase64 = `temp_base64_${Date.now()}.pdf`;
      fileUri = `${FileSystem.cacheDirectory}${tempFileNameBase64}`;
      await FileSystem.writeAsStringAsync(fileUri, base64Pdf, {
        encoding: FileSystem.EncodingType.Base64,
      });
      isDownloadedTempFile = true;
    }

    setSelectedPdfUri(fileUri);
    setPdfViewerVisible(true);

  } catch (error) {
    console.error("Error en handleOpenPdf:", error);
    Alert.alert("Error al abrir PDF", `${error.message}. Asegúrate de que la URL sea accesible y el archivo sea un PDF válido.`);
    if (fileUri && isDownloadedTempFile) {
      FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(delError => console.error("Error al limpiar archivo temporal tras fallo en handleOpenPdf:", delError));
    }
  }
};



  const addDateTimeToImage = useCallback(async (imageUrl, dateTime, propertyAddress) => {
    try {
      if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
        console.warn("Invalid imageUrl for manipulation:", imageUrl);
        return imageUrl; // Return original if not a valid URL
      }

      const randomFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.jpg`;
      const localUri = `${FileSystem.cacheDirectory}${randomFileName}`;

      // 1. Download the image from Cloudinary URL
      await FileSystem.downloadAsync(imageUrl, localUri);

      // 2. Manipulate the downloaded image
      // Assuming your ImageManipulator setup supports the 'text' option in saveOptions
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        localUri, // Use the local URI of the downloaded image
        [], // No transform actions like rotate/flip/crop
        {
          // SaveOptions, where your text overlay is defined
          text: [
            {
              text: dateTime || "Date N/A", // Fallback for dateTime
              position: { x: "50%", y: "80%" }, // Your original position
              style: {
                fontSize: 20,
                color: "white",
                textAlign: "center",
                // Consider adding a slight background for better text visibility
                // backgroundColor: "rgba(0,0,0,0.3)", 
              },
            },
            {
              text: propertyAddress || "Address N/A", // Fallback for propertyAddress
              position: { x: "50%", y: "85%" }, // Your original position
              style: {
                fontSize: 20,
                color: "white",
                textAlign: "center",
                // backgroundColor: "rgba(0,0,0,0.3)",
              },
            },
          ],
          format: ImageManipulator.SaveFormat.JPEG,
          base64: false, // We need the URI for the Image component
        }
      );
      return manipulatedImage.uri; // This is a local URI to the manipulated image
    } catch (err) {
      console.error("Error in addDateTimeToImage:", err);
      return imageUrl; // Fallback to the original Cloudinary URL if manipulation fails
    }
  }, []); // Empty dependency array for useCallback as it doesn't depend on component state/props

  useEffect(() => {
    if (work && work.images && work.images.length > 0) {
      const processImages = async () => {
        const processedURIs = {};
        for (const image of work.images) {
          if (image.imageUrl) {
            try {
              const dataURL = await addDateTimeToImage(
                image.imageUrl,
                image.dateTime, // This is the stored dateTime string
                work.propertyAddress
              );
              processedURIs[image.id] = dataURL;
            } catch (processingError) {
              console.error("Error processing image in useEffect loop:", image.id, processingError);
              processedURIs[image.id] = image.imageUrl; // Fallback to original URL
            }
          } else {
            console.warn(`Image with id ${image.id} has no imageUrl.`);
            processedURIs[image.id] = null; // Or a placeholder
          }
        }
        setImagesWithDataURLs(processedURIs);
      };
      processImages();
    } else if (work && (!work.images || work.images.length === 0)) {
      setImagesWithDataURLs({}); // Clear if there are no images
    }
  }, [work, addDateTimeToImage]); // addDateTimeToImage is now stable due to useCallback

  // ... (handleOpenPdf, loading, error, no work states remain the same) ...

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
        <Text className="text-lg text-red-600">Error: {error.toString()}</Text>
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

  const groupedImages = work.images ? work.images.reduce((acc, image) => {
    if (!acc[image.stage]) {
      acc[image.stage] = [];
    }
    acc[image.stage].push(image);
    return acc;
  }, {}) : {};
  const truckSumStages = ['camiones de arena', 'camiones de tierra']; // Define stages for truck summation

  const openImageModal = (imageUri) => {
    if (imageUri) {
      setSelectedImage(imageUri);
      setIsModalVisible(true);
    } else {
      Alert.alert("Error", "La imagen no está disponible.");
    }
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setIsModalVisible(false);
  };

  // const handleOpenPdf = async (pdfData) => {
  //   try {

  //     const base64Pdf =
  //       pdfData?.data
  //         ? Buffer.from(pdfData.data).toString("base64")
  //         : pdfData.startsWith("data:application/pdf;base64,")
  //           ? pdfData.split(",")[1]
  //           : null;

  //     if (!base64Pdf) {
  //       throw new Error("El PDF no está en un formato válido.");
  //     }

  //     const fileUri = `${FileSystem.cacheDirectory}temp.pdf`;


  //     await FileSystem.writeAsStringAsync(fileUri, base64Pdf, {
  //       encoding: FileSystem.EncodingType.Base64,
  //     });

  //     console.log("PDF guardado en:", fileUri);

     
  //     if (Platform.OS === "android") {
  //       const contentUri = await FileSystem.getContentUriAsync(fileUri);

  //       const intent = {
  //         action: "android.intent.action.VIEW",
  //         data: contentUri,
  //         flags: 1,
  //         type: "application/pdf",
  //       };

  //       await IntentLauncher.startActivityAsync(
  //         "android.intent.action.VIEW",
  //         intent
  //       );
  //     } else if (Platform.OS === "ios") {
  //       await Sharing.shareAsync(fileUri, {
  //         mimeType: "application/pdf",
  //         dialogTitle: "Compartir PDF",
  //         UTI: "com.adobe.pdf",
  //       });
  //     }
  //   } catch (error) {
  //     console.error("Error al abrir el PDF:", error);
  //   }
  // };

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

 
  return (
     <ScrollView className="flex-1 bg-gray-100 p-4">
    <View className="bg-white p-4 rounded-lg shadow-md mb-4 items-center">
      <Text className="text-xl uppercase font-semibold text-gray-800 text-center mb-1">
        {work.propertyAddress || "Dirección no disponible"}
      </Text>
      <Text className="text-lg text-gray-700 text-center">
        <Text className="font-semibold">Status:</Text> {work.status || "Sin estado"}
      </Text>
    </View>

    {/* Nueva sección reorganizada con PDFs arriba y botones BALANCE/GASTOS abajo */}
    <View className="bg-white p-4 rounded-lg shadow-md mb-4">
      {/* Fila de botones PDF */}
      {(work.Permit?.pdfData || work.Permit?.optionalDocs) && (
        <View className="flex-row justify-center items-center mb-4 space-x-4">
          {work.Permit?.pdfData && (
            <TouchableOpacity
              onPress={() => handleOpenPdf(work.Permit.pdfData)}
              className="items-center"
            >
              <View className="w-20 h-20 bg-gray-200 border border-gray-300 rounded-md justify-center items-center mb-1 shadow">
                <Ionicons name="document-text-outline" size={40} color="#4B5563" />
              </View>
              <Text className="text-xs text-center font-medium text-gray-600">PDF Permit</Text>
            </TouchableOpacity>
          )}

          {work.Permit?.optionalDocs && (
            <TouchableOpacity
              onPress={() => handleOpenPdf(work.Permit.optionalDocs)}
              className="items-center ml-6"
            >
              <View className="w-20 h-20 bg-gray-200 border border-gray-300 rounded-md justify-center items-center mb-1 shadow">
                <Ionicons name="document-attach-outline" size={40} color="#4B5563" />
              </View>
              <Text className="text-xs text-center font-medium text-gray-600">PDF Site Plan</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Columna de botones BALANCE y GASTOS */}
      <View className="space-y-3">
        <TouchableOpacity
          onPress={() => navigation.navigate('WorkBalanceDetail', {
            idWork: work.idWork,
            propertyAddress: work.propertyAddress
          })}
          className="bg-purple-600 py-3 px-4 rounded-lg shadow-md"
        >
          <Text className="text-white font-bold text-center text-sm">BALANCE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('BalanceUpload', {
            idWork: work.idWork,
            propertyAddress: work.propertyAddress
          })}
          className="bg-yellow-500 py-3 px-4 rounded-lg shadow-md"
        >
          <Text className="text-white font-bold text-center text-sm">GASTOS</Text>
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
        {Object.entries(groupedImages).map(([stage, imagesInStage]) => { // Renamed 'images' to 'imagesInStage' for clarity
          let totalTrucksInStage = 0;
          if (truckSumStages.includes(stage)) {
            // ✅ Obtener el valor máximo (último total acumulado) en lugar de sumar
            totalTrucksInStage = Math.max(
              ...imagesInStage.map(image => Number(image.truckCount) || 0),
              0
            );
          }

          return (
            <View key={stage} className="mb-6 bg-white p-3 rounded-lg shadow">
              <Text className="text-lg font-bold text-gray-700 mb-2 capitalize">
                {stage} ({imagesInStage.length} imagen{imagesInStage.length === 1 ? '' : 'es'})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-2">
                {imagesInStage.map((image) => (
                  <TouchableOpacity
                    key={image.id}
                    onPress={() => imagesWithDataURLs[image.id] ? openImageModal(imagesWithDataURLs[image.id]) : Alert.alert("Info", "Procesando imagen...")}
                    className="mr-3 bg-gray-50 p-1.5 rounded-lg shadow-sm border border-gray-200 w-36" // Added fixed width for consistency
                  >
                    {imagesWithDataURLs[image.id] ? (
                      <Image
                        source={{ uri: imagesWithDataURLs[image.id] }}
                        className="w-full h-32 rounded-md bg-gray-200" // Use w-full to fill parent
                      />
                    ) : (
                      <View className="w-full h-32 rounded-md bg-gray-200 justify-center items-center">
                        <Text className="text-gray-500 text-xs">Cargando...</Text>
                      </View>
                    )}
                    {/* Display individual truck count */}
                    {truckSumStages.includes(stage) && image.truckCount != null && image.truckCount > 0 && (
                      <Text className="text-xs font-semibold text-blue-600 mt-1 text-center">
                        {image.truckCount} {image.truckCount === 1 ? 'Camión' : 'Camiones'}
                      </Text>
                    )}
                     {image.comment && (
                        <Text className="text-xs text-gray-500 mt-1 italic truncate" numberOfLines={1}>
                           "{image.comment}"
                        </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {/* Display total truck count for the stage */}
              {truckSumStages.includes(stage) && totalTrucksInStage > 0 && (
                <View className="mt-2 pt-2 border-t border-gray-200">
                  <Text className="text-sm font-bold text-indigo-700 text-right">
                    Total Camiones : {totalTrucksInStage}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
          <PdfViewer
      visible={pdfViewerVisible}
      fileUri={selectedPdfUri}
      onClose={() => {
        setPdfViewerVisible(false);
        setSelectedPdfUri(null);
        if (selectedPdfUri) {
          FileSystem.deleteAsync(selectedPdfUri, { idempotent: true })
            .catch(err => console.error("Error al eliminar PDF temporal:", err));
        }
      }}
    />

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-75 p-4">
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              className="w-full h-4/5 rounded-lg"
              resizeMode="contain"
            />
          )}
          <TouchableOpacity
            onPress={closeImageModal}
            className="absolute top-12 right-5 bg-white p-2 rounded-full shadow-lg z-10"
          >
            <Text className="text-black font-bold text-lg">X</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default WorkDetail;