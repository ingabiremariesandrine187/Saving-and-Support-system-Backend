const { getUsersByClubId,
        findFanByIdAndClub,
        updateFan,
        deleteFan }               = require('../models/User');
const { getPaymentsByClubId }     = require('../models/Payment');
const { getConsentsByClubId }     = require('../models/Consent');
const { getClubByIdWithStats }    = require('../models/Club');
const pool                        = require('../config/db');

// ─── Helper — extract clubId from JWT ────────────────────────────────────────
// The club_admin's assigned club_id is embedded in their JWT by the login
// controller. Every function below uses req.user.clubId to scope queries.
// This means a club_admin can never access another club's data —
// even if they manually send a different club id in the request.

// ─── GET /api/club-admin/dashboard ───────────────────────────────────────────
// Returns a summary of the club_admin's assigned club:
// club info, total fans, total consents, total payments
const getDashboard = async (req, res) => {
  try {
    const clubId = req.user.clubId;

    if (!clubId) {
      return res.status(403).json({
        message: 'No club assigned to this admin account. Contact super admin.',
      });
    }

    // Load club stats (fan_count, admin_count via JOIN)
    const club = await getClubByIdWithStats(clubId);
    if (!club) {
      return res.status(404).json({ message: 'Assigned club not found.' });
    }

    // Load scoped data counts
    const [fans, consents, payments] = await Promise.all([
      getUsersByClubId(clubId),
      getConsentsByClubId(clubId),
      getPaymentsByClubId(clubId),
    ]);

    // Summary stats
    const verifiedConsents  = consents.filter(c => c.is_verified).length;
    const pendingPayments   = payments.filter(p => p.status === 'pending').length;
    const completedPayments = payments.filter(p => p.status === 'completed').length;

    return res.status(200).json({
      club: {
        id:           club.id,
        name:         club.name,
        contactEmail: club.contact_email,
        contactPhone: club.contact_phone,
      },
      stats: {
        totalFans:          fans.length,
        totalConsents:      consents.length,
        verifiedConsents,
        totalPayments:      payments.length,
        pendingPayments,
        completedPayments,
      },
    });

  } catch (error) {
    console.error('Club admin dashboard error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ─── GET /api/club-admin/fans ─────────────────────────────────────────────────
// Returns all fans registered under this club_admin's club
const getFans = async (req, res) => {
  try {
    const clubId = req.user.clubId;

    if (!clubId) {
      return res.status(403).json({
        message: 'No club assigned to this admin account. Contact super admin.',
      });
    }

    const fans = await getUsersByClubId(clubId);

    return res.status(200).json({
      count: fans.length,
      fans,
    });

  } catch (error) {
    console.error('Get fans error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ─── GET /api/club-admin/consents ─────────────────────────────────────────────
// Returns all consent records for fans of this club_admin's club
const getConsents = async (req, res) => {
  try {
    const clubId = req.user.clubId;

    if (!clubId) {
      return res.status(403).json({
        message: 'No club assigned to this admin account. Contact super admin.',
      });
    }

    const consents = await getConsentsByClubId(clubId);

    // Separate verified from pending for easy frontend display
    const verified = consents.filter(c => c.is_verified);
    const pending  = consents.filter(c => !c.is_verified);

    return res.status(200).json({
      count:    consents.length,
      verified: verified.length,
      pending:  pending.length,
      consents,
    });

  } catch (error) {
    console.error('Get consents error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ─── GET /api/club-admin/payments ─────────────────────────────────────────────
// Returns all payment records for fans of this club_admin's club
const getPayments = async (req, res) => {
  try {
    const clubId = req.user.clubId;

    if (!clubId) {
      return res.status(403).json({
        message: 'No club assigned to this admin account. Contact super admin.',
      });
    }

    const payments = await getPaymentsByClubId(clubId);

    // Break down by status for dashboard summary
    const pending   = payments.filter(p => p.status === 'pending').length;
    const completed = payments.filter(p => p.status === 'completed').length;
    const failed    = payments.filter(p => p.status === 'failed').length;

    // Total amount collected from completed payments only
    const totalCollected = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    return res.status(200).json({
      count:          payments.length,
      pending,
      completed,
      failed,
      totalCollected: totalCollected.toFixed(2),
      payments,
    });

  } catch (error) {
    console.error('Get payments error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ─── PUT /api/club-admin/fans/:id ────────────────────────────────────────────
// Update a fan's details — club_admin can only update fans in their own club
const updateFanById = async (req, res) => {
  try {
    const clubId = req.user.clubId;
    const fanId  = parseInt(req.params.id);

    if (!clubId) {
      return res.status(403).json({
        message: 'No club assigned to this admin account. Contact super admin.',
      });
    }

    // 1. Verify the fan exists AND belongs to this admin's club
    const fan = await findFanByIdAndClub(fanId, clubId);
    if (!fan) {
      return res.status(404).json({
        message: 'Fan not found or does not belong to your club.',
      });
    }

    // 2. Extract all updatable fields including email
    const { firstName, lastName, email, phoneNumber, referral } = req.body;

    // 3. At least one field must be provided
    if (!firstName && !lastName && !email && !phoneNumber && !referral) {
      return res.status(400).json({
        message: 'Provide at least one field to update: firstName, lastName, email, phoneNumber, referral.',
      });
    }

    // 4. If email is being changed, check it is not already taken by another user
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();

      // Basic email format check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ message: 'Invalid email format.' });
      }

      // Check duplicate — exclude the fan being updated
      const existingEmail = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [normalizedEmail, fanId]
      );
      if (existingEmail.rows.length > 0) {
        return res.status(409).json({ message: 'This email is already registered to another account.' });
      }
    }

    // 5. If phone number is being changed, check it is not already taken by another user
    if (phoneNumber) {
      const existingPhone = await pool.query(
        'SELECT id FROM users WHERE phone_number = $1 AND id != $2',
        [phoneNumber, fanId]
      );
      if (existingPhone.rows.length > 0) {
        return res.status(409).json({ message: 'This phone number is already registered to another account.' });
      }
    }

    // 6. Validate referral if provided
    const allowedReferrals = ['RBA', 'Internet', 'Social Media', 'Influencers'];
    if (referral && !allowedReferrals.includes(referral)) {
      return res.status(400).json({ message: 'Invalid referral value.' });
    }

    // 7. Perform the update
    const updatedFan = await updateFan(fanId, {
      firstName,
      lastName,
      email: email ? email.toLowerCase().trim() : undefined,
      phoneNumber,
      referral,
    });

    return res.status(200).json({
      message: 'Fan updated successfully.',
      fan: {
        id:          updatedFan.id,
        firstName:   updatedFan.first_name,
        lastName:    updatedFan.last_name,
        email:       updatedFan.email,
        phoneNumber: updatedFan.phone_number,
        referral:    updatedFan.referral,
        clubId:      updatedFan.club_id,
      },
    });

  } catch (error) {
    console.error('Update fan error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ─── DELETE /api/club-admin/fans/:id ─────────────────────────────────────────
// Delete a fan — club_admin can only delete fans in their own club
// Deleting a fan also removes their consent and payment records (CASCADE)
const deleteFanById = async (req, res) => {
  try {
    const clubId = req.user.clubId;
    const fanId  = parseInt(req.params.id);

    if (!clubId) {
      return res.status(403).json({
        message: 'No club assigned to this admin account. Contact super admin.',
      });
    }

    // 1. Verify the fan exists AND belongs to this admin's club
    const fan = await findFanByIdAndClub(fanId, clubId);
    if (!fan) {
      return res.status(404).json({
        message: 'Fan not found or does not belong to your club.',
      });
    }

    // 2. Delete the fan (consent + payment records deleted automatically via CASCADE)
    await deleteFan(fanId);

    return res.status(200).json({
      message: `Fan ${fan.first_name} ${fan.last_name} has been deleted successfully.`,
    });

  } catch (error) {
    console.error('Delete fan error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

module.exports = { getDashboard, getFans, getConsents, getPayments, updateFanById, deleteFanById };
