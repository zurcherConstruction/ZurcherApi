import React, { useEffect, useState, useRef, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Image, // Import Image from react-native
  Modal,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorkById } from "../Redux/Actions/workActions";
import { useRoute } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import { encode } from "base-64";
import * as ImageManipulator from 'expo-image-manipulator';

const WorkDetail = () => {
  const { idWork } = useRoute().params;
  const dispatch = useDispatch();

  const { work, loading, error } = useSelector((state) => state.work);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const canvasRef = useRef(null);
  const [imagesWithDataURLs, setImagesWithDataURLs] = useState({});
  const [modalImageUri, setModalImageUri] = useState(null); // new state

  useEffect(() => {
    dispatch(fetchWorkById(idWork));
  }, [dispatch, idWork]);

  useEffect(() => {
    if (work && work.images) {
      const processImages = async () => {
        const dataURLs = {};
        for (const image of work.images) {
          try {
            const dataURL = await addDateTimeToImage(image.imageData, image.dateTime, work.propertyAddress);
            dataURLs[image.id] = dataURL;
          } catch (error) {
            console.error("Error processing image:", image.id, error);
            dataURLs[image.id] = `data:image/jpeg;base64,${image.imageData}`; // Fallback
          }
        }
        setImagesWithDataURLs(dataURLs);
        console.log("imagesWithDataURLs:", dataURLs); // Log the dataURLs
      };
      processImages();
    }
  }, [work]);

  const openImageModal = async (imageId) => {
    console.log("Opening modal for image ID:", imageId); // Add this line
    setSelectedImage(imageId);
    // Optimize image size for modal
    try {
      const optimizedImage = await ImageManipulator.manipulateAsync(
        imagesWithDataURLs[imageId],
        [],
        { resize: { width: 800 } } // Adjust width as needed
      );
      setModalImageUri(optimizedImage.uri);
    } catch (error) {
      console.error("Error optimizing image:", error);
      setModalImageUri(imagesWithDataURLs[imageId]); // Fallback to original
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
    setModalImageUri(null); // Reset modal image URI
  };

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
              position: { x: '50%', y: '80%' },
              style: {
                fontSize: 20,
                color: 'white',
                textAlign: 'center',
              },
            },
            {
              text: propertyAddress,
              position: { x: '50%', y: '85%' },
              style: {
                fontSize: 20,
                color: 'white',
                textAlign: 'center',
              },
            },
          ],
        }
      );
  
      return manipulatedImage.uri;
    } catch (error) {
      console.error("Error processing image:", error);
      throw error; // Re-throw the error to be caught in the useEffect
    }
  };
  
  const handleOpenPdf = async (pdfData) => {
    try {
      if (!pdfData || !pdfData.data) {
        Alert.alert("Error", "PDF data is missing.");
        return;
      }

      const base64Pdf = encode(String.fromCharCode(...new Uint8Array(pdfData.data)));
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
      Alert.alert("Error", "Could not open PDF. Please try again.");
    }
  };

 

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Cargando detalles de la obra...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text>Error: {error}</Text>
      </View>
    );
  }

  if (!work) {
    return (
      <View style={styles.container}>
        <Text>No se encontró la obra.</Text>
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

  const handleCanvas = (canvas) => {
    if (canvas) {
      canvasRef.current = canvas;
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>{work.propertyAddress || "Dirección no disponible"}</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>Status: {work.status || "Sin estado"}</Text>
        <Text style={styles.infoText}>Notes: {work.notes || "Sin notas"}</Text>
      </View>
      {work.Permit && (
        <View style={styles.permitContainer}>
          <Text style={styles.sectionTitle}>Permit Details</Text>
          <Text style={styles.permitText}>Applicant Name: {work.Permit.applicantName || "N/A"}</Text>
          <Text style={styles.permitText}>Permit Number: {work.Permit.permitNumber || "N/A"}</Text>
          <Text style={styles.permitText}>Property Address: {work.Permit.propertyAddress || "N/A"}</Text>
        </View>
      )}
      {(work.Permit?.pdfData || work.Permit?.optionalDocs) && (
        <View style={styles.pdfContainer}>
          {work.Permit?.pdfData && (
            <TouchableOpacity
              onPress={() => handleOpenPdf(work.Permit.pdfData)}
              style={styles.pdfButton}
            >
              <Text style={styles.pdfButtonText}>Leer PDF Principal</Text>
            </TouchableOpacity>
          )}
          {work.Permit?.optionalDocs && (
            <TouchableOpacity
              onPress={() => handleOpenPdf(work.Permit.optionalDocs)}
              style={styles.pdfButton}
            >
              <Text style={styles.pdfButtonText}>Leer Documentación Opcional</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.imagesSection}>
        <Text style={styles.sectionTitle}>Imágenes de la Obra</Text>
        {Object.entries(groupedImages).map(([stage, images]) => (
          <View key={stage} style={styles.stageContainer}>
            <Text style={styles.stageTitle}>{stage}</Text>
            <ScrollView horizontal>
              {images.map(image => (
                // Remove TouchableOpacity
                <View
                  key={image.id}
                  style={styles.imageContainer}
                >
                  {imagesWithDataURLs[image.id] ? (
                    <Image
                      source={{ uri: imagesWithDataURLs[image.id] }}
                      style={styles.image}
                    />
                  ) : (
                    <Text>Cargando imagen...</Text>
                  )}
                </View>
                // End Remove TouchableOpacity
              ))}
            </ScrollView>
          </View>
        ))}
      </View>

      {/* Remove Modal */}
    </ScrollView>
  );
};

const OptimizedImage = memo(Image);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: '#333',
    textAlign: 'center',
  },
  infoContainer: {
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  permitContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  permitText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  pdfContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  pdfButton: {
    backgroundColor: '#2980b9',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  pdfButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  imagesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 15,
    color: '#333',
  },
  stageContainer: {
    marginBottom: 15,
  },
  stageTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 8,
    color: '#444',
  },
  imageContainer: {
    marginRight: 15,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '90%',
    height: '90%',
    borderRadius: 10,
  },
  canvas: {
    display: 'none',
    width: 0,
    height: 0,
  }
});

export default WorkDetail;