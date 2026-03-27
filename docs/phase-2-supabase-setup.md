# Phase 2 — Supabase Setup

## What you need to do in Supabase UI
1. Create a new Supabase project.
2. Go to **Authentication → Providers** and enable **Email**.
3. Go to **SQL Editor** and run the schema in `supabase/schema.sql` (we create it in this phase).
4. Copy these values into your env files:
   - Project URL → `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service role key → `SUPABASE_SERVICE_ROLE_KEY`
   - JWT secret → `SUPABASE_JWT_SECRET`

## Files we manage locally
- `supabase/schema.sql`
- `backend/.env` (copy from `.env.example`)
- `frontend/.env.local` (copy from `.env.example`)
