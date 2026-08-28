# Class Sheet — System Architecture & Feature Specification

A complete, implementation-ready specification of the **Class Sheet** web application (a personal university class-schedule manager). This document is written so another AI/engineer can recreate the codebase from scratch with zero ambiguity.

---

## 1. Project Overview & Tech Stack

### 1.1 Purpose
A single-user (per-account) **university class schedule web app**. The user signs in with email + password, then manages a weekly class schedule through three synchronized views (**Today**, **Week**, **Table**). All data is stored per-user in a cloud Postgres database (Supabase, surfaced in user-facing copy as "Lovable Cloud"/"the backend") and syncs across every device the user logs into.

Design target: **mobile-first**, tuned for a Xiaomi 14T (2712 × 1220, ~1.5K) viewport, with an optional desktop-width layout toggle. It is a **web app only** — installable as a PWA. There is intentionally **no native shell** (Capacitor/APK was tried and removed).

### 1.2 Stack

| Layer | Technology | Version |
|---|---|---|
| Language | TypeScript | ^5.8.3 |
| UI framework | React (SPA) | ^18.3.1 |
| Build tool | Vite + `@vitejs/plugin-react-swc` | ^5.4.19 / ^3.11.0 |
| Routing | `react-router-dom` (`BrowserRouter`) | ^6.30.1 |
| Styling | Tailwind CSS v3 + `tailwindcss-animate` + `@tailwindcss/typography` | ^3.4.17 |
| Component kit | shadcn/ui on Radix UI primitives | see below |
| Icons | `lucide-react` | ^0.462.0 |
| Forms | `react-hook-form` (+ `@hookform/resolvers`, `zod` available) | ^7.61.1 |
| Toasts | `sonner` (primary) + shadcn `use-toast`/`Toaster` (legacy, mounted) | ^1.7.4 |
| Server state | `@tanstack/react-query` (provider mounted; hooks call Supabase directly) | ^5.83.0 |
| Backend | Supabase: Auth + Postgres + Row Level Security | `@supabase/supabase-js` ^2.104.0 |
| Dates | `date-fns` | ^3.6.0 |
| Charts / misc | `recharts`, `embla-carousel-react`, `vaul`, `cmdk`, `next-themes`, `react-day-picker`, `react-resizable-panels`, `input-otp` | (shadcn deps) |
| Utilities | `clsx`, `tailwind-merge`, `class-variance-authority` | — |
| Testing | `vitest` ^3.2.4, `@testing-library/react`, `jsdom` | — |
| Lint | ESLint 9 + `typescript-eslint` | — |

Radix packages in use (all shadcn-generated): accordion, alert-dialog, aspect-ratio, avatar, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, label, menubar, navigation-menu, popover, progress, radio-group, scroll-area, select, separator, slider, slot, switch, tabs, toast, toggle, toggle-group, tooltip.

### 1.3 Scripts
```json
"dev": "vite",
"build": "vite build",
"build:dev": "vite build --mode development",
"lint": "eslint .",
"preview": "vite preview",
"test": "vitest run",
"test:watch": "vitest"
```

### 1.4 Environment variables (Vite, client-side)
```
VITE_SUPABASE_URL=<project url>
VITE_SUPABASE_PUBLISHABLE_KEY=<anon/publishable key>
VITE_SUPABASE_PROJECT_ID=<project ref>
```

### 1.5 Vite config essentials
- Dev server: `host: "::"`, `port: 8080`, `hmr.overlay: false`.
- Alias `@` → `./src`.
- `dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"]`.

### 1.6 Hard conventions
1. **Never hardcode color utilities** (`text-white`, `bg-black`, `bg-[#hex]`). All colors are semantic HSL tokens defined in `src/index.css` and mapped in `tailwind.config.ts`.
2. Class block colors come from `src/lib/schedule-data.ts` only (`CLASS_COLORS` + hashed HSL fallback).
3. LEC and LAB variants of the same subject **must render identical colors**.
4. Times are stored canonically as `"h:MM AM/PM"` strings (e.g. `"7:00 AM"`), never as Date objects.
5. Web-only. No native wrappers.

---

## 2. Directory Structure

