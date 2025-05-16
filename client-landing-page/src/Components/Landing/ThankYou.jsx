import backgroundImage from '../../assets/5.jpeg'; // IMPORTANT: Replace 'thankyou-background.jpg' with your image file name

function ThankYou() {
  // Configuración de WhatsApp
  const whatsappNumber = "1234567890"; // IMPORTANT: Replace with your WhatsApp number (include country code without + or 00)
  const whatsappMessage = "Hola, tengo una consulta sobre los servicios contratados."; // Optional: pre-filled message

  const handleContactUsClick = () => {
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const pageStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh', // Asegura que ocupe toda la altura de la pantalla
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: 'cover', // Cubre todo el contenedor
    backgroundPosition: 'center', // Centra la imagen
    backgroundRepeat: 'no-repeat',
    padding: '20px',
    color: '#e5e7e9', // Color de texto base, ajusta si tu imagen es muy clara
    textAlign: 'center',
    fontFamily: 'Arial, sans-serif',
  };

  const overlayStyle = { // Un overlay semi-transparente para mejorar la legibilidad del texto
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Negro con 50% de opacidad
    padding: '40px',
    borderRadius: '10px',
    maxWidth: '600px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
  };

  const headingStyle = {
    fontSize: '3em',
    fontWeight: 'bold',
    marginBottom: '20px',
     textShadow: '2px 2px 4px rgba(0,0,0,0.7)', // Sombra para el texto si es necesario
  };

  const paragraphStyle = {
    fontSize: '1.3em',
    marginBottom: '30px',
    lineHeight: '1.6',
  };

  const buttonStyle = {
    backgroundColor: '#25D366', // Verde WhatsApp
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

  // Efecto hover para el botón (opcional, se puede hacer con CSS también)
  const handleButtonMouseOver = (e) => {
    e.currentTarget.style.backgroundColor = '#128C7E'; // Un verde más oscuro
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
         If you have any questions or need assistance, please do not hesitate to contact us..
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