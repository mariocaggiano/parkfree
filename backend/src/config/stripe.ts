import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export const initializeStripe = (): Stripe => {
  if (stripeInstance) {
    return stripeInstance;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }

  stripeInstance = new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  });

  return stripeInstance;
};

export const getStripe = (): Stripe => {
  if (!stripeInstance) {
    return initializeStripe();
  }
  return stripeInstance;
};

export default initializeStripe;