```
.
├── index.html                     # SPA shell + SEO/PWA meta
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── components.json                # shadcn config
├── eslint.config.js
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── vitest.config.ts
├── project_context.md             # maintenance onboarding doc
├── project-documenation.md        # this document
├── public/
│   ├── manifest.webmanifest       # PWA manifest
│   ├── sw.js                      # minimal service worker
│   ├── icon-512.png               # app / apple-touch icon
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
├── supabase/
│   └── config.toml                # auto-generated project config
└── src/
    ├── main.tsx                   # React root + service-worker registration
    ├── App.tsx                    # providers + routes
    ├── App.css
    ├── index.css                  # design tokens + base layer + safe-area helper
    ├── vite-env.d.ts
    ├── components/
    │   ├── CalendarView.tsx       # Week grid (Mon–Sat, 7AM–7PM)
    │   ├── TableView.tsx          # Sortable table
    │   ├── TodayView.tsx          # Today + Tomorrow lists
    │   ├── CountdownCard.tsx      # Next/current class countdown
    │   ├── ClassManagerDialog.tsx # Manage Classes hub
    │   ├── ClassFormDialog.tsx    # Add/Edit single class form
    │   ├── CsvImportDialog.tsx    # CSV upload + preview + conflicts
    │   ├── ImportScheduleDialog.tsx # legacy OCR/paste importer
    │   ├── ProtectedRoute.tsx
    │   ├── NavLink.tsx            # NavLink compat wrapper
    │   └── ui/                    # shadcn primitives (~45 files)
    ├── contexts/
    │   └── AuthContext.tsx
    ├── hooks/
    │   ├── useSchedule.ts         # classes CRUD + seeding + reset/clear
    │   ├── useTemplates.ts        # up-to-3 schedule snapshots
    │   ├── use-mobile.tsx
    │   └── use-toast.ts
    ├── integrations/supabase/
    │   ├── client.ts              # AUTO-GENERATED, do not edit
    │   └── types.ts               # AUTO-GENERATED DB types
    ├── lib/
    │   ├── schedule-data.ts       # types, DAYS, colors, DEFAULT_SCHEDULE, parseTime
    │   ├── time-format.ts         # flexible time parsing
    │   ├── csv-import.ts          # CSV parser + grouping
    │   ├── delete-with-undo.ts    # sonner undo wrapper
    │   └── utils.ts               # cn()
    ├── pages/
    │   ├── Index.tsx              # main app page
    │   ├── Auth.tsx               # sign in / sign up
    │   └── NotFound.tsx
    └── test/
        ├── setup.ts
        └── example.test.ts
```

`src/components/ui/` contains the standard shadcn set: accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input-otp, input, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip, use-toast.

---

## 3. Data Models & State Management

### 3.1 Domain types (`src/lib/schedule-data.ts`)

```ts
export type DayOfWeek =
  | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY";

export interface ClassEntry {
  id: string;          // uuid from DB
  className: string;   // e.g. "AppDev LAB"
  classId: string;     // course code, e.g. "CCS0043L"
  section: string;     // defaults to "TS21" when blank
  day: DayOfWeek;
  location: string;    // room string, or the literal "ONLINE"
  startTime: string;   // canonical "7:00 AM"
  endTime: string;     // canonical "9:40 AM"
  meetingLink?: string;// only meaningful when location === "ONLINE"
}

export const DAYS: DayOfWeek[] = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
```

Also exported: `CLASS_COLORS` (subject → HSL), `getClassColor(className)`, `parseTime(t: string): number` (returns decimal hours, e.g. `"1:30 PM"` → `13.5`), and `DEFAULT_SCHEDULE: ClassEntry[]` (14 seed rows).

Color rule:
```ts
function normalizeClassName(n: string) { return n.replace(/\s+(LEC|LAB)\s*$/i, "").trim(); }
// getClassColor: normalize → CLASS_COLORS lookup → stable hashed HSL fallback
// hash: h = (h*31 + charCode) | 0; hue = |h| % 360; `hsl(${hue}, 65%, 48%)`
```

Seed palette:
`AppDev hsl(210,70%,50%)`, `Techno hsl(340,65%,50%)`, `NetComm 1 hsl(160,60%,40%)`, `Automata hsl(270,55%,50%)`, `DataVis hsl(30,80%,50%)`, `Python hsl(50,75%,45%)`, `PurComm hsl(0,65%,50%)`.

### 3.2 Time utilities (`src/lib/time-format.ts`)

```ts
parseFlexibleTime(input: string): string | null   // → canonical "h:MM AM/PM"
export interface TimeRange { start: string; end: string }
parseTimeRange(input: string): TimeRange | null   // splits on "-" / "–" / " to "
toRangeString(start: string, end: string): string
```
Accepted inputs: `9am`, `9 AM`, `9pm`, `7`, `700`, `0700`, `2100`, `17:00`, `17:00:00`, `10:30am`.
Accepted ranges: `17:00:00-18:50:00`, `9am-10:30am`, `0700-0950`, `21:00-22:00`.

