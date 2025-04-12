const isOwner = (req, res, next) => {
  if (req.staff.role !== 'owner') {
    return res.status(403).json({
      error: true,
      message: 'Acceso permitido solo para el dueño del hotel'
    });
  }
  next();
};

const isAdmin = (req, res, next) => {
  if (req.staff.role !== 'admin') {
    return res.status(403).json({
      error: true,
      message: 'Acceso permitido solo para personal administrativo'
    });
  }
  next();
};

const isRecept = (req, res, next) => {
  if (req.staff.role !== 'recept') {
    return res.status(403).json({
      error: true,
      message: 'Acceso permitido solo para recepcionistas'
    });
  }
  next();
};

const isStaff = (req, res, next) => {
  const staffRoles = ['owner', 'admin', 'recept', 'worker'];
  if (!staffRoles.includes(req.staff.role)) {
    return res.status(403).json({
      error: true,
      message: 'Acceso permitido solo para personal del hotel'
    });
  }
  next();
};

const allowRoles = (roles) => {
  return (req, res, next) => {
    const userRole = req.staff.role.toLowerCase(); // Normaliza el rol del usuario a minúsculas
    console.log("Rol del usuario autenticado:", userRole);
    if (!roles.map((role) => role.toLowerCase()).includes(userRole)) {
      return res.status(403).json({
        error: true,
        message: 'No tienes permisos para realizar esta acción',
      });
    }
    next();
  };
};

module.exports = {
  isOwner,
  isAdmin,
  isRecept,
  isStaff,
  allowRoles
};