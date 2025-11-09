const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createCheckoutSession, createPortalSession, handleWebhook } = require('../services/stripe');
const User = require('../models/User');
const Subscription = require('../models/Subscription');

// Create checkout session
exports.createCheckout = async (req, res) => {
  try {
    const { priceId } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const session = await createCheckoutSession(userId, priceId, user.email);

    res.json({ url: session.url });
  } catch (error) {
    console.error('Create checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

// Create customer portal session
exports.createPortal = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const session = await createPortalSession(user.stripeCustomerId);

    res.json({ url: session.url });
  } catch (error) {
    console.error('Create portal error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
};

// Get subscription status
exports.getSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).populate('subscription');

    if (!user.subscription) {
      return res.json({ subscription: null });
    }

    res.json({
      subscription: {
        plan: user.subscription.plan,
        status: user.subscription.status,
        currentPeriodEnd: user.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
      },
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
};

// Handle Stripe webhooks
exports.webhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Handle checkout completion
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata.userId;

      // Get subscription details
      const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);

      // Update user
      const user = await User.findById(userId);
      user.stripeCustomerId = session.customer;
      
      // Create or update subscription
      const subscription = await Subscription.create({
        userId,
        stripeSubscriptionId: stripeSubscription.id,
        plan: stripeSubscription.items.data[0].price.lookup_key || 'starter',
        status: stripeSubscription.status,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      });

      user.subscription = subscription._id;
      await user.save();
    }

    // Handle subscription updates
    if (event.type === 'customer.subscription.updated') {
      const stripeSubscription = event.data.object;

      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: stripeSubscription.id },
        {
          status: stripeSubscription.status,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        }
      );
    }

    // Handle subscription deletion
    if (event.type === 'customer.subscription.deleted') {
      const stripeSubscription = event.data.object;

      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: stripeSubscription.id },
        { status: 'canceled' }
      );
    }

    await handleWebhook(event);

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
};
```