### 3.3 CSV model (`src/lib/csv-import.ts`)

```ts
export interface ParsedSchedule { day: DayOfWeek; location: string; startTime: string; endTime: string; raw: string; }
export interface ParsedClass {
  key: string; className: string; section: string;
  lectureCode: string; labCode: string | null;
  schedules: ParsedSchedule[]; warnings: string[];
}
export interface CsvParseResult { classes: ParsedClass[]; warnings: string[]; }
export function parseScheduleCsv(text: string): CsvParseResult;
export function parsedToEntries(list: ParsedClass[]): Array<Omit<ClassEntry, "id">>;
export function abbreviateTitle(title: string): string;
```

### 3.4 Database schema (Postgres / Supabase)

All tables live in `public`, are RLS-protected, and are scoped by `auth.uid() = user_id`.

**`public.classes`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `user_id` | uuid NOT NULL | owner |
| `class_name` | text NOT NULL | |
| `class_id` | text NOT NULL | course code |
| `section` | text NOT NULL | default `'TS21'` |
| `day` | text NOT NULL | `MONDAY`…`SATURDAY` |
| `start_time` | text NOT NULL | canonical `h:MM AM/PM` |
| `end_time` | text NOT NULL | canonical `h:MM AM/PM` |
| `location` | text NOT NULL | room or `ONLINE` |
| `meeting_link` | text NULL | |
| `color` | text NULL | reserved, unused (color derives from name) |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()` |

**`public.schedule_templates`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `user_id` | uuid NOT NULL | |
| `name` | text NOT NULL | |
| `classes` | jsonb NOT NULL | serialized `ClassEntry[]` |
| `saved_at` | timestamptz | default `now()` |

Required migration shape (grants are mandatory — RLS alone is not enough):

```sql
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  class_name text not null,
  class_id text not null,
  section text not null default 'TS21',
  day text not null,
  start_time text not null,
  end_time text not null,
  location text not null,
  meeting_link text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.classes to authenticated;
grant all on public.classes to service_role;
alter table public.classes enable row level security;
create policy "own rows select" on public.classes for select to authenticated using (auth.uid() = user_id);
create policy "own rows insert" on public.classes for insert to authenticated with check (auth.uid() = user_id);
create policy "own rows update" on public.classes for update to authenticated using (auth.uid() = user_id);
create policy "own rows delete" on public.classes for delete to authenticated using (auth.uid() = user_id);
-- schedule_templates: identical grants + policy set
```

No edge functions. No storage buckets. No `user_settings` table (notifications feature was removed deliberately — do not reintroduce).

### 3.5 Row ↔ entity mapping (`src/hooks/useSchedule.ts`)

```ts
rowToEntry(row) => ({ id, className: row.class_name, classId: row.class_id,
  section: row.section ?? "", day: row.day as DayOfWeek, location: row.location,
  startTime: row.start_time, endTime: row.end_time,
  meetingLink: row.meeting_link ?? undefined })

entryToRow(entry, userId) => ({ user_id: userId, class_name, class_id,
  section: entry.section || "TS21", day, start_time, end_time, location,
  meeting_link: entry.meetingLink ?? null })
```

### 3.6 State management model

There is **no global store** (no Redux/Zustand). State is layered:

| Scope | Mechanism | Contents |
|---|---|---|
| Auth (global) | React Context `AuthProvider` / `useAuth()` | `user`, `session`, `loading`, `signOut()` |
| Schedule data | `useSchedule()` hook (local `useState`, Supabase-backed) | `classes`, `loading`, `addClass`, `updateClass`, `deleteClass`, `clearSchedule`, `resetSchedule`, `refresh` |
| Templates | `useTemplates()` hook | `templates`, `saveTemplate`, `deleteTemplate`, `maxTemplates` (3) |
| Page UI state | `useState` in `Index.tsx` | `search`, `dayFilter`, `locationFilter`, `managerOpen`, `viewMode`, `editMode`, `editingEntry`, `quickEditOpen` |
| Device prefs | Cookie `viewMode` (1 year, `SameSite=Lax`) | `"mobile" \| "desktop"` |
| Local flags | `localStorage["uni-schedule-seeded-<userId>"]` | one-time seed guard |
| Session | `localStorage` via Supabase client (`persistSession`, `autoRefreshToken`) | JWT session |

`QueryClientProvider` is mounted but **no queries are registered** — all reads/writes go straight through the Supabase client inside the hooks. Optimistic local state is updated from the returned row (`.select("*").single()`).

`AuthProvider` order is critical: register `supabase.auth.onAuthStateChange` **first**, then call `getSession()` and clear `loading`.

---

## 4. Component Architecture

### 4.1 Tree

```
main.tsx
└── App
    └── QueryClientProvider
        └── TooltipProvider
            ├── Toaster (shadcn)
            ├── Sonner (sonner Toaster)
            └── BrowserRouter
                └── AuthProvider
                    └── Routes
                        ├── /auth  → Auth
                        ├── /      → ProtectedRoute → Index
                        └── *      → NotFound

