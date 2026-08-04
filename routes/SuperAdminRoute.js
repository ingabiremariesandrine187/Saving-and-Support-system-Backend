const express = require('express');
const router = express.Router();
const { protect, isSuperAdmin } = require('../Middleware/authMiddleware');
const {
  createClubHandler,
  getClubs,
  getClubDetail,
  updateClubHandler,
  createClubAdmin,
  listClubAdmins,
  disableClubAdmin,
  enableClubAdmin,
} = require('../Controllers/SuperAdminController');

// Every route here requires a valid JWT + super_admin role
router.use(protect, isSuperAdmin);

// Clubs
router.post('/clubs', createClubHandler);
router.get('/clubs', getClubs);
router.get('/clubs/:id', getClubDetail);
router.put('/clubs/:id', updateClubHandler);

// Club admins
router.post('/club-admins', createClubAdmin);
router.get('/club-admins', listClubAdmins);
router.put('/club-admins/:id/disable', disableClubAdmin);
router.put('/club-admins/:id/enable', enableClubAdmin);

module.exports = router;