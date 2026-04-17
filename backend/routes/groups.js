import { Router } from 'express';
import { query, execute, escNum, escStr } from '../db/mcpClient.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { runGrouping } from '../services/groupingService.js';
import config from '../config.js';

const router = Router();
const S = config.schema;

// GET /api/groups — all groups with their questions
router.get('/', requireAuth, async (req, res) => {
  try {
    const groups = await query(
      `SELECT g.GROUP_ID, g.GROUP_TITLE, g.GROUP_SUMMARY, g.TOTAL_LIKES, g.CREATED_AT,
              a.ANSWER_TEXT AS ADMIN_ANSWER, a.ANSWERED_BY, a.ANSWERED_AT
       FROM ${S}.SKO_QUESTION_GROUPS g
       LEFT JOIN ${S}.SKO_GROUP_ANSWERS a ON a.GROUP_ID = g.GROUP_ID
       ORDER BY g.TOTAL_LIKES DESC, g.CREATED_AT DESC`
    );

    const questions = await query(
      `SELECT q.QUESTION_ID, q.QUESTION_TEXT, q.LIKE_COUNT, q.GROUP_ID, q.CREATED_AT
       FROM ${S}.SKO_QUESTIONS q
       WHERE q.IS_ACTIVE = 1 AND q.GROUP_ID IS NOT NULL
       ORDER BY q.LIKE_COUNT DESC`
    );

    const grouped = groups.map(g => ({
      ...g,
      questions: questions.filter(q => String(q.GROUP_ID) === String(g.GROUP_ID)),
    }));

    res.json(grouped);
  } catch (err) {
    console.error('[groups GET /]', err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// PUT /api/groups/:id/answer — admin posts or updates an answer for a topic
router.put('/:id/answer', requireAuth, async (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: 'Admin only' });
  const { answer } = req.body;
  if (!answer?.trim()) return res.status(400).json({ error: 'Answer text required' });
  const gid = escNum(req.params.id);
  try {
    const existing = await query(`SELECT GROUP_ID FROM ${S}.SKO_GROUP_ANSWERS WHERE GROUP_ID = ${gid}`);
    if (existing.length > 0) {
      await execute(
        `UPDATE ${S}.SKO_GROUP_ANSWERS
         SET ANSWER_TEXT = ${escStr(answer.trim())},
             ANSWERED_BY = ${escStr(req.session.email)},
             UPDATED_AT  = CURRENT_TIMESTAMP
         WHERE GROUP_ID = ${gid}`
      );
    } else {
      await execute(
        `INSERT INTO ${S}.SKO_GROUP_ANSWERS (GROUP_ID, ANSWER_TEXT, ANSWERED_BY)
         VALUES (${gid}, ${escStr(answer.trim())}, ${escStr(req.session.email)})`
      );
    }
    await execute('COMMIT');
    if (res.locals.io) res.locals.io.emit('groups_updated');
    res.json({ ok: true });
  } catch (err) {
    console.error('[groups answer PUT]', err);
    res.status(500).json({ error: 'Failed to save answer' });
  }
});

// DELETE /api/groups/:id/answer — admin removes an answer
router.delete('/:id/answer', requireAuth, async (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: 'Admin only' });
  try {
    await execute(`DELETE FROM ${S}.SKO_GROUP_ANSWERS WHERE GROUP_ID = ${escNum(req.params.id)}`);
    await execute('COMMIT');
    if (res.locals.io) res.locals.io.emit('groups_updated');
    res.json({ ok: true });
  } catch (err) {
    console.error('[groups answer DELETE]', err);
    res.status(500).json({ error: 'Failed to remove answer' });
  }
});

// POST /api/groups/run — manually trigger grouping (admin only)
router.post('/run', requireAuth, async (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: 'Admin only' });
  try {
    const summary = await runGrouping();
    if (res.locals.io) res.locals.io.emit('groups_updated', summary);
    res.json({ ok: true, ...summary });
  } catch (err) {
    console.error('[groups/run]', err);
    res.status(500).json({ error: 'Grouping failed' });
  }
});

export default router;
