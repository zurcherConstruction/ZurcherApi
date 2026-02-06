import React, { useState, useEffect, useRef } from 'react';
import ScheduleQuoteModal from './ScheduleQuoteModal';

const InstallationProcess = () => {
  const [presentationPhase, setPresentationPhase] = useState(true); // true = presentación, false = interactivo
  const [currentStep, setCurrentStep] = useState(0); // Paso actual en presentación
  const [showDescription, setShowDescription] = useState(false); // Mostrar descripción en presentación
  const [hoveredStep, setHoveredStep] = useState(null); // Paso con hover en fase interactiva
  const [isMobile, setIsMobile] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false); // 🆕 Modal de agendamiento
  const videoRef = useRef(null);

  // Video for large screens (horizontal) - Optimized with Cloudinary transformations
  const desktopVideo = {
    url: 'https://res.cloudinary.com/dt4ah1jmy/video/upload/v1770173307/0203_1_zthwlg.mp4',
    poster: 'https://res.cloudinary.com/dt4ah1jmy/image/upload/v1770149965/tank_kyplf8_poster.jpg'
  };

  // Video for small screens (vertical) - Optimized with Cloudinary transformations
  const mobileVideo = {
    url: 'https://res.cloudinary.com/dt4ah1jmy/video/upload/v1770173307/0203_1_zthwlg.mp4',
    poster: 'https://res.cloudinary.com/dt4ah1jmy/image/upload/v1770149965/tank_kyplf8_poster.jpg'
  };

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const currentVideo = isMobile ? mobileVideo : desktopVideo;

  const steps = [
    {
      number: '01',
      title: 'Customized Budget',
      subtitle: '',
      description: 'Every project is different. We begin with a clear and detailed budget, tailored to each client\'s specific needs. We assess whether the project already has approved plans and permits or if it requires comprehensive support from the outset. Once the budget is approved, we launch the project.'
    },
    {
      number: '02',
      title: 'System Design',
      subtitle: 'when applicable',
      description: 'If the client already has an approved design and permits, our team will carry out the installation according to the established plan. If the design is not yet defined, we will assist the client in developing the most suitable septic system, evaluating the site, intended use, and technical requirements to ensure efficient and safe operation.'
    },
    {
      number: '03',
      title: 'Administrative Management and Permits',
      subtitle: 'Our Key Differentiator',
      description: 'In addition to an excellent installation team, at Zurcher Septic we have an administrative team dedicated exclusively to project management. This team handles requesting inspections, coordinating with the Health Department, managing permits, monitoring progress, and ensuring that all documentation is correctly submitted, signed, and submitted on time. This approach allows us to avoid delays, errors, or interruptions that could hinder the project\'s progress and guarantees constant communication with the client throughout the entire process.'
    },
    {
      number: '04',
      title: 'Planning and Ordering Materials',
      subtitle: '',
      description: 'We orWith the permits approved, we plan each stage of the work and order the necessary materials for the installation, including tanks, pipes, and components specific to each system. We use only high-quality materials to ensure durability and proper functioning.'
    },
    {
      number: '05',
      title: 'System Installation',
      subtitle: '',
      description: 'Our field technical team handles the installation of your septic system with precision, care, and efficiency. We execute each stage according to approved plans and technical standards, ensuring a reliable system ready for long-term operation in both residential and commercial projects.'
    },
    {
      number: '06',
      title: 'Final Inspections and Closure',
      subtitle: '',
      description: 'We coordinate final inspections and verify that the system is functioning correctly. We handle obtaining the necessary approvals and closing the project without any outstanding issues.'
    },
    {
      number: '07',
      title: 'Customer Support and Assistance',
      subtitle: '',
      description: 'Once installation is complete, we continue to support our customers. We provide guidance, maintenance recommendations, and ongoing support. Our team is always available to answer questions and offer assistance whenever the customer needs it.'
    }

  ];

  // 🎬 FASE 1: Presentación automática secuencial
  useEffect(() => {
    if (!presentationPhase) return;

    const sequence = async () => {
      // Secuencia para cada paso:
      // 1. Mostrar título (1s)
      // 2. Mostrar descripción (3s para leer)
      // 3. Ocultar descripción (0.5s)
      // 4. Solo título (0.5s)
      // 5. Siguiente paso

      const stepDelay = 5000; // Total por paso: 5 segundos
      
      const timer = setTimeout(() => {
        if (currentStep < steps.length - 1) {
          setShowDescription(false);
          setTimeout(() => {
            setCurrentStep(prev => prev + 1);
          }, 500);
        } else {
          // Terminó la presentación → ir a fase interactiva INMEDIATAMENTE
          setPresentationPhase(false);
        }
      }, stepDelay);

      return () => clearTimeout(timer);
    };

    sequence();
  }, [currentStep, presentationPhase]);

  // Mostrar descripción después de 1s de aparecer el título
  useEffect(() => {
    if (!presentationPhase) return;
    
    const timer = setTimeout(() => {
      setShowDescription(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentStep, presentationPhase]);

  // Ensure video plays when it changes
  useEffect(() => {
    if (videoRef.current) {
      const playVideo = async () => {
        try {
          videoRef.current.load();
          await videoRef.current.play();
        } catch (err) {
          // Silently handle - video will autoplay on user interaction
        }
      };
      playVideo();
    }
  }, [currentVideo.url]);

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* Video Background */}
      <div className="absolute inset-0 w-full h-full">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster={currentVideo.poster}
          src={currentVideo.url}
          onEnded={(e) => {
            e.target.currentTime = 0;
            e.target.play();
          }}
        />
        
        {/* Overlay: Oscuro en presentación, suave en interactivo */}
        <div 
          className={`absolute inset-0 transition-all duration-1000 ${
            presentationPhase 
              ? 'bg-black/80' 
              : 'bg-black/70'
          }`}
        ></div>
      </div>

      {/* ========== FASE 1: PRESENTACIÓN AUTOMÁTICA ========== */}
      {presentationPhase && (
        <div className="relative z-10 flex items-center justify-center min-h-screen px-6 pt-32 pb-20">
          <div className="max-w-4xl w-full text-center">
            {/* Título del paso actual */}
            <div 
              className="animate-slide-up mb-6"
              key={`title-${currentStep}`}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-white text-xl md:text-3xl font-bold mb-4 md:mb-6 shadow-2xl shadow-blue-500/50">
                {steps[currentStep].number}
              </div>
              <h3 className="text-2xl md:text-5xl font-bold text-slate-300 drop-shadow-2xl">
                {steps[currentStep].title}
              </h3>
              {steps[currentStep].subtitle && (
                <p className="text-lg md:text-xl text-white/70 mt-3 italic drop-shadow-lg">
                  {steps[currentStep].subtitle}
                </p>
              )}
            </div>

            {/* Descripción (aparece/desaparece) */}
            <div 
              className={`transition-all duration-700 transform ${
                showDescription 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-4'
              }`}
            >
              <p className="text-lg md:text-xl text-white/90 leading-relaxed drop-shadow-lg max-w-3xl mx-auto">
                {steps[currentStep].description}
              </p>
            </div>

            {/* Progress indicator */}
            <div className="mt-12 flex justify-center gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    index === currentStep 
                      ? 'w-16 bg-gradient-to-r from-blue-500 to-cyan-400' 
                      : index < currentStep
                        ? 'w-8 bg-white/50'
                        : 'w-4 bg-white/20'
                  }`}
                />
              ))}
            </div>

            {/* Skip button */}
            <button
              onClick={() => setPresentationPhase(false)}
              className="mt-8 px-6 py-2 text-white/70 hover:text-white text-sm border border-white/30 rounded-full hover:border-white/50 transition-all duration-300"
            >
              Skip to Overview →
            </button>
          </div>
        </div>
      )}

      {/* ========== FASE 2: VISTA INTERACTIVA (HOVER) ========== */}
      {!presentationPhase && (
        <div className="relative z-10 container mx-auto px-6 md:px-4 pt-24 md:pt-32 pb-12 md:pb-16">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-2xl">
              Our Installation Process
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 mx-auto mb-4"></div>
            <p className="text-base md:text-lg text-white/90 max-w-3xl mx-auto drop-shadow-lg px-4 md:px-0">
              From start to finish, we handle every detail with professionalism
            </p>
          </div>

          {/* Lista vertical de pasos (solo títulos, descripción en hover) */}
          <div className="max-w-4xl mx-auto space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                onMouseEnter={() => setHoveredStep(index)}
                onMouseLeave={() => setHoveredStep(null)}
                className="group cursor-pointer transition-all duration-300"
              >
                {/* Card glassmorphism */}
                <div
                  className={`relative backdrop-blur-md bg-white/10 border border-white/20 rounded-xl overflow-hidden transition-all duration-500 ${
                    hoveredStep === index 
                      ? 'bg-white/20 border-blue-400/50 shadow-2xl shadow-blue-500/30 scale-[1.02]' 
                      : 'hover:bg-white/15'
                  }`}
                >
                  {/* Título siempre visible */}
                  <div className="flex items-center p-3 md:p-5">
                    <div 
                      className={`flex items-center justify-center w-8 h-8 md:w-12 md:h-12 rounded-full font-bold text-sm md:text-lg transition-all duration-300 flex-shrink-0 ${
                        hoveredStep === index
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/50'
                          : 'bg-white/20 text-white/80'
                      }`}
                    >
                      {step.number}
                    </div>
                    <div className="ml-2 md:ml-6">
                      <h3 className="text-lg md:text-2xl font-bold text-slate-300 drop-shadow-lg">
                        {step.title}
                      </h3>
                    </div>
                  </div>

                  {/* Descripción (aparece en hover) */}
                  <div 
                    className={`overflow-hidden transition-all duration-500 ${
                      hoveredStep === index 
                        ? 'max-h-60 opacity-100' 
                        : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-4 md:px-6 pb-4 md:pb-5 max-h-60 overflow-y-auto custom-scrollbar">
                      {step.subtitle && (
                        <p className="text-white/70 text-sm md:text-base italic mb-2">
                          {step.subtitle}
                        </p>
                      )}
                      <p className="text-white/90 text-sm md:text-base leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Glow effect en hover */}
                  {hoveredStep === index && (
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-700 to-slate-400 rounded-xl -z-10 opacity-50 blur"></div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="text-center mt-12">
            <button
              onClick={() => setShowScheduleModal(true)}
              className="inline-block px-10 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-lg font-bold rounded-full shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              Start Your Project Today
            </button>
          </div>

          {/* Botón para volver a ver presentación */}
          <div className="text-center mt-6">
            <button
              onClick={() => {
                setCurrentStep(0);
                setShowDescription(false);
                setPresentationPhase(true);
              }}
              className="text-white/60 hover:text-white text-sm transition-all duration-300"
            >
              ← Watch Presentation Again
            </button>
          </div>
        </div>
      )}

      {/* Modal de Agendamiento */}
      <ScheduleQuoteModal 
        isOpen={showScheduleModal} 
        onClose={() => setShowScheduleModal(false)} 
      />

      {/* Animated CSS */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }
      `}</style>
    </section>
  );
};

export default InstallationProcess;
