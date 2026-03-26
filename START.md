# Quick Start Guide

## Prerequisites

You need **PostgreSQL** running. Pick one method:

### Option A — Docker Desktop (Recommended, easiest)
1. Download Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Install and start it
3. Run in this folder:
   ```
   docker-compose up postgres -d
   ```
   This starts PostgreSQL on port 5432 with user `postgres` / password `postgres`.

### Option B — PostgreSQL Installer (Windows native)
1. Download: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
2. Install PostgreSQL 16, set password to `postgres`
3. Open pgAdmin or psql and create database:
   ```sql
   CREATE DATABASE voice_sales_trainer;
   ```

---

## Start the Application

### Terminal 1 — Backend
```bash
cd backend
npm install       # already done
npm run migrate   # creates tables
npm run dev       # starts on :5000
```

### Terminal 2 — Frontend
```bash
cd frontend
npm install       # already done
npm run dev       # starts on :3000
```

Then open: http://localhost:3000

---

## First Time Setup

1. Go to http://localhost:3000/register
2. Create an **Admin** account (role: admin)
3. Create a **Candidate** account (role: candidate)
4. Login as candidate → click a scenario → click **Start Session**
5. Allow microphone → speak → click mic to stop → AI responds with voice
6. Click **End & Score** to get your evaluation

---

## API Keys Status

| Key | Status |
|-----|--------|
| ANTHROPIC_API_KEY | ✓ Configured |
| OPENAI_API_KEY | ✓ Configured |
| ELEVENLABS_API_KEY | ✓ Configured |
| JWT_SECRET | ✓ Configured |
| PostgreSQL | Needs setup (see above) |

---

## API Endpoints Reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/auth/register | — | Register user |
| POST | /api/auth/login | — | Login |
| GET | /api/auth/me | JWT | Current user |
| GET | /api/sessions/scenarios | JWT | List scenarios |
| POST | /api/sessions | JWT | Start session |
| POST | /api/sessions/:id/turn | JWT + audio | Send voice turn |
| POST | /api/sessions/:id/complete | JWT | End + evaluate |
| GET | /api/sessions | JWT | My sessions |
| GET | /api/sessions/:id | JWT | Session detail |
| GET | /api/admin/stats | Admin | Dashboard stats |
| GET | /api/admin/candidates | Admin | All candidates |
| GET | /api/admin/candidates/:id/sessions | Admin | Candidate history |
| PATCH | /api/admin/candidates/:id/status | Admin | Toggle active |

---

## Security Reminder

⚠️ Rotate your API keys — they were shared in plaintext:
- Anthropic: https://console.anthropic.com/settings/keys
- OpenAI: https://platform.openai.com/api-keys
- ElevenLabs: https://elevenlabs.io/app/profile/api-key
