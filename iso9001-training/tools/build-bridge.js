'use strict';
// Builds the 2026 bridge games (Bridge Sprint and Culture Under Pressure) and their printables.
// All output is PRELIMINARY 2026 content and carries the Section 0.1 caution on every screen and printed page.
// Run: node tools/build-bridge.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const json = f => JSON.parse(read(f));
const safe = o => JSON.stringify(o).replace(/</g, '\\u003c');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const company = json('config/company.json');
const bq = json('data/questions-bridge.json');
const sc = json('data/scenarios-2026.json');
const CAUTION = bq.meta.caution;
if (!/^CAUTION: PRELIMINARY 2026 INFORMATION\./.test(CAUTION) || sc.meta.caution !== CAUTION) throw new Error('Caution text missing or inconsistent in the bridge data files');

// ---------- Single-file game ----------
const data = {
  meta: {
    caution: CAUTION, sprintCards: bq.meta.sprintCards, cultureScoring: sc.meta.cultureScoring,
    cultureSafety: sc.meta.cultureSafety, cultureRoles: sc.meta.cultureRoles
  },
  sprintStatements: bq.sprintStatements,
  culture: sc.cultureUnderPressure
};
const config = { teams: 4, teamNames: [], seed: 2026, sprintStatements: 12, points: { match: 2, verify: 1, support: 1 } };
let html = read('games/bridge/template.html');
html = html.replace('__CONFIG_JSON__', () => safe(config)).replace('__DATA_JSON__', () => safe(data)).replace(/__COMPANY__/g, () => esc(company.company));
fs.mkdirSync(path.join(root, 'games/bridge'), { recursive: true });
fs.writeFileSync(path.join(root, 'games/bridge/index.html'), html);
console.log('Built games/bridge/index.html (' + Math.round(html.length / 1024) + ' KB)');

// ---------- Printables ----------
const CSS = `
@page{size:letter;margin:12mm}
*{box-sizing:border-box}
body{font:11pt/1.35 system-ui,-apple-system,"Segoe UI",Arial,sans-serif;color:#000;background:#fff;margin:0}
.page{page-break-after:always;padding:2mm}
.page:last-child{page-break-after:auto}
h1{font-size:18pt;margin:0 0 3mm}
h2{font-size:14pt;margin:4mm 0 2mm;border-bottom:2px solid #000}
h3{font-size:12pt;margin:3mm 0 1mm}
table{border-collapse:collapse;width:100%;margin:2mm 0}
th,td{border:1.5px solid #000;padding:1.5mm 2mm;text-align:left;vertical-align:top;font-size:9.5pt}
th{background:#e6e6e6}
.caution{border:2.5px solid #000;padding:2mm 3mm;margin:0 0 3mm;font-size:8.5pt}
.caution b{font-size:9pt}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:0}
.card{border:1.5px dashed #000;padding:3mm;min-height:52mm;page-break-inside:avoid}
.card .id{font-weight:800;font-size:12pt}
.card .t{font-size:11pt;margin:1.5mm 0}
.card small{display:block;font-size:8.5pt}
.answercard{border:3px solid #000;border-radius:3mm;height:70mm;display:flex;align-items:center;justify-content:center;text-align:center;font-size:24pt;font-weight:800;padding:4mm;page-break-inside:avoid}
.answers{display:grid;grid-template-columns:1fr;gap:4mm}
.blank{height:8mm}
.note{font-size:8.5pt;margin-top:4mm;border-top:1px solid #000;padding-top:2mm}
ol.opts{margin:1mm 0 0;padding-left:6mm}
`;
const cautionBox = '<div class="caution" role="note"><b>CAUTION: PRELIMINARY 2026 INFORMATION.</b> ' + esc(CAUTION.replace(/^CAUTION: PRELIMINARY 2026 INFORMATION\.\s*/, '')) + '</div>';
const NOTICE = '<div class="note">This material is an original training aid. It is not a substitute for the standard. Obtain ISO 9001 from ISO or a national standards body. Fictional organization: ' + esc(company.company) + '. Statements about the 2026 edition are paraphrased from secondary commentary, carry confidence labels, and are unverified.</div>';
const page = (title, body) => '<div class="page">' + cautionBox + '<h1>' + esc(title) + '</h1>' + body + NOTICE + '</div>';
const wrap = (title, pages) => '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>' + CSS + '</style></head><body>' + pages.join('') + '</body></html>';
const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };
const outDir = path.join(root, 'games/printables');

