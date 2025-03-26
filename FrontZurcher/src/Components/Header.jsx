import React from "react";
import logo from "../assets/logoseptic.png";

const Header = () => {
  return (
    <div className="bg-blue-950 text-white p-4 flex items-center justify-between shadow-lg fixed top-0 left-0 w-full z-10">
      {/* Logo */}
      <div className="text-lg font-bold flex items-center gap-2">
        <img src={logo} alt="Logo" className="w-12 h-12" />
        <span>ZURCHER CONSTRUCTION</span>
      </div>

      {/* Acciones rápidas */}
      <div className="flex gap-4">
        <a href="/progress-tracker" className="hover:text-blue-300">
          Seguimiento
        </a>
       
        <a href="/login" className="hover:text-blue-300">
          Login
        </a>
      </div>
    </div>
  );
};

export default Header;