import React, { useState, useEffect, useRef } from 'react';

const InstallationProcess = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
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
      description: 'Every project is different. We begin with a clear and detailed budget, tailored to each client\'s specific needs. We assess whether the project already has approved plans and permits or if it requires comprehensive support from the outset. Once the budget is approved, we launch the project.'
    },
    {
      number: '02',
      title: 'System Design (when applicable)',
      description: 'If the client already has an approved design and permits, our team will carry out the installation according to the established plan. If the design is not yet defined, we will assist the client in developing the most suitable septic system, evaluating the site, intended use, and technical requirements to ensure efficient and safe operation.'
    },
    {
      number: '03',
      title: 'Administrative Management and Permits (Our Key Differentiator)',
      description: 'In addition to an excellent installation team, at Zurcher Septic we have an administrative team dedicated exclusively to project management. This team handles requesting inspections, coordinating with the Health Department, managing permits, monitoring progress, and ensuring that all documentation is correctly submitted, signed, and submitted on time. This approach allows us to avoid delays, errors, or interruptions that could hinder the project\'s progress and guarantees constant communication with the client throughout the entire process.'
    },
    {
      number: '04',
      title: ' Planning and Ordering Materials',
      description: 'We orWith the permits approved, we plan each stage of the work and order the necessary materials for the installation, including tanks, pipes, and components specific to each system. We use only high-quality materials to ensure durability and proper functioning.'
    },
    {
      number: '05',
      title: 'System Installation',
      description: 'Our field technical team handles the installation of your septic system with precision, care, and efficiency. We execute each stage according to approved plans and technical standards, ensuring a reliable system ready for long-term operation in both residential and commercial projects.'
    },
    {
      number: '06',
      title: 'Final Inspections and Closure',
      description: 'We coordinate final inspections and verify that the system is functioning correctly. We handle obtaining the necessary approvals and closing the project without any outstanding issues.'
    },
    {
      number: '07',
      title: 'Customer Support and Assistance',
      description: 'Once installation is complete, we continue to support our customers. We provide guidance, maintenance recommendations, and ongoing support. Our team is always available to answer questions and offer assistance whenever the customer needs it.'
    }

  ];

  // Auto-scroll through steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prevStep) => (prevStep + 1) % steps.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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
        
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 md:px-4 py-12 md:py-16">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 drop-shadow-2xl">
            Our Installation Process
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 mx-auto mb-4"></div>
          <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto drop-shadow-lg px-4 md:px-0">
            From start to finish, we handle every detail with professionalism
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 max-w-7xl mx-auto px-2 md:px-0">
          {steps.map((step, index) => (
            <div
              key={index}
              onClick={() => setActiveStep(index)}
              className={`group cursor-pointer transition-all duration-500 transform hover:scale-105 ${
                activeStep === index ? 'scale-105' : ''
              }`}
            >
              {/* Glassmorphism Card */}
              <div
                className={`relative backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-4 md:p-5 shadow-2xl transition-all duration-500 h-full ${
                  activeStep === index
                    ? 'bg-white/20 border-blue-400/50 shadow-blue-500/50'
                    : 'hover:bg-white/15 hover:border-white/30'
                }`}
              >
                {/* Step Number Badge */}
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg transition-all duration-500 ${
                      activeStep === index
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/50'
                        : 'bg-white/20 text-white/80 group-hover:bg-white/30'
                    }`}
                  >
                    {step.number}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3 drop-shadow-lg">
                  {step.title}
                </h3>

                {/* Description */}
                <p
                  className={`text-white/90 text-sm md:text-base leading-relaxed drop-shadow-md transition-all duration-500 ${
                    activeStep === index ? 'text-white' : ''
                  }`}
                >
                  {step.description}
                </p>

                {/* Active Indicator */}
                {activeStep === index && (
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-2xl -z-10 opacity-75 blur-sm animate-pulse"></div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Dots */}
        <div className="flex justify-center items-center gap-3 mt-8">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveStep(index)}
              className={`transition-all duration-300 rounded-full ${
                activeStep === index
                  ? 'w-12 h-3 bg-gradient-to-r from-blue-500 to-cyan-400'
                  : 'w-3 h-3 bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <div className="text-center mt-10">
          <a
            href="#contact"
            className="inline-block px-10 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-lg font-bold rounded-full shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 hover:scale-105 transition-all duration-300 backdrop-blur-sm"
          >
            Start Your Project Today
          </a>
        </div>
      </div>

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

        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
      `}</style>
    </section>
  );
};

export default InstallationProcess;
