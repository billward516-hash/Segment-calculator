/* Sector Casebook engine. Pure JavaScript, no dependencies.
   Used inline by games/casebook/index.html and games/casebook/results-reader.html, and directly by tests.
   The pseudo-random generator is the same tested mulberry32 function used by Quality Flow: in Node it is
   required from games/quality-flow/engine.js; in the built pages the build script inlines that function
   as CB_MULBERRY32. */
var CB = (function (mulberry32) {
  'use strict';

  var VERSION = 1;
  var ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // readable base 32 (no I, L, O, U)
  var TYPES = ['A', 'B', 'C', 'D', 'E', 'F'];
  var CAPSTONE = 'X';
  var CLASSES = ['conforming', 'nonconformity', 'observation', 'more'];
  var CLASS_LABEL = { conforming: 'Conforming', nonconformity: 'Nonconformity', observation: 'Observation', more: 'Need more evidence' };
  var ACTION_CATS = ['containment', 'correction', 'cause', 'corrective', 'effectiveness'];
  var ACTION_LABEL = { containment: 'Containment', correction: 'Correction', cause: 'Cause (system condition)', corrective: 'Corrective action', effectiveness: 'Effectiveness check' };
  var BRANCHES = ['Evidence', 'Mapping', 'Cause', 'Control', 'Judgment'];
  var NA = null;
  var EPOCH = Date.UTC(2024, 0, 1);
  // Words that make a finding statement judgmental rather than factual and neutral.
  var JUDGMENT_WORDS = ['careless', 'lazy', 'sloppy', 'incompetent', 'negligent', 'stupid', 'idiot', 'useless', 'terrible', 'awful',
    'disgrace', 'shameful', 'blame', 'fault', 'obviously', 'clearly', 'bad attitude', 'poor attitude', 'does not care', 'did not care',
    'should know better', 'always', 'never', 'everyone', 'nobody'];

  // Generic distractors used when a case does not supply its own. They show common weak answers:
  // blaming a person, doing nothing, or over-reacting.
  var GENERIC_DISTRACTORS = {
    containment: ['Take no containment action until a second complaint arrives', 'Stop all work across the whole site until further notice, whatever the link to the issue', 'Ask the customer to inspect everything already delivered at their own cost'],
    correction: ['Release the affected work as it is and attach an explanatory note', 'Discard the records that show the problem so the file is consistent', 'Correct only the single item that was reported and leave the rest unchecked'],
    cause: ['The person involved was careless; no further analysis is needed', 'Human error; the cause cannot be found', 'Bad luck; the event is unlikely to happen again'],
    corrective: ['Issue a written warning to the person involved', 'Send a reminder asking everyone to be more careful', 'Add a second signature to every form in the organization without analysis'],
    effectiveness: ['Close the action as soon as the form is filed', 'Assume the action worked if no complaint arrives this month', 'Ask the person involved whether they feel the problem is solved']
  };

  /* ---------- small utilities ---------- */
  function fnv(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function rngFor(seed, caseId, salt) { return mulberry32(fnv(seed + '|' + caseId + '|' + (salt || ''))); }
  function shuffle(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function clauses(s) { return String(s || '').split(/[,;]/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function pct(n, d) { return d ? n / d : NA; }
  function round2(x) { return x === NA ? NA : Math.round(x * 100) / 100; }

  /* ---------- base 32 seeds and case codes ---------- */
  function toB32(n, width) {
    var s = '';
    do { s = ALPHABET[n % 32] + s; n = Math.floor(n / 32); } while (n > 0);
    while (s.length < width) s = '0' + s;
    return s;
  }
  function fromB32(s) {
    var n = 0;
    s = normB32(s);
    for (var i = 0; i < s.length; i++) { var d = ALPHABET.indexOf(s[i]); if (d < 0) return NaN; n = n * 32 + d; }
    return n;
  }
  function normB32(s) { return String(s).toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V'); }
  function seedText(n) { return toB32(n, 4); }
  function randomSeed() {
    var n = 0;
    try { var a = new Uint32Array(1); (typeof crypto !== 'undefined' ? crypto : window.crypto).getRandomValues(a); n = a[0]; } catch (e) { n = Math.floor(Math.random() * 4294967296); }
    n = n % (32 * 32 * 32 * 32);
    return n === 0 ? 1 : n;
  }

  // Case code: <PACK>-<TYPE>[n]-<SEED>, for example MFG-B-7K3Q. Type X is the sector capstone.
  function parseCode(str) {
    var m = /^\s*([A-Za-z]{3})-([A-Fa-fXx])(\d{0,2})-([0-9A-Za-z]{4})\s*$/.exec(String(str || ''));
    if (!m) return { error: 'A case code has the form ABC-T-SEED, for example MFG-B-7K3Q.' };
    var seed = fromB32(m[4]);
    if (isNaN(seed)) return { error: 'The seed part of the code contains a character that is not used in case codes.' };
    var n = m[3] ? parseInt(m[3], 10) : 1;
    return { pack: m[1].toUpperCase(), type: m[2].toUpperCase(), n: n, seed: seed, code: formatCode(m[1].toUpperCase(), m[2].toUpperCase(), n, seed) };
  }
  function formatCode(packCode, type, n, seed) { return packCode + '-' + type + (n && n > 1 ? n : '') + '-' + seedText(seed); }

  /* ---------- case schema validator ---------- */
  function validateCase(c, opts) {
    opts = opts || {};
    var errs = [];
    var e = function (m) { errs.push((c && c.id ? c.id : '?') + ': ' + m); };
    if (!c || typeof c !== 'object') return ['case is not an object'];
    ['id', 'pack', 'type', 'title', 'edition', 'verifyStatus2015', 'brief', 'goal'].forEach(function (k) { if (typeof c[k] !== 'string' || !c[k].trim()) e('missing string field "' + k + '"'); });
    if (!/^[A-Z]{3}-[A-F]-\d\d$/.test(c.id || '')) e('id must look like MFG-B-01');
    if (TYPES.indexOf(c.type) < 0) e('type must be one of A to F');
    if (c.id && c.type && c.id.split('-')[1] !== c.type) e('id type letter does not match "type"');
    if (['2015', '2026'].indexOf(c.edition) < 0) e('edition must be "2015" or "2026"');
    if (c.verifyStatus2015 !== 'unverified' && c.verifyStatus2015 !== 'verified') e('verifyStatus2015 must be "unverified" or "verified"');
    if (!(Number.isInteger(c.visitPoints) && c.visitPoints >= 6 && c.visitPoints <= 30)) e('visitPoints must be an integer from 6 to 30');
    if (!Array.isArray(c.branches) || !c.branches.length || c.branches.some(function (b) { return BRANCHES.indexOf(b) < 0; })) e('branches must list skill branches');
    if (!Array.isArray(c.evidence) || !c.evidence.length) { e('evidence must be a non-empty array'); return errs; }
    if (!Array.isArray(c.hotspots) || !c.hotspots.length) { e('hotspots must be a non-empty array'); return errs; }
    var ids = {};
    c.evidence.forEach(function (ev) {
      if (!ev.id || ids[ev.id]) e('evidence id missing or duplicated: ' + ev.id);
      ids[ev.id] = ev;
    });
    var used = {};
    c.hotspots.forEach(function (h) {
      if (!h.id || !h.name) e('hotspot needs id and name');
      if (!Array.isArray(h.actions) || !h.actions.length) e('hotspot ' + h.id + ' has no actions');
      (h.actions || []).forEach(function (a) {
        if (['Observe', 'Ask', 'Review'].indexOf(a.verb) < 0) e('hotspot ' + h.id + ' action verb must be Observe, Ask, or Review');
        if (!a.label) e('hotspot ' + h.id + ' action without label');
        if (a.evidenceId) {
          if (!ids[a.evidenceId]) e('action refers to unknown evidence ' + a.evidenceId);
          if (used[a.evidenceId]) e('evidence ' + a.evidenceId + ' is reachable from more than one action');
          used[a.evidenceId] = true;
        } else if (!a.note) e('action "' + a.label + '" needs evidenceId or note');
      });
    });
    var validClauses = opts.clauseIds ? new Set(opts.clauseIds) : null;
    c.evidence.forEach(function (ev) {
      if (['nonconformity', 'conforming', 'observation', 'redHerring'].indexOf(ev.kind) < 0) e(ev.id + ' kind is invalid');
      if (!ev.text) e(ev.id + ' has no text');
      if (!ev.clause || !clauses(ev.clause).length) e(ev.id + ' has no clause tag');
      if (validClauses) clauses(ev.clause).forEach(function (cl) { if (!validClauses.has(cl)) e(ev.id + ' clause ' + cl + ' is not in the clause map'); });
      if (!ev.whyItMatters) e(ev.id + ' has no whyItMatters explanation');
      if (!ev.missedExplanation) e(ev.id + ' has no missedExplanation');
      if (ev.variants && !Array.isArray(ev.variants)) e(ev.id + ' variants must be an array');
      if (!used[ev.id]) e(ev.id + ' is not reachable from any hotspot action');
      (ev.unlockedBy || []).forEach(function (u) { if (!ids[u]) e(ev.id + ' is unlocked by unknown evidence ' + u); if (u === ev.id) e(ev.id + ' unlocks itself'); });
      if (ev.supports) {
        if (!ids[ev.supports]) e(ev.id + ' supports unknown evidence ' + ev.supports);
        else if (['nonconformity', 'observation'].indexOf(ids[ev.supports].kind) < 0) e(ev.id + ' supports evidence that is not an issue');
        if (ev.plantedPool) e(ev.id + ' is supporting evidence and must not be in the planted pool');
      }
      if ((ev.kind === 'nonconformity' || ev.kind === 'observation') && !ev.supports && ev.plantedPool !== true) e(ev.id + ' is an issue but not marked plantedPool');
      var firstTokens = {}; if (c.tokens) Object.keys(c.tokens).forEach(function (k) { firstTokens[k] = c.tokens[k][0]; });
      if ((ev.kind === 'nonconformity' || ev.kind === 'observation') && !/\d/.test(substitute(ev.text, firstTokens))) e(ev.id + ' issue text should include a record reference with a number');
    });
    var planted = c.evidence.filter(function (ev) { return ev.plantedPool && !ev.supports && (ev.kind === 'nonconformity' || ev.kind === 'observation'); });
    if (planted.length < 4) e('needs at least four plantable issues (found ' + planted.length + ')');
    if (c.evidence.filter(function (ev) { return ev.kind === 'redHerring'; }).length < 2) e('needs at least two red herrings');
    if (c.evidence.filter(function (ev) { return ev.kind === 'conforming'; }).length < 3) e('needs at least three conforming evidence items');
    (c.decisions || []).forEach(function (d) {
      if (!d.id || !d.prompt || !Array.isArray(d.options) || d.options.length < 2) e('decision ' + d.id + ' is incomplete');
      else if (!(Number.isInteger(d.bestIndex) && d.bestIndex >= 0 && d.bestIndex < d.options.length)) e('decision ' + d.id + ' bestIndex out of range');
      if (!d.rationale) e('decision ' + d.id + ' has no rationale');
    });
    if (c.type === 'F' && !(c.decisions || []).length) e('a Pressure Decision case needs at least one decision');
    var ea = c.expectedActions || {};
    ACTION_CATS.forEach(function (k) { if (!Array.isArray(ea[k]) || !ea[k].length) e('expectedActions.' + k + ' must list at least one action'); });
    if (!c.debriefText || !c.debriefText.found || !c.debriefText.missed || !c.debriefText.falseFinding) e('debriefText needs found, missed, and falseFinding');
    if (c.referenceSelection) (c.referenceSelection.evidence || []).forEach(function (id) { if (!ids[id]) e('referenceSelection names unknown evidence ' + id); });
    if (c.tokens) Object.keys(c.tokens).forEach(function (k) { if (!Array.isArray(c.tokens[k]) || !c.tokens[k].length) e('token ' + k + ' needs options'); });
    var str = JSON.stringify(c);
    var tk = str.match(/\{\{(\w+)\}\}/g) || [];
    tk.forEach(function (t) { var k = t.slice(2, -2); if (!c.tokens || !c.tokens[k]) e('text uses token ' + t + ' that is not defined'); });
    return errs;
  }

  /* ---------- seeded case generation ---------- */
  function substitute(obj, tokens) {
    if (typeof obj === 'string') return obj.replace(/\{\{(\w+)\}\}/g, function (m, k) { return tokens[k] !== undefined ? tokens[k] : m; });
    if (Array.isArray(obj)) return obj.map(function (x) { return substitute(x, tokens); });
    if (obj && typeof obj === 'object') { var o = {}; Object.keys(obj).forEach(function (k) { o[k] = substitute(obj[k], tokens); }); return o; }
    return obj;
  }

  function isIssue(ev) { return ev.kind === 'nonconformity' || ev.kind === 'observation'; }

  // Selects which evidence appears for a seed. Returns the list of included evidence ids in authored order.
  function selectEvidence(c, seed) {
    var byId = {}; c.evidence.forEach(function (ev) { byId[ev.id] = ev; });
    var chosen = {};
    if (seed === 0 && c.referenceSelection && c.referenceSelection.evidence) {
      c.referenceSelection.evidence.forEach(function (id) { chosen[id] = true; });
    } else {
      var rng = rngFor(seed, c.id, 'select');
      var pool = c.evidence.filter(function (ev) { return isIssue(ev) && !ev.supports; });
      var target = Math.min(pool.length, rng() < 0.5 ? 4 : 5);
      // Take issues in seeded order. An issue that is unlocked only by another issue brings that issue
      // with it, so it is taken only when both fit within the target.
      var count = 0;
      shuffle(pool, rng).forEach(function (ev) {
        if (count >= target || chosen[ev.id]) return;
        var need = (ev.unlockedBy || []).length && !ev.unlockedBy.some(function (u) { return chosen[u] || !isIssue(byId[u]) || byId[u].supports; }) ? ev.unlockedBy[0] : null;
        if (need && count + 2 > target) return;
        chosen[ev.id] = true; count++;
        if (need) { chosen[need] = true; count++; }
      });
      var conf = c.evidence.filter(function (ev) { return ev.kind === 'conforming'; });
      var nConf = conf.length <= 3 ? conf.length : Math.max(3, conf.length - 1 - Math.floor(rng() * 2));
      shuffle(conf, rng).slice(0, nConf).forEach(function (ev) { chosen[ev.id] = true; });
      var rh = c.evidence.filter(function (ev) { return ev.kind === 'redHerring'; });
      var nRh = rh.length <= 2 ? rh.length : 2 + Math.floor(rng() * (rh.length - 1));
      shuffle(rh, rng).slice(0, nRh).forEach(function (ev) { chosen[ev.id] = true; });
    }
    // Supporting evidence appears with the issue it supports; unlockers of included evidence are always included.
    var changed = true;
    while (changed) {
      changed = false;
      c.evidence.forEach(function (ev) {
        if (!chosen[ev.id] && ev.supports && chosen[ev.supports]) { chosen[ev.id] = true; changed = true; }
        if (chosen[ev.id] && ev.unlockedBy && ev.unlockedBy.length && !ev.unlockedBy.some(function (u) { return chosen[u]; })) { chosen[ev.unlockedBy[0]] = true; changed = true; }
      });
    }
    return c.evidence.filter(function (ev) { return chosen[ev.id]; }).map(function (ev) { return ev.id; });
  }

  function chooseTokens(c, seed) {
    var out = {};
    if (!c.tokens) return out;
    // One option set per seed: token k uses option (i mod its length), so related numbers stay consistent.
    var rng = rngFor(seed, c.id, 'tokens');
    var i = seed === 0 ? 0 : Math.floor(rng() * 1024);
    Object.keys(c.tokens).sort().forEach(function (k) { var opts = c.tokens[k]; out[k] = opts[i % opts.length]; });
    return out;
  }

  function buildActionOptions(expected, distractors, rng, prefix) {
    var out = {};
    ACTION_CATS.forEach(function (cat) {
      var exp = (expected[cat] || []).map(function (t, i) { return { key: prefix + cat + '-x' + i, text: t, expected: true }; });
      var dpool = (distractors && distractors[cat] && distractors[cat].length ? distractors[cat] : GENERIC_DISTRACTORS[cat]);
      var ds = shuffle(dpool, rng).slice(0, 2).map(function (t, i) { return { key: prefix + cat + '-d' + i, text: t, expected: false }; });
      out[cat] = shuffle(exp.concat(ds), rng);
    });
    return out;
  }

  // Generates the playable case for one case file and one seed. Pure and deterministic.
  function generate(c, seed, sector) {
    var tokens = chooseTokens(c, seed);
    var base = substitute(clone(c), tokens);
    var included = selectEvidence(c, seed);
    var vr = rngFor(seed, c.id, 'variants');
    var evidence = {};
    base.evidence.forEach(function (ev) {
      var opts = [ev.text].concat(ev.variants || []);
      var vi = Math.floor(vr() * opts.length);
      if (seed === 0) vi = 0;
      if (included.indexOf(ev.id) < 0) return;
      evidence[ev.id] = {
        id: ev.id, kind: ev.kind, text: opts[vi], variantIndex: vi, clauses: clauses(ev.clause), unlockedBy: ev.unlockedBy || [],
        supports: ev.supports || null, whyItMatters: ev.whyItMatters, missedExplanation: ev.missedExplanation, falseFindingNote: ev.falseFindingNote || ''
      };
    });
    var hotspots = [];
    base.hotspots.forEach(function (h) {
      var acts = h.actions.filter(function (a) { return a.note || evidence[a.evidenceId]; }).map(function (a, i) {
        return { key: h.id + '-' + i, verb: a.verb, label: a.label, evidenceId: a.evidenceId || null, note: a.note || null, hotspot: h.id };
      });
      if (acts.length) hotspots.push({ id: h.id, name: h.name, group: h.group || '', actions: acts });
    });
    var planted = included.filter(function (id) { return isIssue(evidence[id]) && !evidence[id].supports; });
    var ar = rngFor(seed, c.id, 'actions');
    var code = sector ? formatCode(sector.code, c.type, parseInt(c.id.split('-')[2], 10), seed) : c.id + '/' + seedText(seed);
    return {
      code: code, seed: seed, id: c.id, pack: c.pack, type: c.type, title: base.title, edition: c.edition, verifyStatus2015: c.verifyStatus2015,
      company: sector ? sector.company : '', brief: base.brief, visitPoints: c.visitPoints, goal: c.goal, branches: c.branches.slice(),
      hotspots: hotspots, evidence: evidence, included: included, planted: planted,
      decisions: (base.decisions || []).map(function (d) { return { id: d.id, prompt: d.prompt, options: d.options, bestIndex: d.bestIndex, rationale: d.rationale, optionFeedback: d.optionFeedback || null }; }),
      expectedActions: base.expectedActions, actionOptions: buildActionOptions(base.expectedActions, base.actionDistractors, ar, ''),
      actionFocus: '', debriefText: base.debriefText, tokens: tokens, components: null
    };
  }

  // Capstone: an unseen visit built from three or more case types of one sector.
  function generateCapstone(cases, seed, sector) {
    var rng = rngFor(seed, (sector ? sector.code : 'CAP'), 'capstone');
    var pool = cases.filter(function (c) { return c.edition === '2015'; });
    var picked = shuffle(pool, rng).slice(0, Math.min(3, pool.length));
    picked.sort(function (a, b) { return a.type < b.type ? -1 : 1; });
    var evidence = {}, hotspots = [], included = [], planted = [], decisions = [], components = [];
    var focus = null;
    ['E', 'B', 'C', 'D', 'F', 'A'].forEach(function (t) { if (!focus) focus = picked.filter(function (c) { return c.type === t; })[0] || null; });
    var ar = rngFor(seed, 'capstone', 'actions');
    var actionOptions = null, expectedActions = null;
    picked.forEach(function (c, ci) {
      var sub = generate(c, (seed * 7 + ci * 131 + 1) % 1048576 || 1, sector);
      var pfx = c.type + '.';
      var r2 = rngFor(seed, c.id, 'capstone-pick');
      var keep = {};
      shuffle(sub.planted, r2).slice(0, 2).forEach(function (id) { keep[id] = true; });
      var conf = sub.included.filter(function (id) { return sub.evidence[id].kind === 'conforming'; });
      var rh = sub.included.filter(function (id) { return sub.evidence[id].kind === 'redHerring'; });
      shuffle(conf, r2).slice(0, 1).forEach(function (id) { keep[id] = true; });
      shuffle(rh, r2).slice(0, 1).forEach(function (id) { keep[id] = true; });
      var changed = true;
      while (changed) {
        changed = false;
        sub.included.forEach(function (id) {
          var ev = sub.evidence[id];
          if (!keep[id] && ev.supports && keep[ev.supports]) { keep[id] = true; changed = true; }
          if (keep[id] && ev.unlockedBy.length && !ev.unlockedBy.some(function (u) { return keep[u]; })) {
            var u0 = ev.unlockedBy.filter(function (u) { return sub.evidence[u]; })[0];
            if (u0) { keep[u0] = true; changed = true; }
          }
        });
      }
      sub.included.forEach(function (id) {
        if (!keep[id]) return;
        var ev = clone(sub.evidence[id]);
        ev.id = pfx + id; ev.unlockedBy = ev.unlockedBy.filter(function (u) { return keep[u]; }).map(function (u) { return pfx + u; });
        if (ev.supports) ev.supports = pfx + ev.supports;
        evidence[ev.id] = ev; included.push(ev.id);
        if (isIssue(ev) && !ev.supports) planted.push(ev.id);
      });
      sub.hotspots.forEach(function (h) {
        var acts = h.actions.filter(function (a) { return a.evidenceId && keep[a.evidenceId]; }).map(function (a) {
          var x = clone(a); x.key = pfx + a.key; x.evidenceId = pfx + a.evidenceId; x.hotspot = pfx + h.id; return x;
        });
        if (acts.length) hotspots.push({ id: pfx + h.id, name: h.name, group: sub.title, actions: acts });
      });
      if (sub.decisions[0]) { var d = clone(sub.decisions[0]); d.id = pfx + d.id; d.prompt = sub.title + ': ' + d.prompt; decisions.push(d); }
      components.push({ id: c.id, type: c.type, title: sub.title, brief: sub.brief, code: sub.code });
      if (focus && c.id === focus.id) { expectedActions = sub.expectedActions; actionOptions = buildActionOptions(sub.expectedActions, c.actionDistractors, ar, pfx); }
    });
    return {
      code: sector ? formatCode(sector.code, CAPSTONE, 1, seed) : 'CAP-' + seedText(seed), seed: seed, id: (sector ? sector.code : 'CAP') + '-X-01', pack: picked[0] ? picked[0].pack : '',
      type: CAPSTONE, title: 'Sector Capstone', edition: '2015', verifyStatus2015: 'unverified', company: sector ? sector.company : '',
      brief: 'This capstone visit combines ' + components.length + ' situations that you have not seen in this form. Investigate all of them within the visit points, then write findings, plan actions for the situation named in the action plan, and make the decisions.',
      visitPoints: 16, goal: 'Mixed: coverage, mapping, cause, control, and judgment in one visit', branches: BRANCHES.slice(),
      hotspots: hotspots, evidence: evidence, included: included, planted: planted, decisions: decisions,
      expectedActions: expectedActions, actionOptions: actionOptions, actionFocus: focus ? focus.title : '',
      debriefText: { found: 'You identified issues in more than one situation within one visit. That is the skill an internal audit needs.', missed: 'In a mixed visit, spread your visit points across every situation before going deep on one.', falseFinding: 'Conforming evidence stays conforming in a mixed visit. Judge each record on its own facts.' },
      tokens: {}, components: components
    };
  }

  // Resolves a case code against the catalog { sectors: [...], cases: { packId: [caseFiles] } }.
  function buildFromCode(code, catalog) {
    var p = parseCode(code);
    if (p.error) return p;
    var sector = catalog.sectors.filter(function (s) { return s.code === p.pack; })[0];
    if (!sector) return { error: 'No sector uses the code ' + p.pack + '.' };
    var list = catalog.cases[sector.pack] || [];
    if (p.type === CAPSTONE) return { gen: generateCapstone(list, p.seed, sector), sector: sector };
    var id = sector.code + '-' + p.type + '-' + (p.n < 10 ? '0' : '') + p.n;
    var c = list.filter(function (x) { return x.id === id; })[0];
    if (!c) return { error: 'No case ' + id + ' exists in this casebook.' };
    return { gen: generate(c, p.seed, sector), sector: sector, caseFile: c };
  }

  /* ---------- visit state ---------- */
  function newVisit(gen) {
    return { gen: gen, points: gen.visitPoints, done: {}, collected: [], notes: [], cls: {}, findings: [], actions: {}, decisions: {}, justifications: {}, hints: [], hintLevel: 0, hintTarget: null, visitEnded: false, closed: false, log: [], nextFinding: 1 };
  }
  function isUnlocked(state, ev) { return !ev.unlockedBy.length || ev.unlockedBy.some(function (u) { return state.collected.indexOf(u) >= 0; }); }
  function availableActions(state) {
    var out = [];
    state.gen.hotspots.forEach(function (h) {
      h.actions.forEach(function (a) {
        if (a.evidenceId && !isUnlocked(state, state.gen.evidence[a.evidenceId])) return;
        out.push({ hotspot: h, action: a, done: !!state.done[a.key] });
      });
    });
    return out;
  }
  function findAction(state, key) {
    for (var i = 0; i < state.gen.hotspots.length; i++) for (var j = 0; j < state.gen.hotspots[i].actions.length; j++) if (state.gen.hotspots[i].actions[j].key === key) return state.gen.hotspots[i].actions[j];
    return null;
  }
  // Takes one visit action. Costs one visit point. Never ends the case: when points run out, the visit
  // ends and the learner continues to sort and write with what was gathered.
  function act(state, key) {
    if (state.visitEnded) return { ok: false, reason: 'The visit has ended. Continue in the Notebook and Findings.' };
    var a = findAction(state, key);
    if (!a) return { ok: false, reason: 'Unknown action.' };
    if (state.done[key]) return { ok: false, reason: 'Already done.' };
    if (a.evidenceId && !isUnlocked(state, state.gen.evidence[a.evidenceId])) return { ok: false, reason: 'Not yet available.' };
    var before = availableActions(state).map(function (x) { return x.action.key; });
    state.done[key] = true; state.points -= 1;
    var res = { ok: true, action: a, evidence: null, unlocked: [] };
    if (a.evidenceId) { state.collected.push(a.evidenceId); res.evidence = state.gen.evidence[a.evidenceId]; }
    else state.notes.push({ label: a.label, note: a.note });
    state.log.push({ t: 'act', key: key });
    var after = availableActions(state);
    res.unlocked = after.filter(function (x) { return before.indexOf(x.action.key) < 0; }).map(function (x) { return x.action; });
    if (state.points <= 0) { state.points = 0; state.visitEnded = true; res.visitEnded = true; }
    return res;
  }
  function endVisit(state) { state.visitEnded = true; state.log.push({ t: 'endVisit' }); }
  function classify(state, id, cls, clause) {
    if (state.collected.indexOf(id) < 0) return false;
    var cur = state.cls[id] || { cls: '', clause: '' };
    if (cls !== undefined && cls !== null) { if (cls && CLASSES.indexOf(cls) < 0) return false; cur.cls = cls; }
    if (clause !== undefined && clause !== null) cur.clause = clause;
    state.cls[id] = cur;
    return true;
  }
  function addFinding(state, f) {
    var fid = 'F' + state.nextFinding++;
    state.findings.push({ id: fid, clause: f.clause || '', evidence: (f.evidence || []).filter(function (id) { return state.collected.indexOf(id) >= 0; }), statement: f.statement || '' });
    return fid;
  }
  function updateFinding(state, fid, f) {
    var x = state.findings.filter(function (y) { return y.id === fid; })[0];
    if (!x) return false;
    if (f.clause !== undefined) x.clause = f.clause;
    if (f.evidence !== undefined) x.evidence = f.evidence.filter(function (id) { return state.collected.indexOf(id) >= 0; });
    if (f.statement !== undefined) x.statement = f.statement;
    return true;
  }
  function removeFinding(state, fid) { state.findings = state.findings.filter(function (y) { return y.id !== fid; }); }
  function setActions(state, cat, keys) { state.actions[cat] = keys.slice(); }
  function decide(state, did, idx, justification) { state.decisions[did] = idx; if (justification !== undefined) state.justifications[did] = justification; }
  function closeCase(state) { state.visitEnded = true; state.closed = true; }

  /* ---------- hints (logged, never scored) ---------- */
  // Family of a clause: 8.5.2 -> 8.5; 8.4 -> 8.
  function clauseFamily(cl) { var p = String(cl).split('.'); return p.length > 2 ? p[0] + '.' + p[1] : p[0]; }
  function hotspotOf(gen, evId) {
    for (var i = 0; i < gen.hotspots.length; i++) for (var j = 0; j < gen.hotspots[i].actions.length; j++) if (gen.hotspots[i].actions[j].evidenceId === evId) return { h: gen.hotspots[i], a: gen.hotspots[i].actions[j] };
    return null;
  }
  function hint(state, clauseTitles) {
    var gen = state.gen;
    var flagged = function (id) { var c = state.cls[id]; return c && (c.cls === 'nonconformity' || c.cls === 'observation'); };
    var target = null, mode = 'site';
    // First: a planted issue not yet collected that can be reached now (or whose unlocker can be).
    for (var i = 0; i < gen.planted.length && !target; i++) {
      var id = gen.planted[i];
      if (state.collected.indexOf(id) >= 0) continue;
      var ev = gen.evidence[id];
      if (isUnlocked(state, ev)) target = id;
      else { var u = ev.unlockedBy.filter(function (x) { return gen.evidence[x] && state.collected.indexOf(x) < 0; })[0]; if (u) target = u; }
    }
    if (target && state.visitEnded) target = null;
    if (!target) {
      mode = 'notebook';
      for (var k = 0; k < gen.planted.length && !target; k++) if (state.collected.indexOf(gen.planted[k]) >= 0 && !flagged(gen.planted[k])) target = gen.planted[k];
    }
    if (!target) {
      var entry0 = { level: 0, text: state.visitEnded ? 'No further hints are available for the evidence gathered. Review your findings and action plan, then close the case.' : 'Every planted issue you can reach has been noticed. Check that each one has a finding and a clause link.' };
      state.hints.push(entry0);
      return entry0;
    }
    if (state.hintTarget !== target) { state.hintTarget = target; state.hintLevel = 0; }
    state.hintLevel = Math.min(3, state.hintLevel + 1);
    var loc = hotspotOf(gen, target), ev2 = gen.evidence[target];
    var fam = clauseFamily(ev2.clauses[0]);
    var famTitle = clauseTitles && clauseTitles[fam] ? ' (' + clauseTitles[fam] + ')' : '';
    var text;
    if (mode === 'site') {
      if (state.hintLevel === 1) text = 'Area worth another look: ' + loc.h.name + '.';
      else if (state.hintLevel === 2) text = 'Clause family to think about: ' + fam + famTitle + '.';
      else text = 'Next card to open: ' + loc.h.name + ', ' + loc.a.verb + ': ' + loc.a.label + '.';
    } else {
      if (state.hintLevel === 1) text = 'A card already in your Notebook deserves a second reading. It came from: ' + loc.h.name + '.';
      else if (state.hintLevel === 2) text = 'Clause family to think about for that card: ' + fam + famTitle + '.';
      else text = 'Re-read the card from ' + loc.a.verb + ': ' + loc.a.label + ', and decide whether it shows a requirement that was not met.';
    }
    var entry = { level: state.hintLevel, text: text, target: target };
    state.hints.push(entry);
    state.log.push({ t: 'hint', level: state.hintLevel });
    return entry;
  }

  /* ---------- scoring (D.6.3) ---------- */
  function issueOf(gen, id) { var ev = gen.evidence[id]; if (!ev) return null; if (ev.supports) return ev.supports; return isIssue(ev) ? id : null; }

  // Rubric for one finding statement, 0 to 4. An automatic estimate that supports, not replaces, instructor review.
  function statementRubric(f, gen) {
    var s = String(f.statement || '').trim();
    var words = s ? s.split(/\s+/).length : 0;
    var lower = ' ' + s.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ') + ' ';
    var cited = f.evidence.map(function (id) { return gen.evidence[id]; }).filter(Boolean);
    var citedClauses = []; cited.forEach(function (ev) { citedClauses = citedClauses.concat(ev.clauses); });
    var r = { requirement: 0, evidence: 0, neutral: 0, clear: 0, notes: [] };
    if (f.clause && citedClauses.indexOf(f.clause) >= 0 && cited.some(function (ev) { return isIssue(ev); })) r.requirement = 1;
    else r.notes.push(f.clause ? 'The requirement chosen does not match the cited evidence.' : 'No requirement (clause) was chosen.');
    var refs = [];
    cited.forEach(function (ev) { (ev.text.match(/[A-Za-z]*[-\/]?\d[\w\-\/.]*/g) || []).forEach(function (t) { t = t.replace(/[.]+$/, ''); if (/\d/.test(t)) refs.push(t.toLowerCase()); }); });
    var sl = s.toLowerCase();
    if (cited.length && refs.some(function (t) { return sl.indexOf(t) >= 0; })) r.evidence = 1;
    else r.notes.push(cited.length ? 'Name the specific record, item, or reference number seen.' : 'No evidence card was cited.');
    var judg = JUDGMENT_WORDS.filter(function (w) { return lower.indexOf(' ' + w + ' ') >= 0; });
    var shout = /!/.test(s) || /\b[A-Z]{4,}\b/.test(s.replace(/\b[A-Z0-9]*\d[A-Z0-9]*\b/g, ''));
    if (words >= 6 && !judg.length && !shout) r.neutral = 1;
    else r.notes.push(judg.length ? 'Avoid judgmental words: ' + judg.join(', ') + '.' : (shout ? 'Keep the tone calm: no exclamation marks or capital-letter emphasis.' : 'The statement is too short to judge its tone.'));
    if (words >= 12 && words <= 90 && /[.]\s*$/.test(s) && !/\[|\]/.test(s)) r.clear = 1;
    else r.notes.push(/\[|\]/.test(s) ? 'Replace every bracketed placeholder with facts.' : (words < 12 ? 'Write a complete sentence of at least 12 words.' : (words > 90 ? 'Shorten the statement to 90 words or fewer.' : 'End the statement with a full stop.')));
    r.total = r.requirement + r.evidence + r.neutral + r.clear;
    return r;
  }

  function actionScores(state) {
    var gen = state.gen, out = {};
    if (!gen.actionOptions) return out;
    ACTION_CATS.forEach(function (cat) {
      var sel = state.actions[cat] || [];
      var opts = gen.actionOptions[cat] || [];
      var exp = sel.filter(function (k) { return opts.some(function (o) { return o.key === k && o.expected; }); }).length;
      var dis = sel.filter(function (k) { return opts.some(function (o) { return o.key === k && !o.expected; }); }).length;
      out[cat] = exp > 0 ? (dis === 0 ? 1 : 0.5) : 0;
    });
    return out;
  }

  function score(state) {
    var gen = state.gen;
    var flaggedCls = function (id) { var c = state.cls[id]; return c && (c.cls === 'nonconformity' || c.cls === 'observation'); };
    // Coverage: planted issues found / planted issues present.
    var found = {};
    state.collected.forEach(function (id) { var iss = issueOf(gen, id); if (iss && flaggedCls(id)) found[iss] = true; });
    state.findings.forEach(function (f) { f.evidence.forEach(function (id) { var iss = issueOf(gen, id); if (iss) found[iss] = true; }); });
    var foundList = gen.planted.filter(function (id) { return found[id]; });
    var coverage = pct(foundList.length, gen.planted.length);
    // Precision: valid findings / findings submitted. Submitted = written findings plus cards recorded as observations.
    var submitted = 0, valid = 0, falseItems = [];
    state.findings.forEach(function (f) {
      submitted++;
      if (f.evidence.some(function (id) { return issueOf(gen, id); })) valid++;
      else falseItems.push({ kind: 'finding', id: f.id, evidence: f.evidence.slice() });
    });
    state.collected.forEach(function (id) {
      var c = state.cls[id];
      if (c && c.cls === 'observation') {
        submitted++;
        if (issueOf(gen, id)) valid++; else falseItems.push({ kind: 'observation', id: id, evidence: [id] });
      }
    });
    var precision = pct(valid, submitted);
    // Mapping accuracy: correct clause links / links made (Notebook links).
    var links = 0, correct = 0, mapDetail = [];
    state.collected.forEach(function (id) {
      var c = state.cls[id];
      if (c && c.clause) { links++; var ok = gen.evidence[id].clauses.indexOf(c.clause) >= 0; if (ok) correct++; mapDetail.push({ id: id, chosen: c.clause, ok: ok }); }
    });
    var mapping = pct(correct, links);
    // Statement quality: mean rubric score (0 to 4) across written findings.
    var rubrics = state.findings.map(function (f) { return { id: f.id, r: statementRubric(f, gen) }; });
    var statement = rubrics.length ? rubrics.reduce(function (n, x) { return n + x.r.total; }, 0) / rubrics.length : NA;
    // Action soundness: share of the five action elements that are present and proportionate.
    var as = actionScores(state);
    var cats = Object.keys(as);
    var action = cats.length ? cats.reduce(function (n, k) { return n + as[k]; }, 0) / cats.length : NA;
    // Decisions (reported separately; feeds the Judgment branch).
    var dTotal = gen.decisions.length, dBest = 0;
    gen.decisions.forEach(function (d) { if (state.decisions[d.id] === d.bestIndex) dBest++; });
    var decision = pct(dBest, dTotal);
    var mask = 0; gen.planted.forEach(function (id, i) { if (found[id] && i < 10) mask |= (1 << i); });
    return {
      coverage: round2(coverage), precision: round2(precision), mapping: round2(mapping), statement: statement === NA ? NA : Math.round(statement * 10) / 10, action: round2(action), decision: round2(decision),
      foundIds: foundList, foundMask: mask, plantedCount: gen.planted.length, submitted: submitted, valid: valid, falseItems: falseItems,
      links: links, correctLinks: correct, mapDetail: mapDetail, rubrics: rubrics, actionByCat: as, hintsUsed: state.hints.length, pointsLeft: state.points
    };
  }

  /* ---------- skill map ---------- */
  function branchValues(state, sc) {
    var gen = state.gen;
    var noise = state.collected.filter(function (id) { var k = gen.evidence[id].kind; return k === 'conforming' || k === 'redHerring'; });
    var noiseFlagged = noise.filter(function (id) { var c = state.cls[id]; return c && (c.cls === 'nonconformity' || c.cls === 'observation'); }).length
      + sc.falseItems.filter(function (x) { return x.kind === 'finding'; }).length;
    var noiseScore = noise.length ? Math.max(0, 1 - noiseFlagged / noise.length) : 1;
    var a = sc.actionByCat;
    var v = {};
    v.Evidence = sc.coverage === NA ? NA : 0.7 * sc.coverage + 0.3 * noiseScore;
    v.Mapping = sc.mapping;
    v.Cause = a.cause === undefined ? NA : a.cause;
    var ctl = ['containment', 'correction', 'corrective', 'effectiveness'].filter(function (k) { return a[k] !== undefined; });
    v.Control = ctl.length ? ctl.reduce(function (n, k) { return n + a[k]; }, 0) / ctl.length : NA;
    var j = [sc.decision, sc.precision].filter(function (x) { return x !== NA; });
    v.Judgment = j.length ? j.reduce(function (n, x) { return n + x; }, 0) / j.length : NA;
    Object.keys(v).forEach(function (k) { v[k] = round2(v[k]); });
    return v;
  }
  function marker(v) { if (v === NA || v === undefined) return 'Not yet shown'; return v >= 0.8 ? 'Strong' : (v >= 0.5 ? 'Competent' : 'Emerging'); }
  // attempts: [{caseId, type, branches:{...}}]; uses the latest attempt per case.
  function skillMap(attempts) {
    var latest = {};
    attempts.forEach(function (a) { latest[a.caseId] = a; });
    var out = {};
    BRANCHES.forEach(function (b) {
      var vals = Object.keys(latest).map(function (k) { return latest[k].branches ? latest[k].branches[b] : NA; }).filter(function (x) { return x !== NA && x !== undefined; });
      var v = vals.length ? round2(vals.reduce(function (n, x) { return n + x; }, 0) / vals.length) : NA;
      out[b] = { value: v, marker: marker(v), cases: vals.length };
    });
    return out;
  }
  // Suggests the next case: the weakest branch first, preferring cases not yet attempted.
  function recommendNext(map, attemptedIds, cases) {
    var order = BRANCHES.slice().sort(function (x, y) {
      var a = map[x].value === NA ? -1 : map[x].value, b = map[y].value === NA ? -1 : map[y].value;
      return a - b || BRANCHES.indexOf(x) - BRANCHES.indexOf(y);
    });
    for (var i = 0; i < order.length; i++) {
      var br = order[i];
      var c = cases.filter(function (k) { return k.branches[0] === br && attemptedIds.indexOf(k.id) < 0; })[0]
        || cases.filter(function (k) { return k.branches.indexOf(br) >= 0 && attemptedIds.indexOf(k.id) < 0; })[0];
      if (c) return { caseId: c.id, branch: br, reason: 'Builds the ' + br + ' branch, which is ' + (map[br].value === NA ? 'not yet shown' : 'currently ' + map[br].marker.toLowerCase()) + '.' };
    }
    var weakest = order[0];
    var again = cases.filter(function (k) { return k.branches[0] === weakest; })[0] || cases[0];
    return again ? { caseId: again.id, branch: weakest, reason: 'All cases are attempted. Replay with a new seed to strengthen the ' + weakest + ' branch.' } : null;
  }

  /* ---------- debrief ---------- */
  var MEASURE_TEXT = {
    coverage: 'Planted issues found divided by planted issues present. An issue counts as found when one of its cards is recorded as a nonconformity or observation, or is cited in a finding.',
    precision: 'Valid findings divided by findings submitted (written findings plus cards recorded as observations). A finding on conforming evidence lowers it.',
    mapping: 'Correct clause links divided by clause links made in the Notebook.',
    statement: 'Average rubric score per finding, 0 to 4: states the requirement, cites specific evidence, is factual and neutral, and is understandable. This is an automatic estimate for the instructor to confirm.',
    action: 'Share of the five action elements (containment, correction, cause, corrective action, effectiveness check) that are present and proportionate. Choosing only sound options scores in full; mixing in a weak option scores half.',
    decision: 'Decisions that match the best-supported answer, with the reasoning shown below.'
  };
  function debrief(state, clauseTitles) {
    var gen = state.gen, sc = score(state);
    var statusOf = function (id) {
      var ev = gen.evidence[id], c = state.cls[id], collected = state.collected.indexOf(id) >= 0;
      var flagged = c && (c.cls === 'nonconformity' || c.cls === 'observation');
      var cited = state.findings.some(function (f) { return f.evidence.indexOf(id) >= 0; });
      if (!collected) return { code: 'unseen', label: 'Not examined', mark: '–' };
      if (isIssue(ev)) return (flagged || cited) ? { code: 'found', label: 'Found', mark: '✓' } : { code: 'missed', label: 'Collected, not identified as an issue', mark: '○' };
      if (flagged || cited) return { code: 'false', label: 'Reported as an issue, but conforming', mark: '✗' };
      if (c && c.cls === 'conforming') return { code: 'ok', label: 'Correctly treated as conforming', mark: '✓' };
      return { code: 'open', label: 'Collected, not classified', mark: '○' };
    };
    var map = gen.hotspots.map(function (h) {
      return { name: h.name, group: h.group, items: h.actions.filter(function (a) { return a.evidenceId; }).map(function (a) {
        var ev = gen.evidence[a.evidenceId];
        return { id: ev.id, verb: a.verb, label: a.label, kind: ev.kind, supports: ev.supports, status: statusOf(ev.id) };
      }) };
    });
    var expected = gen.planted.map(function (id) {
      var ev = gen.evidence[id];
      var sup = gen.included.filter(function (x) { return gen.evidence[x].supports === id; });
      return { id: id, kind: ev.kind, clauses: ev.clauses, text: ev.text, supports: sup, found: sc.foundIds.indexOf(id) >= 0, why: ev.whyItMatters, missed: ev.missedExplanation };
    });
    var missed = expected.filter(function (x) { return !x.found; });
    var falseRev = [];
    sc.falseItems.forEach(function (fi) {
      fi.evidence.forEach(function (id) { var ev = gen.evidence[id]; if (ev) falseRev.push({ id: id, text: ev.text, kind: ev.kind, why: ev.falseFindingNote || ev.whyItMatters }); });
      if (!fi.evidence.length) falseRev.push({ id: fi.id, text: 'Finding ' + fi.id + ' cites no evidence.', kind: 'none', why: 'A finding must rest on specific, verifiable evidence.' });
    });
    var herrings = gen.included.filter(function (id) { return gen.evidence[id].kind === 'redHerring'; }).map(function (id) {
      var ev = gen.evidence[id]; return { id: id, text: ev.text, status: statusOf(id), why: ev.falseFindingNote || ev.whyItMatters };
    });
    var decisions = gen.decisions.map(function (d) {
      var ch = state.decisions[d.id];
      return { id: d.id, prompt: d.prompt, chosen: ch === undefined ? null : ch, chosenText: ch === undefined ? 'No decision recorded' : d.options[ch], best: d.bestIndex, bestText: d.options[d.bestIndex], rationale: d.rationale,
        feedback: (d.optionFeedback && ch !== undefined) ? d.optionFeedback[ch] : '', justification: state.justifications[d.id] || '' };
    });
    var notes = [];
    if (missed.length) notes.push(missed[0].missed);
    if (falseRev.length) notes.push('A record can look unusual and still conform. ' + (falseRev[0].why || ''));
    if (sc.links && sc.mapping !== NA && sc.mapping < 0.8) notes.push('Link each card to the clause that states the specific requirement, not the broad topic. A wrong link weakens an otherwise sound finding.');
    if (sc.actionByCat.cause === 0) notes.push('A cause that names a person stops the analysis too early. Ask what in the system allowed the event, and what would stop it for anyone in that role.');
    if (sc.actionByCat.effectiveness === 0) notes.push('An action is not complete until someone checks, after a defined period, that the problem has not returned.');
    if (state.points > 0) notes.push('You closed the visit with ' + state.points + ' visit point' + (state.points === 1 ? '' : 's') + ' unused. This does not change any measure. It may mean an area was left unexamined.');
    if (!notes.length) notes.push(gen.debriefText.found);
    return {
      measures: {
        coverage: { value: sc.coverage, detail: sc.foundIds.length + ' of ' + sc.plantedCount + ' planted issues found', text: MEASURE_TEXT.coverage },
        precision: { value: sc.precision, detail: sc.submitted ? sc.valid + ' of ' + sc.submitted + ' submitted findings and observations are valid' : 'No findings submitted', text: MEASURE_TEXT.precision },
        mapping: { value: sc.mapping, detail: sc.links ? sc.correctLinks + ' of ' + sc.links + ' clause links correct' : 'No clause links made', text: MEASURE_TEXT.mapping },
        statement: { value: sc.statement, detail: sc.rubrics.length ? 'Average of ' + sc.rubrics.length + ' finding' + (sc.rubrics.length === 1 ? '' : 's') + ', out of 4' : 'No findings written', text: MEASURE_TEXT.statement },
        action: { value: sc.action, detail: sc.action === NA ? 'No action plan in this case' : ACTION_CATS.map(function (k) { return ACTION_LABEL[k] + ': ' + (sc.actionByCat[k] === 1 ? 'sound' : (sc.actionByCat[k] === 0.5 ? 'partly sound' : 'missing')); }).join('; '), text: MEASURE_TEXT.action }
      },
      decision: { value: sc.decision, text: MEASURE_TEXT.decision },
      score: sc, coverageMap: map, expected: expected, missed: missed, falseFindings: falseRev, redHerrings: herrings, decisions: decisions,
      expectedActions: gen.expectedActions, actionFocus: gen.actionFocus, marginNotes: notes, hints: state.hints.slice(), branches: branchValues(state, sc),
      text: gen.debriefText, pointsLeft: state.points
    };
  }

  /* ---------- results code ---------- */
  function enc(v, max) { return v === NA || v === undefined ? 1023 : Math.max(0, Math.min(max, Math.round(v))); }
  function dec(n) { return n === 1023 ? NA : n; }
  function dayNumber(date) { var d = date instanceof Date ? date : new Date(date); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 86400000); }
  function dateFromDay(n) { var d = new Date(EPOCH + n * 86400000); return d.toISOString().slice(0, 10); }
  function checksum(s) { return toB32(fnv('cb|' + s) % 1024, 2); }
  // Results code: <case code>.<payload>.<check>[ ~ learner label]. A training aid, not a tamper-proof record.
  function encodeResult(r) {
    var m = r.measures;
    var payload = toB32(VERSION, 1) + toB32(enc(m.coverage === NA ? NA : m.coverage * 100, 100), 2) + toB32(enc(m.precision === NA ? NA : m.precision * 100, 100), 2) +
      toB32(enc(m.mapping === NA ? NA : m.mapping * 100, 100), 2) + toB32(enc(m.statement === NA ? NA : m.statement * 10, 40), 2) +
      toB32(enc(m.action === NA ? NA : m.action * 100, 100), 2) + toB32(enc(m.decision === NA ? NA : m.decision * 100, 100), 2) +
      toB32(Math.max(0, Math.min(32767, dayNumber(r.date || new Date()))), 3) + toB32((r.foundMask || 0) & 1023, 2) + toB32(Math.min(31, r.plantedCount || 0), 1);
    var label = String(r.learner || '').replace(/[\r\n~]/g, ' ').trim().slice(0, 40);
    var body = r.code + '.' + payload;
    return body + '.' + checksum(body + '|' + label) + (label ? ' ~ ' + label : '');
  }
  function decodeResult(str) {
    var s = String(str || '').trim();
    if (!s) return { error: 'Empty line.' };
    var label = '';
    var t = s.indexOf('~');
    if (t >= 0) { label = s.slice(t + 1).trim(); s = s.slice(0, t).trim(); }
    var parts = s.split('.');
    if (parts.length !== 3) return { error: 'A results code has three parts separated by full stops.' };
    var cc = parseCode(parts[0]);
    if (cc.error) return { error: cc.error };
    var p = normB32(parts[1]);
    if (p.length !== 19) return { error: 'The results part of the code has the wrong length.' };
    var body = cc.code + '.' + p;
    if (normB32(parts[2]) !== checksum(body + '|' + label)) return { error: 'The check characters do not match. The code may have been mistyped.' };
    var n = function (a, b) { return fromB32(p.slice(a, b)); };
    if (n(0, 1) !== VERSION) return { error: 'Unknown results code version.' };
    var cov = dec(n(1, 3)), pre = dec(n(3, 5)), map = dec(n(5, 7)), st = dec(n(7, 9)), ac = dec(n(9, 11)), de = dec(n(11, 13));
    return {
      code: cc.code, pack: cc.pack, type: cc.type, seed: cc.seed, learner: label, date: dateFromDay(n(13, 16)),
      measures: { coverage: cov === NA ? NA : cov / 100, precision: pre === NA ? NA : pre / 100, mapping: map === NA ? NA : map / 100, statement: st === NA ? NA : st / 10, action: ac === NA ? NA : ac / 100, decision: de === NA ? NA : de / 100 },
      foundMask: n(16, 18), plantedCount: n(18, 19)
    };
  }

  /* ---------- drills ---------- */
  // Repeat-until-secure queue: a missed item returns to the end of the queue until answered correctly.
  function drillSession(items, seed) {
    var rng = rngFor(seed || 1, 'drill', 'order');
    return { queue: shuffle(items.map(function (x, i) { return i; }), rng), firstTry: {}, attempts: 0, items: items, seed: seed || 1 };
  }
  function drillAnswer(sess, idx, choice) {
    var it = sess.items[idx];
    var ok = choice === it.answer;
    sess.attempts++;
    if (sess.firstTry[idx] === undefined) sess.firstTry[idx] = ok;
    sess.queue.shift();
    if (!ok) sess.queue.push(idx);
    return ok;
  }
  function drillScore(sess) {
    var keys = Object.keys(sess.firstTry);
    var right = keys.filter(function (k) { return sess.firstTry[k]; }).length;
    return { answered: keys.length, firstTryCorrect: right, percent: keys.length ? Math.round(100 * right / sess.items.length) : 0, secure: sess.queue.length === 0 };
  }

  return {
    VERSION: VERSION, TYPES: TYPES, CAPSTONE: CAPSTONE, CLASSES: CLASSES, CLASS_LABEL: CLASS_LABEL, ACTION_CATS: ACTION_CATS, ACTION_LABEL: ACTION_LABEL, BRANCHES: BRANCHES,
    GENERIC_DISTRACTORS: GENERIC_DISTRACTORS, MEASURE_TEXT: MEASURE_TEXT,
    mulberry32: mulberry32, fnv: fnv, shuffle: shuffle, seedText: seedText, fromB32: fromB32, toB32: toB32, randomSeed: randomSeed,
    parseCode: parseCode, formatCode: formatCode, validateCase: validateCase, selectEvidence: selectEvidence, generate: generate, generateCapstone: generateCapstone, buildFromCode: buildFromCode,
    newVisit: newVisit, availableActions: availableActions, act: act, endVisit: endVisit, classify: classify, addFinding: addFinding, updateFinding: updateFinding, removeFinding: removeFinding,
    setActions: setActions, decide: decide, closeCase: closeCase, hint: hint, statementRubric: statementRubric, score: score, debrief: debrief,
    branchValues: branchValues, marker: marker, skillMap: skillMap, recommendNext: recommendNext, encodeResult: encodeResult, decodeResult: decodeResult, dayNumber: dayNumber,
    drillSession: drillSession, drillAnswer: drillAnswer, drillScore: drillScore, clauseFamily: clauseFamily
  };
})(typeof module !== 'undefined' && module.exports ? require('../quality-flow/engine.js').mulberry32 : CB_MULBERRY32);
if (typeof module !== 'undefined' && module.exports) module.exports = CB;
