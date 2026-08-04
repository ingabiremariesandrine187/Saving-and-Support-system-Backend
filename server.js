const express = require('express');
const cors    = require('cors');
require('dotenv').config();

// Import routes
const authRoutes       = require('./routes/authRoutes');
const consentRoutes    = require('./routes/consentRoute');
const paymentRoutes    = require('./routes/paymentRoutes');
const adminRoutes      = require('./routes/adminRoutes');
const superAdminRoutes = require('./routes/SuperAdminRoute');
const clubAdminRoutes  = require('./routes/clubAdminRoutes');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────

// Parse incoming JSON request bodies (req.body)
app.use(express.json());

// Allow requests from your frontend (cross-origin)
app.use(cors());

// ─── Routes ──────────────────────────────────────────────────────────────────

// All auth routes are prefixed with /api/auth
// e.g. POST /api/auth/register
app.use('/api/auth', authRoutes);

// All consent routes are prefixed with /api/consent
// e.g. GET /api/consent/clubs, POST /api/consent/submit
app.use('/api/consent', consentRoutes);

// All payment routes are prefixed with /api/payments
// e.g. POST /api/payments/contribute, GET /api/payments/history
app.use('/api/payments', paymentRoutes);

// All admin routes are prefixed with /api/admin
// e.g. GET /api/admin/users
app.use('/api/admin', adminRoutes);

// All super-admin routes are prefixed with /api/super-admin
// e.g. POST /api/super-admin/clubs, POST /api/super-admin/club-admins
app.use('/api/super-admin', superAdminRoutes);

// All club-admin routes are prefixed with /api/club-admin
// e.g. GET /api/club-admin/dashboard, GET /api/club-admin/fans
app.use('/api/club-admin', clubAdminRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────

// Simple route to confirm the server is running
app.get('/', (req, res) => {
  res.json({ message: 'Football Fan Support API is running.' });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────

// Catch any request that doesn't match a defined route
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});
// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
