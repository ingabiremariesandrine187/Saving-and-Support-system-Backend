const express = require('express');
const router  = express.Router();
const { protect }                          = require('../Middleware/authMiddleware');
const { contribute, getPaymentHistory }    = require('../Controllers/paymentController');

// POST /api/payments/contribute — protected, JWT required
// Fan initiates a contribution using their consent settings
router.post('/contribute', protect, contribute);

// GET /api/payments/history — protected, JWT required
// Returns the fan's full payment history
router.get('/history', protect, getPaymentHistory);

module.exports = router;
