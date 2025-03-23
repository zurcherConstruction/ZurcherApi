import { toast } from 'react-toastify';

const toastConfig = {
  position: "top-center", // Ubicación del toast
  autoClose: 3000, // Duración en ms
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "dark", // Tema del toast (light, dark, colored)
};

const toastMiddleware = () => (next) => (action) => {
  // Si la acción es de éxito y tiene 'message' en payload, mostrar toast de éxito.
  if (action.type.endsWith('SUCCESS') && action.payload?.message) {
    toast.success(action.payload.message, toastConfig);
  }
  
  // Si la acción es de fallo y tiene mensaje en payload, mostrar toast de error.
  if (action.type.endsWith('FAILURE') && action.payload) {
    toast.error(action.payload, toastConfig);
  }
  
  return next(action);
};

export default toastMiddleware;