# WEX Service — Plan de execuție

> Aplicația „Echipa Service” Wood Expert Industry: procese verbale de service, clienți, utilaje, semnături, PDF, email, jurnal de activitate.
> Înlocuiește aplicația WordPress + Gravity Forms + Gravity PDF + LoginPress.
>
> **Document de lucru pentru Claude Code.** Implementarea se face pe milestone-uri (secțiunea 16), în ordine. Fiecare milestone are criterii de acceptanță. Ce nu e scris aici nu se inventează: se întreabă.

---

## Cuprins

1. Decizii confirmate
2. Stack tehnic
3. Arhitectură
4. Structura repository-ului
5. Variabile de mediu
6. Roluri și permisiuni
7. Model de date (Supabase / Postgres)
8. Securitate: RLS, storage, tokenuri
9. Specificații funcționale — Faza 1
10. Formularul PV (wizard) — specificație completă
11. Generarea PDF
12. Email-uri
13. Specificații funcționale — Faza 2
14. Migrarea din WordPress
15. Infrastructură, deploy, DNS
16. Milestone-uri și criterii de acceptanță
17. Testare
18. Plan de trecere (cutover)
19. Backlog Faza 3 (după lansare)
20. Cum lucrăm cu acest plan în Claude Code

---

## 1. Decizii confirmate

| #   | Subiect                      | Decizie                                                                                                                                                                                                                                                                                                                                       |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Stack                        | Astro (SSR) + React islands, Supabase, Vercel                                                                                                                                                                                                                                                                                                 |
| D2  | Limbă                        | Doar română, cu diacritice în interfață și PDF                                                                                                                                                                                                                                                                                                |
| D3  | Roluri                       | `admin`, `subadmin`, `technician`, `client`                                                                                                                                                                                                                                                                                                   |
| D4  | Conturi firme                | O firmă = un singur cont (email master). Firma are 1..n reprezentanți: implicit 1, se pot adăuga alții                                                                                                                                                                                                                                        |
| D5  | Înregistrare clienți         | Auto-înregistrare cu aprobare admin **sau** invitație. Identificare după CUI, cu interogare ANAF                                                                                                                                                                                                                                              |
| D6  | ANAF                         | Peste tot unde se creează o firmă: înregistrare client, formular PV (tehnician), admin                                                                                                                                                                                                                                                        |
| D7  | Firmă nouă din PV            | Tehnicianul poate crea firma din formular (ANAF). Firma primește automat invitație pe email-ul master                                                                                                                                                                                                                                         |
| D8  | Tipuri intervenție           | Montaj, Garanție, Revizie, Punere în funcțiune, Reparație accidentală. Selecție multiplă                                                                                                                                                                                                                                                      |
| D9  | Operațiuni                   | Fiecare tip are lista lui. La selecție multiplă: **reuniune fără dubluri**, o singură listă, în ordinea globală                                                                                                                                                                                                                               |
| D10 | Liste operațiuni             | Montaj = Garanție = Punere în funcțiune (14). Reparație accidentală (9). Revizie (11 = cele 9 + „Schimbat filtre” + „Schimbat uleiuri”)                                                                                                                                                                                                       |
| D11 | Producători                  | Autocomplete după minim 3 litere (căutare în tot numele, fără majuscule/diacritice). Dacă nu există potrivire → „Adaugă producător nou” → modal cu nume + buton „Adaugă”. Se salvează cine l-a adăugat. Adminul gestionează lista                                                                                                             |
| D12 | Tip echipament               | Același mecanism ca producătorii                                                                                                                                                                                                                                                                                                              |
| D13 | Registru utilaje             | Per firmă. Pot adăuga: clientul, tehnicianul, adminul                                                                                                                                                                                                                                                                                         |
| D14 | Cititor plăcuță (Faza 2)     | Foto → Claude API (vision) → câmpuri editabile → „Confirmă” → salvare în „Utilaje client”. Plăcuțe în EN/IT. Poza plăcuței se păstrează                                                                                                                                                                                                       |
| D15 | Semnătura clientului         | Pe loc: semnătura salvată a reprezentantului e precompletată, reprezentantul confirmă pe ecranul tehnicianului (sau semnează din nou). La distanță (Faza 2): link 7 zile, remindere, trimis pe email-ul master și pe email-ul reprezentantului (deduplicat)                                                                                   |
| D16 | Reprezentant diferit         | Câmpul reprezentant e editabil. Pentru un reprezentant nou se desenează o semnătură nouă, cu opțiunea de a-l salva ca reprezentant al firmei                                                                                                                                                                                                  |
| D17 | Semnătura tehnicianului      | Desenată o dată în profil (de admin sau tehnician la activare), aplicată automat pe fiecare PV                                                                                                                                                                                                                                                |
| D18 | Numerotare                   | `PV-2026-0001_SALUT_04-10-2026`. Numerotarea se resetează anual. PV-urile migrate primesc numere în seria anului creării                                                                                                                                                                                                                      |
| D19 | Editare PV                   | Admin: editează direct, se creează versiune nouă oficială, retrimiterea e manuală. Subadmin: editează, versiunea merge la client spre aprobare (link email 7 zile, remindere). Dacă clientul aprobă, devine oficială; dacă respinge, rămâne versiunea anterioară și subadminul vede motivul. Toate versiunile apar sub PV, cu data și autorul |
| D20 | Email PV final               | From `no-reply@woodexpert.ro`, Reply-To `office@woodexpert.ro`. Către: tehnician, email master firmă, email reprezentant semnatar, office@ (deduplicat)                                                                                                                                                                                       |
| D21 | Migrare                      | Doar tehnicienii (cu parolele existente, migrare la prima logare) și PV-urile completate. Clienții nu se migrează                                                                                                                                                                                                                             |
| D22 | PV migrate                   | Rămân cu numele firmei ca text. Adminul le atașează la firme din ecranul „Potriviri”                                                                                                                                                                                                                                                          |
| D23 | Conturi tehnicieni           | Le creează doar adminul. Tehnicianul primește email de activare                                                                                                                                                                                                                                                                               |
| D24 | Setări firmă                 | Secțiune admin: logo, denumire, website, telefon, email, descriere scurtă, adresă, CUI, Reg. Com. Se folosesc în PDF și email-uri                                                                                                                                                                                                             |
| D25 | Poze înainte/după            | Câmp opțional la final (Faza 2). Clientul și tehnicianul decid dacă e cazul                                                                                                                                                                                                                                                                   |
| D26 | Faze                         | Faza 1 = tot ce înlocuiește WordPress + îmbunătățirile de bază. Faza 2 = plăcuță AI, semnătură la distanță, PWA offline, editor WYSIWYG header/footer, poze                                                                                                                                                                                   |
| D27 | Piese de schimb / organizare | Faza 3, după lansare (cereri de ofertă piese)                                                                                                                                                                                                                                                                                                 |

### Decizii implicite luate de mine (se pot schimba)

| #   | Subiect                        | Implicit                                                                                                                            |
| --- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| I1  | Subadmin — alte drepturi       | Vede toate firmele, utilajele și PV-urile. Nu gestionează utilizatori, setări sau șabloane. Poate crea firme și utilaje             |
| I2  | Tehnician — utilaje            | Vede lista de firme (doar date de identificare) și utilajele lor, ca să poată completa PV-ul. **Nu** vede PV-urile altor tehnicieni |
| I3  | Client — drafturi              | Clientul vede doar PV-uri finalizate (și cele care așteaptă semnătura sau aprobarea lui)                                            |
| I4  | Observații la final            | „Funcționează la parametri” / „Rămâne oprit până la schimbarea pieselor defecte” devin **radio** (se exclud reciproc), nu checkbox  |
| I5  | Durata intervenției            | Câmp numeric în ore (pas 0,5). Valorile text migrate se parsează; dacă nu se pot parsa, se păstrează textul original                |
| I6  | Validare operațiuni            | Minim o operațiune bifată **sau** text în „Alte operațiuni”                                                                         |
| I7  | Retrimitere către email custom | Limită 20 de trimiteri pe zi per utilizator, anti-abuz                                                                              |
| I8  | Câmpul duplicat                | „Nume reprezentant Wood Expert Industry” apare o singură dată, completat automat cu tehnicianul logat                               |
| I9  | PDF                            | Afișează doar operațiunile bifate (ca acum), grupate sub titlul „Operațiuni efectuate”                                              |
| I10 | Regiune                        | Supabase EU (Frankfurt), Vercel functions `fra1`                                                                                    |

---

## 2. Stack tehnic

