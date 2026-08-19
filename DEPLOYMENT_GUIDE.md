# Deployment Guide — Divinenet CRM Phase 2

This guide covers running and containerising the Divinenet CRM Phase 2 module.
All data is fictional; AI and social connectors run in mock mode until live
credentials arrive.

## 1. Architecture

| Component | Location | Runs on |
| :--- | :--- | :--- |
| Backend API | `sprint2/backend-api` branch, `backend/` | Node.js 24, port 3000 |
| Frontend SPA | `main` branch, repo root | Static files, nginx port 8080 |
| Database | `backend/data/` | SQLite (better-sqlite3), auto-created |

## 2. Local Development

### Backend

```bash
cd backend
npm install
npm start            # PORT=3000, default SQLite file in ./data
```

Environment (`backend/.env`, never commit):

| Variable | Purpose | Default |
| :--- | :--- | :--- |
| `PORT` | HTTP port | `3000` |
| `JWT_SECRET` | Token signing secret | random per boot |
| `AI_MOCK` | `1` = offline AI mock | auto |
| `SOCIAL_MOCK` | `1` = mock connectors | `1` unless `META_ACCESS_TOKEN` |
| `PHASE1_MOCK` | `1` = mock Phase 1 data | `1` unless `PHASE1_API_BASE` |
| `PHASE1_API_BASE` | Live Phase 1 base URL | (empty) |

### Frontend

No build step — serve the repo root (`index.html`, `style.css`, `apps.js`,
`js/`). The SPA calls `/api/...` (same origin) or a base URL configured in
`js/api.js`. During local dev point it at `http://localhost:3000`.

### Tests

```bash
cd backend
npm test     # jest + supertest, SQLite in-memory, 94 tests
```

## 3. Docker Deployment

Two images are built:

- `backend`: from the `sprint2/backend-api` branch (git context),
  `backend/Dockerfile`.
- `frontend`: from this repo root, `Dockerfile.frontend` (nginx serving the
  static SPA and proxying `/api` to the backend).

### Build and run

```bash
docker compose up --build -d
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:3000/api
- Persistent SQLite data: `./data` (host volume)

### Log in (seed users)

| Email | Password | Role |
| :--- | :--- | :--- |
| `admin@divinenet.test` | `admin123` | Admin |
| `manager@divinenet.test` | `manager123` | Campaign Manager |
| `staff@divinenet.test` | `staff123` | Marketing Staff |
| `approver@divinenet.test` | `approver123` | Client Approver |

## 4. Going Live (when credentials arrive)

1. Set `PHASE1_API_BASE` to the Phase 1 endpoint — the adapter
   (`backend/services/phase1_adapter.js`) falls back to mock on any error.
2. Set `META_ACCESS_TOKEN` (and a `PAGE_ID`/`INSTAGRAM_ID`) to switch social
   connectors to live mode (`backend/services/social_connectors.js`).
3. Set `AI_MOCK=0` plus the provider key to enable real AI narrative drafting
   (`backend/services/ai_provider.js`).
4. Restart the container. Nothing else changes — routes and contract are stable.

## 5. Security Notes

- JWT Bearer tokens required on all `/api` routes except login and health.
- Passwords are bcrypt-hashed; never exposed in responses.
- API keys are environment-only — never commit them.
