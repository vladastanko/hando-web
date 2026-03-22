# Hando — Supabase Setup Instructions

## ⚠️ Step 1: Run SQL Migration (Required)

Go to **Supabase Dashboard → SQL Editor**, paste and run `supabase/005_fixes.sql`.

This fixes registration, map coordinates, RLS policies, and all RPCs.

---

## 📧 Step 2: Email Setup with Resend (Free)

Supabase's built-in email only works locally. For real email you need SMTP. **Resend** is free:

1. Sign up at **https://resend.com** (3000 emails/month free)
2. Create an API key at **https://resend.com/api-keys**
3. Go to **Supabase Dashboard → Project Settings → Authentication → SMTP Settings**
4. Enable **Custom SMTP** and fill in:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: *(your Resend API key)*
   - Sender email: `noreply@yourdomain.com`
   - Sender name: `Handoo`
5. Save

### For testing — disable email confirmation:
**Authentication → Providers → Email** → turn OFF **"Enable email confirmations"**

This lets you log in right after registering without clicking an email link.

---

## 📱 Phone Verification

Real SMS OTP requires Twilio. For MVP, the app saves the phone number directly (no OTP).

To enable real OTP later: Supabase → Authentication → Providers → Phone → add Twilio credentials.

---

## 🗺️ Map Not Showing Jobs?

After running `005_fixes.sql`, verify in SQL Editor:
```sql
SELECT id, title, ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng
FROM jobs LIMIT 5;
```
If lat/lng show real values, the map will work.

---

## 🧪 Full Test Flow

1. Register **User A** (employer) and **User B** (worker, use incognito)
2. User A: Post mode → post a job
3. User B: Find job on map → Apply
4. User A: My Jobs → View Applicants → Accept
5. User A: Mark Complete
6. Both rate each other
