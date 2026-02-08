/* 
 * CONTENIDO COMPLETO PARA ServicesPage.jsx
 * Para usar cuando el cliente defina los textos finales
 * NO BORRAR - Content by AI Assistant
 */

import React, { useState } from 'react';
import Navbar from './Navbar';
import SEOHelmet from '../SEO/SEOHelmet';
import Breadcrumbs from '../SEO/Breadcrumbs';
import LoginPopup from '../Auth/LoginPopup';
import FloatingQuoteButton from './FloatingQuoteButton';
import ScheduleQuoteModal from './ScheduleQuoteModal';
import { FaWrench, FaHome, FaTools, FaCheckCircle, FaPhone, FaCertificate } from 'react-icons/fa';

const ServicesPageComplete = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  const services = [
    {
      icon: <FaHome className="text-5xl text-blue-500" />,
      title: "New Septic Installation",
      description: "Complete septic system installation for new construction and replacement systems.",
      features: ["Permit acquisition", "Site evaluation", "System design", "Professional installation", "Final inspection"],
      price: "Starting at $8,000"
    },
    {
      icon: <FaTools className="text-5xl text-green-500" />,
      title: "ATU Aerobic Systems",
      description: "Advanced Treatment Unit systems for enhanced wastewater treatment.",
      features: ["Advanced treatment technology", "Smaller drain fields", "Environmentally friendly", "Higher processing capacity"],
      price: "Starting at $15,000"
    },
    {
      icon: <FaWrench className="text-5xl text-orange-500" />,
      title: "Drain Field Installation",
      description: "Professional drain field installation and replacement services.",
      features: ["Soil testing", "Proper sizing", "Quality materials", "Code compliance", "Warranty included"],
      price: "Starting at $5,000"
    },
    {
      icon: <FaCertificate className="text-5xl text-purple-500" />,
      title: "FHA Inspections",
      description: "Certified FHA septic inspections for real estate transactions.",
      features: ["Comprehensive evaluation", "Detailed report", "FHA compliance", "Quick turnaround", "Professional certification"],
      price: "Starting at $300"
    }
  ];

  return (
    <>
      <SEOHelmet 
        title="Septic System Services Florida | Installation, ATU, Repairs"
        description="Comprehensive septic services in Southwest Florida: new installations, ATU aerobic systems, drain fields, FHA inspections, repairs & maintenance. Licensed contractors serving Lehigh Acres, Fort Myers, Cape Coral."
        keywords="septic services Florida, septic installation, ATU aerobic systems, drain field installation, FHA septic inspection, septic repairs, septic maintenance"
        canonicalUrl="https://zurcherseptic.com/services"
      />
      <Navbar onLoginClick={() => setIsLoginModalOpen(true)} />
      <Breadcrumbs />
      
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 text-white py-20 mt-16">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Professional Septic Services
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-4xl mx-auto">
              Complete septic system solutions in Southwest Florida. From new installations to emergency repairs, we deliver quality workmanship you can trust.
            </p>
            <button
              onClick={() => setShowQuoteModal(true)}
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-slate-100 transition-all duration-300 transform hover:scale-105"
            >
              Get Free Quote
            </button>
          </div>
        </div>

        {/* Services Grid */}
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">Our Services</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              We provide comprehensive septic system services throughout Southwest Florida with licensed professionals and guaranteed workmanship.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center mb-6">
                  {service.icon}
                  <h3 className="text-2xl font-bold text-slate-800 ml-4">{service.title}</h3>
                </div>
                <p className="text-slate-600 mb-6 leading-relaxed">{service.description}</p>
                
                <div className="mb-6">
                  <h4 className="font-bold text-slate-800 mb-3">What's Included:</h4>
                  <ul className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-slate-600">
                        <FaCheckCircle className="text-green-500 mr-3 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-blue-600">{service.price}</span>
                  <button
                    onClick={() => setShowQuoteModal(true)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Get Quote
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-slate-800 text-white py-20">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl mb-8 max-w-3xl mx-auto">
              Contact us today for a free consultation and detailed quote for your septic system project.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => setShowQuoteModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-colors flex items-center gap-3"
              >
                <FaPhone />
                Schedule Free Quote
              </button>
              <a 
                href="tel:+19546368200" 
                className="bg-transparent border-2 border-white hover:bg-white hover:text-slate-800 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all duration-300"
              >
                Call (954) 636-8200
              </a>
            </div>
          </div>
        </div>
      </div>

      <LoginPopup isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <FloatingQuoteButton onClick={() => setShowQuoteModal(true)} />
      <ScheduleQuoteModal isOpen={showQuoteModal} onClose={() => setShowQuoteModal(false)} />
    </>
  );
};

export default ServicesPageComplete;