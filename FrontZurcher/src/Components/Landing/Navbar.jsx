import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaBars, FaTimes, FaPhone, FaEnvelope, FaUser } from 'react-icons/fa';
import logo from '/logo.png';

const Navbar = ({ onLoginClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Installation', path: '/installation' },
    { name: 'Gallery', path: '/gallery' },
    { name: 'Services', path: '/services' },
    { name: 'Maintenance', path: '/maintenance-services' },
    { name: 'Repairs', path: '/repairs' },
    { name: 'About Us', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  const isActive = (path) => location.pathname === path;
  const isHome = location.pathname === '/';

  // Determinar estilos según la página
  const getNavbarStyles = () => {
    if (isHome) {
      // En Home: fondo sólido slate
      return scrolled 
        ? 'bg-gradient-to-r from-slate-800 to-slate-700 shadow-lg' 
        : 'bg-gradient-to-r from-slate-800 to-slate-700 shadow-md';
    } else {
      // En otras páginas: transparente con backdrop-blur
      return scrolled 
        ? 'bg-slate-900/80 backdrop-blur-md shadow-lg' 
        : 'bg-slate-900/60 backdrop-blur-sm';
    }
  };

  return (
    <>
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${getNavbarStyles()}`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img src={logo} alt="Zurcher Septic" className="h-12 w-12 rounded-lg" />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-white">ZURCHER SEPTIC</h1>
                <p className="text-xs text-blue-400">Southwest Florida</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden xl:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`px-4 py-2 font-medium transition-colors relative group ${
                    isActive(link.path) ? 'text-blue-400' : 'text-slate-100 hover:text-blue-400'
                  }`}
                >
                  {link.name}
                  <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-400 transition-all duration-300 ${
                    isActive(link.path) ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}></span>
                </Link>
              ))}
            </div>

            {/* Contact Info & Login Desktop */}
            <div className="hidden xl:flex items-center gap-4">
              <a href="tel:+19546368200" className="flex items-center gap-2 text-slate-100 hover:text-blue-400 transition-colors">
                <FaPhone className="text-blue-400" />
                <span className="font-semibold">(954) 636-8200</span>
              </a>
              <button
                onClick={onLoginClick}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-lg transition-colors"
                aria-label="Employee Login"
              >
                <FaUser />
                <span className="font-semibold">Login</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="xl:hidden p-2 rounded-lg hover:bg-slate-600 transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? (
                <FaTimes className="text-2xl text-white" />
              ) : (
                <FaBars className="text-2xl text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`xl:hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}>
          <div className={`border-t border-slate-600/50 shadow-lg backdrop-blur-md ${
            isHome 
              ? 'bg-gradient-to-b from-slate-700/95 to-slate-800/95' 
              : 'bg-slate-900/70'
          }`}>
            <div className="container mx-auto px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-all transform hover:translate-x-2 ${
                    isActive(link.path) 
                      ? 'bg-slate-600/50 text-blue-400' 
                      : 'text-slate-100 hover:bg-slate-600/30 hover:text-blue-400'
                  }`}
                >
                  {link.name}
                </Link>
              ))}

              
              {/* Contact Info Mobile */}
              <div className="pt-4 border-t border-slate-600/50 space-y-2">
                <a href="tel:+19546368200" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-600/30 text-blue-400 hover:bg-slate-600/50 transition-colors">
                  <FaPhone className="text-xl" />
                  <span className="font-semibold">(954) 636-8200</span>
                </a>
                <a href="mailto:admin@zurcherseptic.com" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-600/30 text-slate-100 hover:bg-slate-600/50 hover:text-blue-400 transition-colors">
                  <FaEnvelope className="text-xl" />
                  <span className="font-semibold">admin@zurcherseptic.com</span>
                </a>
                <button
                  onClick={() => {
                    onLoginClick();
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-white text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <FaUser className="text-xl" />
                  <span className="font-semibold">Employee Login</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer for fixed navbar - solo en Home */}
      {isHome && <div className="h-20"></div>}
    </>
  );
};

export default Navbar;
