# Class Schedule App — `project_context.md`

Onboarding document for LLMs (Claude / Cursor / etc.) taking over maintenance and expansion of this codebase. Everything below reflects the current state of the repository.

---

## 1. Project Overview & Core Stack

### Purpose
A **personal university class schedule web app** for a single student user. Users sign in, then manage their weekly class schedule through three synchronized views (Today, Week, Table). All data (classes and templates) is stored per-user in a cloud database (Supabase, surfaced to the user as "Lovable Cloud") and syncs across every device the user logs into. Designed mobile-first for a **Xiaomi 14T** viewport but supports a desktop layout via a toggle.

### Tech Stack
| Layer | Tool |
|---|---|
| Framework | **React 18 + Vite 5 + TypeScript 5** (SPA) |
| Routing | `react-router-dom` v6 (`BrowserRouter` + `Routes`) |
| UI Kit | **shadcn/ui** (Radix primitives) — components in `src/components/ui/*` |
| Styling | **Tailwind CSS v3** with semantic CSS tokens in `src/index.css` (dark-mode aware) |
| Icons | `lucide-react` |
| Forms | `react-hook-form` + `zod` |
| Toasts | `sonner` (+ legacy `use-toast`) |
| Data fetching | `@tanstack/react-query` (provider mounted, but hooks call Supabase directly) |
| Backend | **Supabase** (Auth + Postgres + RLS). Referred to as "Lovable Cloud" in user-facing copy. |
| Client | `@supabase/supabase-js` via `src/integrations/supabase/client.ts` (auto-generated, do not edit) |
| Persistence | Cloud DB for schedule/templates; `localStorage` only for seed-once flag and the mobile/desktop view cookie fallback |

### Notable conventions
- **Never** hardcode Tailwind color utilities like `text-white`, `bg-black`, `bg-[#…]`. All colors come from semantic tokens in `src/index.css`.
- Class-color palette is defined in `src/lib/schedule-data.ts` (`CLASS_COLORS` + `hashColor` fallback). LEC/LAB variants share one color because `getClassColor` normalizes trailing " LEC"/" LAB".
- No native mobile shell (Capacitor/APK was intentionally removed). Web only.
- The app is **PWA-installable**: `manifest.webmanifest`, `sw.js`, and PWA meta tags are present; production builds register a service worker for app-shell caching. Preview/dev builds intentionally skip registration.

---

## 2. Application Architecture & Routing

### Entry points
- `src/main.tsx` — mounts `<App />`.

- `src/App.tsx` — sets up `QueryClientProvider`, `TooltipProvider`, `Toaster`, `Sonner`, `BrowserRouter`, `AuthProvider`, then routes.

### Route map
| Path | Component | Guard | Purpose |
|---|---|---|---|
| `/` | `src/pages/Index.tsx` | `<ProtectedRoute>` (redirects to `/auth` if no session) | Main app: header + tabs (Today / Week / Table) |
| `/auth` | `src/pages/Auth.tsx` | Public (auto-redirects to `/` if session exists) | Email/password sign-in and sign-up |
| `*` | `src/pages/NotFound.tsx` | Public | 404 fallback |

### Providers (order in `App.tsx`)
`QueryClientProvider` → `TooltipProvider` → `Toaster` + `Sonner` → `BrowserRouter` → `AuthProvider` → `Routes`.

### Component hierarchy (main app)
```
Index (page)
├── Header
│   ├── Edit-mode toggle (Viewing ⇄ Editing)
│   ├── View-mode toggle (Mobile ⇄ Desktop, persisted to cookie)
│   ├── "Edit" button → ClassManagerDialog
│   ├── Reset button → resetSchedule()
│   └── Sign-out button → signOut()
├── Tabs
│   ├── TodayView
│   │   └── CountdownCard
│   ├── CalendarView  (Week grid, Mon–Sat, 7 AM–7 PM)
│   └── TableView
├── ClassManagerDialog
│   ├── ClassFormDialog (add/edit inside manager)
│   ├── ImportScheduleDialog (paste-OCR importer)
│   └── CsvImportDialog (CSV upload importer)
└── ClassFormDialog (top-level "quick edit" opened by tapping a class in edit mode)

```

---

## 3. Complete Feature & Function Inventory

### 3.1 Authentication (Email + Password)
- **Function**: Gate the entire app behind a Supabase Auth session.
- **User flow**:
  1. Unauthenticated visit to `/` → `ProtectedRoute` redirects to `/auth`.
  2. `/auth` shows tabs: **Sign in** / **Sign up**. Both use email + password.
  3. On success, `AuthContext` fires `onAuthStateChange` → `useEffect` in `Auth.tsx` navigates to `/`.
  4. Session is persisted in `localStorage` by the Supabase client (auto-refresh on).
