import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Image, Alert, ActivityIndicator, Platform, Linking,
  KeyboardAvoidingView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useDispatch } from "react-redux";
import { updateSimpleWorkStatus, uploadSimpleWorkImage } from "../Redux/Actions/simpleWorkActions";
import moment from "moment-timezone";

const STATUS_LABELS = {
  quoted: "Cotizado",
  sent: "Enviado",
  approved: "Aprobado",
  in_progress: "En Progreso",
  completed: "Completado",
  invoiced: "Facturado",
  paid: "Pagado",
  cancelled: "Cancelado",
};

const WORK_TYPE_LABELS = {
  culvert: "Culvert",
  drainfield: "Drainfield",
  concrete_work: "Concreto",
  excavation: "Excavación",
  plumbing: "Plomería",
  electrical: "Eléctrico",
  landscaping: "Paisajismo",
  other: "Otro",
};

const STATUS_COLORS = {
  quoted: { bg: "bg-gray-200", text: "text-gray-700" },
  sent: { bg: "bg-blue-200", text: "text-blue-700" },
  approved: { bg: "bg-green-200", text: "text-green-700" },
  in_progress: { bg: "bg-amber-200", text: "text-amber-700" },
  completed: { bg: "bg-emerald-300", text: "text-emerald-800" },
  invoiced: { bg: "bg-purple-200", text: "text-purple-700" },
  paid: { bg: "bg-green-300", text: "text-green-800" },
  cancelled: { bg: "bg-red-200", text: "text-red-700" },
};

const TYPE_COLORS = {
  culvert: { bg: "bg-cyan-100", text: "text-cyan-700" },
  drainfield: { bg: "bg-lime-100", text: "text-lime-700" },
  concrete_work: { bg: "bg-stone-200", text: "text-stone-700" },
  excavation: { bg: "bg-orange-100", text: "text-orange-700" },
  plumbing: { bg: "bg-blue-100", text: "text-blue-700" },
  electrical: { bg: "bg-yellow-100", text: "text-yellow-700" },
  landscaping: { bg: "bg-green-100", text: "text-green-700" },
  other: { bg: "bg-gray-100", text: "text-gray-700" },
};

const openInMaps = (address) => {
  if (!address) return;
  const encoded = encodeURIComponent(address);
  const url = Platform.select({
    ios: `maps:0,0?q=${encoded}`,
    android: `geo:0,0?q=${encoded}`,
  });
  Linking.openURL(url).catch(() => {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
  });
};

