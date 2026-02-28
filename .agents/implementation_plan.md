# Implementation Plan — Resource & Room Approvals

> **Generated after reading every file in the Inginium repo.**

---

## 1 · Existing Codebase Audit

| Layer | What exists today |
|---|---|
| **Framework** | Next.js 16.1.6, React 19, TypeScript 5, TailwindCSS v4 |
| **Database driver** | `@neondatabase/serverless` — raw SQL via `neon()` tagged template + `Pool` singleton (`src/lib/db.ts`) |
| **DB provider** | Neon Postgres (pooled + unpooled URLs in `.env.local`) |
| **ORM** | **None** — no Prisma, no Drizzle, no schema files anywhere |
| **Auth** | **None** — profile page is hard-coded to "Harshil Agrawal"; no session/JWT |
| **API routes** | Single test route: `GET /api/test-db` (smoke test) |
| **Pages** | `/` (Calendar — placeholder events), `/profile`, `/resources` (static list), `/settings` |
| **Sidebar** | Collapsible sidebar with nav: Profile, Resources, Calendar, Settings |
| **Styling** | Tailwind v4 + Geist font; dark zinc theme with `#00E599` accent |
| **Package mgr** | npm (lock-file present) |

### Key implications

1. **Must install Prisma** + generate client (currently zero ORM).
2. **Must add auth** (at minimum role-based session) for approval flows.
3. **Must add Express?** — You said "Express + Prisma + Neon", but the app is currently **Next.js** (not Express). Two options:
   - **Option A (Recommended):** Keep Next.js API routes as the backend. Prisma works natively in Next.js API route handlers. No Express needed.
   - **Option B:** Add a separate Express server (e.g., `/server/index.ts`). This is more complex and duplicates routing.
   - **The plan below assumes Option A** unless you explicitly want a standalone Express server.
4. The `DATABASE_URL_UNPOOLED` env var is ready for Prisma migrations (direct connection, bypasses PgBouncer).
5. All datetimes stored in **UTC** as requested.

---

## 2 · Domain Model

### 2.1 Roles

| Role | Code | Permissions |
|---|---|---|
| **Student** | `STUDENT` | Submit booking requests for club resources + rooms |
| **Club Admin** | `CLUB_ADMIN` | Manage their club's resources; approve/reject resource booking requests for their club |
| **LHC (Lecture Hall Committee)** | `LHC` | Approve / reject **room** booking requests |
| **Dept Head** | `DEPT_HEAD` | Approve / reject **department resource** booking requests |
| **Super Admin** | `SUPER_ADMIN` | Full access (manage users, roles, clubs, departments) |

### 2.2 Entities

```
User
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  role          Role      @default(STUDENT)
  departmentId  String?   → Department
  clubs         ClubMember[]
  createdAt     DateTime  @default(now())  // UTC
  updatedAt     DateTime  @updatedAt       // UTC

Department
  id            String    @id @default(cuid())
  name          String    @unique
  code          String    @unique          // e.g. "CSE", "ECE"
  headId        String?   @unique → User   // dept_head
  resources     Resource[]
  createdAt     DateTime

Club
  id            String    @id @default(cuid())
  name          String    @unique
  departmentId  String?   → Department     // optional affiliation
  members       ClubMember[]
  resources     Resource[]
  createdAt     DateTime

ClubMember
  id            String    @id @default(cuid())
  userId        String    → User
  clubId        String    → Club
  role          ClubRole  // MEMBER | ADMIN
  @@unique([userId, clubId])

Resource
  id            String    @id @default(cuid())
  name          String
  description   String?
  type          ResourceType    // EQUIPMENT | ROOM | VENUE | OTHER
  ownedByClubId String?   → Club           // if club-owned
  ownedByDeptId String?   → Department     // if department-owned
  isActive      Boolean   @default(true)
  createdAt     DateTime
  updatedAt     DateTime

  // Constraint: exactly one of ownedByClubId or ownedByDeptId must be set
  // (enforced via application logic + check constraint)

BookingRequest
  id            String    @id @default(cuid())
  resourceId    String    → Resource
  requestedById String   → User
  title         String
  description   String?
  startTime     DateTime                   // UTC
  endTime       DateTime                   // UTC
  status        BookingStatus @default(PENDING)
  createdAt     DateTime  @default(now())  // UTC
  updatedAt     DateTime  @updatedAt       // UTC
  approvals     Approval[]

Approval
  id            String    @id @default(cuid())
  bookingId     String    → BookingRequest
  approverId    String    → User
  decision      Decision  // APPROVED | REJECTED
  comments      String?
  decidedAt     DateTime  @default(now())  // UTC
```

