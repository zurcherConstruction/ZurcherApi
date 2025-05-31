import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const SyncIndicator = ({ lastUpdate, isRefreshing }) => {
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Nunca';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Hace un momento';
    if (minutes === 1) return 'Hace 1 minuto';
    return `Hace ${minutes} minutos`;
  };

  return (
    <View style={styles.container}>
      <Ionicons 
        name={isRefreshing ? "sync" : "checkmark-circle"} 
        size={16} 
        color={isRefreshing ? "#f59e0b" : "#10b981"} 
        style={isRefreshing && styles.spinning}
      />
      <Text style={styles.text}>
        {isRefreshing ? 'Sincronizando...' : `Actualizado ${getTimeAgo(lastUpdate)}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  text: {
    marginLeft: 8,
    fontSize: 12,
    color: '#6b7280',
  },
  spinning: {
    // Podrías agregar una animación de rotación aquí
  },
});

export default SyncIndicator;