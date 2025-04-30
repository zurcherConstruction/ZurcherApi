import api from '../../utils/axios'; // Asegúrate que la ruta a tu instancia de axios sea correcta
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// Quita Alert de aquí, se manejará en el componente
// import { Alert } from 'react-native';

// Initial state
const initialState = {
  incomes: [],
  expenses: [],
  receipts: [],
  balance: null, // Para balances calculados
  loading: false,
  error: null,
};

// --- Thunks para Balance, Income, Expense ---

export const getIncomesAndExpensesByWorkId = createAsyncThunk(
  'balance/getIncomesAndExpensesByWorkId',
  async (idWork, { rejectWithValue }) => { // Recibe idWork
    try {
      // *** LLAMAR AL ENDPOINT ÚNICO DEL BALANCE CONTROLLER ***
      console.log(`Llamando a /balance/work/${idWork}`); // Log para depuración
      const response = await api.get(`/balance/balance/${idWork}`); // <--- ÚNICA LLAMADA

      // Asume que el backend devuelve un objeto como { incomes: [...], expenses: [...] }
      console.log('Respuesta del backend:', response.data); // Log para depuración
      // *** AJUSTAR EL RETURN PARA LA RESPUESTA ÚNICA ***
      return {
         incomes: response.data?.incomes || [], // Asegura que sean arrays
         expenses: response.data?.expenses || [] // Asegura que sean arrays
      };
    } catch (error) {
      // El error ahora vendrá de la llamada a /balance/work/...
      console.error("Error en getIncomesAndExpensesByWorkId:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || error.message || 'Error al obtener ingresos y gastos');
    }
  }
);


export const getBalanceByWorkId = createAsyncThunk(
  'balance/getBalanceByWorkId',
  async (idWork, { rejectWithValue }) => { // Recibe idWork
    try {
      const response = await api.get(`/balance/balance/${idWork}`); // Asegúrate que este endpoint exista
      return response.data; // El balance calculado
    } catch (error) {
      console.error("Error getBalanceByWorkId:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || error.message || 'Error al obtener balance del trabajo');
    }
  }
);

export const getGeneralBalance = createAsyncThunk(
  'balance/getGeneralBalance',
  async (filters, { rejectWithValue }) => { // Recibe filtros opcionales
    try {
      const response = await api.get('/balance/generalBalance', { params: filters }); // Asegúrate que este endpoint exista
      return response.data; // El balance general calculado
    } catch (error) {
      console.error("Error getGeneralBalance:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || error.message || 'Error al obtener balance general');
    }
  }
);

// --- Thunks para Crear Income y Expense (NECESARIOS) ---
export const createIncome = createAsyncThunk(
  'balance/createIncome', // Cambia el prefijo si prefieres 'income/createIncome'
  async (incomeData, { rejectWithValue }) => {
    try {
      const response = await api.post('/income', incomeData);
      return response.data; // Devuelve el income creado
    } catch (error) {
      console.error("Error createIncome:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || error.message || 'Error al crear ingreso');
    }
  }
);

export const createExpense = createAsyncThunk(
  'balance/createExpense', // Cambia el prefijo si prefieres 'expense/createExpense'
  async (expenseData, { rejectWithValue }) => {
    try {
      const response = await api.post('/expense', expenseData);
      return response.data; // Devuelve el expense creado
    } catch (error) {
      console.error("Error createExpense:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || error.message || 'Error al crear gasto');
    }
  }
);


// --- Thunks para Receipts ---
export const createReceipt = createAsyncThunk(
  'balance/createReceipt', // Cambia el prefijo si prefieres 'receipt/createReceipt'
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post('/receipt', formData, {
         headers: { 'Content-Type': 'multipart/form-data' }, // Puede ser necesario explícitamente
      });
      return response.data;
    } catch (error) {
      console.error("Error createReceipt:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || error.message || 'Error al subir comprobante');
    }
  }
);

export const getReceipts = createAsyncThunk(
  'balance/getReceipts', // Cambia el prefijo si prefieres 'receipt/getReceipts'
  async ({ relatedModel, relatedId }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/receipt/${relatedModel}/${relatedId}`);
      return response.data;
    } catch (error) {
       console.error("Error getReceipts:", error.response?.data || error.message);
       return rejectWithValue(error.response?.data?.message || error.message || 'Error al obtener comprobantes');
    }
  }
);

// --- Slice Definition ---
const balanceSlice = createSlice({
  name: 'balance',
  initialState,
  reducers: {
    clearBalanceError: (state) => {
      state.error = null;
    },
    // Puedes añadir otros reducers síncronos si los necesitas
  },
  extraReducers: (builder) => {
    builder
      // Get Incomes & Expenses
      .addCase(getIncomesAndExpensesByWorkId.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(getIncomesAndExpensesByWorkId.fulfilled, (state, action) => {
        state.loading = false;
        state.incomes = action.payload.incomes || [];
        state.expenses = action.payload.expenses || [];
      })
      .addCase(getIncomesAndExpensesByWorkId.rejected, (state, action) => { state.loading = false; state.error = action.payload; }) // Usa action.payload

      // Get Balance by Work ID
      .addCase(getBalanceByWorkId.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(getBalanceByWorkId.fulfilled, (state, action) => { state.loading = false; state.balance = action.payload; })
      .addCase(getBalanceByWorkId.rejected, (state, action) => { state.loading = false; state.error = action.payload; }) // Usa action.payload

      // Get General Balance
      .addCase(getGeneralBalance.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(getGeneralBalance.fulfilled, (state, action) => { state.loading = false; state.balance = action.payload; })
      .addCase(getGeneralBalance.rejected, (state, action) => { state.loading = false; state.error = action.payload; }) // Usa action.payload

      // Create Income
      .addCase(createIncome.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createIncome.fulfilled, (state, action) => { state.loading = false; state.incomes.push(action.payload); })
      .addCase(createIncome.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      // Create Expense
      .addCase(createExpense.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createExpense.fulfilled, (state, action) => { state.loading = false; state.expenses.push(action.payload); })
      .addCase(createExpense.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      // Create Receipt
      .addCase(createReceipt.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createReceipt.fulfilled, (state, action) => { state.loading = false; state.receipts.push(action.payload); })
      .addCase(createReceipt.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      // Get Receipts
      .addCase(getReceipts.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(getReceipts.fulfilled, (state, action) => { state.loading = false; state.receipts = action.payload || []; })
      .addCase(getReceipts.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  },
});

// Export synchronous actions
export const { clearBalanceError } = balanceSlice.actions;

// Export reducer
export default balanceSlice.reducer;

// Opcional: Exportar thunks agrupados si prefieres importarlos así
export const balanceAsyncActions = {
  getIncomesAndExpensesByWorkId,
  getBalanceByWorkId,
  getGeneralBalance,
  createIncome,
  createExpense,
  createReceipt,
  getReceipts,
};