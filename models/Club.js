const pool = require('../config/db');

// Get all clubs — used to populate the club selection dropdown on the frontend
const getAllClubs = async () => {
  const result = await pool.query(
    'SELECT id, name FROM clubs ORDER BY name ASC'
  );
  return result.rows; // returns array of { id, name }
};

// Find a single club by its id — used to validate the fan's club selection
const findClubById = async (clubId) => {
  const result = await pool.query(
    'SELECT id, name FROM clubs WHERE id = $1',
    [clubId]
  );
  return result.rows[0]; // returns the club row or undefined
};

// Find a single club by name (case-insensitive) — used during registration
// when the frontend sends selectedClub as a name string instead of an id
const findClubByName = async (name) => {
  const result = await pool.query(
    'SELECT id, name FROM clubs WHERE LOWER(name) = LOWER($1)',
    [name]
  );
  return result.rows[0]; // returns the club row or undefined
};

// Create a new club — super_admin only
const createClub = async ({ name, logoUrl, description, contactEmail, contactPhone }) => {
  const result = await pool.query(
    `INSERT INTO clubs (name, logo_url, description, contact_email, contact_phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, logo_url, description, contact_email, contact_phone, created_at`,
    [name, logoUrl ?? null, description ?? null, contactEmail ?? null, contactPhone ?? null]
  );
  return result.rows[0];
};

// All clubs with fan count — super_admin club list
const getAllClubsWithFanCount = async () => {
  const result = await pool.query(
    `SELECT c.id, c.name, c.logo_url, c.description, c.contact_email, c.contact_phone, c.created_at,
            COUNT(u.id) FILTER (WHERE u.role = 'user') AS fan_count
     FROM clubs c
     LEFT JOIN users u ON u.club_id = c.id
     GROUP BY c.id
     ORDER BY c.created_at DESC`
  );
  return result.rows;
};

// Single club with fan + admin counts — super_admin club detail
const getClubByIdWithStats = async (clubId) => {
  const result = await pool.query(
    `SELECT c.id, c.name, c.logo_url, c.description, c.contact_email, c.contact_phone, c.created_at,
            COUNT(u.id) FILTER (WHERE u.role = 'user') AS fan_count,
            COUNT(u.id) FILTER (WHERE u.role = 'club_admin') AS admin_count
     FROM clubs c
     LEFT JOIN users u ON u.club_id = c.id
     WHERE c.id = $1
     GROUP BY c.id`,
    [clubId]
  );
  return result.rows[0];
};

// Update club info — super_admin only
const updateClub = async (clubId, { name, logoUrl, description, contactEmail, contactPhone }) => {
  const result = await pool.query(
    `UPDATE clubs
     SET name = COALESCE($1, name),
         logo_url = COALESCE($2, logo_url),
         description = COALESCE($3, description),
         contact_email = COALESCE($4, contact_email),
         contact_phone = COALESCE($5, contact_phone)
     WHERE id = $6
     RETURNING id, name, logo_url, description, contact_email, contact_phone, created_at`,
    [name, logoUrl, description, contactEmail, contactPhone, clubId]
  );
  return result.rows[0];
};

module.exports = {
  getAllClubs,
  findClubById,
  findClubByName,
  createClub,
  getAllClubsWithFanCount,
  getClubByIdWithStats,
  updateClub,
};