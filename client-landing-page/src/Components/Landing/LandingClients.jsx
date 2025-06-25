import logo from '../../assets/logo.png';
import headerImage from '../../assets/banner.png';
import { FaWhatsapp, FaEnvelope, FaPhone, FaMapMarkerAlt, FaClock } from "react-icons/fa";
import compromisoImg from '../../assets/6.jpeg';
import dedicacionImg from '../../assets/1.jpeg';
import responsabilidadImg from '../../assets/5.jpeg';
import img1 from '../../assets/8.jpeg';
import img3 from '../../assets/10.jpeg';
import img2 from '../../assets/9.jpeg';
// Add Link import for navigation
import { Link } from 'react-router-dom';

const whatsappNumber = "14074194495";
const whatsappMessage = "Hello, I'm interested in your septic system services.";
const email = "zurcher44@gmail.com";
const phone = "+1 (407) 419-4495";

// Very simple email configuration
const emailSubject = "Quote Request";
const emailBody = "Hello, I need a quote for septic services.";

const LandingClients = () => (
   <>
    {/* HEADER */}
    <header className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-4 flex items-center justify-between shadow-xl">
      <div className="flex items-center gap-3">
        <img src={logo} alt="Zurcher Septic Systems Logo" className="h-16 w-16 p-1 shadow-lg rounded-lg bg-white" />
        <div>
          <span className="text-2xl font-bold text-white tracking-wide drop-shadow">ZURCHER</span>
          <p className="text-sm text-slate-300 font-medium">SEPTIC SYSTEMS</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <a
          href={`tel:${phone}`}
          className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300 font-medium"
        >
          <FaPhone className="w-4 h-4" />
          Call Now
        </a>
        <a
          href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-10 h-10 bg-green-500 hover:bg-green-600 rounded-full transition-all duration-300 shadow-lg"
          aria-label="WhatsApp"
        >
          <FaWhatsapp className="w-5 h-5 text-white" />
        </a>
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-full transition-all duration-300 shadow-lg"
          aria-label="Email"
        >
          <FaEnvelope className="w-5 h-5 text-white" />
        </a>
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
          Professional <span className="text-blue-400">Septic Solutions</span>
        </h1>
        <p className="text-xl lg:text-2xl text-slate-300 mb-8 leading-relaxed">
          Expert septic system installation, maintenance, and repair services with over 10 years of experience. Reliable, efficient, and compliant solutions.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("I would like a free quote for septic system services.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-all duration-300 shadow-lg transform hover:scale-105"
          >
            Get Free Quote
          </a>
          <a
            href={`tel:${phone}`}
            className="px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-slate-800 rounded-lg font-semibold text-lg transition-all duration-300"
          >
            Call Now
          </a>
        </div>
      </div>
    </div>

    {/* SERVICES SECTION */}
    <div className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-800 mb-4">Our Values</h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            We provide more than septic services - we deliver peace of mind with reliable, professional, and environmentally responsible solutions.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { 
              img: compromisoImg, 
              label: 'COMMITMENT',
              description: 'Dedicated to delivering every septic installation and maintenance service on time, ensuring your system operates flawlessly.'
            },
            { 
              img: dedicacionImg, 
              label: 'DEDICATION',
              description: 'Our team brings specialized expertise to every septic project, treating your property and system with the utmost care.'
            },
            { 
              img: responsabilidadImg, 
              label: 'RESPONSIBILITY',
              description: 'Fully licensed, insured, and committed to environmental compliance and the highest safety standards in septic services.'
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
        <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">Need Septic System Services?</h2>
        <p className="text-xl text-slate-300 mb-10">
          Contact us today for a free consultation and quote. From installation to maintenance, we've got you covered.
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

    {/* FOOTER */}
    <footer className="bg-slate-900 text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="Zurcher Septic Systems" className="h-12 w-12 rounded-lg bg-white p-1" />
              <div>
                <h3 className="text-xl font-bold">ZURCHER SEPTIC SYSTEMS</h3>
                <p className="text-slate-400 text-sm">Professional Septic System Services</p>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Serving Florida since 2014. We specialize in septic system installation, maintenance, repair, and inspection 
              with a commitment to quality, environmental compliance, and customer satisfaction.
            </p>
          </div>
          
          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-slate-400">
              <li>Septic System Installation</li>
              <li>Maintenance & Pumping</li>
              <li>System Repairs</li>
              <li>Inspections & Permits</li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <div className="space-y-3 text-slate-400">
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
                <span>Mon-Fri: 8AM-6PM</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-slate-700 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-6 mb-4 md:mb-0">
            {/* Employee Access - Discrete */}
            <button
              onClick={() => {
                const code = prompt("Enter access code:");
                if (code === "ZC2024") {
                  window.open("https://zurcher-api-two.vercel.app", "_blank");
                }
              }}
              className="text-slate-500 hover:text-slate-400 text-xs transition-colors"
              style={{ fontSize: '10px' }}
            >
              •
            </button>
            
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
  </div>
  </>
);

export default LandingClients;