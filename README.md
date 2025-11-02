# CMS

Angular 20 + Express full-stack content management system with server-side rendering (SSR), SQLite persistence, and a small admin toolkit for blogs, static pages, personal notes, and expenses.

- **Frontend**: Angular standalone components, SSR-ready, theme + language aware UI.
- **Backend**: Express API with JWT authentication, session persistence, Knex ORM, Nodemailer integration.
- **Storage**: SQLite database (auto-initialised) for pages, blogs, notes, expenses, users, and an additional SQLite file for session storage.

---

## Features

- Page builder with Markdown/WYSIWYG content, multilingual routing, and slug management.
- Blog management (create, edit, delete) with language-aware filtering, categories, and hero metadata.
- Personal productivity suite: notes with calendar view, expenses tracker with recurring payment helpers.
- Auth flows (register/login/logout) secured with bcrypt + JWT; admin role gates privileged endpoints.
- Light/Dark theme and language persisted in cookies; toggles exposed in the UI.
- Contact form delivery through Nodemailer with configurable SMTP credentials.

---

## Tech Stack

- Angular 20, Angular SSR (`@angular/ssr`)
- Express 5, `express-session`, `connect-session-knex`
- SQLite (`knex`, `sqlite3`)
- Authentication: `jsonwebtoken`, `bcrypt`
- Tooling: TypeScript 5.9, Angular CLI 20, Dockerfile for reproducible builds

---

## Getting Started

### 1. Prerequisites

- Node.js 20+
- npm 10+
- SQLite3 (CLI utilities) if you need to inspect/seed the DB

### 2. Install dependencies

```bash
npm install
```

### 3. Environment variables

Create a `.env` file at the project root. Values below are examples—replace with secure secrets and your own domains.

```bash
PORT=4000
cookieSecret=change-me-session-secret
TOKEN_KEY=change-me-jwt-secret
adminEmail=admin@example.com
ORIGIN=http://localhost:4200
ORIGIN2=http://localhost:4000
emailHost=smtp.gmail.com
emailAuth=gmail-user@example.com
emailPassword=app-password
emailSenderTo=CMS Contact <noreply@example.com>
emailSenderFrom=you@example.com
```

Frontend API calls point to `environment.apiUrl` (`src/environments/environment.ts`). For local development set it to your server URL, e.g.:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:4000/',
  adminEmail: 'admin@example.com',
};
```

### 4. Database

- Primary DB file lives at `database/db.sqlite`. Tables are created automatically at runtime (see `src/set-database.ts`).
- Session data is stored in `connect-session-knex.sqlite`.
- To seed starter content you can insert rows with the SQLite CLI (`sqlite3 database/db.sqlite`).

---

## Development Workflow

### Angular-only dev server

Serves the SPA on port 4200 without the Express backend.

```bash
npm run serve
```

Use this for quick UI iteration. API calls must target a running backend (`environment.apiUrl`).

### SSR + API server

Build the universal bundle then start the Node server (Express + Angular SSR) on `PORT` (default 4000).

```bash
npm run build:ssr
npm run start          # alias for npm run serve:ssr
```

For incremental development you can run the Angular builder in watch mode and restart the Node server as needed:

```bash
npm run watch          # rebuilds on changes using the "development" config
```

### Testing

Unit tests (Karma):

```bash
npm test
```

No e2e suite is bundled; add your preferred tool (Playwright, Cypress, etc.) as required.

---

## API Overview

All routes are prefixed with `/api/v1`.

| Area      | Auth      | Methods                                                                 |
|-----------|-----------|-------------------------------------------------------------------------|
| Auth      | Public    | `POST /login`, `POST /register`, `GET /logout`                          |
| User      | User      | `GET /user`                                                             |
| Pages     | User      | `GET /pages`, `GET /pages/:slug`, `GET /pages/:slug/:subpage`           |
|           | Admin     | `POST /pages/create`, `PATCH /pages/update`, `DELETE /pages/delete/:id` |
| Blogs     | Public    | `GET /blogs`, `GET /blogs/:slug`                                        |
|           | Admin     | `POST /blogs/create`, `PATCH /blogs/update`, `DELETE /blogs/delete/:id` |
| Expenses  | User      | `GET /expenses`, `GET /expenses/:slug`, CRUD via `/expenses/*`          |
| Notes     | User      | `GET /notes`, `GET /notes/:slug`, CRUD via `/notes/*`                   |
| Contact   | Public    | `POST /contact` (uses Nodemailer)                                       |

- User-level endpoints require a valid JWT stored in the `token` cookie or sent as `Authorization: Bearer <token>`.
- Admin routes additionally verify the JWT email matches `adminEmail`.

---

## Docker

The provided `Dockerfile` builds the SSR bundle and produces a slim runtime image.

```bash
docker build -t cms .
docker run --env-file .env -p 4000:4000 cms
```

Mount `database/` as a volume if you need persistence outside the container.

---

## Project Structure

```
cms/
├─ src/
│  ├─ app/                 # Standalone components, pages, services, utilities
│  ├─ server.ts            # Angular SSR entry + Express bootstrap
│  ├─ server-BE.ts         # REST API routes and middleware
│  └─ set-database.ts      # SQLite + Knex setup, auto-table creation
├─ database/db.sqlite      # Primary data store (auto-generated)
├─ connect-session-knex.sqlite # Session store (auto-generated)
├─ Dockerfile
├─ angular.json
└─ package.json
```

---

## Common Tasks

- Add a new Angular page: `ng generate component pages/your-page --standalone`
- Add API endpoints: extend `routes` inside `src/server-BE.ts`
- Update translations or mode defaults: see tokens `LANG`, `MODE`, `TOKEN` under `src/app`

---

## Troubleshooting

- **Cannot authenticate**: verify `TOKEN_KEY`, `cookieSecret`, and `adminEmail` match between `.env` and Angular environment.
- **CORS errors**: update `ORIGIN` and `ORIGIN2` to include the host/port of your frontend.
- **Missing tables**: delete `database/db.sqlite` to let Knex recreate schema at next startup (data loss warning).
- **Emails failing**: confirm SMTP credentials, ports, and that less secure app access is enabled when using Gmail.

---

## License

This project is proprietary. Contact the repository owner for licensing details.
