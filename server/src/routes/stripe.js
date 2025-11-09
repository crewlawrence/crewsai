const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');
const { authenticate } = require('../middleware/auth');

// Protected routes
router.post('/create-checkout', authenticate, stripeController.createCheckout);
router.post('/create-portal', authenticate, stripeController.createPortal);
router.get('/subscription', authenticate, stripeController.getSubscription);

// Webhook route (not protected, Stripe verifies signature)
router.post('/webhook', express.raw({ type: 'application/json' }), stripeController.webhook);

module.exports = router;