- **Files**: `src/pages/Auth.tsx`, `src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`.
- **Data/state**: `supabase.auth.signInWithPassword` / `supabase.auth.signUp`. Session hydrated in `AuthProvider` and exposed via `useAuth()` (`user`, `session`, `loading`, `signOut`).

### 3.2 Sign out
- **Function**: End session, kick user back to `/auth`.
- **Trigger**: Header `LogOut` icon in `Index.tsx`.
- **Impl**: `useAuth().signOut()` → `supabase.auth.signOut()`. `ProtectedRoute` then redirects.

### 3.3 First-time schedule seeding
- **Function**: On a brand-new user's first load, insert `DEFAULT_SCHEDULE` (14 hard-coded classes from `src/lib/schedule-data.ts`) into the DB.
- **Impl**: `useSchedule.ts` effect: if `classes` table is empty **and** `localStorage['uni-schedule-seeded-<userId>']` is unset, bulk-insert defaults and set the flag.

### 3.4 Today view
- **Function**: Show classes for the current weekday with real-time status highlighting; below it, a preview of tomorrow's classes.
- **User flow**:
  - Shows countdown card (next class or in-progress remaining time).
  - Lists today's classes sorted by start time, each with color bar, class name, `classId - section` (defaults to `TS21` when empty), time range, location, and — if `location === "ONLINE"` — a **Join Link** button (opens `meetingLink` in new tab) or a disabled **Link Unavailable** button.
  - Active class: primary-tinted card + "Now" badge. Past classes: dimmed with "Done" label. Upcoming: neutral card.
  - Tomorrow section: dashed-border preview cards with no status logic.
  - In edit mode, tapping a card opens the `ClassFormDialog` for that entry.
- **Files**: `src/components/TodayView.tsx`, `src/components/CountdownCard.tsx`.
- **State**: `now` (recomputed every 30 s), `today`/`tomorrow` via JS `Date().getDay()` mapped to `DayOfWeek`.

### 3.5 Countdown card
- **Function**: Shows time to next class or remaining time in current class.
- **File**: `src/components/CountdownCard.tsx`.
- **State**: interval timer computes next/active class from `classes` prop.

### 3.6 Week (Calendar) view
- **Function**: Weekly grid Mon–Sat × 7 AM–7 PM. Classes rendered as absolutely-positioned colored blocks using percentage-based top/height (so alignment works at both mobile and desktop row heights).
- **Extras**:
  - Today's column is subtly highlighted (tinted header, faint column bg, left accent line).
  - Each block shows class name, `classId`, section, time, location.
  - In edit mode, tapping a block calls `onEdit(entry)` in `Index.tsx` which opens the quick-edit `ClassFormDialog` prefilled with that class.
- **Filters**: search input + day filter (above the grid) update the `filtered` array in `Index.tsx`.
- **File**: `src/components/CalendarView.tsx`.

### 3.7 Table view
- **Function**: Tabular listing of all classes with columns (class name, ID, section, day, time, location, actions).
- **Filters**: search input + location filter (ALL / ONLINE / ONSITE).
- **Edit mode**: row/edit-button click opens `ClassFormDialog`; delete button calls `deleteClass(id)`.
- **File**: `src/components/TableView.tsx`.

### 3.8 View-mode toggle (Mobile ⇄ Desktop)
- **Function**: Swap the main container between `max-w-lg` (mobile) and `max-w-5xl` (desktop).
- **Persistence**: A `viewMode` cookie stored per device for 1 year (`readViewModeCookie` / `writeViewModeCookie` in `Index.tsx`). No DB sync — this is device-local by design.

### 3.9 Edit-mode toggle (Viewing ⇄ Editing)
- **Function**: Global flag `editMode` in `Index.tsx`. When off, taps on class cards/blocks/rows do nothing (prevents accidental edits). When on, taps open the quick-edit dialog.

### 3.10 Class Manager dialog (`Edit` button in header)
- **Function**: Centralized panel to Add / Edit / Delete classes, add extra schedules or LAB variants to existing classes, Clear All, and manage templates.
- **Groups** classes by name so multiple schedules of the same subject appear together, with per-group actions:
  - **Add Schedule** — prefill class name + ID and open `ClassFormDialog` to add another time slot.
  - **Add Lab** — prefill class name as `<parent> LAB` and (typically) `<classId>L` to create the lab variant.
  - Per-entry Edit / Delete.
