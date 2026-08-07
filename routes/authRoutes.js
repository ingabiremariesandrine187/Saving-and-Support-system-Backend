const express = require('express');
const router  = express.Router();
const { registerUser, loginUser, forgotPassword, validateResetToken, resetPassword } = require('../Controllers/authController');

// POST /api/auth/register
router.post('/register', registerUser);

// POST /api/auth/login
router.post('/login', loginUser);


router.post('/forgot-password', forgotPassword);

router.get('/validate-reset-token/:token', validateResetToken);

router.post('/reset-password', resetPassword);

module.exports = router;
