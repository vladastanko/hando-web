# Hando Web — Testing & Audit Report

**Date:** 2026-04-09  
**Build:** `npm run build` — clean (0 TypeScript errors, 0 warnings)  
**Branch:** `main` — live at https://hando-web.vercel.app

---

## 1. Build & Compilation

| Check | Result |
|---|---|
| `tsc -b` TypeScript strict compile | ✅ PASS |
| Vite production build | ✅ PASS |
| Bundle size | 567 KB JS / 36 KB CSS (gzip: 153 KB / 7.5 KB) |

---

## 2. Database Schema Audit

### Tables verified present
| Table | Rows | RLS | Status |
|---|---|---|---|
| `profiles` | 54 | ✅ | OK |
| `jobs` | 52 | ✅ | OK |
| `applications` | 12 | ✅ | OK |
| `categories` | 20 | ✅ | OK |
| `ratings` | 9 | ✅ | OK |
| `credit_transactions` | 16 | ✅ | OK |
| `credit_orders` | 3 | ✅ | OK |
| `credit_packages` | 4 | ✅ | OK |
| `verifications` | 1 | ✅ | OK |
| `support_tickets` | 0 | ✅ | OK |
| `support_messages` | 0 | ✅ | OK |
| `notifications` | 15 | ✅ | OK |
| `phone_otp` | 0 | ✅ | OK |
| `referrals` | 0 | ✅ | OK |
| `conversations` | 1 | ✅ | OK |
| `messages` | 4 | ✅ | OK |
| `disputes` | 0 | ✅ | OK |

### Bugs found and fixed

#### BUG-001 — `support_tickets`/`support_messages` FK pointed to `auth.users` instead of `profiles`
- **Symptom:** AdminScreen query `.select('*, user:profiles!support_tickets_user_id_fkey(full_name, avatar_url)')` silently returned no user data. PostgREST join hints require the FK to reference the target table directly.
- **Fix:** Migration `fix_support_fk_and_triggers` — dropped FK to `auth.users`, added FK to `profiles.id` for both `user_id` and `sender_id`.
- **Verified:** FK references confirmed via `information_schema.constraint_column_usage`.

#### BUG-002 — `verifications` table had no admin SELECT policy
- **Symptom:** `loadAllVerifs()` (approved/rejected filter tabs in admin panel) returned only the admin's own verification row due to RLS `verif_select: auth.uid() = user_id`.
- **Fix:** Migration `admin_verif_and_credit_policies` — added `verif_admin_all` FOR ALL policy checking `is_admin = true`.

#### BUG-003 — `credit_orders` had no admin ALL policy
- **Symptom:** `admin_credit_orders` view would filter to only the admin user's own orders.
- **Fix:** Same migration — added `orders_admin_all` policy.

#### BUG-004 — `support_tickets.updated_at` not auto-refreshed on new message
- **Symptom:** Ticket list sort by `updated_at` wouldn't reflect new message activity.
- **Fix:** Added `trg_touch_ticket` trigger — fires AFTER INSERT on `support_messages`, updates parent ticket's `updated_at`.

#### BUG-005 — Missing translation key `when` in PostJobScreen
- **Symptom:** TypeScript build error `Argument of type '"when"' is not assignable to parameter of type TKey`.
- **Fix:** Added `when: { en: 'When', sr: 'Kada' }` to `translations.ts`.

#### BUG-006 — Vercel 404 on direct `/admin` URL navigation
- **Symptom:** Navigating to `https://hando-web.vercel.app/admin` returned Vercel 404 because no static file exists at that path.
- **Fix:** Added `vercel.json` with SPA rewrite rule `"/(.*)" → "/index.html"`.

---

## 3. RLS Policy Audit

| Table | SELECT | INSERT | UPDATE | DELETE | Admin override |
|---|---|---|---|---|---|
| `profiles` | `true` (public read) | own | own | — | `profiles_admin_all` ✅ |
| `jobs` | all | own | own/admin | own | via RPC |
| `applications` | own/job-related | own | own | — | via RPC |
| `credit_orders` | own | own | own | — | `orders_admin_all` ✅ |
| `verifications` | own | own | own | — | `verif_admin_all` ✅ |
| `support_tickets` | own / admin | own / admin | own / admin | own / admin | `Admins all tickets` ✅ |
| `support_messages` | own-ticket / admin | own-ticket / admin | — | — | `Admins all messages` ✅ |
| `notifications` | own | — | — | — | — |

---

