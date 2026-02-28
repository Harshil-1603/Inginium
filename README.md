## SYSTEM TYPE

* Internal college system
* Resource allocation system
* 100 users scale
* Built using:

  * Next.js (frontend + API routes as REST backend)
  * Neon PostgreSQL
  * Prisma ORM
  * JWT auth
  * Vercel deployment

---

# 👥 ROLES

### 1. Student (12 dummy)

* Can browse:

  * Department resources
  * Club resources
* Can request:

  * Department resources
  * Club resources
* Must enter roll number when requesting
* Can see:

  * Weekly LHC booking calendar (read-only)
  * Their own requests
* Cannot approve anything
* No club memberships

---

### 2. Professor (5 dummy)

* Can browse:

  * Department resources
* Cannot browse club resources
* Can request:

  * Department resources
  * LHC rooms
* Can see weekly LHC calendar (read-only)
* Cannot approve anything

---

### 3. Club (5 dummy)

* Created only by Admin
* Owns resources
* Can:

  * Add/remove their own resources
  * Approve resource requests made to their club
  * Request department resources
  * Request LHC rooms
* “Person with access to club ID” can approve club requests
  (We will model this as: club has `clubManagerId`)

---

### 4. Department (5 fixed)

* Has resources
* Has lab technician
* Lab technician approves department resource requests
* Students & Professors can request department resources directly

---

### 5. LHC (1 dummy)

* Owns all rooms
* Only LHC can approve room bookings
* Manages room booking queue
* Can see weekly calendar (editable view)
* First come first serve
* Automatic waitlist

---

### 6. Admin (1)

* Can:

  * See everything
  * Cancel everything
  * Override approvals
  * Reopen requests
  * View logs
* Logs record:

  * Important actions
  * Who performed action
  * Timestamp
  * Previous + new state

---

# 📦 RESOURCES

* Strict ownership:

  * Resource belongs to either:

    * Department
    * Club
* No global resources
* Predefined inventory
* Has:

  * Quantity
  * Time-based reservation
* User can only request <= available quantity
* No over-requesting
* Partial approval NOT allowed (since request limited by availability)

---

# 🏫 ROOMS (LHC)

* Managed only by LHC
* Can be requested by:

  * Professors
  * Clubs
* Students cannot book rooms
* No double booking
* If time conflict → request is rejected
* First come first serve
* Automatic waitlist:

  * If cancellation happens
  * Next in queue auto promoted
  * Email notification sent

---

# 📝 REQUEST LIFECYCLE

Single step approval.

States:

For Resources:

```
PENDING
APPROVED
REJECTED
CANCELLED
OVERRIDDEN (admin)
```

For Rooms:

```
PENDING
WAITLISTED
APPROVED
REJECTED
CANCELLED
OVERRIDDEN
```

Reopen allowed by Admin.

---

# 📅 WEEKLY CALENDAR

* Shows only LHC bookings
* Week view
* Time slots
* Read-only for:

  * Students
  * Professors
  * Clubs
  * Department
* Editable only by:

  * LHC

---

# 📧 EMAIL

* Automatic email on:

  * Approval
  * Rejection
  * Promotion from waitlist
  * Cancellation

---

# 📊 LOGGING

Log only important actions:

* Approve
* Reject
* Cancel
* Override
* Reopen
* Add/remove resource
* Room booking approval

Log includes:

* userId
* role
* actionType
* entityType
* entityId
* oldState
* newState
* timestamp

---

# 🔐 AUTH

* Email + password
* JWT
* No role change allowed
* Expiry I will set to 12 hours


Stack:

* **Next.js (App Router)**
* **Next.js API Routes (REST backend)**
* **Prisma ORM**
* **Neon**
* **JWT Authentication**
* **Vercel Deployment**

No external Express server. Everything inside Next.js.

---

# 🏗️ PART 1 — SYSTEM ARCHITECTURE

```
Browser
   ↓
Next.js (UI + API routes)
   ↓
Prisma
   ↓
Neon PostgreSQL
```

Everything runs inside one Next.js app.

---

# 📁 PART 2 — PROJECT STRUCTURE

Create project:

```bash
npx create-next-app ingenium
cd ingenium
npm install prisma @prisma/client jsonwebtoken bcrypt nodemailer date-fns
npx prisma init
```

Final structure:

```
ingenium/
├── app/
│   ├── dashboard/
│   ├── calendar/
│   ├── admin/
│   ├── api/
│   │   ├── auth/
│   │   ├── resources/
│   │   ├── rooms/
│   │   ├── approvals/
│   │   ├── logs/
│   │   └── users/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── DashboardLayout.tsx
│   ├── WeeklyCalendar.tsx
│   ├── ResourceCard.tsx
│   ├── RequestModal.tsx
│   ├── ApprovalsTable.tsx
│   └── ThemeToggle.tsx
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── rbac.ts
│   ├── logger.ts
│   ├── mailer.ts
│   └── waitlist.ts
├── prisma/
│   └── schema.prisma
├── middleware.ts
├── .env
└── package.json
```

---

# 🗄️ PART 3 — DATABASE SCHEMA (Prisma)

