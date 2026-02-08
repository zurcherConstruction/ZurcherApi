import React, { useState } from 'react';
import Navbar from './Navbar';
import SEOHelmet from '../SEO/SEOHelmet';
import ComingSoon from './ComingSoon';
import LoginPopup from '../Auth/LoginPopup';
import FloatingQuoteButton from './FloatingQuoteButton';
import ScheduleQuoteModal from './ScheduleQuoteModal';

const ServicesPage = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  return (
    <>
      <SEOHelmet 
        title="Septic System Services Florida | Installation, ATU, Repairs"
        description="Comprehensive septic services in Southwest Florida: new installations, ATU aerobic systems, drain fields, FHA inspections, repairs & maintenance. Licensed contractors serving Lehigh Acres, Fort Myers, Cape Coral."
        keywords="septic services Florida, septic installation, ATU aerobic systems, drain field installation, FHA septic inspection, septic repairs, septic maintenance"
        canonicalUrl="https://zurcherseptic.com/services"
      />
      <Navbar onLoginClick={() => setIsLoginModalOpen(true)} />
      <ComingSoon 
        title="Our Services" 
        message="Comprehensive septic system solutions coming soon"
        onQuoteClick={() => setShowQuoteModal(true)}
      />
      <LoginPopup isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <FloatingQuoteButton onClick={() => setShowQuoteModal(true)} />
      <ScheduleQuoteModal isOpen={showQuoteModal} onClose={() => setShowQuoteModal(false)} />
    </>
  );
};

export default ServicesPage;


