# SKO App (Backend + MCP + Frontend) Startup Guide

This project has two app parts:

- **backend/** (Express + Socket.io + SQLcl MCP client)
- **frontend/** (React + Vite)

The backend starts and initializes:

1. SQLcl MCP client
2. Oracle schema setup
3. HTTP/Socket server on port **3001**

---

## 1) Prerequisites

- Node.js and npm installed
- SQLcl installed at:
  - `/Applications/sqlcl/bin/sql`
- A saved SQLcl connection named:
  - `VIBECODING_HIGH_1`

Backend config is in `backend/config.js`.

---

## 2) Install dependencies

From project root:

```bash
cd /Users/aojah/Documents/vibecode-project/backend && npm install
cd /Users/aojah/Documents/vibecode-project/frontend && npm install
```

---

## 3) Start backend (includes MCP startup)

From project root:

```bash
cd /Users/aojah/Documents/vibecode-project/backend && npm run dev
```

Alternative (no watch mode):

```bash
cd /Users/aojah/Documents/vibecode-project/backend && npm start
```

Expected logs include:

- `[Boot] Initializing SQLcl MCP client…`
- `[MCP] Connected to SQLcl`
- `[Boot] Initializing database schema…`
- `[SKO] Server running at http://localhost:3001`
- `[SKO] MCP endpoint: http://<your-ip>:3001/mcp`

> Note: `node run` is not valid here. Use `npm start` or `npm run dev`.

---

## 4) Start frontend

In a new terminal:

```bash
cd /Users/aojah/Documents/vibecode-project/frontend && npm run dev
```

Vite will print a local URL (usually `http://localhost:5173`).

---

## 5) Verify everything is running

- Backend API health check (example): open `http://localhost:3001/api/app-url`
- MCP endpoint available at: `http://localhost:3001/mcp`
- Frontend available at Vite URL (usually `http://localhost:5173`)

---

## Troubleshooting

### Error: `Cannot find module .../backend/run`

You ran:

```bash
node run
```

Use:

```bash
npm run dev
```

or:

```bash
npm start
```

### Error: `EADDRINUSE: address already in use 0.0.0.0:3001`

Port 3001 is already in use. Find and stop the process:

```bash
lsof -nP -iTCP:3001 -sTCP:LISTEN
kill <PID>
```

If needed:

```bash
kill -9 <PID>
```
