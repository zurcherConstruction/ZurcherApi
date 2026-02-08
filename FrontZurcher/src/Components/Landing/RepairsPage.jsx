import React, { useState } from 'react';
import Navbar from './Navbar';
import SEOHelmet from '../SEO/SEOHelmet';
import ComingSoon from './ComingSoon';
import LoginPopup from '../Auth/LoginPopup';
import FloatingQuoteButton from './FloatingQuoteButton';
import ScheduleQuoteModal from './ScheduleQuoteModal';

const RepairsPage = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  return (
    <>
      <SEOHelmet 
        title="Emergency Septic Repairs Florida | 24/7 Septic Service"
        description="Emergency septic system repairs throughout Southwest Florida. 24/7 service for pipe repairs, pump replacement, drain field restoration. Licensed emergency septic contractors serving Lehigh Acres, Fort Myers."
        keywords="emergency septic repairs, 24/7 septic service, septic pump repair, drain field repair, septic pipe repair Florida, emergency septic Lehigh Acres"
        canonicalUrl="https://zurcherseptic.com/repairs"
      />
      <Navbar onLoginClick={() => setIsLoginModalOpen(true)} />
      <ComingSoon 
        title="Repair Services" 
        message="24/7 Emergency septic system repairs"
        onQuoteClick={() => setShowQuoteModal(true)}
      />
      <LoginPopup isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <FloatingQuoteButton onClick={() => setShowQuoteModal(true)} />
      <ScheduleQuoteModal isOpen={showQuoteModal} onClose={() => setShowQuoteModal(false)} />
    </>
  );
};

export default RepairsPage;


