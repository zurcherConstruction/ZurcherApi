import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { fetchAssignedMaintenances } from '../Redux/features/maintenanceSlice';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const MaintenanceList = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  
  const { assignedMaintenances, loadingAssigned, error } = useSelector(state => state.maintenance);
  const { staff } = useSelector(state => state.auth); // Obtener staff completo
  
  const [refreshing, setRefreshing] = useState(false);
  
  const staffId = staff?.id; // Extraer el ID del staff

  console.log('🔧 MaintenanceList - Componente montado');
  console.log('🔧 MaintenanceList - Staff:', staff);
  console.log('🔧 MaintenanceList - StaffId:', staffId);
  console.log('🔧 MaintenanceList - Assigned maintenances:', assignedMaintenances);

  useEffect(() => {
    console.log('🔧 MaintenanceList - useEffect ejecutado, staffId:', staffId);
    if (staffId) {
      console.log('🔧 MaintenanceList - Cargando mantenimientos para staffId:', staffId);
      loadMaintenances();
    } else {
      console.log('🔧 MaintenanceList - No hay staffId disponible');
    }
  }, [staffId]);

  const loadMaintenances = async () => {
    if (!staffId) {
      Alert.alert('Error', 'No se pudo identificar el usuario');
      return;
    }
    
    try {
      console.log('🔧 MaintenanceList - Llamando fetchAssignedMaintenances con staffId:', staffId);
      await dispatch(fetchAssignedMaintenances(staffId)).unwrap();
      console.log('🔧 MaintenanceList - fetchAssignedMaintenances completado');
    } catch (err) {
      console.error('🔧 MaintenanceList - Error al cargar:', err);
      Alert.alert('Error', err || 'Error al cargar mantenimientos');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMaintenances();
    setRefreshing(false);
  };

  const handleVisitPress = (visit) => {
    navigation.navigate('MaintenanceWebView', { visit });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending_scheduling':
        return '#9CA3AF'; // gray
      case 'scheduled':
        return '#3B82F6'; // blue
      case 'assigned':
        return '#F59E0B'; // yellow/orange
      case 'completed':
        return '#10B981'; // green
      case 'skipped':
        return '#EF4444'; // red
      default:
        return '#9CA3AF';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending_scheduling':
        return 'Pendiente';
      case 'scheduled':
        return 'Programada';
      case 'assigned':
        return 'Asignada';
      case 'completed':
        return 'Completada';
      case 'skipped':
        return 'Omitida';
      default:
        return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending_scheduling':
        return '⏳';
      case 'scheduled':
        return '📅';
      case 'assigned':
        return '👤';
      case 'completed':
        return '✅';
      case 'skipped':
        return '⏭️';
      default:
        return '📋';
    }
  };

  const renderVisitCard = ({ item: visit }) => {
    const statusColor = getStatusColor(visit.status);
    const permitData = visit.work?.Permit;

    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: statusColor }]}
        onPress={() => handleVisitPress(visit)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.statusIcon}>{getStatusIcon(visit.status)}</Text>
            <Text style={styles.visitNumber}>Visita #{visit.visitNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusText(visit.status)}
            </Text>
          </View>
        </View>

        {/* Dirección de la propiedad */}
        {permitData && (
          <View style={styles.propertySection}>
            <Text style={styles.propertyIcon}>🏠</Text>
            <View style={styles.propertyInfo}>
              <Text style={styles.propertyLabel}>Propiedad:</Text>
              <Text style={styles.propertyAddress}>{permitData.propertyAddress}</Text>
              {permitData.applicant && (
                <Text style={styles.propertyApplicant}>Cliente: {permitData.applicant}</Text>
              )}
            </View>
          </View>
        )}

        {/* Tipo de sistema */}
        {permitData?.systemType && (
          <View style={styles.systemTypeContainer}>
            <Text style={styles.systemTypeLabel}>Sistema:</Text>
            <View style={styles.systemTypeBadge}>
              <Text style={styles.systemTypeText}>{permitData.systemType}</Text>
            </View>
          </View>
        )}

        {/* Fecha programada */}
        {visit.scheduledDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateIcon}>📅</Text>
            <View>
              <Text style={styles.dateLabel}>Fecha programada:</Text>
              <Text style={styles.dateValue}>
                {format(parseISO(visit.scheduledDate), 'dd/MM/yyyy', { locale: es })}
              </Text>
            </View>
          </View>
        )}

        {/* Notas (preview) */}
        {visit.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notas:</Text>
            <Text style={styles.notesText} numberOfLines={2}>
              {visit.notes}
            </Text>
          </View>
        )}

        {/* Call to action */}
        <View style={styles.ctaContainer}>
          <Text style={styles.ctaText}>
            {visit.status === 'completed' ? 'Ver detalles' : 'Completar inspección'}
          </Text>
          <Text style={styles.ctaArrow}>→</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>No hay mantenimientos asignados</Text>
      <Text style={styles.emptyText}>
        Cuando se te asigne una visita de mantenimiento, aparecerá aquí
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
        <Text style={styles.refreshButtonText}>Actualizar</Text>
      </TouchableOpacity>
    </View>
  );

  if (loadingAssigned && !refreshing && assignedMaintenances.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Cargando mantenimientos...</Text>
      </View>
    );
  }

  // Filtrar solo visitas no completadas
  const pendingVisits = assignedMaintenances.filter(v => v.status !== 'completed');
  const completedVisits = assignedMaintenances.filter(v => v.status === 'completed');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Mantenimientos</Text>
        <Text style={styles.headerSubtitle}>
          {pendingVisits.length} pendiente{pendingVisits.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Lista de visitas */}
      <FlatList
        data={assignedMaintenances}
        keyExtractor={(item) => item.id}
        renderItem={renderVisitCard}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />
        }
        contentContainerStyle={[
          styles.listContent,
          assignedMaintenances.length === 0 && styles.listContentEmpty
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* Sección de completadas (opcional, colapsable) */}
      {completedVisits.length > 0 && (
        <View style={styles.completedSection}>
          <Text style={styles.completedTitle}>
            ✅ {completedVisits.length} visita{completedVisits.length !== 1 ? 's' : ''} completada{completedVisits.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  visitNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  propertySection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  propertyIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  propertyAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  propertyApplicant: {
    fontSize: 14,
    color: '#4B5563',
  },
  systemTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  systemTypeLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  systemTypeBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  systemTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  dateLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  notesContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  ctaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  ctaArrow: {
    fontSize: 18,
    color: '#3B82F6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  completedSection: {
    backgroundColor: '#ECFDF5',
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
  },
  completedTitle: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
});

export default MaintenanceList;
