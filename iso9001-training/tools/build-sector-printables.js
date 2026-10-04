'use strict';
// Generates print-ready sector quiz sheets (with answer keys) and the Sector Showdown card deck
// from data/quizzes/<pack>.json (Appendix C).
// Run: node tools/build-sector-printables.js [--seed 12345]
// Output: games/printables/sector-quiz-<pack>.html and games/printables/sector-showdown-cards.html
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const json = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const company = json('config/company.json');
const clauseMap = json('data/clause-map.json');
const TITLES = {};
clauseMap.clauses.forEach(c => { TITLES[c.id] = c.title2015; });
const PARENT_TITLES = { 4: 'Context of the organization', 5: 'Leadership', 6: 'Planning', 7: 'Support', 8: 'Operation', 9: 'Performance evaluation', 10: 'Improvement' };

const argv = process.argv.slice(2);
const si = argv.indexOf('--seed');
const SEED = si >= 0 ? parseInt(argv[si + 1], 10) : 9001;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const LET = ['A', 'B', 'C', 'D'];
const outDir = path.join(root, 'games/printables');
fs.mkdirSync(outDir, { recursive: true });

function rng(seed) { let a = seed | 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffled(arr, seed) { const r = rng(seed), a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function hash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
// Options are shuffled per item and per seed, so the printed correct position is not the stored one.
// Printed correct positions are balanced: each position is used equally often within a pack.
const TARGET = {};
function assignTargets(bank) {
  const n = bank.items.length, slots = shuffled(Array.from({ length: n }, (_, i) => i % 4), SEED + hash(bank.pack));
  bank.items.forEach((it, i) => { TARGET[it.id] = slots[i]; });
}
function layout(item) {
  const r = SEED + hash(item.id);
  const wrong = shuffled(item.options.filter((_, i) => i !== item.answerIndex).map(t => ({ t, ok: false })), r);
  const opts = wrong.slice();
  const pos = TARGET[item.id] != null ? TARGET[item.id] : Math.floor(rng(r)() * 4);
  opts.splice(pos, 0, { t: item.options[item.answerIndex], ok: true });
  return { opts, key: LET[pos] };
}
const GROUP_TITLES = { '7.1': 'Resources', '7.5': 'Documented information', '8.2': 'Requirements for products and services', '8.5': 'Production and service provision', '9.1': 'Monitoring, measurement, analysis and evaluation' };
function clauseTitle(c) { return TITLES[c] || GROUP_TITLES[c] || PARENT_TITLES[c.split('.')[0]] || ''; }
const refs = it => (it.clauseRefs && it.clauseRefs.length ? it.clauseRefs : [it.clause2015]);
const roleText = r => r.map(x => ({ F: 'Frontline', T: 'Technical', S: 'Supervisor' }[x] || x)).join(', ');

const CSS = `
@page{size:letter;margin:12mm}
*{box-sizing:border-box}
body{font:11pt/1.35 system-ui,-apple-system,"Segoe UI",Arial,sans-serif;color:#000;background:#fff;margin:0}
.page{page-break-after:always;padding:2mm}
.page:last-child{page-break-after:auto}
h1{font-size:18pt;margin:0 0 3mm}
h2{font-size:14pt;margin:4mm 0 2mm;border-bottom:2px solid #000}
table{border-collapse:collapse;width:100%;margin:2mm 0}
th,td{border:1.5px solid #000;padding:1.6mm 2mm;text-align:left;vertical-align:top;font-size:10pt}
th{background:#e6e6e6}
ol.qs>li{margin-bottom:3.5mm;page-break-inside:avoid}
.opts{margin:1mm 0 0 0;padding:0;list-style:none}
.opts li{margin:.6mm 0}
.box{display:inline-block;width:5mm;height:5mm;border:1.5px solid #000;margin-right:2mm;vertical-align:-1mm}
.hdr td{height:10mm}
.sec{font-weight:700;text-transform:uppercase;font-size:9pt;letter-spacing:.04em}
.deck{display:grid;grid-template-columns:repeat(3,1fr);gap:0}
.card{border:1.5px dashed #000;padding:3mm;height:62mm;overflow:hidden;page-break-inside:avoid;font-size:9.5pt}
.card .id{font-weight:800;font-size:11pt;display:flex;justify-content:space-between}
.card .t{margin:1.5mm 0}
.card .big{font-size:30pt;font-weight:800;text-align:center;line-height:1.1;margin:3mm 0 1mm}
.card .ctr{text-align:center}
.card small{display:block;font-size:8.5pt}
.note{font-size:9pt;margin-top:5mm;border-top:1px solid #000;padding-top:2mm}
@media screen{body{max-width:200mm;margin:0 auto;padding:4mm}}
`;
const NOTICE = '<div class="note">This material is an original training aid. It is not a substitute for the standard. Obtain ISO 9001 from ISO or a national standards body. Fictional organization. Sector-specific legal, clinical, safety, and food safety requirements are outside the scope of these quizzes. Clause numbers use the 2015 edition, are references only, and are unverified against the purchased standard.</div>';
const wrap = (title, body) => '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(title) + '</title><style>' + CSS + '</style></head><body>' + body + '</body></html>';

const files = fs.readdirSync(path.join(root, 'data/quizzes')).filter(f => f.endsWith('.json')).sort();
const banks = files.map(f => json('data/quizzes/' + f));
banks.forEach(assignTargets);
const written = [];

/* ---------- Sector quiz sheets: two 12-item forms per pack, plus an answer key ---------- */
function sheet(bank) {
  const items = bank.items;
  const forms = [['Form A', items.slice(0, 12)], ['Form B', items.slice(12, 24)]];
  if (items.length > 24) forms.push(['Form C', items.slice(24)]);
  let h = '';
  const keys = [];
  forms.forEach(([label, list]) => {
    if (!list.length) return;
    const laid = list.map(it => Object.assign({ it }, layout(it)));
    keys.push([label, laid]);
    h += '<div class="page"><h1>Sector quiz: ' + esc(bank.specPackName) + ' (' + label + ')</h1>' +
      '<p class="sec">' + esc(company.company && company.company !== 'Meridian Group' ? company.company : bank.company) + ' &middot; ' + list.length + ' questions &middot; 15 minutes &middot; pass mark 80 percent (configurable)</p>' +
      '<table class="hdr"><tr><th style="width:18%">Name</th><td></td><th style="width:12%">Role</th><td style="width:22%"><span class="box"></span>F <span class="box"></span>T <span class="box"></span>S</td></tr><tr><th>Date</th><td></td><th>Instructor</th><td></td></tr><tr><th>Score</th><td>______ of ' + list.length + '</td><th>Result</th><td><span class="box"></span>Pass <span class="box"></span>Retake</td></tr></table>' +
      '<p>Circle one letter for each question.</p><ol class="qs">' +
      laid.map(x => '<li>' + esc(x.it.stem) + '<ul class="opts">' + x.opts.map((o, i) => '<li><b>' + LET[i] + '.</b> ' + esc(o.t) + '</li>').join('') + '</ul></li>').join('') +
      '</ol>' + NOTICE + '</div>';
  });
  h += '<div class="page"><h1>Answer key (instructor copy): ' + esc(bank.specPackName) + '</h1><p>Keep this page separate from participant sheets. Show the rationale and clause after the sheets are collected (assessment mode).</p>';
  keys.forEach(([label, laid]) => {
    h += '<h2>' + label + '</h2><table><thead><tr><th>#</th><th>Item</th><th>Answer</th><th>Clause</th><th>Roles</th><th>Why</th></tr></thead><tbody>' +
      laid.map((x, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(x.it.id) + '</td><td><b>' + x.key + '</b></td><td>' + esc(refs(x.it).join(', ')) + '</td><td>' + esc(x.it.roles.join(', ')) + '</td><td>' + esc(x.it.rationale) + '</td></tr>').join('') + '</tbody></table>';
  });
  h += '<p>Role tags: F frontline (suitable for all roles), T technical, S supervisor or team leader. Verification status of every item: ' + esc(bank.verifyStatus2015) + '.</p>' + NOTICE + '</div>';
  return wrap('Sector quiz: ' + bank.specPackName, h);
}
banks.forEach(b => {
  const f = 'sector-quiz-' + b.pack + '.html';
  fs.writeFileSync(path.join(outDir, f), sheet(b));
  written.push(f);
});

/* ---------- Sector Showdown cards: question card, answer card, clause card ---------- */
function showdown() {
  let h = '<div class="page"><h1>Sector Showdown card deck</h1>' +
    '<p><b>Players:</b> teams of 3 to 5. <b>Time:</b> 20 to 30 minutes. <b>Preparation:</b> print the pages for one sector on card stock and cut along the dashed lines. Each row holds a question card, its answer card, and its clause card.</p>' +
    '<ol><li>The facilitator reads a question card aloud. Every team answers the same question on paper or a mini whiteboard: a letter and, if it can, a clause number.</li>' +
    '<li>Teams reveal together. Turn over the answer card. One point for each team with the correct letter.</li>' +
    '<li>Show the clause card. A team that cited the correct clause earns one bonus point. Any clause listed on the card counts.</li>' +
    '<li>After 12 questions, total the points and run the debrief.</li></ol>' +
    '<h2>Variants</h2><ul><li><b>Cross-Sector Swap:</b> give each team another sector\'s deck.</li><li><b>Streak Round:</b> consecutive correct answers score 1, 2, 3 and so on; a wrong answer resets the streak.</li><li><b>Exit Ticket:</b> draw five question cards at random at the end of a session.</li></ul>' +
    '<h2>Debrief prompts</h2><ul><li>Which question looked sector-specific but tested a general requirement?</li><li>Which clause appeared most often?</li><li>What would you do differently at your workstation?</li></ul>' +
    '<h2>Score sheet</h2><table><thead><tr><th>Team</th>' + Array.from({ length: 12 }, (_, i) => '<th>' + (i + 1) + '</th>').join('') + '<th>Bonus</th><th>Total</th></tr></thead><tbody>' +
    [1, 2, 3, 4, 5, 6].map(t => '<tr><td>Team ' + t + '</td>' + '<td></td>'.repeat(14) + '</tr>').join('') + '</tbody></table>' +
    '<h2>Contents</h2><ul>' + banks.map(b => '<li>' + esc(b.specPackName) + ' (' + b.specPrefix + '): ' + b.items.length + ' cards</li>').join('') + '</ul>' + NOTICE + '</div>';
  banks.forEach(b => {
    const rows = b.items.map(it => {
      const l = layout(it), ans = l.opts.find(o => o.ok).t, rs = refs(it);
      return '<div class="card"><div class="id"><span>' + esc(it.id) + '</span><span>QUESTION</span></div><small>' + esc(b.specPackName) + '</small><div class="t">' + esc(it.stem) + '</div>' + l.opts.map((o, i) => '<div><b>' + LET[i] + '.</b> ' + esc(o.t) + '</div>').join('') + '</div>' +
        '<div class="card"><div class="id"><span>' + esc(it.id) + '</span><span>ANSWER</span></div><div class="big">' + l.key + '</div><div class="t"><b>' + esc(ans) + '</b></div><small>' + esc(it.rationale) + '</small></div>' +
        '<div class="card"><div class="id"><span>' + esc(it.id) + '</span><span>CLAUSE</span></div><div class="big">' + esc(rs[0]) + '</div><div class="ctr"><b>' + esc(clauseTitle(rs[0])) + '</b></div>' +
        (rs.length > 1 ? '<div class="ctr t">Also accepted: ' + rs.slice(1).map(c => esc(c) + ' (' + esc(clauseTitle(c)) + ')').join('; ') + '</div>' : '') +
        '<small class="ctr">Roles: ' + esc(roleText(it.roles)) + '. Bonus point for the correct clause. Reference only; unverified.</small></div>';
    });
    for (let i = 0; i < rows.length; i += 4) {
      h += '<div class="page"><h1 style="font-size:13pt">Sector Showdown: ' + esc(b.specPackName) + ' (cards ' + (i + 1) + ' to ' + Math.min(i + 4, rows.length) + ')</h1><div class="deck">' + rows.slice(i, i + 4).join('') + '</div></div>';
    }
  });
  return wrap('Sector Showdown cards', h);
}
fs.writeFileSync(path.join(outDir, 'sector-showdown-cards.html'), showdown());
written.push('sector-showdown-cards.html');

console.log('Wrote ' + written.length + ' sector printables to games/printables (seed ' + SEED + '): ' + written.join(', '));
