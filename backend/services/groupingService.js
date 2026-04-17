import { query, execute, escStr, escNum } from '../db/mcpClient.js';
import config from '../config.js';

const S = config.schema;

const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could','should','may','might',
  'i','we','you','he','she','they','it','this','that','these','those',
  'and','or','but','in','on','at','to','for','of','with','about','from',
  'how','what','when','where','who','why','can','oracle','please','want',
]);

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function buildTfIdf(docs) {
  const N = docs.length;
  const df = new Map();
  const tokenized = docs.map(d => tokenize(d));

  for (const tokens of tokenized) {
    for (const t of new Set(tokens)) df.set(t, (df.get(t) || 0) + 1);
  }

  return tokenized.map(tokens => {
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    const vec = {};
    for (const [term, cnt] of tf) {
      vec[term] = (cnt / tokens.length) * Math.log((N + 1) / ((df.get(term) || 1) + 1));
    }
    return vec;
  });
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const av = a[k] || 0, bv = b[k] || 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

function topTerms(vec, n = 4) {
  return Object.entries(vec)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([t]) => t);
}

function titleCase(s) {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

export async function runGrouping() {
  const questions = await query(
    `SELECT QUESTION_ID, QUESTION_TEXT, LIKE_COUNT
     FROM ${S}.SKO_QUESTIONS
     WHERE IS_ACTIVE = 1
     ORDER BY CREATED_AT ASC`
  );

  if (questions.length < 2) return { grouped: 0, newGroups: 0 };

  const texts = questions.map(q => q.QUESTION_TEXT || '');
  const vectors = buildTfIdf(texts);
  const n = questions.length;
  const threshold = config.similarityThreshold;

  // Union-Find clustering
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(x) { return parent[x] === x ? x : (parent[x] = find(parent[x])); }
  function union(x, y) { parent[find(x)] = find(y); }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (cosine(vectors[i], vectors[j]) >= threshold) union(i, j);
    }
  }

  // Build clusters
  const clusters = new Map();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(i);
  }

  // Load all existing groups once for duplicate title detection
  const existingGroups = await query(
    `SELECT GROUP_ID, GROUP_TITLE FROM ${S}.SKO_QUESTION_GROUPS`
  );

  const skipped = [];
  let newGroups = 0, grouped = 0;

  for (const [, members] of clusters) {
    if (members.length < config.minGroupSize) continue;

    // Merge TF-IDF vectors for group title
    const merged = {};
    for (const idx of members) {
      for (const [k, v] of Object.entries(vectors[idx])) {
        merged[k] = (merged[k] || 0) + v;
      }
    }
    const terms = topTerms(merged, 5);
    const groupTitle = titleCase(terms.join(' ') || 'General Topic');
    const groupSummary = `${members.length} related questions about ${terms.slice(0, 3).join(', ')}`;
    const totalLikes = members.reduce((s, i) => s + Number(questions[i].LIKE_COUNT || 0), 0);

    // Collect distinct existing group IDs already assigned to this cluster's questions
    const existingGroupIds = [...new Set(
      members.map(i => questions[i].GROUP_ID).filter(Boolean)
    )];

    // Check for a group with the same title already in the DB (case-insensitive)
    const titleMatch = existingGroups.find(
      g => g.GROUP_TITLE?.toLowerCase() === groupTitle.toLowerCase() &&
           !existingGroupIds.includes(String(g.GROUP_ID)) &&
           !existingGroupIds.includes(Number(g.GROUP_ID))
    );

    let groupId;

    if (existingGroupIds.length >= 1) {
      // Questions already grouped — keep the first group, merge duplicates into it
      groupId = existingGroupIds[0];

      for (const dupId of existingGroupIds.slice(1)) {
        await execute(
          `UPDATE ${S}.SKO_QUESTIONS SET GROUP_ID = ${escNum(groupId)} WHERE GROUP_ID = ${escNum(dupId)}`
        );
        await execute(`DELETE FROM ${S}.SKO_QUESTION_GROUPS WHERE GROUP_ID = ${escNum(dupId)}`);
      }

      await execute(
        `UPDATE ${S}.SKO_QUESTION_GROUPS
         SET TOTAL_LIKES = ${escNum(totalLikes)},
             GROUP_TITLE = ${escStr(groupTitle)},
             GROUP_SUMMARY = ${escStr(groupSummary)},
             UPDATED_AT = CURRENT_TIMESTAMP
         WHERE GROUP_ID = ${escNum(groupId)}`
      );
    } else if (titleMatch) {
      // A group with this same title already exists — reuse it, skip creation
      const msg = `[Grouping] Skipping duplicate group "${groupTitle}" — already exists as ID ${titleMatch.GROUP_ID}`;
      console.warn(msg);
      skipped.push(groupTitle);
      groupId = titleMatch.GROUP_ID;

      await execute(
        `UPDATE ${S}.SKO_QUESTION_GROUPS
         SET TOTAL_LIKES = ${escNum(totalLikes)},
             GROUP_SUMMARY = ${escStr(groupSummary)},
             UPDATED_AT = CURRENT_TIMESTAMP
         WHERE GROUP_ID = ${escNum(groupId)}`
      );
    } else {
      // No existing group — create one
      await execute(
        `INSERT INTO ${S}.SKO_QUESTION_GROUPS (GROUP_ID, GROUP_TITLE, GROUP_SUMMARY, TOTAL_LIKES)
         VALUES (SKO_GROUPS_SEQ.NEXTVAL, ${escStr(groupTitle)}, ${escStr(groupSummary)}, ${escNum(totalLikes)})`
      );
      await execute('COMMIT');
      const row = await query(`SELECT MAX(GROUP_ID) AS GID FROM ${S}.SKO_QUESTION_GROUPS`);
      groupId = row[0]?.GID;
      // Register new group in local list so subsequent clusters see it
      existingGroups.push({ GROUP_ID: groupId, GROUP_TITLE: groupTitle });
      newGroups++;
    }

    for (const idx of members) {
      await execute(
        `UPDATE ${S}.SKO_QUESTIONS
         SET GROUP_ID = ${escNum(groupId)}
         WHERE QUESTION_ID = ${escNum(questions[idx].QUESTION_ID)}`
      );
      grouped++;
    }
    await execute('COMMIT');
  }

  console.log(`[Grouping] ${grouped} questions in ${newGroups} new groups${skipped.length ? `, ${skipped.length} duplicate(s) skipped` : ''}`);
  return { grouped, newGroups, skipped };
}