- **Clear All**: confirmation dialog → `clearSchedule()` deletes every row for the user.
- **Import Schedule**: opens `ImportScheduleDialog` for paste-based OCR-style import.
- **Templates section** (see 3.14).
- **File**: `src/components/ClassManagerDialog.tsx`.

### 3.11 ClassFormDialog (add / edit)
- **Function**: The form used to add or edit a single class.

- **Fields**:
  - Class name
  - Class ID
  - Section (defaults to `TS21` if left blank — normalized in `useSchedule.entryToRow`)
  - Day (`MONDAY`–`SATURDAY`)
  - Location (free-text, or `ONLINE`)
  - **Meeting link** — only shown when location is `ONLINE`; optional
  - **Time range** — a single combined input like `17:00:00-18:50:00`, `9am-10:30am`, `0700-0950`, `21:00-22:00`. Parsed via `src/lib/time-format.ts` (`parseFlexibleTime` + `parseTimeRange`) and normalized to canonical `h:MM AM/PM` on submit.
- **File**: `src/components/ClassFormDialog.tsx`.
- **State**: `react-hook-form`; on submit calls the parent's `onSubmit(data)` which routes to `addClass` or `updateClass` in `useSchedule`.

### 3.12 CSV import
- **Function**: Upload a CSV file exported from a school enrollment system, preview the parsed classes, edit auto-generated names and time ranges, then confirm to import into the schedule.
- **Required CSV header**: `Courses,Title,Section,Units,Days,Time,Room`.
- **Parser logic** (`src/lib/csv-import.ts`):
  - Reads CSV with quoted-field support.
  - Skips duplicate course codes within the uploaded file.
  - Groups rows by base course code: a row whose course code ends in `L` (e.g., `CCS0043L`) is merged as the **LAB** variant under the same class as the non-`L` row (e.g., `CCS0043` lecture).
  - Splits `Days`, `Time`, and `Room` on ` / ` to support multiple slots per row.
  - Validates that the three segments have matching counts after splitting; warns if not.
  - Maps day tokens (`M`, `T`, `W`, `TH`, `F`, `S`, etc.) to `DayOfWeek`.
  - Parses each time segment through `parseTimeRange` (handles `07:00:00-09:40:00`, `9am-10:30am`, `2100-1900`, etc.).
  - Auto-generates a short, editable class name from the `Title` via `abbreviateTitle` (strips `(LEC)`/`(LAB)` and stops on common words).
- **Conflict resolution against existing classes** (`src/components/CsvImportDialog.tsx`):
  - Before showing the preview, the dialog compares every incoming lecture/lab code against the current user's existing `class_id`s.
  - Conflicting codes are flagged with **Already exists** badges and default to **Skip**.
  - The user can toggle each conflict to **Skip** (ignore that code) or **Replace** (delete the existing DB entry and import the new one).
  - On confirm, the parent receives the list of entries to import plus a list of `class_id`s to replace; `ClassManagerDialog.tsx` routes replacements through `onDeleteImmediate` so the delete + insert happens atomically without an undo toast.
- **Preview/edit dialog** (`src/components/CsvImportDialog.tsx`):
  - Drag/choose file upload.
  - Lists each parsed class with editable class name, lecture code, lab code, section, and each schedule's day, location, and time range.
  - Per-class warning badges.
  - Global warning list (e.g., duplicate course codes within the file, mismatched segment counts).
  - **Confirm Import** only writes to the database after the user edits and confirms; **Cancel** discards everything.
- **Edge cases handled**:
  - Mismatched `Days / Time / Room` segment counts → warning on that class.
  - Duplicate course codes within the file → skipped globally with a warning.
  - Duplicate course codes that already exist in the DB → per-code Skip/Replace choice.
  - More than two schedules after grouping → still displayed and flagged for review.
  - Unparseable time ranges → caught at confirm time and reported as a toast error.
- **Files**: `src/lib/csv-import.ts`, `src/components/CsvImportDialog.tsx`, wired into `src/components/ClassManagerDialog.tsx` via a **CSV** button.

### 3.13 Import from text (OCR paste)
- **Function**: Paste plain text copied from a schedule photo/OCR; parser extracts entries; preview list; import to DB.
- **File**: `src/components/ImportScheduleDialog.tsx`.

- **Note**: This is the older, heuristic importer. The CSV importer is preferred for structured exports.

### 3.14 Schedule templates (backup system)
- **Function**: Save up to **3** named snapshots of the current schedule; load one (replaces current) or delete it.
- **Files**: `src/hooks/useTemplates.ts`, integrated into `ClassManagerDialog.tsx`.
- **User flow**:
  - Save: name → inserts row into `schedule_templates` with `classes` as JSONB.
  - Load: confirm → `clearSchedule()` then re-`addClass` for every entry in the template.
  - Delete: confirm → deletes row.
