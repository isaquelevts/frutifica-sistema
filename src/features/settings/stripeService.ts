import { loadStripe } from '@stripe/stripe-js';
import { updateOrganizationPlan } from './organizationService';
import { PlanType } from '../../shared/types/types';

// NOTE: Since this is a demo environment without a real backend, 
// we will simulate the payment process on the client side.
// In a real app, you would use a publishable key from process.env.
const STRIPE_PUBLIC_KEY = 'pk_test_placeholder';

export const PLANS = {
  FREE: {
    id: 'price_free',
    name: 'Gratuito',
    price: 0,
    features: ['Até 3 Células', 'Relatórios Básicos', '1 Admin'],
    type: 'free' as PlanType
  },
  PRO: {
    id: 'price_pro',
    name: 'Crescimento',
    price: 49.90,
    features: ['Até 20 Células', 'IA Insights', 'Consolidação', 'Suporte Prioritário'],
    type: 'pro' as PlanType
  },
  ENTERPRISE: {
    id: 'price_enterprise',
    name: 'Expansão',
    price: 99.90,
    features: ['Células Ilimitadas', 'Múltiplas Redes', 'IA Avançada', 'Gestor Dedicado'],
    type: 'enterprise' as PlanType
  }
};

export const checkout = async (planType: PlanType, organizationId: string) => {
  // In a real application, you would call your backend here to create a Stripe Checkout Session
  // const response = await fetch('/api/create-checkout-session', { ... });
  // const session = await response.json();
  // const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
  // stripe?.redirectToCheckout({ sessionId: session.id });

  // --- MOCK SIMULATION FOR DEMO ---
  console.log(`Starting checkout for plan: ${planType} for org: ${organizationId}`);

  return new Promise<{ success: boolean, url: string }>((resolve) => {
    setTimeout(() => {
      // Simulate successful payment logic
      // In a real app, this update happens via Webhook from Stripe to your Backend
      updateOrganizationPlan(organizationId, planType);

      resolve({
        success: true,
        url: `/#/payment-success?plan=${planType}`
      });
    }, 1500);
  });
};
