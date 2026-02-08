import React, { useState } from 'react';
import Navbar from './Navbar';
import SEOHelmet from '../SEO/SEOHelmet';
import ComingSoon from './ComingSoon';
import LoginPopup from '../Auth/LoginPopup';
import FloatingQuoteButton from './FloatingQuoteButton';
import ScheduleQuoteModal from './ScheduleQuoteModal';

const MaintenancePage = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  return (
    <>
      <SEOHelmet 
        title="Septic Maintenance Services Florida | ATU & System Care"
        description="Professional septic system maintenance in Southwest Florida. ATU servicing, routine pumping, system inspections, emergency repairs. Keep your septic system running efficiently with Zurcher Septic."
        keywords="septic maintenance Florida, ATU maintenance, septic system pumping, septic inspection, septic repairs Lehigh Acres, septic service Fort Myers"
        canonicalUrl="https://zurcherseptic.com/maintenance-services"
      />
      <Navbar onLoginClick={() => setIsLoginModalOpen(true)} />
      <ComingSoon 
        title="Maintenance Services" 
        message="Professional septic system maintenance programs"
        onQuoteClick={() => setShowQuoteModal(true)}
      />
      <LoginPopup isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <FloatingQuoteButton onClick={() => setShowQuoteModal(true)} />
      <ScheduleQuoteModal isOpen={showQuoteModal} onClose={() => setShowQuoteModal(false)} />
    </>
  );
};

export default MaintenancePage;


