import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import session from 'express-session';
import cors from 'cors';
import cron from 'node-cron';
import { randomUUID } from 'crypto';
import qrcode from 'qrcode';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

import config from './config.js';
import { initMcpClient, getMcpClient, getAllTools } from './db/mcpClient.js';
import { initSchema } from './db/init.js';
import { runGrouping } from './services/groupingService.js';
import authRouter from './routes/auth.js';
import questionsRouter from './routes/questions.js';
import groupsRouter from './routes/groups.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── App setup ────────────────────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
  cors: { origin: '*', credentials: true },
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const sessionMiddleware = session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 8 * 60 * 60 * 1000 }, // 8 hours
});
app.use(sessionMiddleware);

// Share session with Socket.io
io.engine.use(sessionMiddleware);

// Attach io to every request so routes can emit events
app.use((req, res, next) => { res.locals.io = io; next(); });

// ─── MCP HTTP Streamable proxy ─────────────────────────────────────────────
// One McpServer instance; sessions are managed per transport
const mcpSessions = new Map();

function buildMcpServer() {
  const server = new McpServer({
    name: 'sko-sqlcl-proxy',
    version: '1.0.0',
  });

  const client = getMcpClient();
  const tools = getAllTools();

  // Tool input schemas based on discovered SQLcl MCP tools
  const toolSchemas = {
    'list-connections': { filter: z.string().optional() },
    'connect':          { connection_name: z.string() },
    'disconnect':       {},
    'run-sqlcl':        { sqlcl: z.string() },
    'run-sql':          { sql: z.string() },
    'schema-information': {},
  };

  for (const tool of tools) {
    const inputSchema = toolSchemas[tool.name] ?? { sql: z.string().optional() };
    server.registerTool(
      tool.name,
      { description: tool.description || `SQLcl tool: ${tool.name}`, inputSchema },
      async (args) => client.callTool({ name: tool.name, arguments: args })
    );
  }

  return server;
}

app.all('/mcp', async (req, res) => {
  try {
    const sessionId = req.headers['mcp-session-id'];
    let transport;

    if (sessionId && mcpSessions.has(sessionId)) {
      transport = mcpSessions.get(sessionId);
    } else {
      const mcpServer = buildMcpServer();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => mcpSessions.set(id, transport),
      });
      transport.onclose = () => {
        if (transport.sessionId) mcpSessions.delete(transport.sessionId);
      };
      await mcpServer.connect(transport);
    }

    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('[MCP HTTP]', err);
    if (!res.headersSent) res.status(500).json({ error: 'MCP error' });
  }
});

// ─── REST API routes ──────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/groups', groupsRouter);

// QR code endpoint
app.get('/api/qrcode', async (req, res) => {
  try {
    const host = getLocalIp();
    const url = `http://${host}:${config.port_scan}`;
    const png = await qrcode.toBuffer(url, { width: 300, margin: 2 });
    res.set('Content-Type', 'image/png');
    res.send(png);
  } catch (err) {
    res.status(500).json({ error: 'QR generation failed' });
  }
});

app.get('/api/app-url', (req, res) => {
  res.json({ url: `http://${getLocalIp()}:${config.port_scan}` });
});

// ─── Serve built frontend ─────────────────────────────────────────────────────
const frontendDist = join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/mcp')) {
    res.sendFile(join(frontendDist, 'index.html'));
  }
});

// ─── Socket.io ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);
  socket.on('disconnect', () => console.log('[Socket] Client disconnected:', socket.id));
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) return alias.address;
    }
  }
  return 'localhost';
}

// ─── Startup ──────────────────────────────────────────────────────────────────
async function start() {
  try {
    console.log('[Boot] Initializing SQLcl MCP client…');
    await initMcpClient();

    console.log('[Boot] Initializing database schema…');
    await initSchema();

    // Schedule auto-grouping every 15 minutes
    cron.schedule(config.groupingCron, async () => {
      console.log('[Cron] Running question grouping…');
      try {
        const summary = await runGrouping();
        io.emit('groups_updated', summary);
      } catch (err) {
        console.error('[Cron] Grouping error:', err);
      }
    });

    httpServer.listen(config.port, '0.0.0.0', () => {
      const ip = getLocalIp();
      console.log(`\n[SKO] Server running at http://localhost:${config.port}`);
      console.log(`[SKO] Network access: http://${ip}:${config.port}`);
      console.log(`[SKO] MCP endpoint:   http://${ip}:${config.port}/mcp\n`);
    });
  } catch (err) {
    console.error('[Boot] Fatal error:', err);
    process.exit(1);
  }
}

start();
