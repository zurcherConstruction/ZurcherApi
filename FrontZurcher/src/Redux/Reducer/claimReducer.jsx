import { createSlice } from '@reduxjs/toolkit';
import {
  CLAIM_REQUEST,
  CLAIM_FAILURE,
  FETCH_CLAIMS_SUCCESS,
  FETCH_CLAIM_SUCCESS,
  CREATE_CLAIM_SUCCESS,
  UPDATE_CLAIM_SUCCESS,
  DELETE_CLAIM_SUCCESS,
  FETCH_CLAIM_ADDRESSES_SUCCESS
} from '../Actions/claimActions';

const initialState = {
  claims: [],
  currentClaim: null,
  addresses: [],
  loading: false,
  error: null,
  pagination: null
};

const claimSlice = createSlice({
  name: 'claim',
  initialState,
  reducers: {
    clearCurrentClaim: (state) => {
      state.currentClaim = null;
    },
    clearClaimError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(
        (action) => action.type === CLAIM_REQUEST,
        (state) => { state.loading = true; state.error = null; }
      )
      .addMatcher(
        (action) => action.type === CLAIM_FAILURE,
        (state, action) => { state.loading = false; state.error = action.payload; }
      )
      .addMatcher(
        (action) => action.type === FETCH_CLAIMS_SUCCESS,
        (state, action) => {
          state.loading = false;
          state.claims = action.payload.data || [];
          state.pagination = action.payload.pagination || null;
        }
      )
      .addMatcher(
        (action) => action.type === FETCH_CLAIM_SUCCESS,
        (state, action) => { state.loading = false; state.currentClaim = action.payload; }
      )
      .addMatcher(
        (action) => action.type === CREATE_CLAIM_SUCCESS,
        (state, action) => {
          state.loading = false;
          state.claims = [action.payload, ...state.claims];
        }
      )
      .addMatcher(
        (action) => action.type === UPDATE_CLAIM_SUCCESS,
        (state, action) => {
          state.loading = false;
          state.currentClaim = action.payload;
          state.claims = state.claims.map(c => c.id === action.payload.id ? action.payload : c);
        }
      )
      .addMatcher(
        (action) => action.type === DELETE_CLAIM_SUCCESS,
        (state, action) => {
          state.loading = false;
          state.claims = state.claims.filter(c => c.id !== action.payload);
        }
      )
      .addMatcher(
        (action) => action.type === FETCH_CLAIM_ADDRESSES_SUCCESS,
        (state, action) => { state.addresses = action.payload; }
      );
  }
});

export const { clearCurrentClaim, clearClaimError } = claimSlice.actions;
export default claimSlice.reducer;
