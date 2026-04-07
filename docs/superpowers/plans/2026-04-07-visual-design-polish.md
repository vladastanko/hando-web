# Visual Design Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unaprediti vizuelni kvalitet Hando web app-a dodavanjem tipografske skale, 8px spacing sistema i CSS motion sistema bez promena arhitekture ili dark modea.

**Architecture:** Sve promene su u `src/index.css` (novi CSS tokeni + zamena hard-coded vrednosti) i minimalnim React promenama za stagger animacije, skeleton loading i screen transitions. Bez novih zavisnosti.

**Tech Stack:** CSS custom properties, React 18, TypeScript — nema novih npm paketa.

---

## File Map

| File | Akcija | Šta se menja |
|------|--------|--------------|
| `src/index.css` | Modify | Dodati tokeni u `:root`, update tipografskih i spacing klasa, motion sistem |
| `src/components/jobs/JobCard.tsx` | Modify | Dodati `animationDelay?: number` prop, primeniti `.jcard-enter` klasu |
| `src/components/ui/SkeletonCard.tsx` | Create | Nova komponenta — skeleton placeholder koji prati `.jcard` layout |
| `src/screens/HomeScreen.tsx` | Modify | Koristiti `SkeletonCard` za loading state, proslediti `animationDelay` svakom `JobCard` |
| `src/App.tsx` | Modify | Dodati `.view-enter` wrapper oko svake kondicionalno renderedovane scene |

---

## Task 1: Dodati design tokene u `:root`

**Files:**
- Modify: `src/index.css` (`:root` blok, posle linije `--nbh: 76px;`)

- [ ] **Step 1: Dodati typography, spacing i motion tokene u `:root`**

Pronađi `--nbh: 76px;` u `:root` bloku i odmah posle dodaj:

```css
  /* ─── TYPOGRAPHY SCALE ───────────────────────────── */
  --text-xs:   0.6875rem;
  --text-sm:   0.8125rem;
  --text-base: 0.9375rem;
  --text-md:   1.0625rem;
  --text-lg:   1.25rem;
  --text-xl:   1.5rem;
  --text-2xl:  1.875rem;
  --text-3xl:  2.375rem;

  --lh-tight:   1.15;
  --lh-snug:    1.25;
  --lh-normal:  1.5;
  --lh-relaxed: 1.65;

  /* ─── SPACING SCALE (4px grid) ───────────────────── */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;

  /* ─── MOTION TOKENS ──────────────────────────────── */
  --ease-spring:  cubic-bezier(.22, 1, .36, 1);
  --ease-out:     cubic-bezier(.16, 1, .3, 1);
  --ease-in-out:  cubic-bezier(.4, 0, .2, 1);
  --dur-fast:  100ms;
  --dur-base:  200ms;
  --dur-slow:  320ms;
  --dur-enter: 420ms;
```

- [ ] **Step 2: Vizuelna verifikacija**

