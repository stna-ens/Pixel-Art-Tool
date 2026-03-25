export async function onRequestPost(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    const { licenseKey } = await context.request.json();

    if (!licenseKey) {
      return new Response(JSON.stringify({ error: "License key is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get Supabase JWT from Authorization header
    const authHeader = context.request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    // Validate license key with LemonSqueezy
    const lsResponse = await fetch("https://api.lemonsqueezy.com/v1/licenses/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        license_key: licenseKey,
        instance_name: "pixy_web",
      }),
    });

    const lsData = await lsResponse.json();

    if (!lsData.activated && !lsData.error) {
      // Key might already be activated, try validate instead
      const validateResponse = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          license_key: licenseKey,
          instance_name: "pixy_web",
        }),
      });
      const validateData = await validateResponse.json();

      if (!validateData.valid) {
        return new Response(JSON.stringify({ error: "Invalid license key" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    } else if (lsData.error) {
      return new Response(JSON.stringify({ error: lsData.error }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // License is valid — get user ID from Supabase JWT
    const SUPABASE_URL = context.env.SUPABASE_URL || "https://oqmpeeziymhqkoeydhuq.supabase.co";
    const SUPABASE_SERVICE_KEY = context.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return new Response(JSON.stringify({ error: "Server misconfigured: missing Supabase env vars" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify the JWT and get user
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_SERVICE_KEY,
      },
    });

    if (!userResponse.ok) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const user = await userResponse.json();

    // Update profile to Pro using service role key (bypasses RLS)
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ is_pro: true }),
      }
    );

    if (!updateResponse.ok) {
      return new Response(JSON.stringify({ error: "Failed to activate Pro" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
