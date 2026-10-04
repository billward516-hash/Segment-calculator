'use strict';
// Sector Casebook tests (Appendix D.13 item 10 and D.14).
// Run: node tests/casebook-tests.js   (build first: node tools/build-casebook.js)
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const exists = f => fs.existsSync(path.join(root, f));
const CB = require('../games/casebook/engine.js');
const QF = require('../games/quality-flow/engine.js');
const { loadCatalog, parseDrills } = require('../tools/build-casebook.js');

let failed = 0, passed = 0;
function check(name, ok, detail) {
  if (ok) passed++; else failed++;
  if (!ok || process.env.VERBOSE) console.log((ok ? 'PASS ' : 'FAIL ') + name + (!ok && detail ? '  ' + detail : ''));
}
const PACKS = ['discrete-manufacturing', 'process-food', 'electronics', 'construction', 'it-software', 'healthcare', 'logistics', 'professional-services'];

/* ---------- catalog and schema ---------- */
const { catalog, errors } = loadCatalog();
check('every case file passes the schema validator', errors.length === 0, errors.slice(0, 8).join(' | '));
check('eight sectors match the industry pack ids', JSON.stringify(catalog.sectors.map(s => s.pack).sort()) === JSON.stringify(PACKS.slice().sort()));
check('sector companies are fictional Meridian organizations', catalog.sectors.every(s => /^Meridian /.test(s.company)));
check('sector codes are unique three-letter codes', new Set(catalog.sectors.map(s => s.code)).size === 8 && catalog.sectors.every(s => /^[A-Z]{3}$/.test(s.code)));
const allCases = [];
catalog.sectors.forEach(s => {
  const cs = catalog.cases[s.pack];
  const types = cs.filter(c => c.edition === '2015').map(c => c.type).sort().join('');
  check(s.pack + ': six core (2015) cases, one per type A to F', types === 'ABCDEF', types);
  const v26 = cs.filter(c => c.edition === '2026');
  check(s.pack + ': one 2026 Type F variant that varies the sector\'s Type F case', v26.length === 1 && v26[0].type === 'F' && v26[0].variantOf === s.code + '-F-01' && v26[0].id === s.code + '-F-02', v26.map(c => c.id).join(','));
  cs.forEach(c => allCases.push({ c, s }));
});
const coreCases = allCases.filter(x => x.c.edition === '2015'), cases26 = allCases.filter(x => x.c.edition === '2026');
check('48 core cases and 8 2026 variants in total', coreCases.length === 48 && cases26.length === 8, coreCases.length + '+' + cases26.length);
check('schema file exists and names the required fields', exists('data/casebook/case.schema.json') && JSON.parse(read('data/casebook/case.schema.json')).required.indexOf('verifyStatus2015') >= 0);
const clauseIds = new Set(JSON.parse(read('data/clause-map.json')).clauses.map(c => c.id));
allCases.forEach(({ c, s }) => {
  const id = c.id;
  check(id + ': verifyStatus2015 is unverified', c.verifyStatus2015 === 'unverified');
  check(id + ': at least four plantable issues and two red herrings', c.evidence.filter(e => e.plantedPool && !e.supports).length >= 4 && c.evidence.filter(e => e.kind === 'redHerring').length >= 2);
  check(id + ': every evidence card has a clause tag in the clause map and an explanation', c.evidence.every(e => e.clause && e.clause.split(/,\s*/).every(x => clauseIds.has(x)) && e.whyItMatters && e.missedExplanation));
  check(id + ': title matches the D.7.2 catalog slot (type ' + c.type + ')', typeof c.title === 'string' && c.title.length > 3);
  const first = {}; Object.keys(c.tokens || {}).forEach(k => { first[k] = c.tokens[k][0]; });
  const brief = c.brief.replace(/\{\{(\w+)\}\}/g, (m, k) => first[k]);
  check(id + ': brief names the fictional sector organization', brief.indexOf(s.company) >= 0 || brief.indexOf('Meridian') >= 0, brief.slice(0, 80));
});
const titles = {
  'discrete-manufacturing': ['The Morning Walk', 'The Shifted Batch', 'The Recurring Burr', 'The Faster Spindle', 'The Fit Complaint', 'The Friday Shipment'],
  'process-food': ['Line Start-Up Walk', 'Where Did Batch 62 Go', 'The Monthly Label Error', 'The Yield Adjustment', 'The Packaging Complaint', 'The Waiting Truck'],
  'electronics': ['Floor Walk Before Audit', 'Lot Genealogy', 'The Repeating Scratch', 'The Pressure Recipe', 'The Particle Report', 'The Month-End Lot'],
  'construction': ['Site Walk at Dawn', 'Pour Records', 'The Misplaced Anchors', 'The Supplier Swap', 'The Handover Defect', 'The Hold Point'],
  'it-software': ['Sprint Review Walk', 'Release Trail', 'The Third Regression', 'The Hotfix', 'The Production Defect', 'The Launch Date'],
  'healthcare': ['Ward Systems Walk', 'Handover Trail', 'The Recurring Documentation Gap', 'The Revised Transfer Form', 'The Feedback Letter', 'The Pending Result'],
  'logistics': ['Dock Walk', 'Pallet Trail', 'The Weekly Mislabel', 'The Layout Change', 'The Wrong Item', 'The Waiting Driver'],
  'professional-services': ['Office Walk', 'Engagement File Trail', 'The Repeated Drafting Error', 'The Model Update', 'The Client Report Error', 'The Deadline Draft']
};
PACKS.forEach(p => check(p + ': case titles follow the D.7.2 catalog', JSON.stringify((catalog.cases[p] || []).filter(c => c.edition === '2015').sort((a, b) => a.type < b.type ? -1 : 1).map(c => c.title)) === JSON.stringify(titles[p])));

