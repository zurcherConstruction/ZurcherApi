import React, { useState } from "react";
import logo from "../../public/logo.png"; // Asegúrate de que la ruta sea correcta
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logoutStaff } from "../Redux/Actions/authActions";
import Notifications from "./Notifications"; // Importamos el componente Notifications
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";


const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth); // Verificamos si el usuario está autenticado
  const { notifications } = useSelector((state) => state.notifications); // Obtenemos las notificaciones del estado global

  const [showNotifications, setShowNotifications] = useState(false); // Estado para mostrar/ocultar el dropdown de notificaciones

  const handleLogout = () => {
    if (window.confirm("¿Estás seguro de que deseas cerrar sesión?")) {
      dispatch(logoutStaff());
      navigate("/login");
    }
  };

  const unreadCount = Array.isArray(notifications)
  ? notifications.filter((notification) => !notification.isRead).length
  : 0;

  return (
    <div className="bg-blue-950 text-white p-4 flex items-center justify-between shadow-lg fixed top-0 left-0 w-full z-10">
      {/* Logo y nombre */}
      <div className="flex items-center gap-4 lg:pl-4">
        <button
          onClick={() => navigate("/dashboard")} // Redirigir al Dashboard al hacer clic
          className="flex items-center gap-2 focus:outline-none"
        >
          <img
            src={logo}
            alt="Logo"
            className="w-10 h-10 md:w-12 md:h-12" // Tamaño del logo
          />
          <span className="hidden text-sm md:text-lg lg:inline-block lg:ml-2">
            ZURCHER CONSTRUCTION
          </span>
        </button>
      </div>
  
      {/* Acciones rápidas */}
      <div className="flex gap-4 items-center">
        {/* Ícono de notificaciones */}
        {isAuthenticated && (
          <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative hover:text-blue-300 text-sm md:text-base"
          >
            <FontAwesomeIcon icon={faEnvelope} className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-64 bg-white text-black shadow-lg rounded-lg z-20">
                <Notifications
                  isDropdown={true}
                  onClose={() => setShowNotifications(false)}
                />
              </div>
            )}
          </div>
        )}
  
        {/* Botón de logout */}
        {isAuthenticated && (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 hover:text-blue-300 text-sm md:text-base"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Header;