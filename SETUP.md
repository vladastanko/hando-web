# Hando — Supabase Setup & Fix Instructions

## 🔴 Critical: Run This First

Go to your **Supabase Dashboard → SQL Editor** and run:

```
supabase/005_fixes.sql
```

This fixes:
- ✅ "Database error saving new user" — adds profile auto-create trigger
- ✅ Jobs not showing on map — adds lat/lng columns and fixes RPC
- ✅ Verifications RLS error — recreates policies with upsert support
- ✅ Credits "Profile not found" — fixes purchase function
- ✅ All RLS policies for jobs, applications, ratings

---

## 📧 Disable Email Confirmation (for testing)

So you can register and log in immediately without confirming email:

1. Go to **Supabase Dashboard → Authentication → Providers → Email**
2. Turn **OFF** "Enable email confirmations"
3. Save

This lets you test the full data flow without email setup.

---

## 📱 Phone Verification (optional)

For real phone OTP you need a Twilio account:

1. Go to **Supabase Dashboard → Authentication → Providers → Phone**
2. Enable Phone provider
3. Enter your Twilio credentials (Account SID, Auth Token, Message Service SID)

Without Twilio, the phone verify button will show an error — that's expected.

---

## 🗺 Map: Jobs Not Showing

Jobs show on the map only if they have `lat` and `lng` values in the database.

If you're using the seed data from `004_seed_data.sql`, make sure the seed jobs have lat/lng populated. The `005_fixes.sql` migration adds these columns if missing.

When you post a new job through the app, it will automatically use your current GPS location.

---

## 💳 Credits

New users start with **20 free credits**:
- Posting a job costs **10 credits**
- Applying to a job costs **3 credits**

To buy more credits, go to the Credits screen. For MVP testing, packages are simulated (no real payment).

---

## 🧪 Full Testing Flow

1. Register User A (employer)
2. Register User B (worker) — use a different browser or incognito
3. As User A: post a job (costs 10 credits)
4. As User B: find the job on map or list, apply (costs 3 credits)
5. As User A: go to My Jobs → Posted Jobs → View Applicants → Accept
6. As User B: check My Applications — status should update to "Accepted"
7. As User A: mark job Complete when done
8. Both users can then rate each other