File: `prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  STUDENT
  PROFESSOR
  CLUB_MANAGER
  LAB_TECH
  LHC
  ADMIN
}

enum ResourceOwnerType {
  CLUB
  DEPARTMENT
}

enum RequestStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
  WAITLISTED
  OVERRIDDEN
}

model User {
  id           Int    @id @default(autoincrement())
  email        String @unique
  password     String
  role         Role
  rollNumber   String?
  departmentId Int?
  clubId       Int?
  createdAt    DateTime @default(now())
}

model Department {
  id    Int    @id @default(autoincrement())
  name  String
  resources Resource[]
}

model Club {
  id             Int @id @default(autoincrement())
  name           String
  managerId      Int
  resources      Resource[]
}

model Resource {
  id        Int @id @default(autoincrement())
  name      String
  quantity  Int
  ownerType ResourceOwnerType
  ownerId   Int
}

model ResourceRequest {
  id          Int @id @default(autoincrement())
  resourceId  Int
  requesterId Int
  quantity    Int
  startTime   DateTime
  endTime     DateTime
  status      RequestStatus @default(PENDING)
  queuePosition Int?
  createdAt   DateTime @default(now())
}

model Room {
  id        Int @id @default(autoincrement())
  name      String
  capacity  Int
}

model RoomBooking {
  id          Int @id @default(autoincrement())
  roomId      Int
  requesterId Int
  startTime   DateTime
  endTime     DateTime
  status      RequestStatus @default(PENDING)
  queuePosition Int?
}

model Log {
  id         Int @id @default(autoincrement())
  userId     Int
  role       Role
  action     String
  entityType String
  entityId   Int
  oldState   String?
  newState   String?
  createdAt  DateTime @default(now())
}
```

Run:

```bash
npx prisma migrate dev --name init
```

---

# 🔐 PART 4 — AUTH SYSTEM

File: `lib/auth.ts`

* Hash password (bcrypt)
* Generate JWT (12h expiry)
* Verify JWT
* Attach user to request

---

# 🛂 PART 5 — RBAC ENGINE

File: `lib/rbac.ts`

Functions:

```ts
export function requireRole(user, allowedRoles)
export function canApproveResource(user, resource)
export function canApproveRoom(user)
```

Rules implemented exactly as you defined.

---

# 🧠 PART 6 — WAITLIST ENGINE

File: `lib/waitlist.ts`

Algorithm:

When new request arrives:

1. Check overlapping approved bookings.
2. If conflict:

   * Assign queuePosition = max(queuePosition) + 1
   * status = WAITLISTED

When cancellation happens:

1. Find lowest queuePosition WAITLISTED
2. Promote to APPROVED
3. Send email

---

# 📧 PART 7 — EMAIL SYSTEM

File: `lib/mailer.ts`

Using nodemailer:

Send on:

* Approve
* Reject
* Promotion
* Cancel

---

# 📜 PART 8 — LOGGING SYSTEM

File: `lib/logger.ts`

Function:

```ts
logAction(user, action, entityType, entityId, oldState, newState)
```

Called inside every:

* Approval
* Cancellation
* Override
* Reopen

---

# 🔄 PART 9 — API ROUTES (REST)

Examples:

```
/api/auth/login
/api/resources/list
/api/resources/request
/api/approvals/approve
/api/rooms/book
/api/rooms/approve
/api/logs/list
```

Each route:

1. Verify JWT
2. Validate role
3. Perform DB action
4. Log action
5. Send email if required
6. Return JSON

---

# 📅 PART 10 — WEEKLY CALENDAR

Component: `components/WeeklyCalendar.tsx`

Uses:

* Fetch `/api/rooms/approved`
* Map bookings into time slots
* Week view using date-fns
* Read-only unless role == LHC

---

# 🖥️ PART 11 — DASHBOARDS

Each role sees different sidebar:

### Student

* Browse resources
* My requests
* Weekly calendar

### Professor

* Department resources
* Room booking
* My requests
* Weekly calendar

### Club Manager

* Club resources
* Approve club requests
* Request dept resources
* Book room
* Weekly calendar

### Lab Technician

* Approve department resource requests

### LHC

* Approve room bookings
* Manage calendar

### Admin

* Everything
* Logs
* Override
* Cancel

---

# 🎨 PART 12 — UI DESIGN

Minimal academic style:

* Sidebar
* Top navbar
* Clean white layout
* Dark/light toggle
* Responsive grid

---

# 🚀 PART 13 — DEPLOYMENT

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables:

   * DATABASE_URL
   * JWT_SECRET
   * EMAIL_USER
   * EMAIL_PASS

---

# 📦 PART 14 — SEED SCRIPT

Create:

`prisma/seed.ts`

Create:

* 12 students
* 5 professors
* 5 departments
* 5 clubs
* 5 club managers
* 1 lab tech per department
* 1 LHC
* 1 Admin
* Predefined resources
* 3 rooms

---

# 🧱 BUILD ORDER (Follow Exactly)

1. Setup Prisma + Neon
2. Implement auth
3. Implement resource listing
4. Implement resource request
5. Implement approval logic
6. Implement waitlist engine
7. Implement room booking
8. Implement logging
9. Implement weekly calendar
10. Implement dashboards
11. Implement email
12. Test flows
13. Deploy

