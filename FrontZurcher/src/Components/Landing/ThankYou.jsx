import backgroundImage from '../../assets/landing/5.jpeg';

function ThankYou() {
  // Configuración de WhatsApp
  const whatsappNumber = "14074194495"; // Updated to match the main number
  const whatsappMessage = "Hola, tengo una consulta sobre los servicios contratados.";

  const handleContactUsClick = () => {
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const pageStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    padding: '20px',
    color: '#e5e7e9',
    textAlign: 'center',
    fontFamily: 'Arial, sans-serif',
  };

  const overlayStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: '40px',
    borderRadius: '10px',
    maxWidth: '600px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
  };

  const headingStyle = {
    fontSize: '3em',
    fontWeight: 'bold',
    marginBottom: '20px',
    textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
  };

  const paragraphStyle = {
    fontSize: '1.3em',
    marginBottom: '30px',
    lineHeight: '1.6',
  };

  const buttonStyle = {
    backgroundColor: '#25D366',
    color: 'white',
    padding: '15px 30px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1.1em',
    cursor: 'pointer',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    transition: 'background-color 0.3s ease, transform 0.2s ease',
  };

  const handleButtonMouseOver = (e) => {
    e.currentTarget.style.backgroundColor = '#128C7E';
    e.currentTarget.style.transform = 'scale(1.05)';
  };

  const handleButtonMouseOut = (e) => {
    e.currentTarget.style.backgroundColor = '#25D366';
    e.currentTarget.style.transform = 'scale(1)';
  };

  return (
    <div style={pageStyle}>
      <div style={overlayStyle}>
        <h1 style={headingStyle}>¡Thank you for trusting us!</h1>
        <p style={paragraphStyle}>
          We greatly appreciate your choice of our services. We're excited to get started
          and committed to providing you with the best experience.
        </p>
        <p style={paragraphStyle}>
          If you have any questions or need assistance, please do not hesitate to contact us.
        </p>
        <button
          style={buttonStyle}
          onClick={handleContactUsClick}
          onMouseOver={handleButtonMouseOver}
          onMouseOut={handleButtonMouseOut}
        >
          Contact us
        </button>
      </div>
    </div>
  );
}

export default ThankYou;
