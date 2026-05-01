# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**FootPilot** — French-language mobile-first football club management app. Monorepo with separate `frontend/` and `backend/` packages.

## Commands

### Docker (full stack)
```bash
docker compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
# Adminer:  http://localhost:8080 (server=db, user=footpilot, pass=footpilot_secret)
```

### Local development (WSL/Linux)
```bash
# Start DB only
docker compose up db -d

# Backend
cd backend && npm install && npx prisma db push && npm run db:seed && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

### Common backend tasks
```bash
npx prisma db push      # Sync schema changes to DB (dev)
npx prisma generate     # Regenerate Prisma client types
npm run db:seed         # Reset DB with demo data
npm run db:studio       # Open Prisma Studio GUI
npm run build           # Compile TypeScript → dist/
```

### Common frontend tasks
```bash
npm run build     # Vite production build → dist/
npm run preview   # Test production build locally
```

There are no automated tests in this project.

## Architecture

### Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + React Router v6
- **Backend**: Express + TypeScript + Prisma ORM
- **Database**: PostgreSQL 16
- **Auth**: JWT (7-day expiry) stored in `localStorage` (`fp_token`, `fp_user`)
- **Email**: Nodemailer (Ethereal for dev, configurable SMTP for prod)
- **Images**: Multer + Sharp for upload and processing

### Frontend structure
- `src/App.tsx` — All 40+ routes, wrapped in `RequireAuth` with role arrays
- `src/api/client.ts` — Axios instance: auto-attaches Bearer token, redirects to `/login` on 401
- `src/api/*.ts` — Typed wrappers per API resource
- `src/contexts/AuthContext.tsx` — User/token state, persists to localStorage
- `src/components/layout/` — Sidebar, BottomNav (mobile), RequireAuth guard
- `src/pages/admin/` — GESTIONNAIRE pages
- `src/pages/dashboard/` — ENTRAINEUR/JOUEUR pages
- `src/types/index.ts` — All shared TypeScript types
- `src/i18n/` — Translation JSON files (fr, en, ar, de, es, it, zh)

### Backend structure
- `src/index.ts` — Express app: middleware, route mounting, health check
- `src/routes/` — 14 router files, one per resource
- `src/middleware/auth.ts` — `verifyToken` (JWT check) + `requireRole(Role.X)` (403 if not allowed)
- `src/lib/prisma.ts` — Singleton Prisma client (avoids connection leaks on hot-reload)
- `src/lib/email.ts` — Email templating + Nodemailer sending
- `prisma/schema.prisma` — Source of truth for DB schema
- `prisma/seed.ts` — Creates 4 demo accounts + club + sample data

### Roles
| Role | Access |
|------|--------|
| `GESTIONNAIRE` | Full admin: members, categories, delete operations |
| `ENTRAINEUR` | Coaches: create events, manage teams/players, attendance |
| `JOUEUR` | Players: view own stats and planning |

Route protection is symmetric: frontend uses `RequireAuth` with role arrays; backend uses `requireRole()` middleware on each route.

### Key data model relationships
- **Club** is the root entity — everything belongs to one club
- **Evenement** is polymorphic base for **Match** and **Entrainement** (via `TypeEvenement` enum)
- **Joueur** can exist without a User account (manual entry); `userId` is optional
- **Entraineur** always has a linked User account (`userId` unique)
- **JoueurEquipe** is the many-to-many junction for players↔teams

### Auth flow
1. Gestionnaire creates invitation → email sent with token link (`/register/:token`)
2. User registers via token → JWT issued, token invalidated
3. Alternative: join codes (`/join/:code`) bypass email entirely
4. All API calls go through the Axios interceptor in `src/api/client.ts`

## Environment variables

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://footpilot:footpilot_secret@localhost:5432/footpilot
JWT_SECRET=change_me_to_a_long_random_string_in_production
PORT=3001
CORS_ORIGIN=http://localhost:3000
APP_URL=http://localhost:3000        # Used in invitation email links
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=http://localhost:3001
```

## Test accounts (seeded)
| Email | Password | Role |
|-------|----------|------|
| `gestionnaire@footpilot.fr` | `Gestionnaire123!` | GESTIONNAIRE |
| `entraineur@footpilot.fr` | `Entraineur123!` | ENTRAINEUR |
| `joueur1@footpilot.fr` | `Joueur123!` | JOUEUR |
| `joueur2@footpilot.fr` | `Joueur123!` | JOUEUR |

## Conventions
- All model names, API error messages, and UI text are in **French**
- Backend validation uses **Zod**; frontend relies on form state (no Zod on frontend)
- DB schema changes: edit `schema.prisma` → `npx prisma db push` → `npx prisma generate`
- Path alias `@/*` maps to `frontend/src/*` (configured in Vite + tsconfig)
- **i18n** : lors de tout ajout de clé de traduction, modifier **uniquement `fr.json`**. Les six autres fichiers (`en`, `de`, `es`, `it`, `zh`, `ar`) sont gelés — ne pas les toucher.