### 2.3 Enums

```prisma
enum Role {
  STUDENT
  CLUB_ADMIN
  LHC
  DEPT_HEAD
  SUPER_ADMIN
}

enum ClubRole {
  MEMBER
  ADMIN
}

enum ResourceType {
  EQUIPMENT
  ROOM
  VENUE
  OTHER
}

enum BookingStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum Decision {
  APPROVED
  REJECTED
}
```

---

## 3 · Approval Rules (Business Logic)

| Resource ownership | Who approves | Logic |
|---|---|---|
| **Club resource** (ownedByClubId is set, type ≠ ROOM) | `CLUB_ADMIN` of that club | Any user with `ClubMember.role = ADMIN` for that club can approve |
| **Room / Venue** (type = ROOM or VENUE) | **LHC** role user | Any user with `role = LHC` can approve room bookings, regardless of resource ownership |
| **Department resource** (ownedByDeptId is set) | **DEPT_HEAD** of that department | The user whose id = `Department.headId` can approve |

### Multi-step approval (optional, future)
For now: **single approval is sufficient** to move booking from `PENDING` → `APPROVED` or `REJECTED`.

---

## 4 · Implementation Phases

### Phase 1 — Prisma Setup & Schema

| # | Task | Detail |
|---|---|---|
| 1.1 | Install Prisma | `npm i prisma @prisma/client @prisma/adapter-neon @neondatabase/serverless` |
| 1.2 | `npx prisma init` | Creates `prisma/schema.prisma` + updates `.env` |
| 1.3 | Write schema | All models, enums, relations from §2 above |
| 1.4 | Configure for Neon | Use `provider = "postgresql"`, `directUrl` for migrations, `DATABASE_URL` with pooler for runtime |
| 1.5 | Migrate | `npx prisma migrate dev --name init` (uses UNPOOLED URL) |
| 1.6 | Generate client | `npx prisma generate` |
| 1.7 | Create `src/lib/prisma.ts` | Singleton Prisma client (replaces or coexists with `db.ts`) |
| 1.8 | Seed data | `prisma/seed.ts` — create sample departments, clubs, users, resources |

### Phase 2 — Auth (Lightweight)

| # | Task | Detail |
|---|---|---|
| 2.1 | Choose auth | **NextAuth.js v5** (Auth.js) with credentials provider (email/password) OR Google OAuth. For MVP, a simple **cookie-based session** with hard-coded users (seeded) is fine. |
| 2.2 | Install | `npm i next-auth@beta` (or `next-auth@5`) |
| 2.3 | Configure | `src/app/api/auth/[...nextauth]/route.ts` + `auth.ts` config |
| 2.4 | Middleware | `middleware.ts` to protect routes; attach `user.role` to session |
| 2.5 | Session provider | Wrap layout in `<SessionProvider>` |
| 2.6 | Login page | `/login` page |

> **If you want to skip full auth for now**, we can use a simple "mock session" — a `user-id` cookie set on login, decoded in API routes. This is faster to build and lets us focus on the approval flow.

### Phase 3 — API Routes (Next.js Route Handlers)

All routes under `src/app/api/`.