| Strat               | Alegere                                                                         | Motiv                                                               |
| ------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Framework           | **Astro 5** (`output: 'server'`) + `@astrojs/vercel`                            | Familiar, SSR pentru toate paginile autentificate                   |
| Interactivitate     | **React 19** islands (`@astrojs/react`)                                         | Wizard PV, semnătură, autocomplete, editor                          |
| UI                  | **Tailwind CSS v4** + **shadcn/ui** (componente React)                          | Rapid, consistent, accesibil                                        |
| Formulare           | `react-hook-form` + `zod`                                                       | Validare comună client/server                                       |
| Mutații server      | **Astro Actions** (`astro:actions`)                                             | Tipizat, validare zod integrată                                     |
| Auth / DB / Storage | **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`)                         | Auth pe cookie, Postgres + RLS, Storage privat                      |
| Semnătură           | `signature_pad` (wrapper React propriu)                                         | Matur, merge pe touch și mouse, export PNG                          |
| PDF                 | **Serviciu separat**: `puppeteer-core` + `@sparticuz/chromium` pe Vercel (Node) | HTML → PDF fidel, header/footer HTML; nu încarcă funcția principală |
| Email               | **Resend** + **React Email**                                                    | API simplu, domeniu verificat, șabloane în React                    |
| Cron                | **Vercel Cron** → `/api/cron/*` (protejat cu secret)                            | Remindere semnătură și aprobare, expirări                           |
| AI plăcuță (F2)     | **Claude API** (`@anthropic-ai/sdk`), model vision configurabil prin env        | Citește EN/IT, returnează JSON structurat                           |
| Editor (F2)         | **TipTap** (React)                                                              | WYSIWYG pentru header/footer PDF                                    |
| PWA (F2)            | `@vite-pwa/astro` (Workbox) + **Dexie** (IndexedDB)                             | Drafturi offline, sincronizare                                      |
| Căutare fuzzy       | Postgres `pg_trgm` + `unaccent`                                                 | Autocomplete producători/firme, potriviri migrare                   |
| Hash parole WP      | `bcryptjs` + implementare phpass (`wordpress-hash-node` sau port propriu)       | Migrare la prima logare                                             |
| Teste               | Vitest, Playwright, teste RLS (SQL)                                             | Vezi secțiunea 17                                                   |
| Package manager     | **pnpm** workspaces                                                             | Monorepo web + pdf + shared                                         |
| Limbaj              | TypeScript strict peste tot                                                     |                                                                     |

---

## 3. Arhitectură

```
                 ┌──────────────────────────────────────────┐
  Browser/PWA →  │  apps/web  (Astro SSR on Vercel, fra1)   │
                 │  - pagini, middleware auth, Actions      │
                 │  - /api/anaf, /api/cron/*, /api/plate    │
                 └───────┬───────────────┬───────────┬──────┘
                         │               │           │
          service role / │      HTTP +   │   Resend  │
          user session   │      secret   │   API     │
                         ▼               ▼           ▼
                 ┌──────────────┐  ┌──────────────┐  ┌──────────┐
                 │  Supabase    │  │ apps/pdf     │  │ Resend   │
                 │  Postgres    │◄─┤ (Vercel fn,  │  │ (email)  │
                 │  Auth        │  │  Chromium)   │  └──────────┘
                 │  Storage     │  └──────────────┘
                 └──────────────┘          ▲
                         ▲                 │
                  ANAF API (public)   Claude API (F2)
```

**Fluxul de finalizare a unui PV** (toată logica rulează pe server, într-o singură Action `finalizeReport`):

1. Validează datele (schema zod din `packages/shared`).
2. Alocă numărul PV atomic (`next_pv_number(year)`).
3. Salvează versiunea 1 (snapshot JSON complet) și setează statusul.
4. Cere PDF-ul de la `apps/pdf` (HTML randat de `apps/web` → PDF) și îl încarcă în Storage.
5. Trimite email-urile (Resend), cu PDF-ul atașat.
6. Scrie în `email_log` și `activity_log`.

Pașii 4–5 sunt **idempotenți** și se pot relua: dacă PDF-ul sau email-ul eșuează, PV-ul rămâne `finalized` cu flag `pdf_status='failed'` / `email_status='failed'`, iar adminul vede un buton „Reîncearcă”.

**Randarea HTML a PDF-ului:**

- `apps/web` expune `/internal/pdf-html/[versionId]`, protejat cu `PDF_INTERNAL_SECRET` în header.
- Pagina returnează HTML-ul complet al documentului.
- `apps/pdf` primește `{ html, headerHtml, footerHtml, fileName }` direct în POST, ca să nu depindă de rețea înapoi. Varianta aleasă: **web trimite HTML-ul**.

---

## 4. Structura repository-ului

```
wex-service/
├── CLAUDE.md
├── docs/
│   └── PLAN.md                     ← acest fișier
├── package.json                    ← pnpm workspaces
├── pnpm-workspace.yaml
├── apps/
│   ├── web/                        ← Astro
│   │   ├── astro.config.mjs
│   │   ├── vercel.json             ← cron jobs
│   │   ├── public/                 ← icons, manifest (F2)
│   │   └── src/
│   │       ├── middleware.ts       ← sesiune, rol, protecție rute
│   │       ├── actions/            ← Astro Actions pe domenii
│   │       │   ├── auth.ts
│   │       │   ├── companies.ts
│   │       │   ├── representatives.ts
│   │       │   ├── equipment.ts
│   │       │   ├── catalog.ts      ← producători, tipuri echipament
│   │       │   ├── reports.ts      ← draft, finalize, edit, resend
│   │       │   ├── approvals.ts    ← aprobări modificări
│   │       │   ├── signatures.ts   ← F2: semnare la distanță
│   │       │   ├── users.ts
│   │       │   └── settings.ts
│   │       ├── components/
│   │       │   ├── ui/             ← shadcn
│   │       │   ├── report-wizard/  ← React island
│   │       │   ├── signature/
│   │       │   ├── autocomplete/
│   │       │   ├── anaf/
│   │       │   └── layout/
│   │       ├── layouts/
│   │       ├── lib/
│   │       │   ├── supabase/       ← server.ts, browser.ts, admin.ts
│   │       │   ├── auth/           ← legacy-wp-hash.ts, guards.ts
│   │       │   ├── anaf.ts
│   │       │   ├── pdf.ts          ← client către apps/pdf
│   │       │   ├── email/          ← resend.ts + templates/ (React Email)
│   │       │   ├── activity.ts     ← logActivity()
│   │       │   ├── tokens.ts       ← tokenuri semnare/aprobare
│   │       │   └── rate-limit.ts
│   │       └── pages/              ← vezi secțiunea 9.1
│   └── pdf/                        ← Vercel project separat
│       ├── api/render.ts           ← POST: html → pdf (Buffer)
│       ├── fonts/                  ← Inter/Roboto TTF (diacritice)
│       └── vercel.json             ← memory 1769MB, maxDuration 60
├── packages/
│   └── shared/
│       ├── schemas/                ← zod: report, company, equipment…
│       ├── operations.ts           ← reuniune operațiuni (D9)
│       ├── numbering.ts            ← format număr PV + nume fișier
│       ├── permissions.ts          ← matrice roluri (secțiunea 6)
│       └── types/database.ts       ← generat: supabase gen types
├── supabase/
│   ├── config.toml
│   ├── migrations/                 ← SQL numerotat
│   ├── seed.sql                    ← tipuri, operațiuni, producători
│   └── tests/                      ← teste RLS (pgTAP)
└── scripts/
    └── migration/                  ← import WordPress (secțiunea 14)
        ├── docker-compose.yml      ← MySQL local pentru dump
        ├── field-map.json
        ├── 01-users.ts
        ├── 02-reports.ts
        ├── 03-signatures.ts
        ├── 04-generate-pdfs.ts
        └── 05-verify.ts
```

---

## 5. Variabile de mediu

**apps/web**

```
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=           # doar server
PUBLIC_APP_URL=https://service.woodexpert.ro
PDF_SERVICE_URL=https://wex-pdf.vercel.app/api/render
PDF_SERVICE_SECRET=
RESEND_API_KEY=
EMAIL_FROM="Wood Expert Industry Service <no-reply@woodexpert.ro>"
EMAIL_REPLY_TO=office@woodexpert.ro
EMAIL_OFFICE=office@woodexpert.ro
CRON_SECRET=
TOKEN_PEPPER=                        # pentru hash tokenuri
ANAF_API_URL=https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva
ANTHROPIC_API_KEY=                   # F2
ANTHROPIC_VISION_MODEL=              # F2, ex. ultimul model Sonnet disponibil
```

**apps/pdf**

```
PDF_SERVICE_SECRET=
```

Niciun secret nu ajunge în client. Se verifică cu un test care caută `SERVICE_ROLE` în bundle-ul client după build.

---

## 6. Roluri și permisiuni

Matricea de mai jos se implementează **o singură dată**, în `packages/shared/permissions.ts`, și se folosește în middleware, în Actions și în UI (ascunderea butoanelor). RLS (secțiunea 8) e a doua linie de apărare.

| Acțiune                                         |   admin   |          subadmin          |                          technician                           |              client              |
| ----------------------------------------------- | :-------: | :------------------------: | :-----------------------------------------------------------: | :------------------------------: |
| Vede toate PV-urile                             |    ✅     |             ✅             |                       ❌ (doar ale lui)                       | ❌ (doar ale firmei, finalizate) |
| Creează PV                                      |    ✅     |             ❌             |                              ✅                               |                ❌                |
| Previzualizează / descarcă PDF                  | ✅ toate  |          ✅ toate          |                          ✅ ale lui                           |          ✅ ale firmei           |
| Retrimite PV către tehnician                    |    ✅     |             ✅             |                               —                               |                ❌                |
| Retrimite către email client / reprezentant     |    ✅     |             ✅             |                              ✅                               |      ✅ (email din profil)       |
| Retrimite către email custom                    |    ✅     |             ✅             |                              ✅                               |                ✅                |
| Editează PV finalizat                           | ✅ direct | ✅ cu aprobarea clientului |                              ❌                               |                ❌                |
| Aprobă / respinge modificări                    |     —     |             —              |                               —                               |                ✅                |
| Anulează PV (status `cancelled`, nu ștergere)   |    ✅     |             ❌             |                              ❌                               |                ❌                |
| Vede istoricul de versiuni                      |    ✅     |             ✅             |                          ✅ ale lui                           |          ✅ ale firmei           |
| Creează firmă (ANAF)                            |    ✅     |             ✅             |                          ✅ (din PV)                          |       (auto-înregistrare)        |
| Aprobă înregistrare firmă                       |    ✅     |             ❌             |                              ❌                               |                ❌                |
| Editează date firmă                             |    ✅     |             ❌             |                              ❌                               |          ✅ (fără CUI)           |
| Gestionează reprezentanți                       |    ✅     |             ❌             |                       ✅ adaugă din PV                        |                ✅                |
| Adaugă utilaje la o firmă                       |    ✅     |             ✅             |                              ✅                               |       ✅ (doar firma lui)        |
| Editează / șterge utilaje                       |    ✅     |             ✅             |                              ❌                               |     ✅ editează (firma lui)      |
| Adaugă producător / tip echipament              |    ✅     |             ✅             |                              ✅                               |    ✅ (din registru utilaje)     |
| Editează / șterge / unește producători          |    ✅     |             ❌             |                              ❌                               |                ❌                |
| Profil propriu                                  |  ✅ edit  |          ✅ edit           | 👁️ doar vizualizare (excepție: semnătura la activare, parola) |             ✅ edit              |
| Gestionează utilizatori (tehnicieni, subadmini) |    ✅     |             ❌             |                              ❌                               |                ❌                |
| Jurnal tehnician / jurnal client                |    ✅     |             ❌             |                              ❌                               |                ❌                |
| Setări firmă, șabloane PDF, operațiuni          |    ✅     |             ❌             |                              ❌                               |                ❌                |
| Ecran potriviri PV migrate                      |    ✅     |             ❌             |                              ❌                               |                ❌                |

Note:

- Tehnicianul își poate schimba **parola** (securitate) și își poate desena semnătura **o singură dată**, la activarea contului. Altfel, profilul e read-only.
- Clienții nu pot vedea emailuri/IP-uri din jurnale.

---

## 7. Model de date (Supabase / Postgres)

Extensii: `pg_trgm`, `unaccent`, `pgcrypto`, `citext`.

Toate tabelele au `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz` (trigger) dacă nu e specificat altfel.

### 7.1 Enum-uri

```sql
create type user_role as enum ('admin','subadmin','technician','client');
create type company_status as enum ('invited','pending_approval','active','rejected','no_account');
create type report_status as enum ('draft','pending_signature','signature_expired','finalized','cancelled');
create type version_status as enum ('official','pending_client_approval','rejected','superseded');
create type end_state as enum ('functional','stopped_pending_parts');
create type signature_mode as enum ('onsite','remote');
create type token_purpose as enum ('remote_signature','edit_approval');
create type token_status as enum ('active','used','expired','revoked');
create type job_status as enum ('pending','ok','failed');
```

### 7.2 Setări și utilizatori

```sql
-- singleton (o singură linie, id = 1)
create table company_settings (
  id int primary key default 1 check (id = 1),
  legal_name text not null default 'Wood Expert Industry SRL',
  cui text, reg_com text, address text,
  website text, phone text, email text,
  short_description text,
  logo_path text,                 -- storage: branding/
  office_email citext not null default 'office@woodexpert.ro',
  updated_by uuid references auth.users, updated_at timestamptz
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role user_role not null,
  full_name text not null,
  username citext unique,          -- login cu username (din WP) sau email
  email citext not null unique,
  phone text,
  company_id uuid references companies,       -- doar pentru role=client
  signature_path text,                        -- technician (storage: signatures/)
  is_active boolean not null default true,
  legacy_wp_user_id bigint unique,
  last_login_at timestamptz,
  constraint client_has_company check (role <> 'client' or company_id is not null)
);

create table legacy_passwords (
  user_id uuid primary key references auth.users on delete cascade,
  wp_hash text not null,           -- $P$..., $wp$2y$..., $2y$...
  imported_at timestamptz default now()
);
```

### 7.3 Firme, reprezentanți

```sql
create table companies (
  cui text unique,                 -- doar cifre, fără RO; null doar pt. persoane fără CUI (rar)
  name text not null,
  county text, city text, address text, reg_com text,
  master_email citext,
  phone text,
  status company_status not null default 'no_account',
  vat_payer boolean,
  anaf_snapshot jsonb,             -- răspunsul ANAF brut, la data interogării
  anaf_checked_at timestamptz,
  created_by uuid references auth.users,
  created_source text check (created_source in ('admin','technician','self_registration','subadmin')),
  approved_by uuid references auth.users, approved_at timestamptz,
  rejection_reason text,
  name_search text generated always as (lower(unaccent_immutable(name))) stored
);
create index on companies using gin (name_search gin_trgm_ops);

create table company_representatives (
  company_id uuid not null references companies on delete cascade,
  full_name text not null,
  email citext,
  phone text,
  signature_path text,             -- storage: signatures/
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references auth.users
);
create unique index one_default_rep on company_representatives(company_id) where is_default;
```

> `unaccent_immutable` = wrapper `immutable` peste `unaccent()`, necesar pentru coloane generate și indexuri.

### 7.4 Catalog: producători, tipuri echipament, intervenții, operațiuni

```sql
create table manufacturers (
  name text not null,
  name_normalized text generated always as (lower(unaccent_immutable(trim(name)))) stored unique,
  is_active boolean default true,
  created_by uuid references auth.users        -- afișat în admin: „adăugat de X”
);
create index on manufacturers using gin (name_normalized gin_trgm_ops);

create table equipment_types (
  name text not null,
  name_normalized text generated always as (lower(unaccent_immutable(trim(name)))) stored unique,
  is_active boolean default true,
  created_by uuid references auth.users
);
create index on equipment_types using gin (name_normalized gin_trgm_ops);

create table intervention_types (
  code text primary key,           -- montaj, garantie, revizie, punere_functiune, reparatie
  label text not null,
  sort_order int not null,
  is_active boolean default true
);

create table operations (
  label text not null,
  sort_order int not null,         -- ordine globală (folosită la reuniune)
  is_active boolean default true
);

create table intervention_type_operations (
  intervention_type text references intervention_types on delete cascade,
  operation_id uuid references operations on delete cascade,
  primary key (intervention_type, operation_id)
);
```

### 7.5 Utilaje

```sql
create table equipment (
  company_id uuid not null references companies on delete restrict,
  manufacturer_id uuid not null references manufacturers,
  equipment_type_id uuid not null references equipment_types,
  model text,
  serial_number text not null,
  manufacture_year int check (manufacture_year between 1950 and extract(year from now())::int + 1),
  notes text,
  plate_photo_path text,           -- F2 (storage: plates/)
  ai_extraction jsonb,             -- F2: răspuns AI brut + încredere per câmp
  created_via text check (created_via in ('manual','plate_ai','migration')) default 'manual',
  created_by uuid references auth.users,
  is_active boolean default true
);
create unique index equipment_unique_serial on equipment(manufacturer_id, lower(serial_number));
```

> Dacă cineva încearcă să adauge un utilaj cu producător + serie deja existente la **altă** firmă, se blochează cu mesajul „Utilajul există deja la firma X — contactați administratorul” (cazul în care un utilaj se mută între firme îl rezolvă adminul).

### 7.6 Procese verbale

```sql
create table pv_counters (
  year int primary key,
  last_number int not null default 0
);

create table service_reports (
  client_uuid uuid unique,          -- idempotency key generat pe device (offline F2)
  year int,
  seq int,                          -- alocat la finalizare
  pv_number text unique,            -- ex. PV-2026-0001
  file_base_name text,              -- ex. PV-2026-0001_SALUT_04-10-2026
  status report_status not null default 'draft',
  technician_id uuid not null references profiles,
  company_id uuid references companies,          -- null doar la PV migrate nepotrivite
  equipment_id uuid references equipment,
  current_version int not null default 0,       -- versiunea oficială curentă
  data jsonb not null default '{}'::jsonb,       -- draft-ul de lucru (până la finalizare)
  signature_mode signature_mode,
  legacy boolean not null default false,
  legacy_wp_entry_id bigint unique,
  legacy_company_text text,                      -- numele firmei din WP
  report_date date,
  finalized_at timestamptz,
  cancelled_at timestamptz, cancelled_by uuid, cancel_reason text,
  unique (year, seq)
);
create index on service_reports(technician_id);
create index on service_reports(company_id);
create index on service_reports(status);

create table service_report_versions (
  report_id uuid not null references service_reports on delete cascade,
  version_no int not null,
  status version_status not null,
  snapshot jsonb not null,          -- TOT conținutul PV (vezi 7.7), inclusiv căi semnături
  change_summary text,              -- diff lizibil generat automat (câmpuri schimbate)
  pdf_path text,
  pdf_status job_status default 'pending',
  created_by uuid not null references auth.users,
  created_by_role user_role not null,
  approved_by_name text, approved_at timestamptz,   -- aprobare client (subadmin edits)
  rejected_reason text, rejected_at timestamptz,
  unique (report_id, version_no)
);

create table report_signatures (
  report_id uuid not null references service_reports on delete cascade,
  representative_id uuid references company_representatives,
  signer_name text not null,
  signer_email citext,
  image_path text not null,           -- storage: signatures/reports/
  mode signature_mode not null,
  confirmed_stored_signature boolean not null default false, -- true = semnătură salvată confirmată pe loc
  signed_at timestamptz not null default now(),
  ip inet, user_agent text           -- obligatoriu pentru remote
);

create table report_photos (            -- F2
  report_id uuid not null references service_reports on delete cascade,
  kind text check (kind in ('before','after')),
  path text not null,
  caption text,
  created_by uuid references auth.users
);
```

### 7.7 Structura `snapshot` (versionată, validată cu zod în `packages/shared/schemas/report.ts`)

```ts
{
  schemaVersion: 1,
  pvNumber: "PV-2026-0001",
  reportDate: "2026-10-04",
  company: { id, name, cui, county, city, email, phone },
  technician: { id, fullName, signaturePath },
  equipment: { id, typeName, manufacturerName, model, serialNumber, manufactureYear },
  interventionTypes: ["montaj","punere_functiune"],
  initialState: "string",
  operations: [{ id, label, checked: true }],   // label copiat (istoric stabil)
  otherOperations: "string",
  durationHours: 2.5, durationText: null,       // durationText doar la legacy
  materialsUsed: "string",
  recommendedParts: "string",
  endState: "functional" | "stopped_pending_parts",
  endObservations: "string",
  technicianObservations: "string",
  clientObservations: "string",
  representative: { id|null, name, email },
  clientSignature: { path, mode, signedAt, confirmedStored, ip? },
  photos: [{ kind, path }]                      // F2
}
```

> **Regulă:** PDF-ul se generează **numai din snapshot**, niciodată din tabelele live. Dacă un producător e redenumit mâine, PV-urile vechi rămân neschimbate.

### 7.8 Tokenuri, email, jurnal, șabloane

```sql
create table action_tokens (
  purpose token_purpose not null,
  report_id uuid not null references service_reports on delete cascade,
  version_id uuid references service_report_versions,  -- pt. edit_approval
  token_hash text not null unique,                       -- sha256(token + TOKEN_PEPPER)
  recipients citext[] not null,
  expires_at timestamptz not null,                       -- now() + 7 zile
  status token_status not null default 'active',
  reminders_sent int not null default 0,
  last_reminder_at timestamptz,
  used_at timestamptz, used_ip inet,
  created_by uuid references auth.users
);

create table email_log (
  report_id uuid references service_reports,
  version_id uuid references service_report_versions,
  kind text not null,          -- pv_final, pv_resend, signature_request, signature_reminder,
                               -- approval_request, approval_reminder, approval_result,
                               -- invite_company, invite_technician, registration_received,
                               -- registration_approved, registration_rejected, password_reset
  to_email citext not null,
  status job_status not null default 'pending',
  provider_id text, error text,
  triggered_by uuid references auth.users
);

create table activity_log (            -- append-only (fără update/delete)
  actor_id uuid references auth.users,  -- null = sistem / link public
  actor_role user_role,
  actor_label text,                     -- ex. numele semnatarului la link public
  action text not null,                 -- vezi catalogul 9.9
  entity_type text, entity_id uuid,
  company_id uuid references companies, -- pentru „Log client”
  metadata jsonb default '{}'::jsonb,
  ip inet, user_agent text,
  created_at timestamptz default now()
);
create index on activity_log(actor_id, created_at desc);
create index on activity_log(company_id, created_at desc);

create table pdf_templates (
  header_html text not null,
  footer_html text not null,
  header_height_mm int not null default 25,
  footer_height_mm int not null default 15,
  accent_color text default '#1f6fb5',
  is_active boolean not null default false,
  updated_by uuid references auth.users
);
create unique index one_active_template on pdf_templates(is_active) where is_active;

create table rate_limits (
  key text primary key,          -- ex. "resend_custom:<user_id>:2026-10-04"
  count int not null default 0,
  expires_at timestamptz not null
);
```

### 7.9 Funcții DB

```sql
-- număr PV atomic
create function next_pv_number(p_year int) returns int
language sql as $$
  insert into pv_counters(year, last_number) values (p_year, 1)
  on conflict (year) do update set last_number = pv_counters.last_number + 1
  returning last_number;
$$;

-- helpers pentru RLS (security definer, stable)
create function auth_role() returns user_role ...      -- select role from profiles where id = auth.uid()
create function auth_company_id() returns uuid ...     -- select company_id from profiles where id = auth.uid()
create function is_staff() returns boolean ...         -- admin sau subadmin

-- căutare autocomplete (min 3 caractere, trigram + ILIKE pe text normalizat)
create function search_manufacturers(q text) returns setof manufacturers ...
create function search_equipment_types(q text) returns setof equipment_types ...
create function search_companies(q text) returns setof companies ...   -- după nume sau CUI
```

### 7.10 Seed (`supabase/seed.sql`)

**Tipuri intervenție:**

| code             | label                 | sort |
| ---------------- | --------------------- | ---- |
| montaj           | Montaj                | 10   |
| garantie         | Garanție              | 20   |
| revizie          | Revizie               | 30   |
| punere_functiune | Punere în funcțiune   | 40   |
| reparatie        | Reparație accidentală | 50   |

**Operațiuni** (ordinea globală = ordinea afișării la reuniune):

| sort | Operațiune                                                                                                                                                  | Montaj / Garanție / PIF | Revizie | Reparație |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------: | :-----: | :-------: |
| 10   | Demontat elemente de ambalare                                                                                                                               |           ✅            |         |           |
| 20   | Poziționare în hala de producție                                                                                                                            |           ✅            |         |           |
| 30   | Asamblat elemente componente ale mașinilor                                                                                                                  |           ✅            |   ✅    |    ✅     |
| 31   | Schimbat filtre                                                                                                                                             |                         |   ✅    |           |
| 32   | Schimbat uleiuri                                                                                                                                            |                         |   ✅    |           |
| 40   | Realizat legături hidraulice                                                                                                                                |           ✅            |   ✅    |    ✅     |
| 50   | Verificat nivelurile uleiurilor                                                                                                                             |           ✅            |   ✅    |    ✅     |
| 60   | Verificat presiunea aerului, diametrul conductei, volumul de aer, dacă corespunde indicatorilor ceruți de producător și cu care clientul a alimentat mașina |           ✅            |   ✅    |    ✅     |
| 70   | Realizat legături electrice, conectat cablurile de la mașină la tabloul mașinii                                                                             |           ✅            |   ✅    |    ✅     |
| 80   | Verificat conexiunea electrică realizată de client în tabloul mașinii                                                                                       |           ✅            |   ✅    |    ✅     |
| 90   | Verificat dacă clientul a conectat exhaustarea la mașină și îndeplinește condițiile indicate de producător                                                  |           ✅            |   ✅    |    ✅     |
| 100  | Verificat sensul de rotație al motoarelor                                                                                                                   |           ✅            |         |           |
| 110  | Verificat parametrii de funcționare și parametrizat în funcție de produsul care urmează să fie realizat                                                     |           ✅            |   ✅    |    ✅     |
| 120  | Instruit personalul operator                                                                                                                                |           ✅            |         |           |
| 130  | Făcut teste cu material                                                                                                                                     |           ✅            |   ✅    |    ✅     |
| 140  | Predat manualele mașinii                                                                                                                                    |           ✅            |         |           |

Verificare: Montaj = 14, Revizie = 11, Reparație = 9. ✔

**Producători inițiali:** Nanxing, Caravaggi, Vecoplan, Primultini, Paul Maschinenfabrik, Baschild, Sceat, Hundegger, Giardina Group, Heesemann, Wravor, O.M.A.R. Italia, Storti. Adminul completează restul din interfață.

**Logica reuniunii** (`packages/shared/operations.ts`):

```ts
export function operationsFor(selected: string[], map: TypeOpMap, ops: Operation[]): Operation[] {
  const ids = new Set(selected.flatMap((t) => map[t] ?? []));
  return ops.filter((o) => o.isActive && ids.has(o.id)).sort((a, b) => a.sortOrder - b.sortOrder);
}
```

Când utilizatorul debifează un tip, bifele operațiunilor care nu mai aparțin niciunui tip selectat se **șterg** din stare. Cele comune rămân bifate.

---

## 8. Securitate: RLS, storage, tokenuri

### 8.1 Principii

1. **RLS activ pe toate tabelele.** Fără politică = acces interzis.
2. **Citirile** din pagini se fac cu clientul Supabase al utilizatorului (cookie), deci RLS se aplică.
3. **Scrierile** se fac în Astro Actions:
   - se verifică întâi permisiunea cu `permissions.ts`;
   - apoi se scrie cu clientul utilizatorului acolo unde politica permite;
   - clientul service-role se folosește doar pentru operații de sistem: numerotare, versiuni, tokenuri, email_log, activity_log, migrare.
4. `activity_log` și `email_log`: fără politici de update/delete, nici pentru admin. Sunt append-only.

### 8.2 Politici principale (rezumat)

| Tabel                           | SELECT                                                                                                                                                    | INSERT / UPDATE                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| profiles                        | propriul rând; staff: toate                                                                                                                               | admin: toate; client: propriul rând (câmpuri limitate prin Action) |
| companies                       | staff: toate; technician: toate cu status ≠ rejected (coloane limitate prin view `companies_public`); client: propria firmă                               | prin Actions                                                       |
| company_representatives         | staff + technician: toate; client: firma lui                                                                                                              | admin, client (firma lui), technician (insert)                     |
| equipment                       | staff + technician: toate; client: firma lui                                                                                                              | staff, technician, client (firma lui)                              |
| manufacturers / equipment_types | toți autentificații                                                                                                                                       | insert: toți autentificații; update/delete: admin                  |
| service_reports                 | admin/subadmin: toate; technician: `technician_id = auth.uid()`; client: `company_id = auth_company_id() and status in ('finalized','pending_signature')` | prin Actions                                                       |
| service_report_versions         | ca service_reports (join), iar clientul vede și `pending_client_approval`                                                                                 | service role                                                       |
| activity_log                    | admin                                                                                                                                                     | service role                                                       |
| company_settings, pdf_templates | toți autentificații (citire)                                                                                                                              | admin                                                              |

### 8.3 Storage (bucket-uri private)

| Bucket        | Cale                                                                                                  | Cine citește                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `pdfs`        | `{company_id or 'legacy'}/{report_id}/v{n}_{file_base_name}.pdf`                                      | prin URL semnat (60 s) generat de server după verificarea permisiunii |
| `signatures`  | `technicians/{user_id}.png`, `representatives/{rep_id}.png`, `reports/{report_id}/{signature_id}.png` | doar server (sunt încorporate în PDF / afișate prin URL semnat)       |
| `branding`    | `logo.{ext}`                                                                                          | public (folosit în email-uri)                                         |
| `plates` (F2) | `{company_id}/{equipment_id}/{uuid}.jpg`                                                              | staff, technician, client (firma lui) prin URL semnat                 |
| `photos` (F2) | `{report_id}/{uuid}.jpg`                                                                              | ca PV-ul                                                              |

Descărcarea trece prin `/api/pdf/[reportId]?v=n`: se verifică permisiunea, se loghează `pv_downloaded` / `pv_viewed`, apoi redirect către URL-ul semnat.

### 8.4 Tokenuri pentru linkuri publice

- Se generează cu `crypto.randomBytes(32)` (base64url). În DB se salvează doar `sha256(token + TOKEN_PEPPER)`.
- Expiră după 7 zile. Sunt de unică folosință. La retrimiterea unui link nou, tokenul vechi devine `revoked`.
- Paginile publice (`/semnare/[token]`, `/aprobare/[token]`) au limită de cereri: 10 pe minut per IP.
- Pagina publică afișează doar PV-ul respectiv, nimic altceva.

### 8.5 Alte măsuri

- Limită la login: 5 încercări eșuate în 15 minute per username sau IP. Se loghează `login_failed`.
- Headere: CSP strict, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- Email custom: validare zod; limită 20 de trimiteri pe zi per utilizator (I7).
- GDPR:
  - notă de informare la înregistrare și pe pagina de semnare;
  - semnăturile de pe PV-urile finalizate rămân (obligație de arhivare);
  - ștergerea unui reprezentant elimină doar semnătura din profil.

---

## 9. Specificații funcționale — Faza 1

### 9.1 Hartă pagini

**Publice**

| Rută                                     | Scop                                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| `/login`                                 | Login cu email sau username + parolă. Logo și denumire din `company_settings` |
| `/recuperare-parola`, `/resetare-parola` | Flux standard Supabase, email trimis prin Resend                              |
| `/activare`                              | Callback invitație: setare parolă. Tehnicianul desenează și semnătura         |
| `/inregistrare`                          | Înregistrare firmă: CUI → ANAF → completare → status `pending_approval`       |
| `/aprobare/[token]`                      | Clientul aprobă sau respinge o modificare făcută de subadmin                  |
| `/semnare/[token]`                       | (F2) Semnare PV la distanță                                                   |
| `/auth/callback`                         | Schimb de cod Supabase                                                        |

**Autentificate** (prefix `/app`, cu layout pe rol)

| Rută                                                                                                              | admin |   subadmin    |  technician  |   client   |
| ----------------------------------------------------------------------------------------------------------------- | :---: | :-----------: | :----------: | :--------: |
| `/app` — dashboard pe rol                                                                                         |  ✅   |      ✅       |      ✅      |     ✅     |
| `/app/pv` — listă + filtre                                                                                        |  ✅   |      ✅       | ✅ (ale lui) | ✅ (firma) |
| `/app/pv/nou` — wizard                                                                                            |  ✅   |               |      ✅      |            |
| `/app/pv/[id]` — detaliu, versiuni, emailuri, acțiuni                                                             |  ✅   |      ✅       |      ✅      |     ✅     |
| `/app/pv/[id]/editeaza`                                                                                           |  ✅   |      ✅       |              |            |
| `/app/pv/drafturi`                                                                                                |  ✅   |               |      ✅      |            |
| `/app/firme`, `/app/firme/nou`, `/app/firme/[id]` (tab-uri: Date, Reprezentanți, Utilaje, PV-uri, **Log client**) |  ✅   | ✅ (fără Log) |  👁️ limitat  |            |
| `/app/firma` — firma mea (client)                                                                                 |       |               |              |     ✅     |
| `/app/utilaje`, `/app/utilaje/[id]` (fișă + istoric PV permis)                                                    |  ✅   |      ✅       |      ✅      | ✅ (firma) |
| `/app/tehnicieni`, `/app/tehnicieni/[id]` (profil + card **Jurnal activitate**)                                   |  ✅   |               |              |            |
| `/app/utilizatori` — subadmini, admini                                                                            |  ✅   |               |              |            |
| `/app/profil`                                                                                                     |  ✅   |      ✅       |      👁️      |     ✅     |
| `/app/aprobari` — modificări în așteptare                                                                         |  ✅   |      ✅       |              |     ✅     |
| `/app/admin/inregistrari` — firme de aprobat                                                                      |  ✅   |               |              |            |
| `/app/admin/setari` — date firmă, logo                                                                            |  ✅   |               |              |            |
| `/app/admin/sablon-pdf`                                                                                           |  ✅   |               |              |            |
| `/app/admin/operatiuni` — tipuri + operațiuni + mapare                                                            |  ✅   |               |              |            |
| `/app/admin/producatori`, `/app/admin/tipuri-echipament`                                                          |  ✅   |               |              |            |
| `/app/admin/potriviri` — PV migrate → firme                                                                       |  ✅   |               |              |            |
| `/app/admin/jurnal` — jurnal global, filtre                                                                       |  ✅   |               |              |            |
| `/app/admin/emailuri` — email_log, reîncercări                                                                    |  ✅   |               |              |            |

**API**

| Rută                             | Scop                                                                  |
| -------------------------------- | --------------------------------------------------------------------- |
| `/api/anaf?cui=`                 | Proxy server către ANAF (cache 24 h în memorie/DB, limită 1 cerere/s) |
| `/api/pdf/[reportId]`            | Descărcare / previzualizare cu verificare de permisiune + log         |
| `/api/cron/tokens`               | Remindere și expirări (zilnic)                                        |
| `/api/cron/retry`                | Reîncercare PDF-uri / emailuri eșuate (orar)                          |
| `/internal/pdf-html/[versionId]` | HTML pentru PDF, protejat cu secret                                   |
| `/api/plate-read`                | (F2) Citire plăcuță                                                   |

**UI general:** mobile-first (tehnicienii lucrează de pe telefon sau tabletă), cu sidebar pe desktop și bottom-nav pe mobil. Culoarea de accent vine din setări.

### 9.2 Autentificare și login cu parola WordPress

Login (`actions/auth.ts → login`):

1. Input: `identifier` (email sau username) + `password`.
2. Dacă `identifier` nu conține `@`, se caută `profiles.username` și se obține emailul.
3. `supabase.auth.signInWithPassword({ email, password })`. Dacă reușește → gata.
4. Dacă eșuează și există `legacy_passwords` pentru user:
   - `$P$…` / `$H$…` → verificare phpass (portable, 8192 iterații MD5);
   - `$wp$2y$…` (WordPress ≥ 6.8) → `bcrypt.compare( base64( HMAC-SHA384(key='wp-sha384', msg=trim(password)) ), '$2y$…'→'$2a$…' )`;
   - `$2y$…` simplu → `bcrypt.compare(password, hash)`.
5. Dacă verificarea trece:
   - `admin.auth.admin.updateUserById(id, { password })`;
   - șterge rândul din `legacy_passwords`;
   - repetă `signInWithPassword`;
   - log `legacy_password_migrated`.
6. Mesaj de eroare generic: „Date de autentificare incorecte”.
7. Log `login` / `login_failed`, actualizează `last_login_at`.

Teste unitare cu vectori reali: Claude Code generează hash-uri de test cu un container PHP + WordPress, pentru fiecare format.

Middleware (`middleware.ts`):

- citește sesiunea și profilul (rol, `is_active`, `company_id`) și le pune în `Astro.locals`;
- `/app/*` cere autentificare;
- `/app/admin/*` cere rol `admin`;
- utilizator inactiv → logout forțat.

### 9.3 Firme și ANAF

**Componenta `<CompanyCreateDialog>`** se folosește în admin, în wizard-ul PV și în pagina de înregistrare:

1. Câmp CUI. Se acceptă `RO12345678` sau `12345678`, iar „RO” și spațiile se elimină.
2. Butonul „Caută la ANAF” apelează `/api/anaf`. Se completează:
   - denumirea, din `date_generale.denumire`;
   - județul, localitatea și adresa, din adresa sediului social;
   - nr. Reg. Com.;
   - statusul de plătitor TVA.

   Toate rămân editabile. Calea exactă a câmpurilor se verifică pe răspunsul real în M3.

3. Dacă CUI-ul există deja în DB, se afișează „Firma există deja” cu link sau selecție. Nu se creează duplicat.
4. Dacă ANAF nu răspunde sau CUI-ul nu e găsit, se poate completa manual, cu avertisment, iar firma e marcată `anaf_checked_at = null`.
5. Câmpuri suplimentare: email master (obligatoriu), telefon, reprezentant implicit (nume, email, telefon).

**Statusuri firmă și tranziții:**

```
creată de admin/subadmin/tehnician ─► invited ──(clientul activează)──► active
                                   └─(fără email master)──► no_account
auto-înregistrare ─► pending_approval ─(admin aprobă)─► active
                                       └(admin respinge + motiv)─► rejected
```

- La crearea de către staff sau tehnician cu email master se trimite automat invitația (`invite_company`). Contul de client se creează cu `generateLink({ type: 'invite' })`, iar emailul îl trimitem noi prin Resend.
- Auto-înregistrare cu un CUI care există deja:
  - dacă firma are status `no_account` sau `invited`, cererea intră la aprobare ca „revendicare”;
  - dacă firma e `active`, apare mesajul „Firma are deja cont. Contactați office@woodexpert.ro”.
- Clientul poate edita datele firmei, mai puțin CUI-ul, și are buton „Actualizează din ANAF”.

### 9.4 Reprezentanți

- Lista din contul firmei: nume, email, telefon, semnătură (pad), marcaj „implicit”.
- Implicit există 1 reprezentant, creat la înregistrare. Clientul sau adminul poate adăuga alții.
- Semnătura se desenează în `<SignaturePad>`, se salvează ca PNG cu fundal transparent (trimmed) și se poate redesena.
- Un reprezentant dezactivat nu mai apare în wizard. PV-urile vechi rămân neatinse.

### 9.5 Registru utilaje (Faza 1, manual)

- Tab „Utilaje” pe firmă și pagina `/app/utilaje`.
- Formular „Adaugă utilaj”:
  - Producător și Tip echipament: autocomplete D11/D12;
  - Model (opțional), Serie (obligatoriu), An fabricație (obligatoriu), Note.
- Fișa utilajului: datele + lista PV-urilor (filtrată după permisiuni) + cine l-a adăugat și când.
- În wizard-ul PV, utilajul se alege din lista firmei sau se adaugă pe loc, cu același formular în modal. După salvare se selectează automat.

### 9.6 Autocomplete producători / tipuri (D11, D12)

Componenta `<CatalogAutocomplete kind="manufacturer|equipment_type">`:

1. Sub 3 caractere afișează doar „Scrieți minim 3 litere”.
2. De la 3 caractere: debounce 200 ms, apoi `search_manufacturers(q)`. Căutarea:
   - normalizează textul (fără diacritice, litere mici);
   - caută `ILIKE '%q%'`, iar rezultatele cu similaritate trigram > 0.3 vin în plus;
   - returnează maximum 10 rezultate, ordonate după potrivirea la început, apoi similaritate.
3. Dacă există rezultate, se afișează **doar** rezultatele.
4. Dacă nu există rezultate, apare o singură opțiune: **„+ Adaugă producător nou”**.
5. Click pe ea deschide un modal: „Nume producător” (precompletat cu textul tastat) + butonul **„Adaugă”**.
   - Server: inserează; dacă `name_normalized` există deja (cursă), returnează intrarea existentă.
   - Log `manufacturer_added`. Intrarea nouă se selectează automat.
6. Admin (`/app/admin/producatori`): listă cu coloanele „Adăugat de” și „Data”, editare nume, dezactivare. Ștergerea e permisă doar dacă intrarea nu e folosită.

### 9.7 Numerotare PV (D18)

- Alocare **doar la finalizare** (sau la trimiterea către semnare la distanță), cu `next_pv_number(year)`, unde `year` = anul din `report_date`.
- `pv_number = 'PV-' || year || '-' || lpad(seq, 4, '0')`.
- `file_base_name = pv_number + '_' + slug(company.name) + '_' + DD-MM-YYYY`.
  - `slug`: fără diacritice, MAJUSCULE, eliminate formele juridice de la final (SRL, S.R.L., SA, SNC, PFA, II, IF), caractere non-alfanumerice → `-`, maximum 40 de caractere.
  - Exemplu: „SALUT S.R.L.” → `PV-2026-0001_SALUT_04-10-2026`.
  - Versiunile ulterioare primesc sufixul `_v2`, `_v3` la fișier.
- Drafturile nu au număr. În listă apar ca „Draft · creat 04-10-2026”.

### 9.8 Versiuni, editare și aprobare (D19)

**Editare de către admin:**

1. `/app/pv/[id]/editeaza` deschide același wizard, precompletat din ultima versiune oficială.
2. La salvare:
   - se creează versiunea `n+1` cu status `official`, iar cea anterioară devine `superseded`;
   - se generează automat `change_summary` (diff pe câmpuri, ex. „Durata: 2 → 3 ore; Piese recomandate: modificat”);
   - se generează PDF-ul nou;
   - log `pv_edited`.
3. **Nu** se trimit emailuri automat. Pe pagina PV apare banner-ul: „Versiune nouă — [Retrimite]”.

**Editare de către subadmin:**

1. Același editor. La salvare se creează versiunea `n+1` cu status `pending_client_approval`. Se generează PDF-ul versiunii, cu filigran „PROPUNERE — NEAPROBAT”.
2. Se creează token `edit_approval`, trimis pe email-ul master al firmei (+ office@ în CC informativ).
3. Pagina `/aprobare/[token]`:
   - afișează diff-ul (vechi vs. nou, câmpurile modificate evidențiate) și PDF-ul propus;
   - butoane „Aprob” și „Resping”, cu motiv obligatoriu la respingere;
   - câmp „Numele dvs.”;
   - se salvează IP-ul și user-agent-ul.

   Un client logat poate aproba și din `/app/aprobari`.

4. Rezultat:
   - **Aprob** → versiunea devine `official`, cea anterioară `superseded`. PDF-ul final se regenerează fără filigran. Subadminul și office primesc notificare (`approval_result`).
   - **Resping** → versiunea devine `rejected`, cu motiv. Subadminul primește notificare.
5. Cât timp există o versiune în așteptare, nu se mai poate crea alta pentru același PV (UI blocat, cu mesaj).
6. Remindere și expirare: aceleași reguli ca la tokenuri (secțiunea 12.3). La expirare, versiunea devine `rejected` cu motivul „expirat”.

**Afișare pe pagina PV**, secțiunea „Versiuni”: listă cronologică cu `v1 · 04-10-2026 14:20 · Ion Popescu (tehnician) · creat`, apoi `v2 · … · admin · modificat: …`. Fiecare versiune are link de previzualizare sau descărcare.

### 9.9 Jurnal de activitate (catalog acțiuni)

`logActivity({ action, entityType, entityId, companyId, metadata })` se apelează din fiecare Action relevantă.

| Domeniu       | Acțiuni                                                                                                                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth          | `login`, `login_failed`, `logout`, `password_changed`, `password_reset_requested`, `legacy_password_migrated`, `account_activated`                                                                         |
| Profil        | `profile_updated`, `signature_updated`                                                                                                                                                                     |
| Firme         | `company_created`, `company_updated`, `company_anaf_refreshed`, `registration_submitted`, `registration_approved`, `registration_rejected`, `company_invited`                                              |
| Reprezentanți | `representative_added`, `representative_updated`, `representative_deactivated`                                                                                                                             |
| Utilaje       | `equipment_added`, `equipment_updated`, `equipment_plate_read` (F2)                                                                                                                                        |
| Catalog       | `manufacturer_added`, `equipment_type_added`, `manufacturer_updated`, `manufacturer_merged`                                                                                                                |
| PV            | `pv_draft_saved`, `pv_finalized`, `pv_viewed`, `pv_downloaded`, `pv_resent` (metadata: destinatari), `pv_edited`, `pv_edit_submitted_for_approval`, `pv_edit_approved`, `pv_edit_rejected`, `pv_cancelled` |
| Semnare (F2)  | `signature_link_sent`, `signature_reminder_sent`, `signature_signed_remote`, `signature_link_expired`                                                                                                      |
| Admin         | `user_created`, `user_deactivated`, `settings_updated`, `pdf_template_updated`, `operations_updated`, `legacy_report_matched`                                                                              |

**Afișare:**

- **Card „Jurnal activitate”** pe profilul tehnicianului (admin): ultimele 50 de acțiuni, cu „Vezi tot”, filtre pe acțiune și interval, export CSV.
- **Tab „Log client”** pe firmă (admin): toate acțiunile cu `company_id` al firmei, făcute de utilizatorii clientului, de tehnicieni sau de staff, cu coloana „Cine”.
- `/app/admin/jurnal`: jurnalul global.
- Mesajele sunt în română, generate dintr-un dicționar `action → template` (ex. „Ion Popescu a retrimis PV-2026-0012 către x@y.ro”).

### 9.10 Retrimitere PV

Pe pagina PV, butonul **„Trimite / Retrimite”** deschide un dialog cu bife:

- tehnicianul (doar staff);
- email master firmă;
- reprezentant semnatar;
- office@;
- **„Alt email”**: input, maximum 5 adrese.

Opțiunile se filtrează după rol (secțiunea 6). Clientul vede: „Email-ul din profil” + „Alt email”.

Se trimite **ultima versiune oficială**, iar `email_log` și `activity_log` se completează.

### 9.11 Dashboard-uri

- **Admin / Subadmin:**
  - carduri: PV-uri luna curentă, drafturi deschise, în așteptarea semnăturii (F2), modificări în așteptare, înregistrări de aprobat (admin), emailuri eșuate;
  - lista ultimelor 10 PV-uri.
- **Tehnician:**
  - buton mare „PV nou”, drafturile mele, ultimele mele PV-uri;
  - în F2 și „Semnături în așteptare”.
- **Client:**
  - ultimele PV-uri ale firmei, aprobări în așteptare, utilajele mele;
  - buton „Adaugă utilaj”.

**Lista PV** (`/app/pv`):

- căutare după număr sau firmă;
- filtre: tehnician (staff), tip intervenție, status, interval de dată, producător;
- sortare după dată;
- paginare server-side, 25 pe pagină;
- export CSV (admin).

### 9.12 Setări (admin)

- **`/app/admin/setari`:**
  - upload logo (PNG/SVG/JPG, maximum 2 MB, cu previzualizare);
  - denumire legală, CUI, Reg. Com., adresă, website, telefon, email, descriere scurtă, office email.
  - Toate sunt disponibile ca variabile în șablonul PDF și în emailuri.
- **`/app/admin/sablon-pdf` (Faza 1, simplu):**
  - header implicit: logo stânga, denumire + date contact dreapta, titlul documentului;
  - footer implicit, ca acum: `www.woodexpert.ro / 021.330.03.43 / office@woodexpert.ro · pagina X din Y`;
  - se poate alege culoarea de accent.
  - În Faza 2 pagina devine editor WYSIWYG.
- **`/app/admin/operatiuni`:**
  - CRUD operațiuni (text, ordine prin drag & drop, activ/inactiv);
  - matrice tip × operațiune cu bife.
  - Modificările afectează doar PV-urile noi, pentru că snapshot-ul păstrează textele vechi.
- **`/app/utilizatori` + `/app/tehnicieni`:**
  - creare tehnician sau subadmin (nume, email, telefon, username), apoi email de activare;
  - dezactivare / reactivare;
  - resetare semnătură tehnician (îi permite să redeseneze).

---

## 10. Formularul PV (wizard) — specificație completă

Un singur React island: `<ReportWizard mode="create|edit" />`.

- Starea se ține în `react-hook-form`, cu schema zod `reportDraftSchema` (parțial) / `reportFinalSchema` (complet).
- Autosave pe server la fiecare 20 s și la schimbarea pasului (`saveDraft`), plus manual cu butonul „Salvează și continuă mai târziu”.
- În Faza 2, draftul se salvează și în IndexedDB.

### Pasul 1 — Client și utilaj

| Câmp                                     | Tip                                                                                                   | Regulă                                 |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Client — firmă *                         | Autocomplete firme (nume sau CUI, min. 3 caractere) + „+ Adaugă firmă nouă” → `<CompanyCreateDialog>` | Obligatoriu                            |
| Localitate *                             | Auto din firmă                                                                                        | Editabil; se salvează doar în snapshot |
| Email client *                           | Auto: email master                                                                                    | Editabil; validare email               |
| Telefon client *                         | Auto din firmă                                                                                        | Editabil                               |
| Utilaj *                                 | Select din utilajele firmei (afișare: „Producător · Tip · Serie · An”) + „+ Adaugă utilaj” (modal)    | Obligatoriu                            |
| Tip echipament / Producător / Serie / An | Read-only, afișate din utilajul ales (cu link „Editează utilajul”, după permisiuni)                   |                                        |

Dacă firma nu are utilaje, modalul „Adaugă utilaj” se deschide direct.

### Pasul 2 — Intervenția

| Câmp                                                       | Tip                                                                                                               | Regulă                               |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Tipul intervenției *                                       | Checkbox-uri (5)                                                                                                  | Minim 1                              |
| Starea echipamentului la începutul intervenției            | Textarea                                                                                                          | Opțional                             |
| Operațiuni efectuate                                       | Checkbox-uri = reuniune (D9), în ordinea globală, + „Selectează toate” / „Deselectează toate”                     | Apar doar după alegerea unui tip; I6 |
| Alte operațiuni efectuate                                  | Textarea                                                                                                          |                                      |
| Durata intervenției (ore)                                  | Number, pas 0,5, min 0,5, max 999                                                                                 | Opțional (ca acum)                   |
| Materiale consumate                                        | Textarea                                                                                                          |                                      |
| Piese de schimb recomandate                                | Textarea                                                                                                          |                                      |
| Observații asupra echipamentului la sfârșitul intervenției | Radio: „Echipamentul funcționează la parametri” / „Echipamentul rămâne oprit până la schimbarea pieselor defecte” | Obligatoriu (I4)                     |
| Alte observații asupra echipamentului la sfârșit           | Textarea                                                                                                          |                                      |
| Alte observații reprezentant Wood Expert Industry          | Textarea                                                                                                          |                                      |
| Data întocmirii PV *                                       | Date, implicit azi (Europe/Bucharest)                                                                             | Nu în viitor                         |
| Reprezentant Wood Expert Industry                          | Read-only = tehnicianul logat                                                                                     | (I8)                                 |
| Poze înainte/după (F2)                                     | Toggle „Adaugă poze” → upload                                                                                     | Opțional                             |

### Pasul 3 — Revizuire și semnare

1. **Rezumat read-only** al tuturor câmpurilor, în același stil cu pagina de revizuire actuală. Fiecare secțiune are link „Modifică”, care duce înapoi la pasul respectiv.
2. **Observații reprezentant client:** textarea.
3. **Reprezentant client:**
   - se precompletează reprezentantul implicit al firmei;
   - un dropdown oferă ceilalți reprezentanți plus opțiunea „Altă persoană…”;
   - „Altă persoană…” deschide câmpurile nume * și email (opțional), plus bifa „Salvează ca reprezentant al firmei”.
4. **Modul de semnare:**
   - **„Semnează acum (reprezentantul este prezent)”**
     - Dacă reprezentantul are semnătură salvată, aceasta se afișează, împreună cu bifa obligatorie _„Confirm că sunt [Nume] și aplic semnătura mea salvată pe acest proces verbal”_ și link-ul „Semnez din nou” (deschide pad-ul).
     - Dacă nu are semnătură salvată sau e o persoană nouă, se deschide pad-ul pe ecran complet (landscape pe mobil) cu butoanele „Șterge” și „Gata”, plus bifa „Salvează semnătura în profilul reprezentantului” (implicit bifată pentru reprezentanții firmei).
   - **„Trimite spre semnare la distanță”** (F2; în Faza 1 opțiunea apare dezactivată, cu eticheta „în curând”).
5. Butonul **„Finalizează și trimite”** (onsite) execută `finalizeReport` (secțiunea 3):
   - ecran de progres: Număr alocat ✓ → PDF generat ✓ → Email trimis ✓;
   - apoi redirect la `/app/pv/[id]`, cu butoanele Descarcă și Previzualizează.

**Validări vizibile:**

- câmpurile obligatorii goale se marchează cu roșu, iar la „Următorul” pagina derulează la prima eroare;
- nu se poate trece de pasul 1 fără firmă și utilaj, nici de pasul 2 fără tip intervenție și stare finală.

**Mobil:**

- butoanele „Înapoi” / „Următorul” sunt fixe jos, iar ținta de atingere a checkbox-urilor e de minimum 44 px;
- textele lungi ale operațiunilor se încadrează pe mai multe rânduri;
- indicator de pași (1 Client & utilaj · 2 Intervenție · 3 Revizuire & semnare).

---

## 11. Generarea PDF

### 11.1 Serviciul `apps/pdf`

- `POST /api/render` cu header-ul `x-pdf-secret`.
- Body: `{ html, headerTemplate, footerTemplate, marginTopMm, marginBottomMm }`.
- Rulează `puppeteer-core` + `@sparticuz/chromium`:
  - `page.setContent(html, { waitUntil: 'networkidle0' })`;
  - `page.pdf({ format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate, footerTemplate, margin })`.
- Returnează `application/pdf`.
- Configurare Vercel: `memory: 1769`, `maxDuration: 60`, regiunea `fra1`.
- **Fonturi:** Chromium serverless nu are fonturi cu diacritice românești garantate.
  - Se încorporează **Inter** (sau Roboto) ca `@font-face` base64 în `html`, **și** în `headerTemplate` / `footerTemplate`, care sunt izolate și nu moștenesc fonturile paginii.
  - Imaginile din header/footer (logo) se pun ca data URI, pentru că template-urile nu încarcă URL-uri externe.

### 11.2 Layout document (A4, margini 15 mm lateral)

- **Header:**
  - logo stânga, date firmă dreapta;
  - sub ele: „PROCES VERBAL DE SERVICE” + `PV-2026-0001 · 04-10-2026`.
- **Corp:** reproduce structura PDF-ului actual, cu etichete bold și valori sub ele, grid pe 2–3 coloane unde e cazul (Client | Localitate; Email | Telefon; Producător | Serie | An):
  1. Date client
  2. Date echipament
  3. Tipul intervenției (lista tipurilor)
  4. Starea la început
  5. Operațiuni efectuate (doar cele bifate, cu ✓)
  6. Alte operațiuni
  7. Durată, materiale, piese
  8. Observații la final (opțiunea aleasă)
  9. Alte observații
  10. Observații reprezentant WEX
  11. Observații reprezentant client
  12. **Bloc semnături** pe 2 coloane: „Reprezentant Wood Expert Industry” (nume + semnătură tehnician) | „Reprezentant client” (nume + semnătură + mențiunea modului: „Semnat pe loc” / „Semnătură salvată, confirmată pe loc” / „Semnat electronic la distanță la 05-10-2026 10:14, IP …”)
- **Footer:** text din setări + `pagina <span class="pageNumber"></span> din <span class="totalPages"></span>`.
- **Reguli de paginare:**
  - `break-inside: avoid` pe fiecare grup câmp + valoare și pe blocul de semnături;
  - **fără pagină goală la final**: niciun `page-break-after` pe ultimul element, iar marginile se testează (bug-ul din PDF-ul actual).
- **Filigran** „PROPUNERE — NEAPROBAT” pentru versiunile `pending_client_approval`, „ANULAT” pentru `cancelled`.
- **Metadate PDF:** Title = `file_base_name`, Author = „Wood Expert Industry”.

### 11.3 Variabile disponibile în header/footer

`{{logo}} {{denumire}} {{cui}} {{reg_com}} {{adresa}} {{website}} {{telefon}} {{email}} {{descriere}} {{numar_pv}} {{data_pv}} {{firma_client}} {{pagina}} {{total_pagini}}`

La randare, `{{pagina}}` devine `<span class="pageNumber">`, iar `{{total_pagini}}` devine `<span class="totalPages">`.

---

## 12. Email-uri

### 12.1 Configurare

- Resend, domeniul `woodexpert.ro` verificat: SPF, DKIM și DMARC adăugate în DNS (secțiunea 15).
- From: `Wood Expert Industry Service <no-reply@woodexpert.ro>`. Reply-To: `office@woodexpert.ro`.
- Șabloane React Email în `apps/web/src/lib/email/templates/`. Fiecare are logo din setări și footer cu datele firmei.
- Destinatarii se deduplică întotdeauna case-insensitive, înainte de trimitere.
- Fiecare destinatar primește un email separat (nu CC), ca să nu se expună adresele între ele. Fiecare trimitere are rândul ei în `email_log`.

### 12.2 Catalog

| Kind                                  | Destinatari                                             | Subiect                                                      | Atașament  |
| ------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------ | ---------- |
| `pv_final`                            | tehnician, email master, reprezentant semnatar, office@ | `Proces verbal de service PV-2026-0001 — SALUT — 04-10-2026` | PDF        |
| `pv_resend`                           | aleși în dialog                                         | idem + „(retrimis)” sau „(versiunea 2)”                      | PDF        |
| `approval_request`                    | email master (+ office@)                                | `Solicitare aprobare modificare PV-2026-0001`                | PDF propus |
| `approval_reminder`                   | idem                                                    | `Reamintire: …`                                              | —          |
| `approval_result`                     | subadmin autor, office@                                 | `Modificarea PV-2026-0001 a fost aprobată / respinsă`        | —          |
| `signature_request` (F2)              | email master + reprezentant                             | `Semnați procesul verbal PV-2026-0001`                       | — (link)   |
| `signature_reminder` (F2)             | idem                                                    | `Reamintire: …`                                              | —          |
| `signature_expired` (F2)              | tehnician, office@                                      | `Link de semnare expirat — PV-2026-0001`                     | —          |
| `invite_company`                      | email master                                            | `Contul firmei dvs. pe platforma de service Wood Expert`     | —          |
| `invite_technician`                   | tehnician                                               | `Activați contul de tehnician`                               | —          |
| `registration_received`               | client + admin (office@)                                | `Cerere de înregistrare primită`                             | —          |
| `registration_approved` / `_rejected` | client                                                  |                                                              | —          |
| `password_reset`                      | utilizator                                              |                                                              | —          |

### 12.3 Remindere și expirări (cron zilnic, 09:00 Europe/Bucharest)

Pentru tokenurile `active`:

- **la 48 h și la 96 h** după creare → reminder;
- **la 144 h** → reminder „expiră mâine”;
- **la 168 h** → `expired`, plus efectul:
  - semnătură: PV-ul devine `signature_expired` și se notifică tehnicianul, care poate retrimite un link nou;
  - aprobare: versiunea devine `rejected` („expirat”).

Programarea Vercel Cron e în UTC, deci se rulează orar și codul verifică ora locală. Alternativa e să se accepte decalajul de o oră între vară și iarnă.

---

## 13. Specificații funcționale — Faza 2

### 13.1 Cititor de plăcuțe cu AI (D14)

**Unde apare:** butonul „📷 Citește plăcuța” din modalul „Adaugă utilaj”, disponibil în wizard, pe firmă și în contul clientului.

**Flux:**

1. Utilizatorul face o poză cu `<input type="file" accept="image/*" capture="environment">` sau încarcă o imagine existentă.
2. În browser, imaginea se micșorează la maximum 1600 px pe latura lungă și se comprimă JPEG (calitate 0,85), cu orientarea corectată (EXIF).
3. Se face `POST /api/plate-read` (multipart). Serverul:
   - verifică autentificarea;
   - aplică limita de 30 de citiri pe oră per utilizator;
   - încarcă temporar imaginea în `plates/tmp/`;
   - apelează Claude API cu imaginea și promptul de mai jos, cu ieșire JSON prin tool use / schemă;
   - cere un JSON validat cu zod.
4. Răspunsul AI:

   ```json
   {
     "manufacturer": { "value": "Paul Maschinenfabrik", "confidence": 0.95 },
     "model": { "value": "PMR 400", "confidence": 0.9 },
     "serialNumber": { "value": "123456", "confidence": 0.85 },
     "year": { "value": 2021, "confidence": 0.9 },
     "equipmentTypeRo": { "value": "Multilamă de tivit", "confidence": 0.6, "inferred": true },
     "rawText": "…tot textul citit de pe plăcuță…",
     "warnings": ["anul nu este lizibil"]
   }
   ```

5. Serverul face potrivirea cu catalogul:
   - `manufacturer.value` → `search_manufacturers` (trigram ≥ 0,5): dacă există, se propune intrarea existentă; dacă nu, se propune „Adaugă producător nou: X”, cu modalul din D11 precompletat;
   - la fel pentru `equipmentTypeRo` → `equipment_types`.
6. Formularul se afișează **precompletat și editabil**:
   - câmpurile cu încredere < 0,7 sunt marcate cu galben, cu textul „verificați”;
   - poza plăcuței apare alături, cu zoom.
7. Butonul **„Confirmă și salvează utilajul”**:
   - inserează în `equipment` cu `created_via='plate_ai'` și `ai_extraction` (JSON-ul brut);
   - mută poza din `tmp/` în `plates/{company_id}/{equipment_id}/`;
   - log `equipment_plate_read` + `equipment_added`.
8. Dacă utilizatorul anulează, poza temporară se șterge (cron-ul curăță `tmp/` mai vechi de 24 h).
9. **Offline:** butonul e dezactivat, cu mesajul „Necesită conexiune — completați manual”. Formularul manual funcționează.

**Prompt de sistem (de rafinat pe 10–20 de poze reale):**

> Ești un sistem de extragere de date de pe plăcuțe de identificare ale utilajelor industriale de prelucrare a lemnului. Plăcuțele sunt în engleză sau italiană.
>
> Câmpuri echivalente:
>
> - Producător = Manufacturer / Costruttore / Fabbricante / Hersteller;
> - Serie = Serial No. / S/N / Matricola / N° di serie / Numero di serie;
> - An = Year / Anno / Anno di costruzione / Baujahr;
> - Model = Model / Type / Tipo / Modello.
>
> Returnează exact valorile de pe plăcuță, fără a le corecta. Pentru `equipmentTypeRo` deduci tipul utilajului în română (ex. „Multilamă”, „Mașină de aplicat cant”, „Centru de prelucrare CNC”, „Fierăstrău panglică”, „Presă”) din model sau descriere și marchezi `inferred: true`.
>
> Dacă un câmp nu se vede, returnezi `null` cu `confidence: 0`. Nu inventa.

**Set de test:** 20 de poze reale de plăcuțe (EN + IT, în condiții bune și proaste) în `apps/web/tests/fixtures/plates/`, cu valorile corecte în `expected.json`. Un script raportează acuratețea pe câmp. Ținta: ≥ 90% pe serie și producător.

### 13.2 Semnare la distanță (D15)

1. În pasul 3, tehnicianul alege „Trimite spre semnare la distanță”. Server:
   - alocă număr PV;
   - salvează versiunea 1 cu status `official`, dar PV-ul primește `status='pending_signature'`;
   - creează tokenul `remote_signature`;
   - trimite `signature_request` pe email-ul master + email-ul reprezentantului ales (deduplicat).
2. PV-ul apare în „Semnături în așteptare” (tehnician, staff, client logat). Clientul logat poate semna și din cont.
3. Pagina `/semnare/[token]`:
   - logo, titlu, rezumatul complet al PV-ului (HTML, ca pasul 3, read-only);
   - câmpul „Observații reprezentant client”;
   - numele semnatarului (precompletat, editabil);
   - semnătura salvată + bifa de confirmare, sau pad;
   - bifa obligatorie „Am citit procesul verbal și sunt de acord cu conținutul lui”;
   - butonul „Semnează”;
   - nota GDPR.
4. La semnare:
   - salvare în `report_signatures` (mode `remote`, IP, user-agent, ora);
   - token `used`; PV-ul devine `finalized`;
   - se generează PDF-ul și se trimite `pv_final` (aceleași reguli de destinatari);
   - log `signature_signed_remote`.
5. Remindere și expirare: secțiunea 12.3. Tehnicianul sau staff-ul are butonul „Retrimite link” (revocă tokenul vechi și creează unul nou, cu termen tot de 7 zile).
6. **Mențiune legală în PDF:** „Semnat electronic la distanță, prin link unic trimis la adresa x@y.ro, la data/ora …, IP …”. Este semnătură electronică simplă; jurnalul de audit e păstrat.

### 13.3 PWA și mod offline

- **`@vite-pwa/astro`:**
  - manifest (nume „WEX Service”, iconuri din logo, `display: standalone`, `start_url: /app`);
  - service worker cu precache pentru shell și wizard și runtime cache `NetworkFirst` pentru pagini.
- **Date în cache** (Dexie / IndexedDB), sincronizate la login și apoi la 15 minute când există conexiune:
  - firme (doar câmpurile din `companies_public`), reprezentanți (inclusiv semnăturile salvate, ca data URL), utilaje;
  - producători, tipuri echipament, operațiuni + mapare, profilul tehnicianului.
- **Ce funcționează offline:**
  - completarea completă a unui PV pentru firme și utilaje existente în cache;
  - adăugarea unui utilaj nou (manual) sau a unei firme noi „provizorii” (fără ANAF; verificarea ANAF se face la sincronizare);
  - semnarea pe loc.
- **Coada de sincronizare** (`outbox` în Dexie):
  - fiecare PV are `client_uuid` generat pe device;
  - la revenirea online (eveniment `online`, deschiderea aplicației, sau Background Sync acolo unde e suportat) se trimit în ordine: firme noi → utilaje noi → `finalizeReport`;
  - serverul e **idempotent** pe `client_uuid` (nu creează dubluri dacă cererea se repetă).
- **Numărul PV se alocă abia pe server.** Offline, PV-ul apare „În așteptarea sincronizării”.
- **Indicator în UI:** bulină „Offline” plus numărul de elemente în coadă.
- **Sesiune:** dacă tokenul Supabase expiră offline, utilizatorul poate continua drafturile local. La revenire i se cere re-login înainte de sincronizare, iar datele din coadă se păstrează.
- **Conflicte:** dacă firma sau utilajul creat offline există deja online (același CUI sau aceeași serie), serverul le leagă de entitatea existentă și raportează asta în UI.

### 13.4 Editor WYSIWYG header/footer

- `/app/admin/sablon-pdf` cu două editoare **TipTap**, unul pentru Header și unul pentru Footer.
- Extensii: bold/italic/underline, mărime font, culoare, aliniere, imagine (upload în `branding/`, inserată ca data URI la randare), tabel (pentru layout pe coloane), linie orizontală.
- Meniul „Inserează variabilă” oferă variabilele din 11.3.
- Câmpuri pentru înălțimea header-ului și a footer-ului (mm).
- **Previzualizare live:** butonul „Generează PDF de test” folosește ultimul PV real sau un PV demo.
- **Versionare:** fiecare salvare creează un rând nou în `pdf_templates`, cu butonul „Revino la versiunea anterioară”.
- Sanitizare HTML pe server (allowlist de tag-uri și atribute) înainte de salvare.

### 13.5 Poze înainte/după (D25)

- La pasul 2 există toggle-ul „Adaugă poze înainte/după” (implicit oprit). Când e pornit apar două zone: „Înainte” și „După”.
- Maximum 6 poze pe zonă, redimensionate la 1600 px și JPEG.
- În PDF apar într-o secțiune „Fotografii” la final, într-un grid de 2 coloane, cu maximum 6 pe pagină.

---

## 14. Migrarea din WordPress

### 14.1 Ce îmi trebuie de la tine (George)

1. **Dump SQL** al bazei WordPress (phpMyAdmin → Export sau `wp db export`). Minim tabelele: `wp_users`, `wp_usermeta`, `wp_gf_form`, `wp_gf_form_meta`, `wp_gf_entry`, `wp_gf_entry_meta`. Prefixul poate fi altul decât `wp_`.
2. **Exportul JSON al formularului** din Gravity Forms (Forms → Import/Export → Export Forms). Conține ID-urile câmpurilor.
3. **Folderul de semnături:** `wp-content/uploads/gravity_forms/signatures/` (zip).
4. **Numele rolului WordPress folosit pentru tehnicieni** (sau îl identificăm din `wp_capabilities`).
5. Confirmarea versiunii WordPress (pentru formatul hash-urilor).

Fișierele se pun local în `scripts/migration/input/`, folder **exclus din git** (`.gitignore`), pentru că conțin date personale și hash-uri.

### 14.2 Pași

1. **`docker-compose.yml`** pornește MySQL 8 local și importă dump-ul.
2. **`field-map.json`**, generat semi-automat din `wp_gf_form_meta.display_meta`: maparea `field_id` / `input_id` (ex. `"15.3"` pentru bife) → cheile din snapshot (7.7). Claude Code generează propunerea, iar George o verifică.
3. **`01-users.ts`:**
   - selectează utilizatorii cu rolul de tehnician;
   - pentru fiecare: `auth.admin.createUser({ email, email_confirm: true, password: <random 32> })` → `profiles` (role `technician`, `full_name` din `display_name` sau `first_name` + `last_name`, `username` = `user_login`, `legacy_wp_user_id`) → `legacy_passwords` cu `user_pass`;
   - adminul (George) se creează separat, nou, cu rol `admin`;
   - script idempotent (sare peste `legacy_wp_user_id` existent).
4. **`02-reports.ts`:**
   - pentru fiecare `wp_gf_entry` cu `status='active'` din formularul PV, în ordine cronologică:
     - construiește snapshot-ul din `entry_meta` folosind `field-map.json`;
     - `technician_id` din `entry.created_by` → `legacy_wp_user_id`; dacă lipsește, potrivire după câmpul „Nume reprezentant Wood Expert Industry”; altfel intră în raport ca „neatribuit”;
     - `legacy=true`, `legacy_wp_entry_id`, `legacy_company_text` = câmpul „Clinet - firmă”, `company_id=null`;
     - operațiunile: textul din WP e potrivit cu `operations.label` (normalizat). Ce nu se potrivește se păstrează ca text, cu `id: null`;
     - durata: se parsează numărul din text („24 ore” → 24); dacă nu se poate, se păstrează `durationText`;
     - observații final: maparea textului la enum;
     - numerotare: `next_pv_number(year(date_created))`, în ordine cronologică;
     - versiunea 1 `official`, `created_by` = tehnicianul, status `finalized`.
   - Drafturile Gravity Forms („Save and continue”) **nu** se migrează. Tehnicienii le finalizează în WP înainte de cutover.
5. **`03-signatures.ts`:** pentru fiecare valoare de câmp semnătură, fișierul din zip se încarcă în `signatures/reports/{report_id}/legacy.png` și se creează rândul în `report_signatures` (mode `onsite`).
6. **`04-generate-pdfs.ts`:** regenerează PDF-ul fiecărui PV migrat cu noul șablon, în batch-uri de 5 în paralel, cu reluare la eroare. Gravity PDF generează PDF-urile la cerere, deci nu există fișiere vechi de copiat.
7. **`05-verify.ts`:** raport final:
   - număr de tehnicieni WP vs. migrați;
   - număr de intrări GF vs. PV-uri;
   - PV-uri pe tehnician;
   - PV-uri neatribuite;
   - operațiuni nepotrivite;
   - semnături lipsă.

   Se verifică manual 10 PDF-uri.

### 14.3 Ecranul „Potriviri” (`/app/admin/potriviri`)

- Listă cu PV-urile migrate care au `company_id = null`, grupate după `legacy_company_text` normalizat.
- Pentru fiecare grup se afișează firmele candidate (trigram pe nume, plus potrivire pe email-ul clientului din PV).
- Acțiuni:
  - **„Atașează la [firmă]”**: se aplică pe tot grupul;
  - **„Creează firmă (ANAF) și atașează”**;
  - **„Ignoră”**.
- La atașare se setează `company_id`; snapshot-ul **nu** se modifică.
- Log `legacy_report_matched`.
- Când o firmă nouă devine `active`, adminul vede notificarea „Există N PV-uri migrate care ar putea aparține acestei firme”.

---

## 15. Infrastructură, deploy, DNS

| Componentă                 | Setare                                                                                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase                   | Proiect nou, plan **Pro** (fără pauză), regiune **EU Central (Frankfurt)**, backup zilnic. Auth: dezactivat sign-up public direct (înregistrarea trece prin Action), SMTP custom = Resend, Site URL = `https://service.woodexpert.ro`, redirect URLs          |
| Vercel — `wex-service-web` | Root `apps/web`, plan **Pro**, regiune functions `fra1`, domeniu `service.woodexpert.ro`, cron în `vercel.json`                                                                                                                                               |
| Vercel — `wex-service-pdf` | Root `apps/pdf`, `fra1`, fără domeniu public custom (URL `*.vercel.app` + secret)                                                                                                                                                                             |
| Resend                     | Domeniu `woodexpert.ro`. Adaugi în DNS înregistrările date de Resend (DKIM `resend._domainkey`, MX + SPF pe subdomeniul de bounce)                                                                                                                            |
| DNS woodexpert.ro          | `CNAME service → cname.vercel-dns.com`. DMARC dacă nu există: `_dmarc TXT "v=DMARC1; p=none; rua=mailto:office@woodexpert.ro"`. **Atenție:** dacă există deja un SPF pe domeniul principal, nu se adaugă un al doilea; Resend folosește subdomeniul de bounce |
| Anthropic (F2)             | Cheie API dedicată aplicației, cu limită de cheltuieli setată în consolă                                                                                                                                                                                      |
| Medii                      | `local` (Supabase CLI + `supabase start`), `preview` (branch-uri Vercel + proiect Supabase de staging), `production`                                                                                                                                          |
| CI                         | GitHub Actions: lint, typecheck, Vitest, teste RLS pe Supabase local, Playwright pe preview                                                                                                                                                                   |
| Monitorizare               | Vercel logs + Sentry (opțional, plan gratuit), alertă email la `pdf_status` / `email_status` = `failed`                                                                                                                                                       |

Costuri lunare recurente: Vercel Pro, Supabase Pro, Resend (planul gratuit poate ajunge la volumul actual; se verifică) și Claude API (cenți per plăcuță citită). Prețurile exacte se verifică la momentul contractării.

---

## 16. Milestone-uri și criterii de acceptanță

Ordinea e obligatorie. Fiecare milestone se încheie cu:

- teste trecute;
- deploy pe preview;
- verificare de către George.

### FAZA 1

**M0 — Fundație**

- Monorepo pnpm, Astro + React + Tailwind + shadcn, `apps/pdf` schelet, `packages/shared`.
- Supabase local (CLI), primele migrări (extensii, enum-uri), generare tipuri.
- ESLint, Prettier, TS strict, Vitest, Playwright, GitHub Actions.
- ✅ `pnpm dev` pornește; CI verde; deploy preview pe Vercel funcțional.

**M1 — Auth, roluri, profiluri**

- Tabele `profiles`, `legacy_passwords`, helper-ele RLS, middleware, layout pe rol, login cu email/username, recuperare parolă, activare prin invitație.
- Verificare hash WP (3 formate) + migrare la prima logare.
- Admin: CRUD tehnicieni/subadmini, dezactivare. Tehnicianul desenează semnătura la activare.
- `activity_log` + `logActivity()`.
- ✅ Teste unitare hash WP cu vectori reali; e2e: login pe fiecare rol; tehnicianul nu poate accesa `/app/admin/*`; utilizatorul inactiv e delogat.

**M2 — Setări firmă și șablon PDF de bază**

- `company_settings`, upload logo, `/app/admin/setari`.
- `apps/pdf` funcțional (Chromium, fonturi cu diacritice), header/footer implicit.
- ✅ Un PDF de test cu „ăâîșț ĂÂÎȘȚ” se randează corect, cu logo, „pagina 1 din 2” și fără pagină goală la final.

**M3 — Firme, ANAF, reprezentanți, înregistrare**

- Tabele + RLS, `/api/anaf` (cache, limită 1 cerere/s, tratare erori), `<CompanyCreateDialog>`.
- Auto-înregistrare → aprobare admin; invitații; revendicare CUI existent.
- Reprezentanți cu semnături; contul clientului (`/app/firma`).
- ✅ CUI real → date completate; CUI duplicat blocat; fluxul complet înregistrare → aprobare → login client; clientul nu vede altă firmă (test RLS).

**M4 — Catalog și registru utilaje**

- Producători, tipuri, intervenții, operațiuni + seed; `<CatalogAutocomplete>` cu flow-ul D11; admin producători/tipuri/operațiuni.
- Utilaje: CRUD, unicitate producător + serie, fișă utilaj.
- ✅ „pri” → „Primultini” și fără opțiunea „Adaugă”; „xyz” → doar „Adaugă producător nou” → modal → selectat automat; „adăugat de” vizibil în admin; serie duplicată blocată.

**M5 — Wizard PV + finalizare (onsite)**

- `service_reports`, `versions`, `report_signatures`, `pv_counters`; schemele zod; `operationsFor()` + teste.
- Wizard în 3 pași, autosave draft, „Salvează și continuă mai târziu”, lista drafturi.
- Semnătură: precompletare + confirmare / pad nou / reprezentant nou, cu salvare opțională.
- `finalizeReport`: număr → snapshot → PDF → Storage.
- ✅ Montaj + Punere în funcțiune afișează 14 operațiuni o singură dată; Montaj + Revizie afișează 16; debifarea unui tip curăță doar bifele care nu mai aparțin; numerele sunt consecutive și sub 10 finalizări concurente nu apar dubluri (test); PDF-ul conține toate câmpurile și ambele semnături.

**M6 — Email-uri**

- Resend + domeniu, șabloane React Email, `email_log`, `pv_final` cu deduplicare, retrimitere (dialog pe rol, limită custom), cron de reîncercare.
- ✅ Finalizarea trimite exact câte un email per adresă unică; Reply-To = office@; emailul trece SPF/DKIM (verificat cu mail-tester sau Gmail „Show original”); eșecurile apar la admin cu „Reîncearcă”.

**M7 — Liste, detaliu PV, permisiuni de vizualizare, dashboard-uri**

- `/app/pv` cu filtre, paginare și export CSV; `/app/pv/[id]` (rezumat, versiuni, emailuri trimise, acțiuni); `/api/pdf/[id]` cu log vizualizare/descărcare; dashboard-uri pe rol; anulare PV (admin).
- ✅ Matricea de permisiuni din secțiunea 6 e acoperită de teste e2e, cu câte un scenariu pozitiv și unul negativ pe fiecare rând.

**M8 — Versiuni, editare, aprobare client**

- Editare admin (versiune oficială, diff), editare subadmin (pending, filigran, token, `/aprobare/[token]`, `/app/aprobari`), remindere și expirare prin cron, notificări.
- ✅ Scenariile aprobare / respingere / expirare; o singură versiune în așteptare per PV; istoricul versiunilor e corect, cu dată și autor.

**M9 — Jurnale**

- Card „Jurnal activitate” pe tehnician, tab „Log client” pe firmă, `/app/admin/jurnal`, dicționar de mesaje RO, export CSV.
- ✅ Fiecare acțiune din catalogul 9.9 implementată în F1 apare în jurnal cu actor, dată și obiect.

**M10 — Migrare WordPress**

- Scripturile 01–05, ecranul „Potriviri”, rulare pe staging.
- ✅ Raportul `05-verify` fără discrepanțe neexplicate; un tehnician migrat se loghează cu parola veche; 10 PDF-uri verificate manual.

**M11 — Lansare Faza 1**

- Hardening: headere, limite de cereri, audit RLS, Lighthouse pe mobil.
- Producție: proiect Supabase Pro, domeniu, DNS, cutover (secțiunea 18).
- ✅ Checklist-ul de cutover complet.

### FAZA 2

**M12 — Cititor plăcuțe AI**

- `/api/plate-read`, prompt, potrivire catalog, UI de confirmare, set de 20 de poze de test.
- ✅ Acuratețe ≥ 90% pe serie și producător pe setul de test; nimic nu se salvează fără „Confirmă”.

**M13 — Semnare la distanță**

- Flux complet (secțiunea 13.2), remindere și expirare, „Retrimite link”, mențiunea legală în PDF.
- ✅ Link expirat sau folosit → mesaj clar; trimis o singură dată dacă email-ul master coincide cu al reprezentantului; PDF-ul final e trimis după semnare.

**M14 — PWA offline**

- Manifest, service worker, Dexie, sincronizare cache, outbox, idempotență.
- ✅ Test în modul avion: PV complet + semnătură; la reconectare se finalizează exact un PV; funcționează pe Android Chrome și iOS Safari (instalat pe ecranul principal).

**M15 — Editor WYSIWYG header/footer**

- TipTap, variabile, previzualizare PDF, versionare, sanitizare.
- ✅ O modificare în editor se reflectă identic în PDF-ul de test; revenirea la versiunea anterioară funcționează.

**M16 — Poze înainte/după**

- ✅ Pozele apar în PV și în PDF; limitele de număr și dimensiune sunt respectate.

---

## 17. Testare

| Nivel     | Unealtă                                               | Ce acoperă                                                                                                          |
| --------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Unit      | Vitest                                                | `operationsFor`, numerotare și slug, hash WP, diff versiuni, deduplicare destinatari, parsare durată, mapare ANAF   |
| DB / RLS  | pgTAP (`supabase test db`)                            | Fiecare politică: rol × tabel × operație, cu utilizatori de test pe fiecare rol                                     |
| Integrare | Vitest + Supabase local                               | `finalizeReport` (fără email real: Resend în mod test sau mock), tokenuri, cron                                     |
| E2E       | Playwright (desktop + mobil, viewport iPhone/Android) | Wizard complet, semnătură (desen simulat pe canvas), permisiuni, aprobări, offline (F2: `context.setOffline(true)`) |
| PDF       | Snapshot vizual (`pdf-to-png` + comparare)            | Layout stabil, diacritice, fără pagină goală                                                                        |
| Manual    | Checklist în `docs/QA.md`                             | Pe telefon real, în hală (semnal slab)                                                                              |

Date de test: `supabase/seed.dev.sql` cu 1 admin, 1 subadmin, 3 tehnicieni, 4 firme (cu reprezentanți și utilaje) și 20 de PV-uri.

---

## 18. Plan de trecere (cutover)

1. **T-7 zile:**
   - migrare completă pe staging, verificare George;
   - tehnicienii primesc un email informativ (link nou, aceeași parolă).
2. **T-1 zi:** tehnicienii finalizează toate drafturile din WordPress.
3. **Ziua T:**
   1. Formularul WordPress se pune în mod „închis” (pagină de informare cu link către aplicația nouă).
   2. Se face dump-ul final; scripturile de migrare rulează pe producție (idempotente; numai delta, dacă staging a rulat pe aceeași bază).
   3. Se rulează `05-verify`.
   4. Se activează DNS-ul `service.woodexpert.ro`.
   5. Test de fum: login cu un tehnician migrat, PV de test către adresa ta, anulat apoi.
4. **T+1 → T+30:**
   - WordPress rămâne read-only (backup);
   - adminul face potrivirile pentru PV-urile migrate și trimite invitații clienților importanți.
5. **T+30:** arhivare WordPress (backup complet descărcat), apoi oprire.

---

## 19. Backlog Faza 3 (după lansare)

- **Cereri de ofertă piese de schimb:**
  - din PV („Piese de schimb recomandate” → „Cere ofertă”) sau din contul clientului, pe un utilaj;
  - statusuri: nouă → în lucru → ofertată → acceptată / respinsă;
  - atașare ofertă PDF.
- **Organizare:**
  - calendar de intervenții pe tehnician;
  - programări cerute de client;
  - revizii periodice recomandate (ex. la 12 luni de la ultima revizie), cu reminder automat către client și office.
- **QR pe utilaj:** etichetă printabilă din fișa utilajului, care deschide istoricul (cu login).
- **Rapoarte:**
  - intervenții pe producător sau tip, timp mediu, piese frecvente;
  - export Excel.

---

## 20. Cum lucrăm cu acest plan în Claude Code

1. Creezi folderul `wex-service`, pui fișierul acesta în `docs/PLAN.md` și `CLAUDE.md` (livrat separat) în rădăcina proiectului.
2. Pornești Claude Code în folder și începi cu:
   > Citește docs/PLAN.md și CLAUDE.md. Implementează M0. La final, rulează testele și spune-mi ce trebuie să verific.
3. Pentru fiecare milestone următor:
   > Implementează M{n} din docs/PLAN.md. Respectă criteriile de acceptanță.
4. După fiecare milestone: verifici pe preview, apoi commit și, ideal, un PR pe branch `m{n}-…`.
5. Orice decizie nouă se adaugă în tabelul din secțiunea 1, ca planul să rămână sursa de adevăr.
6. Ce trebuie să pregătești în paralel, ca să nu blochezi M3, M6 și M10:
   - conturi Supabase, Vercel, Resend (și Anthropic pentru F2);
   - acces la DNS-ul woodexpert.ro;
   - exporturile din secțiunea 14.1;
   - logo-ul;
   - 10–20 de poze cu plăcuțe (pentru F2).
