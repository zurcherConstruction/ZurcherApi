import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, currentStaff: staff } = useSelector((state) => state.auth);
  const location = useLocation();

  // Add comprehensive debug logging
  console.log('PrivateRoute Debug:', {
    isAuthenticated,
    staff: {
      id: staff?.id,
      role: staff?.role,
      name: staff?.name,
      isActive: staff?.isActive
    },
    allowedRoles,
    currentPath: location.pathname,
    hasValidRole: staff?.role && allowedRoles?.includes(staff?.role?.toLowerCase()),
    roleComparison: {
      staffRole: staff?.role?.toLowerCase(),
      allowedRolesLower: allowedRoles?.map(r => r.toLowerCase())
    }
  });

  // Check authentication
  if (!isAuthenticated) {
    console.log('🚫 Not authenticated - Redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if staff exists and is active
  if (!staff || !staff.isActive) {
    console.log('🚫 Invalid or inactive staff:', { hasStaff: !!staff, isActive: staff?.isActive });
    return <Navigate to="/unauthorized" replace />;
  }

  // Normalize role check
  const hasValidRole = staff.role && 
    allowedRoles?.some(role => role.toLowerCase() === staff.role.toLowerCase());

  if (!hasValidRole) {
    console.log('🚫 Invalid role:', {
      userRole: staff.role,
      allowedRoles,
      match: allowedRoles?.includes(staff.role),
      matchLowerCase: hasValidRole
    });
    return <Navigate to="/unauthorized" replace />;
  }

  console.log('✅ Access granted to:', location.pathname);
  return children;
};

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default PrivateRoute;