Pokreni `npm run dev`. Otvori DevTools → Elements → `:root`. Proveri da su novi custom properties vidljivi (npr. `--text-md`, `--space-4`, `--ease-spring`). Aplikacija treba da izgleda identično kao pre.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "style: add typography, spacing, and motion tokens to :root"
```

---

## Task 2: Primena tipografskih tokena na CSS klase

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Ažurirati section header i stats**

Pronađi i zameni sledeće klase (exact match, jedan po jedan):

```css
/* ZAMENI .sec-ttl */
.sec-ttl{font-size:1.0625rem;font-weight:800;letter-spacing:-.015em;font-family:'Nunito',sans-serif}
```
→
```css
.sec-ttl{font-size:var(--text-lg);font-weight:900;letter-spacing:-.025em;font-family:'Nunito',sans-serif}
```

```css
/* ZAMENI .stat-v */
.stat-v{font-size:1.25rem;font-weight:900;letter-spacing:-.025em;font-family:'Nunito',sans-serif}
```
→
```css
.stat-v{font-size:var(--text-lg);font-weight:900;letter-spacing:-.035em;font-family:'Nunito',sans-serif}
```

```css
/* ZAMENI .stat-lb */
.stat-lb{font-size:.6875rem;color:var(--tx-2);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-top:1px;font-family:'Nunito',sans-serif}
```
→
```css
.stat-lb{font-size:var(--text-xs);color:var(--tx-3);font-weight:800;text-transform:uppercase;letter-spacing:.07em;margin-top:1px;font-family:'Nunito',sans-serif}
```

- [ ] **Step 2: Ažurirati job card tipografiju**

```css
/* ZAMENI .jcard-title */
.jcard-title{
  font-size:1rem;font-weight:800;line-height:1.3;letter-spacing:-.015em;
  font-family:'Nunito',sans-serif;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
}
```
→
```css
.jcard-title{
  font-size:var(--text-md);font-weight:800;line-height:var(--lh-snug);letter-spacing:-.02em;
  font-family:'Nunito',sans-serif;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
}
```

```css
/* ZAMENI .jcard-desc */
.jcard-desc{
  font-size:.8125rem;color:var(--tx-2);line-height:1.6;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
}
```
→
```css
.jcard-desc{
  font-size:var(--text-base);color:var(--tx-2);line-height:var(--lh-relaxed);
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
}
```

```css
/* ZAMENI .jmeta */
.jmeta{display:flex;align-items:center;gap:4px;font-size:.8125rem;color:var(--tx-2);font-weight:600}
```
→
```css
.jmeta{display:flex;align-items:center;gap:4px;font-size:var(--text-sm);color:var(--tx-3);font-weight:600}
```

```css
/* ZAMENI .jpay-amt */
.jpay-amt{
  font-size:1.25rem;font-weight:900;letter-spacing:-.02em;
  font-family:'Nunito',sans-serif;
  background:var(--brand-grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
```
→
```css
.jpay-amt{
  font-size:var(--text-lg);font-weight:900;letter-spacing:-.03em;
  font-family:'Nunito',sans-serif;
  background:var(--brand-grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
```

- [ ] **Step 3: Ažurirati profile i sheet header tipografiju**

```css
/* ZAMENI .prof-n */
.prof-n{font-size:1.3125rem;font-weight:900;letter-spacing:-.025em;font-family:'Nunito',sans-serif}
```
→
```css
.prof-n{font-size:var(--text-xl);font-weight:900;letter-spacing:-.025em;font-family:'Nunito',sans-serif}
```

```css
/* ZAMENI .sh-ttl */
.sh-ttl{font-size:1.0625rem;font-weight:800;letter-spacing:-.015em;font-family:'Nunito',sans-serif}
```
→
```css
.sh-ttl{font-size:var(--text-md);font-weight:800;letter-spacing:-.02em;font-family:'Nunito',sans-serif}
```

```css
/* ZAMENI .pstat-v */
.pstat-v{font-size:1.5rem;font-weight:900;letter-spacing:-.03em;font-family:'Nunito',sans-serif}
```
→
```css
.pstat-v{font-size:var(--text-xl);font-weight:900;letter-spacing:-.035em;font-family:'Nunito',sans-serif}
```

```css
/* ZAMENI .cbal-amt */
.cbal-amt{font-size:3.5rem;font-weight:900;letter-spacing:-.05em;color:#fff;position:relative;font-family:'Nunito',sans-serif}
```
→
```css
.cbal-amt{font-size:var(--text-3xl);font-weight:900;letter-spacing:-.05em;color:#fff;position:relative;font-family:'Nunito',sans-serif}
```

- [ ] **Step 4: Vizuelna verifikacija**

Otvori app u browseru. Proveri:
- Home screen: stat chips imaju veće, bolje razmaknutejte vrednosti
- Job kartice: naslov je nešto veći, meta info tamniji (tx-3)
- Profile screen: ime profila izgleda veće i preciznije

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "style: apply typography scale tokens to CSS classes"
```

---

## Task 3: Primena spacing tokena na CSS klase

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Ažurirati job card spacing**

```css
/* ZAMENI .jcard */
.jcard{
  background:var(--bg-el);border:1.5px solid var(--border);border-radius:var(--r-lg);
  padding:20px 22px;cursor:pointer;transition:all var(--t);
  display:flex;flex-direction:column;gap:13px;position:relative;overflow:hidden;
  box-shadow:var(--sh-card);
}
```
→
```css
.jcard{
  background:var(--bg-el);border:1.5px solid var(--border);border-radius:var(--r-lg);
  padding:var(--space-4);cursor:pointer;transition:all var(--t);
  display:flex;flex-direction:column;gap:var(--space-3);position:relative;overflow:hidden;
  box-shadow:var(--sh-card);
}
```

```css
/* ZAMENI .jcard-foot */
.jcard-foot{display:flex;justify-content:space-between;align-items:center;padding-top:13px;border-top:1.5px solid var(--border)}
```
→
```css
.jcard-foot{display:flex;justify-content:space-between;align-items:center;padding-top:var(--space-3);border-top:1.5px solid var(--border)}
```

```css
/* ZAMENI .jgrid */
.jgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
```
→
```css
.jgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--space-2)}
```

- [ ] **Step 2: Ažurirati stats row i stat chips**

```css
/* ZAMENI .stats-row */
.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:2px 1px}
```
→
```css
.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-2);padding:2px 1px}
```

```css
/* ZAMENI .stat-ch */
.stat-ch{
  display:flex;align-items:center;gap:10px;padding:14px 18px;
  background:var(--bg-el);border:1.5px solid var(--border);border-radius:var(--r-lg);
  white-space:nowrap;flex-shrink:0;transition:all var(--t);box-shadow:var(--sh-card);
}
```
→
```css
.stat-ch{
  display:flex;align-items:center;gap:var(--space-2);padding:var(--space-3);
  background:var(--bg-el);border:1.5px solid var(--border);border-radius:var(--r-sm);
  white-space:nowrap;flex-shrink:0;transition:all var(--t);box-shadow:var(--sh-card);
}
```

- [ ] **Step 3: Ažurirati sheet/modal spacing**

```css
/* ZAMENI .sh-hdr */
.sh-hdr{display:flex;align-items:center;justify-content:space-between;padding:18px 22px 14px;border-bottom:1.5px solid var(--border)}
```
→
```css
.sh-hdr{display:flex;align-items:center;justify-content:space-between;padding:var(--space-4) var(--space-6) var(--space-3);border-bottom:1.5px solid var(--border)}
```

```css
/* ZAMENI .sh-body */
.sh-body{padding:18px 22px;display:flex;flex-direction:column;gap:18px}
```
→
```css
.sh-body{padding:var(--space-6);display:flex;flex-direction:column;gap:var(--space-4)}
```

```css
/* ZAMENI .sh-foot */
.sh-foot{padding:14px 22px;border-top:1.5px solid var(--border);display:flex;flex-direction:column;gap:9px}
```
→
```css
.sh-foot{padding:var(--space-3) var(--space-6);border-top:1.5px solid var(--border);display:flex;flex-direction:column;gap:var(--space-3)}
```

- [ ] **Step 4: Vizuelna verifikacija**

Otvori app. Proveri:
- Stat chips su kompaktniji (12px padding) sa manjim border-radius (12px umesto 16px)
- Job kartice imaju uniforman 16px padding
- Modali (npr. otvori job detalj) imaju bolji ritam

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "style: apply spacing scale tokens to CSS classes"
```

---

## Task 4: Motion sistem — tokeni i animacije

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Dodati keyframe animacije**

Na kraj sekcije `/* MISC */` (posle `.spin` keyframe-a), dodaj:

```css
/* ─── ANIMATION KEYFRAMES ────────────────────────── */
@keyframes cardEnter {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes viewEnter {
  from { opacity: 0; transform: translateX(10px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}

/* ─── ANIMATION UTILITY CLASSES ──────────────────── */
.view-enter {
  animation: viewEnter var(--dur-slow) var(--ease-spring);
}
.jcard-enter {
  opacity: 0;
  animation: cardEnter var(--dur-enter) var(--ease-spring) forwards;
}
.skel {
  background: linear-gradient(90deg, var(--bg-sub) 25%, var(--bg-ov) 50%, var(--bg-sub) 75%);
  background-size: 800px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: var(--r-xs);
  flex-shrink: 0;
}
```

- [ ] **Step 2: Ažurirati `.jcard` hover transition na spring**

Pronađi `.jcard:hover` i zameni ga:

```css
/* ZAMENI .jcard:hover */
.jcard:hover{border-color:rgba(124,58,255,.28);box-shadow:0 8px 40px rgba(124,58,255,.13);transform:translateY(-3px)}
```
→
```css
.jcard:hover{border-color:rgba(124,58,255,.28);box-shadow:0 12px 40px rgba(124,58,255,.15);transform:translateY(-4px)}
```

Zameni `transition:all var(--t)` unutar `.jcard` pravila:
```css
/* u .jcard pravilu zameni */
transition:all var(--t);
```
→
```css
transition:transform var(--dur-slow) var(--ease-spring),
           border-color var(--dur-slow),
           box-shadow var(--dur-slow) var(--ease-spring);
```

- [ ] **Step 3: Ažurirati `.btn-p` spring press**

Pronađi i zameni `.btn-p` grupu:

```css
/* ZAMENI .btn-p, .btn-p:hover, .btn-p:active */
.btn-p{background:var(--brand-grad);color:#fff;box-shadow:0 4px 20px rgba(124,58,255,.3)}
.btn-p:hover{box-shadow:0 6px 28px rgba(124,58,255,.5);transform:translateY(-1px)}
.btn-p:active{transform:translateY(0)}
```
→
```css
.btn-p{
  background:var(--brand-grad);color:#fff;box-shadow:0 4px 20px rgba(124,58,255,.3);
  transition:transform var(--dur-base) var(--ease-spring),
             box-shadow var(--dur-base) var(--ease-spring);
}
.btn-p:hover{box-shadow:0 8px 28px rgba(124,58,255,.5);transform:translateY(-2px) scale(1.01)}
.btn-p:active{transform:scale(.95);transition-duration:var(--dur-fast)}
```

- [ ] **Step 4: Ažurirati input focus ring**

Pronađi i zameni `.inp,.sel,.txta` fokus pravila:

```css
/* ZAMENI .inp,.sel,.txta */
.inp,.sel,.txta{
  width:100%;height:48px;padding:0 16px;border-radius:var(--r-md);
  border:1.5px solid var(--border);background:var(--bg-el);
  color:var(--tx);font-size:.9375rem;font-weight:500;
  transition:border-color var(--tf),box-shadow var(--tf);
  box-shadow:var(--sh-card);
}
```
→
```css
.inp,.sel,.txta{
  width:100%;height:48px;padding:0 16px;border-radius:var(--r-md);
  border:1.5px solid var(--border);background:var(--bg-ov);
  color:var(--tx);font-size:.9375rem;font-weight:500;
  transition:border-color var(--dur-base),
             box-shadow var(--dur-base) var(--ease-out),
             background var(--dur-base);
  box-shadow:var(--sh-card);
}
```

```css
/* ZAMENI .inp:focus,.sel:focus,.txta:focus */
.inp:focus,.sel:focus,.txta:focus{
  border-color:var(--border-foc);
  box-shadow:0 0 0 4px rgba(124,58,255,.12);
}
```
→
```css
.inp:focus,.sel:focus,.txta:focus{
  border-color:var(--border-foc);
  box-shadow:0 0 0 4px rgba(124,58,255,.12);
  background:var(--bg-el);
}
```

- [ ] **Step 5: Vizuelna verifikacija**

Otvori app. Proveri:
- Hoveri na job kartice imaju spring efekat (kliktaj miša i gledaj)
- Klik na "Apply now" / dugmad — spring squeeze na pritisak
- Fokus na search input — glow ring se pojavljuje, pozadina postaje bela
- Nema vizuelnih regresija na ostalim komponentama

- [ ] **Step 6: Commit**

```bash
git add src/index.css
git commit -m "style: add motion tokens, spring animations, and focus ring improvements"
```

---

## Task 5: Screen slide transition u App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Otvori `src/App.tsx` i pronađi `<main className="app-body">`**

Unutar `<main>` bloka, svaki kondicionalno renderovan ekran (`view === 'credits'`, `view === 'home'`, `view === 'applications'`, `view === 'profile'`) treba da dobije wrapper `<div className="view-enter" key={view}>`.

Zameni ceo `<main>` blok:

```tsx
<main className="app-body">

  {/* ── Credits ─────────────────────────────────────── */}
  {view === 'credits' && (
    <div className="view-enter" key="credits">
      <div className="pg" style={{ paddingBottom: 0 }}>
        <button className="btn btn-g btn-sm" onClick={() => setView(activeTab)}>
          ← Back
        </button>
      </div>
      <CreditsScreen
        userId={user.id}
        userEmail={user.email}
        balance={creditBalance}
        onPurchased={() => loadCredits(user.id)}
        onMessage={(m, t) => toast(m, t ?? 'info')}
      />
    </div>
  )}

  {/* ── Home ─────────────────────────────────────────── */}
  {view === 'home' && (
    <div className="view-enter" key="home">
      {isPostMode ? (
        <PostJobScreen
          categories={categories}
          creditBalance={creditBalance}
          userLocation={userLocation}
          onRequestLocation={requestLocation}
          onCreated={handleJobCreated}
          onGoToCredits={() => setView('credits')}
          onMessage={(m, t) => toast(m, t ?? 'info')}
        />
      ) : (
        <>
          <div className="pg" style={{ paddingBottom: 0 }}>
            <div className="stats-row">
              {(
                [
                  { icon: '💼', value: profile?.completed_jobs_worker ?? 0, label: 'Jobs done' },
                  { icon: '⭐', value: profile?.rating_as_worker ? profile.rating_as_worker.toFixed(1) : '—', label: 'My rating' },
                  { icon: '🪙', value: creditBalance, label: 'Credits' },
                  { icon: '📌', value: jobsList.length, label: 'Open nearby' },
                ] as Array<{ icon: string; value: string | number; label: string }>
              ).map(s => (
                <div key={s.label} className="stat-ch">
                  <span className="stat-ic">{s.icon}</span>
                  <div>
                    <div className="stat-v">{s.value}</div>
                    <div className="stat-lb">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <HomeScreen
            jobs={jobsList}
            categories={categories}
            loading={jobsLoading}
            userLocation={userLocation}
            locationLoading={locLoading}
            currentUser={profile}
            onRefresh={loadJobs}
            onRequestLocation={requestLocation}
            onJobApplied={handleJobApplied}
            onMessage={(m, t) => toast(m, t ?? 'info')}
          />
        </>
      )}
    </div>
  )}

  {/* ── Applications ─────────────────────────────────── */}
  {view === 'applications' && (
    <div className="view-enter" key="applications">
      <ApplicationsScreen
        currentUser={profile ?? { id: user.id, email: user.email }}
        onMessage={(m, t) => toast(m, t ?? 'info')}
        onCreditChange={() => loadCredits(user.id)}
        onOpenChat={() => navTo('inbox')}
      />
    </div>
  )}

  {/* ── Inbox — uvek mountovan za realtime unread ─────── */}
  <div style={{ display: view === 'inbox' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
    <InboxScreen
      currentUser={user}
      profile={profile}
      onMessage={(m, t) => toast(m, t ?? 'info')}
      onUnreadChange={setInboxUnread}
      isActive={view === 'inbox'}
    />
  </div>

  {/* ── Profile ──────────────────────────────────────── */}
  {view === 'profile' && (
    <div className="view-enter" key="profile">
      <ProfileScreen
        currentUser={user}
        profile={profile}
        onProfileUpdated={setProfile}
        onMessage={(m, t) => toast(m, t ?? 'info')}
      />
    </div>
  )}

</main>
```

- [ ] **Step 2: Vizuelna verifikacija**

Klikni kroz bottom nav tabove (Home → My Jobs → Profile → Home). Svaki ekran treba da uđe sa blagim slide-in (translateX + fade) animacijom od desne strane. Inbox nema animaciju (uvek je mountovan).

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add screen slide transition on view change"
```

---

## Task 6: SkeletonCard komponenta

**Files:**
- Create: `src/components/ui/SkeletonCard.tsx`

- [ ] **Step 1: Kreirati komponentu**

Napravi fajl `src/components/ui/SkeletonCard.tsx`:

```tsx
export function SkeletonCard() {
  return (
    <article className="jcard" aria-hidden="true" aria-label="Loading">
      <div className="jcard-hdr">
        <div className="jcard-bdgs" style={{ gap: 6 }}>
          <div className="skel" style={{ width: 52, height: 20 }} />
          <div className="skel" style={{ width: 80, height: 20 }} />
        </div>
      </div>
      <div className="skel" style={{ width: '80%', height: 18 }} />
      <div className="skel" style={{ width: '55%', height: 14, marginTop: 2 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="skel" style={{ width: 56, height: 14 }} />
        <div className="skel" style={{ width: 64, height: 14 }} />
      </div>
      <div className="jcard-foot">
        <div className="skel" style={{ width: 88, height: 28 }} />
        <div className="skel" style={{ width: 96, height: 14 }} />
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Vizuelna verifikacija (izolovana)**

Privremeno dodaj `<SkeletonCard />` negde na Home ekranu (npr. na vrh `.jgrid`), pokreni dev server i proveri da skeleton kartica ima isti layout kao prava job kartica i da shimmer animacija radi. Ukloni privremeni prikaz pre commita.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/SkeletonCard.tsx
git commit -m "feat: add SkeletonCard component for loading states"
```

---

## Task 7: Stagger animacija i SkeletonCard u HomeScreen

**Files:**
- Modify: `src/components/jobs/JobCard.tsx`
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: Dodati `animationDelay` prop u JobCard**

Otvori `src/components/jobs/JobCard.tsx`. Zameni `interface Props`:

```tsx
interface Props {
  job: Job;
  onClick: (job: Job) => void;
  animationDelay?: number;
}
```

Zameni `export function JobCard({ job, onClick }: Props)`:

```tsx
export function JobCard({ job, onClick, animationDelay }: Props) {
```

Zameni `<article className="jcard"`:

```tsx
<article
  className="jcard jcard-enter"
  style={animationDelay !== undefined ? { animationDelay: `${animationDelay}ms` } : undefined}
  onClick={() => onClick(job)}
>
```

- [ ] **Step 2: Ažurirati list view u HomeScreen**

Otvori `src/screens/HomeScreen.tsx`. Dodaj import:

```tsx
import { SkeletonCard } from '../components/ui/SkeletonCard';
```

Pronađi list view loading state:

```tsx
{view === 'list' && (
  loading ? (
    <div className="loading"><span className="spin" />Loading jobs...</div>
  ) : filtered.length === 0 ? (
```

Zameni samo `loading` branch:

```tsx
{view === 'list' && (
  loading ? (
    <div className="jgrid">
      {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
    </div>
  ) : filtered.length === 0 ? (
```

Pronađi list view render (u istom `view === 'list'` bloku):

```tsx
<div className="jgrid">
  {filtered.map(job => (
    <JobCard key={job.id} job={job} onClick={setSelectedJob} />
  ))}
```

Zameni sa:

```tsx
<div className="jgrid">
  {filtered.map((job, index) => (
    <JobCard
      key={job.id}
      job={job}
      onClick={setSelectedJob}
      animationDelay={Math.min(index, 7) * 60}
    />
  ))}
```

- [ ] **Step 3: Ažurirati split view u HomeScreen**

Pronađi split view loading state:

```tsx
{loading ? (
  <div className="loading"><span className="spin" />Loading jobs...</div>
) : filtered.length === 0 ? (
```

Zameni loading branch (u split view kontekstu):

```tsx
{loading ? (
  <div className="jgrid" style={{ gridTemplateColumns: '1fr' }}>
    {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
  </div>
) : filtered.length === 0 ? (
```

Pronađi split view card render:

```tsx
<div className="jgrid" style={{ gridTemplateColumns: '1fr' }}>
  {filtered.map(job => (
    <JobCard
      key={job.id}
```

Zameni:

```tsx
<div className="jgrid" style={{ gridTemplateColumns: '1fr' }}>
  {filtered.map((job, index) => (
    <JobCard
      key={job.id}
      animationDelay={Math.min(index, 7) * 60}
```

- [ ] **Step 4: Vizuelna verifikacija**

Pokreni app. Klikni Refresh dugme na Home ekranu (ili promeni filter). Dok se kartice učitavaju:
- Vide se 3–4 skeleton kartice sa shimmer efektom
- Kada stignu pravi podaci, kartice ulaze jedna za drugom sa 60ms razmacima (stagger)
- Kartica 1: odmah, kartica 2: posle 60ms, kartica 3: 120ms itd.

- [ ] **Step 5: Commit**

```bash
git add src/components/jobs/JobCard.tsx src/screens/HomeScreen.tsx src/components/ui/SkeletonCard.tsx
git commit -m "feat: stagger card entrance animations and skeleton loading state"
```

---

## Self-Review

**Spec coverage:**
- ✅ Typography tokens (`--text-xs` do `--text-3xl`, `--lh-*`) — Task 1 + Task 2
- ✅ Spacing tokens (4px grid) — Task 1 + Task 3
- ✅ Motion tokens (`--ease-spring`, `--dur-*`) — Task 1 + Task 4
- ✅ Button spring press — Task 4
- ✅ Card hover lift — Task 4
- ✅ Card stagger entrance — Task 7
- ✅ Tab/screen slide transition — Task 5
- ✅ Skeleton loading — Task 6 + Task 7
- ✅ Input focus ring — Task 4

**Placeholder scan:** Nema TBD/TODO. Svaki step ima konkretan kod.

**Type consistency:**
- `animationDelay?: number` definisano u Task 7 Step 1 (JobCard interface) i korišćeno u Task 7 Step 3 (HomeScreen)
- `SkeletonCard` importovana tačno pod istim putanjom `'../components/ui/SkeletonCard'` u oba mesta gde se koristi
- `.jcard-enter` CSS klasa definisana u Task 4 Step 1, primenjena u Task 7 Step 1

**Redosled izvršavanja:** Tasks 1–4 su čisti CSS i mogu se raditi nezavisno. Task 5 je čisti React. Task 6 mora biti pre Task 7 (SkeletonCard import).
