import { Router } from 'express';
import { query, queryOne, execute, escStr, escNum } from '../db/mcpClient.js';
import { requireAuth } from '../middleware/requireAuth.js';
import config from '../config.js';

const router = Router();
const S = config.schema;

// GET /api/questions — all active questions sorted by likes desc
router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      `SELECT q.QUESTION_ID, q.QUESTION_TEXT, q.LIKE_COUNT, q.GROUP_ID,
              q.CREATED_AT, q.USER_ID, u.EMAIL AS USER_EMAIL,
              CASE WHEN l.USER_ID IS NOT NULL THEN 1 ELSE 0 END AS USER_LIKED
       FROM ${S}.SKO_QUESTIONS q
       JOIN ${S}.SKO_USERS u ON q.USER_ID = u.USER_ID
       LEFT JOIN ${S}.SKO_LIKES l
         ON l.QUESTION_ID = q.QUESTION_ID AND l.USER_ID = ${escNum(req.session.userId)}
       WHERE q.IS_ACTIVE = 1
       ORDER BY q.LIKE_COUNT DESC, q.CREATED_AT DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[questions GET /]', err);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// POST /api/questions — submit a new question
router.post('/', requireAuth, async (req, res) => {
  try {
    const { questionText } = req.body;
    if (!questionText?.trim()) return res.status(400).json({ error: 'Question text required' });
    if (questionText.length > 2000) return res.status(400).json({ error: 'Question too long (max 2000 chars)' });

    // Batch INSERT + UPDATE + COMMIT into one PL/SQL block = 1 round-trip instead of 4
    await execute(
      `BEGIN
         INSERT INTO ${S}.SKO_QUESTIONS (QUESTION_ID, USER_ID, QUESTION_TEXT)
           VALUES (SKO_QUESTIONS_SEQ.NEXTVAL, ${escNum(req.session.userId)}, ${escStr(questionText.trim())});
         UPDATE ${S}.SKO_USERS SET QUESTIONS_ASKED = QUESTIONS_ASKED + 1
           WHERE USER_ID = ${escNum(req.session.userId)};
         COMMIT;
       END;`
    );

    const row = await queryOne(
      `SELECT q.QUESTION_ID, q.QUESTION_TEXT, q.LIKE_COUNT, q.GROUP_ID,
              q.CREATED_AT, q.USER_ID, u.EMAIL AS USER_EMAIL, 0 AS USER_LIKED
       FROM ${S}.SKO_QUESTIONS q
       JOIN ${S}.SKO_USERS u ON q.USER_ID = u.USER_ID
       WHERE q.QUESTION_ID = (SELECT MAX(QUESTION_ID) FROM ${S}.SKO_QUESTIONS WHERE USER_ID = ${escNum(req.session.userId)})`
    );

    // Emit real-time event (attached to res.locals by server.js)
    if (res.locals.io) {
      res.locals.io.emit('new_question', row);
    }

    res.status(201).json(row);
  } catch (err) {
    console.error('[questions POST /]', err);
    res.status(500).json({ error: 'Failed to submit question' });
  }
});

// POST /api/questions/:id/like — toggle like
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const questionId = escNum(req.params.id);
    const userId = escNum(req.session.userId);

    const existing = await queryOne(
      `SELECT LIKE_ID FROM ${S}.SKO_LIKES
       WHERE USER_ID = ${userId} AND QUESTION_ID = ${questionId}`
    );

    if (existing) {
      // Already liked — return current state without any change
      const current = await queryOne(
        `SELECT QUESTION_ID, LIKE_COUNT FROM ${S}.SKO_QUESTIONS WHERE QUESTION_ID = ${questionId}`
      );
      return res.json({ liked: true, likeCount: Number(current?.LIKE_COUNT ?? 0) });
    }

    await execute(
      `BEGIN
         INSERT INTO ${S}.SKO_LIKES (LIKE_ID, USER_ID, QUESTION_ID) VALUES (SKO_LIKES_SEQ.NEXTVAL, ${userId}, ${questionId});
         UPDATE ${S}.SKO_QUESTIONS SET LIKE_COUNT = LIKE_COUNT + 1 WHERE QUESTION_ID = ${questionId};
         COMMIT;
       END;`
    );

    const updated = await queryOne(
      `SELECT QUESTION_ID, LIKE_COUNT FROM ${S}.SKO_QUESTIONS WHERE QUESTION_ID = ${questionId}`
    );

    if (res.locals.io) {
      res.locals.io.emit('like_update', {
        questionId: Number(req.params.id),
        likeCount: Number(updated?.LIKE_COUNT ?? 0),
        liked: true,
        userId: req.session.userId,
      });
    }

    res.json({ liked: true, likeCount: Number(updated?.LIKE_COUNT ?? 0) });
  } catch (err) {
    console.error('[questions like]', err);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// DELETE /api/questions/:id — admin only
router.delete('/:id', requireAuth, async (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: 'Admin only' });
  try {
    await execute(`UPDATE ${S}.SKO_QUESTIONS SET IS_ACTIVE = 0 WHERE QUESTION_ID = ${escNum(req.params.id)}`);
    await execute('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    console.error('[questions DELETE]', err);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

export default router;
