const { getAllUsers } = require('../models/User');

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
// Protected — requires JWT + admin role
// Returns all registered users (excludes admins)
const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers();

    return res.status(200).json({
      count: users.length,
      users,
    });

  } catch (error) {
    console.error('Get users error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

module.exports = { getUsers };
