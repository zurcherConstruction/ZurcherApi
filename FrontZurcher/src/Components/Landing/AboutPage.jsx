import React, { useState } from 'react';
import Navbar from './Navbar';
import SEOHelmet from '../SEO/SEOHelmet';
import ComingSoon from './ComingSoon';
import LoginPopup from '../Auth/LoginPopup';
import FloatingQuoteButton from './FloatingQuoteButton';
import ScheduleQuoteModal from './ScheduleQuoteModal';

const AboutPage = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  return (
    <>
      <SEOHelmet 
        title="About Zurcher Septic | Licensed Septic Contractors Florida"
        description="Learn about Zurcher Septic, Southwest Florida's trusted septic system contractors. 15+ years experience, licensed & insured, serving Lehigh Acres, Fort Myers, Cape Coral with quality septic installations."
        keywords="about Zurcher Septic, septic contractors Florida, licensed septic installers, septic company Lehigh Acres, septic professionals Fort Myers"
        canonicalUrl="https://zurcherseptic.com/about"
      />
      <Navbar onLoginClick={() => setIsLoginModalOpen(true)} />
      <ComingSoon 
        title="About Us" 
        message="Learn more about our team and commitment to excellence"
        onQuoteClick={() => setShowQuoteModal(true)}
      />
      <LoginPopup isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <FloatingQuoteButton onClick={() => setShowQuoteModal(true)} />
      <ScheduleQuoteModal isOpen={showQuoteModal} onClose={() => setShowQuoteModal(false)} />
    </>
  );
};

export default AboutPage;
