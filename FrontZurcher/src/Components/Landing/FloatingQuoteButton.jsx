import React, { useState } from 'react';
import { FaCalendarAlt } from 'react-icons/fa';

const FloatingQuoteButton = ({ onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 group"
      aria-label="Schedule Free Quote"
    >
      {/* Botón principal */}
      <div className={`relative flex items-center gap-3 transition-all duration-300 ${
        isHovered ? 'scale-110' : 'scale-100'
      }`}>
        {/* Texto que aparece en hover */}
        <div className={`transition-all duration-300 ${
          isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'
        }`}>
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-lg shadow-lg font-semibold whitespace-nowrap">
            Schedule Free Quote
          </div>
        </div>

        {/* Logo circular */}
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur-lg opacity-60 animate-pulse"></div>
          
          {/* Botón con logo */}
          <div className="relative w-16 h-16 bg-white rounded-full shadow-2xl flex items-center justify-center border-4 border-blue-500 overflow-hidden">
            <img 
              src="https://res.cloudinary.com/dt4ah1jmy/image/upload/v1770244237/logo_v2cxn3.png" 
              alt="Zurcher Septic" 
              className="w-12 h-12 object-contain"
            />
          </div>

          {/* Badge de calendario */}
          <div className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
            <FaCalendarAlt className="text-xs" />
          </div>
        </div>
      </div>

      {/* Ripple effect en hover */}
      {isHovered && (
        <div className="absolute bottom-0 right-0 w-16 h-16 rounded-full border-4 border-blue-400 animate-ping opacity-20"></div>
      )}
    </button>
  );
};

export default FloatingQuoteButton;
