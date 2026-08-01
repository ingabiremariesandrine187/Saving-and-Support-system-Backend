const pool = require('../config/db');

// Check if a consent record already exists for this user
const findConsentByUserId = async (userId) => {
  const result = await pool.query(
    `SELECT id, user_id, club_id, agreed, payment_frequency, amount, created_at, updated_at
     FROM consents
     WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0]; // returns consent row or undefined
};

// Create a new consent record for the user
const createConsent = async ({ userId, clubId, agreed, paymentFrequency, amount }) => {
  const result = await pool.query(
    `INSERT INTO consents (user_id, club_id, agreed, payment_frequency, amount)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, club_id, agreed, payment_frequency, amount, created_at`,
    [userId, clubId, agreed, paymentFrequency, amount]
  );
  return result.rows[0];
};

// Update an existing consent record (fan changes club, frequency, or amount)
const updateConsent = async ({ userId, clubId, agreed, paymentFrequency, amount }) => {
  const result = await pool.query(
    `UPDATE consents
     SET club_id           = $1,
         agreed            = $2,
         payment_frequency = $3,
         amount            = $4,
         updated_at        = CURRENT_TIMESTAMP
     WHERE user_id = $5
     RETURNING id, user_id, club_id, agreed, payment_frequency, amount, updated_at`,
    [clubId, agreed, paymentFrequency, amount, userId]
  );
  return result.rows[0];
};

// Save OTP code and expiry time onto the consent record
// Called after consent is submitted — stores the generated OTP ready for verification
const saveOTP = async (userId, otpCode, otpExpiresAt) => {
  const result = await pool.query(
    `UPDATE consents
     SET otp_code       = $1,
         otp_expires_at = $2,
         is_verified    = FALSE
     WHERE user_id = $3
     RETURNING id, otp_code, otp_expires_at, is_verified`,
    [otpCode, otpExpiresAt, userId]
  );
  return result.rows[0];
};

// Mark the consent as verified — called after fan enters the correct OTP
// Clears the OTP columns so the code cannot be reused
const markConsentVerified = async (userId) => {
  const result = await pool.query(
    `UPDATE consents
     SET is_verified    = TRUE,
         otp_code       = NULL,
         otp_expires_at = NULL,
         updated_at     = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING id, user_id, club_id, agreed, payment_frequency, amount, is_verified, updated_at`,
    [userId]
  );
  return result.rows[0];
};

module.exports = {
  findConsentByUserId,
  createConsent,
  updateConsent,
  saveOTP,
  markConsentVerified,
};
