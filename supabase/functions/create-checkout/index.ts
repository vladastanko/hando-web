// Supabase Edge Function: create-checkout
// Deploy with: supabase functions deploy create-checkout
// Set secret: supabase secrets set STRIPE_SECRET_KEY=sk_...

import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const { package_id, user_id, success_url, cancel_url } = await req.json();

  // Get package from Supabase
  const { createClient } = await import('npm:@supabase/supabase-js@2');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: pkg } = await supabase
    .from('credit_packages')
    .select('*')
    .eq('id', package_id)
    .single();

  if (!pkg) {
    return new Response(JSON.stringify({ error: 'Package not found' }), { status: 400 });
  }

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'rsd',
        unit_amount: pkg.price_rsd * 100, // Stripe uses smallest currency unit
        product_data: {
          name: `${pkg.credits} Handoo Credits`,
          description: `${pkg.credits} credits for posting and applying to jobs`,
        },
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${success_url}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url,
    metadata: {
      user_id,
      package_id,
      credits: String(pkg.credits),
    },
    client_reference_id: user_id,
  });

  // Record pending payment intent
  await supabase.from('payment_intents').insert({
    user_id,
    stripe_pi_id: session.payment_intent as string,
    package_id,
    amount_rsd: pkg.price_rsd,
    credits: pkg.credits,
    status: 'pending',
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
});
