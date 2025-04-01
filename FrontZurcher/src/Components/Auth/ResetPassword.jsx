import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { resetPassword } from '../../Redux/Actions/authActions';
import { toast } from 'react-toastify';

const ResetPassword = () => {
  const { token } = useParams(); // Captura el token de la URL
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    try {
      await dispatch(resetPassword(token, password));
      toast.success('Contraseña restablecida correctamente');
      navigate('/login'); // Redirige al usuario al login
    } catch (err) {
      toast.error('Error al restablecer la contraseña');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full border-2 p-4 space-y-8">
        <div>
          <h2 className="text-center text-2xl font-extrabold text-gray-900">
            Restablecer contraseña
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ingresa tu nueva contraseña para restablecer el acceso.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="password" className="sr-only">
                Nueva contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900  focus:outline-none focus:ring-blue-950 focus:border-blue-950 focus:z-10 sm:text-sm"
                placeholder="Nueva contraseña"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                Confirmar contraseña
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900  focus:outline-none focus:ring-blue-950 focus:border-blue-950 focus:z-10 sm:text-sm"
                placeholder="Confirmar contraseña"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-950 hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-950 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Restableciendo...' : 'Restablecer contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;