import React, { useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchWorksInMaintenance, setCurrentWorkDetail, fetchMaintenanceVisitsByWork } from '../Redux/features/maintenanceSlice';
import { format, parseISO, isValid, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const MaintenanceOverviewScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { worksInMaintenance, loading, error } = useSelector((state) => state.maintenance);
 
  const { staff } = useSelector((state) => state.auth);

  const loadWorksInMaintenance = useCallback(() => {
    if (staff?.role === 'owner' || staff?.role === 'admin' || staff?.role === 'office') { // Ajusta roles según sea necesario
      dispatch(fetchWorksInMaintenance());
    }
  }, [dispatch, staff?.role]);

  useFocusEffect(
    useCallback(() => {
      loadWorksInMaintenance();
    }, [loadWorksInMaintenance])
  );

  const handleSelectWork = (work) => {
    dispatch(setCurrentWorkDetail(work));
    dispatch(fetchMaintenanceVisitsByWork(work.idWork));
    navigation.navigate('MaintenanceWorkDetail', { workId: work.idWork, title: work.Permit?.propertyAddress || `Mantenimiento Obra #${work.idWork}` });
  };

  const formatDateString = (dateString) => { // Renombrado para claridad
    if (!dateString) return 'N/A';
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, "dd MMM yyyy", { locale: es }) : 'Fecha inválida';
    } catch (e) {
      console.error("Error en formatDateString:", e, "con dateString:", dateString);
      return 'Error de fecha';
    }
  };

  const renderWorkItem = ({ item }) => {
    let dateLabel = "Fecha Programada:";
    let dateValue = "N/A";

    if (item.nextMaintenanceDate && isValid(parseISO(item.nextMaintenanceDate))) {
      dateValue = formatDateString(item.nextMaintenanceDate);
    } else if (item.maintenanceStartDate && isValid(parseISO(item.maintenanceStartDate))) {
      try {
        const baseDate = parseISO(item.maintenanceStartDate);
        const suggestedFirstVisitDate = addMonths(baseDate, 6);
        dateValue = format(suggestedFirstVisitDate, "dd MMM yyyy", { locale: es });
        dateLabel = "1ra Visita Sugerida:";
      } catch (e) {
        console.error("Error calculando fecha sugerida para item:", item.idWork, e);
        dateValue = "Error al calcular";
      }
    }
    
    // Asegurar que todos los valores dinámicos sean strings o un fallback de string explícito
    const propertyAddressText = item.Permit?.propertyAddress ? String(item.Permit.propertyAddress) : `Obra ID: ${item.idWork}`;
    const applicantNameText = item.Permit?.applicantName ? String(item.Permit.applicantName) : 'N/A';
    
    let nextVisitNumberText;
    if (item.nextVisitNumber !== null && item.nextVisitNumber !== undefined && item.nextVisitNumber !== '') {
        nextVisitNumberText = String(item.nextVisitNumber);
    } else {
        nextVisitNumberText = dateLabel.includes("Sugerida") ? '1 (Sugerida)' : 'N/A';
    }

    let nextVisitStatusText;
    if (dateLabel.includes("Sugerida")) {
        nextVisitStatusText = '-';
    } else {
        nextVisitStatusText = item.nextVisitStatus ? String(item.nextVisitStatus) : 'N/A';
    }

    // dateLabel y dateValue ya deberían ser strings por la lógica anterior.
    // Para extra seguridad:
    const finalDateLabel = String(dateLabel);
    const finalDateValue = String(dateValue);

    return (
      <TouchableOpacity style={styles.itemContainer} onPress={() => handleSelectWork(item)}>
        <View style={styles.itemHeader}>
          <Ionicons name="construct-outline" size={24} color="#1e3a8a" style={styles.itemIcon} />
          <Text style={styles.itemTitle}>{propertyAddressText}</Text>
        </View>
        <View style={styles.itemDetailRow}>
          <Text style={styles.detailLabel}>Cliente:</Text>
          <Text style={styles.detailValue}>{applicantNameText}</Text>
        </View>
        <View style={styles.itemDetailRow}>
          <Text style={styles.detailLabel}>Próxima Visita N°:</Text>
          <Text style={styles.detailValue}>{nextVisitNumberText}</Text>
        </View>
        
        <View style={styles.itemDetailRow}>
          <Text style={styles.detailLabel}>{finalDateLabel}</Text>
          <Text style={[styles.detailValue, styles.dateValue]}>{finalDateValue}</Text>
        </View>

        <View style={styles.itemDetailRow}>
          <Text style={styles.detailLabel}>Estado Próx. Visita:</Text>
          <Text style={styles.detailValue}>{nextVisitStatusText}</Text>
        </View>
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward-outline" size={24} color="#cccccc" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && (!worksInMaintenance || worksInMaintenance.length === 0) ) { // Condición ajustada
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text>Cargando obras en mantenimiento...</Text>
      </View>
    );
  }

  if (error) {
    let errorMessage = "Ocurrió un error desconocido.";
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error.message === 'string') {
      errorMessage = error.message;
    } else {
      try {
        const stringifiedError = JSON.stringify(error);
        errorMessage = stringifiedError.length > 150 ? stringifiedError.substring(0, 150) + "..." : stringifiedError;
      } catch (e) {
        errorMessage = "Error al procesar el mensaje de error.";
      }
    }
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={50} color="red" />
        <Text style={styles.errorText}>Error al cargar datos: {errorMessage}</Text>
        <TouchableOpacity onPress={loadWorksInMaintenance} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!loading && (!worksInMaintenance || worksInMaintenance.length === 0)) {
    return (
      <View style={styles.centered}>
        <Ionicons name="information-circle-outline" size={50} color="#4B5563" />
        <Text style={styles.emptyText}>No hay obras actualmente en ciclo de mantenimiento.</Text>
        <TouchableOpacity onPress={loadWorksInMaintenance} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Actualizar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={worksInMaintenance}
      renderItem={renderWorkItem}
      keyExtractor={(item) => String(item.idWork)} // Asegurar que la key sea string
      contentContainerStyle={styles.listContainer}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadWorksInMaintenance} colors={["#1e3a8a"]} />
      }
    />
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    color: 'red',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 10,
    color: '#4B5563',
    textAlign: 'center',
    fontSize: 16,
  },
  listContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  itemContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemIcon: {
    marginRight: 10,
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1e3a8a',
    flexShrink: 1, // Para evitar que el texto largo empuje el ícono de flecha
  },
  itemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Alinear items verticalmente en la fila
    marginBottom: 6, // Ajuste ligero
    paddingLeft: 5, 
  },
  detailLabel: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
    marginRight: 8, // Espacio entre label y value
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    flexShrink: 1, // Permitir que el valor se encoja si es necesario
  },
  dateValue: { // Este estilo se aplica al Text que contiene la fecha
    fontWeight: '600',
  },
  arrowContainer: {
    position: 'absolute',
    right: 15,
    top: '50%', 
    transform: [{ translateY: -12 }], 
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#1e3a8a',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default MaintenanceOverviewScreen;