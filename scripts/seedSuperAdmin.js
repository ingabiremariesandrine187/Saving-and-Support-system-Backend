require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool   = require('../config/db');

const seed = async () => {
  const email    = 'superadmin@footballfansupport.com';
  const password = 'SuperAdmin1234';

  // bcrypt hashes the password properly — no hardcoded hash
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users (first_name, last_name, email, phone_number, referral, password_hash, purpose, role, is_active)
     VALUES ('System', 'Owner', $1, '0700000001', 'RBA', $2, 'Supporting a Club', 'super_admin', TRUE)
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role          = 'super_admin',
           is_active     = TRUE
     RETURNING id, email, role, is_active`,
    [email, passwordHash]
  );

  if (result.rows[0]) {
    console.log('✅ Super admin ready:', result.rows[0]);
  } else {
    console.log('Super admin already exists and was updated.');
  }

  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed error:', err.message);
  process.exit(1);
});
