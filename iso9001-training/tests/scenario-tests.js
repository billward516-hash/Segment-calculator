'use strict';
// Scenario library schema tests (spec Section 11.1, 11.2 and Appendix B.2).
// Run: node tests/scenario-tests.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
let failed = 0;
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (!ok && detail ? '  ' + detail : '')); if (!ok) failed++; };

const sc = read('data/scenarios.json');
const packs = read('data/packs.json');
const clauseMap = read('data/clause-map.json');
const valid = new Set(clauseMap.clauses.map(c => c.id));
const packIds = new Set(packs.map(p => p.id));
const TYPES = ['major', 'minor', 'observation', 'conforming'];
const ROLES = ['operator', 'technician', 'supervisor'];
const banned = JSON.parse(fs.readFileSync(path.join(root, 'tools/banned-phrases.json'), 'utf8'));

check('scenarios.json is an array', Array.isArray(sc));
const ids = sc.map(s => s.id);
check('scenario ids are unique', new Set(ids).size === ids.length);
check('scenario ids look like S000', ids.every(id => /^S\d{3}$/.test(id)));

const generic = sc.filter(s => s.pack === 'generic');
check('at least 40 generic scenarios', generic.length >= 40, 'found ' + generic.length);
const seeds = []; for (let i = 1; i <= 20; i++) seeds.push('S' + String(i).padStart(3, '0'));
check('seed scenarios S001 to S020 are present and generic', seeds.every(id => generic.some(s => s.id === id)));
const appB = [201, 211, 221, 231, 241, 251, 261, 271].reduce((a, b) => a.concat([0, 1, 2, 3, 4].map(k => 'S' + (b + k))), []);
check('pack scenarios S201 to S275 from Appendix B.2 are present', appB.every(id => ids.includes(id)), appB.filter(id => !ids.includes(id)).join(', '));

const bad = [];
const sentences = t => (t.match(/[.!?](\s|$)/g) || []).length;
sc.forEach(s => {
  ['id', 'title', 'setting', 'narrative', 'expected_action', 'pack', 'clause'].forEach(k => { if (typeof s[k] !== 'string' || !s[k].trim()) bad.push(s.id + ' ' + k); });
  if (typeof s.narrative === 'string') { const n = sentences(s.narrative); if (n < 2 || n > 4) bad.push(s.id + ' narrative has ' + n + ' sentences'); }
  if (!Array.isArray(s.evidence) || s.evidence.length < 2 || s.evidence.some(e => typeof e !== 'string' || !e)) bad.push(s.id + ' evidence');
  if (!TYPES.includes(s.finding_type)) bad.push(s.id + ' finding_type');
  if (!Array.isArray(s.roles) || !s.roles.length || s.roles.some(r => !ROLES.includes(r))) bad.push(s.id + ' roles');
  if (!packIds.has(s.pack)) bad.push(s.id + ' pack ' + s.pack);
  String(s.clause || '').split(',').forEach(c => { if (!valid.has(c.trim())) bad.push(s.id + ' clause ' + c.trim()); });
  if (s.variant_of && !sc.some(g => g.id === s.variant_of && g.pack === 'generic')) bad.push(s.id + ' variant_of');
  if (s.pack !== 'generic' && !/Meridian/.test(s.narrative)) bad.push(s.id + ' pack narrative names no Meridian company');
  const lower = ' ' + [s.title, s.narrative, s.expected_action].concat(s.evidence || []).join(' ').toLowerCase() + ' ';
  banned.forEach(b => {
    const re = new RegExp('(^|[^a-z])' + b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').toLowerCase() + '($|[^a-z])');
    if (re.test(lower)) bad.push(s.id + ' banned phrase "' + b.trim() + '"');
  });
});
check('every scenario matches schema 11.1 (fields, 2 to 4 sentence narrative, evidence, type, roles, clauses)', bad.length === 0, bad.slice(0, 10).join('; '));

const share = list => list.filter(s => s.finding_type === 'conforming').length / list.length;
check('conforming share of all scenarios is 15 to 30 percent', share(sc) >= 0.15 && share(sc) <= 0.30, (share(sc) * 100).toFixed(1) + '%');
check('conforming share of generic scenarios is 15 to 30 percent', share(generic) >= 0.15 && share(generic) <= 0.30, (share(generic) * 100).toFixed(1) + '%');
check('conforming scenarios have no finding wording that suggests a nonconformity', sc.filter(s => s.finding_type === 'conforming').every(s => !/raise a (major|minor)/i.test(s.expected_action)));

packs.forEach(p => {
  const list = sc.filter(s => s.pack === p.id);
  check('pack ' + p.id + ' has at least 5 scenarios including one conforming', list.length >= 5 && list.some(s => s.finding_type === 'conforming'), list.length + ' found');
  if (p.id !== 'generic') check('pack ' + p.id + ' scenarios name the pack company (' + p.company + ')', list.every(s => s.narrative.includes(p.company)));
});

// The Audit Day dossier plants these clauses; each must be backed by a generic scenario.
['7.5.3', '7.1.5', '7.2', '8.6', '10.2', '8.4', '9.2'].forEach(c => check('a generic nonconforming scenario backs dossier clause ' + c, generic.some(s => s.finding_type !== 'conforming' && s.clause.split(',').map(x => x.trim()).includes(c))));

// Text hygiene: no lettered Clause 5 citations and no real-company placeholders.
check('no lettered clause sub-items cited', sc.every(s => !/\b\d+\.\d+(\.\d+)?\s*\(?[a-h]\)/.test(s.expected_action + s.narrative)));

console.log(failed ? '\n' + failed + ' test(s) failed' : '\nAll scenario tests passed');
process.exit(failed ? 1 : 0);
