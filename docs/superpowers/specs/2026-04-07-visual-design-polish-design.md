# Visual Design Polish — Hando Web App

**Date:** 2026-04-07  
**Status:** Approved  
**Approach:** Typography + Motion System (Approach B)

---

## Goal

Unaprediti vizuelni kvalitet light-theme UI-a bez promene teme ili arhitekture. Fokus na tri stuba: tipografija, spacing konzistentnost, i motion sistem.

---

## 1. Typography System

### Problem
Trenutna skala koristi arbitrarne vrednosti (`1.0625rem`, `1.3125rem`, `0.6875rem`) bez jasne logike. Hijerarhija između naslova, section headera i body teksta nije čitljiva na prvi pogled. Letter-spacing na naslovima nedostaje.

### Rešenje — 8 veličina, named CSS tokeni

Dodati u `:root`:

```css
--text-xs:   0.6875rem;   /* 11px — uppercase labele, badges */
--text-sm:   0.8125rem;   /* 13px — meta info, secondary */
--text-base: 0.9375rem;   /* 15px — body text, opisi */
--text-md:   1.0625rem;   /* 17px — card naslovi, section headers */
--text-lg:   1.25rem;     /* 20px — page titles, ime profila */
--text-xl:   1.5rem;      /* 24px — auth headline accent */
--text-2xl:  1.875rem;    /* 30px — auth hero text */
--text-3xl:  2.375rem;    /* 38px — credit balance display */
```

### Line-height tokeni

```css
--lh-tight:   1.15;   /* display headings */
--lh-snug:    1.25;   /* card naslovi */
--lh-normal:  1.5;    /* body */
--lh-relaxed: 1.65;   /* opisi, dugačak tekst */
```

### Pravila primene
- Section headeri: `--text-lg`, `font-weight: 900`, `letter-spacing: -.025em`
- Card naslovi: `--text-md`, `font-weight: 800`, `letter-spacing: -.02em`, `line-height: var(--lh-snug)`
- Body / opisi: `--text-base`, `font-weight: 500`, `line-height: var(--lh-relaxed)`
- Meta tekst (km, sati, datum): `--text-sm`, `color: var(--tx-3)`, `font-weight: 600`
- Uppercase labele (stat chips, filter labels): `--text-xs`, `font-weight: 800`, `letter-spacing: .07em`
- Cene / brojevi (pay amount, stats): `font-weight: 900`, `letter-spacing: -.03em`

---

## 2. Spacing System

### Problem
Razmaci su ad-hoc: `padding: 20px 22px`, `gap: 13px`, `margin-bottom: 11px`. Nema grida — vrednosti se ne slažu vizuelno.

### Rešenje — 4px base grid

Dodati u `:root`:

```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
```

### Pravila primene
- **Card padding:** `var(--space-4)` (16px) — uniformno, umesto `20px 22px`
- **Card inner gap:** `var(--space-3)` (12px) — umesto `13px`
- **Grid/list gaps:** `var(--space-2)` (8px) između kartica
- **Section margin-bottom:** `var(--space-4)` (16px)
- **Page padding (`.pg`):** zadržati `clamp` ali zaokružiti na grid
- **Stats row gap:** `var(--space-2)` (8px) — umesto `10px`
- **Stat chip padding:** `var(--space-3)` (12px) — umesto `14px 18px`
- **Stat chip border-radius:** `var(--r-sm)` (12px) — manje komponente = manji radius
- **Modal/sheet body padding:** `var(--space-6)` (24px) — umesto `18px 22px`

---

## 3. Motion System

### Problem
Aplikacija je previše statična. Koristi se samo `transition: all 200ms ease` bez razlikovanja konteksta. Nema page entrance animacija, skeleton loading-a, niti spring micro-interactions.

### Rešenje — Motion tokeni + 6 animation patterns

#### CSS tokeni (dodati u `:root`)

