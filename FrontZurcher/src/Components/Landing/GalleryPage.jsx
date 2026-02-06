import React, { useState } from 'react';
import Navbar from './Navbar';
import WorkGallery from './WorkGallery';
import LoginPopup from '../Auth/LoginPopup';
import FloatingQuoteButton from './FloatingQuoteButton';
import ScheduleQuoteModal from './ScheduleQuoteModal';

const GalleryPage = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  return (
    <>
      <Navbar onLoginClick={() => setIsLoginModalOpen(true)} />
      <WorkGallery />
      <LoginPopup isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <FloatingQuoteButton onClick={() => setShowQuoteModal(true)} />
      <ScheduleQuoteModal isOpen={showQuoteModal} onClose={() => setShowQuoteModal(false)} />
    </>
  );
};

export default GalleryPage;