#### 3.1 Resources CRUD

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/resources` | Any | List resources (filterable by club, dept, type) |
| `GET` | `/api/resources/[id]` | Any | Single resource detail |
| `POST` | `/api/resources` | `CLUB_ADMIN`, `DEPT_HEAD`, `SUPER_ADMIN` | Create resource |
| `PATCH` | `/api/resources/[id]` | Owner org admin | Update resource |
| `DELETE` | `/api/resources/[id]` | Owner org admin | Soft-delete (set `isActive = false`) |

#### 3.2 Booking Requests

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/bookings` | Varies | List bookings (own for students; pending for approvers) |
| `GET` | `/api/bookings/[id]` | Requester or approver | Single booking detail |
| `POST` | `/api/bookings` | Any authenticated | Create booking request |
| `PATCH` | `/api/bookings/[id]/cancel` | Requester only | Cancel own booking |

#### 3.3 Approvals

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/bookings/[id]/approve` | Authorized approver | Approve → sets `BookingStatus.APPROVED` |
| `POST` | `/api/bookings/[id]/reject` | Authorized approver | Reject → sets `BookingStatus.REJECTED` |

#### 3.4 Admin

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/clubs` | Any | List all clubs |
| `POST` | `/api/clubs` | `SUPER_ADMIN` | Create club |
| `GET` | `/api/departments` | Any | List all departments |
| `POST` | `/api/departments` | `SUPER_ADMIN` | Create department |
| `GET` | `/api/users` | `SUPER_ADMIN` | List users |
| `PATCH` | `/api/users/[id]/role` | `SUPER_ADMIN` | Change user role |

### Phase 4 — Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/` | Calendar | **Existing** — later integrate bookings as events |
| `/resources` | Resource Browser | **Rewrite** — list from DB, filter by club/dept/type, search |
| `/resources/[id]` | Resource Detail | Show resource info + booking form + booking history |
| `/bookings` | My Bookings | Student: see own bookings. Approver: see pending approvals |
| `/bookings/new` | New Booking | Select resource → pick timeslot → submit |
| `/approvals` | Approval Queue | **LHC / DEPT_HEAD / CLUB_ADMIN** — pending items with approve/reject buttons |
| `/admin/clubs` | Club Management | `SUPER_ADMIN` only — CRUD clubs |
| `/admin/departments` | Department Mgmt | `SUPER_ADMIN` only |
| `/login` | Login | Auth flow |
| `/profile` | Profile | **Existing** — update to show real user data from session |
| `/settings` | Settings | **Existing** — keep as-is |

#### Sidebar additions

Add to `NAV_ITEMS`:
- **Bookings** (icon: clipboard) → `/bookings`
- **Approvals** (icon: check-circle) → `/approvals` — *only visible for LHC, DEPT_HEAD, CLUB_ADMIN*
- **Admin** (icon: shield) → `/admin` — *only visible for SUPER_ADMIN*

### Phase 5 — Polish

| # | Task |
|---|---|
| 5.1 | Conflict detection — prevent double-booking of same resource for overlapping times |
| 5.2 | Email notifications (optional) — on booking submit, approve, reject |
| 5.3 | Calendar integration — show approved bookings on the calendar page |
| 5.4 | Audit log — track all status changes |
| 5.5 | IST display — convert UTC to `Asia/Kolkata` on the frontend if desired |

---

## 5 · File Tree (After Implementation)

```
web/
├── prisma/
│   ├── schema.prisma          ← full schema (§2)
│   ├── seed.ts                ← seed data
│   └── migrations/            ← auto-generated
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── bookings/
│   │   │   │   ├── route.ts           (GET, POST)
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts       (GET)
│   │   │   │       ├── approve/route.ts (POST)
│   │   │   │       ├── reject/route.ts  (POST)
│   │   │   │       └── cancel/route.ts  (PATCH)
│   │   │   ├── resources/
│   │   │   │   ├── route.ts           (GET, POST)
│   │   │   │   └── [id]/route.ts      (GET, PATCH, DELETE)
│   │   │   ├── clubs/route.ts
│   │   │   ├── departments/route.ts
│   │   │   ├── users/
│   │   │   │   └── [id]/role/route.ts
│   │   │   └── test-db/route.ts       ← existing
│   │   ├── approvals/page.tsx
│   │   ├── bookings/
│   │   │   ├── page.tsx
│   │   │   └── new/page.tsx
│   │   ├── resources/
│   │   │   ├── page.tsx               ← rewrite
│   │   │   └── [id]/page.tsx
│   │   ├── admin/
│   │   │   ├── clubs/page.tsx
│   │   │   └── departments/page.tsx
│   │   ├── login/page.tsx
│   │   ├── profile/page.tsx           ← update
│   │   ├── settings/page.tsx          ← keep
│   │   ├── layout.tsx                 ← wrap with SessionProvider
│   │   ├── globals.css
│   │   └── page.tsx                   ← calendar (keep)
│   ├── components/
│   │   ├── Sidebar.tsx                ← update nav items
│   │   ├── BookingCard.tsx
│   │   ├── ResourceCard.tsx
│   │   ├── ApprovalCard.tsx
│   │   ├── BookingForm.tsx
│   │   └── StatusBadge.tsx
│   ├── lib/
│   │   ├── db.ts                      ← keep (raw SQL fallback)
│   │   ├── prisma.ts                  ← NEW: Prisma singleton
│   │   ├── auth.ts                    ← NEW: auth config
│   │   └── permissions.ts             ← NEW: role-based checks
│   └── middleware.ts                  ← NEW: auth guard
└── package.json
```

