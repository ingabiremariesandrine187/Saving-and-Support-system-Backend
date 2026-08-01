const { getAllClubs, findClubById }                              = require('../models/Club');
const { findConsentByUserId, createConsent, updateConsent,
        saveOTP, markConsentVerified }                           = require('../models/Consent');
const { findUserById }                                           = require('../models/User');
const { generateOTP }                                            = require('../utils/generateOTP');
const { sendOTPEmail }                                           = require('../services/emailService');

// ─── Amount rules per frequency ───────────────────────────────────────────────
const FREQUENCY_RULES = {
  daily:   { min: 20,   max: 200   },
  weekly:  { min: 201,  max: 2000  },
  monthly: { min: 2001, max: 10000 },
};

// ─── GET /api/consent/clubs ───────────────────────────────────────────────────
// Public — no auth needed. Returns all clubs for the selection dropdown.
const getClubs = async (req, res) => {
  try {
    const clubs = await getAllClubs();
    return res.status(200).json({ clubs });
  } catch (error) {
    console.error('Get clubs error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ─── POST /api/consent/submit ─────────────────────────────────────────────────
// Protected — requires valid JWT.
// Fan submits or updates their consent form, then receives an OTP by email.
const submitConsent = async (req, res) => {
  try {
    // 1. Get the logged-in user's id from the JWT (set by authMiddleware)
    const userId = req.user.userId;

    // 2. Extract fields from request body
    const { clubId, agreed, paymentFrequency, amount } = req.body;

    // 3. Validate all fields are present
    if (!clubId || agreed === undefined || !paymentFrequency || !amount) {
      return res.status(400).json({
        message: 'All fields are required: clubId, agreed, paymentFrequency, amount.',
      });
    }

    // 4. agreed must be true — fan must actually consent
    if (agreed !== true) {
      return res.status(400).json({
        message: 'You must agree to the terms to submit the consent form.',
      });
    }

    // 5. Validate paymentFrequency is one of the allowed values
    const frequency = paymentFrequency.toLowerCase();
    if (!FREQUENCY_RULES[frequency]) {
      return res.status(400).json({
        message: 'Invalid payment frequency. Choose daily, weekly, or monthly.',
      });
    }

    // 6. Validate the amount matches the selected frequency range
    const { min, max } = FREQUENCY_RULES[frequency];
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < min || numericAmount > max) {
      return res.status(400).json({
        message: `For ${frequency} payments, amount must be between ${min} RWF and ${max} RWF.`,
      });
    }

    // 7. Validate the club exists
    const club = await findClubById(clubId);
    if (!club) {
      return res.status(404).json({ message: 'Selected club not found.' });
    }

    // 8. Save or update the consent record
    const existingConsent = await findConsentByUserId(userId);
    let consent;
    if (existingConsent) {
      consent = await updateConsent({
        userId,
        clubId,
        agreed,
        paymentFrequency: frequency,
        amount:           numericAmount,
      });
    } else {
      consent = await createConsent({
        userId,
        clubId,
        agreed,
        paymentFrequency: frequency,
        amount:           numericAmount,
      });
    }

    // 9. Generate OTP and calculate expiry time
    const otpCode      = generateOTP();
    const expiresInMs  = parseInt(process.env.OTP_EXPIRES_MINUTES) * 60 * 1000;
    const otpExpiresAt = new Date(Date.now() + expiresInMs);

    // 10. Save the OTP to the consent record
    await saveOTP(userId, otpCode, otpExpiresAt);

    // 11. Fetch the user's email and first name to send the OTP email
    const user = await findUserById(userId);

    // 12. Send the OTP email
    await sendOTPEmail(
      user.email,
      user.first_name,
      otpCode,
      process.env.OTP_EXPIRES_MINUTES
    );

    return res.status(200).json({
      message: `Consent ${existingConsent ? 'updated' : 'submitted'} successfully. A verification code has been sent to ${user.email}.`,
      consent: {
        id:               consent.id,
        clubId:           consent.club_id,
        clubName:         club.name,
        agreed:           consent.agreed,
        paymentFrequency: consent.payment_frequency,
        amount:           consent.amount,
        isVerified:       false,
      },
    });

  } catch (error) {
    console.error('Submit consent error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ─── POST /api/consent/verify-otp ────────────────────────────────────────────
// Protected — fan submits the 6-digit OTP they received by email.
const verifyOTP = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { otp }  = req.body;

    // 1. OTP is required
    if (!otp) {
      return res.status(400).json({ message: 'OTP code is required.' });
    }

    // 2. Load the fan's consent record
    const consent = await findConsentByUserId(userId);
    if (!consent) {
      return res.status(404).json({
        message: 'No consent record found. Please submit the consent form first.',
      });
    }

    // 3. Check if consent is already verified
    if (consent.is_verified) {
      return res.status(400).json({
        message: 'Your consent is already verified.',
      });
    }

    // 4. Check an OTP was actually issued
    if (!consent.otp_code || !consent.otp_expires_at) {
      return res.status(400).json({
        message: 'No OTP found. Please submit the consent form to receive a new code.',
      });
    }

    // 5. Check OTP has not expired
    const now = new Date();
    if (now > new Date(consent.otp_expires_at)) {
      return res.status(400).json({
        message: 'OTP has expired. Please request a new code.',
      });
    }

    // 6. Check the OTP matches
    if (otp.toString().trim() !== consent.otp_code) {
      return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });
    }

    // 7. Mark consent as verified — activates the contribution plan
    const verifiedConsent = await markConsentVerified(userId);

    return res.status(200).json({
      message: 'Consent verified successfully. Your automatic contribution plan is now active.',
      consent: {
        id:               verifiedConsent.id,
        clubId:           verifiedConsent.club_id,
        agreed:           verifiedConsent.agreed,
        paymentFrequency: verifiedConsent.payment_frequency,
        amount:           verifiedConsent.amount,
        isVerified:       verifiedConsent.is_verified,
      },
    });

  } catch (error) {
    console.error('Verify OTP error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ─── POST /api/consent/resend-otp ────────────────────────────────────────────
// Protected — generates a fresh OTP and resends it to the user's email.
const resendOTP = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 1. Check consent record exists
    const consent = await findConsentByUserId(userId);
    if (!consent) {
      return res.status(404).json({
        message: 'No consent record found. Please submit the consent form first.',
      });
    }

    // 2. Don't resend if already verified
    if (consent.is_verified) {
      return res.status(400).json({
        message: 'Your consent is already verified. No need for a new code.',
      });
    }

    // 3. Generate a fresh OTP and new expiry
    const otpCode      = generateOTP();
    const expiresInMs  = parseInt(process.env.OTP_EXPIRES_MINUTES) * 60 * 1000;
    const otpExpiresAt = new Date(Date.now() + expiresInMs);

    // 4. Overwrite the old OTP in the database
    await saveOTP(userId, otpCode, otpExpiresAt);

    // 5. Fetch user details and resend the email
    const user = await findUserById(userId);
    await sendOTPEmail(
      user.email,
      user.first_name,
      otpCode,
      process.env.OTP_EXPIRES_MINUTES
    );

    return res.status(200).json({
      message: `A new verification code has been sent to ${user.email}.`,
    });

  } catch (error) {
    console.error('Resend OTP error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ─── GET /api/consent/my-consent ─────────────────────────────────────────────
// Protected — returns the logged-in fan's current consent record.
const getMyConsent = async (req, res) => {
  try {
    const userId = req.user.userId;

    const consent = await findConsentByUserId(userId);
    if (!consent) {
      return res.status(404).json({
        message: 'No consent record found. Please submit the consent form first.',
      });
    }

    const club = await findClubById(consent.club_id);

    return res.status(200).json({
      consent: {
        id:               consent.id,
        clubId:           consent.club_id,
        clubName:         club ? club.name : null,
        agreed:           consent.agreed,
        paymentFrequency: consent.payment_frequency,
        amount:           consent.amount,
        isVerified:       consent.is_verified,
        createdAt:        consent.created_at,
        updatedAt:        consent.updated_at,
      },
    });

  } catch (error) {
    console.error('Get consent error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

module.exports = { getClubs, submitConsent, verifyOTP, resendOTP, getMyConsent };
