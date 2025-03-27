import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, staff } = useSelector((state) => state.auth);
  const location = useLocation();

  console.log('Estado de Redux en PrivateRoute:', { isAuthenticated, staff });

  if (!isAuthenticated) {
    // Redirigir a login si no está autenticado
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!staff || !staff.role || (allowedRoles && !allowedRoles.includes(staff.role))) {
    // Redirigir a unauthorized si no tiene el rol necesario
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string)
};

export default PrivateRoute;
