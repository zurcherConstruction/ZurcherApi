
  
const verificarRol = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: true, message: 'No autorizado' });
    }

    if (!rolesPermitidos.includes(req.user.role)) {
      return res.status(403).json({ error: true, message: 'Acceso denegado' });
    }

    next();
  };
};

const verificarPermiso = (permisoRequerido) => {
  return (req, res, next) => {
    const rolUsuario = req.user.role;
    const permisosUsuario = permisos[rolUsuario]?.permisos || [];

    if (!permisosUsuario.includes(permisoRequerido)) {
      return res.status(403).json({ error: true, message: 'Permiso denegado' });
    }

    next();
  };
};

module.exports = { verificarRol, verificarPermiso, permisos };