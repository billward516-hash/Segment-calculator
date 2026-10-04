'use strict';
// Run: node tests/schema-tests.js
const fs = require('fs');
const path = require('path');
const read = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', f), 'utf8'));
let failed = 0;
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (!ok && detail ? '  ' + detail : '')); if (!ok) failed++; };

// Question bank
const qs = read('questions.json');
const ids = new Set(qs.map(q => q.id));
check('question ids are unique', ids.size === qs.length);
check('at least 120 questions', qs.length >= 120, 'found ' + qs.length);
check('at least 40 scenario questions', qs.filter(q => q.type === 'scenario').length >= 40);
const bad = [];
qs.forEach(q => {
  if (typeof q.stem !== 'string' || !q.stem) bad.push(q.id + ' stem');
  if (!Array.isArray(q.options) || q.options.length !== 4 || new Set(q.options).size !== 4) bad.push(q.id + ' options');
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) bad.push(q.id + ' answer');
  if (!q.rationale) bad.push(q.id + ' rationale');
  if (!q.clause) bad.push(q.id + ' clause');
  if (!Array.isArray(q.roles) || !q.roles.length || q.roles.some(r => !['operator', 'technician', 'supervisor'].includes(r))) bad.push(q.id + ' roles');
  if (![1, 2, 3].includes(q.difficulty)) bad.push(q.id + ' difficulty');
  if (!Number.isInteger(q.module) || q.module < 0 || q.module > 10) bad.push(q.id + ' module');
  if (!['knowledge', 'scenario'].includes(q.type)) bad.push(q.id + ' type');
  if (!q.sector) bad.push(q.id + ' sector');
});
check('every question matches the schema', bad.length === 0, bad.slice(0, 8).join(', '));
const pos = [0, 0, 0, 0]; qs.forEach(q => pos[q.answer]++);
check('correct answers are spread across positions (none above 40%)', Math.max.apply(null, pos) / qs.length <= 0.4, pos.join('/'));
['operator', 'technician', 'supervisor'].forEach(r => check('at least 30 questions for ' + r, qs.filter(q => q.roles.includes(r)).length >= 30));
const clauses = new Set(); qs.forEach(q => String(q.clause).split(/[,;]/).forEach(c => clauses.add(c.trim().split('.')[0])));
check('questions cover clauses 4 to 10', ['4', '5', '6', '7', '8', '9', '10'].every(c => clauses.has(c)));

// Packs
const packs = read('packs.json');
packs.forEach(p => {
  const ok = p.id && p.company && /^Meridian/.test(p.company) && Array.isArray(p.term) && p.term.length === 2 && Array.isArray(p.stages) && p.stages.length === 6;
  check('pack ' + p.id + ' structure', !!ok);
  if (p.id !== 'generic') check('pack ' + p.id + ' event skins', ['E01', 'E02', 'E04', 'E05', 'E07', 'E08'].every(k => p.skins && p.skins[k]));
});

// Controls and events
const controls = read('controls.json'), events = read('events.json');
check('controls have id, name, clause, cost, effect', controls.every(c => c.id && c.name && c.clause && c.cost > 0 && c.effect));
check('events have id, text, mitigatedBy, impact', events.every(e => e.id && e.text && e.mitigatedBy.length && e.impact));

// Clause map
const cm = read('clause-map.json');
check('clause map has caution and confidence key', cm.meta && cm.meta.caution && cm.meta.confidenceKey.length === 5);
check('every clause map row has the required fields', cm.clauses.every(c => c.id && c.title2015 && c.ref2026 && c.confidence && c.verifyStatus && Array.isArray(c.modules)));
check('no 2026 row is marked verified without review', cm.clauses.every(c => c.verifyStatus === 'unverified'));
check('clause map covers every control clause', controls.every(c => String(c.clause).split(/,\s*/).every(id => cm.clauses.some(x => x.id === id.trim() || x.id.startsWith(id.trim() + '.')))));

console.log(failed ? '\n' + failed + ' test(s) failed' : '\nAll schema tests passed');
process.exit(failed ? 1 : 0);
