import { toast } from 'react-toastify';

const toastConfig = {
  position: "top-center",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "dark",
};

const toastMiddleware = () => (next) => (action) => {
  // Verifica que action.type sea una cadena antes de usar endsWith
  if (typeof action.type === "string") {
    // Si la acción es de éxito (fulfilled) y tiene 'message' en payload, mostrar toast de éxito
    if (action.type.endsWith('/fulfilled') && action.payload?.message) {
      toast.success(action.payload.message, toastConfig);
    }

    // Si la acción es de fallo (rejected) y tiene mensaje en payload, mostrar toast de error
    if (action.type.endsWith('/rejected') && action.payload) {
      toast.error(action.payload, toastConfig);
    }
  }

  return next(action);
};

export default toastMiddleware;