'use strict';
// Validates the sector quiz banks in data/quizzes/<pack>.json (Appendix C).
// Run: node tests/sector-quiz-tests.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const json = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));

const packs = json('data/packs.json').map(p => p.id).filter(id => id !== 'generic');
const clauseIds = new Set(json('data/clause-map.json').clauses.map(c => c.id));
const banned = json('tools/banned-phrases.json');
const PREFIX = { 'discrete-manufacturing': 'DM', 'process-food': 'PF', electronics: 'EL', construction: 'CN', 'it-software': 'IT', healthcare: 'HC', logistics: 'LG', 'professional-services': 'PS' };
const ROLES = new Set(['F', 'T', 'S']);
const REQUIRED = ['id', 'sector', 'stem', 'options', 'answerIndex', 'rationale', 'clause2015', 'roles', 'difficulty', 'type', 'edition', 'verifyStatus2015'];
// Sector quizzes must not give clinical, legal, safety, or food safety instructions (Appendix C, C.5 task 6).
const BANNED_INSTRUCTION = [
  /\bdosage/i, /\bdoses?\b/i, /\bdosing\b/i, /\bmilligrams?\b/i, /\b\d+\s?(mg|ml|mcg)\b/i, /\bprescri(be|ption)/i, /\badminister(ing)?\b/i,
  /\bdiagnos(e|is|ing)\b/i, /\btriage\b/i, /\bmedication\b/i, /\bclinical (procedure|protocol) (step|says)/i,
  /\blegal advice\b/i, /\blawsuit\b/i, /\bsue\b/i, /\bliab(le|ility)\b/i, /\bstatut(e|ory) requires\b/i,
  /\block-?out\b/i, /\btag-?out\b/i, /\bharness\b/i, /\bPPE\b/, /\bpersonal protective\b/i, /\bfall protection\b/i,
  /\bHACCP\b/i, /\bcritical control point\b/i, /\ballergen/i, /\bpasteuri[sz]/i, /\bcook(ing)? (to|temperature)\b/i, /\b\d+\s?°\s?[CF]\b/, /\bdegrees (celsius|fahrenheit)\b/i
];
// Phrases that would suggest copied requirement wording (paraphrase only; C.5 task 7).
const ISO_WORDING = [/\bshall\b/i, /\bthe organization shall\b/i, /\bISO 9001:2015 states\b/i];

let fails = 0, checks = 0;
const fail = (where, msg) => { fails++; console.log('FAIL ' + where + ': ' + msg); };
const ok = (cond, where, msg) => { checks++; if (!cond) fail(where, msg); };
const clauseValid = c => clauseIds.has(c) || [...clauseIds].some(v => v.startsWith(c + '.'));

const dir = path.join(root, 'data/quizzes');
ok(fs.existsSync(dir), 'data/quizzes', 'directory missing');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')) : [];
packs.forEach(p => ok(files.includes(p + '.json'), 'data/quizzes', 'missing bank for pack ' + p));

