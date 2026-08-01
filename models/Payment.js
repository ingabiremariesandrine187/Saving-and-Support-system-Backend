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
  return result.rows; // returns array of payment records with club name
};

module.exports = { createPayment, getPaymentsByUserId };
