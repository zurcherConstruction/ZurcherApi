// filepath: c:\Users\yaniz\Documents\ZurcherApi\client-landing-page\src\App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingClients from './Components/Landing/LandingClients'; // Tu landing principal
import ThankYou from './Components/Landing/ThankYou';       // Tu página de agradecimiento
import ChangeOrderResponsePage from './Components/ChangeOrderResponsePage'; // Página de respuesta a la orden de cambio
import PrivacyPolicy from './Components/PrivacyPolicy'; // Tu política de privacidad
// Si tienes un archivo CSS global, impórtalo aquí o en main.jsx
// import './index.css'; 

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingClients />} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/change-order-response" element={<ChangeOrderResponsePage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        {/* Puedes añadir más rutas aquí si es necesario */}
      </Routes>
    </Router>
  );
}

export default App;
