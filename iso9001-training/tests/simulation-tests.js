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
// Core controls total 36 QP (specification table values).
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

// 2015-mode regression: values recorded from the engine before the 2026 mode was added.
// A fixed seed in 2015 mode must give exactly the same score as before the change.
const PRE_2026_SEED42 = {"total":317,"revenue":306,"audit":24,"reputation":2,"penalties":19,"wip":1,"cost":{"prevention":26,"appraisal":10,"internalFailure":44,"externalFailure":79}};
check('2015 mode, seed 42: score identical to the pre-2026 engine (317)', JSON.stringify(run(42, priority)[0]) === JSON.stringify(PRE_2026_SEED42), JSON.stringify(run(42, priority)[0]));
check('2015 mode, explicit edition "2015", seed 42: score 317', QF.autoPlay(QF.createGame({ seed: 42, teams: 1, edition: '2015' }, controls, events, null), [{ order: priority, disposition: 'redo' }])[0].total === 317);
const PRE_2026_TWO_TEAMS_SEED9 = [311.5, -272];
check('2015 mode, seed 9, two teams: totals identical to the pre-2026 engine', JSON.stringify(QF.autoPlay(QF.createGame({ seed: 9, teams: 2 }, controls, events, null), [{ order: priority, disposition: 'redo' }, { order: 'none', disposition: 'scrap' }]).map(x => x.total)) === JSON.stringify(PRE_2026_TWO_TEAMS_SEED9));
check('2015 decks are returned unchanged by decksFor', (() => { const d = QF.decksFor('2015', controls, events, [{ id: 'X' }], [{ id: 'Y' }]); return d.controls === controls && d.events === events; })());

// ----- 2026 and bridge modes (PRELIMINARY content; Appendix A.6.3) -----
const controls26 = read('controls-2026.json'), events26 = read('events-2026.json');
const d26 = QF.decksFor('2026', controls, events, controls26, events26);
check('2026 adds controls C16 and C17 at 2 QP each', controls26.map(x => x.id).join() === 'C16,C17' && controls26.every(x => x.cost === 2));
// 2026 and bridge modes: core 36 + C16 + C17 = 40 QP (confirmed by the program owner).
check('2026 control total is the 2015 table total plus 4 QP (40)', d26.controls.reduce((n, x) => n + x.cost, 0) === 40);
check('2026 adds events E17 to E20', events26.map(e => e.id).join() === 'E17,E18,E19,E20');
check('every 2026 event mitigator exists in the 2026 deck', events26.every(e => e.mitigatedBy.every(id => d26.controls.some(x => x.id === id))));
check('every 2026 control and event is confidence-labelled and unverified', controls26.concat(events26).every(x => x.edition === '2026' && /^(High|Medium|Single|Unclear|Best estimate)/.test(x.confidence) && x.verifyStatus === 'unverified'));
check('audit maximum is 24 in 2015 and 28 in 2026 and bridge', QF.auditMax('2015') === 24 && QF.auditMax('2026') === 28 && QF.auditMax('bridge') === 28);
const run26 = (seed, order, edition, extra) => QF.autoPlay(QF.createGame({ seed, teams: 1, edition: edition || '2026' }, d26.controls, d26.events, null), [Object.assign({ order, disposition: 'redo' }, extra || {})])[0];
const priority26 = ['C09', 'C16', 'C03', 'C01', 'C08', 'C14', 'C02', 'C07', 'C17', 'C04', 'C06', 'C12', 'C13', 'C15', 'C05', 'C10', 'C11'];
check('2026 mode is deterministic', JSON.stringify(run26(42, priority26)) === JSON.stringify(run26(42, priority26)));
check('bridge mode uses the same mechanics as 2026 mode', JSON.stringify(run26(7, priority26, 'bridge')) === JSON.stringify(run26(7, priority26, '2026')));
check('2026 deck draws from 20 events', (() => { const g = QF.createGame({ seed: 5, edition: '2026' }, d26.controls, d26.events, null); return g.events.length === 20 && g.deck.length === 12; })());
check('2026 final audit has 14 checks', (() => { const g = QF.createGame({ seed: 5, edition: '2026' }, d26.controls, d26.events, null); return QF.finalAudit(g.teams[0]).rows.length === 14; })());

