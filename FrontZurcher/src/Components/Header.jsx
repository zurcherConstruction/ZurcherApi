import React, { useState } from "react";
import logo from "../assets/logoseptic.png";
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

  const unreadCount = notifications.filter((notification) => !notification.isRead).length; // Contador de notificaciones no leídas

  return (
    <div className="bg-blue-950 text-white p-4 flex items-center justify-between shadow-lg fixed top-0 left-0 w-full z-10 lg:pl-40">
      {/* Logo y nombre */}
      <div className="flex items-center gap-2">
        <img src={logo} alt="Logo" className="w-10 h-10 md:w-12 md:h-12" />
        <span className="hidden sm:block text-sm md:text-lg">ZURCHER CONSTRUCTION</span>
      </div>

      {/* Acciones rápidas */}
      <div className="flex gap-6 items-center">
        {/* Ícono de notificaciones */}
        {isAuthenticated && (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative hover:text-blue-300 text-sm md:text-base"
            >
              {/* Ícono de sobre */}
              <FontAwesomeIcon icon={faEnvelope} className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Menú desplegable de notificaciones */}
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
            <span className="hidden md:block">Logout</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Header;