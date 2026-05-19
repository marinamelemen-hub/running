// netlify/functions/callback.js
// Receives Strava OAuth redirect, exchanges code for tokens, redirects back to app

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const { code, error, state } = params;
  const base = process.env.URL || 'https://marina-running.netlify.app';

  if (error) {
    return { statusCode: 302, headers: { Location: `${base}/?strava_error=${encodeURIComponent(error)}` } };
  }

  if (!code || !state) {
    return { statusCode: 302, headers: { Location: `${base}/?strava_error=missing_params` } };
  }

  try {
    const { cid, cs } = JSON.parse(Buffer.from(state, 'base64url').toString());

    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: cid, client_secret: cs, code, grant_type: 'authorization_code' }),
    });

    const data = await res.json();

    if (!data.access_token) {
      return { statusCode: 302, headers: { Location: `${base}/?strava_error=no_token` } };
    }

    // Pass tokens via URL hash (not sent to server, stays client-side)
    const frag = `at=${encodeURIComponent(data.access_token)}&rt=${encodeURIComponent(data.refresh_token)}&exp=${data.expires_at}&cid=${encodeURIComponent(cid)}&cs=${encodeURIComponent(cs)}`;
    return { statusCode: 302, headers: { Location: `${base}/#${frag}` } };

  } catch (err) {
    return { statusCode: 302, headers: { Location: `${base}/?strava_error=${encodeURIComponent(err.message)}` } };
  }
};
