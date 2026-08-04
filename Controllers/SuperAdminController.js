const bcrypt = require('bcryptjs');
const {
  createClub,
  getAllClubsWithFanCount,
  getClubByIdWithStats,
  updateClub,
  findClubById,
} = require('../models/Club');
const {
  findUserByEmail,
  findUserByPhone,
  createAdminUser,
  getClubAdmins,
  findAdminById,
  setAdminActiveStatus,
} = require('../models/User');

// ─── POST /api/super-admin/clubs ──────────────────────────────────────────────
const createClubHandler = async (req, res) => {
  try {
    const { name, logoUrl, description, contactEmail, contactPhone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Club name is required.' });
    }

    const club = await createClub({ name: name.trim(), logoUrl, description, contactEmail, contactPhone });
    return res.status(201).json({ message: 'Club created successfully.', club });

  } catch (error) {
    if (error.code === '23505') { // unique constraint violation
      return res.status(409).json({ message: 'A club with this name already exists.' });
    }
    console.error('Create club error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ─── GET /api/super-admin/clubs ───────────────────────────────────────────────
const getClubs = async (req, res) => {
  try {
    const clubs = await getAllClubsWithFanCount();
    return res.status(200).json({ count: clubs.length, clubs });
  } catch (error) {
    console.error('Get clubs error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ─── GET /api/super-admin/clubs/:id ───────────────────────────────────────────
const getClubDetail = async (req, res) => {
  try {
    const club = await getClubByIdWithStats(req.params.id);
    if (!club) {
      return res.status(404).json({ message: 'Club not found.' });
    }
    return res.status(200).json({ club });
  } catch (error) {
    console.error('Get club detail error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ─── PUT /api/super-admin/clubs/:id ───────────────────────────────────────────
const updateClubHandler = async (req, res) => {
  try {
    const existing = await findClubById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Club not found.' });
    }

    const { name, logoUrl, description, contactEmail, contactPhone } = req.body;
    const club = await updateClub(req.params.id, { name, logoUrl, description, contactEmail, contactPhone });
    return res.status(200).json({ message: 'Club updated successfully.', club });

  } catch (error) {
    console.error('Update club error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ─── POST /api/super-admin/club-admins ────────────────────────────────────────
const createClubAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, password, clubId } = req.body;

    if (!firstName || !lastName || !email || !phoneNumber || !password || !clubId) {
      return res.status(400).json({ message: 'firstName, lastName, email, phoneNumber, password, and clubId are all required.' });
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include at least one letter and one number.'
      });
    }

    const club = await findClubById(clubId);
    if (!club) {
      return res.status(404).json({ message: 'Club not found.' });
    }

    const existingEmail = await findUserByEmail(email.toLowerCase());
    if (existingEmail) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const existingPhone = await findUserByPhone(phoneNumber);
    if (existingPhone) {
      return res.status(409).json({ message: 'An account with this phone number already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await createAdminUser({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phoneNumber,
      passwordHash,
      role: 'club_admin',
      clubId,
    });

    return res.status(201).json({ message: 'Club admin created successfully.', admin });

  } catch (error) {
    console.error('Create club admin error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ─── GET /api/super-admin/club-admins ─────────────────────────────────────────
const listClubAdmins = async (req, res) => {
  try {
    const admins = await getClubAdmins();
    return res.status(200).json({ count: admins.length, admins });
  } catch (error) {
    console.error('List club admins error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ─── PUT /api/super-admin/club-admins/:id/disable ─────────────────────────────
const disableClubAdmin = async (req, res) => {
  try {
    const admin = await findAdminById(req.params.id);
    if (!admin || admin.role !== 'club_admin') {
      return res.status(404).json({ message: 'Club admin not found.' });
    }

    const updated = await setAdminActiveStatus(req.params.id, false);
    return res.status(200).json({ message: 'Club admin disabled.', admin: updated });

  } catch (error) {
    console.error('Disable club admin error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ─── PUT /api/super-admin/club-admins/:id/enable ──────────────────────────────
const enableClubAdmin = async (req, res) => {
  try {
    const admin = await findAdminById(req.params.id);
    if (!admin || admin.role !== 'club_admin') {
      return res.status(404).json({ message: 'Club admin not found.' });
    }

    const updated = await setAdminActiveStatus(req.params.id, true);
    return res.status(200).json({ message: 'Club admin enabled.', admin: updated });

  } catch (error) {
    console.error('Enable club admin error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

module.exports = {
  createClubHandler,
  getClubs,
  getClubDetail,
  updateClubHandler,
  createClubAdmin,
  listClubAdmins,
  disableClubAdmin,
  enableClubAdmin,
};