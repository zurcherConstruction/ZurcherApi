import React, { useState } from 'react';
import { FaWhatsapp, FaEnvelope, FaPhone, FaMapMarkerAlt, FaClock, FaUser } from "react-icons/fa";
import logo from '/logo.png';
import compromisoImg from '../../assets/landing/6.jpeg';
import dedicacionImg from '../../assets/landing/4.jpeg';
import responsabilidadImg from '../../assets/landing/5.jpeg';
import img1 from '../../assets/landing/1.jpeg';
import img3 from '../../assets/landing/3.jpeg';
import img2 from '../../assets/landing/2.jpeg';
import { Link } from 'react-router-dom';
import LoginPopup from '../Auth/LoginPopup';
import ContactMapForm from './ContactMapForm';

const whatsappNumber = "14074194495";
const whatsappMessage = "Hello, I'm interested in your septic system services.";
const email = "zurcherseptic@gmail.com";
const phone = "+1 (407) 419-4495";

const LandingClients = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [showQuoteDropdown, setShowQuoteDropdown] = useState(false);

  // Cierra el dropdown de contacto si se hace click fuera
  React.useEffect(() => {
    if (!showContactDropdown) return;
    const handleClick = (e) => {
      if (!e.target.closest('.contact-dropdown-parent')) {
        setShowContactDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showContactDropdown]);

  // Cierra el dropdown de presupuesto si se hace click fuera
  React.useEffect(() => {
    if (!showQuoteDropdown) return;
    const handleClick = (e) => {
      if (!e.target.closest('.quote-dropdown-parent')) {
        setShowQuoteDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showQuoteDropdown]);

  return (
   <>
    {/* HEADER */}
    <header className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-4 flex items-center justify-between shadow-xl">
      <div className="flex items-center gap-3">
        <img src={logo} alt="Zurcher Septic Systems Logo" className="h-16 w-16 p-1 shadow-lg rounded-lg bg-white" />
        <div>
          <span className="text-2xl font-bold text-white tracking-wide drop-shadow">Zurcher Septic</span>
          <p className="text-sm text-slate-300 font-medium"></p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {/* Desktop: botón Call Now con dropdown, Email y Login, Mobile: menú hamburguesa */}
        <div className="hidden md:flex items-center gap-4">
          <div className="relative contact-dropdown-parent">
            <button
              onClick={() => setShowContactDropdown((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300 font-medium focus:outline-none"
              aria-haspopup="true"
              aria-expanded={showContactDropdown ? 'true' : 'false'}
              type="button"
            >
              <FaPhone className="w-4 h-4" />
              Call Now
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showContactDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 animate-fade-in">
                <a
                  href={`tel:${phone}`}
                  className="flex items-center gap-2 px-4 py-3 hover:bg-blue-50 text-blue-700 font-medium border-b border-gray-100"
                >
                  <FaPhone className="w-4 h-4" />
                  Call by Phone
                </a>
                <a
                  href={`sms:${phone.replace(/[^\d]/g, '')}`}
                  className="flex items-center gap-2 px-4 py-3 hover:bg-blue-50 text-blue-700 font-medium border-b border-gray-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5V6a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h5.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
                  Send SMS
                </a>
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 hover:bg-green-50 text-green-700 font-medium border-b border-gray-100"
                >
                  <FaWhatsapp className="w-4 h-4" />
                  WhatsApp
                </a>
              </div>
            )}
          </div>
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-full transition-all duration-300 shadow-lg"
            aria-label="Email"
          >
            <FaEnvelope className="w-5 h-5 text-white" />
          </a>
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="inline-flex items-center justify-center w-10 h-10 bg-slate-600 hover:bg-slate-700 rounded-full transition-all duration-300 shadow-lg"
            aria-label="Employee Login"
            title="Employee Access"
          >
            <FaUser className="w-5 h-5 text-white" />
          </button>
        </div>
        {/* Mobile: menú desplegable con todas las opciones */}
        <div className="relative md:hidden contact-dropdown-parent">
          <button
            onClick={() => setShowContactDropdown((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300 font-medium focus:outline-none"
            aria-haspopup="true"
            aria-expanded={showContactDropdown ? 'true' : 'false'}
            type="button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          {showContactDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 animate-fade-in">
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-2 px-4 py-3 hover:bg-blue-50 text-blue-700 font-medium border-b border-gray-100"
              >
                <FaPhone className="w-4 h-4" />
                Call by Phone
              </a>
              <a
                href={`sms:${phone.replace(/[^\d]/g, '')}`}
                className="flex items-center gap-2 px-4 py-3 hover:bg-blue-50 text-blue-700 font-medium border-b border-gray-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5V6a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h5.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
                Send SMS
              </a>
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 hover:bg-green-50 text-green-700 font-medium border-b border-gray-100"
              >
                <FaWhatsapp className="w-4 h-4" />
                WhatsApp
              </a>
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2 px-4 py-3 hover:bg-blue-50 text-blue-700 font-medium border-b border-gray-100"
              >
                <FaEnvelope className="w-4 h-4" />
                Email
              </a>
              <button
                onClick={() => { setIsLoginModalOpen(true); setShowContactDropdown(false); }}
                className="flex items-center gap-2 w-full px-4 py-3 hover:bg-slate-100 text-slate-700 font-medium"
              >
                <FaUser className="w-4 h-4" />
                Employee Login
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  <div className="font-sans bg-gradient-to-b from-slate-50 to-slate-100 min-h-screen">
    {/* HERO SECTION */}
    <div className="flex flex-col lg:flex-row items-stretch min-h-[70vh] bg-gradient-to-r from-slate-800 to-slate-700 shadow-2xl overflow-hidden">
      {/* Hero Images - 3 del mismo tamaño */}
      <div className="flex-1 min-h-[400px] relative">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-700"></div>
        <div className="relative h-full grid grid-cols-1 md:grid-cols-3 gap-3 p-4">
          <div className="relative overflow-hidden rounded-lg">
            <img
              src={img1}
              alt="Construction Quality"
              className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black opacity-25"></div>
          </div>
          <div className="relative overflow-hidden rounded-lg">
            <img
              src={img2}
              alt="Professional Work"
              className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black opacity-25"></div>
          </div>
          <div className="relative overflow-hidden rounded-lg">
            <img
              src={img3}
              alt="Construction Excellence"
              className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black opacity-25"></div>
          </div>
        </div>
      </div>
      {/* Hero Content */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-12 py-16 text-center lg:text-left">
        <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          Septic Systems  <span className="text-blue-400">Done Right</span>
        </h1>
        <p className="text-xl lg:text-2xl text-slate-300 mb-8 leading-relaxed">
          At Zurcher Septic, we don’t just install septic systems — we provide long-lasting solutions with responsibility, transparency, and personalized attention.
We take care of everything: from fieldwork to handling the entire administrative process, including inspections, payments, and coordination with the Health Department.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
          {/* Dropdown Request a Free Quote */}
          <div className="relative quote-dropdown-parent">
            <button
              type="button"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-all duration-300 shadow-lg transform hover:scale-105 flex items-center gap-2"
              onClick={() => setShowQuoteDropdown((prev) => !prev)}
            >
              Request a Free Quote
              <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showQuoteDropdown && (
              <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 animate-fade-in">
              
                <a
                  href={`tel:${phone}`}
                  className="flex items-center gap-2 px-4 py-3 hover:bg-blue-50 text-blue-700 font-medium border-b border-gray-100"
                >
                  <FaPhone className="w-4 h-4" />
                  Call for Quote
                </a>
                <a
                  href={`sms:${phone.replace(/[^\d]/g, '')}?body=${encodeURIComponent("I would like a free quote for septic system services.")}`}
                  className="flex items-center gap-2 px-4 py-3 hover:bg-blue-50 text-blue-700 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5V6a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h5.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
                  Request by SMS
                </a>
              </div>
            )}
          </div>
          <a
            href={`tel:${phone}`}
            className="px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-slate-800 rounded-lg font-semibold text-lg transition-all duration-300"
          >
            Speak With a Specialist
          </a>
        </div>
        <p className="text-ms text-slate-300 mt-4 text-center max-w-xl mx-auto">
          To provide a quote, we kindly ask you to send us the approved permit from the Health Department through any of these methods.
        </p>
      </div>
    </div>

    {/* SERVICES SECTION */}
    <div className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-800 mb-4">Our Values</h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            At Zurcher Septic, we don’t just install septic systems. We provide long-lasting solutions with responsibility, transparency, and personalized attention.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { 
              img: compromisoImg, 
              label: 'COMMITMENT',
              description: 'We complete every installation and service on time, ensuring that your system works correctly from day one.'
            },
            { 
              img: dedicacionImg, 
              label: 'DEDICATION',
              description: 'We focus on every detail, treating your property and project as if it were our own.'
            },
            { 
              img: responsabilidadImg, 
              label: 'RESPONSIBILITY',
              description: 'We comply with all environmental and safety regulations. We are a licensed and insured company.'
            }
          ].map(({ img, label, description }) => (
            <div
              key={label}
              className="group relative bg-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={img}
                  alt={label}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-70"></div>
                <h3 className="absolute bottom-4 left-6 text-2xl font-bold text-white tracking-wide">
                  {label}
                </h3>
              </div>
              <div className="p-6">
                <p className="text-slate-600 leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* CONTACT SECTION */}
    <div className="bg-slate-800 py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">Need Septic Services?</h2>
        <p className="text-xl text-slate-300 mb-10">
          Contact us today for a free quote.
New installations, repairs, or maintenance — we’re ready to help.
        </p>
        
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <FaPhone className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Call Us</h3>
            <a href={`tel:${phone}`} className="text-slate-300 hover:text-white transition-colors">
              {phone}
            </a>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
              <FaWhatsapp className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">WhatsApp</h3>
            <a 
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Message Us
            </a>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-4">
              <FaEnvelope className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Email</h3>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(email);
                alert('Email copied to clipboard!');
              }}
              className="text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {email}
            </button>
          </div>
        </div>
      </div>
    </div>
    {/* MAPA Y FORMULARIO DE CONTACTO */}
    <div className="w-full py-8 px-0 border-t-2 border-slate-600">
      <ContactMapForm />
    </div>

    {/* FOOTER */}
    <footer className="bg-slate-900 text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div className="md:col-span-2 flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="Zurcher Septic Systems" className="h-12 w-12 rounded-lg bg-white p-1" />
              <div>
                <h3 className="text-xl font-bold">ZURCHER SEPTIC</h3>
                <p className="text-slate-400 text-sm">Professional Septic Solutions</p>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed mb-2">
              We specialize in septic system installation, certified inspections, drain field repairs, and tailored services based on each project’s needs.
            </p>
          </div>
          {/* Services */}
          <div className="flex flex-col">
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li>Septic system installation</li>
              <li>Drain field repair</li>
              <li>Pumping and maintenance</li>
              <li>Inspections and permit processing</li>
              <li>System design & Health Dept. approval</li>
            </ul>
          </div>
          {/* Contact */}
          <div className="flex flex-col">
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <div className="space-y-3 text-slate-400 text-sm">
              <div className="flex items-center gap-2">
                <FaPhone className="w-4 h-4" />
                <span>{phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <FaEnvelope className="w-4 h-4" />
                <span>{email}</span>
              </div>
              <div className="flex items-center gap-2">
                <FaClock className="w-4 h-4" />
                <span>Mon–Fri: 8:00 AM – 6:00 PM</span>
              </div>
            </div>
          </div>
          {/* Location Map */}
         
          
        </div>
        
        <div className="border-t border-slate-700 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-6 mb-4 md:mb-0">
            <Link 
              to="/privacy-policy" 
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
          
          <div className="text-slate-400 text-sm">
            &copy; {new Date().getFullYear()} Zurcher Septic Systems. All rights reserved.
          </div>
        </div>
      </div>
    </footer>

    {/* Login Modal */}
    <LoginPopup isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
  </div>
  </>
);
};

export default LandingClients;
