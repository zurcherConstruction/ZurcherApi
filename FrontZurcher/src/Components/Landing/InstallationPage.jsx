import React, { useState } from 'react';
import Navbar from './Navbar';
import InstallationProcess from './InstallationProcess';
import LoginPopup from '../Auth/LoginPopup';
import FloatingQuoteButton from './FloatingQuoteButton';
import ScheduleQuoteModal from './ScheduleQuoteModal';

const InstallationPage = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  return (
    <>
      <Navbar onLoginClick={() => setIsLoginModalOpen(true)} />
      <InstallationProcess />
      <LoginPopup isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <FloatingQuoteButton onClick={() => setShowQuoteModal(true)} />
      <ScheduleQuoteModal isOpen={showQuoteModal} onClose={() => setShowQuoteModal(false)} />
    </>
  );
};

export default InstallationPage;