Index
├── <header> (sticky)
│   ├── Title + "<n> classes this semester"
│   ├── Edit-mode toggle  (Eye "Viewing" ⇄ Pencil "Editing")
│   ├── View-mode toggle  (Monitor ⇄ Smartphone, cookie-persisted)
│   ├── "Edit" button      → opens ClassManagerDialog
│   ├── Reset button       → resetSchedule()
│   └── Sign-out button    → signOut()
├── Tabs (default "today")
│   ├── TabsContent "today"    → TodayView → CountdownCard
│   ├── TabsContent "calendar" → [Search + Day filter] + CalendarView
│   └── TabsContent "table"    → [Search + Location filter] + TableView
├── ClassManagerDialog
│   ├── ClassFormDialog        (add/edit within manager)
│   ├── ImportScheduleDialog   (paste/OCR importer)
│   ├── CsvImportDialog        (CSV importer)
│   ├── AlertDialog            (Clear All confirmation)
│   └── Templates section      (save / load / delete, max 3)
└── ClassFormDialog            (top-level quick-edit, opened by tapping a class in edit mode)
```

### 4.2 Props contracts

```ts
// ProtectedRoute.tsx
{ children: React.ReactNode }
// Renders a centered Loader2 spinner while auth loading; <Navigate to="/auth" replace/> when !user.

// TodayView.tsx
interface TodayViewProps { classes: ClassEntry[]; onEdit: (e: ClassEntry) => void; editMode: boolean }

// CalendarView.tsx
interface CalendarViewProps { classes: ClassEntry[]; onEdit: (e: ClassEntry) => void; editMode: boolean }

// TableView.tsx
interface TableViewProps {
  classes: ClassEntry[];
  onEdit: (e: ClassEntry) => void;
  onDelete: (id: string) => void;   // routed through deleteWithUndo
  editMode: boolean;
}

// CountdownCard.tsx
interface CountdownCardProps { classes: ClassEntry[] }

// ClassFormDialog.tsx
interface ClassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<ClassEntry, "id">) => void;
  initialData?: ClassEntry | null;                 // edit mode
  prefill?: Partial<Omit<ClassEntry, "id">> | null;// "Add Schedule"/"Add Lab" seeds
}

// ClassManagerDialog.tsx
interface ClassManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: ClassEntry[];
  onAdd: (data: Omit<ClassEntry, "id">) => void;
  onUpdate: (id: string, data: Omit<ClassEntry, "id">) => void;
  onDelete: (id: string) => void;                       // user-initiated → Undo toast
  onDeleteImmediate: (id: string) => Promise<void>|void;// CSV "Replace" → no toast
  onClearAll: () => void;
  templates: ScheduleTemplate[];
  maxTemplates: number;
  onSaveTemplate: (name: string, classes: ClassEntry[]) => boolean;
  onLoadTemplate: (classes: ClassEntry[]) => void;
  onDeleteTemplate: (id: string) => void;
}

// CsvImportDialog.tsx
interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingClasses: ClassEntry[];
  onImport: (entries: Array<Omit<ClassEntry,"id">>, replaceClassIds: string[]) => void;
}

// ImportScheduleDialog.tsx
interface ImportScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (entries: Omit<ClassEntry, "id">[]) => void;
}

