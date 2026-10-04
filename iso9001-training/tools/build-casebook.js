'use strict';
// Builds the Sector Casebook (Appendix D) from templates, the engine, and the JSON case files.
//   games/casebook/template.html                -> games/casebook/index.html
//   games/casebook/results-reader.template.html -> games/casebook/results-reader.html
// Every case file is checked with the case schema validator; the build stops on any error.
// 2026 variants (edition "2026", Appendix D.7.2) are checked for confidence labels and carry the exact Section 0.1
// caution, taken from data/clause-map.json. The optional placement check (Appendix D.1) is read from
// data/casebook/placement.json and checked here.
// Run: node tools/build-casebook.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const json = f => JSON.parse(read(f));
// Prevents "</script>" or "<!--" inside embedded JSON from ending the script block early.
const safe = o => JSON.stringify(o).replace(/</g, '\\u003c');

const QF = require(path.join(root, 'games/quality-flow/engine.js'));
const CB = require(path.join(root, 'games/casebook/engine.js'));

function loadCatalog() {
  const sectorsFile = json('data/casebook/sectors.json');
  const packs = json('data/packs.json');
  const clauseMap = json('data/clause-map.json');
  const clauseIds = clauseMap.clauses.map(c => c.id);
  const errors = [];
  const cases = {};
  const drills = {};
  const primers = {};
  sectorsFile.sectors.forEach(s => {
    const pack = packs.find(p => p.id === s.pack);
    if (!pack) errors.push('sectors.json: pack ' + s.pack + ' is not in data/packs.json');
    else { s.stages = pack.stages; s.term = pack.term; if (pack.company !== s.company) errors.push('sectors.json: company for ' + s.pack + ' differs from data/packs.json'); }
    const dir = path.join(root, 'data/casebook', s.pack);
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^[A-F]-\d+\.json$/.test(f)).sort() : [];
    cases[s.pack] = files.map(f => {
      const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      CB.validateCase(c, { clauseIds }).forEach(e => errors.push('data/casebook/' + s.pack + '/' + f + ': ' + e));
      if (c.pack !== s.pack) errors.push(f + ': pack field does not match folder ' + s.pack);
      if (!c.id.startsWith(s.code + '-')) errors.push(f + ': id does not start with sector code ' + s.code);
      const expectName = c.type + '-' + parseInt(c.id.split('-')[2], 10) + '.json';
      if (f !== expectName) errors.push(f + ': file name should be ' + expectName);
      return c;
    });
    const dPath = 'content/sector-tracks/' + s.pack + '/drills.md';
    drills[s.pack] = fs.existsSync(path.join(root, dPath)) ? parseDrills(read(dPath), dPath, errors) : [];
    primers[s.pack] = fs.existsSync(path.join(root, 'content/sector-tracks/' + s.pack + '/primer.md'));
  });
  const caution = clauseMap.meta.caution;
  if (!/^CAUTION: PRELIMINARY 2026 INFORMATION\. /.test(caution || '')) errors.push('data/clause-map.json: meta.caution is missing or altered');
  Object.keys(cases).forEach(p => cases[p].filter(c => c.edition === '2026').forEach(c => {
    const base = cases[p].find(x => x.id === c.variantOf);
    if (!base) errors.push(c.id + ': variantOf ' + c.variantOf + ' is not a case in this sector');
    else if (base.edition !== '2015' || base.type !== c.type) errors.push(c.id + ': variantOf must name a 2015 case of the same type');
  }));
  const placement = loadPlacement(clauseIds, errors);
  return {
    catalog: {
      meta: sectorsFile.meta, sectors: sectorsFile.sectors, cases, drills, primers,
      clauses: clauseMap.clauses.map(c => ({ id: c.id, title: c.title2015, ref2026: c.ref2026, confidence2026: c.confidence })),
      caution2026: caution, placement
    },
    errors
  };
}