const allIds = new Set();
let total = 0;
files.forEach(f => {
  const id = path.basename(f, '.json');
  let bank;
  try { bank = json('data/quizzes/' + f); } catch (e) { fail(f, 'invalid JSON: ' + e.message); return; }
  ok(packs.includes(id), f, 'file name is not a pack id in data/packs.json');
  ok(bank.pack === id, f, 'pack field "' + bank.pack + '" does not match file name');
  ok(Array.isArray(bank.items), f, 'items array missing');
  if (!Array.isArray(bank.items)) return;
  const items = bank.items;
  total += items.length;
  ok(items.length >= 24, f, 'has ' + items.length + ' items (minimum 24)');
  const pos = [0, 0, 0, 0], parents = new Set(), roleCount = { F: 0, T: 0, S: 0 };
  items.forEach((q, i) => {
    const w = f + ' #' + (i + 1) + ' (' + (q.id || 'no id') + ')';
    REQUIRED.forEach(k => ok(q[k] !== undefined && q[k] !== '', w, 'missing field ' + k));
    ok(typeof q.id === 'string' && /^[A-Z]{2}\d{2,3}$/.test(q.id), w, 'id format');
    ok(!allIds.has(q.id), w, 'duplicate id across banks');
    allIds.add(q.id);
    if (PREFIX[id]) ok(String(q.id).startsWith(PREFIX[id]), w, 'id prefix should be ' + PREFIX[id]);
    ok(q.sector === id, w, 'sector "' + q.sector + '" does not match pack');
    ok(Array.isArray(q.options) && q.options.length === 4, w, 'needs exactly 4 options');
    if (Array.isArray(q.options)) {
      ok(new Set(q.options.map(o => String(o).trim().toLowerCase())).size === q.options.length, w, 'duplicate options');
      q.options.forEach((o, oi) => ok(typeof o === 'string' && o.trim().length > 0, w, 'empty option ' + oi));
    }
    ok(Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < (q.options || []).length, w, 'answerIndex out of range');
    if (Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < 4) pos[q.answerIndex]++;
    ok(typeof q.rationale === 'string' && q.rationale.length >= 20, w, 'rationale missing or too short');
    ok(typeof q.stem === 'string' && q.stem.length >= 15, w, 'stem missing or too short');
    ok(clauseValid(q.clause2015), w, 'clause2015 "' + q.clause2015 + '" not in data/clause-map.json');
    (q.clauseRefs || []).forEach(c => ok(clauseValid(c), w, 'clauseRefs entry "' + c + '" not in data/clause-map.json'));
    if (q.clauseRefs) ok(q.clauseRefs[0] === q.clause2015, w, 'clauseRefs must start with clause2015');
    ok(Array.isArray(q.roles) && q.roles.length > 0 && q.roles.every(r => ROLES.has(r)), w, 'roles must be a non-empty subset of F, T, S');
    (q.roles || []).forEach(r => { if (roleCount[r] !== undefined) roleCount[r]++; });
    ok([1, 2, 3].includes(q.difficulty), w, 'difficulty must be 1, 2, or 3');
    ok(['scenario', 'knowledge'].includes(q.type), w, 'type must be scenario or knowledge');
    ok(q.edition === '2015', w, 'edition must be "2015" (2026 items are kept separate)');
    ok(q.verifyStatus2015 === 'unverified', w, 'verifyStatus2015 must be "unverified" until the owner confirms');
    parents.add(String(q.clause2015).split('.')[0]);
    const text = [q.stem].concat(q.options || [], [q.rationale]).join(' \n ');
    BANNED_INSTRUCTION.forEach(re => ok(!re.test(text), w, 'clinical, legal, safety, or food safety instruction pattern ' + re));
    ISO_WORDING.forEach(re => ok(!re.test(text), w, 'possible requirement wording ' + re));
    const lower = ' ' + text.toLowerCase().replace(/\s+/g, ' ') + ' ';
    banned.forEach(b => {
      const re = new RegExp('(^|[^a-z])' + b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').toLowerCase() + '($|[^a-z])');
      ok(!re.test(lower), w, 'banned informal phrase "' + b.trim() + '"');
    });
  });
  // No more than 40 percent of stored correct answers in one position.
  pos.forEach((n, p) => ok(n / items.length <= 0.4, f, 'answer position ' + 'ABCD'[p] + ' holds ' + n + ' of ' + items.length + ' correct answers (limit 40 percent)'));
  // Balance across clauses 4 to 10 and roles.
  ['4', '5', '6', '7', '8', '9', '10'].forEach(c => ok(parents.has(c), f, 'no item tagged to clause ' + c));
  ['F', 'T', 'S'].forEach(r => ok(roleCount[r] >= 4, f, 'only ' + roleCount[r] + ' items tagged ' + r));
  // Role filter must yield at least 8 items for every role (Appendix C.1 role-filtered quiz).
  ['F', 'T', 'S'].forEach(r => ok(items.filter(q => (q.roles || []).includes(r) || (q.roles || []).includes('F')).length >= 8, f, 'role filter ' + r + ' gives fewer than 8 items'));
  // Mixed-sector quiz needs 3 per pack with at most 2 per clause.
  ok(new Set(items.map(q => q.clause2015)).size >= 3, f, 'fewer than 3 distinct clauses');
});

// The built quiz must embed every bank.
const quizHtml = path.join(root, 'games/quiz/index.html');
if (fs.existsSync(quizHtml)) {
  const html = fs.readFileSync(quizHtml, 'utf8');
  ok(!html.includes('__SECTOR_QUIZZES_JSON__'), 'games/quiz/index.html', 'sector placeholder not replaced; run node tools/build-games.js');
  const m = /<script type="application\/json" id="sdata">([\s\S]*?)<\/script>/.exec(html);
  ok(!!m, 'games/quiz/index.html', 'sector data block missing');
  if (m) {
    const data = JSON.parse(m[1]);
    packs.forEach(p => ok(data[p] && Array.isArray(data[p].items) && data[p].items.length >= 24, 'games/quiz/index.html', 'embedded bank missing or short for ' + p));
  }
}
// Printables exist for every pack.
packs.forEach(p => ok(fs.existsSync(path.join(root, 'games/printables/sector-quiz-' + p + '.html')), 'games/printables', 'missing sector-quiz-' + p + '.html; run node tools/build-sector-printables.js'));
ok(fs.existsSync(path.join(root, 'games/printables/sector-showdown-cards.html')), 'games/printables', 'missing sector-showdown-cards.html');

console.log((fails ? 'FAILED' : 'PASSED') + ': ' + (checks - fails) + ' of ' + checks + ' checks, ' + files.length + ' banks, ' + total + ' items.');
process.exit(fails ? 1 : 0);
