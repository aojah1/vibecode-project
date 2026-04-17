import { Router } from 'express';
import { queryOne, execute, escStr } from '../db/mcpClient.js';
import config from '../config.js';

const router = Router();
const S = config.schema;

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const lcEmail = email.toLowerCase().trim();
    if (!lcEmail.endsWith('@oracle.com')) {
      return res.status(403).json({ error: 'Only @oracle.com email addresses are allowed' });
    }

    const user = await queryOne(
      `SELECT USER_ID, EMAIL, PASSWORD, QUESTIONS_ASKED, IS_ADMIN
       FROM ${S}.SKO_USERS
       WHERE LOWER(EMAIL) = ${escStr(lcEmail)}`
    );

    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    if (user.PASSWORD !== password) return res.status(401).json({ error: 'Invalid email or password' });

    req.session.userId = user.USER_ID;
    req.session.email = user.EMAIL;
    req.session.isAdmin = user.IS_ADMIN === 1 || user.IS_ADMIN === '1';

    res.json({
      userId: user.USER_ID,
      email: user.EMAIL,
      isAdmin: req.session.isAdmin,
      questionsAsked: user.QUESTIONS_ASKED,
    });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Not authenticated' });
  res.json({
    userId: req.session.userId,
    email: req.session.email,
    isAdmin: req.session.isAdmin,
  });
});

export default router;
