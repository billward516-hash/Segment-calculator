'use strict';
// Tests for the classroom game kits.
// Run: node tests/game-kits-tests.js
// The traceability key is checked independently: the records, issue log, complaint, and key are
// read back from the generated HTML, the containment list is recomputed from the printed records
// with the rule given to teams, and the result is compared with the printed key.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'games/printables');
const kits = require(path.join(root, 'tools/build-game-kits.js'));
const packs = JSON.parse(fs.readFileSync(path.join(root, 'data/packs.json'), 'utf8'));
const COPYRIGHT = 'This material is an original training aid. It is not a substitute for the standard. Obtain ISO 9001 from ISO or a national standards body.';
const FILES = ['root-cause-relay.html', 'document-control-relay.html', 'traceability-challenge.html', 'management-review-boardroom.html', 'workplace-evidence-hunt.html', 'change-control-challenge.html'];

let failed = 0;
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (!ok && detail ? '  ' + detail : '')); if (!ok) failed++; };

/* ---------- Files build ---------- */
let buildOk = true;
try { execFileSync(process.execPath, [path.join(root, 'tools/build-game-kits.js')], { stdio: 'pipe' }); } catch (e) { buildOk = false; }
check('build-game-kits.js runs without error', buildOk);
FILES.forEach(f => {
  const p = path.join(outDir, f);
  const exists = fs.existsSync(p);
  check(f + ' exists', exists);
  if (!exists) return;
  const html = fs.readFileSync(p, 'utf8');
  check(f + ' is a complete HTML document with a title', /^<!doctype html>/i.test(html) && /<title>[^<]+<\/title>/.test(html) && html.trim().endsWith('</html>'));
  check(f + ' has a debrief section', /<h2>Debrief<\/h2>/.test(html) && /Expected answer/.test(html));
  const pages = html.split('<div class="page">').slice(1);
  const missing = pages.map((pg, i) => pg.includes(COPYRIGHT) ? -1 : i + 1).filter(i => i > 0);
  check(f + ' carries the copyright notice on every page (' + pages.length + ' pages)', pages.length > 0 && missing.length === 0, 'pages without notice: ' + missing.join(', '));
  check(f + ' makes no network calls', !/(src|href)\s*=\s*["']https?:/i.test(html));
  check(f + ' names only Meridian companies', !/\b(Inc\.|Ltd\.|LLC|GmbH)\b/.test(html) && /Meridian/.test(html));
  check(f + ' has no unresolved placeholders', !/\{\{[A-Z]+\}\}|\{S0\}|undefined|NaN/.test(html));
});

/* ---------- Traceability key matches the records ---------- */
const attrs = s => { const o = {}; s.replace(/data-([a-z-]+)="([^"]*)"/g, (m, k, v) => { o[k] = v; }); return o; };
function verifyTrace(html, label) {
  const recs = [...html.matchAll(/<tr (data-item="[^>]*)>/g)].map(m => attrs(m[1]));
  const log = [...html.matchAll(/<tr (data-log-line="[^>]*)>/g)].map(m => attrs(m[1]));
  const cm = /data-suspect="([^"]+)" data-complaint-item="([^"]+)"/.exec(html);
  const keyIds = [...html.matchAll(/data-key-item="([^"]+)"/g)].map(m => m[1]);
  if (!recs.length || !log.length || !cm || !keyIds.length) { check(label + ': records, log, complaint, and key are present', false); return; }
  const suspect = cm[1], complaintId = cm[2];
  // Independent rule: exclude only when a record shows a different batch.
  const expected = recs.filter(r => {
    if (r.batch === suspect) return true;
    if (r.batch !== '') return false;
    const line = +r.line, p = +r.period;
    const e = log.find(l => +l['log-line'] === line && p >= +l['log-from'] && p <= +l['log-to']);
    return !e || e['log-batch'] === suspect;
  }).map(r => r.item);
  const same = expected.length === keyIds.length && expected.every(id => keyIds.includes(id));
  const extra = keyIds.filter(id => !expected.includes(id)), miss = expected.filter(id => !keyIds.includes(id));
  check(label + ': key matches the containment list recomputed from the records (' + expected.length + ' items)', same, 'missing ' + miss.join(',') + ' extra ' + extra.join(','));
  const comp = recs.find(r => r.item === complaintId);
  check(label + ': complaint item was delivered and recorded with the suspect batch', !!comp && comp.status === 'delivered' && comp.batch === suspect);
  check(label + ': record gaps force at least one unresolvable item onto the list', recs.some(r => r.batch === '' && expected.includes(r.item) && !log.some(l => +l['log-line'] === +r.line && +r.period >= +l['log-from'] && +r.period <= +l['log-to'])));
  check(label + ': at least one blank batch field is resolved by the issue log to another batch', recs.some(r => r.batch === '' && !expected.includes(r.item)));
  check(label + ': the suspect batch was used on both lines', new Set(recs.filter(r => r.batch === suspect).map(r => r.line)).size === 2 || new Set(log.filter(l => l['log-batch'] === suspect).map(l => l['log-line'])).size === 2);
  const ids = recs.map(r => r.item);
  check(label + ': work item IDs are unique', new Set(ids).size === ids.length);
  // Issue log never assigns two batches to the same line and shift
  let overlap = false;
  log.forEach((a, i) => log.forEach((b, j) => { if (i < j && a['log-line'] === b['log-line'] && +a['log-from'] <= +b['log-to'] && +b['log-from'] <= +a['log-to']) overlap = true; }));
  check(label + ': issue log has no overlapping entries', !overlap);
}
verifyTrace(fs.readFileSync(path.join(outDir, 'traceability-challenge.html'), 'utf8'), 'default build');
[1, 7, 42, 99, 777, 2024, 31337].forEach(seed => verifyTrace(kits.traceabilityChallenge(seed, 'generic'), 'seed ' + seed));
packs.forEach(p => verifyTrace(kits.traceabilityChallenge(12345, p.id), 'pack ' + p.id));
const a = kits.traceabilityChallenge(555, 'generic'), b = kits.traceabilityChallenge(555, 'generic');
check('traceability records are deterministic for a given seed', a === b);
check('a different seed gives different records', a !== kits.traceabilityChallenge(556, 'generic'));

/* ---------- Other kit content ---------- */
packs.forEach(p => {
  const list = kits.ccChanges(p);
  check('change control: pack ' + p.id + ' has five changes with exactly one trap', list.length === 5 && list.filter(c => c.trap).length === 1);
  const trap = list.find(c => c.trap);
  check('change control: pack ' + p.id + ' trap names the constraint stage', !!trap && (trap.text.includes(p.stages[2]) || trap.why.includes(p.stages[2])));
});
const cc = fs.readFileSync(path.join(outDir, 'change-control-challenge.html'), 'utf8');
check('change control: one instructor key per pack', (cc.match(/<h1>Instructor key: /g) || []).length === packs.length);
const hunt = fs.readFileSync(path.join(outDir, 'workplace-evidence-hunt.html'), 'utf8');
const huntRows = (/<h1>Evidence checklist[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/.exec(hunt) || [, ''])[1].match(/<tr>/g) || [];
check('evidence hunt: checklist has 15 items', huntRows.length === 15);
check('evidence hunt: safety rule present', /observe only/.test(hunt));
const dcr = fs.readFileSync(path.join(outDir, 'document-control-relay.html'), 'utf8');
check('document control: revision A, revision B, revision log, and scoring present', /revision A<\/h1>/.test(dcr) && /revision B<\/h1>/.test(dcr) && /Team revision log/.test(dcr) && /scoring sheet/i.test(dcr));
check('document control: key result follows the limit rule', kits.DC_SLIPS.every(s => kits.dcExpected(s, 'A').result === (s[2] <= s[3] ? 'PASS' : 'FAIL')));
const rcr = fs.readFileSync(path.join(outDir, 'root-cause-relay.html'), 'utf8');
check('root cause: problem cards, red herrings, why chain, fishbone, scoring, and key present', ['Problem cards', 'Red herring', 'Why-chain sheet', 'Fishbone sheet', 'Scoring sheet', 'Instructor key'].every(s => rcr.includes(s)));
const mr = fs.readFileSync(path.join(outDir, 'management-review-boardroom.html'), 'utf8');
check('management review: packet, minutes template, and scoring checklist present', ['Quality objectives', 'Complaint summary', 'Internal audit results', 'External provider performance', 'Risk and opportunity register', 'Resource requests', 'previous management review', 'minutes template', 'Scoring checklist'].every(s => mr.includes(s)));

/* ---------- Tone ---------- */
const banned = JSON.parse(fs.readFileSync(path.join(root, 'tools/banned-phrases.json'), 'utf8'));
FILES.forEach(f => {
  const text = ' ' + fs.readFileSync(path.join(outDir, f), 'utf8').replace(/<[^>]+>/g, ' ').toLowerCase().replace(/\s+/g, ' ') + ' ';
  const hits = banned.filter(b => new RegExp('(^|[^a-z])' + b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').toLowerCase() + '($|[^a-z])').test(text));
  check(f + ' uses no banned informal phrases', hits.length === 0, hits.join(', '));
});

if (failed) { console.log(failed + ' test(s) failed'); process.exit(1); }
console.log('All game kit tests passed.');