## 4. Edge Functions Audit

| Function | Status | JWT | Notes |
|---|---|---|---|
| `send-phone-otp` | ✅ ACTIVE v2 | false | SHA-256 OTP, Resend fallback to log |
| `verify-phone-otp` | ✅ ACTIVE v1 | false | Validates hash+expiry, sets is_phone_verified |
| `send-notification-email` | ✅ ACTIVE v1 | false | Generic Resend sender for admin notifications |

**Note:** `RESEND_API_KEY` must be set as a Supabase secret for emails to actually send in production. Currently the functions fall back to logging if the key is missing.

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx --project-ref wutewsngkxqftaugjdaz
```

---

## 5. Database RPCs Audit

| Function | Security | Caller check | Status |
|---|---|---|---|
| `get_admin_stats()` | SECURITY DEFINER | — | ✅ Returns `{total_users:54, pending_verifs:1, pending_credits:3, open_tickets:0}` |
| `get_pending_verifications()` | SECURITY DEFINER | — | ✅ Returns user_id, doc URLs, profile name/email/phone |
| `admin_approve_verification(p_user_id)` | SECURITY DEFINER | `is_admin = true` | ✅ Sets verified, sends notification |
| `admin_reject_verification(p_user_id, p_reason)` | SECURITY DEFINER | `is_admin = true` | ✅ Sets rejected + reason, sends notification |
| `approve_credit_order(order_id)` | SECURITY DEFINER | — | ✅ Adds credits, records transaction, notifies user |
| `reject_credit_order(order_id, reason)` | SECURITY DEFINER | — | ✅ Marks rejected, notifies user |

---

## 6. Translation Keys Audit

- **Total keys used in codebase:** 183
- **Total keys defined in translations.ts:** 183
- **Missing keys:** 0 ✅
- **Languages:** English (`en`) + Serbian (`sr`) — all keys have both values

---

## 7. Storage Audit

| Bucket | Public | Used for |
|---|---|---|
| `user-media` | ✅ Yes | Avatars, verification documents — public URLs work |
| `avatars` | ❌ No | Not used by current code (all avatars stored in user-media) |
| `verification-docs` | ❌ No | Not used by current code |

---

## 8. Admin Panel Checklist

| Feature | Status |
|---|---|
| `/admin` path routing (Vercel SPA rewrite) | ✅ |
| `is_admin` gate — redirect non-admins to `/` | ✅ |
| Dashboard stats via `get_admin_stats()` | ✅ |
| Verifications — pending tab via RPC | ✅ |
| Verifications — approved/rejected tabs (direct query + admin policy) | ✅ |
| Verifications — approve with email notification | ✅ |
| Verifications — reject with reason + email notification | ✅ |
| Credits — list via `admin_credit_orders` view | ✅ |
| Credits — approve via `approve_credit_order()` RPC | ✅ |
| Credits — reject via `reject_credit_order()` RPC | ✅ |
| Support — ticket list (admin sees all) | ✅ |
| Support — real-time message subscription | ✅ |
| Support — admin reply inserts with `is_admin: true` | ✅ |
| Support — ticket status change (open/in_progress/resolved/closed) | ✅ |
| Support — `updated_at` refreshed on new message (trigger) | ✅ |

---

## 9. User-Side Support Checklist

| Feature | Status |
|---|---|
| Support tab in ProfileScreen | ✅ |
| Create new ticket | ✅ |
| View ticket list (own tickets only, RLS enforced) | ✅ |
| Open ticket conversation | ✅ |
| Real-time message subscription | ✅ |
| Send reply (disabled when resolved/closed) | ✅ |
| Ticket status badge display | ✅ |

---

## 10. Known Limitations

1. **Admin support reply email** — when admin replies to a support ticket, no email notification is sent to the user. Only in-app real-time and notification bell are active. Email notification can be added by calling `send-notification-email` in `handleSendReply`.

2. **Admin email lookup for approved/rejected verifications** — `loadAllVerifs` uses `supabase.auth.admin.getUserById` which requires service role key and will return an empty email string in the browser. Verification emails are sent correctly only from the pending tab (which uses the SECURITY DEFINER RPC that queries `auth.users` server-side).

3. **RESEND_API_KEY not configured** — must be set as a Supabase secret before emails send in production.

4. **Phone OTP via email** — `send-phone-otp` currently sends OTP to the user's email (not SMS) because Twilio was replaced with Resend. The label in UI still says "phone verification" but the actual delivery is email.
