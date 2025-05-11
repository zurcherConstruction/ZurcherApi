import React from 'react';
// Assuming your image is in src/assets/
// Adjust the path if your image is located elsewhere or named differently.
import headerImage from '../../assets/banner.png'; // IMPORTANT: Replace 'your-header-image.png'

const LandingClients = () => {
  // Replace with your WhatsApp number and a default message if desired
  const whatsappNumber = "1234567890"; // IMPORTANT: Replace with your WhatsApp number (include country code without + or 00)
  const whatsappMessage = "Hola, estoy interesado en sus servicios."; // Optional: pre-filled message

  const handleContactUsClick = () => {
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="landing-page">
      <header className="landing-header" style={{ 
        backgroundColor: '#f0f0f0', // Example background color
        padding: '20px', 
        textAlign: 'center',
        borderBottom: '1px solid #ccc'
      }}>
        <img 
          src={headerImage} 
          alt="Company Logo" 
          style={{ 
            maxWidth: '200px', // Adjust as needed
            maxHeight: '100px', // Adjust as needed
            marginBottom: '15px' 
          }} 
        />
        <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5em', color: '#333' }}>
          Bienvenido a Nuestra Empresa
        </h1>
        <p style={{ fontSize: '1.2em', color: '#555', marginBottom: '20px' }}>
          Ofrecemos las mejores soluciones para ti.
        </p>
        <button 
          onClick={handleContactUsClick}
          style={{
            backgroundColor: '#25D366', // WhatsApp green
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            fontSize: '1em',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
          }}
        >
          Contáctanos por WhatsApp
        </button>
      </header>

      <main style={{ padding: '20px', textAlign: 'center' }}>
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '2em', color: '#333', marginBottom: '10px' }}>Nuestros Servicios</h2>
          <p style={{ fontSize: '1.1em', color: '#666', lineHeight: '1.6' }}>
            Aquí puedes describir brevemente los servicios que ofreces.
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '2em', color: '#333', marginBottom: '10px' }}>¿Por qué elegirnos?</h2>
          <p style={{ fontSize: '1.1em', color: '#666', lineHeight: '1.6' }}>
            Destaca tus puntos fuertes y lo que te diferencia de la competencia.
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
        </section>
      </main>

      <footer style={{ 
        backgroundColor: '#333', 
        color: 'white', 
        textAlign: 'center', 
        padding: '20px', 
        marginTop: '40px' 
      }}>
        <p>&copy; {new Date().getFullYear()} Tu Nombre de Empresa. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default LandingClients;