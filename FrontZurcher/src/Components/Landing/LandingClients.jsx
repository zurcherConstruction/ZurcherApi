import React, { useState } from 'react';
import { FaWhatsapp, FaEnvelope, FaPhone, FaMapMarkerAlt, FaClock, FaUser } from "react-icons/fa";
import SEOHelmet from '../SEO/SEOHelmet';
import Navbar from './Navbar';
import ServicesSection from './ServicesSection';
import InstallationProcess from './InstallationProcess';
import ScheduleQuoteModal from './ScheduleQuoteModal';
import FloatingQuoteButton from './FloatingQuoteButton';
import WorkGallery from './WorkGallery';
import AboutTeam from './AboutTeam';
import MaintenanceServices from './MaintenanceServices';
import RepairServices from './RepairServices';
import logo from '/logo.png';
import compromisoImg from '../../assets/landing/6.jpeg';
import dedicacionImg from '../../assets/landing/4.jpeg';
import responsabilidadImg from '../../assets/landing/5.jpeg';
import img1 from '../../assets/landing/1.jpeg';
import img2 from '../../assets/landing/2.jpeg';
import img3 from '../../assets/landing/3.jpeg';
import img7 from '../../assets/landing/7.jpeg';
import img8 from '../../assets/landing/8.jpeg';
import img9 from '../../assets/landing/9.jpeg';
import img10 from '../../assets/landing/10.jpeg';
import img11 from '../../assets/landing/11.jpeg';

import { Link } from 'react-router-dom';
import LoginPopup from '../Auth/LoginPopup';
import ContactMapForm from './ContactMapForm';
//import InteractiveQuoteForm from './InteractiveQuoteForm';

const whatsappNumber = "19546368200";
const whatsappMessage = "Hello, I'm interested in your septic system services.";
const email = "admin@zurcherseptic.com";
const phone = "+1 (954) 636-8200";

const LandingClients = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [showQuoteDropdown, setShowQuoteDropdown] = useState(false);
  const [showFloatingModal, setShowFloatingModal] = useState(false);

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
    {/* SEO Meta Tags dinámicos */}
    <SEOHelmet 
      title="Septic Tank Installation Florida | ATU Aerobic Systems"
      description="Professional septic system installation in Southwest Florida. ATU aerobic systems, drain field replacement, FHA inspections, new construction septic. Serving Lehigh Acres, Fort Myers, Cape Coral, Port Charlotte, North Port, Sarasota. Licensed & insured septic contractors."
      keywords="septic tank installation, ATU septic system, aerobic septic system, septic installation Florida, septic installers Lehigh Acres, septic system Fort Myers, drain field installation, FHA septic inspection, new construction septic, septic system replacement, instalación tanque séptico"
      canonicalUrl="https://zurcherseptic.com"
    />
    
    {/* NAVBAR */}
    <Navbar onLoginClick={() => setIsLoginModalOpen(true)} />
    
  <div className="font-sans bg-gradient-to-b from-slate-50 to-slate-100 min-h-screen">
    {/* HERO SECTION */}
    <div id="home" className="flex flex-col lg:flex-row items-stretch min-h-[70vh] bg-gradient-to-r from-slate-800 to-slate-700 shadow-2xl overflow-hidden scroll-mt-20">
      {/* Hero Images - 3 del mismo tamaño */}
      <div className="flex-1 min-h-[400px] relative animate-fade-in-left">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-700"></div>
        {/*
          - xl:grid-cols-3: 3 images for large desktops (side by side)
          - md:flex-col: 2 images stacked vertically for tablets (iPad Pro, etc)
          - below md: carousel/slice
        */}
        {/*
          - xl:grid-cols-3: 3 images for large desktops (side by side)
          - md:flex-col: 2 images stacked vertically for tablets (iPad Pro, etc)
          - below md: carousel/slice
        */}
        {/* Tablet (iPad Pro): 2 images stacked vertically */}
        <div className="hidden md:flex xl:hidden flex-col gap-2 p-4 h-full">
        
          <div className="relative overflow-hidden rounded-lg flex-1 min-h-[180px] group">
            <img
              src={img2}
              alt="Professional septic tank installation crew working in Lehigh Acres Florida"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-black opacity-25 group-hover:opacity-10 transition-opacity duration-700"></div>
          </div>
        </div>
        {/* Desktop: 3 images side by side */}
        <div className="hidden xl:grid grid-cols-3 gap-3 p-4 h-full">
          <div className="relative overflow-hidden rounded-lg group">
            <img
              src={img1}
              alt="ATU aerobic septic system installation Fort Myers"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-black opacity-25 group-hover:opacity-10 transition-opacity duration-700"></div>
          </div>
          <div className="relative overflow-hidden rounded-lg group">
            <img
              src={img2}
              alt="Drain field installation and replacement Cape Coral Florida"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-black opacity-25 group-hover:opacity-10 transition-opacity duration-700"></div>
          </div>
          <div className="relative overflow-hidden rounded-lg group">
            <img
              src={img3}
              alt="FHA septic inspection certified contractor Southwest Florida"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-black opacity-25 group-hover:opacity-10 transition-opacity duration-700"></div>
          </div>
        </div>
        <div className="block md:hidden h-full w-full">
          <HeroImageSliceCarouselMobile />
        </div>
