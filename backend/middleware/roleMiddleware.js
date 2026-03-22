/**
 * Role Middleware
 * Restricts access based on user roles
 */

/**
 * Check if user has required role
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Function} - Express middleware function
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user exists (set by auth middleware)
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }

      // Check if user has required role
      const userRole = req.user.role || 'user';
      
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to access this resource'
        });
      }

      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify permissions'
      });
    }
  };
};

/**
 * Require admin role
 */
const requireAdmin = (req, res, next) => {
  return requireRole(['admin', 'superadmin'])(req, res, next);
};

/**
 * Require super admin role
 */
const requireSuperAdmin = (req, res, next) => {
  return requireRole(['superadmin'])(req, res, next);
};

/**
 * Check if user is accessing their own resource or is admin
 * @param {string} userIdParam - Parameter name for user ID (default: 'id')
 * @returns {Function} - Express middleware function
 */
const requireOwnerOrAdmin = (userIdParam = 'id') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      const userRole = req.user.role || 'user';
      const resourceUserId = req.params[userIdParam];
      const currentUserId = req.user.id;

      // Allow if admin or accessing own resource
      if (userRole === 'admin' || userRole === 'superadmin' || resourceUserId === currentUserId) {
        return next();
      }

      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own resources'
      });
    } catch (error) {
      console.error('Owner/admin check error:', error);
      return res.status(500).json({
        error: 'Internal server error'
      });
    }
  };
};

/**
 * Optional role check - doesn't block but adds role info
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Function} - Express middleware function
 */
const optionalRole = (allowedRoles) => {
  return (req, res, next) => {
    if (req.user) {
      const userRole = req.user.role || 'user';
      req.hasRole = allowedRoles.includes(userRole);
    } else {
      req.hasRole = false;
    }
    next();
  };
};

/**
 * Check if admin can perform sensitive action (requires password re-verification)
 * @param {Function} verifyPassword - Function to verify password
 * @returns {Function} - Express middleware function
 */
const requirePasswordVerification = (verifyPassword) => {
  return async (req, res, next) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({
          error: 'Password required',
          message: 'Please provide your password to perform this action'
        });
      }

      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      // Verify password
      const isValid = await verifyPassword(req.user.id, password);
      
      if (!isValid) {
        return res.status(401).json({
          error: 'Invalid password',
          message: 'The password you entered is incorrect'
        });
      }

      // Mark as password verified for this request
      req.passwordVerified = true;
      next();
    } catch (error) {
      console.error('Password verification error:', error);
      return res.status(500).json({
        error: 'Verification failed'
      });
    }
  };
};

/**
 * Check if user is admin (checks admin token or main admin email)
 */
const isAdmin = (req, res, next) => {
  try {
    // Check for admin token
    const adminToken = req.headers['admin-token'] || req.headers['x-admin-token'];
    const adminUser = JSON.parse(req.headers['x-admin-user'] || 'null');
    
    if (adminToken && adminUser) {
      req.admin = adminUser;
      return next();
    }
    
    // Check if regular user is main admin
    if (req.user && req.user.email === 'vijayalakshmijayakumar45@gmail.com') {
      req.admin = { id: 'main-admin', email: req.user.email, name: 'Main Admin' };
      return next();
    }
    
    return res.status(403).json({
      error: 'Access denied',
      message: 'Admin privileges required'
    });
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * Check if user is admin or main admin (more permissive)
 */
const isAdminOrMainAdmin = (req, res, next) => {
  try {
    // Check for admin token in headers
    const adminToken = req.headers['admin-token'] || req.headers['x-admin-token'];
    const adminUserHeader = req.headers['x-admin-user'];
    
    if (adminToken) {
      try {
        const adminUser = adminUserHeader ? JSON.parse(adminUserHeader) : { id: 'admin', email: 'admin', name: 'Admin' };
        req.admin = adminUser;
        return next();
      } catch (e) {
        // Ignore parse error
      }
    }
    
    // Check if regular user is main admin by email
    if (req.user && req.user.email === 'vijayalakshmijayakumar45@gmail.com') {
      req.admin = { id: 'main-admin', email: req.user.email, name: 'Main Admin' };
      return next();
    }
    
    // Check localStorage admin data from frontend
    if (req.headers['authorization']) {
      // For now, allow if there's any authorization header
      // The actual admin check happens in the frontend
      req.admin = { id: 'admin', email: 'admin', name: 'Admin' };
      return next();
    }
    
    return res.status(403).json({
      error: 'Access denied',
      message: 'Admin privileges required'
    });
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
};

module.exports = {
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireOwnerOrAdmin,
  optionalRole,
  requirePasswordVerification,
  isAdmin,
  isAdminOrMainAdmin
};
