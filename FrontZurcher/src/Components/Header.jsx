import React, { useState } from "react";
import logo from "../../public/logo.png";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logoutStaff } from "../Redux/Actions/authActions";
import Notifications from "./Notifications";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { notifications } = useSelector((state) => state.notifications);

  const [showNotifications, setShowNotifications] = useState(false);

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
    <div className="bg-blue-950 text-white px-4 py-3 md:py-4 flex items-center justify-between shadow-lg fixed top-0 left-0 w-full z-40">
      {/* Logo y nombre */}
      <div className="flex items-center gap-2 md:gap-4 md:pl-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 focus:outline-none hover:opacity-80 transition-opacity"
        >
          <img
            src={logo}
            alt="Logo"
            className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12"
          />
          <span className="hidden sm:inline-block text-xs md:text-sm lg:text-lg font-semibold tracking-wide">
            ZURCHER CONSTRUCTION
          </span>
        </button>
      </div>
  
      {/* Acciones rápidas */}
      <div className="flex gap-3 md:gap-4 items-center">
        {/* Ícono de notificaciones */}
        {isAuthenticated && (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative hover:text-blue-300 transition-colors p-2 rounded-md hover:bg-blue-900"
            >
              <FontAwesomeIcon icon={faEnvelope} className="w-5 h-5 md:w-6 md:h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 md:w-96 max-h-96 bg-white text-black shadow-xl rounded-lg z-50 border border-gray-200">
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
            className="flex items-center gap-2 hover:text-blue-300 transition-colors p-2 rounded-md hover:bg-blue-900"
            title="Cerrar Sesión"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="w-5 h-5 md:w-6 md:h-6" />
            <span className="hidden lg:inline-block text-sm">Logout</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Header;