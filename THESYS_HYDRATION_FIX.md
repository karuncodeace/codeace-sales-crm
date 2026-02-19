# Thesys Hydration Fix

Date: 2026-02-17

Change performed:
- File modified: `app/ai-chat/page.jsx`
  - Replaced direct import of `C1Chat` with a dynamic client-only import:
    - Used `next/dynamic` with `{ ssr: false }` to render `C1Chat` only on the client.
  - Purpose: Prevent server/client markup mismatch caused by runtime-injected styles (portal UIDs) from the C1 UI, which led to React hydration errors.

Why this fixes the issue:
- The C1 UI injects runtime styles/variables that can differ between server and client render passes, causing hydration mismatches.
- Dynamically loading the component with `ssr: false` ensures no server-rendered markup for C1Chat is produced, avoiding the mismatch.

Notes:
- No functional change to the component behavior — it still mounts and connects to `/api/thesys` on the client.
- If you prefer client-only behavior while keeping the file as a client component, an alternative is to render C1Chat only after a client mount using useEffect. Dynamic import is the cleanest approach here.

