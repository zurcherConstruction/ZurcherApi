import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { getMyExpenses } from '../Redux/features/balanceSlice';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const MyExpensesScreen = () => {
  const dispatch = useDispatch();
  const { expenses, loading, error } = useSelector((state) => state.balance);
  const user = useSelector((state) => state.auth?.staff);

  const [groupBy, setGroupBy] = useState('day'); // 'day' o 'month'
  const [refreshing, setRefreshing] = useState(false);
  const [receiptModal, setReceiptModal] = useState({ visible: false, url: null });
  const [selectedMonth, setSelectedMonth] = useState('current'); // 'current' o 'previous'
  
  // Cuando cambia el mes seleccionado, ajustar la agrupación
  const handleMonthChange = (monthType) => {
    setSelectedMonth(monthType);
    // Si selecciona mes anterior, cambiar a vista "por mes" automáticamente
    if (monthType === 'previous' && groupBy === 'day') {
      setGroupBy('month');
    }
  };
  
  // Calcular rango de fechas según mes seleccionado
  const getMonthDates = (monthType) => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth(); // 0-11
    
    if (monthType === 'previous') {
      month = month - 1;
      if (month < 0) {
        month = 11;
        year = year - 1;
      }
    }
    
    const monthStr = String(month + 1).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
    return { startDate, endDate };
  };

  // Cargar gastos al montar o cuando cambie el groupBy o selectedMonth
  const loadExpenses = useCallback(() => {
    if (user?.id) {
      const { startDate, endDate } = getMonthDates(selectedMonth);
      console.log('📱 Cargando mis gastos:', selectedMonth === 'current' ? 'mes actual' : 'mes anterior', startDate, 'a', endDate, 'agrupados por:', groupBy);
      dispatch(getMyExpenses({ startDate, endDate, groupBy }));
    }
  }, [dispatch, user?.id, groupBy, selectedMonth]);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses])
  );

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadExpenses();
    setRefreshing(false);
  };

  // Formatear fecha (YYYY-MM-DD → DD/MM/YYYY)
  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  // Formatear mes (YYYY-MM → Mes YYYY)
  const formatMonth = (monthString) => {
    if (!monthString) return 'Sin mes';
    const [year, month] = monthString.split('-');
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  // Abrir comprobante en modal
  const openReceipt = (url) => {
    if (url) {
      setReceiptModal({ visible: true, url });
    }
  };

  // Cerrar modal de comprobante
  const closeReceiptModal = () => {
    setReceiptModal({ visible: false, url: null });
  };

  // Obtener nombre del mes según selección
  const getMonthName = (monthType) => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth(); // 0-11
    
    if (monthType === 'previous') {
      month = month - 1;
      if (month < 0) {
        month = 11;
        year = year - 1;
      }
    }
    
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${monthNames[month]} ${year}`;
  };

  // Renderizar un expense individual
  const renderExpenseItem = (expense, idx) => {
    const hasReceipt = expense.Receipts && expense.Receipts.length > 0;
    const receiptUrl = hasReceipt ? expense.Receipts[0].fileUrl : null;

    return (
      <View key={expense.idExpense || `expense-${idx}`} style={styles.expenseCard}>
        {/* Header: Tipo y Monto */}
        <View style={styles.expenseHeader}>
          <View style={styles.expenseTypeContainer}>
            <Ionicons name="receipt-outline" size={20} color="#1e40af" />
            <Text style={styles.expenseType}>{expense.typeExpense || 'Gasto General'}</Text>
          </View>
          <Text style={styles.expenseAmount}>${parseFloat(expense.amount || 0).toFixed(2)}</Text>
        </View>

        {/* Fecha */}
        <View style={styles.expenseRow}>
          <Ionicons name="calendar-outline" size={16} color="#6b7280" />
          <Text style={styles.expenseDate}>{formatDate(expense.date)}</Text>
        </View>

        {/* Notas */}
        {expense.notes && (
          <View style={styles.expenseRow}>
            <Ionicons name="chatbox-outline" size={16} color="#6b7280" />
            <Text style={styles.expenseNotes} numberOfLines={2}>{expense.notes}</Text>
          </View>
        )}

        {/* Comprobante */}
        {hasReceipt && (
          <TouchableOpacity 
            style={styles.receiptButton}
            onPress={() => openReceipt(receiptUrl)}
          >
            <Ionicons name="document-attach-outline" size={18} color="#2563eb" />
            <Text style={styles.receiptButtonText}>Ver Comprobante</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Renderizar grupo por día
  const renderDayGroup = (group, index) => {
    return (
      <View key={group.date || `day-group-${index}`} style={styles.groupContainer}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupDate}>{formatDate(group.date)}</Text>
          <Text style={styles.groupTotal}>Total: ${group.total.toFixed(2)}</Text>
        </View>
        {group.expenses.map((expense, idx) => renderExpenseItem(expense, idx))}
      </View>
    );
  };

  // Renderizar grupo por mes
  const renderMonthGroup = (group, index) => {
    return (
      <View key={group.month || `month-group-${index}`} style={styles.groupContainer}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupMonth}>{formatMonth(group.month)}</Text>
          <Text style={styles.groupTotal}>Total: ${group.total.toFixed(2)}</Text>
        </View>
        {group.expenses.map((expense, idx) => renderExpenseItem(expense, idx))}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Cargando gastos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con filtros */}
      <View style={styles.header}>
        <Text style={styles.title}>Mis Gastos</Text>
        
        {/* Selector de mes */}
        <View style={styles.monthSelectorContainer}>
          <TouchableOpacity
            style={[styles.monthButton, selectedMonth === 'current' && styles.monthButtonActive]}
            onPress={() => handleMonthChange('current')}
          >
            <Text style={[styles.monthButtonText, selectedMonth === 'current' && styles.monthButtonTextActive]}>
              {getMonthName('current')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.monthButton, selectedMonth === 'previous' && styles.monthButtonActive]}
            onPress={() => handleMonthChange('previous')}
          >
            <Text style={[styles.monthButtonText, selectedMonth === 'previous' && styles.monthButtonTextActive]}>
              {getMonthName('previous')}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Toggle para agrupar por día/mes */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, groupBy === 'day' && styles.toggleButtonActive]}
            onPress={() => setGroupBy('day')}
            disabled={selectedMonth === 'previous'}
          >
            <Text style={[
              styles.toggleText, 
              groupBy === 'day' && styles.toggleTextActive,
              selectedMonth === 'previous' && styles.toggleTextDisabled
            ]}>
              Por Día
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, groupBy === 'month' && styles.toggleButtonActive]}
            onPress={() => setGroupBy('month')}
          >
            <Text style={[styles.toggleText, groupBy === 'month' && styles.toggleTextActive]}>
              Por Mes
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de gastos */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1e40af']} />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={40} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadExpenses}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && expenses.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={60} color="#9ca3af" />
            <Text style={styles.emptyText}>No tienes gastos registrados</Text>
            <Text style={styles.emptySubtext}>Tus gastos aparecerán aquí</Text>
          </View>
        )}

        {!loading && !error && expenses.length > 0 && groupBy === 'day' && 
          expenses.map((group, idx) => renderDayGroup(group, idx))
        }
        
        {!loading && !error && expenses.length > 0 && groupBy === 'month' && 
          expenses.map((group, idx) => renderMonthGroup(group, idx))
        }
      </ScrollView>

      {/* Modal para ver comprobante */}
      <Modal
        visible={receiptModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeReceiptModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={closeReceiptModal}
            >
              <Ionicons name="close" size={28} color="#ffffff" />
            </TouchableOpacity>
            
            {receiptModal.url && (
              <Image
                source={{ uri: receiptModal.url }}
                style={styles.receiptImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  monthSelectorContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  monthButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  monthButtonActive: {
    backgroundColor: '#10b981',
  },
  monthButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  monthButtonTextActive: {
    color: '#ffffff',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#1e40af',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  toggleTextDisabled: {
    color: '#d1d5db',
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  groupContainer: {
    marginBottom: 20,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  groupMonth: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  groupTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
  },
  expenseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expenseTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expenseType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  expenseDate: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  expenseNotes: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  receiptButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    marginLeft: 6,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    marginTop: 10,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#1e40af',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: -40,
    right: 10,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  receiptImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
});

export default MyExpensesScreen;
