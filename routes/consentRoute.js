const express = require('express');
const router  = express.Router();
const { protect }      = require('../Middleware/authMiddleware');
const {
  getClubs,
  submitConsent,
  verifyOTP,
  resendOTP,
  getMyConsent,
} = require('../Controllers/consentController');

// GET /api/consent/clubs — public, no auth needed
// Returns all available clubs for the selection dropdown
router.get('/clubs', getClubs);

// POST /api/consent/submit — protected, JWT required
// Fan submits or updates their consent form → OTP sent to email
router.post('/submit', protect, submitConsent);

// POST /api/consent/verify-otp — protected, JWT required
// Fan submits the 6-digit OTP to activate their contribution plan
router.post('/verify-otp', protect, verifyOTP);

// POST /api/consent/resend-otp — protected, JWT required
// Fan requests a fresh OTP if the previous one expired or was not received
router.post('/resend-otp', protect, resendOTP);

// GET /api/consent/my-consent — protected, JWT required
// Returns the logged-in fan's current consent record and verification status
router.get('/my-consent', protect, getMyConsent);

module.exports = router;
