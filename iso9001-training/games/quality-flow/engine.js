/* Quality Flow simulation engine. Pure JavaScript, no dependencies.
   Used inline by games/quality-flow/index.html and directly by tests. */
var QF = (function () {
  'use strict';

  var DEFAULT_CONFIG = {
    company: 'Meridian Group',
    industryPack: 'generic',
    edition: '2015',
    seed: 12345,
    rounds: 12,
    teams: 4,
    workItemsReleasedPerRound: 4,
    startingQP: 20,
    qpPerRound: 1,
    stages: [
      { id: 'intake', name: 'Intake', capacity: 6, defectProb: 0.04, manual: true },
      { id: 'prep', name: 'Preparation', capacity: 5, defectProb: 0.08, manual: true },
      { id: 'core', name: 'Core process', capacity: 4, defectProb: 0.12, constraint: true },
      { id: 'finish', name: 'Finishing', capacity: 5, defectProb: 0.10, manual: true },
      { id: 'check', name: 'Final check', capacity: 6, detectBase: 0.60 },
      { id: 'deliver', name: 'Delivery', capacity: 6, defectProb: 0.04, manual: true }
    ],
    economics: {
      goodItem: 10, scrapItem: -6, redoItem: -2, escape: -15, escapeReputation: -1,
      redoSuccess: 0.70, redoEscape: 0.15, constraintScrapExtra: -2, reviewCost: -2,
      erroneousRelease: 0.25, pressureYield: 0.5
    },
    reputationStart: 5,
    inProcessDetect: 0.80,
    bonusRounds: [4, 8, 12],
    budgetShockRound: 0
  };

  var AUDIT_CHECKS = [
    { n: 1, name: 'Policy and objectives evidence', controls: ['C12'] },
    { n: 2, name: 'Status of measuring and monitoring resources', controls: ['C01'] },
    { n: 3, name: 'Competence records', controls: ['C02'] },
    { n: 4, name: 'Document control', controls: ['C03'] },
    { n: 5, name: 'External provider and input verification control', controls: ['C04'] },
    { n: 6, name: 'Identification and traceability records', controls: ['C05'] },
    { n: 7, name: 'Change records', controls: ['C06'] },
    { n: 8, name: 'Check and release records', controls: ['C07', 'C08'] },
    { n: 9, name: 'Nonconformance records and disposition', controls: ['C09'] },
    { n: 10, name: 'Corrective action and effectiveness', controls: ['C10'] },
    { n: 11, name: 'Internal audit evidence', controls: ['C11'] },
    { n: 12, name: 'Customer feedback handling and requirements review', controls: ['C13', 'C15'] }
  ];

  // Controls that count as used every round once owned (routine daily use).
  var ALWAYS_USED = ['C01', 'C02', 'C03', 'C04', 'C05', 'C08', 'C15'];
  // Controls whose purpose is to check or audit count as appraisal cost; the rest are prevention.
  var APPRAISAL = ['C01', 'C07', 'C08', 'C11'];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function mix(a, b, c) {
    var h = (a ^ 0x9E3779B9) | 0;
    h = Math.imul(h ^ (b + 0x7F4A7C15), 0x85EBCA6B);
    h = Math.imul(h ^ (c + 0xC2B2AE35), 0x27D4EB2F);
    return (h ^ (h >>> 15)) | 0;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // Keyed dice: each roll depends only on the seed, team, round, purpose and item, never on how many
  // other rolls happened. A replay with the same seed and different purchases therefore changes
  // outcomes only where a control actually applies.
  var PURPOSE = { defect: 1, detect: 2, c07: 3, errel: 4, press: 5, deliv: 6, redo: 7, redoesc: 8 };
  function draw(g, t, purpose, itemId, stageIdx) {
    return mulberry32(mix(g.cfg.seed + (t.index + 1) * 7919, g.round * 64 + PURPOSE[purpose], itemId * 17 + (stageIdx || 0)))();
  }

  function mergeConfig(over) {
    var c = clone(DEFAULT_CONFIG);
    over = over || {};
    Object.keys(over).forEach(function (k) {
      if (k === 'economics') Object.assign(c.economics, over.economics);
      else c[k] = clone(over[k]);
    });
    return c;
  }

  function createGame(over, controls, events, pack) {
    var cfg = mergeConfig(over);
    if (pack && pack.stages) {
      cfg.stages.forEach(function (s, i) { if (pack.stages[i]) s.name = pack.stages[i]; });
    }
    var g = {
      cfg: cfg, controls: controls, events: events, pack: pack || null,
      round: 0, event: null, teams: [], deck: [], phase: 'invest'
    };
    var rng = mulberry32(mix(cfg.seed, 7, 7));
    while (g.deck.length < cfg.rounds) {
      var d = events.map(function (e) { return e.id; });
      for (var i = d.length - 1; i > 0; i--) {
        var j = Math.floor(rng() * (i + 1));
        var t = d[i]; d[i] = d[j]; d[j] = t;
      }
      g.deck = g.deck.concat(d);
    }
    g.deck = g.deck.slice(0, cfg.rounds);
    for (var n = 0; n < cfg.teams; n++) {
      g.teams.push({
        index: n, name: 'Team ' + (n + 1), qp: cfg.startingQP, spentQP: 0, spentAppraisal: 0,
        owned: {}, used: {}, corrective: {}, eventsSeen: [], gaps: [],
        rep: cfg.reputationStart, revenue: 0, penalties: 0,
        delivered: 0, escapes: 0, scrapped: 0, redone: 0,
        internalFailure: 0, externalFailure: 0,
        queues: [[], [], [], [], [], []], pendingHolds: [], nextId: 1,
        log: [], history: [], lastRound: null
      });
    }
    return g;
  }

  function control(g, id) { return g.controls.filter(function (c) { return c.id === id; })[0]; }
  function ownedCount(t) { return Object.keys(t.owned).length; }
  function eventById(g, id) { return g.events.filter(function (e) { return e.id === id; })[0]; }
  function eventText(g, ev) {
    return (g.pack && g.pack.skins && g.pack.skins[ev.id]) || ev.text;
  }

  function buy(g, t, id) {
    var c = control(g, id);
    if (!c || t.owned[id] || t.qp < c.cost) return false;
    t.qp -= c.cost; t.spentQP += c.cost; t.owned[id] = true;
    if (APPRAISAL.indexOf(id) >= 0) t.spentAppraisal += c.cost;
    t.log.push({ round: g.round, kind: 'purchase', text: 'Purchased ' + c.id + ' ' + c.name });
    return true;
  }

  // Begin a round: advance the counter, draw the event, grant QP.
  function startRound(g) {
    if (g.round >= g.cfg.rounds) return false;
    g.round++;
    g.event = eventById(g, g.deck[g.round - 1]);
    g.phase = 'invest';
    g.teams.forEach(function (t) {
      t.lastRound = null;
      if (g.round > 1) t.qp += g.cfg.qpPerRound;
      if (g.cfg.budgetShockRound && g.round === g.cfg.budgetShockRound) {
        t.qp = Math.floor(t.qp / 2);
        t.log.push({ round: g.round, kind: 'event', text: 'Budget shock: unspent QP halved' });
      }
      if (g.cfg.bonusRounds.indexOf(g.round) >= 0) {
        if (t.owned.C12) {
          t.qp += 2; t.used.C12 = true;
          t.log.push({ round: g.round, kind: 'control', text: 'C12 management review: +2 QP' });
        }
        if (t.owned.C11) {
          t.used.C11 = true;
          var rng = mulberry32(mix(g.cfg.seed, t.index + 100, g.round));
          var missing = g.controls.filter(function (c) { return !t.owned[c.id]; });
          if (missing.length) {
            var m = missing[Math.floor(rng() * missing.length)];
            t.gaps.push(m.id);
            t.log.push({ round: g.round, kind: 'control', text: 'C11 internal audit gap: no evidence of ' + m.id + ' ' + m.name + ' (Cl. ' + m.clause + ')' });
          }
        }
      }
    });
    return true;
  }

  function perturb(t, n, id) {
    // A corrective action halves the impact of that event type.
    return t.corrective[id] ? Math.floor(n / 2) : n;
  }

  function newItem(t) { return { id: t.nextId++, defective: false, origin: -1, falsePass: false, forceDetect: false, pressure: false }; }

  function escape(g, t, why) {
    var e = g.cfg.economics;
    t.revenue += e.escape; t.externalFailure -= e.escape;
    t.rep -= (t.owned.C13 ? 0.5 : 1) * -e.escapeReputation;
    if (t.owned.C13) t.used.C13 = true;
    t.escapes++;
    t.roundEscapes++;
    t.log.push({ round: g.round, kind: 'escape', text: 'Escape: ' + why });
    if (t.rep < 0) t.rep = 0;
  }

  // Resolve the event and process work for one team. Held items wait in pendingHolds.
  function runFlow(g, t) {
    var cfg = g.cfg, eco = cfg.economics, ev = g.event;
    var owns = function (id) { return !!t.owned[id]; };
    var stages = cfg.stages;
    var coreIdx = stages.map(function (s) { return !!s.constraint; }).indexOf(true);
    t.roundEscapes = 0;
    var roundStats = { delivered: 0, held: 0, escapes: 0 };
    var ctx = { coreProbAdd: 0, coreCapLoss: 0, forced: {}, falsePass: 0, skipCheck: false, pressure: false, injectDetected: 0 };
    var mitigated = false, impact = 'none';

    function force(stageIdx, n) { ctx.forced[stageIdx] = (ctx.forced[stageIdx] || 0) + n; }

    switch (ev.id) {
      case 'E01': if (owns('C03')) { mitigated = true; t.used.C03 = true; } else { force(3, perturb(t, 2, 'E01')); } break;
      case 'E02': if (owns('C01')) { mitigated = true; } else { ctx.falsePass = perturb(t, 1, 'E02'); } break;
      case 'E03': if (owns('C02')) { mitigated = true; } else { ctx.coreProbAdd = t.corrective.E03 ? 0.075 : 0.15; } break;
      case 'E04': { var n4 = owns('C04') ? 1 : 2; mitigated = owns('C04'); force(0, perturb(t, n4, 'E04')); } break;
      case 'E05': {
        var n5 = perturb(t, owns('C05') ? 1 : 4, 'E05');
        mitigated = owns('C05');
        t.revenue += n5 * eco.reviewCost; t.internalFailure -= n5 * eco.reviewCost;
        t.log.push({ round: g.round, kind: 'event', text: n5 + ' work item(s) placed on hold for review (' + (owns('C05') ? 'traceable' : 'no traceability') + ')' });
      } break;
      case 'E06': if (owns('C06')) { mitigated = true; t.used.C06 = true; } else { ctx.coreProbAdd = t.corrective.E06 ? 0.10 : 0.20; } break;
      case 'E07': { mitigated = owns('C14'); if (mitigated) t.used.C14 = true; force(3, perturb(t, owns('C14') ? 1 : 2, 'E07')); } break;
      case 'E08': ctx.injectDetected = 1; ctx.pressure = !owns('C12'); mitigated = owns('C12'); break;
      case 'E09':
        if (t.escapes > 0 && !owns('C10')) { t.penalties += 15; t.externalFailure += 15; impact = 'repeat penalty -15'; }
        else mitigated = true;
        if (owns('C10')) t.used.C10 = true;
        break;
      case 'E10':
        if (ownedCount(t) >= 8) mitigated = true; else { t.rep = Math.max(0, t.rep - 2); impact = 'reputation -2'; }
        break;
      case 'E11': ctx.skipCheck = !(owns('C08') || owns('C12')); mitigated = !ctx.skipCheck; if (owns('C12')) t.used.C12 = true; break;
      case 'E12': ctx.coreCapLoss = owns('C14') ? 1 : 2; if (owns('C14')) { t.used.C14 = true; mitigated = true; } break;
      case 'E13':
        if (owns('C01')) mitigated = true; else { t.penalties += 3; t.auditPenalty = (t.auditPenalty || 0) + 2; impact = 'audit points -2, penalty -3'; }
        break;
      case 'E14': if (owns('C03') || owns('C06')) { mitigated = true; if (owns('C06')) t.used.C06 = true; } else { force(3, perturb(t, 1, 'E14')); } break;
      case 'E15': if (owns('C15')) { mitigated = true; } else { force(0, perturb(t, 2, 'E15')); } break;
      case 'E16':
        if (owns('C11')) { mitigated = true; }
        else { var pen = owns('C02') ? 4 : 8; t.penalties += pen; t.externalFailure += pen; if (!owns('C02')) t.rep = Math.max(0, t.rep - 1); impact = 'penalty -' + pen; }
        break;
    }
    roundStats.mitigated = mitigated; roundStats.impact = impact;
    if (mitigated && ev.mitigatedBy.some(owns)) {
      ev.mitigatedBy.forEach(function (id) { if (owns(id)) t.used[id] = true; });
    }
    t.eventsSeen.push(ev.id);
    t.log.push({ round: g.round, kind: 'event', text: ev.id + ': ' + eventText(g, ev) + (mitigated ? ' (mitigated)' : impact !== 'none' ? ' (' + impact + ')' : '') });

    // Release new work items.
    for (var i = 0; i < cfg.workItemsReleasedPerRound; i++) t.queues[0].push(newItem(t));
    if (ctx.injectDetected) { var inj = newItem(t); inj.defective = true; inj.origin = 3; inj.forceDetect = true; inj.pressure = true; t.queues[4].unshift(inj); }

    ALWAYS_USED.forEach(function (id) { if (owns(id)) t.used[id] = true; });

    var detectP = Math.min(0.95, (owns('C08') ? 0.85 : stages[4].detectBase) + (owns('C01') ? 0.10 : 0));

    function hold(item, stageIdx) {
      if (!owns('C09') && draw(g, t, 'errel', item.id, stageIdx) < eco.erroneousRelease) {
        t.log.push({ round: g.round, kind: 'escape', text: 'Held work item released in error (no hold and disposition control)' });
        item.defective = true; deliver(item, true); return;
      }
      if (owns('C09')) t.used.C09 = true;
      t.pendingHolds.push(item); roundStats.held++;
    }
    function deliver(item, forced) {
      if (item.defective) { escape(g, t, 'defective work item reached the customer'); roundStats.escapes++; }
      else {
        var gain = eco.goodItem * (t.rep <= 0 ? 0.5 : 1);
        t.revenue += gain; t.delivered++; roundStats.delivered++;
      }
    }

    for (var s = 0; s < stages.length; s++) {
      var st = stages[s];
      var cap = st.capacity;
      if (s === coreIdx) cap = Math.max(0, cap - ctx.coreCapLoss);
      var take = t.queues[s].splice(0, cap);
      var out = [];
      if (st.id === 'check') {
        var fp = ctx.falsePass;
        take.forEach(function (it) {
          if (fp > 0 && !it.defective) { it.defective = true; it.origin = 3; it.falsePass = true; fp--; }
        });
        var skipped = ctx.skipCheck;
        if (skipped) t.log.push({ round: g.round, kind: 'event', text: 'Final check skipped under rush pressure' });
        take.forEach(function (it) {
          if (it.defective && !skipped && !it.falsePass && (it.forceDetect || draw(g, t, 'detect', it.id, s) < detectP)) {
            if (it.pressure && ctx.pressure && draw(g, t, 'press', it.id, s) < eco.pressureYield) {
              t.log.push({ round: g.round, kind: 'escape', text: 'Team yielded to pressure and released a held work item' });
              deliver(it); return;
            }
            hold(it, s);
          } else out.push(it);
        });
        
      } else if (st.id === 'deliver') {
        take.forEach(function (it) {
          if (!it.defective && draw(g, t, 'deliv', it.id, s) < st.defectProb) { it.defective = true; it.origin = s; }
          deliver(it);
        });
      } else {
        var p = st.defectProb;
        if (st.manual && owns('C02')) p *= 0.7;
        if (s === 0 && owns('C04')) p *= 0.5;
        if (s === coreIdx) p += ctx.coreProbAdd;
        var f = ctx.forced[s] || 0;
        take.forEach(function (it) {
          if (!it.defective) {
            if (f > 0) { it.defective = true; it.origin = s; f--; }
            else if (draw(g, t, 'defect', it.id, s) < Math.min(1, p)) { it.defective = true; it.origin = s; }
          }
        });
        take.forEach(function (it) {
          if (s === coreIdx && owns('C07') && it.defective && draw(g, t, 'c07', it.id, s) < cfg.inProcessDetect) {
            t.used.C07 = true; hold(it, s);
          } else out.push(it);
        });
      }
      if (s < stages.length - 1) out.forEach(function (it) { t.queues[s + 1].push(it); });
    }
    // Items released from final check go to delivery in the same round (queue 5 processed after check).
    t.lastRound = roundStats;
    return roundStats;
  }

  // decisions: array of 'redo' | 'scrap', aligned with t.pendingHolds.
  function resolveHolds(g, t, decisions) {
    var cfg = g.cfg, eco = cfg.economics;
    var coreIdx = cfg.stages.map(function (s) { return !!s.constraint; }).indexOf(true);
    t.pendingHolds.forEach(function (it, i) {
      var d = (decisions && decisions[i]) || 'redo';
      function scrap() {
        var cost = eco.scrapItem + (it.origin >= coreIdx ? eco.constraintScrapExtra : 0);
        t.revenue += cost; t.internalFailure -= cost; t.scrapped++;
        t.log.push({ round: g.round, kind: 'disposition', text: 'Scrapped work item (' + cost + ')' });
      }
      if (d === 'scrap') { scrap(); return; }
      t.revenue += eco.redoItem; t.internalFailure -= eco.redoItem;
      if (draw(g, t, 'redo', it.id, 0) < eco.redoSuccess) {
        t.redone++;
        t.log.push({ round: g.round, kind: 'disposition', text: 'Redo succeeded (' + eco.redoItem + ')' });
        if (draw(g, t, 'redoesc', it.id, 0) < eco.redoEscape) { escape(g, t, 'redone work item failed after release without a new check'); }
        else { t.revenue += eco.goodItem * (t.rep <= 0 ? 0.5 : 1); t.delivered++; }
      } else {
        t.log.push({ round: g.round, kind: 'disposition', text: 'Redo failed' });
        scrap();
      }
    });
    t.pendingHolds = [];
    if (t.lastRound) { t.lastRound.escapes = t.roundEscapes; }
    t.history.push({
      round: g.round, event: g.event.id, delivered: t.delivered, escapes: t.escapes, scrapped: t.scrapped,
      qp: t.qp, owned: ownedCount(t), revenue: Math.round(t.revenue * 10) / 10, reputation: t.rep
    });
  }

  // Corrective action opportunity: every third round, requires C10.
  function correctiveAvailable(g, t) { return !!t.owned.C10 && g.round % 3 === 0; }
  function applyCorrective(g, t, eventId) {
    if (!t.owned.C10 || g.round % 3 !== 0 || t.eventsSeen.indexOf(eventId) < 0) return false;
    t.corrective[eventId] = true; t.used.C10 = true;
    t.log.push({ round: g.round, kind: 'control', text: 'Corrective action recorded for ' + eventId + ' (5 Whys): future impact halved' });
    return true;
  }

  function finalAudit(t) {
    var total = 0;
    var rows = AUDIT_CHECKS.map(function (c) {
      var owned = c.controls.some(function (id) { return t.owned[id]; });
      var used = c.controls.some(function (id) { return t.owned[id] && t.used[id]; });
      var pts = (owned ? 1 : 0) + (owned && used ? 1 : 0);
      total += pts;
      return { n: c.n, name: c.name, controls: c.controls, owned: owned, used: used, points: pts };
    });
    total = Math.max(0, total - (t.auditPenalty || 0));
    return { rows: rows, points: total };
  }

  function score(t) {
    var a = finalAudit(t);
    var total = t.revenue + a.points + t.rep * 3 - t.penalties;
    var wip = t.queues.reduce(function (n, q) { return n + q.length; }, 0);
    return {
      total: Math.round(total * 10) / 10, revenue: Math.round(t.revenue * 10) / 10, audit: a.points,
      reputation: t.rep, penalties: t.penalties, wip: wip,
      cost: { prevention: t.spentQP - t.spentAppraisal, appraisal: t.spentAppraisal, internalFailure: t.internalFailure, externalFailure: t.externalFailure }
    };
  }

  // Automatic play for tests, replays and solo practice.
  function autoPlay(g, strategy) {
    // strategy: {order: [control ids] | 'none', disposition: 'redo'|'scrap'}
    var guard = 0;
    while (g.round < g.cfg.rounds && guard++ < 100) {
      startRound(g);
      g.teams.forEach(function (t) {
        var st = strategy[t.index % strategy.length] || strategy[0];
        if (st.order !== 'none') st.order.forEach(function (id) { buy(g, t, id); });
        runFlow(g, t);
        resolveHolds(g, t, t.pendingHolds.map(function () { return st.disposition || 'redo'; }));
        if (t.owned.C10 && g.round % 3 === 0) {
          var best = t.eventsSeen.filter(function (id) { return !t.corrective[id]; })[0];
          if (best) applyCorrective(g, t, best);
        }
      });
    }
    return g.teams.map(score);
  }

  function csv(g) {
    var head = 'team,round,event,delivered,escapes,scrapped,qp,controls,revenue,reputation';
    var rows = [head];
    g.teams.forEach(function (t) {
      t.history.forEach(function (h) {
        rows.push([t.name, h.round, h.event, h.delivered, h.escapes, h.scrapped, h.qp, h.owned, h.revenue, h.reputation].join(','));
      });
    });
    return rows.join('\n');
  }

  return {
    DEFAULT_CONFIG: DEFAULT_CONFIG, AUDIT_CHECKS: AUDIT_CHECKS,
    createGame: createGame, buy: buy, startRound: startRound, runFlow: runFlow,
    resolveHolds: resolveHolds, applyCorrective: applyCorrective, correctiveAvailable: correctiveAvailable, finalAudit: finalAudit,
    score: score, autoPlay: autoPlay, csv: csv, eventText: eventText, mulberry32: mulberry32, ownedCount: ownedCount
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = QF;
