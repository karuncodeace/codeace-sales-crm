# API Testing Guide - Loria AI Query Endpoint

This guide shows how to test the `/api/loria-ai/query` endpoint with authentication.

## Authentication Methods

The endpoint supports **two authentication methods**:

1. **Cookie-based auth** (for web frontend) - Uses Supabase session cookies
2. **Bearer token auth** (for external API clients) - Uses `Authorization: Bearer <token>` header

**Note:** If both are provided, the Bearer token takes precedence.

## Method 1: Browser Console (Easiest - Recommended)

This method uses your existing browser session cookies automatically.

### Steps:

1. **Open your app in the browser** (e.g., `http://localhost:3000`)
2. **Log in** to your account
3. **Open Browser DevTools** (F12 or Right-click → Inspect)
4. **Go to Console tab**
5. **Run this code:**

```javascript
// Test the Loria AI endpoint
fetch('/api/loria-ai/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Important: includes cookies
  body: JSON.stringify({
    question: "How many leads do I have?"
  })
})
  .then(response => response.json())
  .then(data => console.log('Success:', data))
  .catch(error => console.error('Error:', error));
```

**Note:** The `credentials: 'include'` option automatically sends all cookies with the request.

---

## Method 2: Using cURL with Bearer Token (Recommended for External Tools)

### Step 1: Get Access Token

**Option A: From Browser Console (Easiest)**

1. **Open your app in browser** and log in
2. **Open DevTools** (F12) → **Console tab**
3. **Run this code:**

```javascript
// Get your access token
const { data: { session } } = await supabaseBrowser.auth.getSession();
console.log('Access Token:', session?.access_token);
```

Copy the access token.

**Option B: From Browser Storage**

1. **Open DevTools** → **Application/Storage** → **Local Storage**
2. **Look for Supabase keys** (they start with `sb-`)
3. **Find the session** and extract `access_token`

### Step 2: Use cURL with Bearer Token

```bash
curl -X POST http://localhost:3000/api/loria-ai/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "question": "How many leads do I have?"
  }'
```

**Replace `YOUR_ACCESS_TOKEN_HERE` with your actual access token.**

---

## Method 3: Using cURL with Cookies

### Step 1: Get Cookies from Browser

1. **Open your app in browser** and log in
2. **Open DevTools** (F12)
3. **Go to Application tab** (Chrome) or **Storage tab** (Firefox)
4. **Click on Cookies** → Select your domain
5. **Find Supabase cookies** (they start with `sb-`)

Look for cookies like:
- `sb-<project-ref>-auth-token`
- `sb-<project-ref>-auth-token-code-verifier`
- etc.

### Step 2: Copy Cookie String

Copy all the cookie values in this format:
```
sb-xxx-auth-token=value1; sb-xxx-auth-token-code-verifier=value2; ...
```

### Step 3: Use cURL

```bash
curl -X POST http://localhost:3000/api/loria-ai/query \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-xxx-auth-token=YOUR_TOKEN; sb-xxx-auth-token-code-verifier=YOUR_VERIFIER" \
  -d '{
    "question": "How many leads do I have?"
  }'
```

**Replace:**
- `YOUR_TOKEN` with actual token value
- `YOUR_VERIFIER` with actual verifier value
- Add all other `sb-*` cookies you found

---

## Method 4: Browser Extension (Copy as cURL)

### Steps:

1. **Open your app** and log in
2. **Open DevTools** → **Network tab**
3. **Make a request** from the app (e.g., navigate to dashboard)
4. **Right-click on any request** → **Copy** → **Copy as cURL**
5. **Modify the copied command** to test the Loria AI endpoint:

```bash
# The copied command will have all cookies included
# Just change the URL and body:

curl 'http://localhost:3000/api/loria-ai/query' \
  -X POST \
  -H 'Content-Type: application/json' \
  -H 'Cookie: [all your cookies will be here]' \
  --data-raw '{"question":"How many leads do I have?"}'
```

---

## Method 5: Postman / Insomnia with Bearer Token

### Step 1: Get Access Token

Use the browser console method from Method 2 to get your access token.

### Step 2: Setup Postman

1. **Create new POST request**
2. **URL:** `http://localhost:3000/api/loria-ai/query`
3. **Headers:**
   - `Content-Type: application/json`
   - `Authorization: Bearer YOUR_ACCESS_TOKEN_HERE`
4. **Body (raw JSON):**
```json
{
  "question": "How many leads do I have?"
}
```

### Step 3: Setup Insomnia