- **Constants**: `MAX_TEMPLATES = 3`.

### 3.15 Reset schedule
- **Function**: Header reset button wipes current user's classes and re-inserts `DEFAULT_SCHEDULE`.
- **Impl**: `useSchedule.resetSchedule()`.

### 3.16 Search + filters
- **Function**: Client-side filtering. `search` matches class name or ID (case-insensitive); `dayFilter` filters Week view; `locationFilter` filters Table view.
- **State**: local `useState` in `Index.tsx`; `filtered` memoized.

### 3.17 Cross-device sync
- All CRUD writes hit Supabase directly. Other devices see updates on next page load / refresh (no realtime subscription is wired; adding one would be a `.channel('classes').on('postgres_changes', …)` on top of `useSchedule`).

### 3.18 Class colors (LEC/LAB share color)
- `getClassColor(className)` strips a trailing " LEC"/" LAB", looks up `CLASS_COLORS`, and falls back to a stable string-hashed HSL — so `AppDev LEC` and `AppDev LAB` always render the same color.

### 3.19 Delete-with-Undo
- `src/lib/delete-with-undo.ts` wraps `deleteClass` + `addClass` with a 5s `sonner` toast offering Undo. Used at every user-initiated delete call site (TableView, ClassManagerDialog). CSV Replace flow bypasses this via `onDeleteImmediate` for atomic behavior.

### 3.20 PWA support
- **Function**: Allow the app to be installed as a standalone app on mobile/desktop and provide offline app-shell caching.
- **Files**:
  - `public/manifest.webmanifest` — app metadata (name, short name, icons, theme colors, display mode `standalone`).
  - `public/icon-512.png` — app icon / Apple touch icon.
  - `public/sw.js` — minimal service worker: NetworkFirst for navigations/HTML, CacheFirst for hashed `/assets` and static files; versioned cache (`classsheet-v1`).
  - `index.html` — PWA meta tags (`theme-color`, `viewport-fit=cover`, `apple-mobile-web-app-capable`, manifest link, apple-touch-icon).
  - `src/main.tsx` — registers `/sw.js` only in production and only on non-preview origins; unregisters any existing worker in preview/dev iframes to avoid stale caching during development.
- **Behavior**:
  - Production published origin → installable, standalone display, cached app shell.
  - Lovable preview / dev iframe → service worker intentionally unregistered so live reload and preview updates keep working.

---

## 4. Database Schema & Data Models

Postgres via Supabase. Every table has `service_role` full access and per-user RLS scoped by `auth.uid() = user_id`.


### Table `public.classes`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `user_id` | uuid | owner |
| `class_name` | text | e.g. `AppDev LAB` |
| `class_id` | text | e.g. `CCS0043L` |
| `section` | text | default `'TS21'` |
| `day` | text | `MONDAY`..`SATURDAY` |
| `start_time` | text | canonical `h:MM AM/PM` |
| `end_time` | text | canonical `h:MM AM/PM` |
| `location` | text | `ONLINE` or a room string |
| `meeting_link` | text nullable | for online classes |
| `color` | text nullable | reserved; not currently used (color derives from name) |
| `created_at`, `updated_at` | timestamptz | `updated_at` maintained by `set_updated_at` trigger convention |

RLS policies (all scoped by `auth.uid() = user_id`): `SELECT`, `INSERT`, `UPDATE`, `DELETE`. Grants to `authenticated` + `service_role`.

### Table `public.schedule_templates`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `user_id` | uuid | owner |
| `name` | text | template display name |
| `classes` | jsonb | serialized array of `ClassEntry` |
| `saved_at` | timestamptz | default `now()` |

Same RLS pattern as above. Max 3 enforced client-side.

### DB functions / triggers
- `public.set_updated_at()` — trigger function for updating `updated_at`. No explicit triggers listed at time of writing; `updated_at` on `classes` is written by the client through `entryToRow` on updates (Supabase timestamp default handles the rest).

### Edge functions
- None currently deployed.


### Storage buckets
- None.

### TypeScript model
`src/lib/schedule-data.ts` defines:
```ts
type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY";
interface ClassEntry {
  id: string;
  className: string;
  classId: string;
  section: string;
  day: DayOfWeek;
  location: string;
  startTime: string; // "7:00 AM"
  endTime: string;
  meetingLink?: string;
}
```
DB row ↔ `ClassEntry` mapping lives in `useSchedule.ts` (`rowToEntry` / `entryToRow`), which is also where `section` defaults to `'TS21'`.

---

## 5. Authentication & Permissions

