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

// ---------- Sector drill mode (Appendix D.10) ----------
// The quiz app embeds the drills parsed from content/sector-tracks/<pack>/drills.md by the Casebook builder's parser.
const vm = require('vm');
const { loadCatalog } = require(path.join(root, 'tools/build-casebook.js'));
const { catalog, errors: drillErrors } = loadCatalog();
ok(drillErrors.length === 0, 'drills', 'casebook catalog errors: ' + drillErrors.join('; '));
let drillItems = 0;
catalog.sectors.forEach(s => {
  const items = catalog.drills[s.pack] || [];
  const w = 'content/sector-tracks/' + s.pack + '/drills.md';
  const count = k => items.filter(it => it.kind === k).length;
  drillItems += items.length;
  ok(count('mc') + count('translate') >= 24, w, 'fewer than 24 multiple-choice and Translate items');
  ok(count('translate') >= 1, w, 'no Translate items');
  ok(count('sort') === 10, w, 'scenario sort has ' + count('sort') + ' rows (expected 10)');
  ok(new Set(items.map(it => it.id)).size === items.length, w, 'duplicate drill ids');
  items.forEach(it => {
    const iw = w + ' ' + it.id;
    ok(it.stem && it.stem.length >= 10, iw, 'stem missing or short');
    ok(it.rationale && it.rationale.length > 0, iw, 'rationale missing');
    String(it.clause).split(/\s*,\s*/).forEach(c => ok(clauseValid(c), iw, 'clause "' + c + '" not in data/clause-map.json'));
    if (it.kind === 'sort') ok(it.options.length === 2 && (it.answer === 0 || it.answer === 1), iw, 'sort item needs Conforming or Nonconforming');
    else {
      ok(it.options.length === 4 && Number.isInteger(it.answer) && it.answer >= 0 && it.answer < 4, iw, 'needs 4 options and an answer');
      ok(new Set(it.options.map(o => o.toLowerCase())).size === 4, iw, 'duplicate options');
    }
    // Need at least four distinct clauses in the pack so every sort item gets three clause distractors.
  });
  ok(new Set(items.map(it => it.clause)).size >= 4, w, 'fewer than 4 distinct clauses for the clause tag choices');
});
if (fs.existsSync(quizHtml)) {
  const html = fs.readFileSync(quizHtml, 'utf8');
  ok(!html.includes('__SECTOR_DRILLS_JSON__'), 'games/quiz/index.html', 'drill placeholder not replaced; run node tools/build-games.js');
  const m = /<script type="application\/json" id="ddata">([\s\S]*?)<\/script>/.exec(html);
  ok(!!m, 'games/quiz/index.html', 'drill data block missing');
  if (m) {
    const data = JSON.parse(m[1]);
    catalog.sectors.forEach(s => {
      ok(!!data[s.pack], 'games/quiz/index.html', 'drills missing for ' + s.pack);
      if (data[s.pack]) ok(JSON.stringify(data[s.pack].items) === JSON.stringify(catalog.drills[s.pack]), 'games/quiz/index.html', 'embedded drills for ' + s.pack + ' differ from drills.md; rebuild');
    });
  }
  ['data-start="drill"', 'Repeat missed items until secure', 'Untimed', 'First-try score'].forEach(t => ok(html.includes(t), 'games/quiz/index.html', 'Sector drill mode text missing: ' + t));
}

