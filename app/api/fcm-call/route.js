import { GoogleAuth } from "google-auth-library";
import { supabaseServer } from "../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../lib/crm/auth";

// Cache token for ~55 minutes so it isn't regenerated on every request
let cachedAccessToken = null;
let cachedExpiry = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedAccessToken && now < cachedExpiry) {
    return cachedAccessToken;
  }

  // Get credentials from environment variable or fallback to file
  let credentials = null;
  
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      // Parse JSON from environment variable
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (error) {
      console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:", error);
      throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON format");
    }
  }

  const auth = new GoogleAuth({
    // Use credentials object if available, otherwise fallback to keyFile
    ...(credentials ? { credentials } : { keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || "service-account.json" }),
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();

  if (!tokenResponse || !tokenResponse.token) {
    throw new Error("Failed to obtain FCM access token");
  }

  cachedAccessToken = tokenResponse.token;
  // Token is valid for 1h; refresh slightly earlier (55 minutes).
  cachedExpiry = now + 55 * 60 * 1000;

  return cachedAccessToken;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { lead_id, phone, name, email } = body || {};

    if (!lead_id || !phone || !name || !email) {
      return Response.json(
        { error: "lead_id, phone, name and email are required" },
        { status: 400 }
      );
    }

    // Get current CRM user (sales person) and their FCM token
    const crmUser = await getCrmUser();

    if (!crmUser) {
      return Response.json(
        { error: "Not authorized for CRM" },
        { status: 403 }
      );
    }

    const supabase = await supabaseServer();

    // Use salesPersonId if available (already fetched in getCrmUser), otherwise query by user_id
    let salesPerson = null;
    let salesPersonError = null;

    if (crmUser.salesPersonId) {
      // Direct lookup using sales_persons.id
      const result = await supabase
        .from("sales_persons")
        .select("id, fcm_token")
        .eq("id", crmUser.salesPersonId)
        .single();
      salesPerson = result.data;
      salesPersonError = result.error;
    } else {
      // Fallback: query by user_id (users.id -> sales_persons.user_id)
      const result = await supabase
        .from("sales_persons")
        .select("id, fcm_token")
        .eq("user_id", crmUser.id)
        .single();
      salesPerson = result.data;
      salesPersonError = result.error;
    }

    if (salesPersonError || !salesPerson) {
      console.error("Error fetching sales person FCM token:", salesPersonError, {
        crmUserId: crmUser.id,
        salesPersonId: crmUser.salesPersonId,
        role: crmUser.role
      });
      return Response.json(
        { error: "Unable to find sales person or FCM token. Please ensure you have a sales person profile set up." },
        { status: 500 }
      );
    }

    const deviceToken = salesPerson.fcm_token;

    if (!deviceToken) {
      return Response.json(
        {
          error: "Missing fcm_token for current sales person",
        },
        { status: 500 }
      );
    }

    const accessToken = await getAccessToken();

    // Payload format that matches the working curl example
    const payload = {
      message: {
        token: deviceToken,
        data: {
          id: String(lead_id),
          phone: String(phone),
          name: String(name),
          email: String(email),
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
    };

    console.log("📤 Sending FCM notification:", {
      token: deviceToken?.substring(0, 20) + "...",
      leadName: name,
      phone: phone,
      payloadKeys: Object.keys(payload.message),
    });

    const fcmResponse = await fetch(
      "https://fcm.googleapis.com/v1/projects/crm-call-android/messages:send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const fcmJson = await fcmResponse.json().catch(() => null);

    if (!fcmResponse.ok) {
      console.error("❌ FCM send error:", fcmResponse.status, fcmJson);
      return Response.json(
        {
          error: "Failed to send FCM message",
          details: fcmJson || null,
        },
        { status: fcmResponse.status }
      );
    }

    console.log("✅ FCM notification sent successfully:", {
      messageId: fcmJson?.name,
      success: fcmJson?.name ? true : false,
    });

    return Response.json({
      success: true,
      fcmResponse: fcmJson,
      messageId: fcmJson?.name,
    });
  } catch (error) {
    console.error("Error in /api/fcm-call:", error);
    return Response.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