- **Provider**: Supabase Auth, email + password only. No social providers configured. No anonymous sign-ins. Email confirmation setting is whatever the project defaults to (not toggled in code).
- **Client**: `src/integrations/supabase/client.ts` (auto-generated). Uses `localStorage` for session storage, `persistSession: true`, `autoRefreshToken: true`.
- **Context**: `AuthContext` (`src/contexts/AuthContext.tsx`) — sets up `onAuthStateChange` listener **before** reading the initial session (avoids the classic race). Exposes `{ user, session, loading, signOut }`.
- **Route guard**: `<ProtectedRoute>` shows a spinner while `loading`, then redirects to `/auth` if no `user`.
- **Anonymous vs. signed-in**:
  - Anonymous → can only reach `/auth`. Everything else redirects.
  - Signed-in → full access to Today / Week / Table / Manager / Templates for their own data only. RLS enforces isolation server-side.
- **Per-user isolation**: enforced by RLS on every table (`auth.uid() = user_id`). Client code additionally filters by `user_id` on writes (defense in depth).

---

## 6. Known Limitations & Pending Work

- **No realtime sync.** Updates on one device only appear on other devices after refresh. Adding realtime would be a `supabase.channel(...).on('postgres_changes', ...)` subscription inside `useSchedule` and (optionally) `useTemplates`.
- **`classes.color` column unused.** Colors are derived from `className` via `getClassColor`. If per-class custom colors are added later, this column is the intended storage.
- **Default schedule is hard-coded** in `src/lib/schedule-data.ts` (`DEFAULT_SCHEDULE`, 14 entries specific to one student's TS21 section). Anyone else who signs up gets these as their initial schedule until they Reset/Clear/Edit.

- **First-run seeding uses `localStorage`** (`uni-schedule-seeded-<userId>`). If a user clears storage on a new device with an empty DB, they'd re-seed — acceptable but worth knowing.
- **Time storage is stringly-typed** (`"7:00 AM"`). Parsing lives in `parseTime` (`schedule-data.ts`) and `parseFlexibleTime`/`parseTimeRange` (`time-format.ts`). Any new time-consuming code must go through these helpers.
- **Section defaulting**: empty section input → stored as `'TS21'` (see `entryToRow`). UI additionally falls back to `'TS21'` on display when the field is empty (belt-and-braces).
- **`ImportScheduleDialog`** uses a heuristic parser — brittle on unexpected OCR formats. No test coverage.
- **CSV import is intentionally strict**: it expects the exact header `Courses,Title,Section,Units,Days,Time,Room` and groups lecture/lab rows by trailing `L`. It warns on duplicates within the file, mismatched multi-slot segments, and >2 schedules. It also checks each incoming code against the existing DB and offers per-code Skip/Replace before writing anything.
- **Testing**: `vitest` is configured (`src/test/example.test.ts` only). No component or hook tests for the schedule logic.
- **SEO/meta**: `index.html` has app-specific `<title>`, `<meta name="description">`, Open Graph, and Twitter card tags. Verified.
- **README** is a stub (`TODO: Document your project here`).
- **No password reset / no Google OAuth / no email verification UX flow.**

- **`useSchedule` refetches happen only via the initial effect and after each mutation** — no `refresh` is called on window focus.
- **Cookie for view mode** is device-local by design (not synced). This is intentional per user preference.

---

## Quick reference: where things live

| Concern | File(s) |
|---|---|
| Routing | `src/App.tsx` |
| Auth session | `src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`, `src/pages/Auth.tsx` |
| Main page | `src/pages/Index.tsx` |
| Data model / defaults / colors | `src/lib/schedule-data.ts` |
| Time parsing | `src/lib/time-format.ts` |
| Schedule CRUD | `src/hooks/useSchedule.ts` |
| Templates CRUD | `src/hooks/useTemplates.ts` |
| Delete-with-Undo | `src/lib/delete-with-undo.ts` (used by `Index.tsx`) |
| PWA manifest / service worker | `public/manifest.webmanifest`, `public/sw.js`, `public/icon-512.png`, `index.html`, `src/main.tsx` |
| Views | `src/components/TodayView.tsx`, `CalendarView.tsx`, `TableView.tsx`, `CountdownCard.tsx` |
| Dialogs | `src/components/ClassManagerDialog.tsx`, `ClassFormDialog.tsx`, `ImportScheduleDialog.tsx`, `CsvImportDialog.tsx` |

| CSV import | `src/lib/csv-import.ts` |
| Supabase client (auto-gen — don't edit) | `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts` |
| Design tokens | `src/index.css`, `tailwind.config.ts` |