// NavLink.tsx — react-router NavLink compat wrapper
interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string; activeClassName?: string; pendingClassName?: string;
}
```

### 4.3 Internal component state

- `TableView`: `sortKey: "className"|"classId"|"day"|"location"|"startTime"` (default `"day"`), `sortAsc: boolean` (default `true`); day ordering map `MONDAY→0 … SATURDAY→5`; `startTime` sorts via `parseTime`.
- `TodayView`: `now` recomputed on a 30 s interval; `today`/`tomorrow` derived from `new Date().getDay()` mapped `1→MONDAY … 6→SATURDAY` (Sunday → `null`, tomorrow wraps via `(getDay()+1)%7`).
- `CalendarView`: pure render; `HOURS = 7..19`; grid `grid-cols-[60px_repeat(6,1fr)]` (mobile) / `sm:grid-cols-[80px_repeat(6,1fr)]`; horizontal scroll container `min-w-[600px] sm:min-w-[800px]`.
- `CountdownCard`: 1 s interval; computes seconds until next class start, or remaining time in an active class.
- `ClassManagerDialog`: groups by class name into `GroupedClass`, holds form/dialog open flags, template name input, clear-all confirmation.
- `CsvImportDialog`: `EditableClass[]` draft state including `lectureAction`/`labAction` (`"skip" | "replace" | null`).

---

## 5. Core Features & User Flows

### 5.1 Authentication (email + password)
1. Unauthenticated visit to `/` → `ProtectedRoute` renders spinner while `loading`, then `<Navigate to="/auth" replace/>`.
2. `/auth` shows a centered card (`max-w-sm`) with Tabs: **Sign in** / **Sign up**; both forms take email + password.
3. Sign in: `supabase.auth.signInWithPassword({ email, password })`; error → `toast.error(error.message)`; success → `toast.success("Welcome back!")`.
4. Sign up: `supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/` } })`; if the error message contains `"already"` → "This email is already registered. Try signing in."; success → "Account created! You're signed in."
5. `AuthContext` fires; a `useEffect` in `Auth.tsx` navigates to `/` with `replace: true` once `user` exists.
6. Only email/password. No social providers, no anonymous sign-in.

### 5.2 Sign out
Header `LogOut` icon → `useAuth().signOut()` → `supabase.auth.signOut()` → `ProtectedRoute` redirects to `/auth`.

### 5.3 First-run seeding
On load, if the user's `classes` table returns 0 rows **and** `localStorage["uni-schedule-seeded-<userId>"]` is unset → bulk-insert `DEFAULT_SCHEDULE` (14 rows) and set the flag. If rows exist, just set the flag. This prevents re-seeding after a deliberate "Clear All".

### 5.4 Today view
- Header shows the current weekday; Sunday yields "no classes today".
- `CountdownCard` on top: time until the next class, or remaining time in the in-progress class.
- Today's classes sorted by `parseTime(startTime)`. Each card shows: colored left bar (`getClassColor`), class name, `classId - section`, `startTime – endTime`, location.
- If `location === "ONLINE"`: a **Join Link** button opening `meetingLink` in a new tab, or a disabled **Link Unavailable** button when no link is stored.
- Status styling: active class → primary-tinted card + **Now** badge; past → dimmed + "Done"; upcoming → neutral.
- Below: a **Tomorrow** preview section with dashed-border cards and no status logic.
- In edit mode, tapping a card calls `onEdit(entry)` → quick-edit `ClassFormDialog`.

### 5.5 Week (Calendar) view
- Grid: columns Mon–Sat, rows 7 AM – 7 PM (13 hour rows).
- Blocks are absolutely positioned with **percentage** top/height derived from `parseTime` so alignment holds at any row height:
  `top% = (start - 7) / 13 * 100`, `height% = (end - start) / 13 * 100`.
- Today's column is subtly highlighted: `text-primary bg-primary/5` header, faint column background, accent left border.
- Block content: class name, `classId`, section, time range, location; background = `getClassColor(className)`.
- Filters above the grid: free-text search (name or ID, case-insensitive) and a Day select (`ALL` + each day).
- Edit mode: tapping a block calls `onEdit(entry)` → quick-edit dialog. Viewing mode: taps are inert.

### 5.6 Table view
- Columns: class name, class ID, section, day, time, location, actions.
- Click a column header to sort; clicking the active column flips direction.
- Filters: search + location select (`ALL` / `ONLINE` / `ONSITE`, where ONSITE = `location !== "ONLINE"`).
- Edit mode: edit button/row → `ClassFormDialog`; delete button → `onDelete(id)` → `deleteWithUndo`.

### 5.7 View-mode toggle (Mobile ⇄ Desktop)
Swaps the page container between `max-w-lg` (mobile) and `max-w-5xl` (desktop). Persisted per device in a `viewMode` cookie for 365 days (`path=/; SameSite=Lax`). Never synced to the DB — intentionally device-local so a laptop stays on desktop layout.

### 5.8 Edit-mode toggle (Viewing ⇄ Editing)
A boolean in `Index.tsx` passed to all three views. Off (default): taps on class cards/blocks/rows do nothing, preventing accidental edits. On: taps open the quick-edit form. Button label swaps between "Viewing" (Eye) and "Editing" (Pencil, `variant="default"`).

