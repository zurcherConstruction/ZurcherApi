import React, { useState } from 'react';
import Navbar from './Navbar';
import SEOHelmet from '../SEO/SEOHelmet';
import WorkGallery from './WorkGallery';
import LoginPopup from '../Auth/LoginPopup';
import FloatingQuoteButton from './FloatingQuoteButton';
import ScheduleQuoteModal from './ScheduleQuoteModal';

const GalleryPage = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  return (
    <>
      <SEOHelmet 
        title="Septic System Work Gallery | Zurcher Septic Projects"
        description="View our professional septic system installations in Southwest Florida. ATU aerobic systems, drain field replacements, new construction septic projects. Quality workmanship guaranteed."
        keywords="septic system gallery, septic installation photos, ATU installation examples, septic work portfolio, septic contractor gallery Florida"
        canonicalUrl="https://zurcherseptic.com/gallery"
      />
      <Navbar onLoginClick={() => setIsLoginModalOpen(true)} />
      <WorkGallery />
      <LoginPopup isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <FloatingQuoteButton onClick={() => setShowQuoteModal(true)} />
      <ScheduleQuoteModal isOpen={showQuoteModal} onClose={() => setShowQuoteModal(false)} />
    </>
  );
};

export default GalleryPage;
