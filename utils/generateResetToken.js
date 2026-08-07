const crypto = require('crypto');

/**
 * Generate a secure random password reset token.
 * The token is stored in the database and sent to the club admin by email.
 */
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = generateResetToken;