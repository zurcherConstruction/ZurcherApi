import React from 'react';
import { FaTools, FaHardHat, FaClock } from 'react-icons/fa';
import img3 from '../../assets/landing/5.jpeg';

const ComingSoon = ({ title = "Coming Soon", message = "We're working on something amazing!", onQuoteClick }) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src={img3}
          alt="Zurcher Septic Background"
          className="w-full h-full object-cover"
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/90 via-slate-900/85 to-slate-800/90"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-6 pt-32 pb-20">
        <div className="max-w-4xl w-full text-center">
          {/* Animated Icons */}
          <div className="flex justify-center gap-8 mb-12">
            <div className="animate-bounce" style={{ animationDelay: '0s' }}>
              <FaTools className="text-5xl md:text-6xl text-blue-400 drop-shadow-2xl" />
            </div>
            <div className="animate-bounce" style={{ animationDelay: '0.2s' }}>
              <FaHardHat className="text-5xl md:text-6xl text-cyan-400 drop-shadow-2xl" />
            </div>
            <div className="animate-bounce" style={{ animationDelay: '0.4s' }}>
              <FaClock className="text-5xl md:text-6xl text-blue-400 drop-shadow-2xl" />
            </div>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 drop-shadow-2xl animate-fade-in-up">
            {title}
          </h1>

          {/* Divider */}
          <div className="w-32 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 mx-auto mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}></div>

          {/* Message */}
          <p className="text-xl md:text-3xl text-slate-200 mb-8 leading-relaxed drop-shadow-lg animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            {message}
          </p>

          {/* Sub Message */}
          <p className="text-lg md:text-xl text-slate-300/90 mb-12 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            This section is currently under construction. We're preparing detailed content to better serve you.
          </p>

          {/* Contact Info */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 max-w-2xl mx-auto shadow-2xl animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            <p className="text-slate-200 text-lg mb-4">
              Meanwhile, feel free to contact us for any septic system needs
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="tel:+19546368200" 
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-lg font-semibold text-lg transition-all duration-300 shadow-lg transform hover:scale-105 flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                📞 (954) 636-8200
              </a>
              <button 
                onClick={onQuoteClick}
                className="px-8 py-4 bg-white hover:bg-slate-100 text-slate-800 rounded-lg font-semibold text-lg transition-all duration-300 shadow-lg transform hover:scale-105 flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                📋 Request Quote
              </button>
            </div>
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center gap-3 mt-12 animate-fade-in-up" style={{ animationDelay: '1s' }}>
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
