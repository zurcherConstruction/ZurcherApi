import { CONTACT_REQUEST, CONTACT_SUCCESS, CONTACT_FAILURE } from '../Actions/contactActions';

const initialState = {
  loading: false,
  success: false,
  error: null,
};

export default function contactReducer(state = initialState, action) {
  switch (action.type) {
    case CONTACT_REQUEST:
      return { ...state, loading: true, success: false, error: null };
    case CONTACT_SUCCESS:
      return { ...state, loading: false, success: true, error: null };
    case CONTACT_FAILURE:
      return { ...state, loading: false, success: false, error: action.payload };
    default:
      return state;
  }
}
