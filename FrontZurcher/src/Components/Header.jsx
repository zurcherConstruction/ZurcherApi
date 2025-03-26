import React from "react";
import logo from "../assets/logoseptic.png";
import { useDispatch, useSelector} from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logoutStaff } from '../Redux/Actions/authActions';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      dispatch(logoutStaff());
      navigate('/login'); // Redirige al usuario a la página de inicio de sesión
    }
  };

  return (
    <div className="bg-blue-950 text-white p-4 flex items-center justify-between shadow-lg fixed top-0 left-0 w-full z-10 lg:pl-40">
      {/* Logo y nombre */}
      <div className="flex items-center gap-2">
        <img
          src={logo}
          alt="Logo"
          className="w-10 h-10 md:w-12 md:h-12"
        />
        <span className="hidden sm:block text-sm md:text-lg">
          ZURCHER CONSTRUCTION
        </span>
      </div>

       {/* Acciones rápidas */}
       <div className="flex gap-4">
        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            className="hover:text-blue-300 text-sm md:text-base"
          >
            Logout
          </button>
        ) : (
          <a
            href="/login"
            className="hover:text-blue-300 text-sm md:text-base"
          >
            Login
          </a>
        )}
        <a
          href="/progress-tracker"
          className="hidden md:block hover:text-blue-300 text-sm md:text-base"
        >
          Seguimiento
        </a>
      </div>
    </div>
  );
};

export default Header;