// Placement check: exactly eight sector-neutral items with four options, a valid answer, a clause tag in the
// clause map, and a core module number. No 2026 content.
function loadPlacement(clauseIds, errors) {
  const f = 'data/casebook/placement.json';
  if (!fs.existsSync(path.join(root, f))) { errors.push(f + ' is missing'); return null; }
  const pl = json(f);
  const e = m => errors.push(f + ': ' + m);
  if (!pl.meta || !(pl.meta.passMark > 0 && pl.meta.passMark <= 100)) e('meta.passMark must be a percentage from 1 to 100');
  if (!pl.meta || !pl.meta.adviceReady || !pl.meta.adviceReview || !pl.meta.passRule) e('meta needs passRule, adviceReady, and adviceReview');
  if (!Array.isArray(pl.items) || pl.items.length !== 8) { e('needs exactly 8 items'); return pl; }
  const ids = new Set();
  pl.items.forEach(it => {
    if (!it.id || ids.has(it.id)) e('item id missing or duplicated: ' + it.id); ids.add(it.id);
    if (!it.stem || !Array.isArray(it.options) || it.options.length !== 4 || it.options.some(o => !o)) e(it.id + ' needs a stem and four options');
    if (!(Number.isInteger(it.answer) && it.answer >= 0 && it.answer < 4)) e(it.id + ' answer out of range');
    if (!it.rationale) e(it.id + ' needs a rationale');
    if (!(Number.isInteger(it.module) && it.module >= 0 && it.module <= 12) || !it.moduleTitle) e(it.id + ' needs a core module number and title');
    String(it.clause || '').split(/,\s*/).forEach(cl => { if (!clauseIds.includes(cl)) e(it.id + ' clause ' + cl + ' is not in the clause map'); });
  });
  if (/2026/.test(JSON.stringify(pl.items))) e('items must not contain 2026 content');
  return pl;
}

// Parses drills.md. Multiple-choice and Translate items use the same block format:
//   **DM-D01.** Stem
//   - A) option ... - D) option
//   **Answer: C.** Rationale. *(Cl. 7.5.3; F, T)*
// The Scenario sort is a table: | No. | Situation | Conforming or nonconforming | Clause |
function parseDrills(text, file, errors) {
  const items = [];
  const re = /\*\*([A-Z]{2}-[DT]\d{2})\.\*\*\s+([^\n]+)\n\s*\n- A\) ([^\n]+)\n- B\) ([^\n]+)\n- C\) ([^\n]+)\n- D\) ([^\n]+)\n\s*\n\*\*Answer: ([A-D])\.\*\*\s+(.+?)\s*\*\(Cl\. ([^;]+);\s*([FTS, ]+)\)\*/g;
  let m;
  while ((m = re.exec(text))) {
    items.push({ id: m[1], kind: m[1][3] === 'T' ? 'translate' : 'mc', stem: m[2].trim(), options: [m[3], m[4], m[5], m[6]].map(s => s.trim()), answer: 'ABCD'.indexOf(m[7]), rationale: m[8].trim(), clause: m[9].trim(), roles: m[10].split(',').map(s => s.trim()) });
  }
  const sortPart = /## Part 3[^\n]*\n([\s\S]*?)(\n## |$)/.exec(text);
  if (sortPart) {
    sortPart[1].split('\n').filter(l => /^\|\s*\d+\s*\|/.test(l)).forEach(l => {
      const cells = l.split('|').slice(1, -1).map(s => s.trim());
      const ans = /^nonconforming/i.test(cells[2]) ? 1 : (/^conforming/i.test(cells[2]) ? 0 : -1);
      if (ans < 0) errors.push(file + ': scenario sort row ' + cells[0] + ' has no Conforming or Nonconforming answer');
      items.push({ id: 'SORT-' + cells[0], kind: 'sort', stem: cells[1], options: ['Conforming', 'Nonconforming'], answer: ans, rationale: cells[4] || '', clause: cells[3], roles: ['F'] });
    });
  }
  return items;
}

function inlineRng() { return 'var CB_MULBERRY32 = ' + QF.mulberry32.toString() + ';'; }

function build() {
  const { catalog, errors } = loadCatalog();
  if (errors.length) {
    console.error('Casebook build stopped. ' + errors.length + ' problem(s):\n' + errors.map(e => ' - ' + e).join('\n'));
    process.exit(1);
  }
  const engine = read('games/casebook/engine.js');
  const pages = [['games/casebook/template.html', 'games/casebook/index.html'], ['games/casebook/results-reader.template.html', 'games/casebook/results-reader.html']];
  pages.forEach(([src, dst]) => {
    let html = read(src);
    html = html.replace('__CASEBOOK_DATA__', () => safe(catalog)).replace('/*__RNG__*/', () => inlineRng()).replace('/*__ENGINE__*/', () => engine);
    fs.writeFileSync(path.join(root, dst), html);
    console.log('Built ' + dst + ' (' + Math.round(html.length / 1024) + ' KB)');
  });
  const n = Object.keys(catalog.cases).reduce((k, p) => k + catalog.cases[p].length, 0);
  const d = Object.keys(catalog.drills).reduce((k, p) => k + catalog.drills[p].length, 0);
  const n26 = Object.keys(catalog.cases).reduce((k, p) => k + catalog.cases[p].filter(c => c.edition === '2026').length, 0);
  console.log('Casebook: ' + catalog.sectors.length + ' sectors, ' + n + ' cases (' + (n - n26) + ' core, ' + n26 + ' 2026 variants), ' + d + ' drill items, placement check of ' + catalog.placement.items.length + ' items.');
}

if (require.main === module) build();
module.exports = { loadCatalog, loadPlacement, parseDrills, safe };
