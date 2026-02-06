import React, { useState } from 'react';
import Navbar from './Navbar';
import ComingSoon from './ComingSoon';
import LoginPopup from '../Auth/LoginPopup';
import FloatingQuoteButton from './FloatingQuoteButton';
import ScheduleQuoteModal from './ScheduleQuoteModal';

const RepairsPage = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  return (
    <>
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
