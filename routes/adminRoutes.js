const express    = require('express');
const router     = express.Router();
const { protect, isAdmin } = require('../Middleware/authMiddleware');
const { getUsers }         = require('../Controllers/adminController');

// GET /api/admin/users — protected + admin only
// Returns all registered users for the admin dashboard
// protect verifies JWT first, isAdmin checks role second
router.get('/users', protect, isAdmin, getUsers);

module.exports = router;