// Bridge Sprint
{
  const C = bq.meta.sprintCards;
  const pages = [];
  pages.push(page('Bridge Sprint answer cards (one set per team)', '<div class="answers">' + ['unchanged', 'changed', 'verify'].map(k => '<div class="answercard">' + esc(C[k]) + '</div>').join('') + '</div>'));
  chunk(bq.sprintStatements, 8).forEach((group, gi) => {
    pages.push(page('Bridge Sprint statement cards (' + (gi + 1) + ')', '<div class="cards">' + group.map(s => '<div class="card"><div class="id">' + esc(s.id) + '</div><div class="t">' + esc(s.statement) + '</div><small>Facilitator: read aloud. Answer on the key sheet.</small></div>').join('') + '</div>'));
  });
  chunk(bq.sprintStatements, 12).forEach((group, gi) => {
    pages.push(page('Bridge Sprint facilitator key (' + (gi + 1) + ')', '<p>Matching card: 2 points. For Single, Unclear and Best estimate items, the "' + esc(C.verify) + '" card also earns 1 point. Name the clause in both editions after each reveal.</p>' +
      '<table><thead><tr><th>ID</th><th>Statement</th><th>Answer</th><th>2015 / 2026</th><th>Confidence</th><th>Note</th></tr></thead><tbody>' +
      group.map(s => '<tr><td>' + s.id + '</td><td>' + esc(s.statement) + '</td><td><b>' + esc(C[s.answer]) + '</b>' + (s.alsoAccept.length ? '<br>(verify: 1 point)' : '') + '</td><td>' + esc(s.clause2015) + ' / ' + esc(s.clause2026) + '</td><td>' + esc(s.confidence) + ', unverified</td><td>' + esc(s.note) + '</td></tr>').join('') + '</tbody></table>'));
  });
  pages.push(page('Bridge Sprint score sheet', '<table><thead><tr><th>Statement</th>' + [1, 2, 3, 4, 5, 6].map(n => '<th>Team ' + n + '</th>').join('') + '</tr></thead><tbody>' +
    Array.from({ length: 16 }, (_, i) => '<tr><td class="blank">' + (i + 1) + '</td>' + '<td></td>'.repeat(6) + '</tr>').join('') + '<tr><th>Total</th>' + '<td></td>'.repeat(6) + '</tr></tbody></table>'));
  fs.writeFileSync(path.join(outDir, 'bridge-sprint-cards.html'), wrap('Bridge Sprint cards', pages));
  console.log('Built games/printables/bridge-sprint-cards.html');
}

// Culture Under Pressure
{
  const R = sc.meta.cultureRoles, RN = { operator: 'Operator', technician: 'Technician', supervisor: 'Supervisor', manager: 'Manager' };
  const L = ['A', 'B', 'C'];
  const safety = '<div class="caution"><b>Safety rules.</b> ' + sc.meta.cultureSafety.map(esc).join(' ') + '</div>';
  const pages = [];
  pages.push(page('Culture Under Pressure: how to play', safety +
    '<ol><li>Form groups of four: operator, technician, supervisor, manager. Fictional roles only.</li><li>The facilitator reads a scenario card aloud.</li><li>Each player reads the option card for their role and chooses A, B or C in secret (write the letter and fold the paper).</li><li>Reveal choices. The facilitator reads the consequence of each path from the key.</li><li>Score: ' + esc(sc.meta.cultureScoring) + '</li><li>Discuss what would have made the better response easier.</li></ol>' +
    '<h3>Debrief (every game)</h3><ol><li>Which conditions made speaking up easy or hard?</li><li>What can leaders change?</li></ol>' +
    '<p>Links: Modules 2, 4 and 7. The culture expectation in 5.1.1 and awareness in 7.3 are reported with High confidence and are unverified.</p>'));
  sc.cultureUnderPressure.forEach(c => {
    pages.push(page(c.id + ': ' + c.title, '<p><b>Clause link (2026, paraphrased):</b> ' + esc(c.clause) + ' (' + esc(c.confidence) + ', unverified)</p>' +
      '<div class="card" style="min-height:0;border-style:solid"><div class="t"><b>Scenario.</b> ' + esc(c.situation) + '</div></div>' +
      '<h2>Role option cards (cut along the dashed lines)</h2><div class="cards">' + R.map(r => '<div class="card"><div class="id">' + RN[r] + '</div><div class="t">' + esc(c.roles[r].prompt) + '</div><ol class="opts" type="A">' + c.roles[r].options.map(o => '<li>' + esc(o.text) + '</li>').join('') + '</ol></div>').join('') + '</div>'));
    pages.push(page(c.id + ' facilitator key', safety + '<table><thead><tr><th>Role</th><th>Option</th><th>Points</th><th>Consequence</th></tr></thead><tbody>' +
      R.map(r => c.roles[r].options.map((o, k) => '<tr><td>' + RN[r] + '</td><td>' + L[k] + '</td><td>' + o.points + (o.supports ? ' +1 support' : '') + '</td><td>' + esc(o.consequence) + '</td></tr>').join('')).join('') + '</tbody></table>' +
      '<p><b>Debrief:</b> ' + esc(c.debrief) + '</p>'));
  });
  pages.push(page('Culture Under Pressure score sheet', '<table><thead><tr><th>Card</th><th>Group</th>' + R.map(r => '<th>' + RN[r] + '</th>').join('') + '<th>Support points</th><th>Total</th></tr></thead><tbody>' +
    Array.from({ length: 14 }, () => '<tr><td class="blank"></td><td></td>' + '<td></td>'.repeat(R.length) + '<td></td><td></td></tr>').join('') + '</tbody></table>'));
  fs.writeFileSync(path.join(outDir, 'culture-under-pressure.html'), wrap('Culture Under Pressure cards', pages));
  console.log('Built games/printables/culture-under-pressure.html');
}
