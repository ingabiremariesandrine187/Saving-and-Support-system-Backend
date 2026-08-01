const pool = require('../config/db');

// Check if a user already exists with the given email
const findUserByEmail = async (email) => {
  const result = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0]; // returns the user row or undefined
};

// Check if a user already exists with the given phone number
const findUserByPhone = async (phoneNumber) => {
  const result = await pool.query(
    'SELECT id FROM users WHERE phone_number = $1',
    [phoneNumber]
  );
  return result.rows[0]; // returns the user row or undefined
};

// Insert a new user into the database
// club_id is only set when purpose is 'Supporting a Club', otherwise null
const createUser = async ({ firstName, lastName, email, phoneNumber, referral, passwordHash, purpose, clubId }) => {
  const result = await pool.query(
    `INSERT INTO users (first_name, last_name, email, phone_number, referral, password_hash, purpose, club_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, first_name, last_name, email, phone_number, referral, purpose, club_id, created_at`,
    [firstName, lastName, email, phoneNumber, referral, passwordHash, purpose, clubId ?? null]
  );
  return result.rows[0];
};

// Fetch a user by email INCLUDING password_hash — used only for login
const findUserByEmailWithPassword = async (email) => {
  const result = await pool.query(
    'SELECT id, first_name, last_name, email, phone_number, referral, password_hash, created_at FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0]; // returns full user row or undefined
};

// Fetch a user by id — used by protected routes to get user details from JWT payload
const findUserById = async (id) => {
  const result = await pool.query(
    'SELECT id, first_name, last_name, email, phone_number FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

module.exports = { findUserByEmail, findUserByPhone, createUser, findUserByEmailWithPassword, findUserById };
