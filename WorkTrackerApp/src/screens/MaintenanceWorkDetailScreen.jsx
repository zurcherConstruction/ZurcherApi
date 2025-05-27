import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, Button, FlatList, Platform
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import {
  fetchMaintenanceVisitsByWork,
  updateMaintenanceVisitData,
} from '../Redux/features/maintenanceSlice';
import { fetchStaff } from "../Redux/Actions/staffActions";
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isValid, parse } from 'date-fns'; // Asegúrate que parse esté importado
import { es } from 'date-fns/locale';
import Toast from 'react-native-toast-message';
import { Calendar, LocaleConfig } from 'react-native-calendars'; // <--- IMPORTAR CALENDAR

// Configuración de locale para react-native-calendars (opcional, pero recomendado para consistencia)
LocaleConfig.locales['es'] = {
  monthNames: [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ],
  monthNamesShort: ['Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.', 'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom.', 'Lun.', 'Mar.', 'Mié.', 'Jue.', 'Vie.', 'Sáb.'],
  today: "Hoy"
};
LocaleConfig.defaultLocale = 'es';

const MaintenanceWorkDetailScreen = () => {
  const route = useRoute();
  const dispatch = useDispatch();
  const { workId, workDetails: routeWorkDetails } = route.params;
console.log('[DEBUG] workId from route.params:', workId);
  const {
    currentWorkDetail,
    maintenanceVisitsByWorkId,
    loadingVisits,
    error: maintenanceError,
    visitsLoadedForWork // Mantenemos esto para las visitas
  } = useSelector(state => {
    // LOG 2: Ver el estado de maintenance desde Redux
    console.log('[DEBUG] useSelector - state.maintenance:', JSON.stringify(state.maintenance, null, 2));
    return state.maintenance;
  });
  // Para staff, no usaremos un flag 'staffLoaded' del slice, sino que manejaremos la carga inicial aquí.
  const {
    staffList,
    loading: loadingStaff,
    error: staffError
  } = useSelector(state => state.staff);

 const [selectedVisitForEditing, setSelectedVisitForEditing] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [newScheduledDate, setNewScheduledDate] = useState(new Date()); // Mantenemos como objeto Date
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false); // <--- Para controlar visibilidad del calendario

  const workData = routeWorkDetails || (currentWorkDetail && currentWorkDetail.idWork === workId ? currentWorkDetail : null);
  const visitsForCurrentWork = maintenanceVisitsByWorkId[workId] || [];
  const initialStaffFetchAttempted = useRef(false);

  // Efecto para cargar las visitas de mantenimiento (usando el flag del slice)
  useEffect(() => {
    // LOG 3: Dentro del useEffect de carga de visitas
    console.log(`[DEBUG] useEffect (visits) - workId: ${workId}, visitsLoadedForWork[workId]: ${visitsLoadedForWork?.[workId]}, loadingVisits: ${loadingVisits}`);
    if (workId && !visitsLoadedForWork?.[workId] && !loadingVisits) {
      console.log(`[DEBUG] EFFECT: Dispatching fetchMaintenanceVisitsByWork for workId: ${workId}`);
      dispatch(fetchMaintenanceVisitsByWork(workId));
    }
  }, [dispatch, workId, visitsLoadedForWork, loadingVisits]);


  // Efecto para cargar la lista de staff (solo una vez si es necesario)
  useEffect(() => {
    // Si no hay staff, no se está cargando, y no se ha intentado la carga inicial.
    if ((!staffList || staffList.length === 0) && !loadingStaff && !initialStaffFetchAttempted.current) {
      console.log("EFFECT: Fetching staff list (initial attempt)...");
      dispatch(fetchStaff());
      initialStaffFetchAttempted.current = true; // Marcar que se intentó
    }
  }, [dispatch, staffList, loadingStaff]); // Depender de staffList y loadingStaff para re-evaluar si es necesario,
                                           // pero initialStaffFetchAttempted.current previene el bucle.

  useFocusEffect(
    useCallback(() => {
      console.log("FOCUS EFFECT: MaintenanceWorkDetailScreen focused.");
      // Lógica para recargar visitas si es necesario (ej. si no están cargadas)
      if (workId && !visitsLoadedForWork[workId] && !loadingVisits) {
         console.log(`FOCUS EFFECT: Re-fetching maintenance visits for workId: ${workId}`);
         dispatch(fetchMaintenanceVisitsByWork(workId));
      }

      // Opcional: Lógica para recargar staff al enfocar, similar a PendingWorks.
      // Esto podría ser útil si la lista de staff puede cambiar mientras el usuario está en otras pantallas.
      // Si decides hacerlo, asegúrate de que no cause problemas si `fetchStaff` siempre cambia la referencia de `staffList`.
      // Una forma sería solo si está vacía:
      // if ((!staffList || staffList.length === 0) && !loadingStaff) {
      //   console.log("FOCUS EFFECT: Re-fetching staff list as it's empty or not loading.");
      //   dispatch(fetchStaff());
      //   initialStaffFetchAttempted.current = true; // Actualizar ref si se hace fetch aquí
      // }
      // O simplemente llamar dispatch(fetchStaff()); si quieres que siempre se refresque al enfocar.

      return () => {
        console.log("FOCUS EFFECT: MaintenanceWorkDetailScreen unfocused/cleaned up.");
      };
    }, [dispatch, workId, visitsLoadedForWork, loadingVisits, staffList, loadingStaff]) // Añadir staffList y loadingStaff si se usan en la lógica de staff del focus effect
  );

   const handleOpenEditModal = (visit) => {
    setSelectedVisitForEditing(visit);
    const scheduled = visit.scheduledDate ? parseISO(visit.scheduledDate) : new Date();
    setNewScheduledDate(isValid(scheduled) ? scheduled : new Date());
    setSelectedStaffId(visit.staffId || null);
    setShowCalendar(false); // Asegurarse que el calendario esté oculto al abrir
    setIsEditModalVisible(true);
  };

  // Manejador para la selección de fecha en react-native-calendars
  const onDayPress = (day) => { 
    const [year, month, date] = day.dateString.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, date); 
    setNewScheduledDate(selectedDate);
    setShowCalendar(false); 
  };


  const handleConfirmUpdateVisit = async () => {
    if (!selectedVisitForEditing) return;
    let formattedDate;
    try {
        // newScheduledDate ya es un objeto Date
        if (!isValid(newScheduledDate)) {
            Toast.show({ type: 'error', text1: 'Fecha Inválida', text2: 'La fecha seleccionada no es válida.' });
            return;
        }
        formattedDate = format(newScheduledDate, 'yyyy-MM-dd'); // Formato para el backend
    } catch (e) {
        Toast.show({ type: 'error', text1: 'Error de Fecha', text2: 'No se pudo procesar la fecha.' });
        return;
    }
    const visitDataToUpdate = {
      scheduledDate: formattedDate,
      staffId: selectedStaffId,
      status: selectedStaffId ? 'assigned' : (selectedVisitForEditing.status === 'pending_scheduling' ? 'pending_scheduling' : 'scheduled'),
      workId: selectedVisitForEditing.workId 
    };
    try {
      const resultAction = await dispatch(updateMaintenanceVisitData({ visitId: selectedVisitForEditing.id, visitData: visitDataToUpdate }));
      if (updateMaintenanceVisitData.fulfilled.match(resultAction)) {
        Toast.show({
          type: 'success',
          text1: 'Visita Actualizada',
          text2: `La visita N° ${selectedVisitForEditing.visitNumber} ha sido actualizada.`,
        });
      } else {
        const errorMessage = resultAction.payload?.message || resultAction.error?.message || 'No se pudo actualizar la visita.';
        Toast.show({ type: 'error', text1: 'Error al Actualizar', text2: errorMessage });
      }
      setIsEditModalVisible(false);
      setSelectedVisitForEditing(null);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error Inesperado',
        text2: err?.message || 'Ocurrió un error al procesar la solicitud.',
      });
    }
  };

  

  const renderStaffSelectItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.staffSelectItem, selectedStaffId === item.id && styles.staffSelectedItem]}
      onPress={() => setSelectedStaffId(item.id)}
    >
      {/* Corregir el estilo del texto para que cambie de color */}
      <Text style={selectedStaffId === item.id ? styles.staffSelectedItemTextContent : styles.staffSelectItemTextContent}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  // Indicador de carga principal
  if ((loadingVisits && !visitsLoadedForWork[workId]) || (loadingStaff && (!staffList || staffList.length === 0))) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text>Cargando datos...</Text>
      </View>
    );
  }

  if (maintenanceError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{maintenanceError.message || 'Ocurrió un error al cargar visitas.'}</Text>
      </View>
    );
  }
   if (staffError && (!staffList || staffList.length === 0) /* Solo mostrar error de staff si no hay lista */) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{staffError.message || 'Ocurrió un error al cargar el personal.'}</Text>
      </View>
    );
  }
  
  if (!workData && visitsForCurrentWork.length === 0 && !loadingVisits && visitsLoadedForWork[workId]) {
     return (
      <View style={styles.centered}>
        <Text>No se encontraron datos para la obra ID: {workId}.</Text>
      </View>
    );
  }

  // Para restringir al mes del mantenimiento en react-native-calendars
  let minDateCalendar = undefined;
  let maxDateCalendar = undefined;
  let currentCalendarMonth = format(newScheduledDate, 'yyyy-MM-dd'); // Mes inicial para el calendario

  if (selectedVisitForEditing && selectedVisitForEditing.scheduledDate) {
      try {
          const originalVisitDate = parseISO(selectedVisitForEditing.scheduledDate);
          if (isValid(originalVisitDate)) {
              currentCalendarMonth = format(originalVisitDate, 'yyyy-MM-dd'); // Mostrar el mes de la visita original
              minDateCalendar = format(new Date(originalVisitDate.getFullYear(), originalVisitDate.getMonth(), 1), 'yyyy-MM-dd');
              maxDateCalendar = format(new Date(originalVisitDate.getFullYear(), originalVisitDate.getMonth() + 1, 0), 'yyyy-MM-dd');
          }
      } catch (e) { console.error("Error parsing original visit date for calendar bounds", e); }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Detalle de Mantenimiento</Text>
      {workData && (
        <View style={styles.workDetailCard}>
          <Text style={styles.subtitle}>Obra: {workData.Permit?.propertyAddress || workData.propertyAddress || `ID: ${workData.idWork || workId}`}</Text>
          <Text style={styles.detailText}>Cliente: {workData.Permit?.applicantName || workData.applicantName || 'N/A'}</Text>
        </View>
      )}
      
      <Text style={styles.visitsTitle}>Visitas de Mantenimiento:</Text>
      {loadingVisits && <ActivityIndicator style={{ marginVertical: 10 }} color="#1e3a8a" /> }
      {!loadingVisits && visitsForCurrentWork.length === 0 && visitsLoadedForWork[workId] && (
        <Text style={styles.noVisitsText}>No hay visitas de mantenimiento registradas para esta obra.</Text>
      )}
     {visitsForCurrentWork.length > 0 && (
    visitsForCurrentWork.map(visit => (
      <View key={visit.id} style={styles.visitItem}>
        <View style={styles.visitHeader}>
            <Text style={styles.visitNumber}>Visita N°: {visit.visitNumber}</Text>
            <TouchableOpacity onPress={() => handleOpenEditModal(visit)} style={styles.editButton}>
                <Ionicons name="pencil-outline" size={20} color="#1e3a8a" />
            </TouchableOpacity>
        </View>
        <Text style={styles.detailText}>Fecha Programada: {visit.scheduledDate ? format(parseISO(visit.scheduledDate), "dd MMM yyyy", { locale: es }) : 'N/A'}</Text>
        <Text style={styles.detailText}>Estado: {visit.status}</Text>
        <Text style={styles.detailText}>Asignada a: {visit.assignedStaff?.name || 'Sin asignar'}</Text>
      </View>
    ))
  )}

      {selectedVisitForEditing && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={isEditModalVisible}
          onRequestClose={() => {
            setIsEditModalVisible(false);
            setSelectedVisitForEditing(null);
            setShowCalendar(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Editar Visita N° {selectedVisitForEditing.visitNumber}</Text>
              
              <Text style={styles.modalLabel}>Fecha Programada:</Text>
              <TouchableOpacity onPress={() => setShowCalendar(true)}>
                <Text style={styles.dateDisplay}>
                  {format(newScheduledDate, "dd MMM yyyy", { locale: es })}
                </Text>
              </TouchableOpacity>

              {showCalendar && (
                <View>
                  <Calendar
                    current={currentCalendarMonth} // Para mostrar el mes de la visita original
                    minDate={minDateCalendar}     // Restringir al mes de la visita
                    maxDate={maxDateCalendar}     // Restringir al mes de la visita
                    onDayPress={onDayPress}
                    markedDates={{
                      [format(newScheduledDate, 'yyyy-MM-dd')]: {selected: true, selectedColor: '#1e3a8a'},
                    }}
                    monthFormat={'MMMM yyyy'}
                    // Podrías añadir más props de estilo aquí si es necesario
                    theme={{
                        arrowColor: '#1e3a8a',
                        todayTextColor: '#1e3a8a',
                        // ... más temas
                    }}
                  />
                  <Button title="Cerrar Calendario" onPress={() => setShowCalendar(false)} color="grey" />
                </View>
              )}

              <Text style={styles.modalLabel}>Asignar a Staff:</Text>
              {/* ... Staff selection FlatList ... */}
              {loadingStaff && <ActivityIndicator />}
              {staffError && <Text style={styles.errorText}>{staffError.message || 'Error cargando staff.'}</Text>}
              {!loadingStaff && staffList && staffList.length > 0 ? (
                <FlatList
                  data={staffList}
                  renderItem={renderStaffSelectItem}
                  keyExtractor={item => item.id.toString()}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  ListEmptyComponent={<Text>No hay personal disponible.</Text>}
                />
              ) : (
                !loadingStaff && (!staffList || staffList.length === 0) && <Text>No hay personal para asignar.</Text>
              )}
               <TouchableOpacity onPress={() => setSelectedStaffId(null)} style={styles.clearStaffButton}>
                  <Text style={styles.clearStaffButtonText}>Limpiar Asignación</Text>
              </TouchableOpacity>


              <View style={styles.modalActions}>
                <Button title="Cancelar" onPress={() => {
                    setIsEditModalVisible(false);
                    setSelectedVisitForEditing(null);
                    setShowCalendar(false);
                }} color="grey" />
                <Button title="Guardar Cambios" onPress={handleConfirmUpdateVisit} />
              </View>
            </View>
          </View>
        </Modal>
      )}
       <Toast />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  // ... (otros estilos) ...
  staffSelectItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  staffSelectedItem: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  staffSelectItemTextContent: { 
    color: '#333', 
  },
  staffSelectedTextContent: { 
    color: '#fff', 
  },
  clearStaffButton: {
    marginTop: 10,
    padding: 8,
    alignItems: 'center',
  },
  clearStaffButtonText: {
    color: '#007bff',
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1e3a8a',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#343a40',
  },
  workDetailCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  visitsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 12,
    color: '#1e3a8a',
  },
  visitItem: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  visitNumber: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#007bff'
  },
  editButton: {
    padding: 5,
  },
  detailText: {
    fontSize: 15,
    color: '#495057',
    marginBottom: 4,
  },
  noVisitsText: {
    fontSize: 15,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'stretch',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  dateDisplay: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderColor: '#007bff',
    borderWidth: 1,
    borderRadius: 5,
    textAlign: 'center',
    marginBottom: 10,
    color: '#007bff',
  }
});

export default MaintenanceWorkDetailScreen;