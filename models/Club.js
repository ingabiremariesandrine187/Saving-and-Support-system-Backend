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

module.exports = { getAllClubs, findClubById, findClubByName };
