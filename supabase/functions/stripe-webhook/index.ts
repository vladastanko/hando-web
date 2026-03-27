// Supabase Edge Function: stripe-webhook
// Deploy: supabase functions deploy stripe-webhook
// Set webhook secret: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-06-20' });
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve(async (req) => {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '');
  } catch {
    return new Response('Webhook signature invalid', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { user_id, credits } = session.metadata ?? {};
    if (user_id && credits) {
      // Add credits to user
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user_id)
        .single();
      
      if (profile) {
        const newBalance = profile.credits + parseInt(credits);
        await supabase.from('profiles').update({ credits: newBalance }).eq('id', user_id);
        await supabase.from('credit_transactions').insert({
          user_id,
          amount: parseInt(credits),
          type: 'purchase',
          description: `Purchased ${credits} credits via Stripe`,
          balance_after: newBalance,
        });

        // Update payment intent status
        await supabase
          .from('payment_intents')
          .update({ status: 'succeeded', updated_at: new Date().toISOString() })
          .eq('stripe_pi_id', session.payment_intent);
      }
    }
  }

  return new Response('OK', { status: 200 });
});