</div>
{/* Hero Content */}
<div className="flex-1 flex flex-col justify-center px-8 lg:px-12 py-16 text-center lg:text-left animate-fade-in-right">
  <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 leading-tight animate-slide-up" style={{animationDelay: '0.2s'}}>
          Professional Septic Tank Installation & ATU Aerobic Systems in <span className="text-blue-400">Southwest Florida</span>
        </h1>
        <p className="text-lg lg:text-xl text-slate-300 mb-4 leading-relaxed animate-slide-up" style={{animationDelay: '0.4s'}}>
          Licensed septic system installation serving Lehigh Acres, Fort Myers, Cape Coral, Port Charlotte, North Port, Sarasota, and Poinciana. We specialize in ATU aerobic septic systems, drain field installation, FHA inspections, and new construction septic services.
        </p>
        <p className="text-base lg:text-lg text-slate-300 mb-8 leading-relaxed animate-slide-up" style={{animationDelay: '0.6s'}}>
          At Zurcher Septic, we handle everything from start to finish: fieldwork, permit processing, Health Department coordination, and certified inspections. Your complete septic solution with transparency and personalized attention.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-2 animate-slide-up" style={{animationDelay: '0.8s'}}>
          {/* Dropdown Request a Free Quote */}
          <div className="relative quote-dropdown-parent pb-3">
            <button
              type="button"
              className="relative px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-all duration-300 shadow-lg transform hover:scale-105 flex items-center gap-2"
              onClick={() => setShowQuoteDropdown((prev) => !prev)}
            >
              {/* Glow pulsante permanente */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-lg blur opacity-40 animate-pulse"></div>
              <span className="relative">Request a Free Quote</span>
              <svg className="w-5 h-5 ml-1 relative" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
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
        {/* <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-800 mb-4">
            Complete Septic System Services in Southwest Florida
          </h2>
          <p className="text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            From septic tank installation to drain field replacement, ATU aerobic systems, and FHA inspections — we handle all your septic needs in Lehigh Acres, Fort Myers, Cape Coral, Port Charlotte, North Port, Sarasota, and Poinciana.
          </p>
        </div> */}

        {/* Service Cards with Keywords - Expanded to 8 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {/* <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer">
            <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">New Septic Tank Installation</h3>
            <p className="text-slate-600 text-sm">
              Professional installation of conventional and aerobic septic systems for new construction homes and replacements throughout Southwest Florida.
            </p>
          </div> */}

          {/* <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer">
            <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">ATU Aerobic Septic Systems</h3>
            <p className="text-slate-600 text-sm">
              Specialized in advanced ATU (Aerobic Treatment Unit) septic system installation, maintenance, and repairs. Ideal for challenging soil conditions.
            </p>
          </div> */}

          {/* <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer">
            <div className="w-14 h-14 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Drain Field Installation</h3>
            <p className="text-slate-600 text-sm">
              Expert drain field installation, replacement, and repair services. We handle soil testing, permitting, and Health Department approvals.
            </p>
          </div> */}

          {/* <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer">
            <div className="w-14 h-14 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">FHA Septic Inspections</h3>
            <p className="text-slate-600 text-sm">
              Certified FHA septic system inspections for home sales, refinancing, and compliance verification. Fast turnaround and detailed reporting.
            </p>
          </div> */}

          {/* <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer">
            <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Septic Repairs & Maintenance</h3>
            <p className="text-slate-600 text-sm">
              Fast, reliable repairs for failing systems, pumps, alarms, and components. Preventative maintenance plans to avoid costly emergencies.
            </p>
          </div> */}

          {/* <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer">
            <div className="w-14 h-14 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-cyan-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Septic System Replacement</h3>
            <p className="text-slate-600 text-sm">
              Complete system replacement for failing or outdated septic systems. We handle removal, new installation, and all required permits.
            </p>
          </div> */}

          {/* <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer">
            <div className="w-14 h-14 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Permit Processing & Engineering</h3>
            <p className="text-slate-600 text-sm">
              Complete permit processing, site evaluation, engineering design, and Health Department coordination. We handle all the paperwork.
            </p>
          </div> */}

          {/* <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer">
            <div className="w-14 h-14 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Lift Station Services</h3>
            <p className="text-slate-600 text-sm">
              Lift station installation, repair, and maintenance for properties requiring wastewater pumping. Emergency response available.
            </p>
          </div> */}
        </div>

        
        {/* <div className="bg-gradient-to-br from-blue-600 to-blue-800 py-12 px-8 rounded-2xl shadow-2xl mb-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Licensed, Insured & Certified</h2>
            <p className="text-lg text-blue-100 max-w-3xl mx-auto">
              Florida-licensed septic contractor with all certifications to complete your project in-house, on time, and up to code.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-9 h-9 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
              </div>
              <h3 className="text-white font-bold text-center mb-2">Licensed Contractor</h3>
              <p className="text-blue-100 text-sm text-center">Florida state-licensed septic contractor</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-9 h-9 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <h3 className="text-white font-bold text-center mb-2">Fully Insured</h3>
              <p className="text-blue-100 text-sm text-center">Comprehensive liability & workers comp insurance</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-9 h-9 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              </div>
              <h3 className="text-white font-bold text-center mb-2">In-House Team</h3>
              <p className="text-blue-100 text-sm text-center">No subcontractors - all work by our crews</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-9 h-9 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 className="text-white font-bold text-center mb-2">Warranty Backed</h3>
              <p className="text-blue-100 text-sm text-center">Warranty on all installations and repairs</p>
            </div>
          </div>
        </div> */}

        {/* Our Values Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-4">Why Choose Zurcher Septic</h2>
          <p className="text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto">
            Licensed, insured, and committed to quality septic system installations throughout Southwest Florida.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { 
              img: compromisoImg, 
              label: 'COMMITMENT',
              description: 'We complete every septic system installation and service on time, ensuring your system works correctly from day one with proper permitting and inspections.',
              alt: 'Zurcher Septic commitment to quality septic tank installation'
            },
            { 
              img: dedicacionImg, 
              label: 'DEDICATION',
              description: 'We focus on every detail of your septic project, from initial site evaluation to final Health Department approval, treating your property as our own.',
              alt: 'Dedicated septic system installation team Southwest Florida'
            },
            { 
              img: responsabilidadImg, 
              label: 'RESPONSIBILITY',
              description: 'Licensed and insured septic contractor. We comply with all Florida environmental regulations, Health Department requirements, and safety standards.',
              alt: 'Licensed insured septic contractor Florida certified'
            }
          ].map(({ img, label, description, alt }) => (
            <div
              key={label}
              className="group relative bg-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={img}
                  alt={alt}
                  loading="lazy"
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

    {/* INSTALLATION PROCESS SECTION - NEW video interactivo */}
    {/* <InstallationProcess /> */}

    {/* CONTACT SECTION */}
    <div className="bg-slate-800 py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-6">
          Need Septic Tank Installation or Repair Services?
        </h2>
        <p className="text-lg lg:text-xl text-slate-300 mb-4">
          Contact Zurcher Septic today for a free quote on septic system installation, ATU aerobic systems, drain field replacement, or FHA inspections.
        </p>
        <p className="text-base lg:text-lg text-slate-300 mb-10">
          Serving Lehigh Acres, Fort Myers, Cape Coral, Port Charlotte, North Port, Sarasota, and Poinciana with professional septic services.
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

    {/* SPANISH SECTION - Sección en Español
    <div className="bg-gradient-to-br from-blue-50 to-slate-100 py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-800 mb-4">
            Instalación de Sistemas Sépticos en Florida
          </h2>
          <p className="text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto">
            Contratista licenciado y asegurado especializado en instalación de tanques sépticos, sistemas aeróbicos ATU, drenaje francés, e inspecciones FHA en el suroeste de Florida.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Nuestros Servicios
            </h3>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Instalación de tanques sépticos convencionales y aeróbicos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Sistemas sépticos ATU (Unidad de Tratamiento Aeróbico)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Instalación y reparación de campo de drenaje (drain field)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Inspecciones certificadas FHA para compra/venta de viviendas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Sistemas sépticos para construcción nueva</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Reemplazo completo de sistemas sépticos obsoletos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Tramitación de permisos con el Departamento de Salud</span>
              </li>
            </ul>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Áreas que Servimos
            </h3>
            <p className="text-slate-600 mb-4">
              Brindamos servicios profesionales de instalación de sistemas sépticos en todo el suroeste de Florida, incluyendo:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-slate-700">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Lehigh Acres
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Fort Myers
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Cape Coral
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Port Charlotte
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                North Port
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Sarasota
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Poinciana
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <h3 className="text-2xl font-bold text-slate-800 mb-4">
            ¿Por Qué Elegir Zurcher Septic?
          </h3>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div>
              <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.818-4.049A9.145 9.145 0 0121 12c0 5.523-4.477 10-10 10S1 17.523 1 12 5.477 2 11 2c1.095 0 2.153.188 3.14.535"/>
                </svg>
                Licencia y Seguro
              </h4>
              <p className="text-slate-600 text-sm">
                Contratista completamente licenciado y asegurado en el estado de Florida.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Servicio Completo
              </h4>
              <p className="text-slate-600 text-sm">
                Nos encargamos de todo: trabajo de campo, permisos, coordinación con el Departamento de Salud.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/>
                </svg>
                Atención Bilingüe
              </h4>
              <p className="text-slate-600 text-sm">
                Hablamos español e inglés para servirle mejor y responder todas sus preguntas.
              </p>
            </div>
          </div>
          <div className="mt-8">
            <p className="text-slate-700 font-medium mb-4">
              Llámenos hoy para una cotización gratuita: <a href={`tel:${phone}`} className="text-blue-600 hover:underline">{phone}</a>
            </p>
            <p className="text-slate-600 text-sm">
              O contáctenos por WhatsApp para respuesta inmediata
            </p>
          </div>
        </div>
      </div>
    </div> */}

    {/* INTERACTIVE QUOTE FORM */}
    {/* <InteractiveQuoteForm /> */}

    {/* FAQ SECTION - Frequently Asked Questions */}
    {/* <div className="py-20 px-4 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-slate-600">
            Common questions about septic system installation in Southwest Florida
          </p>
        </div>

        <div className="space-y-4">
          
          <details className="bg-white rounded-xl shadow-md overflow-hidden group">
            <summary className="px-6 py-5 cursor-pointer flex justify-between items-center hover:bg-blue-50 transition-colors">
              <h3 className="text-lg font-semibold text-slate-800">
                How much does septic tank installation cost in Florida?
              </h3>
              <svg className="w-5 h-5 text-blue-600 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </summary>
            <div className="px-6 pb-5 text-slate-600">
              <p>
                Septic system installation costs vary depending on system type, property size, soil conditions, and local permit requirements. Conventional systems typically range from $8,000-$15,000, while ATU aerobic systems may cost $15,000-$25,000. We provide free estimates with detailed breakdowns after reviewing your Health Department approved permit.
              </p>
            </div>
          </details>

          
          <details className="bg-white rounded-xl shadow-md overflow-hidden group">
            <summary className="px-6 py-5 cursor-pointer flex justify-between items-center hover:bg-blue-50 transition-colors">
              <h3 className="text-lg font-semibold text-slate-800">
                What is an ATU (Aerobic Treatment Unit) septic system?
              </h3>
              <svg className="w-5 h-5 text-blue-600 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </summary>
            <div className="px-6 pb-5 text-slate-600">
              <p>
                An ATU is an advanced septic system that uses oxygen to break down waste more effectively than conventional systems. ATU systems are ideal for properties with poor soil drainage, high water tables, or environmentally sensitive areas. They require electricity to run an aerator and need regular maintenance, but they provide superior wastewater treatment.
              </p>
            </div>
          </details>

         
          <details className="bg-white rounded-xl shadow-md overflow-hidden group">
            <summary className="px-6 py-5 cursor-pointer flex justify-between items-center hover:bg-blue-50 transition-colors">
              <h3 className="text-lg font-semibold text-slate-800">
                How long does septic system installation take?
              </h3>
              <svg className="w-5 h-5 text-blue-600 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </summary>
            <div className="px-6 pb-5 text-slate-600">
              <p>
                Typical installation takes 3-7 days from start to finish, depending on system complexity and weather conditions. The process includes: excavation (1-2 days), tank and drain field installation (2-3 days), backfilling and final grading (1 day), and final Health Department inspection (scheduled separately). We'll provide you with a detailed timeline after reviewing your specific project.
              </p>
            </div>
          </details>

        
          <details className="bg-white rounded-xl shadow-md overflow-hidden group">
            <summary className="px-6 py-5 cursor-pointer flex justify-between items-center hover:bg-blue-50 transition-colors">
              <h3 className="text-lg font-semibold text-slate-800">
                Do you handle the permits and Health Department approval?
              </h3>
              <svg className="w-5 h-5 text-blue-600 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </summary>
            <div className="px-6 pb-5 text-slate-600">
              <p>
                Yes! We handle all permit processing, Health Department coordination, site evaluations, and final inspections. Our team manages the entire administrative process, so you don't have to worry about paperwork or compliance issues. We ensure your septic system meets all Florida regulations and local requirements.
              </p>
            </div>
          </details>

          
          <details className="bg-white rounded-xl shadow-md overflow-hidden group">
            <summary className="px-6 py-5 cursor-pointer flex justify-between items-center hover:bg-blue-50 transition-colors">
              <h3 className="text-lg font-semibold text-slate-800">
                What areas do you serve in Southwest Florida?
              </h3>
              <svg className="w-5 h-5 text-blue-600 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </summary>
            <div className="px-6 pb-5 text-slate-600">
              <p>
                We provide septic system installation and services throughout Southwest Florida, including Lehigh Acres, Fort Myers, Cape Coral, Port Charlotte, North Port, Sarasota, and Poinciana. If your location isn't listed, give us a call — we may still be able to help!
              </p>
            </div>
          </details>

        
          <details className="bg-white rounded-xl shadow-md overflow-hidden group">
            <summary className="px-6 py-5 cursor-pointer flex justify-between items-center hover:bg-blue-50 transition-colors">
              <h3 className="text-lg font-semibold text-slate-800">
                What's included in an FHA septic inspection?
              </h3>
              <svg className="w-5 h-5 text-blue-600 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </summary>
            <div className="px-6 pb-5 text-slate-600">
              <p>
                FHA septic inspections include: visual inspection of the tank, checking for leaks or cracks, evaluating drain field condition, testing system functionality, reviewing maintenance records, and providing a detailed written report. This inspection is typically required for home sales, refinancing, or FHA loan approvals. We provide fast turnaround (24-48 hours) and digital reports.
              </p>
            </div>
          </details>

       
          <details className="bg-white rounded-xl shadow-md overflow-hidden group">
            <summary className="px-6 py-5 cursor-pointer flex justify-between items-center hover:bg-blue-50 transition-colors">
              <h3 className="text-lg font-semibold text-slate-800">
                Do you offer warranties on installations?
              </h3>
              <svg className="w-5 h-5 text-blue-600 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </summary>
            <div className="px-6 pb-5 text-slate-600">
              <p>
                Yes, all our installations come with a warranty covering workmanship and proper system function. Specific warranty terms vary by system type and components. We also offer maintenance plans to keep your septic system running smoothly for years to come. Contact us for specific warranty details for your project.
              </p>
            </div>
          </details>
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-600 mb-4">Still have questions?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={`tel:${phone}`} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors inline-flex items-center justify-center gap-2">
              <FaPhone />
              Call Us: {phone}
            </a>
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("I have a question about septic systems")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors inline-flex items-center justify-center gap-2"
            >
              <FaWhatsapp />
              WhatsApp Us
            </a>
          </div>
        </div>
      </div>
    </div> */}

    {/* PROJECT GALLERY - Our Work */}
    {/* <div className="py-20 px-4 bg-gradient-to-br from-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Our Work Speaks For Itself
          </h2>
          <p className="text-lg text-slate-300 max-w-3xl mx-auto">
            Real projects completed throughout Southwest Florida. Professional septic system installations you can trust.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { src: img7, alt: 'Septic tank installation project Lehigh Acres', title: 'New Installation' },
            { src: img8, alt: 'ATU aerobic system installation Fort Myers', title: 'ATU System' },
            { src: img9, alt: 'Drain field installation Cape Coral', title: 'Drain Field' },
            { src: img10, alt: 'Septic system replacement project Southwest Florida', title: 'System Replacement' },
            { src: img11, alt: 'FHA septic inspection service', title: 'Inspection Service' },
            { src: img1, alt: 'Professional septic crew at work', title: 'Our Team' },
            { src: img2, alt: 'Septic tank installation equipment', title: 'Professional Equipment' },
            { src: img3, alt: 'Completed septic project Southwest Florida', title: 'Completed Project' }
          ].map((image, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-lg aspect-square cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h4 className="text-white font-bold text-sm md:text-base">{image.title}</h4>
                </div>
              </div>
            
              {index < 3 && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                  Recent
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-white font-medium mb-6">
            Join hundreds of satisfied customers throughout Southwest Florida
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:+19546368200`}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg transform hover:scale-105 inline-flex items-center justify-center gap-2"
            >
              <FaPhone />
              Call for Free Estimate
            </a>
            <a
              href={`https://wa.me/19546368200?text=${encodeURIComponent("I'd like to request a quote for septic services")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all shadow-lg transform hover:scale-105 inline-flex items-center justify-center gap-2"
            >
              <FaWhatsapp />
              WhatsApp Quote
            </a>
          </div>
        </div>
      </div>
    </div> */}

    {/* INSTALLATION PROCESS SECTION */}
    {/* <div id="installation" className="scroll-mt-20">
      <InstallationProcess />
    </div> */}

    {/* SERVICES SECTION */}
    {/* <div id="services" className="scroll-mt-20">
      <ServicesSection />
    </div> */}

    {/* ABOUT TEAM SECTION */}
    {/* <div id="about" className="scroll-mt-20">
      <AboutTeam />
    </div> */}

    {/* WORK GALLERY SECTION */}
    {/* <div id="gallery" className="scroll-mt-20">
      <WorkGallery />
    </div> */}

    {/* MAINTENANCE SERVICES SECTION */}
    {/* <div id="maintenance" className="scroll-mt-20">
      <MaintenanceServices />
    </div> */}

    {/* REPAIR SERVICES SECTION */}
    {/* <div id="repairs" className="scroll-mt-20">
      <RepairServices />
    </div> */}

    {/* CONTACT & MAP SECTION */}
    <div id="contact" className="w-full py-8 px-0 border-t-2 border-slate-600 scroll-mt-20">
      <ContactMapForm />
    </div>

    {/* FOOTER */}
    <footer className="bg-slate-900 text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div className="md:col-span-2 flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="Zurcher Septic Systems" loading="lazy" className="h-12 w-12 rounded-lg bg-white p-1" />
              <div>
                <h3 className="text-xl font-bold">ZURCHER SEPTIC</h3>
                <p className="text-slate-400 text-sm">Professional Septic Solutions</p>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed mb-2">
              Licensed septic system contractor serving Southwest Florida. We specialize in septic tank installation, ATU aerobic systems, drain field installation, FHA inspections, and new construction septic services in Lehigh Acres, Fort Myers, Cape Coral, and surrounding areas.
            </p>
          </div>
          {/* Services */}
          <div className="flex flex-col">
            <h4 className="text-lg font-semibold mb-4">Our Services</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li>Septic Tank Installation</li>
              <li>ATU Aerobic Systems</li>
              <li>Drain Field Installation & Repair</li>
              <li>FHA Septic Inspections</li>
              <li>New Construction Septic</li>
              <li>Septic System Replacement</li>
              <li>Health Dept. Permit Processing</li>
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
            &copy; {new Date().getFullYear()} Zurcher Septic. All rights reserved.
          </div>
        </div>
      </div>
    </footer>

    {/* Login Modal */}
    <LoginPopup isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    
    {/* Floating Quote Button */}
    <FloatingQuoteButton onClick={() => setShowFloatingModal(true)} />
    
    {/* Schedule Quote Modal */}
    <ScheduleQuoteModal 
      isOpen={showFloatingModal} 
      onClose={() => setShowFloatingModal(false)} 
    />
  </div>
  </>
);
};

