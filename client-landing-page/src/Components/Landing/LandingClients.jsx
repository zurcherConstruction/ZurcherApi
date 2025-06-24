import logo from '../../assets/logo.png';
import headerImage from '../../assets/banner.png';
import { FaWhatsapp, FaEnvelope } from "react-icons/fa";
import compromisoImg from '../../assets/6.jpeg';
import dedicacionImg from '../../assets/1.jpeg';
import responsabilidadImg from '../../assets/5.jpeg';
// Add Link import for navigation
import { Link } from 'react-router-dom';

const whatsappNumber = "14074194495";
const whatsappMessage = "Hola, estoy interesado en sus servicios.";
const email = "zurcher44@gmail.com";

const LandingClients = () => (
   <>
    {/* HEADER */}
    <header className="bg-slate-800 px-4 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <img src={logo} alt="Logo Zurcher" className="h-16 w-16 p-1 shadow" />
        <span className="text-2xl font-bold text-white tracking-wide drop-shadow">ZC</span>
      </div>
      <div className="flex items-center gap-4">
        <a
          href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full transition"
          aria-label="WhatsApp"
        >
          <FaWhatsapp className="w-6 h-6 text-white" />
        </a>
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full transition"
          aria-label="Correo electrónico"
        >
          <FaEnvelope className="w-6 h-6 text-white" />
        </a>
      </div>
    </header>
  <div className="font-sans bg-slate-50 min-h-screen">
    {/* HERO */}
    <div className="flex flex-col md:flex-row items-stretch min-h-[50vh] bg-slate-700 shadow-lg  overflow-hidden mb-8">
      {/* Imagen costado */}
      <div
        className="flex-1 min-h-[320px] bg-center bg-cover"
        style={{ backgroundImage: `url(${headerImage})` }}
      />
      {/* Texto principal */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 text-center">
       
        <h1 className="text-4xl md:text-5xl font-bold text-slate-400 mb-3">
          Zurcher Construction
        </h1>
        <p className="text-lg md:text-xl text-slate-400 mb-6">
          Quality, trust, and experience for your project.
        </p>
      
      </div>
    </div>

    {/* 3 CUADRADOS CON TEXTO ENCIMA */}
    <div className="flex flex-col sm:flex-row justify-center items-center gap-8 my-10">
        {[
          { img: compromisoImg, label: 'COMMITMENT' },
          { img: dedicacionImg, label: 'DEDICATION' },
          { img: responsabilidadImg, label: 'RESPONSIBILITY' }
        ].map(({ img, label }) => (
          <div
            key={label}
            className="relative w-[90vw] max-w-xs h-56 rounded-xl overflow-hidden  transition-transform transform hover:scale-105 opacity-80  shadow-lg"
          >
            <img
              src={img}
              alt={label}
              className="w-full h-full object-cover brightness-75"
            />
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white drop-shadow-lg tracking-wide">
              {label}
            </span>
          </div>
        ))}
      </div>

    {/* FOOTER */}
    <footer className="bg-slate-800 text-white text-center py-8 px-4 mt-12 ">
      <div className="mb-4 text-lg">
       
    <div className="mt-4 flex justify-center gap-8">
      <a
        href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 transition"
        aria-label="WhatsApp"
      >
        <FaWhatsapp className="w-7 h-7" />
      </a>
      <a
        href={`mailto:${email}`}
        className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sky-500 hover:bg-sky-600 transition"
        aria-label="Correo electrónico"
      >
        <FaEnvelope className="w-7 h-7" />
      </a>
    </div>
      </div>
      
      {/* Privacy Policy Link */}
      <div className="mb-4">
        <Link 
          to="/privacy-policy" 
          className="text-slate-300 hover:text-white underline text-sm transition-colors"
        >
          Privacy Policy
        </Link>
      </div>
      
      <div className="text-base text-slate-300">
        &copy; {new Date().getFullYear()} Zurcher Construction. All rights reserved.
      </div>
    </footer>
  </div>
  </>
);

export default LandingClients;