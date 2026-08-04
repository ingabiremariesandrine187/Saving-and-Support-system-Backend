const pool = require('../config/db');

// Create a new payment record (status starts as 'pending')
const createPayment = async ({ userId, clubId, amount, paymentFrequency }) => {
  const result = await pool.query(
    `INSERT INTO payments (user_id, club_id, amount, payment_frequency)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, club_id, amount, payment_frequency, status, created_at`,
    [userId, clubId, amount, paymentFrequency]
  );
  return result.rows[0];
};

// Get all payment records for a specific user
const getPaymentsByUserId = async (userId) => {
  const result = await pool.query(
    `SELECT p.id, p.amount, p.payment_frequency, p.status, p.created_at,
            c.name AS club_name
     FROM payments p
     JOIN clubs c ON p.club_id = c.id
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC`,
    [userId]
  );
  return result.rows;
};

// Get all payments for a specific club — used by club_admin dashboard
// Scoped to club_admin's assigned club only
const getPaymentsByClubId = async (clubId) => {
  const result = await pool.query(
    `SELECT p.id, p.user_id, p.amount, p.payment_frequency, p.status, p.created_at,
            u.first_name, u.last_name, u.email,
            c.name AS club_name
     FROM payments p
     JOIN users  u ON p.user_id  = u.id
     JOIN clubs  c ON p.club_id  = c.id
     WHERE p.club_id = $1
     ORDER BY p.created_at DESC`,
    [clubId]
  );
  return result.rows;
};

// Get all payments across all clubs — used by super_admin dashboard
const getAllPayments = async () => {
  const result = await pool.query(
    `SELECT p.id, p.user_id, p.amount, p.payment_frequency, p.status, p.created_at,
            u.first_name, u.last_name, u.email,
            c.name AS club_name
     FROM payments p
     JOIN users  u ON p.user_id = u.id
     JOIN clubs  c ON p.club_id = c.id
     ORDER BY p.created_at DESC`
  );
  return result.rows;
};

module.exports = {
  createPayment,
  getPaymentsByUserId,
  getPaymentsByClubId,
  getAllPayments,
};
