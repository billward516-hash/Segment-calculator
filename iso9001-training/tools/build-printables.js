'use strict';
// Generates print-ready HTML pages from the same data that drives the digital games.
// Run: node tools/build-printables.js [--seed 12345] [--rounds 12]
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const json = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const QF = require(path.join(root, 'games/quality-flow/engine.js'));
const company = json('config/company.json');
const controls = json('data/controls.json');
const events = json('data/events.json');
const packs = json('data/packs.json');
const questions = json('data/questions.json');

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? parseInt(argv[i + 1], 10) : d; };
const SEED = arg('seed', QF.DEFAULT_CONFIG.seed);
const ROUNDS = arg('rounds', QF.DEFAULT_CONFIG.rounds);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const outDir = path.join(root, 'games/printables');
fs.mkdirSync(outDir, { recursive: true });

const CSS = `
@page{size:letter;margin:12mm}
*{box-sizing:border-box}
body{font:11pt/1.35 system-ui,-apple-system,"Segoe UI",Arial,sans-serif;color:#000;background:#fff;margin:0}
.page{page-break-after:always;padding:2mm}
.page:last-child{page-break-after:auto}
h1{font-size:18pt;margin:0 0 4mm}
h2{font-size:14pt;margin:4mm 0 2mm;border-bottom:2px solid #000}
h3{font-size:12pt;margin:3mm 0 1mm}
table{border-collapse:collapse;width:100%;margin:2mm 0}
th,td{border:1.5px solid #000;padding:2mm;text-align:left;vertical-align:top}
th{background:#e6e6e6}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:0}
.card{border:1.5px dashed #000;padding:3mm;height:56mm;overflow:hidden;page-break-inside:avoid}
.card .id{font-weight:800;font-size:13pt}
.card .t{font-size:12pt;margin:2mm 0}
.card small{display:block;font-size:9pt}
.flag{border:2px solid #000;height:34mm;padding:3mm;font-weight:700;border-radius:3mm}
.flags{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.board{display:grid;grid-template-columns:repeat(6,1fr);gap:2mm}
.stage{border:2px solid #000;padding:2mm;min-height:60mm;font-size:9.5pt}
.stage.c{border-style:dashed;border-width:3px}
.num{text-align:right}
.note{font-size:9pt;margin-top:6mm;border-top:1px solid #000;padding-top:2mm}
.big{font-size:44pt;font-weight:800;text-align:center;line-height:1}
.blank{height:9mm}
.tight th,.tight td{padding:.8mm 2mm;font-size:9.5pt}
`;
const NOTICE = '<div class="note">This material is an original training aid. It is not a substitute for the standard. Obtain ISO 9001 from ISO or a national standards body. Fictional organization. Examples are illustrative. Sector-specific legal, clinical, safety, and food safety requirements are outside this program. Clause numbers use the 2015 edition.</div>';
const wrap = (title, body) => '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>' + CSS + '</style></head><body>' + body + '</body></html>';

/* ---------- Dice lookup: 36-cell grid ---------- */
function n36(p) { return Math.max(1, Math.min(35, Math.round(p * 36))); }
function lookupTable(cfg) {
  const st = cfg.stages, e = cfg.economics;
  const rows = [];
  const add = (label, p) => rows.push([label, Math.round(p * 1000) / 10 + '%', n36(p), (Math.round((n36(p) / 36) * 1000) / 10) + '%']);
  st.forEach((s, i) => {
    if (s.defectProb == null) return;
    add(s.name + ': defect', s.defectProb);
    if (s.manual) add(s.name + ': defect with C02', s.defectProb * 0.7);
    if (i === 0) add(s.name + ': defect with C04', s.defectProb * 0.5);
    if (s.constraint) { add(s.name + ': defect after event E03 (no C02)', s.defectProb + 0.15); add(s.name + ': defect after event E06 (no C06)', s.defectProb + 0.20); }
  });
  const base = st[4].detectBase;
  add('Final check detects (no C01, no C08)', base);
  add('Final check detects (C01)', base + 0.10);
  add('Final check detects (C08)', 0.85);
  add('Final check detects (C01 and C08, cap)', 0.95);
  add('In-process check at constraint detects (C07)', cfg.inProcessDetect);
  add('Redo succeeds', e.redoSuccess);
  add('Redone item escapes unchecked', e.redoEscape);
  add('Held item released in error (no C09)', e.erroneousRelease);
  add('Yield to release pressure (event E08 without C12)', e.pressureYield);
  return rows;
}

