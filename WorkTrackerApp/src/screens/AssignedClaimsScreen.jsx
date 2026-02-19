import React, { useEffect, useState, useMemo } from "react";
import moment from "moment-timezone";
import { useSelector, useDispatch } from "react-redux";
import { fetchAssignedClaims } from "../Redux/Actions/claimActions";
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Platform, Linking
} from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation as useDrawerNavigation } from '@react-navigation/native';
import ClaimDetailScreen from './ClaimDetailScreen';

const Stack = createNativeStackNavigator();

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

const STATUS_COLORS = {
  pending: { bg: 'bg-yellow-200', text: 'text-yellow-800', border: 'border-l-yellow-500' },
  scheduled: { bg: 'bg-blue-200', text: 'text-blue-700', border: 'border-l-blue-500' },
  in_progress: { bg: 'bg-amber-200', text: 'text-amber-700', border: 'border-l-amber-500' },
  completed: { bg: 'bg-green-200', text: 'text-green-700', border: 'border-l-green-500' },
  closed: { bg: 'bg-gray-300', text: 'text-gray-700', border: 'border-l-gray-400' },
  cancelled: { bg: 'bg-red-200', text: 'text-red-700', border: 'border-l-red-500' },
};

const PRIORITY_COLORS = {
  low: { bg: 'bg-gray-100', text: 'text-gray-600' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-600' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700' },
  urgent: { bg: 'bg-red-200', text: 'text-red-700' },
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

const ClaimsListScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { claims, loading, error, lastUpdate } = useSelector((state) => state.claim);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchAssignedClaims());
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchAssignedClaims());
    setRefreshing(false);
  };

  const filteredClaims = useMemo(() => {
    if (!claims) return [];
    const activeStatuses = ['pending', 'scheduled', 'in_progress'];
    let filtered = claims.filter(c => activeStatuses.includes(c.status));

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.propertyAddress?.toLowerCase().includes(lowerQuery) ||
        c.claimNumber?.toLowerCase().includes(lowerQuery) ||
        c.description?.toLowerCase().includes(lowerQuery)
      );
    }

    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    filtered.sort((a, b) => {
      const pA = priorityOrder[a.priority] ?? 4;
      const pB = priorityOrder[b.priority] ?? 4;
      if (pA !== pB) return pA - pB;
      const dA = a.scheduledDate ? new Date(a.scheduledDate) : new Date('2099-12-31');
      const dB = b.scheduledDate ? new Date(b.scheduledDate) : new Date('2099-12-31');
      return dA - dB;
    });
    return filtered;
  }, [claims, searchQuery]);

  if (loading && !refreshing && claims.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text className="text-lg text-blue-600 mt-4">Cargando reclamos...</Text>
      </View>
    );
  }

  if (error && claims.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100 p-5">
        <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
        <Text className="text-lg text-red-600 mt-2">{error}</Text>
        <TouchableOpacity
          onPress={() => dispatch(fetchAssignedClaims())}
          className="mt-4 bg-blue-600 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderHeader = () => (
    <View className="p-4 bg-white border-b border-gray-200">
      <View className="flex-row items-center mb-2">
        <Ionicons name="search" size={20} color="gray" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Buscar por dirección o número..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="flex-1 h-10 text-base"
          clearButtonMode="while-editing"
        />
        <TouchableOpacity onPress={onRefresh} className="ml-2 p-2 bg-blue-100 rounded-lg">
          <Ionicons name="refresh" size={20} color="#1e3a8a" />
        </TouchableOpacity>
      </View>
      {lastUpdate && (
        <Text className="text-xs text-gray-500 text-center">
          Última actualización: {new Date(lastUpdate).toLocaleTimeString()}
        </Text>
      )}
      <View className="flex-row justify-between mt-2">
        <Text className="text-sm text-gray-600">
          {filteredClaims.length} reclamo{filteredClaims.length !== 1 ? 's' : ''} activo{filteredClaims.length !== 1 ? 's' : ''}
        </Text>
        {filteredClaims.filter(c => c.priority === 'urgent').length > 0 && (
          <View className="flex-row items-center">
            <Ionicons name="warning" size={14} color="#dc2626" style={{ marginRight: 4 }} />
            <Text className="text-sm font-bold text-red-600">
              {filteredClaims.filter(c => c.priority === 'urgent').length} urgente{filteredClaims.filter(c => c.priority === 'urgent').length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (filteredClaims.length === 0 && !loading) {
    return (
      <View className="flex-1 bg-gray-100">
        {renderHeader()}
        <View className="flex-1 justify-center items-center p-5">
          <Ionicons name="checkmark-circle-outline" size={64} color="#9ca3af" />
          <Text className="text-lg text-gray-600 text-center mt-4">
            {searchQuery
              ? `No se encontraron reclamos para "${searchQuery}".`
              : "No tienes reclamos asignados."}
          </Text>
        </View>
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
    const priorityStyle = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('ClaimDetail', { claim: item })}
        className={`mb-3 p-4 rounded-xl shadow-sm mx-3 mt-1 bg-white border-l-4 ${statusStyle.border}`}
      >
        {/* Header: Claim Number + Priority Badge */}
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-bold text-blue-800">{item.claimNumber}</Text>
          <View className={`px-2 py-0.5 rounded-full ${priorityStyle.bg}`}>
            <Text className={`text-xs font-bold ${priorityStyle.text}`}>
              {PRIORITY_LABELS[item.priority] || item.priority}
            </Text>
          </View>
        </View>

        {/* Address - tappable to open maps */}
        <TouchableOpacity
          onPress={() => openInMaps(item.propertyAddress)}
          className="flex-row items-center mb-2"
        >
          <Ionicons name="navigate-outline" size={16} color="#2563eb" style={{ marginRight: 4 }} />
          <Text className="text-base font-semibold text-blue-700 flex-1 uppercase underline">
            {item.propertyAddress || "Dirección no disponible"}
          </Text>
        </TouchableOpacity>

        {/* Description (truncated) */}
        {item.description && (
          <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {/* Status + Type + Date row */}
        <View className="flex-row items-center justify-between flex-wrap">
          <View className="flex-row items-center">
            <View className={`px-3 py-1 rounded-md mr-2 ${statusStyle.bg}`}>
              <Text className={`text-xs font-bold uppercase ${statusStyle.text}`}>
                {STATUS_LABELS[item.status] || item.status}
              </Text>
            </View>
            <View className="px-2 py-0.5 rounded bg-gray-100">
              <Text className="text-xs text-gray-600">
                {CLAIM_TYPE_LABELS[item.claimType] || item.claimType}
              </Text>
            </View>
          </View>

          {item.scheduledDate && (
            <View className="flex-row items-center mt-1">
              <Ionicons name="calendar-outline" size={14} color="#059669" style={{ marginRight: 4 }} />
              <Text className="text-xs font-medium text-emerald-700">
                {moment(item.scheduledDate).format("MM-DD-YYYY")}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-100">
      {renderHeader()}
      <FlatList
        data={filteredClaims}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1e3a8a']} />
        }
      />
    </View>
  );
};

// Stack Navigator wrapper
const AssignedClaimsStackNavigator = () => {
  const drawerNavigation = useDrawerNavigation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="ClaimsList"
        component={ClaimsListScreen}
        options={{
          title: 'Mis Reclamos',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => drawerNavigation.toggleDrawer()}
              style={{ marginRight: 12 }}
            >
              <Ionicons name="menu-outline" size={28} color="#1e3a8a" />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="ClaimDetail"
        component={ClaimDetailScreen}
        options={({ route }) => ({
          title: route.params?.claim?.claimNumber || 'Detalle Reclamo',
        })}
      />
    </Stack.Navigator>
  );
};

export default AssignedClaimsStackNavigator;