function HeroImageSliceCarouselMobile() {
  const images = [
    { src: img3, alt: 'FHA certified septic inspection contractor Southwest Florida' },
    { src: img2, alt: 'Professional septic tank installation team Lehigh Acres' },
    { src: img1, alt: 'ATU aerobic septic system installation Fort Myers Florida' }
  ];
  const [current, setCurrent] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="relative flex flex-col items-center justify-center w-full h-[150vw] max-h-[600px] min-h-[320px] overflow-hidden p-6">
      {images.map((img, i) => (
        <img
          key={img.alt}
          src={img.src}
          alt={img.alt}
          className={`absolute p-2 top-0 left-0 w-full h-full object-cover rounded-lg transition-opacity duration-1000 ${i === current ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          style={{ transitionProperty: 'opacity', paddingBottom: '1.5rem', paddingTop: '0.5rem' }}
        />
      ))}
      {/* Overlay */}
      <div className="absolute inset-0 bg-black opacity-25 rounded-lg pointer-events-none"></div>
      {/* Dots for manual navigation */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {images.map((_, i) => (
          <button
            key={i}
            className={`w-3 h-3 rounded-full border border-white ${i === current ? 'bg-white' : 'bg-slate-400 opacity-60'}`}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
            style={{ outline: 'none' }}
          />
        ))}
      </div>
    </div>
  );
}

export default LandingClients;
