import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  staff: [], // Lista de staff
  loading: false, // Estado de carga
  error: null, // Mensaje de error
};

const staffSlice = createSlice({
  name: "staff",
  initialState,
  reducers: {
    fetchStaffRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchStaffSuccess: (state, action) => {
        if (__DEV__) {
          console.log("Staff actualizado:", action.payload.length, "registros");
        }
        state.loading = false;
        state.staff = action.payload;
        state.error = null;
      },
    fetchStaffFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload; // Guardar el mensaje de error
    },
  },
});

export const {
  fetchStaffRequest,
  fetchStaffSuccess,
  fetchStaffFailure,
} = staffSlice.actions;

export default staffSlice.reducer;