# Thesys Runtime Stability Fixes

Date: 2026-02-17

Summary
- Made server-side Supabase auth resilient to transient network/TLS failures by adding defensive error handling in `app/api/thesys/route.js`.

What changed
- File modified: `app/api/thesys/route.js`
  - Wrapped `supabase.auth.getUser()` call in try/catch.
  - If the auth call fails (network/TLS issue), the endpoint returns a 502 JSON error: `{ error: "Upstream auth service unreachable" }` instead of throwing.

Why
- The development build was intermittently failing with "fetch failed" / ECONNRESET when contacting Supabase during request handling. This change prevents unhandled exceptions and makes the API return a clear upstream-unavailable response.

Recommendations
- Add retry/backoff for transient upstream calls if you want automatic retries.
- Keep network calls out of module top-level scope to avoid blocking compilation.
- Consider adding request timeouts or an AbortController wrapper for critical upstream calls.