// Drill engine: run the template's engine block in a sandbox.
const tpl = fs.readFileSync(path.join(root, 'games/quiz/template.html'), 'utf8');
const em = /<script id="drill-engine">([\s\S]*?)<\/script>/.exec(tpl);
ok(!!em, 'games/quiz/template.html', 'drill-engine script block missing');
if (em) {
  const sandbox = {};
  vm.runInNewContext(em[1], sandbox);
  const QD = sandbox.QuizDrill;
  const pool = catalog.drills['it-software'];
  const E = 'drill engine';
  const perm = (a, n) => a.length === n && a.slice().sort((x, y) => x - y).every((v, i) => v === i);

  // Part order and coverage.
  let sess = QD.session(pool, { seed: 42, kind: 'all', repeat: true });
  ok(sess.queue.length === pool.length && perm(sess.queue, pool.length), E, 'queue is not a permutation of all items');
  const kinds = sess.queue.map(i => sess.items[i].kind);
  ok(kinds.indexOf('translate') > kinds.lastIndexOf('mc') && kinds.indexOf('sort') > kinds.lastIndexOf('translate'), E, 'parts should run multiple choice, Translate, then scenario sort');
  ['mc', 'translate', 'sort'].forEach(k => {
    const s2 = QD.session(pool, { seed: 1, kind: k });
    ok(s2.items.length > 0 && s2.items.every(it => it.kind === k), E, 'kind filter ' + k);
  });
  ok(JSON.stringify(QD.session(pool, { seed: 9, kind: 'all' }).queue) === JSON.stringify(QD.session(pool, { seed: 9, kind: 'all' }).queue), E, 'same seed should give the same order');

  // Answers are shuffled: the correct answer of multiple-choice items lands in several positions.
  const positions = new Set();
  const s3 = QD.session(pool, { seed: 7, kind: 'mc' });
  for (let k = 0; k < 40; k++) { const v = QD.present(s3); ok(perm(v.order, 4), E, 'option order is not a permutation'); positions.add(v.order.indexOf(s3.items[v.idx].answer)); }
  ok(positions.size >= 3, E, 'correct answer position is not shuffled (' + positions.size + ' positions seen)');
  // Scenario sort: fixed Conforming / Nonconforming order, four distinct shuffled clause choices including the answer.
  const s4 = QD.session(pool, { seed: 3, kind: 'sort' });
  const clausePos = new Set();
  for (let k = 0; k < 30; k++) {
    const v = QD.present(s4), it = s4.items[v.idx];
    ok(JSON.stringify(v.order) === '[0,1]', E, 'sort options should keep their order');
    ok(v.clauses.length === 4 && new Set(v.clauses).size === 4 && v.clauses.includes(it.clause), E, 'sort clause choices');
    const mine = it.clause.split(/\s*,\s*/);
    ok(v.clauses.filter(c => c.split(/\s*,\s*/).some(x => mine.includes(x))).length === 1, E, 'a clause distractor shares a clause with the answer');
    clausePos.add(v.clauses.indexOf(it.clause));
    ok(!QD.isCorrect(it, it.answer, v.clauses.find(c => c !== it.clause)), E, 'sort item marked correct with the wrong clause');
    ok(!QD.isCorrect(it, 1 - it.answer, it.clause), E, 'sort item marked correct with the wrong sort');
    ok(QD.isCorrect(it, it.answer, it.clause), E, 'sort item not marked correct with the right sort and clause');
  }
  ok(clausePos.size >= 3, E, 'clause choices are not shuffled');
  // Every pack can offer four clause choices, with exactly one matching, for each scenario sort item.
  catalog.sectors.forEach(sct => {
    const ss = QD.session(catalog.drills[sct.pack], { seed: 5, kind: 'sort', repeat: false });
    let pv;
    while ((pv = QD.present(ss))) {
      const it = ss.items[pv.idx], mine = it.clause.split(/\s*,\s*/);
      ok(pv.clauses.length === 4 && pv.clauses.filter(c => c.split(/\s*,\s*/).some(x => mine.includes(x))).length === 1, E + ' ' + sct.pack, 'clause choices for ' + it.id + ': ' + pv.clauses.join(' | '));
      QD.answer(ss, pv.idx, it.answer, it.clause);
    }
  });

  // Repeat until secure: a missed item returns at the end; the score counts first tries only.
  sess = QD.session(pool, { seed: 11, kind: 'all', repeat: true });
  const wrong = it => it.kind === 'sort' ? 1 - it.answer : (it.answer + 1) % 4;
  let v = QD.present(sess); const missed = v.idx;
  ok(QD.answer(sess, v.idx, wrong(sess.items[v.idx]), sess.items[v.idx].clause) === false, E, 'wrong answer accepted');
  ok(sess.queue[sess.queue.length - 1] === missed && sess.queue.length === pool.length, E, 'missed item should return at the end of the queue');
  let guard = 0, missCount = 1;
  while ((v = QD.present(sess)) && guard++ < 500) {
    const it = sess.items[v.idx];
    // Miss six more items on their first try (7 of 34 missed = 79 percent, below the 80 percent pass mark).
    const miss = missCount < 7 && sess.first[v.idx] === undefined;
    if (miss) missCount++;
    QD.answer(sess, v.idx, miss ? wrong(it) : it.answer, it.clause);
  }
  let sc = QD.score(sess, 80);
  ok(sc.done && sc.secure === pool.length, E, 'repeat until secure should end with every item secure');
  ok(sc.firstTryCorrect === pool.length - 7 && sc.percent === Math.round((pool.length - 7) / pool.length * 100), E, 'first-try score wrong: ' + JSON.stringify(sc));
  ok(sc.pass === (sc.percent >= 80) && !sc.pass, E, '27 of 34 should be below the 80 percent pass mark');
  ok(sess.tries[missed] === 2, E, 'missed item should have two tries');
  // All correct passes; without repeat a missed item does not return.
  sess = QD.session(pool, { seed: 12, kind: 'all', repeat: true });
  while ((v = QD.present(sess))) QD.answer(sess, v.idx, sess.items[v.idx].answer, sess.items[v.idx].clause);
  sc = QD.score(sess, 80);
  ok(sc.percent === 100 && sc.pass, E, 'all correct should pass at 100 percent');
  sess = QD.session(pool, { seed: 13, kind: 'translate', repeat: false });
  v = QD.present(sess); QD.answer(sess, v.idx, wrong(sess.items[v.idx]), null);
  ok(!sess.queue.includes(v.idx), E, 'with repeat off a missed item should not return');
  while ((v = QD.present(sess))) QD.answer(sess, v.idx, sess.items[v.idx].answer, null);
  sc = QD.score(sess, 80);
  ok(sc.done && sc.secure === sess.items.length - 1, E, 'with repeat off the drill should end with one item not secure');
}
console.log('Sector drills: ' + catalog.sectors.length + ' packs, ' + drillItems + ' items.');

console.log((fails ? 'FAILED' : 'PASSED') + ': ' + (checks - fails) + ' of ' + checks + ' checks, ' + files.length + ' banks, ' + total + ' items.');
process.exit(fails ? 1 : 0);
