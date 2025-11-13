import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  worksInMaintenance: [],
  maintenanceVisitsByWorkId: {},
  currentWorkDetail: null,
  loading: false,
  loadingVisits: false,
  loadingAction: false,
  uploadingMedia: false,
  error: null,
  visitsLoadedForWork: {},
  filters: {
    search: '',
    status: 'all',
  }
};

const maintenanceSlice = createSlice({
  name: 'maintenance',
  initialState,
  reducers: {
    // Fetch works in maintenance
    fetchWorksInMaintenanceRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchWorksInMaintenanceSuccess: (state, action) => {
      state.loading = false;
      state.worksInMaintenance = action.payload;
    },
    fetchWorksInMaintenanceFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Fetch maintenance visits by work
    fetchMaintenanceVisitsByWorkRequest: (state) => {
      state.loadingVisits = true;
    },
    fetchMaintenanceVisitsByWorkSuccess: (state, action) => {
      state.loadingVisits = false;
      const { workId, visits } = action.payload;
      state.maintenanceVisitsByWorkId[workId] = visits;
      state.visitsLoadedForWork[workId] = true;

      // Actualizar currentWorkDetail si está relacionado
      if (state.currentWorkDetail && state.currentWorkDetail.idWork === workId) {
        state.currentWorkDetail.maintenanceVisits = visits;
      }
    },
    fetchMaintenanceVisitsByWorkFailure: (state, action) => {
      state.loadingVisits = false;
      state.error = action.payload;
    },

    // Update maintenance visit
    updateMaintenanceVisitRequest: (state) => {
      state.loadingAction = true;
    },
    updateMaintenanceVisitSuccess: (state, action) => {
      state.loadingAction = false;
      const updatedVisit = action.payload;
      const workId = updatedVisit.workId;
      
      if (state.maintenanceVisitsByWorkId[workId]) {
        const visitIndex = state.maintenanceVisitsByWorkId[workId].findIndex(v => v.id === updatedVisit.id);
        if (visitIndex !== -1) {
          state.maintenanceVisitsByWorkId[workId][visitIndex] = updatedVisit;
        }
      }

      // Actualizar currentWorkDetail si está relacionado
      if (state.currentWorkDetail && state.currentWorkDetail.idWork === workId) {
        const visitIndex = state.currentWorkDetail.maintenanceVisits.findIndex(v => v.id === updatedVisit.id);
        if (visitIndex !== -1) {
          state.currentWorkDetail.maintenanceVisits[visitIndex] = updatedVisit;
        }
      }
    },
    updateMaintenanceVisitFailure: (state, action) => {
      state.loadingAction = false;
      state.error = action.payload;
    },

    // Add maintenance media
    addMaintenanceMediaRequest: (state) => {
      state.uploadingMedia = true;
    },
    addMaintenanceMediaSuccess: (state, action) => {
      state.uploadingMedia = false;
      const updatedVisit = action.payload;
      const workId = updatedVisit.workId;
      
      if (state.maintenanceVisitsByWorkId[workId]) {
        const visitIndex = state.maintenanceVisitsByWorkId[workId].findIndex(v => v.id === updatedVisit.id);
        if (visitIndex !== -1) {
          state.maintenanceVisitsByWorkId[workId][visitIndex] = updatedVisit;
        }
      }

      // Actualizar currentWorkDetail si está relacionado
      if (state.currentWorkDetail && state.currentWorkDetail.idWork === workId) {
        const visitIndex = state.currentWorkDetail.maintenanceVisits.findIndex(v => v.id === updatedVisit.id);
        if (visitIndex !== -1) {
          state.currentWorkDetail.maintenanceVisits[visitIndex] = updatedVisit;
        }
      }
    },
    addMaintenanceMediaFailure: (state, action) => {
      state.uploadingMedia = false;
      state.error = action.payload;
    },

    // Delete maintenance media
    deleteMaintenanceMediaRequest: (state) => {
      state.loadingAction = true;
    },
    deleteMaintenanceMediaSuccess: (state, action) => {
      state.loadingAction = false;
      const mediaId = action.payload;
      
      // Encontrar y actualizar la visita en maintenanceVisitsByWorkId
      Object.keys(state.maintenanceVisitsByWorkId).forEach(workId => {
        state.maintenanceVisitsByWorkId[workId] = state.maintenanceVisitsByWorkId[workId].map(visit => ({
          ...visit,
          mediaFiles: visit.mediaFiles?.filter(media => media.id !== mediaId) || []
        }));
      });

      // Actualizar currentWorkDetail si está relacionado
      if (state.currentWorkDetail && state.currentWorkDetail.maintenanceVisits) {
        state.currentWorkDetail.maintenanceVisits = state.currentWorkDetail.maintenanceVisits.map(visit => ({
          ...visit,
          mediaFiles: visit.mediaFiles?.filter(media => media.id !== mediaId) || []
        }));
      }
    },
    deleteMaintenanceMediaFailure: (state, action) => {
      state.loadingAction = false;
      state.error = action.payload;
    },

    // Other actions
    setCurrentWorkDetail: (state, action) => {
      const workData = action.payload;
      state.currentWorkDetail = {
        ...workData,
        maintenanceVisits: state.maintenanceVisitsByWorkId[workData.idWork] || [],
      };
    },
    clearCurrentWorkDetail: (state) => {
      state.currentWorkDetail = null;
    },
    setMaintenanceFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearMaintenanceError: (state) => {
      state.error = null;
    },
    clearMaintenanceData: (state) => {
      state.worksInMaintenance = [];
      state.maintenanceVisitsByWorkId = {};
      state.currentWorkDetail = null;
      state.visitsLoadedForWork = {};
    },
    resetLoadingStates: (state) => {
      state.loadingAction = false;
      state.uploadingMedia = false;
      state.loading = false;
      state.loadingVisits = false;
    },
  },
});

export const {
  fetchWorksInMaintenanceRequest,
  fetchWorksInMaintenanceSuccess,
  fetchWorksInMaintenanceFailure,
  fetchMaintenanceVisitsByWorkRequest,
  fetchMaintenanceVisitsByWorkSuccess,
  fetchMaintenanceVisitsByWorkFailure,
  updateMaintenanceVisitRequest,
  updateMaintenanceVisitSuccess,
  updateMaintenanceVisitFailure,
  addMaintenanceMediaRequest,
  addMaintenanceMediaSuccess,
  addMaintenanceMediaFailure,
  deleteMaintenanceMediaRequest,
  deleteMaintenanceMediaSuccess,
  deleteMaintenanceMediaFailure,
  setCurrentWorkDetail,
  clearCurrentWorkDetail,
  setMaintenanceFilters,
  clearMaintenanceError,
  clearMaintenanceData,
  resetLoadingStates,
} = maintenanceSlice.actions;

export default maintenanceSlice.reducer;
