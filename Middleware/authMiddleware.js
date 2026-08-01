const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  try {
    // 1. Get the Authorization header
    const authHeader = req.headers['authorization'];

    // 2. Check the header exists and starts with "Bearer "
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // 3. Extract the token (remove "Bearer " prefix)
    const token = authHeader.split(' ')[1];

    // 4. Verify the token using the secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 5. Attach the decoded payload to req.user so controllers can use it
    req.user = decoded; // contains { userId, iat, exp }

    // 6. Pass control to the next handler (the controller)
    next();

  } catch (error) {
    // jwt.verify throws if token is invalid or expired
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid token. Access denied.' });
  }
};

module.exports = { protect };
