import { Router } from 'express';
import { query, execute, escNum } from '../db/mcpClient.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { runGrouping } from '../services/groupingService.js';
import config from '../config.js';

const router = Router();
const S = config.schema;

// GET /api/groups — all groups with their questions
router.get('/', requireAuth, async (req, res) => {
  try {
    const groups = await query(
      `SELECT g.GROUP_ID, g.GROUP_TITLE, g.GROUP_SUMMARY, g.TOTAL_LIKES, g.CREATED_AT
       FROM ${S}.SKO_QUESTION_GROUPS g
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
