
import { useSelector } from 'react-redux';

const LoadingSpinner = () => {
  const isLoading = useSelector(state => state.ui.isLoading);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className=" p-5 rounded-lg shadow-lg flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-700">Procesando...</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;