1. **Create new POST request**
2. **URL:** `http://localhost:3000/api/loria-ai/query`
3. **Headers:**
   - `Content-Type: application/json`
   - `Authorization: Bearer YOUR_ACCESS_TOKEN_HERE`
4. **Body (JSON):**
```json
{
  "question": "How many leads do I have?"
}
```

---

## Method 6: Postman / Insomnia with Cookies

### Step 1: Get Cookies

1. **Open your app** and log in
2. **Open DevTools** → **Application/Storage** → **Cookies**
3. **Copy all Supabase cookies** (sb-*)

### Step 2: Setup Postman

1. **Create new POST request**
2. **URL:** `http://localhost:3000/api/loria-ai/query`
3. **Headers:**
   - `Content-Type: application/json`
4. **Cookies tab:**
   - Add each cookie manually:
     - Name: `sb-xxx-auth-token`
     - Value: `[your token]`
     - Domain: `localhost`
   - Repeat for all `sb-*` cookies
5. **Body (raw JSON):**
```json
{
  "question": "How many leads do I have?"
}
```

### Step 3: Setup Insomnia

1. **Create new POST request**
2. **URL:** `http://localhost:3000/api/loria-ai/query`
3. **Headers:**
   - `Content-Type: application/json`
4. **Auth tab:**
   - Select **Cookie** type
   - Add cookies manually or import from browser
5. **Body (JSON):**
```json
{
  "question": "How many leads do I have?"
}
```

---

## Method 7: Quick Browser Script

Save this as a bookmarklet or run in console:

```javascript
// Quick test function
async function testLoriaAI(question) {
  try {
    const response = await fetch('/api/loria-ai/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ question })
    });
    
    const data = await response.json();
    
    if (data.answer) {
      console.log('✅ Answer:', data.answer);
      console.log('📊 Source:', data.source);
    } else if (data.error) {
      console.error('❌ Error:', data.error);
      console.error('💬 Message:', data.message);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

// Usage:
testLoriaAI("How many qualified leads do I have?");
testLoriaAI("Show me pending tasks");
testLoriaAI("How many meetings are scheduled this week?");
```

---

## Bruno / REST Client Setup

### Using Bearer Token (Recommended)

1. **Get your access token** (see Method 2)
2. **Create new request in Bruno**
3. **Method:** POST
4. **URL:** `http://localhost:3000/api/loria-ai/query`
5. **Headers:**
   ```
   Content-Type: application/json
   Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
   ```
6. **Body (JSON):**
   ```json
   {
     "question": "How many leads do I have?"
   }
   ```

---

## Common Issues & Solutions

### Issue: "Auth session missing!" or "not_authorized"

**Solution:** 
- Make sure you're logged in to the app first
- If using Bearer token, verify the token is valid and not expired
- Tokens expire after a period - get a fresh token if needed

### Issue: "Invalid or expired session"

**Solution:** 
- Get a fresh access token from the browser
- Tokens typically expire after 1 hour

### Issue: Cookies not being sent

**Solution:** 
- In browser console: Use `credentials: 'include'`
- In cURL: Include all `sb-*` cookies
- In Postman: Add cookies in Cookies tab

### Issue: "not_authorized" error

**Solution:** 
- Verify your user exists in the `users` table
- Check that your email matches between Supabase Auth and `users` table

### Issue: Cookies expired

**Solution:** 
- Log out and log back in
- Get fresh cookies from browser

---

## Example Test Questions

```javascript
// Test different metrics
testLoriaAI("How many leads do I have?");
testLoriaAI("How many qualified leads from last week?");
testLoriaAI("Show me pending tasks");
testLoriaAI("How many meetings are scheduled?");
testLoriaAI("What's my conversion probability?");
```

---

## Quick Reference

**Endpoint:** `POST /api/loria-ai/query`

**Request Body:**
```json
{
  "question": "Your question here"
}
```

**Success Response:**
```json
{
  "answer": "Natural language answer",
  "source": "crm_database" | "ai_conversation"
}
```

**Error Response:**
```json
{
  "error": "error_code",
  "message": "Human readable message"
}
```

---

## Pro Tip: Create a Test Script

Create a file `test-api.js`:

```javascript
// test-api.js
const questions = [
  "How many leads do I have?",
  "How many qualified leads?",
  "Show me pending tasks",
  "How many meetings scheduled this week?"
];

async function testAll() {
  for (const question of questions) {
    console.log(`\n📝 Testing: "${question}"`);
    const response = await fetch('http://localhost:3000/api/loria-ai/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ question })
    });
    const data = await response.json();
    console.log('Response:', data);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between requests
  }
}

testAll();
```

Run in browser console after logging in.