/* ---------- Quality Flow printables per pack ---------- */
function qfPage(pack) {
  const cfg = QF.createGame({ seed: SEED, rounds: ROUNDS, industryPack: pack.id }, controls, events, pack).cfg;
  const g = QF.createGame({ seed: SEED, rounds: ROUNDS, industryPack: pack.id }, controls, events, pack);
  const stageNames = cfg.stages.map(s => s.name);
  const ev = id => events.find(e => e.id === id);
  const text = e => (pack.skins && pack.skins[e.id]) || e.text;
  const itemTerm = pack.term[1];
  let h = '';

  // Page 1: how to run
  h += '<div class="page"><h1>Quality Flow: printed version</h1><p><b>' + esc(pack.company) + '</b> (' + esc(pack.name) + '). Work item term: <b>' + esc(pack.term[0]) + '</b>. Seed ' + SEED + ', ' + ROUNDS + ' rounds.</p>' +
    '<h2>Round sequence</h2><ol><li><b>Invest (2 minutes).</b> Teams spend Quality Points (QP) on control cards. Start with ' + cfg.startingQP + ' QP and gain ' + cfg.qpPerRound + ' QP each round.</li>' +
    '<li><b>Event.</b> The facilitator turns over the next event card from the deck order on the facilitator key.</li>' +
    '<li><b>Process.</b> Release ' + cfg.workItemsReleasedPerRound + ' ' + esc(itemTerm) + ' to the first stage. At each stage move up to its capacity. Roll two dice for each ' + esc(pack.term[0]) + ' using the lookup table. Apply the event.</li>' +
    '<li><b>Disposition.</b> Hold flags go on detected defects. Choose redo or scrap and record it.</li>' +
    '<li><b>Score.</b> Update the tracking sheet. Every third round, teams with control C10 pick a past event and halve its impact.</li></ol>' +
    '<h2>Economics</h2><table><tbody><tr><td>Good ' + esc(pack.term[0]) + ' delivered</td><td class="num">+' + cfg.economics.goodItem + '</td></tr><tr><td>Scrapped</td><td class="num">' + cfg.economics.scrapItem + ' (' + cfg.economics.constraintScrapExtra + ' more if the defect arose at or after the constraint)</td></tr><tr><td>Redo (cost, ' + Math.round(cfg.economics.redoSuccess * 100) + '% success)</td><td class="num">' + cfg.economics.redoItem + '</td></tr><tr><td>Escape (complaint)</td><td class="num">' + cfg.economics.escape + ' and reputation ' + cfg.economics.escapeReputation + '</td></tr><tr><td>Reputation at 0</td><td>Supply on hold: remaining output earns half value</td></tr></tbody></table>' +
    '<p><b>Final score</b> = revenue + audit points (maximum 24) + reputation × 3 − penalties.</p>' + NOTICE + '</div>';

  // Page 2: dice lookup
  h += '<div class="page"><h1>Dice lookup (two dice)</h1><p>Use one red die and one white die. Read the number as <b>6 × (red − 1) + white</b>, from 1 to 36. The result is a hit when the number is <b>less than or equal to</b> the threshold shown. Percentages are approximate because 36 does not divide evenly.</p>' +
    '<table class="tight"><thead><tr><th>Situation</th><th class="num">Target</th><th class="num">Hit on number ≤</th><th class="num">Actual odds</th></tr></thead><tbody>' +
    lookupTable(cfg).map(r => '<tr><td>' + esc(r[0]) + '</td><td class="num">' + r[1] + '</td><td class="num"><b>' + r[2] + '</b></td><td class="num">' + r[3] + '</td></tr>').join('') + '</tbody></table>' +
    '<p>Quick reference: red 1 gives 1 to 6, red 2 gives 7 to 12, red 3 gives 13 to 18, red 4 gives 19 to 24, red 5 gives 25 to 30, red 6 gives 31 to 36.</p>' + NOTICE + '</div>';

  // Control cards: 8 per page
  for (let i = 0; i < controls.length; i += 8) {
    h += '<div class="page"><h1>Control cards</h1><div class="cards">' + controls.slice(i, i + 8).map(c =>
      '<div class="card"><div class="id">' + c.id + ' • ' + c.cost + ' QP</div><div class="t"><b>' + esc(c.name) + '</b></div><small>Clause ' + esc(c.clause) + '</small><small>' + esc(c.effect) + '</small></div>').join('') + '</div></div>';
  }
  // Event cards: 8 per page
  for (let i = 0; i < events.length; i += 8) {
    h += '<div class="page"><h1>Event cards</h1><div class="cards">' + events.slice(i, i + 8).map(e =>
      '<div class="card"><div class="id">Event ' + e.id + '</div><div class="t">' + esc(text(e)) + '</div></div>').join('') + '</div></div>';
  }
  // Facilitator key
  h += '<div class="page"><h1>Facilitator key</h1><h2>Event deck order for seed ' + SEED + '</h2><table class="tight"><thead><tr><th>Round</th><th>Event</th><th>Mitigated by</th><th>Impact if unmitigated</th></tr></thead><tbody>' +
    g.deck.map((id, i) => { const e = ev(id); return '<tr><td>' + (i + 1) + '</td><td>' + id + ': ' + esc(text(e)) + '</td><td>' + esc(e.mitigatedBy.map(m => m + ' (Cl. ' + controls.find(c => c.id === m).clause + ')').join(', ')) + '</td><td>' + esc(e.impact) + '</td></tr>'; }).join('') + '</tbody></table>' +
    '<p>This order matches the digital game when the same seed is used. Different team choices change outcomes but never the event order.</p>' + NOTICE + '</div>';
  // Stage board
  h += '<div class="page"><h1>Stage board (one per team)</h1><div class="board">' + cfg.stages.map((s, i) =>
    '<div class="stage' + (s.constraint ? ' c' : '') + '"><b>' + (i + 1) + '. ' + esc(stageNames[i]) + '</b><br>' + (s.constraint ? '<b>CONSTRAINT</b><br>' : '') + (s.manual ? 'Manual stage<br>' : '') + 'Capacity ' + s.capacity + '<br>' +
      (s.id === 'check' ? 'Detection: see lookup' : 'Defect roll: hit on ≤ ' + n36(s.defectProb)) + '<br><br>Place ' + esc(itemTerm) + ' here.</div>').join('') + '</div>' +
    '<h2>Disposition sheet</h2><table><thead><tr><th>Round</th><th>' + esc(pack.term[0]) + ' ID</th><th>Where the defect arose</th><th>Redo / Scrap</th><th>Redo roll result</th><th>Authorized by</th></tr></thead><tbody>' +
    Array.from({ length: 8 }, () => '<tr class="blank"><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('') + '</tbody></table>' + NOTICE + '</div>';
  // Tracking sheet
  h += '<div class="page"><h1>Team tracking sheet</h1><p>Team: ______________________ &nbsp; Starting QP ' + cfg.startingQP + ' &nbsp; Starting reputation ' + cfg.reputationStart + '</p><table><thead><tr><th>Round</th><th>QP</th><th>Controls bought</th><th>Event</th><th>Delivered</th><th>Held</th><th>Escapes</th><th>Revenue</th><th>Reputation</th></tr></thead><tbody>' +
    Array.from({ length: ROUNDS }, (_, i) => '<tr class="blank"><td>' + (i + 1) + '</td><td></td><td></td><td>' + g.deck[i] + '</td><td></td><td></td><td></td><td></td><td></td></tr>').join('') + '</tbody></table>' + NOTICE + '</div>';
  // Final audit sheet
  h += '<div class="page"><h1>Final audit sheet</h1><p>Award 1 point if the control is owned and 1 more point if the team log shows it was used. Maximum 24.</p><table><thead><tr><th>#</th><th>Check</th><th>Controls</th><th>Owned (0/1)</th><th>Used (0/1)</th><th>Points</th></tr></thead><tbody>' +
    QF.AUDIT_CHECKS.map(c => '<tr><td>' + c.n + '</td><td>' + esc(c.name) + '</td><td>' + c.controls.join(', ') + '</td><td></td><td></td><td></td></tr>').join('') + '</tbody></table>' +
    '<p>Final score = revenue ______ + audit ______ + (reputation ______ × 3) − penalties ______ = ______</p><h2>Debrief</h2><ol><li>Which control had the largest effect on your score? Which clause does it relate to?</li><li>Which event caught you without a mitigating control? What did it cost?</li><li>Was checking at the constraint a good investment? Why?</li><li>What did you do when under pressure to deliver?</li><li>Which records would you show an auditor? Which were missing?</li></ol>' + NOTICE + '</div>';
  // Hold flags
  h += '<div class="page"><h1>Hold flags</h1><div class="flags">' + Array.from({ length: 8 }, () => '<div class="flag">HOLD<br><span style="font-weight:400">' + esc(pack.term[0]) + ' ID: ____________<br>Reason: ______________________<br>Date / name: __________________</span></div>').join('') + '</div></div>';
  return wrap('Quality Flow printables: ' + pack.name, h);
}

const written = [];
packs.forEach(p => {
  const f = 'quality-flow-' + p.id + '.html';
  fs.writeFileSync(path.join(outDir, f), qfPage(p));
  written.push(f);
});

/* ---------- Quiz sheets and Clause Sprint cards ---------- */
function shuffled(arr, seed) { const r = QF.mulberry32(seed); const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function quizSheets() {
  let h = '', key = '';
  const letters = ['A', 'B', 'C', 'D'];
  ['operator', 'technician', 'supervisor'].forEach((role, ri) => {
    const list = shuffled(questions.filter(q => q.roles.includes(role)), SEED + ri).slice(0, 20);
    h += '<div class="page"><h1>Knowledge check: ' + role + '</h1><p>Name: ______________________ &nbsp; Date: ____________ &nbsp; Pass mark: 80%</p><ol>' +
      list.map((q, qi) => {
        const opts = shuffled(q.options.map((t, i) => ({ t, ok: i === q.answer })), SEED + 100 * ri + qi);
        q._k = letters[opts.findIndex(o => o.ok)];
        return '<li style="margin-bottom:3mm;page-break-inside:avoid">' + esc(q.stem) + '<br>' + opts.map((o, i) => letters[i] + '. ' + esc(o.t)).join('<br>') + '</li>';
      }).join('') + '</ol>' + NOTICE + '</div>';
    key += '<h2>' + role + '</h2><table><thead><tr><th>#</th><th>Answer</th><th>Clause</th><th>Why</th></tr></thead><tbody>' + list.map((q, i) => '<tr><td>' + (i + 1) + '</td><td>' + q._k + '</td><td>' + esc(q.clause) + '</td><td>' + esc(q.rationale) + '</td></tr>').join('') + '</tbody></table>';
  });
  h += '<div class="page"><h1>Answer key (instructor copy)</h1>' + key + NOTICE + '</div>';
  return wrap('ISO 9001 knowledge checks', h);
}
fs.writeFileSync(path.join(outDir, 'quiz-sheets.html'), quizSheets());
written.push('quiz-sheets.html');

const CLAUSES = [['4', 'Context of the organization'], ['5', 'Leadership'], ['6', 'Planning'], ['7', 'Support'], ['8', 'Operation'], ['9', 'Performance evaluation'], ['10', 'Improvement']];
function sprintCards() {
  let h = '<div class="page"><h1>Clause cards (one set per team)</h1><div class="cards">' + CLAUSES.map(c => '<div class="card"><div class="big">' + c[0] + '</div><div class="t" style="text-align:center"><b>' + esc(c[1]) + '</b></div></div>').join('') + '</div>' + NOTICE + '</div>';
  const sc = shuffled(questions.filter(q => q.type === 'scenario'), SEED).slice(0, 24);
  for (let i = 0; i < sc.length; i += 8) {
    h += '<div class="page"><h1>Scenario cards (facilitator reads aloud)</h1><div class="cards">' + sc.slice(i, i + 8).map((q, k) => '<div class="card"><div class="id">Scenario ' + (i + k + 1) + '</div><div class="t">' + esc(q.stem) + '</div></div>').join('') + '</div></div>';
  }
  h += '<div class="page"><h1>Scenario key (facilitator)</h1><table><thead><tr><th>#</th><th>Answer</th><th>Clause</th></tr></thead><tbody>' + sc.map((q, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(q.options[q.answer]) + '</td><td>' + esc(q.clause) + '</td></tr>').join('') + '</tbody></table>' + NOTICE + '</div>';
  return wrap('Clause Sprint cards', h);
}
fs.writeFileSync(path.join(outDir, 'clause-sprint-cards.html'), sprintCards());
written.push('clause-sprint-cards.html');

console.log('Wrote ' + written.length + ' printable files to games/printables/ (seed ' + SEED + ', ' + ROUNDS + ' rounds)');
