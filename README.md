# Lead City University Academic Calendar

A cloud-based academic calendar monitoring and notification system for Lead City University.
This MVP focuses on reliable calendar updates, role-based access (admin, staff, student), and in-app notifications.

## What This App Does
- Centralizes academic calendar updates (tests, exams, seminars, announcements, holidays).
- Allows admins to create events for everyone, staff only, or students (by level).
- Provides a clean dashboard with upcoming events, a calendar view, and in-app reminders.
- Uses an approval workflow for new accounts (self-signup + admin approval).
- Supports urgent updates that notify users immediately in-app.
- Generates reminders 7 days and 1 day before events (via cron).

## Roles & Access
- **Admin**: approves users, creates and manages events, runs session rollover promotions.
- **Staff**: views the calendar, receives notifications, and has a dedicated dashboard.
- **Student**: views the calendar, receives notifications, and has a dedicated dashboard.

## Key Features
- **Self-signup + Admin approval** workflow.
- **Event creation** with audience targeting: everyone, staff, or students (by level).
- **Urgent events**: create immediate in-app notifications.
- **Scheduled reminders**: 7 days and 1 day before events (cron-triggered).
- **Calendar view** with month grid, list view, and event details modal.
- **Notifications** page with pagination and read status.
- **Profile** page with role-specific details (matric number or staff ID).
- **Session rollover** tool to promote student levels (100→200→300→400→500).

## Tech Stack
- **Frontend**: Next.js (App Router), React, TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express
- **Auth & Database**: Supabase
- **Notifications**: In-app (Supabase table + cron)

## Repository Structure
- `frontend/` - Next.js app (UI, routing, client logic)
- `backend/` - Express API (auth checks, admin APIs, event APIs, notifications, cron)
- `supabase/` - SQL schema and patches
- `docs/` - Documentation and reviewer notes

## Local Development
### 1) Backend
```bash
cd backend
npm install
npm run dev
```

### 2) Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables
### Backend (`backend/.env`)
```
PORT=4000
CORS_ORIGIN=http://localhost:3000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
CRON_SECRET=
ENABLE_CRON=false
NOTIFY_WINDOW_MINUTES=60
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Cron (Reminders)
Use an external cron service (e.g., cron-job.org) to call:
```
POST https://<your-backend-domain>/notifications/run
Header: x-cron-secret: <CRON_SECRET>
```

## Deployment Notes
- Frontend: Netlify
- Backend: Render
- Ensure CORS origin matches your Netlify domain (no trailing slash).

---

For a full walkthrough of every page and feature, see:
- `docs/APP_OVERVIEW.txt`
