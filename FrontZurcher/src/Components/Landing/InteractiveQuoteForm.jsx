import React, { useState } from 'react';
import { FaCheckCircle, FaHome, FaTools, FaClipboardCheck, FaArrowRight, FaArrowLeft, FaWhatsapp } from 'react-icons/fa';

const InteractiveQuoteForm = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    serviceType: '',
    propertyType: '',
    systemType: '',
    urgency: '',
    hasPermit: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    additionalInfo: ''
  });

  const totalSteps = 4;

  const handleNext = (e) => {
    e?.preventDefault();
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = (e) => {
    e?.preventDefault();
    if (step > 1) setStep(step - 1);
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Format the message for WhatsApp
    const message = `*Nueva Solicitud de Cotización*\n\n` +
      `*Servicio:* ${formData.serviceType}\n` +
      `*Tipo de Propiedad:* ${formData.propertyType}\n` +
      `*Sistema:* ${formData.systemType}\n` +
      `*Urgencia:* ${formData.urgency}\n` +
      `*Tiene Permiso:* ${formData.hasPermit}\n\n` +
      `*Información de Contacto:*\n` +
      `Nombre: ${formData.name}\n` +
      `Email: ${formData.email}\n` +
      `Teléfono: ${formData.phone}\n` +
      `Dirección: ${formData.address}\n\n` +
      `*Información Adicional:*\n${formData.additionalInfo || 'N/A'}`;

    const whatsappNumber = "19546368200";
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const isStepValid = () => {
    switch (step) {
      case 1: return !!formData.serviceType;
      case 2: return !!formData.propertyType && !!formData.systemType;
      case 3: return !!formData.urgency && !!formData.hasPermit;
      case 4: return !!(formData.name && formData.email && formData.phone && formData.address);
      default: return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center">
              <FaTools className="w-20 h-20 text-blue-600 mx-auto mb-4 drop-shadow-lg" />
              <h3 className="text-3xl font-bold text-slate-800 mb-3">What service do you need?</h3>
              <p className="text-lg text-slate-600">Select the type of septic service you're looking for</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                { value: 'New Installation', label: 'New Septic Installation', icon: '🏗️' },
                { value: 'Replacement', label: 'System Replacement', icon: '🔄' },
                { value: 'Repair', label: 'Repair/Maintenance', icon: '🔧' },
                { value: 'Inspection', label: 'FHA Inspection', icon: '📋' },
                { value: 'Drain Field', label: 'Drain Field Service', icon: '💧' },
                { value: 'ATU System', label: 'ATU Aerobic System', icon: '⚙️' }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleInputChange('serviceType', option.value)}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 text-left transform hover:scale-105 relative ${
                    formData.serviceType === option.value
                      ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 shadow-xl ring-2 ring-blue-300'
                      : 'border-slate-300 hover:border-blue-400 hover:shadow-lg bg-white'
                  }`}
                >
                  <div className="text-4xl mb-3">{option.icon}</div>
                  <div className="font-bold text-slate-800 text-lg">{option.label}</div>
                  {formData.serviceType === option.value && (
                    <FaCheckCircle className="absolute top-3 right-3 text-blue-600 w-6 h-6" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center">
              <FaHome className="w-20 h-20 text-blue-600 mx-auto mb-4 drop-shadow-lg" />
              <h3 className="text-3xl font-bold text-slate-800 mb-3">Tell us about your property</h3>
              <p className="text-lg text-slate-600">This helps us provide an accurate estimate</p>
            </div>

            <div>
              <label className="block text-slate-800 font-bold text-xl mb-4">Property Type</label>
              <div className="grid md:grid-cols-3 gap-3">
                {[
                  { value: 'Residential - Single Family', label: 'Single Family Home' },
                  { value: 'Residential - Multi-Family', label: 'Multi-Family' },
                  { value: 'Commercial', label: 'Commercial Property' },
                  { value: 'New Construction', label: 'New Construction' },
                  { value: 'Mobile/Manufactured Home', label: 'Mobile Home' },
                  { value: 'Other', label: 'Other' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleInputChange('propertyType', option.value)}
                    className={`p-4 rounded-lg border-2 transition-all duration-300 relative ${
                      formData.propertyType === option.value
                        ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg ring-2 ring-blue-300'
                        : 'border-slate-300 hover:border-blue-400 hover:shadow-md bg-white'
                    }`}
                  >
                    <div className="font-semibold text-slate-800">{option.label}</div>
                    {formData.propertyType === option.value && (
                      <FaCheckCircle className="absolute top-2 right-2 text-blue-600 w-5 h-5" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-800 font-bold text-xl mb-4">Preferred System Type</label>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { value: 'Conventional Septic', label: 'Conventional Septic System' },
                  { value: 'ATU Aerobic', label: 'ATU Aerobic System' },
                  { value: 'Lift Station', label: 'With Lift Station' },
                  { value: 'Not Sure', label: 'Not Sure / Need Recommendation' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleInputChange('systemType', option.value)}
                    className={`p-5 rounded-lg border-2 transition-all duration-300 text-left relative ${
                      formData.systemType === option.value
                        ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg ring-2 ring-blue-300'
                        : 'border-slate-300 hover:border-blue-400 hover:shadow-md bg-white'
                    }`}
                  >
                    <div className="font-semibold text-slate-800 text-lg">{option.label}</div>
                    {formData.systemType === option.value && (
                      <FaCheckCircle className="absolute top-3 right-3 text-blue-600 w-6 h-6" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center">
              <FaClipboardCheck className="w-20 h-20 text-blue-600 mx-auto mb-4 drop-shadow-lg" />
              <h3 className="text-3xl font-bold text-slate-800 mb-3">Project Details</h3>
              <p className="text-lg text-slate-600">Help us understand your timeline and requirements</p>
            </div>

            <div>
              <label className="block text-slate-800 font-bold text-xl mb-4">How soon do you need this service?</label>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { value: 'Urgent - ASAP', label: '🚨 Urgent - ASAP', desc: 'Need immediate service' },
                  { value: 'Within 2 weeks', label: '⏱️ Within 2 Weeks', desc: 'Ready to start soon' },
                  { value: 'Within 1 month', label: '📅 Within 1 Month', desc: 'Planning ahead' },
                  { value: 'Just researching', label: '🔍 Just Researching', desc: 'Gathering information' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleInputChange('urgency', option.value)}
                    className={`p-6 rounded-lg border-2 transition-all duration-300 text-left relative ${
                      formData.urgency === option.value
                        ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg ring-2 ring-blue-300'
                        : 'border-slate-300 hover:border-blue-400 hover:shadow-md bg-white'
                    }`}
                  >
                    <div className="font-bold text-slate-800 text-lg mb-2">{option.label}</div>
                    <div className="text-sm text-slate-600">{option.desc}</div>
                    {formData.urgency === option.value && (
                      <FaCheckCircle className="absolute top-3 right-3 text-blue-600 w-6 h-6" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-800 font-bold text-xl mb-4">Do you have an approved permit from the Health Department?</label>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { value: 'Yes - Have Permit', label: 'Yes, I have it' },
                  { value: 'In Progress', label: 'In progress' },
                  { value: 'No - Need Help', label: 'No, need help getting it' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleInputChange('hasPermit', option.value)}
                    className={`p-5 rounded-lg border-2 transition-all duration-300 relative ${
                      formData.hasPermit === option.value
                        ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg ring-2 ring-blue-300'
                        : 'border-slate-300 hover:border-blue-400 hover:shadow-md bg-white'
                    }`}
                  >
                    <div className="font-semibold text-slate-800 text-lg">{option.label}</div>
                    {formData.hasPermit === option.value && (
                      <FaCheckCircle className="absolute top-3 right-3 text-blue-600 w-6 h-6" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <FaCheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4 drop-shadow-lg animate-bounce" />
              <h3 className="text-3xl font-bold text-slate-800 mb-3">Almost Done!</h3>
              <p className="text-lg text-slate-600">Enter your contact information to receive your personalized quote</p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-slate-800 font-semibold mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-semibold mb-2">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                  placeholder="(954) 636-8200"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-semibold mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-semibold mb-2">Property Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                  placeholder="123 Main St, Lehigh Acres, FL"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-800 font-semibold mb-2">Additional Information (Optional)</label>
              <textarea
                value={formData.additionalInfo}
                onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                rows="4"
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                placeholder="Any additional details about your project..."
              />
            </div>

            {/* Summary Box */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
              <h4 className="font-bold text-slate-800 text-xl mb-4 flex items-center gap-2">
                <FaClipboardCheck className="text-blue-600" />
                Your Quote Request Summary
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-blue-200">
                  <span className="font-semibold text-slate-700">Service:</span>
                  <span className="text-slate-800">{formData.serviceType || 'Not selected'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-blue-200">
                  <span className="font-semibold text-slate-700">Property Type:</span>
                  <span className="text-slate-800">{formData.propertyType || 'Not selected'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-blue-200">
                  <span className="font-semibold text-slate-700">System Type:</span>
                  <span className="text-slate-800">{formData.systemType || 'Not selected'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-blue-200">
                  <span className="font-semibold text-slate-700">Timeline:</span>
                  <span className="text-slate-800">{formData.urgency || 'Not selected'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="font-semibold text-slate-700">Permit Status:</span>
                  <span className="text-slate-800">{formData.hasPermit || 'Not selected'}</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 py-20 px-4" id="quote-form">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-800 mb-4">
            Get Your Free Custom Quote
          </h2>
          <p className="text-xl text-slate-600">
            Answer a few quick questions to receive a personalized septic system quote
          </p>
        </div>

        {/* Form Card with Progress Bar Inside */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
          {/* Progress Bar */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="flex items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                      step >= num
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg scale-110'
                        : step + 1 === num
                        ? 'bg-blue-200 text-blue-600 shadow-md'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {step > num ? <FaCheckCircle className="w-6 h-6" /> : num}
                  </div>
                  {num < 4 && (
                    <div
                      className={`flex-1 h-2 mx-3 rounded-full transition-all duration-500 ${
                        step > num 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700' 
                          : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm font-semibold text-slate-600 px-1">
              <span className={step === 1 ? 'text-blue-600' : ''}>Service</span>
              <span className={step === 2 ? 'text-blue-600' : ''}>Property</span>
              <span className={step === 3 ? 'text-blue-600' : ''}>Details</span>
              <span className={step === 4 ? 'text-blue-600' : ''}>Contact</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {renderStep()}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-12 pt-8 border-t-2 border-slate-200">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 1}
                className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center gap-3 ${
                  step === 1
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700 hover:shadow-lg transform hover:-translate-x-1'
                }`}
              >
                <FaArrowLeft className="w-5 h-5" />
                Back
              </button>

              {step < totalSteps ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!isStepValid()}
                  className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center gap-3 ${
                    isStepValid()
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transform hover:translate-x-1'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Next
                  <FaArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!isStepValid()}
                  className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center gap-3 ${
                    isStepValid()
                      ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <FaWhatsapp className="w-6 h-6" />
                  Send via WhatsApp
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Trust Indicators Below Form */}
        <div className="mt-8 text-center">
          <div className="flex justify-center items-center gap-8 flex-wrap text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <FaCheckCircle className="text-green-600 w-5 h-5" />
              <span>Licensed & Insured</span>
            </div>
            <div className="flex items-center gap-2">
              <FaCheckCircle className="text-green-600 w-5 h-5" />
              <span>Free Estimates</span>
            </div>
            <div className="flex items-center gap-2">
              <FaCheckCircle className="text-green-600 w-5 h-5" />
              <span>Same-Day Response</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveQuoteForm;