### 5.9 Class Manager dialog
Opened by the header **Edit** button. Contents:
- Classes grouped by class name, so a subject with multiple time slots appears as one entity.
- Per group: **Add Schedule** (prefills class name + ID, opens the form for another slot) and **Add Lab** (prefills name as `<parent> LAB` and ID as `<classId>L`).
- Per entry: Edit / Delete (delete goes through the Undo toast).
- **Clear All**: `AlertDialog` confirmation → `clearSchedule()` deletes every row for the user.
- **Import** button → `ImportScheduleDialog`; **CSV** button → `CsvImportDialog`.
- **Templates** section (see 5.12).

### 5.10 Class form (add / edit)
Fields:
1. Class name (text)
2. Class ID (text)
3. Section (text; blank → `"TS21"` at persistence time)
4. Day (select, MONDAY–SATURDAY)
5. Location (text; typing `ONLINE` marks it online)
6. Meeting link (shown **only** when location is `ONLINE`; optional)
7. **Time Range** — one combined input parsed by `parseTimeRange`; on submit, values are normalized to canonical `h:MM AM/PM`. Invalid input blocks submission with a toast error.

Powered by `react-hook-form`. Submitting calls the parent's `onSubmit(data)`, which routes to `addClass` (no `initialData`) or `updateClass(id, data)`.

### 5.11 CSV import
Required header: `Courses,Title,Section,Units,Days,Time,Room`.

Parser (`parseScheduleCsv`):
- Quoted-field aware CSV reader.
- Skips duplicate course codes **within the file** (adds a global warning).
- Groups by base course code: a code ending in `L` (e.g. `CCS0043L`) merges as the **LAB** variant under the matching non-`L` lecture row.
- Splits `Days`, `Time`, and `Room` on ` / ` for multi-slot rows; warns when the three segment counts disagree.
- Maps day tokens (`M`, `T`, `W`, `TH`, `F`, `S`, and full names) to `DayOfWeek`.
- Parses each time segment with `parseTimeRange`.
- Derives a short editable class name from `Title` via `abbreviateTitle` (strips `(LEC)`/`(LAB)`, stops at common filler words).

Dialog flow:
1. Choose/drag a `.csv` file.
2. Preview list: each class shows editable class name, lecture code, lab code, section, and every schedule's day, location and time range; per-class and global warning badges.
3. **Conflict check against the DB**: each incoming lecture/lab code is compared case-insensitively against existing `classId`s. Conflicts get an **Already exists** badge and default to **Skip**; the user can toggle to **Replace**.
4. **Confirm Import** → parent receives `(entries, replaceClassIds)`. `ClassManagerDialog` deletes each conflicting existing row via `onDeleteImmediate` (no undo toast) and then adds the new entries. **Cancel** discards everything; nothing is written before confirm.
5. Unparseable time ranges surface as a toast error at confirm time.

### 5.12 Schedule templates (backup system)
- Max **3** templates (`MAX_TEMPLATES = 3`, enforced client-side).
- **Save**: name input → insert row into `schedule_templates` with `classes` serialized as JSONB. Returns `false` when the limit is reached.
- **Load**: confirmation → `clearSchedule()` then `addClass` for every entry in the snapshot (ids are dropped, new ids assigned).
- **Delete**: confirmation → delete row.

### 5.13 Reset schedule
Header reset (RotateCcw) button → `resetSchedule()`: delete all of the user's rows, re-insert `DEFAULT_SCHEDULE`.

### 5.14 Search & filters
Client-side only, memoized in `Index.tsx`:
```ts
matchesSearch  = !search || className.includes(q) || classId.includes(q)   // lowercased
matchesDay     = dayFilter === "ALL" || c.day === dayFilter
matchesLocation= locationFilter === "ALL"
  || (locationFilter === "ONLINE" ? c.location === "ONLINE" : c.location !== "ONLINE")
```
`filtered` feeds Week and Table views. Today view always receives the full `classes` array.

### 5.15 Delete with Undo
`deleteWithUndo(entry, deleteClass, addClass)`:
- Dismisses any live undo toast (only one at a time; earlier deletes are already committed).
- Deletes immediately, then shows a 5 s `sonner` toast: `Deleted "<className>"` with an **Undo** action that re-inserts the entry (same field values, new id).
- Used at every user-initiated delete site (TableView, ClassManagerDialog). The CSV **Replace** path bypasses it via `onDeleteImmediate`.

