import React, { useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute } from '@react-navigation/native';
import { getIncomesAndExpensesByWorkId, clearBalanceError } from '../Redux/features/balanceSlice'; // Ajusta la ruta si es necesario

const WorkBalanceDetail = () => {
  const route = useRoute();
  const dispatch = useDispatch();
  const { idWork, propertyAddress } = route.params; // Recibir idWork y dirección
console.log('ID del trabajo:', idWork); // Log para depuración
  console.log('Dirección de la propiedad:', propertyAddress); // Log para depuración
  // Obtener datos del estado de Redux
  const { incomes, expenses, loading, error } = useSelector((state) => state.balance);
  console.log("Incomes desde useSelector:", incomes); // <-- Añade este log
  console.log("Expenses desde useSelector:", expenses); // <-- Añade este log
  // Cargar datos al montar el componente
  useEffect(() => {
    if (idWork) {
      dispatch(getIncomesAndExpensesByWorkId(idWork));
    }
    return () => {
      dispatch(clearBalanceError());
    };
  }, [dispatch, idWork]);

  // Formatear fecha (opcional)
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return dateString; // Devolver original si falla
    }
  };

  // Renderizar item de la lista
  const renderItem = ({ item, type }) => (
    <View style={[styles.itemContainer, type === 'income' ? styles.incomeItem : styles.expenseItem]}>
    <View style={styles.itemHeader}>
      {/* Usar item.name */}
      <Text style={styles.itemType}>{item.name || 'Sin nombre'}</Text>
      {/* Usar item.value */}
      <Text style={[styles.itemAmount, type === 'income' ? styles.incomeAmount : styles.expenseAmount]}>
        ${parseFloat(item.value || 0).toFixed(2)}
      </Text>
    </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6b21a8" />
        <Text style={styles.loadingText}>Cargando balance...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error al cargar el balance: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Balance del Trabajo</Text>
      <Text style={styles.subHeaderTitle}>{propertyAddress || 'Sin dirección'}</Text>
      <Text style={styles.sectionTitle}>Ingresos ({incomes.length})</Text>
      {incomes.length === 0 ? (
         <Text style={styles.emptyText}>No hay ingresos registrados.</Text>
      ) : (
        <FlatList
          data={incomes}
          renderItem={(props) => renderItem({ ...props, type: 'income' })}
          keyExtractor={(item) => item.idIncome ? item.idIncome.toString() : Math.random().toString()} // Asegurar key única
          scrollEnabled={false} // Deshabilitar scroll si está dentro de ScrollView
        />
      )}


      {/* Lista de Gastos */}
      <Text style={styles.sectionTitle}>Gastos ({expenses.length})</Text>
       {expenses.length === 0 ? (
         <Text style={styles.emptyText}>No hay gastos registrados.</Text>
      ) : (
        <FlatList
          data={expenses}
          renderItem={(props) => renderItem({ ...props, type: 'expense' })}
          keyExtractor={(item) => item.idExpense ? item.idExpense.toString() : Math.random().toString()} // Asegurar key única
          scrollEnabled={false} // Deshabilitar scroll si está dentro de ScrollView
        />
       )}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6', // gray-100
    padding: 15,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4b5563', // gray-600
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626', // red-600
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937', // gray-800
    textAlign: 'center',
    marginBottom: 5,
  },
   subHeaderTitle: {
    fontSize: 16,
    color: '#4b5563', // gray-600
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151', // gray-700
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db', // gray-300
    paddingBottom: 5,
  },
  itemContainer: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  incomeItem: {
    borderLeftWidth: 5,
    borderLeftColor: '#10b981', // green-500
  },
  expenseItem: {
     borderLeftWidth: 5,
     borderLeftColor: '#ef4444', // red-500
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  itemType: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937', // gray-800
    flex: 1, // Para que tome espacio y empuje el monto
    marginRight: 10,
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  incomeAmount: {
     color: '#059669', // green-600
  },
  expenseAmount: {
     color: '#dc2626', // red-600
  },
  itemDate: {
    fontSize: 14,
    color: '#6b7280', // gray-500
    marginBottom: 3,
  },
  itemNotes: {
    fontSize: 14,
    color: '#4b5563', // gray-600
    marginTop: 5,
  },
   emptyText: {
    textAlign: 'center',
    color: '#6b7280', // gray-500
    marginTop: 10,
    marginBottom: 20,
  },
});

export default WorkBalanceDetail;