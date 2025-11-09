const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createCheckoutSession(userId, priceId, email) {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/dashboard?success=true`,
      cancel_url: `${process.env.CLIENT_URL}/pricing?canceled=true`,
      customer_email: email,
      metadata: {
        userId: userId.toString(),
      },
    });

    return session;
  } catch (error) {
    console.error('Stripe Checkout Error:', error);
    throw new Error('Failed to create checkout session');
  }
}

async function createPortalSession(customerId) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.CLIENT_URL}/account`,
    });

    return session;
  } catch (error) {
    console.error('Stripe Portal Error:', error);
    throw new Error('Failed to create portal session');
  }
}

async function handleWebhook(event) {
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        // Handle successful subscription
        console.log('Checkout completed:', event.data.object);
        break;
      
      case 'customer.subscription.updated':
        // Handle subscription updates
        console.log('Subscription updated:', event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        // Handle subscription cancellation
        console.log('Subscription deleted:', event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Webhook Error:', error);
    throw error;
  }
}

module.exports = {
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
};