const SimpleWorkDetailScreen = ({ route, navigation }) => {
  const { simpleWork } = route.params;
  const dispatch = useDispatch();

  const [resolution, setResolution] = useState(simpleWork.resolution || "");
  const [localImages, setLocalImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const existingCompletionImages = simpleWork.completionImages || [];
  const existingWorkImages = simpleWork.workImages || [];
  const statusStyle = STATUS_COLORS[simpleWork.status] || STATUS_COLORS.quoted;
  const typeStyle = TYPE_COLORS[simpleWork.workType] || TYPE_COLORS.other;

  // -------- Image Picking --------
  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso necesario", "Se necesita acceso a la cámara para tomar fotos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.3,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      setLocalImages((prev) => [...prev, result.assets[0]]);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso necesario", "Se necesita acceso a la galería.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.3,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setLocalImages((prev) => [...prev, ...result.assets]);
    }
  };

  const removeLocalImage = (index) => {
    setLocalImages((prev) => prev.filter((_, i) => i !== index));
  };

  // -------- Upload all local images --------
  const uploadImages = async () => {
    if (localImages.length === 0) return true;
    setUploading(true);
    let allSuccess = true;
    for (const img of localImages) {
      try {
        await dispatch(uploadSimpleWorkImage(simpleWork.id, img.uri, 'completion'));
      } catch (err) {
        console.error("Error uploading image:", err);
        allSuccess = false;
      }
    }
    setUploading(false);
    if (allSuccess) setLocalImages([]);
    return allSuccess;
  };

  // -------- Submit as "Completado" --------
  const handleMarkCompleted = async () => {
    if (!resolution.trim() && localImages.length === 0) {
      Alert.alert(
        "Comentario requerido",
        "Por favor agregue un comentario o fotos del trabajo antes de marcar como completado."
      );
      return;
    }

    Alert.alert(
      "Confirmar",
      "¿Marcar este trabajo como COMPLETADO?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, Completado",
          onPress: async () => {
            setSaving(true);
            try {
              await uploadImages();
              await dispatch(
                updateSimpleWorkStatus(simpleWork.id, {
                  status: "completed",
                  resolution: resolution.trim(),
                  completedDate: new Date().toISOString(),
                })
              );
              Alert.alert("Listo", "Trabajo marcado como completado.", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } catch (err) {
              Alert.alert("Error", "No se pudo actualizar el trabajo.");
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  // -------- Submit as "En Progreso" (report) --------
  const handleReportProgress = async () => {
    if (!resolution.trim() && localImages.length === 0) {
      Alert.alert(
        "Comentario requerido",
        "Por favor agregue un comentario o fotos antes de enviar un reporte."
      );
      return;
    }

    setSaving(true);
    try {
      await uploadImages();
      await dispatch(
        updateSimpleWorkStatus(simpleWork.id, {
          status: "in_progress",
          notes: `${simpleWork.notes || ''}\n[${moment().format("MM-DD-YYYY HH:mm")}] ${resolution.trim()}`.trim(),
        })
      );
      Alert.alert("Enviado", "Reporte enviado. El trabajo continúa en progreso.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert("Error", "No se pudo enviar el reporte.");
    } finally {
      setSaving(false);
    }
  };

  // Client name from clientData JSON
  const clientName = simpleWork.clientData
    ? `${simpleWork.clientData.firstName || ''} ${simpleWork.clientData.lastName || ''}`.trim() || 'Cliente'
    : 'Cliente';

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView className="flex-1 bg-gray-100" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ---- Work Info Card ---- */}
        <View className="bg-white mx-3 mt-4 p-4 rounded-xl shadow-sm">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-blue-900">{simpleWork.workNumber}</Text>
            <View className={`px-3 py-1 rounded-full ${typeStyle.bg}`}>
              <Text className={`text-xs font-bold ${typeStyle.text}`}>
                {WORK_TYPE_LABELS[simpleWork.workType] || simpleWork.workType}
              </Text>
            </View>
          </View>

          {/* Address - tappable */}
          <TouchableOpacity
            onPress={() => openInMaps(simpleWork.propertyAddress)}
            className="flex-row items-center mb-3 bg-blue-50 p-3 rounded-lg"
          >
            <Ionicons name="navigate" size={22} color="#2563eb" style={{ marginRight: 8 }} />
            <View className="flex-1">
              <Text className="text-base font-bold text-blue-700 uppercase">
                {simpleWork.propertyAddress || "Dirección no disponible"}
              </Text>
              <Text className="text-xs text-blue-500 mt-1">Tocar para abrir en Maps</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#2563eb" />
          </TouchableOpacity>

          {/* Client */}
          <View className="flex-row items-center mb-3">
            <Ionicons name="person-outline" size={16} color="#6b7280" style={{ marginRight: 6 }} />
            <Text className="text-sm font-medium text-gray-700">{clientName}</Text>
          </View>

          {/* Status */}
          <View className="flex-row items-center mb-3">
            <View className={`px-3 py-1 rounded-md ${statusStyle.bg}`}>
              <Text className={`text-xs font-bold uppercase ${statusStyle.text}`}>
                {STATUS_LABELS[simpleWork.status] || simpleWork.status}
              </Text>
            </View>
          </View>

          {/* Description */}
          {simpleWork.description ? (
            <View className="mb-3">
              <Text className="text-sm font-semibold text-gray-700 mb-1">Descripción:</Text>
              <Text className="text-sm text-gray-600">{simpleWork.description}</Text>
            </View>
          ) : null}

          {/* Dates */}
          <View className="space-y-1">
            {simpleWork.assignedDate && (
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={14} color="#6b7280" style={{ marginRight: 6 }} />
                <Text className="text-xs text-gray-600">
                  Asignado: {moment(simpleWork.assignedDate).format("MM-DD-YYYY")}
                </Text>
              </View>
            )}
            {simpleWork.startDate && (
              <View className="flex-row items-center mt-1">
                <Ionicons name="play-circle-outline" size={14} color="#2563eb" style={{ marginRight: 6 }} />
                <Text className="text-xs text-blue-600">
                  Inicio: {moment(simpleWork.startDate).format("MM-DD-YYYY")}
                </Text>
              </View>
            )}
            {simpleWork.completedDate && (
              <View className="flex-row items-center mt-1">
                <Ionicons name="checkmark-circle-outline" size={14} color="#059669" style={{ marginRight: 6 }} />
                <Text className="text-xs text-emerald-600">
                  Completado: {moment(simpleWork.completedDate).format("MM-DD-YYYY")}
                </Text>
              </View>
            )}
          </View>

          {/* Existing notes */}
          {simpleWork.notes ? (
            <View className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <Text className="text-xs font-bold text-yellow-800 mb-1">Notas previas:</Text>
              <Text className="text-sm text-yellow-900">{simpleWork.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* ---- Existing Work Images ---- */}
        {existingWorkImages.length > 0 && (
          <View className="bg-white mx-3 mt-4 p-4 rounded-xl shadow-sm">
            <Text className="text-sm font-bold text-gray-700 mb-2">
              Fotos del trabajo ({existingWorkImages.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {existingWorkImages.map((img, idx) => (
                <Image
                  key={img.id || idx}
                  source={{ uri: img.url }}
                  className="w-24 h-24 rounded-lg mr-2"
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ---- Existing Completion Images ---- */}
        {existingCompletionImages.length > 0 && (
          <View className="bg-white mx-3 mt-4 p-4 rounded-xl shadow-sm">
            <Text className="text-sm font-bold text-emerald-700 mb-2">
              Fotos de finalización ({existingCompletionImages.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {existingCompletionImages.map((img, idx) => (
                <Image
                  key={img.id || idx}
                  source={{ uri: img.url }}
                  className="w-24 h-24 rounded-lg mr-2"
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ---- Image Upload Section ---- */}
        <View className="bg-white mx-3 mt-4 p-4 rounded-xl shadow-sm">
          <Text className="text-sm font-bold text-gray-700 mb-3">
            Agregar fotos del trabajo
          </Text>

          <View className="flex-row mb-3">
            <TouchableOpacity
              onPress={pickFromCamera}
              className="flex-1 flex-row items-center justify-center bg-blue-600 py-3 rounded-lg mr-2"
            >
              <Ionicons name="camera" size={20} color="white" style={{ marginRight: 6 }} />
              <Text className="text-white font-semibold">Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={pickFromGallery}
              className="flex-1 flex-row items-center justify-center bg-indigo-600 py-3 rounded-lg ml-2"
            >
              <Ionicons name="images" size={20} color="white" style={{ marginRight: 6 }} />
              <Text className="text-white font-semibold">Galería</Text>
            </TouchableOpacity>
          </View>

          {/* Local image preview */}
          {localImages.length > 0 && (
            <View>
              <Text className="text-xs text-gray-500 mb-2">
                {localImages.length} foto{localImages.length !== 1 ? "s" : ""} seleccionada{localImages.length !== 1 ? "s" : ""}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {localImages.map((img, idx) => (
                  <View key={idx} className="mr-2 relative">
                    <Image
                      source={{ uri: img.uri }}
                      className="w-24 h-24 rounded-lg"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => removeLocalImage(idx)}
                      className="absolute -top-2 -right-2 bg-red-600 rounded-full w-6 h-6 items-center justify-center"
                    >
                      <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ---- Comment / Resolution Input ---- */}
        <View className="bg-white mx-3 mt-4 p-4 rounded-xl shadow-sm">
          <Text className="text-sm font-bold text-gray-700 mb-2">
            Comentario del trabajo
          </Text>
          <TextInput
            placeholder="Describa el trabajo realizado o el estado actual..."
            value={resolution}
            onChangeText={setResolution}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="border border-gray-300 rounded-lg p-3 text-base min-h-[100px] bg-gray-50"
          />
        </View>

        {/* ---- Action Buttons ---- */}
        <View className="mx-3 mt-4">
          {(uploading || saving) ? (
            <View className="items-center py-4">
              <ActivityIndicator size="large" color="#1e3a8a" />
              <Text className="text-sm text-blue-700 mt-2">
                {uploading ? "Subiendo fotos..." : "Guardando..."}
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                onPress={handleMarkCompleted}
                className="bg-green-600 py-4 rounded-xl mb-3 flex-row items-center justify-center"
              >
                <Ionicons name="checkmark-circle" size={24} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white text-lg font-bold">Completado</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleReportProgress}
                className="bg-amber-500 py-4 rounded-xl mb-3 flex-row items-center justify-center"
              >
                <Ionicons name="construct" size={24} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white text-lg font-bold">Reportar progreso</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SimpleWorkDetailScreen;
