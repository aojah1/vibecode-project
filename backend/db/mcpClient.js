import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import config from '../config.js';

let mcpClient = null;
let allTools = [];

export async function initMcpClient() {
  console.log('[MCP] Spawning SQLcl MCP server…');

  const transport = new StdioClientTransport({
    command: config.sqlclPath,
    args: ['-mcp', '-S'],
  });

  mcpClient = new Client(
    { name: 'sko-app', version: '1.0.0' },
    { capabilities: {} }
  );

  await mcpClient.connect(transport);
  console.log('[MCP] Connected to SQLcl');

  const { tools } = await mcpClient.listTools();
  allTools = tools;
  console.log('[MCP] Available tools:', tools.map(t => t.name).join(', '));

  // Explicitly connect to the named connection
  console.log(`[MCP] Connecting to ${config.connectionName}…`);
  const connectResult = await mcpClient.callTool({
    name: 'connect',
    arguments: { connection_name: config.connectionName },
  });
  console.log('[MCP] Connect result:', extractText(connectResult));

  // Warm up — verify connection with a simple query
  const ping = await runSql('SELECT 1 FROM DUAL');
  console.log('[MCP] DB ping:', ping.slice(0, 80));

  return mcpClient;
}

function extractText(result) {
  if (!result || !result.content) return '';
  const item = result.content.find(c => c.type === 'text');
  return item ? item.text.trim() : '';
}


// SELECT queries — run-sql (read path, supports JSON_ARRAYAGG wrapping)
async function runSql(sql) {
  if (!mcpClient) throw new Error('MCP client not initialized');
  const result = await mcpClient.callTool({ name: 'run-sql', arguments: { sql } });
  return extractText(result);
}

// DML / DDL / COMMIT / ROLLBACK — run-sqlcl (write path)
async function runSqlcl(command) {
  if (!mcpClient) throw new Error('MCP client not initialized');
  const result = await mcpClient.callTool({ name: 'run-sqlcl', arguments: { sqlcl: command } });
  return extractText(result);
}

// SQLcl outputs: "COLUMN_NAME"\n"[{""KEY"":""VAL""}]"\n
// Internal double-quotes are escaped as "" — unescape them after stripping outer quotes.
function parseJsonResult(text) {
  if (!text) return [];
  for (const line of text.split('\n').map(l => l.trim()).filter(Boolean)) {
    let json = line;
    // Strip outer SQL double-quotes wrapping the value
    if (json.startsWith('"') && json.endsWith('"')) {
      json = json.slice(1, -1).replace(/""/g, '"');
    }
    if (!json.startsWith('[') && !json.startsWith('{')) continue;
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      continue;
    }
  }
  return [];
}

// Execute a SELECT and return array of row objects.
// Wraps the query with JSON_ARRAYAGG(JSON_OBJECT(*)) for structured JSON output (Oracle 23ai).
export async function query(sql) {
  const wrapped =
    `SELECT JSON_ARRAYAGG(JSON_OBJECT(*) RETURNING CLOB) AS RESULT FROM (${sql})`;
  const text = await runSql(wrapped);
  return parseJsonResult(text);
}

// Execute DML / DDL / COMMIT — uses run-sqlcl (write path)
export async function execute(sql) {
  return await runSqlcl(sql);
}

// SELECT first row or null
export async function queryOne(sql) {
  const rows = await query(sql);
  return rows.length > 0 ? rows[0] : null;
}

export function getMcpClient() {
  return mcpClient;
}

export function getAllTools() {
  return allTools;
}

export function escStr(val) {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

export function escNum(val) {
  const n = Number(val);
  if (isNaN(n)) throw new Error(`Invalid number: ${val}`);
  return String(n);
}
