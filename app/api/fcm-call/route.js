import { generateToken, generateFcmPayload } from "../../../utils/generateFcmToken";
import { supabaseServer } from "../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../lib/crm/auth";

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

    // Get the logged-in user's FCM device token from sales_persons table
    const deviceToken = salesPerson.fcm_token;

    if (!deviceToken) {
      return Response.json(
        {
          error: "Missing fcm_token for current sales person",
        },
        { status: 500 }
      );
    }

    // Generate FCM access token (for Authorization header) using Google Auth
    console.log("🔄 Generating FCM access token for Authorization header...");
    let payload, accessToken;
    try {
      const result = await generateFcmPayload({
        deviceToken, // User's fcm_token from sales_persons table (goes in payload.message.token)
        data: {
          id: String(lead_id),
          phone: String(phone),
          name: String(name),
          email: String(email),
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      });
      payload = result.payload;
      accessToken = result.accessToken;
    } catch (tokenError) {
      console.error("❌ Error generating FCM token:", tokenError);
      return Response.json(
        {
          error: "Failed to generate FCM access token",
          details: tokenError.message,
        },
        { status: 500 }
      );
    }

    if (!accessToken) {
      console.error("❌ Access token is missing");
      return Response.json(
        {
          error: "Access token generation failed",
        },
        { status: 500 }
      );
    }

    if (!payload || !payload.message || !payload.message.token) {
      console.error("❌ Payload is invalid:", payload);
      return Response.json(
        {
          error: "Payload generation failed",
        },
        { status: 500 }
      );
    }

    console.log("📤 Sending FCM notification:", {
      authorizationToken: accessToken?.substring(0, 30) + "... (used in Authorization header)",
      userDeviceToken: deviceToken?.substring(0, 20) + "... (used in payload.message.token)",
      leadName: name,
      phone: phone,
      payload: {
        message: {
          token: payload.message.token?.substring(0, 20) + "... (user's fcm_token from database)",
          data: payload.message.data,
        },
      },
    });

    // Send FCM notification
    // - Generated accessToken goes in Authorization header (Bearer token)
    // - User's fcm_token (deviceToken) goes in payload.message.token field
    const fcmResponse = await fetch(
      "https://fcm.googleapis.com/v1/projects/crm-call-android/messages:send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`, // Generated token from Google Auth
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload), // Contains user's fcm_token in payload.message.token
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

