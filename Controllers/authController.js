const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { findUserByEmail, findUserByPhone, createUser, findUserByEmailWithPassword, findClubAdminByEmail,
  saveResetToken,
  findUserByResetToken,
  updatePassword,
  clearResetToken } = require('../models/User');
const { findClubByName }  = require('../models/Club');
const { sendResetPasswordEmail } = require('../services/emailService');

// Allowed values
const ALLOWED_REFERRALS = ['RBA', 'Internet', 'Social Media', 'Influencers'];
const ALLOWED_PURPOSES  = ['Supporting a Club', 'Save for Home', 'Save for Seasons', 'Save for School Fees'];

// ─── POST /api/auth/register 
const registerUser = async (req, res) => {
  try {
    // 1. Extract fields from the request body
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      referral,
      password,
      confirmPassword,
      purpose,
      selectedClub, // primary source for club association
    } = req.body;

    // 2. Check all core required fields are present
    if (!firstName || !lastName || !email || !phoneNumber || !referral || !password || !confirmPassword || !purpose) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // 3. Check passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    // 4. Validate password strength (min 8 chars, at least one letter and one number)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include at least one letter and one number.'
      });
    }

    // 5. Validate referral value
    if (!ALLOWED_REFERRALS.includes(referral)) {
      return res.status(400).json({ message: 'Invalid referral value.' });
    }

    // 6. Validate purpose value
    if (!ALLOWED_PURPOSES.includes(purpose)) {
      return res.status(400).json({ message: 'Invalid purpose value.' });
    }

    // 7. If purpose is "Supporting a Club", selectedClub is required and must exist
    let clubId = null;
    if (purpose === 'Supporting a Club') {
      if (!selectedClub) {
        return res.status(400).json({ message: 'Please select a club to support.' });
      }

      // Resolve the club name to an id
      const club = await findClubByName(selectedClub.trim());
      if (!club) {
        return res.status(400).json({ message: `Club "${selectedClub}" was not found. Please select a valid club.` });
      }
      clubId = club.id;
    }

    // 8. Check for duplicate email
    const existingEmail = await findUserByEmail(email.toLowerCase());
    if (existingEmail) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    // 9. Check for duplicate phone number
    const existingPhone = await findUserByPhone(phoneNumber);
    if (existingPhone) {
      return res.status(409).json({ message: 'An account with this phone number already exists.' });
    }

    // 10. Hash the password
    const saltRounds  = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 11. Save the new user — club_id is null for non-club purposes
    const newUser = await createUser({
      firstName,
      lastName,
      email:        email.toLowerCase(),
      phoneNumber,
      referral,
      passwordHash,
      purpose,
      clubId,
    });

    // 12. Return success response
    return res.status(201).json({
      message: 'Registration successful.',
      user: {
        id:          newUser.id,
        firstName:   newUser.first_name,
        lastName:    newUser.last_name,
        email:       newUser.email,
        phoneNumber: newUser.phone_number,
        referral:    newUser.referral,
        purpose:     newUser.purpose,
        clubId:      newUser.club_id,
        createdAt:   newUser.created_at,
      },
    });

  } catch (error) {
    console.error('Registration error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ─── POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    // 1. Extract email and password
    const { email, password } = req.body;

    // 2. Check both fields are present
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // 3. Find the user by email (includes password_hash)
    const user = await findUserByEmailWithPassword(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // 4. Compare submitted password against stored bcrypt hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

     if (['super_admin', 'club_admin'].includes(user.role) && user.is_active === false) {
      return res.status(403).json({ message: 'This admin account has been disabled. Contact the system owner.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, clubId: user.club_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      message: 'Login successful.',
      token,
      role: user.role,
    });

  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ─── POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email is required.'
      });
    }

    // Find only club admin account
    const user = await findClubAdminByEmail(email.toLowerCase());

    if (!user) {
      return res.status(404).json({
        message: 'Club admin account not found.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Token expires after 1 hour
    const resetTokenExpiry = new Date(
      Date.now() + 60 * 60 * 1000
    );

    // Save token in PostgreSQL
    await saveResetToken(
      user.id,
      resetToken,
      resetTokenExpiry
    );

    // Send email
    await sendResetPasswordEmail(
      user.email,
      user.first_name,
      resetToken
    );

    return res.status(200).json({
      message: 'Password reset link sent to your email.'
    });


  } catch (error) {

    console.error('Forgot password error:', error.message);

    return res.status(500).json({
      message: 'Server error. Please try again later.'
    });
  }
};


// ─── GET /api/auth/validate-reset-token/:token
const validateResetToken = async (req, res) => {
  try {

    const { token } = req.params;


    const user = await findUserByResetToken(token);


    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset token.'
      });
    }


    return res.status(200).json({
      message: 'Reset token is valid.'
    });


  } catch (error) {

    console.error('Validate token error:', error.message);

    return res.status(500).json({
      message: 'Server error. Please try again later.'
    });

  }
};


// ─── POST /api/auth/reset-password
const resetPassword = async (req, res) => {

  try {

    const {
      token,
      newPassword,
      confirmPassword
    } = req.body;


    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: 'Token, new password and confirm password are required.'
      });
    }


    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: 'Passwords do not match.'
      });
    }


    // Same password rules as registration
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include at least one letter and one number.'
      });
    }


    const user = await findUserByResetToken(token);


    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset token.'
      });
    }


    const passwordHash = await bcrypt.hash(
      newPassword,
      10
    );


    await updatePassword(
      user.id,
      passwordHash
    );


    // Remove token after successful reset
    await clearResetToken(user.id);



    return res.status(200).json({
      message: 'Password reset successful. You can now login with your new password.'
    });


  } catch (error) {

    console.error('Reset password error:', error.message);

    return res.status(500).json({
      message: 'Server error. Please try again later.'
    });

  }
};


// ─── Exports — must be at the bottom after both functions are defined ─────────
module.exports = { registerUser, loginUser,forgotPassword,validateResetToken,resetPassword };