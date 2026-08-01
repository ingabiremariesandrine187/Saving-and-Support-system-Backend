const nodemailer = require('nodemailer');
require('dotenv').config();

// ─── Create the transporter once ─────────────────────────────────────────────
// The transporter is the connection to Gmail's SMTP server.
// It is created once when the module loads and reused for every email sent.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password — not your Gmail login password
  },
});

// ─── Verify transporter on startup ───────────────────────────────────────────
// This checks the email credentials are valid when the server starts.
// If they are wrong, you'll see the error immediately instead of at send time.
transporter.verify((error) => {
  if (error) {
    console.error('❌ Email transporter error:', error.message);
  } else {
    console.log('✅ Email service ready');
  }
});

// ─── Send OTP Email ───────────────────────────────────────────────────────────
/**
 * Sends a 6-digit OTP verification email to the user.
 *
 * @param {string} toEmail     - Recipient email address
 * @param {string} firstName   - Recipient's first name (used in greeting)
 * @param {string} otpCode     - The 6-digit OTP to send
 * @param {number} expiresInMinutes - How long the OTP is valid (from .env)
 */
const sendOTPEmail = async (toEmail, firstName, otpCode, expiresInMinutes) => {
  const mailOptions = {
    from:    `"Football Fan Support" <${process.env.EMAIL_USER}>`,
    to:      toEmail,
    subject: 'Your Verification Code – Football Fan Support',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #1a1a2e;">Football Fan Support</h2>
        <p>Hi <strong>${firstName}</strong>,</p>
        <p>Thank you for submitting your consent form. Please use the verification code below to confirm your contribution plan:</p>

        <div style="text-align: center; margin: 32px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #e94560;">
            ${otpCode}
          </span>
        </div>

        <p>This code is valid for <strong>${expiresInMinutes} minutes</strong>.</p>
        <p>If you did not submit a consent form, please ignore this email.</p>

        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e0e0e0;" />
        <p style="font-size: 12px; color: #888;">
          Football Fan Support System &bull; Do not reply to this email.
        </p>
      </div>
    `,
  };

  // nodemailer.sendMail returns a promise — await it so errors are caught by the caller
  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail };
