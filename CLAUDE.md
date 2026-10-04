# WEX Service — instrucțiuni pentru Claude Code

Aplicația „Echipa Service” Wood Expert Industry. **Sursa de adevăr este `docs/PLAN.md`.** Citește-l înainte de orice task. Lucrăm pe milestone-uri (secțiunea 16), în ordine.

## Reguli de lucru

- Implementezi **doar** milestone-ul cerut. Nu începi altul fără confirmare.
- Dacă planul nu acoperă o decizie, **întrebi**. Nu inventezi comportament. Deciziile noi se adaugă în `docs/PLAN.md` § 1.
- La finalul fiecărui milestone:
  - rulezi `pnpm lint && pnpm typecheck && pnpm test`;
  - verifici criteriile de acceptanță;
  - scrii o listă scurtă cu ce trebuie verificat manual.
- Commit-uri mici, mesaje în engleză, prefix `m{n}:`.

## Stack

Astro 5 SSR (`@astrojs/vercel`) + React islands, Tailwind v4 + shadcn/ui, react-hook-form + zod, Astro Actions, Supabase (Auth, Postgres + RLS, Storage), Resend + React Email, `apps/pdf` (puppeteer-core + @sparticuz/chromium), pnpm workspaces, TypeScript strict.

## Structură

- `apps/web`: aplicația
- `apps/pdf`: serviciul PDF
- `packages/shared`: scheme zod, permisiuni, operațiuni, numerotare, tipuri DB
- `supabase/`: migrări, seed, teste RLS
- `scripts/migration`: import WordPress

## Convenții obligatorii

- **UI în română, cu diacritice.** Codul, numele de variabile și commit-urile sunt în engleză.
- Fusul orar pentru date afișate și `report_date`: `Europe/Bucharest`. Format dată: `DD-MM-YYYY`.
- Permisiunile se verifică **întotdeauna** prin `packages/shared/permissions.ts` în Actions, iar RLS rămâne activ pe toate tabelele.
- `SUPABASE_SERVICE_ROLE_KEY` se folosește doar în cod server (`lib/supabase/admin.ts`), niciodată în islands.
- PDF-ul se generează **numai din `service_report_versions.snapshot`**.
- Orice acțiune din catalogul `PLAN.md` § 9.9 apelează `logActivity()`.
- Destinatarii de email se deduplică case-insensitive; fiecare trimitere ajunge în `email_log`.
- Schimbările de schemă se fac **doar** prin migrări noi în `supabase/migrations/` (nu se editează migrările vechi), apoi `pnpm db:types`.
- Mobile-first: ținte de atingere ≥ 44 px, wizard-ul se testează pe viewport de telefon.

## Comenzi (de creat în M0)

- `pnpm dev`: web + pdf local
- `pnpm db:start` / `db:reset` / `db:types`: Supabase CLI
- `pnpm test`: Vitest
- `pnpm test:db`: pgTAP
- `pnpm test:e2e`: Playwright

## Date sensibile

`scripts/migration/input/` conține dump-uri cu date personale și hash-uri de parole. Este în `.gitignore` și nu se comite niciodată. Conținutul lui nu se afișează în output.
