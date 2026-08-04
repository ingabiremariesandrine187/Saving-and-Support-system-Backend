const jwt = require('jsonwebtoken');

// ─── protect ──────────────────────────────────────────────────────────────────
// Verifies JWT token on every protected route.
// Attaches decoded payload to req.user: { userId, role, clubId, iat, exp }
const protect = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // { userId, role, clubId, iat, exp }
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid token. Access denied.' });
  }
};

// ─── isSuperAdmin ─────────────────────────────────────────────────────────────
// Allows access only to super_admin.
// Must be chained AFTER protect.
const isSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'super_admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Super admin privileges required.' });
};

// ─── isClubAdmin ──────────────────────────────────────────────────────────────
// Allows access only to club_admin.
// Must be chained AFTER protect.
const isClubAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'club_admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Club admin privileges required.' });
};

// ─── isAnyAdmin ───────────────────────────────────────────────────────────────
// Allows access to both super_admin and club_admin.
// Used for routes that both admin types can access (with scoped data).
// Must be chained AFTER protect.
const isAnyAdmin = (req, res, next) => {
  if (req.user && ['super_admin', 'club_admin'].includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
};

// ─── isAdmin (legacy) ────────────────────────────────────────────────────────
// Kept for backward compatibility with existing routes.
// New routes should use isSuperAdmin, isClubAdmin, or isAnyAdmin instead.
const isAdmin = (req, res, next) => {
  if (req.user && ['super_admin', 'club_admin'].includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
};

module.exports = { protect, isSuperAdmin, isClubAdmin, isAnyAdmin, isAdmin };