### 5.16 Cross-device sync
Every CRUD write hits Supabase directly and updates local state from the returned row. Other devices pick up changes on next load/refresh; no realtime channel is wired (adding one would be `supabase.channel('classes').on('postgres_changes', …)` layered on `useSchedule`).

### 5.17 PWA
- `public/manifest.webmanifest`: name "Class Sheet", short_name "ClassSheet", `start_url "/"`, `scope "/"`, `display "standalone"`, `orientation "portrait"`, `background_color #ffffff`, `theme_color #0F172A`, icons 512 & 192 from `/icon-512.png` with `purpose "any maskable"`.
- `public/sw.js`: minimal worker, cache `classsheet-v1` — NetworkFirst for navigations/HTML, CacheFirst for hashed `/assets` and static files.
- `src/main.tsx`: registers `/sw.js` **only** when `import.meta.env.PROD` and the origin is not a Lovable preview/iframe host (`window.self !== window.top`, `id-preview--*`, `preview--*`, `*.lovableproject.com`, `*.lovableproject-dev.com`, or `?sw` query present). In those cases it actively unregisters any existing `/sw.js` worker so live reload keeps working.

### 5.18 Explicitly removed features (do not reintroduce)
- Browser notifications and the `user_settings` table (deleted).
- Capacitor / Android APK packaging (removed; web only).

---

## 6. Routing & Navigation

| Path | Component | Guard | Behavior |
|---|---|---|---|
| `/` | `src/pages/Index.tsx` | `<ProtectedRoute>` | Main app. Redirects to `/auth` when there is no session. |
| `/auth` | `src/pages/Auth.tsx` | Public | Sign in / sign up. Auto-redirects to `/` when a session already exists. |
| `*` | `src/pages/NotFound.tsx` | Public | 404 fallback; logs the attempted path. |

- Router: `BrowserRouter`, no dynamic route params, no nested routes, no query-param-driven state.
- In-app navigation between Today / Week / Table is **tab state**, not routing — the URL does not change.
- Custom routes must be added **above** the `*` catch-all.
- Provider order in `App.tsx`: `QueryClientProvider` → `TooltipProvider` → `Toaster` + `Sonner` → `BrowserRouter` → `AuthProvider` → `Routes`.

---

## 7. Styling & Theming Guidelines

### 7.1 System
Tailwind CSS v3, `darkMode: ["class"]`, prefix `""`, content globs `./pages|components|app/**/*.{ts,tsx}` and `./src/**/*.{ts,tsx}`. Container: centered, `padding: 2rem`, `2xl: 1400px`. Plugin: `tailwindcss-animate`.

### 7.2 Design tokens (`src/index.css`, HSL triplets)

Light (`:root`):
```
--background 0 0% 100%          --foreground 222.2 84% 4.9%
--card 0 0% 100%                --card-foreground 222.2 84% 4.9%
--popover 0 0% 100%             --popover-foreground 222.2 84% 4.9%
--primary 222.2 47.4% 11.2%     --primary-foreground 210 40% 98%
--secondary 210 40% 96.1%       --secondary-foreground 222.2 47.4% 11.2%
--muted 210 40% 96.1%           --muted-foreground 215.4 16.3% 46.9%
--accent 210 40% 96.1%          --accent-foreground 222.2 47.4% 11.2%
--destructive 0 84.2% 60.2%     --destructive-foreground 210 40% 98%
--border 214.3 31.8% 91.4%      --input 214.3 31.8% 91.4%      --ring 222.2 84% 4.9%
--radius 0.5rem
--sidebar-background 0 0% 98%   --sidebar-foreground 240 5.3% 26.1%
--sidebar-primary 240 5.9% 10%  --sidebar-primary-foreground 0 0% 98%
--sidebar-accent 240 4.8% 95.9% --sidebar-accent-foreground 240 5.9% 10%
--sidebar-border 220 13% 91%    --sidebar-ring 217.2 91.2% 59.8%
```

Dark (`.dark`):
```
--background 222.2 84% 4.9%     --foreground 210 40% 98%
--card 222.2 84% 4.9%           --card-foreground 210 40% 98%
--popover 222.2 84% 4.9%        --popover-foreground 210 40% 98%
--primary 210 40% 98%           --primary-foreground 222.2 47.4% 11.2%
--secondary 217.2 32.6% 17.5%   --secondary-foreground 210 40% 98%
--muted 217.2 32.6% 17.5%       --muted-foreground 215 20.2% 65.1%
--accent 217.2 32.6% 17.5%      --accent-foreground 210 40% 98%
--destructive 0 62.8% 30.6%     --destructive-foreground 210 40% 98%
--border 217.2 32.6% 17.5%      --input 217.2 32.6% 17.5%      --ring 212.7 26.8% 83.9%
--sidebar-background 240 5.9% 10%   --sidebar-foreground 240 4.8% 95.9%
--sidebar-primary 224.3 76.3% 48%   --sidebar-primary-foreground 0 0% 100%
--sidebar-accent 240 3.7% 15.9%     --sidebar-accent-foreground 240 4.8% 95.9%
--sidebar-border 240 3.7% 15.9%     --sidebar-ring 217.2 91.2% 59.8%
```