// Single-event decks to test each 2026 event in isolation
const solo = (id, order, seed) => {
  const g = QF.createGame({ seed: seed || 3, teams: 1, rounds: 1, edition: '2026' }, d26.controls, d26.events.filter(e => e.id === id), null);
  QF.startRound(g); const t = g.teams[0]; (order || []).forEach(c => QF.buy(g, t, c)); QF.runFlow(g, t); return { g, t };
};
check('E17 without C16 or C09: the adjusted reading lets a defective work item escape', (() => { let esc = 0; for (let s = 1; s <= 50; s++) { const { t } = solo('E17', [], s); if (t.escapes >= 1 && !t.lastRound.mitigated) esc++; } return esc === 50; })());
check('E17 with C16: mitigated and the work item is held', (() => { const { t } = solo('E17', ['C16']); return t.lastRound.mitigated && t.pendingHolds.length >= 1 && t.used.C16; })());
check('E17 with C09 only: mitigated', solo('E17', ['C09']).t.lastRound.mitigated);
check('E18 without C16 causes an undetected failure; with C16 it is mitigated', (() => { let ok = true; for (let s = 1; s <= 30; s++) { if (solo('E18', [], s).t.escapes < 1) ok = false; } return ok && solo('E18', ['C16']).t.lastRound.mitigated; })());
check('E19 without C17 raises core defect probability for two rounds; C17 prevents it', (() => {
  const g = QF.createGame({ seed: 3, teams: 1, rounds: 3, edition: '2026' }, d26.controls, d26.events.filter(e => e.id === 'E19'), null);
  QF.startRound(g); const t = g.teams[0]; QF.runFlow(g, t);
  return t.knowledgeLoss === 1 && t.knowledgeLossAdd === 0.10 && solo('E19', ['C17']).t.lastRound.mitigated;
})());
check('E20 is available only to teams that own C12, and capture costs 2 QP for +5 detection points', (() => {
  const a = solo('E20', []), b = solo('E20', ['C12']);
  const qp = b.t.qp, ok = QF.captureOpportunity(b.g, b.t);
  return !a.t.opportunityOffered && !QF.captureOpportunity(a.g, a.t) && ok && b.t.qp === qp - 2 && b.t.detectBonus === 0.05;
})());
check('C16 reveals at most one near-miss per game', (() => { const g = QF.createGame({ seed: 11, teams: 1, edition: '2026' }, d26.controls, d26.events, null); QF.autoPlay(g, [{ order: ['C16'] }]); return g.teams[0].log.filter(l => /near-miss at/.test(l.text)).length <= 1; })());

// 2026 balance across 1000 seeds
{
  let sAll = 0, sNone = 0, sNoC16 = 0, w = 0, sLean = 0, sLeanC17 = 0, sCap = 0, sNoCap = 0;
  for (let s = 1; s <= N; s++) {
    const all = run26(s, priority26).total, none = run26(s, 'none').total;
    sAll += all; sNone += none; if (all > none) w++;
    sNoC16 += run26(s, priority26.filter(x => x !== 'C16')).total;
    sLean += run26(s, ['C09', 'C03', 'C01', 'C08']).total; sLeanC17 += run26(s, ['C17', 'C09', 'C03', 'C01', 'C08']).total;
    sCap += run26(s, ['C12', 'C09', 'C03']).total; sNoCap += run26(s, ['C12', 'C09', 'C03'], '2026', { captureOpportunity: false }).total;
  }
  const mA = sAll / N, mN = sNone / N;
  console.log(`2026 mean score: priority purchases ${mA.toFixed(1)}, no controls ${mN.toFixed(1)}, priority without C16 ${(sNoC16 / N).toFixed(1)}; lean set ${(sLean / N).toFixed(1)}, lean set plus C17 ${(sLeanC17 / N).toFixed(1)}; C12 set capturing E20 ${(sCap / N).toFixed(1)} vs not ${(sNoCap / N).toFixed(1)}; controlled beats none in ${(100 * w / N).toFixed(1)}% of seeds`);
  check('2026: controlled team beats uncontrolled on average', mA > mN);
  check('2026: controlled team wins in at least 80% of seeds', w / N >= 0.8);
  check('2026: advantage is not trivially dominant (controlled mean less than 3x none or none is positive)', mN > 0 ? mA < 3 * mN : true);
  check('2026: C16 adds value on average', mA > sNoC16 / N);
  check('2026: C17 adds value to a lean control set on average', sLeanC17 > sLean);
  check('2026: capturing the E20 opportunity adds value on average when detection is not capped', sCap > sNoCap);
}

// Purchase rules
const g = QF.createGame({ seed: 1 }, controls, events, null);
const t = g.teams[0];
check('cannot overspend QP', (() => { t.qp = 2; return QF.buy(g, t, 'C01') === false; })());
check('purchase deducts QP once', (() => { t.qp = 10; const ok = QF.buy(g, t, 'C03'); const again = QF.buy(g, t, 'C03'); return ok && !again && t.qp === 8; })());

console.log(failed ? `\n${failed} test(s) failed` : '\nAll tests passed');
process.exit(failed ? 1 : 0);