/* ---------- validator catches problems ---------- */
const ref = catalog.cases['discrete-manufacturing'].find(c => c.id === 'MFG-B-01');
const broken = JSON.parse(JSON.stringify(ref));
broken.evidence[0].clause = ''; broken.evidence = broken.evidence.filter(e => e.id !== 'E9' && e.id !== 'E8');
check('validator rejects a missing clause tag and missing red herrings', CB.validateCase(broken, { clauseIds: [...clauseIds] }).length >= 2);

/* ---------- content rules: tone, scope, copyright ---------- */
const banned = JSON.parse(read('tools/banned-phrases.json'));
const UNSAFE = /\b(\d+\s?mg|milligram|dosage|dose of|administer(ed|ing)? (the )?(drug|medication|medicine)|prescribe|diagnose|injection technique|lock-?out|tag-?out procedure|legal advice|you are legally|sue the|wear (a |the )?(respirator|harness))\b/i;
const caseText = c => JSON.stringify(c);
function textProblems(label, text) {
  const out = [];
  const lower = ' ' + text.toLowerCase().replace(/\s+/g, ' ') + ' ';
  banned.forEach(b => { const re = new RegExp('(^|[^a-z])' + b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').toLowerCase() + '($|[^a-z])'); if (re.test(lower)) out.push(label + ': banned phrase "' + b.trim() + '"'); });
  if (UNSAFE.test(text)) out.push(label + ': possible clinical, legal, or safety instruction "' + UNSAFE.exec(text)[0] + '"');
  if (/\bshall\b/i.test(text)) out.push(label + ': uses "shall" (requirement wording belongs to the standard)');
  return out;
}
let probs = [];
allCases.forEach(({ c }) => { probs = probs.concat(textProblems(c.id, caseText(c))); });
check('cases: no banned phrases, no clinical, legal, or safety instructions, no "shall" requirement wording', probs.length === 0, probs.slice(0, 6).join(' | '));
const dl = path.join(root, 'tools/iso-denylist.txt');
if (fs.existsSync(dl)) {
  const runs = fs.readFileSync(dl, 'utf8').split('\n').map(s => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)).filter(w => w.length >= 12);
  const hits = [];
  allCases.forEach(({ c }) => { const words = caseText(c).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).join(' '); runs.forEach(w => { for (let i = 0; i + 12 <= w.length; i++) if (words.includes(w.slice(i, i + 12).join(' '))) { hits.push(c.id); break; } }); });
  check('cases: no 12-word run from the ISO denylist', hits.length === 0, hits.join(', '));
}

/* ---------- seeded reproducibility (D.6.4) ---------- */
const seeds = [0, 1, 7, 42, 999, 31337, 65535, 1048575];
let repro = true, reproDevice = true, sizeOk = true, variety = true, codeRound = true;
const catalogCopy = JSON.parse(JSON.stringify(catalog)); // stands in for another device: data re-parsed from JSON
allCases.forEach(({ c, s }) => {
  const sel = new Set();
  seeds.forEach(seed => {
    const a = CB.generate(c, seed, s), b = CB.generate(c, seed, s);
    if (JSON.stringify(a) !== JSON.stringify(b)) repro = false;
    const viaCode = CB.buildFromCode(a.code.toLowerCase(), catalogCopy);
    if (!viaCode.gen || JSON.stringify(viaCode.gen) !== JSON.stringify(a)) reproDevice = false;
    const p = CB.parseCode(a.code);
    if (p.seed !== seed || CB.formatCode(p.pack, p.type, p.n, p.seed) !== a.code) codeRound = false;
    if (!(a.planted.length >= 4 && a.planted.length <= 5) || a.included.filter(id => a.evidence[id].kind === 'redHerring').length < 2) sizeOk = false;
    sel.add(a.included.join(',') + '|' + JSON.stringify(a.tokens));
  });
  if (sel.size < 3) variety = false;
});
check('the same seed always reproduces the same case', repro);
check('the same case code reproduces the same case from re-parsed data (any device)', reproDevice);
check('case codes parse and format symmetrically (<PACK>-<TYPE>-<SEED>)', codeRound);
check('every generated case plants 4 or 5 issues and at least two red herrings', sizeOk);
check('different seeds give a different mix of issues', variety);
check('case code tolerates O for 0 and lower case', CB.parseCode('mfg-b-7k3q').code === 'MFG-B-7K3Q' && CB.parseCode('MFG-B-OOOO').seed === 0);
check('invalid case codes are rejected with a message', !!CB.parseCode('MFG-Q-1234').error && !!CB.buildFromCode('ZZZ-A-1234', catalog).error);
check('casebook uses the same tested mulberry32 generator as Quality Flow', CB.mulberry32 === QF.mulberry32);

// Reference case D.7.1
const refSector = catalog.sectors.find(s => s.code === 'MFG');
const g0 = CB.buildFromCode('MFG-B-0000', catalog).gen;
check('MFG-B-0000 reproduces worked example D.7.1 (E1 to E10)', JSON.stringify(g0.included) === JSON.stringify(['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10']));
check('D.7.1 expected findings: 7.5.3, 7.1.5, 8.5.2, 8.7', JSON.stringify(g0.planted.map(id => g0.evidence[id].clauses[0])) === JSON.stringify(['7.5.3', '7.1.5', '8.5.2', '8.7']));
check('D.7.1 E3 and E4 unlock after E1; E7 supports E3', g0.evidence.E3.unlockedBy[0] === 'E1' && g0.evidence.E4.unlockedBy[0] === 'E1' && g0.evidence.E7.supports === 'E3');
check('D.7.1 batch number 4417 and pallet P-31 appear for seed 0000', g0.evidence.E5.text.indexOf('4417') >= 0 && g0.evidence.E5.text.indexOf('P-31') >= 0);

// Capstone
let capOk = true, capRepro = true;
catalog.sectors.forEach(s => {
  [3, 77, 4096].forEach(seed => {
    const code = CB.formatCode(s.code, 'X', 1, seed);
    const a = CB.buildFromCode(code, catalog).gen, b = CB.buildFromCode(code, catalogCopy).gen;
    if (JSON.stringify(a) !== JSON.stringify(b)) capRepro = false;
    const types = new Set(a.components.map(x => x.type));
    if (types.size < 3 || a.planted.length < 4 || !a.decisions.length || !a.actionOptions) capOk = false;
  });
});
check('capstone mixes at least three case types with issues, decisions, and an action plan', capOk);
check('capstone codes reproduce the same visit', capRepro);

/* ---------- play helpers ---------- */
function playAll(gen) {
  const v = CB.newVisit(gen);
  let guard = 0;
  while (!v.visitEnded && guard++ < 100) {
    const next = CB.availableActions(v).filter(x => !x.done)[0];
    if (!next) break;
    CB.act(v, next.action.key);
  }
  return v;
}
function perfect(gen, v) {
  v.collected.forEach(id => { const ev = gen.evidence[id]; CB.classify(v, id, ev.kind === 'nonconformity' ? 'nonconformity' : (ev.kind === 'observation' ? 'observation' : 'conforming'), ev.clauses[0]); });
  gen.planted.filter(id => v.collected.indexOf(id) >= 0 && gen.evidence[id].kind === 'nonconformity').forEach(id => {
    const ev = gen.evidence[id];
    const ref = (ev.text.match(/[A-Za-z]*[-\/]?\d[\w\-\/.]*/g) || ['x'])[0].replace(/[.]+$/, '');
    CB.addFinding(v, { clause: ev.clauses[0], evidence: [id], statement: 'The requirement for clause ' + ev.clauses[0] + ' was not met, as shown by record ' + ref + ' reviewed during the visit today.' });
  });
  if (gen.actionOptions) CB.ACTION_CATS.forEach(cat => CB.setActions(v, cat, gen.actionOptions[cat].filter(o => o.expected).map(o => o.key)));
  gen.decisions.forEach(d => CB.decide(v, d.id, d.bestIndex));
}

/* ---------- scoring formulas (D.6.3) on the reference case ---------- */
{
  const g = CB.buildFromCode('MFG-B-0000', catalog).gen;
  const v = CB.newVisit(g);
  v.points = 99; // allow every action for the formula test
  g.hotspots.forEach(h => h.actions.forEach(a => { if (CB.availableActions(v).some(x => x.action.key === a.key)) CB.act(v, a.key); }));
  CB.availableActions(v).filter(x => !x.done).forEach(x => CB.act(v, x.action.key));
  perfect(g, v);
  const s1 = CB.score(v);
  check('reference perfect run: coverage, precision, mapping, statement, action, decision all full', s1.coverage === 1 && s1.precision === 1 && s1.mapping === 1 && s1.statement === 4 && s1.action === 1 && s1.decision === 1, JSON.stringify([s1.coverage, s1.precision, s1.mapping, s1.statement, s1.action, s1.decision]));
  // A false finding on the corrected coolant record (E8) lowers precision: 4 valid of 5 submitted.
  CB.classify(v, 'E8', 'nonconformity', '7.5.3');
  CB.addFinding(v, { clause: '7.5.3', evidence: ['E8'], statement: 'The coolant log for machine 3 contains a corrected entry with a line through it and initials.' });
  const s2 = CB.score(v);
  check('a finding on conforming evidence lowers precision (4 of 5)', s2.precision === 0.8 && s2.coverage === 1, String(s2.precision));
  // Wrong clause link lowers mapping.
  CB.classify(v, 'E2', null, '9.2');
  const s3 = CB.score(v);
  check('a wrong clause link lowers mapping accuracy', s3.mapping < 1 && s3.mapping === Math.round(100 * (s3.correctLinks / s3.links)) / 100);
  // Observation on conforming evidence is a false item.
  CB.classify(v, 'E10', 'observation', '8.6');
  check('an observation recorded on conforming evidence counts as a false item', CB.score(v).falseItems.some(x => x.id === 'E10'));
  // Coverage formula: found / present.
  const v2 = CB.newVisit(g); v2.points = 99;
  CB.act(v2, 'H1-0'); CB.classify(v2, 'E5', 'nonconformity', '8.5.2');
  check('coverage is planted issues found divided by planted issues present (1 of 4)', CB.score(v2).coverage === 0.25);
  check('precision is not applicable when nothing is submitted', CB.score(CB.newVisit(g)).precision === null);
  // Statement rubric
  const rb = CB.statementRubric({ clause: '7.1.5', evidence: ['E4'], statement: 'Caliper CAL-12 was used to measure batch 4417 although its calibration was overdue by 11 days, so the results cannot be relied on.' }, g);
  const rbBad = CB.statementRubric({ clause: '8.4', evidence: ['E4'], statement: 'Sloppy work! They never check anything.' }, g);
  check('statement rubric gives 4 to a sound statement and 0 to a judgmental one', rb.total === 4 && rbBad.total === 0, rb.total + '/' + rbBad.total);
  // Action soundness: weak option halves the element.
  const v3 = CB.newVisit(g);
  CB.ACTION_CATS.forEach(cat => CB.setActions(v3, cat, g.actionOptions[cat].map(o => o.key)));
  check('mixing weak options scores action soundness at half', CB.score(v3).action === 0.5);
}

/* ---------- no hard fail; hints never reduce a score ---------- */
let noHardFail = true, hintsFree = true, debriefComplete = true, measuresAlways = true;
allCases.forEach(({ c, s }) => {
  [5, 1234].forEach(seed => {
    const g = CB.generate(c, seed, s);
    // Run out of visit points.
    const v = playAll(g);
    if (v.points !== 0 && CB.availableActions(v).some(x => !x.done)) noHardFail = false;
    if (!v.visitEnded && v.points === 0) noHardFail = false;
    const after = CB.act(v, (CB.availableActions(v).find(x => !x.done) || { action: { key: 'none' } }).action.key);
    if (after.ok) noHardFail = false; // refused gracefully, nothing thrown
    perfect(g, v);
    const before = JSON.stringify(CB.score(v), (k, val) => k === 'hintsUsed' ? undefined : val);
    for (let i = 0; i < 7; i++) CB.hint(v, {});
    const afterH = JSON.stringify(CB.score(v), (k, val) => k === 'hintsUsed' ? undefined : val);
    if (before !== afterH) hintsFree = false;
    CB.closeCase(v);
    const db = CB.debrief(v, {});
    const keys = ['coverage', 'precision', 'mapping', 'statement', 'action'];
    if (!keys.every(k => db.measures[k] && db.measures[k].text)) measuresAlways = false;
    if (db.expected.length !== g.planted.length || db.redHerrings.length < 2 || !db.marginNotes.length || !db.text.found || db.hints.length !== 7 || !CB.BRANCHES.every(b => b in db.branches)) debriefComplete = false;
    if (g.decisions.some(d => !db.decisions.find(x => x.id === d.id && x.rationale))) debriefComplete = false;
    // A visit with no actions at all still closes with a debrief.
    const empty = CB.newVisit(g); CB.closeCase(empty);
    const db2 = CB.debrief(empty, {});
    if (db2.measures.coverage.value !== 0 || db2.missed.length !== g.planted.length) noHardFail = false;
  });
});
check('no hard fail: running out of visit points ends the visit, work continues, and the case closes with a debrief', noHardFail);
check('hints never change any measure', hintsFree);
check('every debrief explains planted issues, red herrings, decisions, and margin notes, and logs hints', debriefComplete);
check('the five measures are shown after every case', measuresAlways);
{
  const g = CB.buildFromCode('MFG-B-0000', catalog).gen; const v = CB.newVisit(g);
  const h1 = CB.hint(v, { '8.5': 'Production and service provision' }), h2 = CB.hint(v, {}), h3 = CB.hint(v, {});
  check('hints escalate: area, then clause family, then the card to open', h1.level === 1 && /Area/.test(h1.text) && h2.level === 2 && /Clause family/.test(h2.text) && h3.level === 3 && /Next card/.test(h3.text));
}
// Skill map and recommendation
{
  const map = CB.skillMap([{ caseId: 'MFG-A-01', branches: { Evidence: 0.9, Mapping: 0.6, Cause: 0.2, Control: 0.5, Judgment: 1 } }]);
  check('skill map markers: Emerging, Competent, Strong', map.Cause.marker === 'Emerging' && map.Mapping.marker === 'Competent' && map.Evidence.marker === 'Strong');
  const rec = CB.recommendNext(map, ['MFG-A-01'], catalog.cases['discrete-manufacturing']);
  check('next case is suggested from the weakest branch', rec && rec.branch === 'Cause' && rec.caseId === 'MFG-C-01', JSON.stringify(rec));
}

/* ---------- results code ---------- */
{
  let ok = true;
  const rng = QF.mulberry32(99);
  for (let i = 0; i < 300; i++) {
    const r = (n) => Math.round(rng() * n);
    const m = { coverage: r(100) / 100, precision: i % 7 === 0 ? null : r(100) / 100, mapping: i % 5 === 0 ? null : r(100) / 100, statement: i % 3 === 0 ? null : r(40) / 10, action: r(100) / 100, decision: i % 4 === 0 ? null : r(100) / 100 };
    const code = CB.formatCode(['MFG', 'FOD', 'ITS', 'HCS'][i % 4], 'ABCDEFX'[i % 7], 1, r(1048575));
    const learner = i % 2 ? 'Learner ' + i : '';
    const date = new Date(2026, i % 12, 1 + (i % 28));
    const enc = CB.encodeResult({ code, measures: m, date, foundMask: r(31), plantedCount: 5, learner });
    const d = CB.decodeResult(enc);
    if (d.error || d.code !== code || d.learner !== learner || d.date !== date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')) { ok = false; break; }
    if (Object.keys(m).some(k => d.measures[k] !== m[k])) { ok = false; break; }
  }
  check('results codes round-trip: case code, five measures, decision, date, learner label', ok);
  const good = CB.encodeResult({ code: 'MFG-B-7K3Q', measures: { coverage: 0.75, precision: 1, mapping: 0.8, statement: 3.5, action: 0.6, decision: 1 }, date: new Date(2026, 9, 4), foundMask: 7, plantedCount: 4 });
  const tampered = good.replace(/\.(\w)(\w)/, (m, a, b) => '.' + a + (b === '9' ? '8' : '9'));
  check('a mistyped or altered results code is rejected', !!CB.decodeResult(tampered).error && !!CB.decodeResult('nonsense').error);
}

/* ---------- 2026 Type F variants (Appendix D.7.2; Section 0.1) ---------- */
const CAUTION = 'CAUTION: PRELIMINARY 2026 INFORMATION. This section describes the 2026 edition of ISO 9001 using the best available secondary commentary and informed estimates. It has not been verified against the published standard and may contain errors, omissions, or incorrect clause references. Do not use it as a substitute for the standard in audit preparation, certification decisions, procedure revisions, or training records. Always consult the published ISO 9001:2026 text and your certification body.';
const clauseMapRows = {}; JSON.parse(read('data/clause-map.json')).clauses.forEach(c => { clauseMapRows[c.id] = c; });
check('the catalog carries the exact Section 0.1 caution', catalog.caution2026 === CAUTION);
cases26.forEach(({ c, s }) => {
  const base = catalog.cases[s.pack].find(x => x.id === c.variantOf);
  check(c.id + ': title names the 2015 case it varies', base && c.title.indexOf(base.title) === 0, c.title);
  check(c.id + ': centered on quality culture and speaking up (5.1.1 and 7.3 issues, two decisions)', c.evidence.some(e => e.plantedPool && /\b5\.1\.1\b/.test(e.clause)) && c.evidence.some(e => e.plantedPool && /\b7\.3\b/.test(e.clause)) && c.decisions.length >= 2);
  const stmts = c.evidence.map(e => ['card ' + e.id, e]).concat(c.decisions.map(d => ['decision ' + d.id, d]), (c.bridge2026 || []).map((b, i) => ['bridge ' + i, b]));
  const unlabeled = stmts.filter(([, o]) => CB.CONFIDENCE.indexOf(o.confidence) < 0).map(x => x[0]);
  check(c.id + ': every 2026 statement (card, decision, bridge note) carries a confidence label', unlabeled.length === 0, unlabeled.join(', '));
  const be = stmts.filter(([, o]) => o.confidence === 'Best estimate');
  check(c.id + ': every best estimate states its reasoning and what to check', be.length >= 1 && be.every(([, o]) => o.reasoning && o.check));
  const mism = c.evidence.filter(e => !e.clause.split(/,\s*/).some(cl => clauseMapRows[cl] && clauseMapRows[cl].confidence.indexOf(e.confidence) >= 0)).map(e => e.id + ' ' + e.clause + ' ' + e.confidence);
  check(c.id + ': card confidence labels agree with the clause map for the cards\' clauses', mism.length === 0, mism.join(' | '));
  check(c.id + ': bridge notes use clause tags from the clause map and paraphrase (no quotation marks)', c.bridge2026.length >= 3 && c.bridge2026.every(b => b.clause.split(/,\s*/).every(x => clauseIds.has(x)) && !/["\u201c\u201d]/.test(b.text)));
  check(c.id + ': no lettered Clause 5 sub-items and no "shall"', !CB.LETTERED_CLAUSE5.test(JSON.stringify(c)) && !/\bshall\b/i.test(JSON.stringify(c)));
  check(c.id + ': brief states that the variant is preliminary and excluded from badge scoring', /preliminary/.test(c.brief) && /excluded from badge scoring/.test(c.brief));
  const g = CB.generate(c, 77, s);
  check(c.id + ': generated case keeps edition 2026, bridge notes, and confidence on every card and decision', g.edition === '2026' && g.bridge2026.length === c.bridge2026.length && g.included.every(id => g.evidence[id].confidence) && g.decisions.every(d => d.confidence));
  check(c.id + ': case code carries the variant number (<CODE>-F2-<SEED>)', g.code === s.code + '-F2-' + CB.seedText(77) && CB.buildFromCode(g.code, catalog).gen.id === c.id);
});
check('lettered Clause 5 pattern detects "5.1.1 a)" and "5.3(b)"', CB.LETTERED_CLAUSE5.test('see 5.1.1 a)') && CB.LETTERED_CLAUSE5.test('5.3(b)') && !CB.LETTERED_CLAUSE5.test('5.1.1 and 7.3'));
{
  const v = JSON.parse(JSON.stringify(cases26[0].c));
  delete v.evidence[0].confidence; v.decisions[0].confidence = 'Probably'; v.bridge2026[3].reasoning = '';
  const errs = CB.validateCase(v, { clauseIds: [...clauseIds] });
  check('validator rejects a 2026 variant with a missing or unknown confidence label, or a best estimate without reasoning', errs.some(e => /E1 needs a confidence/.test(e)) && errs.some(e => /decision D1 needs a confidence/.test(e)) && errs.some(e => /best estimate/.test(e)), errs.join(' | '));
  const v2 = JSON.parse(JSON.stringify(cases26[0].c)); v2.bridge2026[0].text += ' See 5.1.1 a) for detail.';
  check('validator rejects a lettered Clause 5 citation', CB.validateCase(v2, { clauseIds: [...clauseIds] }).some(e => /lettered/.test(e)));
  const core = JSON.parse(JSON.stringify(coreCases[0].c)); core.bridge2026 = cases26[0].c.bridge2026;
  check('validator keeps 2026 content out of core cases', CB.validateCase(core, { clauseIds: [...clauseIds] }).some(e => /2015 case must not carry/.test(e)));
}
{
  let noVariant = true;
  catalog.sectors.forEach(s => { for (let seed = 1; seed < 400; seed += 7) { const g = CB.generateCapstone(catalog.cases[s.pack], seed, s); if (g.components.some(x => /-F-02$/.test(x.id)) || g.edition !== '2015') noVariant = false; } });
  check('2026 variants are never used in a capstone', noVariant);
}
{
  const tpl = read('games/casebook/template.html');
  check('badge counts only 2015 attempts and 2015 cases', /a\.edition !== '2026'/.test(/function badgeStatus[\s\S]*?\n}/.exec(tpl)[0]) && /c\.edition === '2015'/.test(/function badgeStatus[\s\S]*?\n}/.exec(tpl)[0]));
  check('skill map, recommendation, and Compare use only core cases and attempts', /CB\.skillMap\(attempts2015\(pack\)\)/.test(tpl) && /CB\.skillMap\(attempts2015\(g\.pack\)\)/.test(tpl) && /function issuesFor[\s\S]*?cases2015\(pack\)/.test(tpl));
  check('the caution box is drawn on every screen that shows 2026 content (track section, case folder, Case Room, debrief exports)', /cs26\.length[\s\S]{0,200}cautionBox\(\)/.test(tpl) && /var h = g\.edition === '2026' \? cautionBox\(\)/.test(tpl) && /R\.gen\.edition === '2026'\) \? cautionBox\(\)/.test(tpl) && /DATA\.caution2026, '2026 variant/.test(tpl));
  check('the old paraphrased caution has been replaced by the exact caution', tpl.indexOf('This case reflects unverified commentary') < 0 && /DATA\.caution2026/.test(/function cautionBox[\s\S]*?\n}/.exec(tpl)[0]));
  const rrt = read('games/casebook/results-reader.template.html');
  check('the Results Reader marks 2026 rows and shows the caution above them', /has26 \? cautionBox\(\)/.test(rrt) && /2026 variant/.test(rrt));
}

/* ---------- placement check (Appendix D.1) ---------- */
{
  const pl = catalog.placement;
  check('placement check: eight items, valid answers, clause tags in the clause map, core module numbers', pl && pl.items.length === 8 && pl.items.every(it => it.options.length === 4 && it.answer >= 0 && it.answer < 4 && it.clause.split(/,\s*/).every(x => clauseIds.has(x)) && it.module >= 0 && it.module <= 12 && it.moduleTitle && it.rationale));
  check('placement check: pass mark 80 percent and a stated pass rule', pl.meta.passMark === 80 && /80 percent/.test(pl.meta.passRule) && /7 of 8/.test(pl.meta.passRule));
  const pos = [0, 0, 0, 0]; pl.items.forEach(it => pos[it.answer]++);
  check('placement check: answer positions are spread', Math.max.apply(null, pos) <= 3, pos.join('/'));
  check('placement check: covers at least six different core modules', new Set(pl.items.map(it => it.module)).size >= 6);
  const tp = textProblems('placement.json', JSON.stringify(pl));
  check('placement check: no banned phrases, unsafe instructions, "shall", or 2026 content', tp.length === 0 && !/2026/.test(JSON.stringify(pl.items)) && !CB.LETTERED_CLAUSE5.test(JSON.stringify(pl)), tp.join(' | '));
  const errs = []; const { loadPlacement } = require('../tools/build-casebook.js');
  check('placement loader reports no problems', loadPlacement([...clauseIds], errs) && errs.length === 0, errs.join(' | '));
  // Pass rule
  check('pass rule: 7 of 8 meets an 80 percent pass mark; 6 of 8 does not', CB.placementPassed(7, 8, 80) && !CB.placementPassed(6, 8, 80) && CB.placementNeeded(8, 80) === 7);
  check('pass rule follows the configured pass mark (75 percent needs 6 of 8; 100 percent needs 8)', CB.placementPassed(6, 8, 75) && !CB.placementPassed(7, 8, 100) && CB.placementNeeded(8, 75) === 6 && CB.placementNeeded(8, 100) === 8);
  // Sessions are seeded
  const a = CB.placementSession(pl.items, 1234), b = CB.placementSession(pl.items, 1234), c = CB.placementSession(pl.items, 4321);
  check('the same placement seed gives the same question and option order', JSON.stringify([a.order, a.optOrder]) === JSON.stringify([b.order, b.optOrder]) && a.code === 'PLC-P-' + CB.seedText(1234));
  check('a different placement seed gives a different order', JSON.stringify([a.order, a.optOrder]) !== JSON.stringify([c.order, c.optOrder]));
  check('every question appears once and every option order is a permutation', a.order.slice().sort().join() === '0,1,2,3,4,5,6,7' && Object.keys(a.optOrder).every(k => a.optOrder[k].slice().sort().join() === '0,1,2,3'));
  // Scoring
  pl.items.forEach((it, i) => CB.placementAnswer(a, i, it.answer));
  const full = CB.placementScore(a, pl.meta.passMark);
  check('all correct: 8 of 8, passed, nothing to review', full.correct === 8 && full.passed && full.modulesToReview.length === 0 && full.missedMask === 0);
  CB.placementAnswer(a, 0, (pl.items[0].answer + 1) % 4);
  const seven = CB.placementScore(a, pl.meta.passMark);
  check('one wrong: 7 of 8 passes and names the module to review', seven.correct === 7 && seven.passed && seven.modulesToReview.join() === String(pl.items[0].module) && seven.missedMask === 1);
  CB.placementAnswer(a, 7, (pl.items[7].answer + 1) % 4);
  const six = CB.placementScore(a, pl.meta.passMark);
  check('two wrong: 6 of 8 is below the pass mark and advises review of both modules', six.correct === 6 && !six.passed && six.modulesToReview.length === new Set([pl.items[0].module, pl.items[7].module]).size);
  const none = CB.placementScore(CB.placementSession(pl.items, 9), pl.meta.passMark);
  check('an unanswered check scores 0 and advises review (never blocks)', none.correct === 0 && !none.passed && none.answered === 0);
  // Results code
  let ok = true;
  const rng = QF.mulberry32(5);
  for (let i = 0; i < 200; i++) {
    const correct = Math.floor(rng() * 9), mask = Math.floor(rng() * 256), seed = 1 + Math.floor(rng() * 1048574), pm = [60, 75, 80, 100][i % 4];
    const date = new Date(2026, i % 12, 1 + (i % 28)); const learner = i % 3 ? 'L' + i : '';
    const code = CB.encodePlacement({ seed, correct, total: 8, passMark: pm, missedMask: mask, date, learner });
    const d = CB.decodeResult(code);
    if (d.error || !d.placement || d.correct !== correct || d.total !== 8 || d.passMark !== pm || d.missedMask !== mask || d.learner !== learner || d.passed !== CB.placementPassed(correct, 8, pm) || d.code !== 'PLC-P-' + CB.seedText(seed)) { ok = false; break; }
    if (d.date !== date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')) { ok = false; break; }
  }
  check('placement results codes round-trip: score, pass mark, outcome, missed items, date, learner', ok);
  const pc = CB.encodePlacement({ seed: 1234, correct: 7, total: 8, passMark: 80, missedMask: 1, date: new Date(2026, 9, 4) });
  check('a mistyped placement code is rejected', !!CB.decodeResult(pc.replace(/\.(\w)(\w)/, (m, x, y) => '.' + x + (y === '7' ? '6' : '7'))).error);
  check('a placement code is recognized but is not opened as a case', CB.parseCode('PLC-P-16J0').type === 'P' && CB.buildFromCode('PLC-P-16J0', catalog).placement === true);
  check('case results codes still decode alongside placement codes', !CB.decodeResult(CB.encodeResult({ code: 'MFG-F2-16J0', measures: { coverage: 1, precision: 1, mapping: 1, statement: 4, action: 1, decision: 1 }, date: new Date(), foundMask: 3, plantedCount: 4 })).error);
  const tpl = read('games/casebook/template.html');
  check('the case shelf offers the placement check as optional and advisory, with skip', /placementSheet\(\)/.test(tpl) && /nothing is locked/.test(tpl) && /Skip the check/.test(tpl) && /PL\.meta\.passRule/.test(tpl));
  check('the track record export includes the placement result', /PLACEMENT CHECK \(optional; advice only\)/.test(tpl));
}

/* ---------- built pages ---------- */
const built = exists('games/casebook/index.html') && exists('games/casebook/results-reader.html');
check('both pages are built', built);
if (built) {
  const idx = read('games/casebook/index.html'), rr = read('games/casebook/results-reader.html');
  const dataBlock = s => /<script type="application\/json" id="cb-data">([\s\S]*?)<\/script>/.exec(s)[1];
  check('embedded data escapes "<" so it cannot end the script block', dataBlock(idx).indexOf('<') < 0 && dataBlock(rr).indexOf('<') < 0);
  check('pages have no external resources or network calls', [idx, rr].every(s => !/(src|href)=["']https?:/i.test(s) && !/fetch\(|XMLHttpRequest|@import|url\(\s*["']?https?:/i.test(s)));
  check('pages carry the copyright notice', [idx, rr].every(s => s.indexOf('This material is an original training aid. It is not a substitute for the standard. Obtain ISO 9001 from ISO or a national standards body.') >= 0));
  // The Results Reader's own embedded engine decodes a code produced by the Casebook.
  const engineSrc = /<script>\s*(var CB_MULBERRY32[\s\S]*?)<\/script>/.exec(rr)[1];
  const ctx = {}; vm.createContext(ctx); vm.runInContext(engineSrc + ';this.CB = CB;', ctx);
  const code = CB.encodeResult({ code: 'ITS-B-2M9Q', measures: { coverage: 0.8, precision: 0.5, mapping: 1, statement: 2.5, action: 0.7, decision: 0 }, date: new Date(2026, 9, 4), foundMask: 5, plantedCount: 5, learner: 'A. Example' });
  const dd = ctx.CB.decodeResult(code);
  check('codes decode in the Results Reader page engine', !dd.error && dd.measures.statement === 2.5 && dd.learner === 'A. Example');
  const rdata = JSON.parse(dataBlock(rr));
  check('the Results Reader can rebuild the case from a code for the tally', !!ctx.CB.buildFromCode('ITS-B-2M9Q', rdata).gen);
  check('the Results Reader rebuilds a 2026 variant case and knows its edition', ctx.CB.buildFromCode('ITS-F2-2M9Q', rdata).gen.edition === '2026');
  const pdd = ctx.CB.decodeResult(CB.encodePlacement({ seed: 77, correct: 6, total: 8, passMark: 80, missedMask: 129, date: new Date(2026, 9, 4), learner: 'B. Example' }));
  check('placement codes decode in the Results Reader page engine with the pass rule applied', pdd.placement && pdd.correct === 6 && pdd.passed === false && pdd.learner === 'B. Example');
  check('both pages embed the exact Section 0.1 caution and the placement items', JSON.parse(dataBlock(idx)).caution2026 === CAUTION && rdata.caution2026 === CAUTION && rdata.placement.items.length === 8);
  check('the Results Reader describes codes as a training aid, not an assessment record', /training aid, not an assessment record/.test(rr) && /instructor/.test(rr));
  check('the badge requires instructor review (page text)', /recorded only after an instructor reviews/i.test(idx) && /No score decides the badge on its own|No measure decides the badge on its own/.test(idx + rr));

  /* ---------- distinct from the TOC game and Quality Flow (D.2) ---------- */
  const qf = read('games/quality-flow/template.html');
  const qfColors = (qf.match(/#[0-9a-fA-F]{6}\b/g) || []).map(x => x.toLowerCase());
  const cbTemplate = read('games/casebook/template.html') + read('games/casebook/results-reader.template.html');
  const shared = [...new Set(qfColors)].filter(c => cbTemplate.toLowerCase().indexOf(c) >= 0 && c !== '#ffffff' && c !== '#000000');
  check('no Quality Flow palette colors are reused', shared.length === 0, shared.join(', '));
  check('no Quality Flow layout classes are reused', !/class="[^"]*\b(board|stage|kpi|shop|event|ctl)\b/.test(cbTemplate));
  check('no factory or Quality Flow vocabulary in the interface', !/Quality Flow|\bQP\b|Team view|work items released|constraint stage/i.test(cbTemplate));
  check('no "game over" or "you failed" scoring language', !/game over|you failed|you lose|\bfailed the case/i.test(cbTemplate));
  check('casebook vocabulary is used: visit, evidence, Notebook, finding, margin notes', ['visit', 'evidence', 'Notebook', 'finding', 'Margin notes', 'Inspector'].every(w => cbTemplate.indexOf(w) >= 0));
  check('the five folder tabs exist: Brief, Site, Notebook, Findings, Debrief', ['brief', 'site', 'notebook', 'findings', 'debrief'].every(t => cbTemplate.indexOf("['" + t + "'") >= 0));
  check('reduced-motion and dark mode are supported', /prefers-reduced-motion/.test(cbTemplate) && /prefers-color-scheme:dark/.test(cbTemplate) && /data-theme="dark"/.test(cbTemplate));
  check('the Casebook is not described as part of a series', !/\b(series|sequel|level \d|episode)\b/i.test(cbTemplate));

  /* ---------- contrast (4.5 to 1) ---------- */
  const lum = hex => { const v = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const tmpl = read('games/casebook/template.html');
  const tokens = block => { const o = {}; (block.match(/--[\w-]+:#[0-9a-fA-F]{6}/g) || []).forEach(t => { const [k, v] = t.split(':'); o[k] = v; }); return o; };
  const light = tokens(/:root\{([\s\S]*?)\}/.exec(tmpl)[1]);
  const dark = tokens(/:root\[data-theme="dark"\]\{([\s\S]*?)\}/.exec(tmpl)[1]);
  const low = [];
  [['light', light], ['dark', dark]].forEach(([name, t]) => ['--ink', '--ink-soft', '--stamp'].forEach(fg => ['--paper', '--sheet', '--paper-2', '--hl'].forEach(bg => { const r = ratio(t[fg], t[bg]); if (r < 4.5) low.push(name + ' ' + fg + ' on ' + bg + ' ' + r.toFixed(2)); })));
  catalog.sectors.forEach(s => {
    [light['--paper'], light['--sheet'], light['--paper-2']].forEach(bg => { const r = ratio(s.accent.light, bg); if (r < 4.5) low.push(s.code + ' accent light ' + r.toFixed(2)); });
    [dark['--paper'], dark['--sheet'], dark['--paper-2']].forEach(bg => { const r = ratio(s.accent.dark, bg); if (r < 4.5) low.push(s.code + ' accent dark ' + r.toFixed(2)); });
  });
  check('text, stamp, and every sector accent color meet 4.5 to 1 in light and dark', low.length === 0, low.join(', '));
}

/* ---------- sector track content ---------- */
const COPY = 'This material is an original training aid. It is not a substitute for the standard. Obtain ISO 9001 from ISO or a national standards body.';
PACKS.forEach(p => {
  const pf = 'content/sector-tracks/' + p + '/primer.md', df = 'content/sector-tracks/' + p + '/drills.md';
  check(p + ': primer.md and drills.md exist', exists(pf) && exists(df));
  if (!exists(pf) || !exists(df)) return;
  const pr = read(pf), dr = read(df);
  const sections = ['## 1. The sector at a glance', '## 2. Where the clauses show up', '## 3. Records an auditor typically asks for', '## 4. Typical nonconformities and their usual causes', '## 5. Sector specifics', '## 6. Sector vocabulary', '## 7. Sector schemes and local rules', '## 8. Further reading', '## 9. Check your understanding'];
  const missing = sections.filter(h => pr.indexOf(h) < 0);
  check(p + ': primer has the nine required sections', missing.length === 0, missing.join('; '));
  check(p + ': primer carries the copyright notice, unverified status, [VERIFY] and [OWNER INPUT] markers', pr.indexOf(COPY) >= 0 && /verifyStatus2015: unverified/.test(pr) && /\[VERIFY\]/.test(pr) && /\[OWNER INPUT\]/.test(pr));
  const sect = (h) => { const i = pr.indexOf(h); const j = pr.indexOf('\n## ', i + 1); return pr.slice(i, j < 0 ? undefined : j); };
  const rows = s => s.split('\n').filter(l => /^\|/.test(l) && !/^\|\s*:?-{2,}/.test(l)).length - 1;
  check(p + ': primer lists at least ten typical nonconformities', rows(sect(sections[3])) >= 10, String(rows(sect(sections[3]))));
  check(p + ': primer glossary has at least 20 terms', rows(sect(sections[5])) >= 20, String(rows(sect(sections[5]))));
  check(p + ': primer clause table covers clauses 4 to 10', ['4', '5', '6', '7', '8', '9', '10'].every(n => new RegExp('^\\|\\s*' + n + '(\\.|\\s)', 'm').test(sect(sections[1]))));
  check(p + ': primer has five check-your-understanding questions', (sect(sections[8]).match(/^\d\.\s/gm) || []).length >= 5);
  const items = parseDrills(dr, df, []);
  const mc = items.filter(i => i.kind !== 'sort'), tr = items.filter(i => i.kind === 'translate'), so = items.filter(i => i.kind === 'sort');
  check(p + ': drills have at least 24 items including Translate items', mc.length >= 24 && tr.length >= 4, mc.length + ' items, ' + tr.length + ' translate');
  check(p + ': drills have a 10-situation scenario sort with both answers', so.length === 10 && so.some(i => i.answer === 0) && so.some(i => i.answer === 1));
  const pos = [0, 0, 0, 0]; mc.forEach(i => pos[i.answer]++);
  check(p + ': drill answer positions are spread (none above 40 percent)', Math.max.apply(null, pos) / mc.length <= 0.4, pos.join('/'));
  check(p + ': drill clause tags are in the clause map', items.every(i => i.clause.split(/[,;]\s*/).every(x => clauseIds.has(x.trim()))), items.filter(i => !i.clause.split(/[,;]\s*/).every(x => clauseIds.has(x.trim()))).map(i => i.id + ':' + i.clause).join(' '));
  const tp = textProblems(pf, pr).concat(textProblems(df, dr));
  check(p + ': primer and drills: no banned phrases, no clinical, legal, or safety instructions', tp.length === 0, tp.join(' | '));
  check(p + ': drills carry the copyright notice', dr.indexOf(COPY) >= 0);
});
const ig = 'content/instructor-guide/07-sector-deep-dive.md';
check('instructor guide chapter 07 exists', exists(ig));
if (exists(ig)) {
  const t = read(ig);
  check('instructor chapter covers Case Room facilitation, rubrics, results codes, and badge review', ['Case Room', 'rubric', 'Results Reader', 'badge', 'Sector Practitioner', '60 minutes'].every(w => t.toLowerCase().indexOf(w.toLowerCase()) >= 0));
  const tp = textProblems(ig, t);
  check('instructor chapter: no banned phrases or unsafe instructions', tp.length === 0, tp.join(' | '));
  check('instructor chapter explains the placement check, its pass rule, codes, and Results Reader display', /## 1a\. Placement check/.test(t) && /7 of 8/.test(t) && /PLC-P-/.test(t) && /Placement checks/.test(t));
  const sec26 = (/## 2a\. 2026 variant cases[\s\S]*?\n## /.exec(t) || [''])[0];
  check('instructor chapter 2026 section opens with the exact Section 0.1 caution and covers confidence labels and badge exclusion', sec26.replace(/\s+/g, ' ').replace(/[>*]/g, '').indexOf(CAUTION) >= 0 && /^## 2a[^\n]*\n\n> \*\*CAUTION/.test(sec26) && /Confidence labels/.test(sec26) && /Excluded from the badge and the capstone/.test(sec26));
  const ex = /PLC-P-[0-9A-Z]{4}\.[0-9A-Z]{10}\.[0-9A-Z]{2} ~ [^`]+/.exec(t);
  check('the example placement code in the chapter decodes', ex && !CB.decodeResult(ex[0]).error);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed' + (failed ? '' : '. All casebook tests passed.'));
process.exit(failed ? 1 : 0);
