const isOwner = (req, res, next) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({
      error: true,
      message: 'Acceso permitido solo para el dueño del hotel'
    });
  }
  next();
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: true,
      message: 'Acceso permitido solo para personal administrativo'
    });
  }
  next();
};

const isRecept = (req, res, next) => {
  if (req.user.role !== 'recept') {
    return res.status(403).json({
      error: true,
      message: 'Acceso permitido solo para recepcionistas'
    });
  }
  next();
};

const isStaff = (req, res, next) => {
  const staffRoles = ['owner', 'admin', 'recept'];
  if (!staffRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: true,
      message: 'Acceso permitido solo para personal del hotel'
    });
  }
  next();
};

const allowRoles = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: true,
        message: 'No tienes permisos para realizar esta acción'
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