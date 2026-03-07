// Cloudflare Pages Function: handles newsletter signups via Brevo API
// POST /api/subscribe { email, source }
// The Brevo API key is stored as an environment variable — never exposed to the browser.

export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://gevias.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await context.request.json();
    const { email, source } = body;

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Valid email required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get Brevo API key from environment variable
    const apiKey = context.env.BREVO_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Add contact to Brevo list #3 (Gevias — All Subscribers)
    const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        listIds: [3],
        attributes: {
          SOURCE: source || 'website',
        },
        updateEnabled: true, // Update existing contact instead of erroring
      }),
    });

    if (brevoResponse.ok || brevoResponse.status === 201 || brevoResponse.status === 204) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Handle "contact already exists" as success
    const brevoData = await brevoResponse.json().catch(() => ({}));
    if (brevoData.code === 'duplicate_parameter') {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: 'Subscription failed. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://gevias.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
