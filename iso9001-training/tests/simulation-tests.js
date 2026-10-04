'use strict';
// Run: node tests/simulation-tests.js
const fs = require('fs');
const path = require('path');
const QF = require('../games/quality-flow/engine.js');
const read = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', f), 'utf8'));
const controls = read('controls.json'), events = read('events.json'), packs = read('packs.json');

let failed = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + detail : ''));
  if (!ok) failed++;
}

// Schema checks
// The specification states a total of 37 QP, but its own control table sums to 36. The table values are used.
check('15 controls, per-control costs sum to 36 (spec table)', controls.length === 15 && controls.reduce((n, c) => n + c.cost, 0) === 36);
check('16 events', events.length === 16);
check('every event mitigator exists', events.every(e => e.mitigatedBy.every(id => controls.some(c => c.id === id))));
check('8 packs plus generic with 6 stages each', packs.length === 9 && packs.every(p => p.stages.length === 6));
check('each pack skins E01,E02,E04,E05,E07,E08', packs.filter(p => p.id !== 'generic').every(p => ['E01','E02','E04','E05','E07','E08'].every(k => p.skins[k])));

const priority = ['C09','C03','C01','C08','C14','C02','C07','C04','C06','C12','C13','C15','C05','C10','C11'];
const run = (seed, order, teams) => {
  const g = QF.createGame({ seed, teams: teams || 1 }, controls, events, null);
  return QF.autoPlay(g, [{ order, disposition: 'redo' }]);
};

// Determinism
const a = run(42, priority), b = run(42, priority);
check('same seed and choices give identical results', JSON.stringify(a) === JSON.stringify(b));
const c = run(43, priority);
check('different seed changes results', JSON.stringify(a) !== JSON.stringify(c));

// Balance across 1000 seeds
let sumAll = 0, sumNone = 0, sumHalf = 0, domin = 0, N = 1000, wins = 0;
const partial = ['C09','C03','C01','C08','C14','C02'];
for (let s = 1; s <= N; s++) {
  const all = run(s, priority)[0].total, none = run(s, 'none')[0].total, half = run(s, partial)[0].total;
  sumAll += all; sumNone += none; sumHalf += half;
  if (all > none) wins++;
}
const mAll = sumAll / N, mNone = sumNone / N, mHalf = sumHalf / N;
console.log(`mean score: priority purchases ${mAll.toFixed(1)}, six core controls ${mHalf.toFixed(1)}, no controls ${mNone.toFixed(1)}; controlled beats none in ${(100 * wins / N).toFixed(1)}% of seeds`);
check('controlled team beats uncontrolled on average', mAll > mNone);
check('controlled team wins in at least 80% of seeds', wins / N >= 0.8);
check('advantage is not trivially dominant (controlled mean less than 3x none or none is positive)', mNone > 0 ? mAll < 3 * mNone : true);

// 2015-mode purity: edition flag must not change results
const g1 = QF.createGame({ seed: 9, edition: '2015' }, controls, events, null);
const g2 = QF.createGame({ seed: 9, edition: '2026' }, controls, events, null);
check('edition flag does not alter 2015 mechanics', JSON.stringify(QF.autoPlay(g1, [{ order: priority }])) === JSON.stringify(QF.autoPlay(g2, [{ order: priority }])));

// Purchase rules
const g = QF.createGame({ seed: 1 }, controls, events, null);
const t = g.teams[0];
check('cannot overspend QP', (() => { t.qp = 2; return QF.buy(g, t, 'C01') === false; })());
check('purchase deducts QP once', (() => { t.qp = 10; const ok = QF.buy(g, t, 'C03'); const again = QF.buy(g, t, 'C03'); return ok && !again && t.qp === 8; })());

console.log(failed ? `\n${failed} test(s) failed` : '\nAll tests passed');
process.exit(failed ? 1 : 0);