```css
--ease-spring:  cubic-bezier(.22, 1, .36, 1);   /* hover, lift, entrance */
--ease-out:     cubic-bezier(.16, 1, .3, 1);    /* sheet open, dropdown */
--ease-in-out:  cubic-bezier(.4, 0, .2, 1);     /* tab switch, toggles */

--dur-fast:   100ms;   /* button active/press */
--dur-base:   200ms;   /* hover, color, border */
--dur-slow:   320ms;   /* card lift, tab slide, dropdown */
--dur-enter:  420ms;   /* stagger entrance, sheet open */
```

#### 6 animation patterns

**1. Button spring press**
```css
.btn {
  transition: transform var(--dur-base) var(--ease-spring),
              box-shadow var(--dur-base) var(--ease-spring);
}
.btn:hover  { transform: translateY(-2px) scale(1.02); }
.btn:active { transform: scale(.94); transition-duration: var(--dur-fast); }
```

**2. Card hover lift**
```css
.jcard {
  transition: transform var(--dur-slow) var(--ease-spring),
              border-color var(--dur-slow),
              box-shadow var(--dur-slow) var(--ease-spring);
}
.jcard:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(124,58,255,.15); }
```

**3. Card stagger entrance** (primenjuje se na `.jgrid` decu)
```css
@keyframes cardEnter {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.jcard {
  opacity: 0;
  animation: cardEnter var(--dur-enter) var(--ease-spring) forwards;
}
.jcard:nth-child(1) { animation-delay: 0ms; }
.jcard:nth-child(2) { animation-delay: 60ms; }
.jcard:nth-child(3) { animation-delay: 120ms; }
/* itd. do nth-child(8) — 480ms max */
```
Trigger: svaki put kada se `jobsList` promeni (key prop na grid-u).

**4. Tab/screen slide transition**
```css
@keyframes tabSlideIn {
  from { opacity: 0; transform: translateX(12px); }
  to   { opacity: 1; transform: translateX(0); }
}
.app-body > * { animation: tabSlideIn var(--dur-slow) var(--ease-spring); }
```
React: dodati `key={view}` na wrapper `<div>` u `<main>` da React re-mountuje element pri promeni ekrana.

**5. Skeleton loading state**
```css
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}
.skel {
  background: linear-gradient(90deg, var(--bg-sub) 25%, var(--bg-ov) 50%, var(--bg-sub) 75%);
  background-size: 800px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: var(--r-xs);
}
```
Prikazati skeleton kartice (2-3) dok `jobsLoading === true` umesto praznog stanja.

**6. Input focus ring**
```css
.inp, .sel, .txta {
  transition: border-color var(--dur-base),
              box-shadow var(--dur-base) var(--ease-out),
              background var(--dur-base);
  background: var(--bg-ov);
}
.inp:focus, .sel:focus, .txta:focus {
  background: var(--bg-el);
  border-color: var(--border-foc);
  box-shadow: 0 0 0 4px rgba(124,58,255,.12);
}
```

---

## 4. Scope

### In scope
- Izmene u `src/index.css` — novi tokeni, zamena hard-coded vrednosti
- Minimalna izmena u `src/App.tsx` — `key={view}` za screen transition
- Nova `SkeletonCard` komponenta u `src/components/ui/`
- Primena stagger CSS-a na `.jgrid` decu u `src/screens/HomeScreen.tsx`

### Out of scope
- Strukturne promene na komponentama
- Dark mode
- Nova ikonografija
- Framer Motion ili bilo koja JS animacijska biblioteka
- Izmene Supabase/backend logike

---

## 5. Implementation Notes

- Tokeni se dodaju u `:root` blok u `src/index.css` — ne brišu stare, samo dopunjuju
- Stare hard-coded vrednosti se postepeno zamenjuju token referencama
- `SkeletonCard` prihvata isti layout kao `.jcard` — zamenjuje card sadržaj sa `.skel` blokovima
- Stagger animacija funkcioniše bez JS-a — čisti CSS `nth-child` selektori
- `key={view}` u App.tsx je jedina React izmena potrebna za screen transition
