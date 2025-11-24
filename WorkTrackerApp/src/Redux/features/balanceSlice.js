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
  async (idWork, { rejectWithValue }) => {
    try {
      const url = `/balance/balance/${idWork}`;
      if (__DEV__) {
        console.log(`Obteniendo balance para work ${idWork}`);
      }
      const response = await api.get(url);

      // Extraer los arrays desde la propiedad 'details'
      return {
         incomes: response.data?.details?.incomes || [],
         expenses: response.data?.details?.expenses || []
      };

    } catch (error) {
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

// Thunk para crear Gasto General y opcionalmente subir Recibo
export const createGeneralExpenseWithReceipt = createAsyncThunk(
  'balance/createGeneralExpenseWithReceipt',
  async ({ amount, notes, image, staffId }, { rejectWithValue }) => {
    try {
      // 1. Crear el Gasto General
      const expenseData = {
        amount: parseFloat(amount),
        notes,
        typeExpense: "Gastos Generales", // Tipo por defecto
        date: new Date().toISOString(), // Fecha actual
        staffId: staffId, // Agregar staffId del usuario autenticado
        paymentMethod: "Chase Credit Card", // Método de pago por defecto para gastos generales
        // NO incluimos workId
      };
      if (__DEV__) {
        console.log("Creando gasto general:", { amount, notes });
      }
      const expenseResponse = await api.post('/expense', expenseData);
      const newExpense = expenseResponse.data;

      // 2. Si hay imagen, subir el Recibo asociado
      if (image && newExpense.idExpense) {
        const formData = new FormData();
        formData.append('file', {
          uri: image.uri,
          name: image.fileName || `general_expense_${newExpense.idExpense}.jpg`,
          type: image.mimeType || 'image/jpeg',
        });
        formData.append('relatedModel', 'Expense');
        formData.append('relatedId', newExpense.idExpense);
        formData.append('type', 'Gastos Generales');
        if (notes) {
            formData.append('notes', notes);
        }

        if (__DEV__) {
          console.log("Subiendo recibo para gasto:", newExpense.idExpense);
        }
        const receiptResponse = await api.post('/receipt', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return { ...newExpense, Receipt: receiptResponse.data };
      }

      return newExpense;

    } catch (error) {
      console.error("Error creando gasto general:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || error.message || 'Error al crear el gasto general');
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
        if (__DEV__) {
          console.log("Balance actualizado:", state.incomes.length, "incomes,", state.expenses.length, "expenses");
        }
      })
      .addCase(getIncomesAndExpensesByWorkId.rejected, (state, action) => { 
        state.loading = false; 
        state.error = action.payload; 
        console.error("Error obteniendo balance:", action.payload);
      })

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
      .addCase(getReceipts.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      // Create General Expense with Receipt
      .addCase(createGeneralExpenseWithReceipt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createGeneralExpenseWithReceipt.fulfilled, (state, action) => {
        state.loading = false;
        if (__DEV__) {
          console.log("Gasto general añadido exitosamente");
        }
      })
      .addCase(createGeneralExpenseWithReceipt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
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