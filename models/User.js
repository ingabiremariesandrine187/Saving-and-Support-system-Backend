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
    'SELECT id, first_name, last_name, email, phone_number, referral, password_hash, role, club_id, is_active, created_at FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0];
};

// Fetch a user by id — used by protected routes to get user details from JWT payload
const findUserById = async (id) => {
  const result = await pool.query(
    'SELECT id, first_name, last_name, email, phone_number FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

// Get all registered users — used by super_admin dashboard
// Returns all users with role 'user' ordered by newest first
// Never returns password_hash
const getAllUsers = async () => {
  const result = await pool.query(
    `SELECT id, first_name, last_name, email, phone_number, referral,
            purpose, club_id, role, created_at
     FROM users
     WHERE role = 'user'
     ORDER BY created_at DESC`
  );
  return result.rows;
};

// Get all users belonging to a specific club — used by club_admin dashboard
// Only returns fans (role = 'user') scoped to that club
const getUsersByClubId = async (clubId) => {
  const result = await pool.query(
    `SELECT id, first_name, last_name, email, phone_number, referral,
            purpose, club_id, role, created_at
     FROM users
     WHERE role = 'user'
     AND   club_id = $1
     ORDER BY created_at DESC`,
    [clubId]
  );
  return result.rows;
};

// Create a new admin account (club_admin or super_admin)
// Used by super_admin when assigning a new club admin
const createAdminUser = async ({ firstName, lastName, email, phoneNumber, passwordHash, role, clubId }) => {
  const result = await pool.query(
    `INSERT INTO users (first_name, last_name, email, phone_number, referral, password_hash, purpose, role, club_id)
     VALUES ($1, $2, $3, $4, 'RBA', $5, 'Supporting a Club', $6, $7)
     RETURNING id, first_name, last_name, email, phone_number, role, club_id, created_at`,
    [firstName, lastName, email, phoneNumber, passwordHash, role, clubId ?? null]
  );
  return result.rows[0];
};

// Get all admin accounts — used by super_admin to manage admins
// Returns both super_admin and club_admin accounts
const getAllAdminUsers = async () => {
  const result = await pool.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone_number,
            u.role, u.club_id, c.name AS club_name, u.created_at
     FROM users u
     LEFT JOIN clubs c ON u.club_id = c.id
     WHERE u.role IN ('super_admin', 'club_admin')
     ORDER BY u.role, u.created_at DESC`
  );
  return result.rows;
};

// Find a single admin by id — used before disable/enable actions
const findAdminById = async (id) => {
  const result = await pool.query(
    `SELECT id, first_name, last_name, email, phone_number, role, club_id, is_active, created_at
     FROM users
     WHERE id = $1 AND role IN ('super_admin', 'club_admin')`,
    [id]
  );
  return result.rows[0];
};

// Get all club_admin accounts only — used by super_admin club-admins list
const getClubAdmins = async () => {
  const result = await pool.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone_number,
            u.role, u.club_id, c.name AS club_name, u.is_active, u.created_at
     FROM users u
     LEFT JOIN clubs c ON u.club_id = c.id
     WHERE u.role = 'club_admin'
     ORDER BY u.created_at DESC`
  );
  return result.rows;
};

// Enable/disable a club_admin's login access — super_admin only
const setAdminActiveStatus = async (id, isActive) => {
  const result = await pool.query(
    `UPDATE users
     SET is_active = $1
     WHERE id = $2 AND role = 'club_admin'
     RETURNING id, first_name, last_name, email, role, club_id, is_active`,
    [isActive, id]
  );
  return result.rows[0];
};

module.exports = {
  findUserByEmail,
  findUserByPhone,
  createUser,
  findUserByEmailWithPassword,
  findUserById,
  getAllUsers,
  getUsersByClubId,
  createAdminUser,
  getAllAdminUsers,
  findAdminById,
  getClubAdmins,
  setAdminActiveStatus,
};