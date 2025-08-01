import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, currentStaff: staff } = useSelector((state) => state.auth);
  const location = useLocation();

 

  // Check authentication
  if (!isAuthenticated) {
    
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if staff exists and is active
  if (!staff || !staff.isActive) {
    
    return <Navigate to="/unauthorized" replace />;
  }

  // Normalize role check
  const hasValidRole = staff.role && 
    allowedRoles?.some(role => role.toLowerCase() === staff.role.toLowerCase());

  if (!hasValidRole) {
    
    return <Navigate to="/unauthorized" replace />;
  }

  
  return children;
};

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default PrivateRoute;
