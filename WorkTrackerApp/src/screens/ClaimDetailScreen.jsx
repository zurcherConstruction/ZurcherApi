import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Image, Alert, ActivityIndicator, Platform, Linking,
  KeyboardAvoidingView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useDispatch } from "react-redux";
import { updateClaimStatus, uploadClaimRepairImage } from "../Redux/Actions/claimActions";
import moment from "moment-timezone";

const STATUS_LABELS = {
  pending: "Pendiente",
  scheduled: "Agendado",
  in_progress: "En Progreso",
  completed: "Completado",
  closed: "Cerrado",
  cancelled: "Cancelado",
};

const PRIORITY_LABELS = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const CLAIM_TYPE_LABELS = {
  warranty: "Garantía",
  repair: "Reparación",
  callback: "Callback",
  complaint: "Queja",
  other: "Otro",
};

const PRIORITY_COLORS = {
  low: { bg: "bg-gray-100", text: "text-gray-600" },
  medium: { bg: "bg-blue-100", text: "text-blue-600" },
  high: { bg: "bg-orange-100", text: "text-orange-700" },
  urgent: { bg: "bg-red-200", text: "text-red-700" },
};

const STATUS_COLORS = {
  pending: { bg: "bg-yellow-200", text: "text-yellow-800" },
  scheduled: { bg: "bg-blue-200", text: "text-blue-700" },
  in_progress: { bg: "bg-amber-200", text: "text-amber-700" },
  completed: { bg: "bg-green-200", text: "text-green-700" },
  closed: { bg: "bg-gray-300", text: "text-gray-700" },
  cancelled: { bg: "bg-red-200", text: "text-red-700" },
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

const ClaimDetailScreen = ({ route, navigation }) => {
  const { claim } = route.params;
  const dispatch = useDispatch();

  const [resolution, setResolution] = useState(claim.resolution || "");
  const [localImages, setLocalImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const existingRepairImages = claim.repairImages || [];
  const priorityStyle = PRIORITY_COLORS[claim.priority] || PRIORITY_COLORS.medium;
  const statusStyle = STATUS_COLORS[claim.status] || STATUS_COLORS.pending;

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
        await dispatch(uploadClaimRepairImage(claim.id, img.uri));
      } catch (err) {
        console.error("Error uploading image:", err);
        allSuccess = false;
      }
    }
    setUploading(false);
    if (allSuccess) setLocalImages([]);
    return allSuccess;
  };

  // -------- Submit as "Reparado" --------
  const handleMarkCompleted = async () => {
    if (!resolution.trim() && localImages.length === 0) {
      Alert.alert(
        "Comentario requerido",
        "Por favor agregue un comentario o fotos de la reparación antes de marcar como reparado."
      );
      return;
    }

    Alert.alert(
      "Confirmar",
      "¿Marcar este reclamo como REPARADO?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, Reparado",
          onPress: async () => {
            setSaving(true);
            try {
              await uploadImages();
              await dispatch(
                updateClaimStatus(claim.id, {
                  status: "completed",
                  resolution: resolution.trim(),
                  repairDate: new Date().toISOString(),
                })
              );
              Alert.alert("Listo", "Reclamo marcado como reparado.", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } catch (err) {
              Alert.alert("Error", "No se pudo actualizar el reclamo.");
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  // -------- Submit as "Continúa pendiente" --------
  const handleStillPending = async () => {
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
        updateClaimStatus(claim.id, {
          status: "in_progress",
          notes: `[${moment().format("MM-DD-YYYY HH:mm")}] ${resolution.trim()}`,
        })
      );
      Alert.alert("Enviado", "Reporte enviado. El reclamo continúa en progreso.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert("Error", "No se pudo enviar el reporte.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView className="flex-1 bg-gray-100" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ---- Claim Info Card ---- */}
        <View className="bg-white mx-3 mt-4 p-4 rounded-xl shadow-sm">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-blue-900">{claim.claimNumber}</Text>
            <View className={`px-3 py-1 rounded-full ${priorityStyle.bg}`}>
              <Text className={`text-xs font-bold ${priorityStyle.text}`}>
                {PRIORITY_LABELS[claim.priority] || claim.priority}
              </Text>
            </View>
          </View>

          {/* Address - tappable */}
          <TouchableOpacity
            onPress={() => openInMaps(claim.propertyAddress)}
            className="flex-row items-center mb-3 bg-blue-50 p-3 rounded-lg"
          >
            <Ionicons name="navigate" size={22} color="#2563eb" style={{ marginRight: 8 }} />
            <View className="flex-1">
              <Text className="text-base font-bold text-blue-700 uppercase">
                {claim.propertyAddress || "Dirección no disponible"}
              </Text>
              <Text className="text-xs text-blue-500 mt-1">Tocar para abrir en Maps</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#2563eb" />
          </TouchableOpacity>

          {/* Status + Type */}
          <View className="flex-row items-center mb-3">
            <View className={`px-3 py-1 rounded-md mr-2 ${statusStyle.bg}`}>
              <Text className={`text-xs font-bold uppercase ${statusStyle.text}`}>
                {STATUS_LABELS[claim.status] || claim.status}
              </Text>
            </View>
            <View className="px-2 py-1 rounded bg-gray-100">
              <Text className="text-xs text-gray-600">
                {CLAIM_TYPE_LABELS[claim.claimType] || claim.claimType}
              </Text>
            </View>
          </View>

          {/* Description */}
          {claim.description ? (
            <View className="mb-3">
              <Text className="text-sm font-semibold text-gray-700 mb-1">Descripción:</Text>
              <Text className="text-sm text-gray-600">{claim.description}</Text>
            </View>
          ) : null}

          {/* Scheduled Date */}
          {claim.scheduledDate && (
            <View className="flex-row items-center mb-2">
              <Ionicons name="calendar-outline" size={16} color="#059669" style={{ marginRight: 6 }} />
              <Text className="text-sm text-emerald-700">
                Programado: {moment(claim.scheduledDate).format("MM-DD-YYYY")}
              </Text>
            </View>
          )}

          {/* Existing notes */}
          {claim.notes ? (
            <View className="mt-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <Text className="text-xs font-bold text-yellow-800 mb-1">Notas previas:</Text>
              <Text className="text-sm text-yellow-900">{claim.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* ---- Existing Repair Images ---- */}
        {existingRepairImages.length > 0 && (
          <View className="bg-white mx-3 mt-4 p-4 rounded-xl shadow-sm">
            <Text className="text-sm font-bold text-gray-700 mb-2">
              Fotos de reparación previas ({existingRepairImages.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {existingRepairImages.map((img, idx) => (
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
            Agregar fotos de la reparación
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
            Comentario de la reparación
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
                <Text className="text-white text-lg font-bold">Reparado</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleStillPending}
                className="bg-amber-500 py-4 rounded-xl mb-3 flex-row items-center justify-center"
              >
                <Ionicons name="time" size={24} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white text-lg font-bold">Continúa pendiente</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ClaimDetailScreen;
