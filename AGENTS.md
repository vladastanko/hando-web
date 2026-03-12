# AGENTS.md

## Project goals
- Keep the existing Supabase backend logic intact.
- Preserve auth, credits, job posting, and jobs listing behavior.
- Recreate the visual style from the prototype `index.html`.
- Refactor the app into reusable React components.

## Tech constraints
- Vite + React + TypeScript
- Do not switch frameworks
- Keep environment variables as VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Do not remove current Supabase integration

## Coding rules
- Small, safe changes
- Keep components readable
- Prefer reusable components over large monolithic files
- Ensure the app still builds with `npm run build`

## UX goals
- Mobile-first dark UI
- Bottom navigation
- Top bar with credits and user info
- Home, Post Job, My Jobs, Profile tabs
- Reuse the style and layout patterns from `index.html`