---

## 6 · Prisma Schema (Draft)

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL_UNPOOLED")
}

enum Role {
  STUDENT
  CLUB_ADMIN
  LHC
  DEPT_HEAD
  SUPER_ADMIN
}

enum ClubRole {
  MEMBER
  ADMIN
}

enum ResourceType {
  EQUIPMENT
  ROOM
  VENUE
  OTHER
}

enum BookingStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum Decision {
  APPROVED
  REJECTED
}

model User {
  id            String        @id @default(cuid())
  email         String        @unique
  name          String
  passwordHash  String?       // null if using OAuth
  role          Role          @default(STUDENT)
  departmentId  String?
  department    Department?   @relation("DeptMembers", fields: [departmentId], references: [id])
  headOf        Department?   @relation("DeptHead")
  clubMembers   ClubMember[]
  bookings      BookingRequest[] @relation("Requester")
  approvals     Approval[]       @relation("Approver")
  createdAt     DateTime      @default(now()) @db.Timestamptz
  updatedAt     DateTime      @updatedAt      @db.Timestamptz

  @@map("users")
}

model Department {
  id        String     @id @default(cuid())
  name      String     @unique
  code      String     @unique
  headId    String?    @unique
  head      User?      @relation("DeptHead", fields: [headId], references: [id])
  members   User[]     @relation("DeptMembers")
  resources Resource[] @relation("DeptResources")
  clubs     Club[]
  createdAt DateTime   @default(now()) @db.Timestamptz

  @@map("departments")
}

model Club {
  id           String       @id @default(cuid())
  name         String       @unique
  departmentId String?
  department   Department?  @relation(fields: [departmentId], references: [id])
  members      ClubMember[]
  resources    Resource[]   @relation("ClubResources")
  createdAt    DateTime     @default(now()) @db.Timestamptz

  @@map("clubs")
}

model ClubMember {
  id     String   @id @default(cuid())
  userId String
  clubId String
  role   ClubRole @default(MEMBER)
  user   User     @relation(fields: [userId], references: [id])
  club   Club     @relation(fields: [clubId], references: [id])

  @@unique([userId, clubId])
  @@map("club_members")
}

model Resource {
  id            String       @id @default(cuid())
  name          String
  description   String?
  type          ResourceType @default(EQUIPMENT)
  ownedByClubId String?
  ownedByDeptId String?
  ownedByClub   Club?        @relation("ClubResources", fields: [ownedByClubId], references: [id])
  ownedByDept   Department?  @relation("DeptResources", fields: [ownedByDeptId], references: [id])
  isActive      Boolean      @default(true)
  bookings      BookingRequest[]
  createdAt     DateTime     @default(now()) @db.Timestamptz
  updatedAt     DateTime     @updatedAt      @db.Timestamptz

  @@map("resources")
}

