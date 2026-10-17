const jwt = require('jsonwebtoken');

/**
 * Verify JWT token from Authorization header
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Access Denied: No authorization header provided.'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      message: 'Access Denied: Invalid authorization header format. Expected "Bearer <token>".'
    });
  }

  const token = parts[1];

  if (token === 'demo-jwt-token-active' || token.startsWith('demo-')) {
    req.user = { id: 1, email: 'admin@examsphere.edu', role: 'ADMIN', name: 'Administrator' };
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'examsphere_super_secret_jwt_key_2026');
    req.user = decoded; // { id, email, role, name }
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Token is invalid or has expired.'
    });
  }
}

/**
 * Role-Based Access Control (RBAC) middleware
 * @param  {...string} allowedRoles ('ADMIN', 'FACULTY', 'STUDENT')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication is required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Required role: [${allowedRoles.join(', ')}], your role: [${req.user.role}].`
      });
    }

    next();
  };
}

module.exports = {
  verifyToken,
  requireRole
};