Tailwind maps each token as `hsl(var(--token))` under `theme.extend.colors` (`border`, `input`, `ring`, `background`, `foreground`, `primary`, `secondary`, `destructive`, `muted`, `accent`, `popover`, `card`, `sidebar.*`). Border radii: `lg: var(--radius)`, `md: calc(var(--radius) - 2px)`, `sm: calc(var(--radius) - 4px)`. Keyframes/animations: `accordion-down` / `accordion-up` (0.2s ease-out).

### 7.3 Base layer
```css
* { @apply border-border; }
body {
  @apply bg-background text-foreground;
  -webkit-tap-highlight-color: transparent;
  -webkit-font-smoothing: antialiased;
}
.safe-area-insets {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

### 7.4 Typography
System font stack (Tailwind default `font-sans`); no custom webfont is loaded. Scale in use: page title `text-lg font-bold tracking-tight`, subtitle `text-[11px] text-muted-foreground`, tab labels and controls `text-xs`, card body `text-xs`/`text-sm`, calendar headers `text-xs sm:text-sm font-semibold`.

### 7.5 Layout rules
- Root wrapper: `min-h-screen bg-background safe-area-insets`.
- Sticky header: `border-b border-border bg-card sticky top-0 z-10`, inner `px-4 py-3`.
- Container width driven by view mode: `max-w-lg` (mobile) vs `max-w-5xl` (desktop), always `mx-auto px-4`.
- Main content: `py-3 space-y-3`; tab list `w-full h-10 grid grid-cols-3`.
- Header control buttons: `h-8`, icon-only `w-8 p-0`, labeled `px-2.5 text-xs`; icons `h-3.5 w-3.5`.
- Week grid scrolls horizontally on mobile (`overflow-x-auto touch-pan-x`, `min-w-[600px]`).
- Touch targets ≥ 32 px; no hover-only affordances.

### 7.6 Class block colors
Inline `style={{ backgroundColor: getClassColor(className) }}` (or a left-bar equivalent) is the **only** sanctioned inline color, because the palette is data-derived rather than theme-derived. Everything else uses semantic Tailwind classes.

### 7.7 Document head (`index.html`)
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no" />
<title>Class Sheet — Your University Schedule</title>
<meta name="description" content="Track your university class schedule with day, week, and table views. Cross-device sync, live now-class highlighting, and countdowns." />
<meta name="theme-color" content="#0F172A" />
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="apple-touch-icon" href="/icon-512.png" />
<!-- og:type, og:title, og:description, og:image, twitter:card=summary_large_image, twitter:title/description/image -->
```
Single `<h1>` per page; semantic `<header>`/`<main>`; `lang="en"`.

---

## 8. Rebuild Checklist

1. Scaffold Vite + React 18 + TS, Tailwind v3, shadcn/ui; set the `@` alias and dev port 8080.
2. Paste the design tokens into `src/index.css` and the token mapping into `tailwind.config.ts`.
3. Provision Supabase Auth (email/password, no anonymous sign-ups) plus the two tables with the exact grants, RLS enable, and four policies each.
4. Add the generated Supabase client and `Database` types under `src/integrations/supabase/`.
5. Implement `src/lib/schedule-data.ts`, `time-format.ts`, `csv-import.ts`, `delete-with-undo.ts`, `utils.ts`.
6. Implement `AuthContext`, `ProtectedRoute`, `useSchedule`, `useTemplates`.
7. Build `Auth`, `Index`, `NotFound`, then the view components (Today/Calendar/Table/Countdown), then the dialogs (ClassForm, ClassManager, CsvImport, ImportSchedule).
8. Wire the header toggles (edit mode, cookie-persisted view mode), tabs, filters, and the undo delete path.
9. Add the PWA manifest, icon, service worker, head metadata, and the production-only SW registration guard.
10. Verify: seeding on a fresh account, canonical time parsing round-trips, LEC/LAB color parity, CSV skip/replace conflicts, undo restore, and cross-device sync after refresh.
