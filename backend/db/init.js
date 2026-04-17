import { query, execute } from './mcpClient.js';
import config from '../config.js';

const S = config.schema;

// Sequences live in GKEYS (the connecting user's own schema) so GKEYS has implicit READ/SELECT.
// Tables are in ANUP; INSERTs reference the sequences without schema prefix (resolves to GKEYS).
const SEQUENCES = [
  `CREATE SEQUENCE SKO_USERS_SEQ     START WITH 1 INCREMENT BY 1 NOCACHE`,
  `CREATE SEQUENCE SKO_GROUPS_SEQ    START WITH 1 INCREMENT BY 1 NOCACHE`,
  `CREATE SEQUENCE SKO_QUESTIONS_SEQ START WITH 1 INCREMENT BY 1 NOCACHE`,
  `CREATE SEQUENCE SKO_LIKES_SEQ     START WITH 1 INCREMENT BY 1 NOCACHE`,
];

// No DEFAULT seq.NEXTVAL in DDL — cross-schema sequence DEFAULT requires READ privilege
// that GKEYS doesn't have on ANUP sequences. Sequences are referenced explicitly in INSERTs.
const DDL = [
  `CREATE TABLE ${S}.SKO_USERS (
    USER_ID    NUMBER NOT NULL PRIMARY KEY,
    EMAIL      VARCHAR2(255) UNIQUE NOT NULL,
    PASSWORD   VARCHAR2(255) NOT NULL,
    QUESTIONS_ASKED NUMBER DEFAULT 0,
    IS_ADMIN   NUMBER(1,0) DEFAULT 0,
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE ${S}.SKO_QUESTION_GROUPS (
    GROUP_ID      NUMBER NOT NULL PRIMARY KEY,
    GROUP_TITLE   VARCHAR2(500) NOT NULL,
    GROUP_SUMMARY VARCHAR2(2000),
    TOTAL_LIKES   NUMBER DEFAULT 0,
    CREATED_AT    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE ${S}.SKO_QUESTIONS (
    QUESTION_ID   NUMBER NOT NULL PRIMARY KEY,
    USER_ID       NUMBER REFERENCES ${S}.SKO_USERS(USER_ID),
    QUESTION_TEXT VARCHAR2(2000) NOT NULL,
    LIKE_COUNT    NUMBER DEFAULT 0,
    GROUP_ID      NUMBER REFERENCES ${S}.SKO_QUESTION_GROUPS(GROUP_ID),
    IS_ACTIVE     NUMBER(1,0) DEFAULT 1,
    CREATED_AT    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE ${S}.SKO_LIKES (
    LIKE_ID     NUMBER NOT NULL PRIMARY KEY,
    USER_ID     NUMBER REFERENCES ${S}.SKO_USERS(USER_ID),
    QUESTION_ID NUMBER REFERENCES ${S}.SKO_QUESTIONS(QUESTION_ID),
    CREATED_AT  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT UQ_USER_QUESTION_LIKE UNIQUE (USER_ID, QUESTION_ID)
  )`,
  `CREATE TABLE ${S}.SKO_GROUP_ANSWERS (
    GROUP_ID    NUMBER NOT NULL PRIMARY KEY REFERENCES ${S}.SKO_QUESTION_GROUPS(GROUP_ID),
    ANSWER_TEXT VARCHAR2(4000) NOT NULL,
    ANSWERED_BY VARCHAR2(255),
    ANSWERED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
];

async function grantQuota() {
  const result = await execute(`ALTER USER ${S} QUOTA UNLIMITED ON DATA`);
  if (!result.includes('Error') && !result.includes('ORA-')) {
    console.log(`[DB] Quota granted to ${S}`);
  }
}

async function objectExists(owner, type, name) {
  const rows = await query(
    `SELECT COUNT(*) AS CNT FROM ALL_OBJECTS ` +
    `WHERE OWNER = '${owner}' AND OBJECT_TYPE = '${type}' AND OBJECT_NAME = '${name}'`
  );
  return Number(rows[0]?.CNT ?? 0) > 0;
}

async function seedUsers() {
  const rows = await query(`SELECT COUNT(*) AS CNT FROM ${S}.SKO_USERS`);
  if (Number(rows[0]?.CNT ?? 0) > 0) return;

  const seedList = [
    { email: 'admin@oracle.com',        isAdmin: 1 },
    { email: 'test.user@oracle.com',    isAdmin: 0 },
    { email: 'jane.doe@oracle.com',     isAdmin: 0 },
    { email: 'sarah.chen@oracle.com',   isAdmin: 0 },
    { email: 'michael.torres@oracle.com', isAdmin: 0 },
    { email: 'priya.sharma@oracle.com', isAdmin: 0 },
    { email: 'david.kim@oracle.com',    isAdmin: 0 },
    { email: 'emily.johnson@oracle.com',isAdmin: 0 },
    { email: 'carlos.mendez@oracle.com',isAdmin: 0 },
    { email: 'lisa.nguyen@oracle.com',  isAdmin: 0 },
    { email: 'james.patel@oracle.com',  isAdmin: 0 },
    { email: 'anna.kowalski@oracle.com',isAdmin: 0 },
    { email: 'ryan.obrien@oracle.com',  isAdmin: 0 },
  ];
  for (const u of seedList) {
    await execute(`INSERT INTO ${S}.SKO_USERS (USER_ID,EMAIL,PASSWORD,IS_ADMIN) VALUES (SKO_USERS_SEQ.NEXTVAL,'${u.email}','AskJay',${u.isAdmin})`);
  }
  await execute('COMMIT');
  console.log('[DB] Seed users inserted');
}

export async function initSchema() {
  await grantQuota();

  const seqNames = ['SKO_USERS_SEQ', 'SKO_GROUPS_SEQ', 'SKO_QUESTIONS_SEQ', 'SKO_LIKES_SEQ'];
  const tableNames = ['SKO_USERS', 'SKO_QUESTION_GROUPS', 'SKO_QUESTIONS', 'SKO_LIKES', 'SKO_GROUP_ANSWERS'];

  // Create sequences in GKEYS schema (current user — has implicit READ/SELECT on own objects)
  for (let i = 0; i < seqNames.length; i++) {
    const exists = await objectExists('GKEYS', 'SEQUENCE', seqNames[i]);
    if (!exists) {
      console.log(`[DB] Creating sequence ${seqNames[i]}…`);
      const result = await execute(SEQUENCES[i]);
      if (result.includes('ORA-') && !result.includes('ORA-00955')) {
        throw new Error(`Failed to create sequence ${seqNames[i]}: ${result.slice(0, 200)}`);
      }
    }
  }

  // Create tables
  for (let i = 0; i < tableNames.length; i++) {
    const exists = await objectExists(S, 'TABLE', tableNames[i]);
    if (!exists) {
      console.log(`[DB] Creating table ${tableNames[i]}…`);
      const result = await execute(DDL[i]);
      if (result.includes('ORA-') && !result.includes('ORA-00955')) {
        throw new Error(`Failed to create ${tableNames[i]}: ${result.slice(0, 200)}`);
      }
    } else {
      console.log(`[DB] Table ${tableNames[i]} already exists`);
    }
  }

  await seedUsers();
  console.log('[DB] Schema ready');
}
