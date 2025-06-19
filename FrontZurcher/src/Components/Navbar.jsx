import React, { useState } from "react";
import logo from "../assets/logoseptic.png";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-blue-500 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center">
            <img
              src={logo}
              alt="Logo"
              className="h-8 md:h-10 lg:h-12 w-auto"
            />
            <span className="hidden sm:block ml-3 text-white font-bold text-sm md:text-lg lg:text-xl">
              SEPTIC SYSTEM
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:block">
            <div className="flex items-baseline space-x-6 lg:space-x-8">
              <a
                href="/"
                className="text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm lg:text-base font-medium transition-colors duration-200"
              >
                Página Principal
              </a>
              <a
                href="/seguimiento"
                className="text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm lg:text-base font-medium transition-colors duration-200"
              >
                Seguimiento
              </a>
              <a
                href="/dashboard"
                className="text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm lg:text-base font-medium transition-colors duration-200"
              >
                Dashboard
              </a>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white hover:text-blue-200 inline-flex items-center justify-center p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-expanded="false"
            >
              <span className="sr-only">Abrir menú principal</span>
              <div className="w-6 h-6 flex flex-col justify-around">
                <span
                  className={`block h-0.5 w-6 bg-white transition-all duration-300 ${
                    isMenuOpen ? "rotate-45 translate-y-2.5" : ""
                  }`}
                ></span>
                <span
                  className={`block h-0.5 w-6 bg-white transition-all duration-300 ${
                    isMenuOpen ? "opacity-0" : ""
                  }`}
                ></span>
                <span
                  className={`block h-0.5 w-6 bg-white transition-all duration-300 ${
                    isMenuOpen ? "-rotate-45 -translate-y-2.5" : ""
                  }`}
                ></span>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div
          className={`md:hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
          } overflow-hidden`}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 bg-blue-600 rounded-b-lg">
            <a
              href="/"
              className="text-white hover:text-blue-200 hover:bg-blue-700 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Página Principal
            </a>
            <a
              href="/seguimiento"
              className="text-white hover:text-blue-200 hover:bg-blue-700 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Seguimiento
            </a>
            <a
              href="/dashboard"
              className="text-white hover:text-blue-200 hover:bg-blue-700 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
