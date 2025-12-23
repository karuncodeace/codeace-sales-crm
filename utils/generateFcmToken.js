import { GoogleAuth } from 'google-auth-library';

// Cache token for ~55 minutes so it isn't regenerated on every request
let cachedAccessToken = null;
let cachedExpiry = 0;

/**
 * Generates an FCM (Firebase Cloud Messaging) access token using Google Auth
 * @returns {Promise<string>} The access token
 */
export async function generateToken() {
  try {
    const now = Date.now();
    
    // Return cached token if still valid
    if (cachedAccessToken && now < cachedExpiry) {
      console.log("✅ Using cached FCM access token");
      return cachedAccessToken;
    }

    console.log("🔄 Generating new FCM access token...");

    // Get credentials from environment variable or fallback to file
    let credentials = null;
    
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        // Parse JSON from environment variable
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        console.log("✅ Using credentials from GOOGLE_SERVICE_ACCOUNT_JSON environment variable");
      } catch (error) {
        console.error("❌ Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:", error);
        throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON format");
      }
    } else {
      const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
      console.log(`📁 Using keyFile: ${keyFile}`);
    }

    const auth = new GoogleAuth({
      // Use credentials object if available, otherwise fallback to keyFile
      ...(credentials ? { credentials } : { keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json' }),
      scopes: ['https://www.googleapis.com/auth/firebase.messaging']
    });

    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();

    if (!tokenResponse || !tokenResponse.token) {
      console.error("❌ Token response is invalid:", tokenResponse);
      throw new Error("Failed to obtain FCM access token - token response is empty");
    }

    // Cache the token
    cachedAccessToken = tokenResponse.token;
    // Token is valid for 1h; refresh slightly earlier (55 minutes)
    cachedExpiry = now + 55 * 60 * 1000;

    console.log("\n==== FCM TOKEN GENERATED ====\n");
    console.log(tokenResponse.token);
    console.log("\n=============================\n");

    return tokenResponse.token;
  } catch (error) {
    console.error("❌ Error in generateToken():", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      hasCredentials: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
      hasKeyFile: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
    throw error;
  }
}

/**
 * Generates a payload for FCM notification with the access token
 * @param {Object} options - Payload options
 * @param {string} options.deviceToken - The user's FCM device token from database (goes in payload.message.token)
 * @param {Object} options.data - Data to include in the notification
 * @returns {Promise<Object>} Object containing:
 *   - payload: The FCM message payload (with user's fcm_token in payload.message.token)
 *   - accessToken: Generated access token (to be used in Authorization header as Bearer token)
 */
export async function generateFcmPayload({ deviceToken, data = {} }) {
  // Generate access token for Authorization header (Bearer token)
  const accessToken = await generateToken();

  // Create payload with user's fcm_token in the token field
  const payload = {
    message: {
      token: deviceToken, // User's fcm_token from sales_persons table
      data: {
        ...data,
        click_action: data.click_action || "FLUTTER_NOTIFICATION_CLICK",
      },
    },
  };

  return {
    payload, // Contains user's fcm_token in payload.message.token
    accessToken, // Generated token for Authorization header
  };
}

