import React, { useState } from 'react';
import Navbar from './Navbar';
import SEOHelmet from '../SEO/SEOHelmet';
import InstallationProcess from './InstallationProcess';
import LoginPopup from '../Auth/LoginPopup';
import FloatingQuoteButton from './FloatingQuoteButton';
import ScheduleQuoteModal from './ScheduleQuoteModal';

const InstallationPage = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  return (
    <>
      <SEOHelmet 
        title="Septic System Installation Process | Step-by-Step Guide"
        description="Learn our comprehensive septic system installation process in Florida. From permits to final inspection. ATU aerobic systems, conventional septic, drain fields. Professional installation guaranteed."
        keywords="septic installation process, septic system permits Florida, ATU installation steps, drain field installation, septic installation guide"
        canonicalUrl="https://zurcherseptic.com/installation"
      />
      <Navbar onLoginClick={() => setIsLoginModalOpen(true)} />
      <InstallationProcess />
      <LoginPopup isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <FloatingQuoteButton onClick={() => setShowQuoteModal(true)} />
      <ScheduleQuoteModal isOpen={showQuoteModal} onClose={() => setShowQuoteModal(false)} />
    </>
  );
};

export default InstallationPage;
