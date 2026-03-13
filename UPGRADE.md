# Hando — Frontend Redesign

## What changed

This is a **complete frontend redesign** of the Hando app. The Supabase backend,
all tables, RPCs, and auth logic are **100% preserved and compatible**.
Only the React frontend was upgraded.

---

## New structure

```
src/
  components/
    layout/       TopBar, BottomNav
    ui/           Avatar, Stars, Modal, Toast, StatusBadge
    jobs/         JobCard, FilterPanel, JobDetailModal
    map/          JobMap
  hooks/
    useToast.ts   Toast notifications
    useLocation.ts Geolocation + reverse geocode
  utils/
    format.ts     Date/time formatting helpers
    geocode.ts    Nominatim reverse geocoding
  screens/
    AuthScreen         Login / register / forgot password
    HomeScreen         Job discovery (list + map + split)
    PostJobScreen      Post a job (redesigned form)
    ApplicationsScreen My applications + posted jobs
    ProfileScreen      Profile, edit, ratings, verification
    CreditsScreen      Balance, packages, history
    InboxScreen        Job-scoped chat (requires 003_chat.sql)
  lib/
    supabase.ts   Unchanged from original (+ onAuthChange helper)
  types/
    index.ts      Unchanged from original
```

---

## How to deploy

### 1. Copy files into your existing project

Replace the entire `src/` directory **except `lib/supabase.ts` and `types/index.ts`**
(those are preserved as-is, with one small addition to `supabase.ts`).

### 2. Install dependencies

Your existing `package.json` already has all required deps. No new packages needed.

### 3. Environment variables

No changes. Your existing `.env.local` works as-is:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### 4. Optional: Enable Chat

If you want the Inbox/Chat feature:

```sql
-- Run in Supabase SQL editor:
\i supabase/003_chat.sql
```

This creates `conversations` and `messages` tables with proper RLS.
A trigger auto-creates a conversation when an employer accepts an applicant.

---

## Key UX improvements

| Area | Before | After |
|------|--------|-------|
| Auth | Basic form | Split-screen with hero, forgot password, validation |
| Mode switch | Not present | "Find work / Post work" toggle in top bar |
| Job discovery | Basic list + map | List + Map + Split views, real filter panel, category pills |
| Filters | None | Category, distance, rating, pay range, verified only, sort |
| Location display | Raw coordinates | Street name + city via Nominatim reverse geocode |
| Job cards | Oversized text | Compact, info-rich with poster rating + crew dots |
| Post job form | Single flat form | Sectioned form with numbered steps, 24h time |
| My jobs | Simple list | Tabs by status, applicant management modal |
| Profile | Raw UUID, coordinates | Clean sections, edit, ratings, verification upload |
| Credits | Not present | Full page with balance card, packages, history |
| Chat | Not present | Job-scoped inbox with real-time messages |
| Phone privacy | Not enforced | Phone only revealed after acceptance (backend enforced) |
| Top bar | Logout button visible | Profile dropdown with logout inside |
| Navigation | 4 basic tabs | Discover / My Jobs / Inbox / Profile |
| Responsive | Partial | Full mobile, tablet, desktop support |

---

## Notes

- **No raw UUIDs** are shown anywhere in the UI
- **Coordinates** never displayed to users; city + street name shown instead
- **Phone numbers** private by default; visible only after job acceptance (you can enforce this at the Supabase RLS level)
- All category icons and names are seeded via the existing `categories` table
- The app gracefully handles empty categories by showing a full static list in PostJobScreen
- Chat requires running `003_chat.sql` — without it, InboxScreen shows empty state gracefully
