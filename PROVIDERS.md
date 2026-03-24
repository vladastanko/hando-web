# Email & Phone Provider Setup

## 📧 Email — Resend (besplatno, 5 min)

### 1. Napravi Resend nalog
- Idi na **https://resend.com** → Sign Up
- Besplatno: 3,000 emailova/mesec, 100/dan

### 2. API ključ
- Dashboard → API Keys → Create API Key
- Kopiraj ključ (prikazuje se samo jednom)

### 3. Domen (opciono za testiranje)
- Za testiranje možeš koristiti `onboarding@resend.dev` kao sender
- Za produkciju: Domains → Add Domain → verifikuj DNS

### 4. Poveži sa Supabase
Idi na: **Supabase Dashboard → Project Settings → Authentication → SMTP Settings**

```
Enable Custom SMTP: ✅ ON

Host:     smtp.resend.com
Port:     465
Username: resend
Password: re_xxxxxxxxxxxx   ← tvoj API ključ

Sender name:  Handoo
Sender email: onboarding@resend.dev   ← ili tvoj domen
```

Klikni **Save**.

### 5. Isključi email potvrdu za testiranje
**Authentication → Providers → Email**
- "Confirm email" → **OFF**

---

## 📱 Telefon — Twilio SMS OTP

### 1. Napravi Twilio nalog
- Idi na **https://twilio.com** → Sign Up
- Besplatno Trial: $15 kredita (dovoljno za ~1900 SMS)

### 2. Kupi broj
- Twilio Console → Phone Numbers → Buy a number
- Uzmi Serbian (+381) ili US broj

### 3. Uzmi kredencijale
Twilio Console → Account Info:
```
Account SID:  ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Auth Token:   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
Phone Numbers → tvoj broj (npr. +13015551234)

### 4. Poveži sa Supabase
**Supabase Dashboard → Authentication → Providers → Phone**

```
Enable Phone provider: ✅ ON
SMS Provider: Twilio

Account SID:  ACxxxxxxxx...
Auth Token:   xxxxxxxx...
Message Service SID ili From:  +13015551234
```

Klikni **Save**.

### 5. Uključi OTP u kodu
Kada povežeš Twilio, u `ProfileScreen.tsx` promeni `handlePhoneSave` da koristi pravi OTP flow umesto direktnog čuvanja.

---

## ✅ Testiranje

1. Registruj se sa emailom → proveri inbox (i spam folder)
2. Na Profile → Verification → Email → "Send link" → proveri inbox
3. Phone → "Add" → unesi broj → Supabase šalje SMS → unesi kod
