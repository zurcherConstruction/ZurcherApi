const { permisos } = require('../middleware/byRol');

const checkPermissions = (permisosRequeridos) => {
  return (req, res, next) => {
    try {
      const rolUsuario = req.user.role;
      const permisosUsuario = permisos[rolUsuario].permisos;

      const tienePermiso = permisosRequeridos.every(permiso => 
        permisosUsuario.includes(permiso)
      );

      if (!tienePermiso) {
        return res.status(403).json({
          error: true,
          message: 'No tienes los permisos necesarios'
        });
      }

      next();
    } catch (error) {
      console.error('Error en verificación de permisos:', error);
      res.status(500).json({
        error: true,
        message: 'Error al verificar permisos'
      });
    }
  };
};

module.exports = { checkPermissions };