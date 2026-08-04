const pool = require('../config/db');

// Check if a consent record already exists for this user
const findConsentByUserId = async (userId) => {
  const result = await pool.query(
    `SELECT id, user_id, club_id, agreed, payment_frequency, amount,
            otp_code, otp_expires_at, is_verified, created_at, updated_at
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

// Get all consents for a specific club — used by club_admin dashboard
// Returns fan details joined with club name, scoped to the admin's club
const getConsentsByClubId = async (clubId) => {
  const result = await pool.query(
    `SELECT cn.id, cn.user_id, cn.club_id, cn.agreed, cn.payment_frequency,
            cn.amount, cn.is_verified, cn.created_at, cn.updated_at,
            u.first_name, u.last_name, u.email,
            c.name AS club_name
     FROM consents cn
     JOIN users u ON cn.user_id = u.id
     JOIN clubs c ON cn.club_id = c.id
     WHERE cn.club_id = $1
     ORDER BY cn.created_at DESC`,
    [clubId]
  );
  return result.rows;
};

// Get all consents across all clubs — used by super_admin dashboard
const getAllConsents = async () => {
  const result = await pool.query(
    `SELECT cn.id, cn.user_id, cn.club_id, cn.agreed, cn.payment_frequency,
            cn.amount, cn.is_verified, cn.created_at, cn.updated_at,
            u.first_name, u.last_name, u.email,
            c.name AS club_name
     FROM consents cn
     JOIN users u ON cn.user_id = u.id
     JOIN clubs c ON cn.club_id = c.id
     ORDER BY cn.created_at DESC`
  );
  return result.rows;
};

module.exports = {
  findConsentByUserId,
  createConsent,
  updateConsent,
  saveOTP,
  markConsentVerified,
  getConsentsByClubId,
  getAllConsents,
};
