const { findConsentByUserId }              = require('../models/Consent');
const { createPayment, getPaymentsByUserId } = require('../models/Payment');

// ─── POST /api/payments/contribute ───────────────────────────────────────────
// Protected — fan initiates a contribution based on their consent settings.
// Amount, club, and frequency are pulled from the consent record — not from
// the request body — so the fan cannot override their agreed terms.
const contribute = async (req, res) => {
  try {
    // 1. Get the logged-in user's id from the JWT
    const userId = req.user.userId;

    // 2. Load the fan's consent record
    const consent = await findConsentByUserId(userId);

    // 3. Fan must have a consent record before making a payment
    if (!consent) {
      return res.status(400).json({
        message: 'No consent record found. Please complete the consent form before making a contribution.',
      });
    }

    // 4. Consent must be agreed before any payment is allowed
    if (!consent.agreed) {
      return res.status(400).json({
        message: 'You must agree to the consent terms before making a contribution.',
      });
    }

    // 5. Create the payment record using consent data
    // Status defaults to 'pending' in the database
    // When Mobile Money is integrated later, this will be updated to 'completed' or 'failed'
    const payment = await createPayment({
      userId,
      clubId:           consent.club_id,
      amount:           consent.amount,
      paymentFrequency: consent.payment_frequency,
    });

    return res.status(201).json({
      message: 'Contribution initiated successfully. Status is pending until payment is processed.',
      payment: {
        id:               payment.id,
        clubId:           payment.club_id,
        amount:           payment.amount,
        paymentFrequency: payment.payment_frequency,
        status:           payment.status,
        createdAt:        payment.created_at,
      },
    });

  } catch (error) {
    console.error('Contribute error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// ─── GET /api/payments/history ────────────────────────────────────────────────
// Protected — returns the logged-in fan's full payment history.
const getPaymentHistory = async (req, res) => {
  try {
    // 1. Get the logged-in user's id from the JWT
    const userId = req.user.userId;

    // 2. Fetch all payments for this user (includes club name via JOIN)
    const payments = await getPaymentsByUserId(userId);

    // 3. Return empty array if no payments yet — not an error
    return res.status(200).json({
      count:    payments.length,
      payments,
    });

  } catch (error) {
    console.error('Payment history error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

module.exports = { contribute, getPaymentHistory };