model BookingRequest {
  id            String        @id @default(cuid())
  resourceId    String
  resource      Resource      @relation(fields: [resourceId], references: [id])
  requestedById String
  requestedBy   User          @relation("Requester", fields: [requestedById], references: [id])
  title         String
  description   String?
  startTime     DateTime      @db.Timestamptz
  endTime       DateTime      @db.Timestamptz
  status        BookingStatus @default(PENDING)
  approvals     Approval[]
  createdAt     DateTime      @default(now()) @db.Timestamptz
  updatedAt     DateTime      @updatedAt      @db.Timestamptz

  @@map("booking_requests")
}

model Approval {
  id         String   @id @default(cuid())
  bookingId  String
  booking    BookingRequest @relation(fields: [bookingId], references: [id])
  approverId String
  approver   User     @relation("Approver", fields: [approverId], references: [id])
  decision   Decision
  comments   String?
  decidedAt  DateTime @default(now()) @db.Timestamptz

  @@map("approvals")
}
```

---

## 7 · Approval Flow (Pseudocode)

```typescript
// POST /api/bookings/[id]/approve

async function approveBooking(bookingId: string, currentUser: User) {
  const booking = await prisma.bookingRequest.findUnique({
    where: { id: bookingId },
    include: { resource: { include: { ownedByClub: true, ownedByDept: true } } },
  });

  if (!booking || booking.status !== "PENDING") throw new Error("Invalid");

  const resource = booking.resource;

  // --- Authorization check ---
  let authorized = false;

  if (resource.type === "ROOM" || resource.type === "VENUE") {
    // Only LHC can approve rooms
    authorized = currentUser.role === "LHC";
  } else if (resource.ownedByDeptId) {
    // Department resource → dept head approves
    const dept = await prisma.department.findUnique({
      where: { id: resource.ownedByDeptId },
    });
    authorized = dept?.headId === currentUser.id;
  } else if (resource.ownedByClubId) {
    // Club resource → club admin approves
    const membership = await prisma.clubMember.findUnique({
      where: {
        userId_clubId: {
          userId: currentUser.id,
          clubId: resource.ownedByClubId,
        },
      },
    });
    authorized = membership?.role === "ADMIN";
  }

  if (!authorized) throw new Error("Forbidden");

  // --- Execute approval ---
  await prisma.$transaction([
    prisma.approval.create({
      data: {
        bookingId,
        approverId: currentUser.id,
        decision: "APPROVED",
      },
    }),
    prisma.bookingRequest.update({
      where: { id: bookingId },
      data: { status: "APPROVED" },
    }),
  ]);
}
```

---

## 8 · Open Questions for You

| # | Question | Default if you don't answer |
|---|---|---|
| 1 | **Express vs. Next.js API routes?** You said "Express + Prisma + Neon", but the app is Next.js. Should I add a standalone Express server, or use Next.js API routes? | **Next.js API routes** (simpler, no need for separate server) |
| 2 | **Auth approach?** Full NextAuth with Google/credentials, or a lightweight mock session for MVP? | **Mock session** (cookie-based, seeded users) — can upgrade later |
| 3 | **Multi-step approvals?** E.g., room bookings need both club_admin + LHC approval? Or single-step? | **Single-step** for now |
| 4 | **IST display?** You mentioned UTC storage. Should the UI display IST (`Asia/Kolkata`) by default, or detect user's timezone? | **IST (`Asia/Kolkata`)** on all UI |
| 5 | **Should I start building Phase 1 (Prisma + schema) now?** | Awaiting your go-ahead |

---

## Summary

Your Inginium app is a **Next.js 16 + Tailwind v4 + Neon Postgres** project with a clean dark UI, a sidebar, a calendar home page, and placeholder pages for profile/resources/settings. There is **no ORM, no auth, and no database schema** yet — only a raw Neon SQL driver (`@neondatabase/serverless`).

The plan adds:
- **Prisma ORM** with 7 models (User, Department, Club, ClubMember, Resource, BookingRequest, Approval)
- **Role-based approval logic**: clubs approve their resources, LHC approves rooms, dept_head approves department resources
- **13+ API routes** for CRUD + approval workflows
- **6+ new frontend pages** (bookings, approvals, admin, login, resource detail)
- **Auth** (NextAuth or mock session)

Awaiting your answers to the open questions above before I start coding!
