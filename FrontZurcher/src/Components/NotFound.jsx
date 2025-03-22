import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-9xl font-extrabold text-gray-800 mb-4 md:mb-8">
          404
        </h1>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-700 mb-4">
          ¡Página no encontrada!
        </h2>
        <p className="text-gray-600 text-lg mb-8">
          Lo sentimos, la página que estás buscando no existe o ha sido movida.
        </p>
        <Link
          to="/"
          className="inline-block bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200 transform hover:scale-105"
        >
          Volver al inicio
        </Link>
        <div className="mt-8 text-gray-500">
          <p>¿Necesitas ayuda? Contactanos</p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;