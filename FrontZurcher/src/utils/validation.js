// Validar correo electrónico
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return "El correo electrónico es obligatorio.";
    if (!emailRegex.test(email)) return "El correo electrónico no es válido.";
    return null;
  };
  
  // Validar número de teléfono
  export const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{10}$/; // Ejemplo: 10 dígitos numéricos
    if (!phone) return "El número de teléfono es obligatorio.";
    if (!phoneRegex.test(phone)) return "El número de teléfono debe contener 10 dígitos.";
    return null;
  };
  
  // Validar contraseña
  export const validatePassword = (password) => {
    if (!password) return "La contraseña es obligatoria.";
    if (password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
    return null;
  };
  
  // Validar nombre
  export const validateName = (name) => {
    if (!name) return "El nombre es obligatorio.";
    if (name.length < 3) return "El nombre debe tener al menos 3 caracteres.";
    return null;
  };
  
  // Validar rol
  export const validateRole = (role) => {
    const validRoles = ["admin", "worker", "recept", "owner"];
    if (!role) return "El rol es obligatorio.";
    if (!validRoles.includes(role)) return "El rol no es válido.";
    return null;
  };
  
  // Validar formulario completo
  export const validateForm = (formData) => {
    const errors = {};
    errors.email = validateEmail(formData.email);
    errors.phone = validatePhone(formData.phone);
    errors.password = validatePassword(formData.password);
    errors.name = validateName(formData.name);
    errors.role = validateRole(formData.role);
  
    // Filtrar errores nulos
    return Object.fromEntries(Object.entries(errors).filter(([_, value]) => value !== null));
  };