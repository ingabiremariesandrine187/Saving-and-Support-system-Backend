const express = require('express');
const router  = express.Router();
const { protect, isClubAdmin } = require('../Middleware/authMiddleware');
const {
  getDashboard,
  getFans,
  getConsents,
  getPayments,
} = require('../Controllers/clubAdminController');

// Every route here requires:
// 1. protect   — valid JWT token
// 2. isClubAdmin — role must be 'club_admin'
router.use(protect, isClubAdmin);

// GET /api/club-admin/dashboard — summary stats for the admin's club
router.get('/dashboard', getDashboard);

// GET /api/club-admin/fans — all fans belonging to the admin's club
router.get('/fans', getFans);

// GET /api/club-admin/consents — all consent records for the admin's club
router.get('/consents', getConsents);

// GET /api/club-admin/payments — all payments for the admin's club
router.get('/payments', getPayments);

module.exports = router;
