const crypto = require('crypto');

/**
 * Generates a cryptographically secure 6-digit OTP.
 * Uses Node's built-in crypto module — no extra package needed.
 *
 * Returns a string like "048273" (always 6 digits, zero-padded if needed).
 */
const generateOTP = () => {
  // Generate a random number between 0 and 999999
  const otp = crypto.randomInt(0, 1000000);

  // Pad with leading zeros so it's always exactly 6 digits
  // e.g. 48273 → "048273"
  return otp.toString().padStart(6, '0');
};

module.exports = { generateOTP };
