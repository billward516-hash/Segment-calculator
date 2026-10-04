'use strict';
// Builds Audit Day (spec Section 8.2): the single-file game and its printable pack.
//   games/audit-day/template.html  ->  games/audit-day/index.html
//   games/printables/audit-day-dossier.html
// The dossier generator, scoring and printable sections live in adEngine() below. Its source is
// injected into the game, so the digital and printed versions use the same code and data.
// Run: node tools/build-audit-day.js [--pack <pack id>] [--seed 12345]
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const json = f => JSON.parse(read(f));
// Prevents "</script>" or "<!--" inside embedded JSON from ending the script block early.
const safe = o => JSON.stringify(o).replace(/</g, '\\u003c');

/* ======================================================================
   Engine (pure functions, no closures over this file; injected into the game)
   ====================================================================== */
function adEngine() {
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function pick(r, n) { return Math.floor(r() * n); }
  function parseDate(iso) { var p = String(iso).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function addDays(iso, n) { var d = new Date(parseDate(iso) + n * 86400000); return d.toISOString().slice(0, 10); }
  function fmt(iso) { var d = new Date(parseDate(iso)); return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function clauseList(c) { return String(c || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); }
  function clauseMatch(entered, accepted) { var e = String(entered || '').trim(); return !!e && accepted.indexOf(e) >= 0; }

  // Scenario that backs a planted item: the pack's own scenario for the clause, else the generic seed.
  function relatedScenario(scenarios, packId, clause, fallbackId) {
    var own = packId === 'generic' ? null : scenarios.filter(function (s) { return s.pack === packId && s.finding_type !== 'conforming' && clauseList(s.clause).indexOf(clause) >= 0; })[0];
    return own || scenarios.filter(function (s) { return s.id === fallbackId; })[0] || null;
  }

  function makeDossier(o) {
    var pack = o.pack, pr = o.profile, r = rng(o.seed), A = o.auditDate;
    var co = o.company || pack.company, term = pack.term[0], terms = pack.term[1];
    var year = +A.slice(0, 4), auditMonth = +A.slice(5, 7) - 1;
    var docs = [], planted = [], traps = [];
    function P(id, docId, clauses, category, title, where, model, fallback) {
      var sc = relatedScenario(o.scenarios, pack.id, clauses[0], fallback);
      planted.push({ id: id, docId: docId, clauses: clauses, category: category, title: title, where: where, model: model, scenarioId: sc ? sc.id : fallback });
    }

    // D1 Policy (conforming)
    docs.push({ id: 'D1', code: 'QP-01', title: 'Quality policy', paras: [
      co + ' delivers ' + terms + ' that meet what our customers have asked for and the rules that apply to our work.',
      'We set measurable quality objectives each year, publish the results, and review them at management review.',
      'Every employee may stop a process when a ' + term + ' may not meet requirements. We report problems openly and without blame.',
      'We improve our processes using data, audit results, and customer feedback. ' + pr.policyFocus,
      'Approved by the Managing Director on ' + fmt(year + '-01-15') + '. Reviewed at management review on ' + fmt(year + '-07-10') + '.'] });

    // D2 Objectives (conforming; one objective below target with an action raised)
    var below = pick(r, pr.objectives.length);
    docs.push({ id: 'D2', code: 'QO-' + year, title: 'Quality objectives chart, ' + year, intro: 'Results are posted monthly on the team board. Quarter 3 is the latest complete quarter.',
      head: ['Objective', 'Measure', 'Target', 'Q1', 'Q2', 'Q3', 'Owner', 'Status'],
      rows: pr.objectives.map(function (ob, i) {
        var t = ob[2], q = ob[3];
        return [ob[0], ob[1], t, q[0], q[1], i === below ? ob[4] : q[2], 'Manager ' + String.fromCharCode(65 + i), i === below ? 'Below target in Q3. Action A-' + (20 + i) + ' raised; owner and review date set.' : 'On target'];
      }) });
    traps.push({ docId: 'D2', text: 'One objective is below target in Q3, but an action with an owner and date is recorded.', why: 'Missing a target is not a nonconformity when the result is monitored and action is taken.' });

    // D3 Document register and point-of-use check (one outdated)
    var ins = pr.instructions.slice(0, 3), bad3 = pick(r, ins.length);
    var rows3 = ins.map(function (d, i) {
      var cur = 3 + ((i * 2 + o.seed) % 4), appr = addDays(A, -(20 + i * 30));
      var found = i === bad3 ? (cur - 1) : cur;
      return [d[0], d[1], 'Rev ' + cur, fmt(appr), 'Rev ' + found, d[2]];
    });
    docs.push({ id: 'D3', code: 'DR-01', title: 'Document register extract and point-of-use check', intro: 'Three controlled instructions and the revision found at the point of use during the audit walk-through.',
      head: ['Code', 'Title', 'Current revision (register)', 'Approved', 'Revision found at point of use', 'Location'], rows: rows3 });
    var d3 = rows3[bad3];
    P('P1', 'D3', ['7.5.3'], 'minor', 'Outdated instruction in use', d3[0] + ' ' + d3[1] + ': register shows ' + d3[2] + ' approved ' + d3[3] + '; ' + d3[4] + ' found at ' + d3[5] + '.',
      'Documented information must be controlled so that only the current version is available where it is used. ' + d3[0] + ' ' + d3[4] + ' was in use at ' + d3[5] + ' although ' + d3[2] + ' was approved on ' + d3[3] + '.', 'S001');

    // D4 Calibration and verification log (one overdue and in use; one overdue but withdrawn)
    var inst = pr.instruments.slice(0, 5), bad4 = pick(r, inst.length), tag4 = (bad4 + 1 + pick(r, inst.length - 1)) % inst.length;
    var rows4 = inst.map(function (m, i) {
      var interval = m[3] || 365, due, status;
      if (i === bad4) { due = addDays(A, -(20 + pick(r, 25))); status = 'In use'; }
      else if (i === tag4) { due = addDays(A, -(10 + pick(r, 20))); status = 'Withdrawn. Tagged "do not use" on ' + fmt(addDays(due, -1)) + '; awaiting service.'; }
      else { due = addDays(A, 15 + pick(r, 150)); status = 'In use'; }
      return [m[0], m[1], m[2], fmt(addDays(due, -interval)), fmt(due), status];
    });
    docs.push({ id: 'D4', code: 'CL-01', title: 'Calibration and verification log for measuring resources', intro: 'Audit date: ' + fmt(A) + '. Each resource must be calibrated or verified before its due date while it is in use.',
      head: ['ID', 'Resource', 'Location', 'Last calibrated or verified', 'Next due', 'Status'], rows: rows4 });
    var d4 = rows4[bad4];
    P('P2', 'D4', ['7.1.5'], 'major', 'Measuring resource overdue and in use', d4[0] + ' ' + d4[1] + ' (' + d4[2] + '): due ' + d4[4] + ', status "In use".',
      'Measuring resources used to show conformity must be calibrated or verified at set intervals. ' + d4[0] + ' ' + d4[1] + ' was due on ' + d4[4] + ' and is still in use at ' + d4[2] + '; no assessment of results since the due date was found.', 'S002');
    traps.push({ docId: 'D4', text: rows4[tag4][0] + ' ' + rows4[tag4][1] + ' is past its due date but is withdrawn and tagged out of use.', why: 'An overdue resource that is clearly removed from use is under control.' });

    // D5 Training matrix (one rostered task with no record; one supervised trainee)
    var tasks = pr.tasks.slice(0, 4), people = [];
    for (var i = 0; i < 5; i++) people.push('P-0' + (i + 1) + ' ' + (i === 4 ? 'Supervisor' : pr.roles[i % pr.roles.length]));
    var gapP = pick(r, 4), gapT = pick(r, tasks.length), trnP = (gapP + 1) % 4, trnT = (gapT + 1) % tasks.length;
    var rows5 = people.map(function (p, pi) {
      var cells = tasks.map(function (t, ti) {
        if (pi === gapP && ti === gapT) return 'No record';
        if (pi === trnP && ti === trnT) return 'In training, supervised by P-05';
        var qm = (pi * 3 + ti * 2) % 12, qy = year - 1 + ((pi + ti) % 2);
        if (qy === year && qm >= auditMonth) qy = year - 1;
        if (pi === 4 || (pi + ti) % 3 !== 2) return 'Qualified ' + MONTHS[qm] + ' ' + qy;
        return 'Not required';
      });
      var rost = tasks.filter(function (t, ti) { return cells[ti] !== 'Not required'; });
      if (pi === trnP) rost = rost.map(function (t) { return t === tasks[trnT] ? t + ' (with P-05)' : t; });
      return [p].concat(cells).concat([rost.join('; ')]);
    });
    docs.push({ id: 'D5', code: 'TM-01', title: 'Training and qualification matrix', intro: 'The last column shows the tasks each person is rostered to perform this week.',
      head: ['Person'].concat(tasks).concat(['Rostered this week']), rows: rows5 });
    P('P3', 'D5', ['7.2'], 'minor', 'Task performed with no qualification record', people[gapP] + ' is rostered for "' + tasks[gapT] + '" with no qualification record.',
      'People doing work that affects quality must be competent, and evidence of competence must be kept. ' + people[gapP] + ' is rostered to perform "' + tasks[gapT] + '" this week; the training matrix shows no qualification record for that task.', 'S003');
    traps.push({ docId: 'D5', text: people[trnP] + ' is in training for "' + tasks[trnT] + '" and is rostered only with supervision.', why: 'Supervised training is a normal and controlled way to build competence.' });

    // D6 Two completed work item records (one with a missing final check sign-off)
    var badRec = pick(r, 2), recIds = ['WR-' + (2040 + pick(r, 50)), 'WR-' + (2100 + pick(r, 50))];
    var st = pack.stages;
    function recRows(missing, start) {
      return st.map(function (s, si) {
        var who = 'P-0' + ((si % 4) + 1), day = fmt(addDays(start, Math.floor(si / 2)));
        var res = si === 4 ? 'Pass, all checks complete' : 'Complete';
        if (missing && si === 4) return [s, 'Pass', '(blank)', day];
        if (si === 5) return [s, 'Released to customer', 'P-05', day];
        return [s, res, who, day];
      });
    }
    var recStart = [addDays(A, -12), addDays(A, -6)];
    docs.push({ id: 'D6', code: 'WR', title: 'Completed ' + term + ' records (two samples)', intro: 'Each stage must be signed by the person who performed or checked it before the ' + term + ' is released.',
      sub: [0, 1].map(function (k) { return { title: 'Record ' + recIds[k], head: ['Stage', 'Result', 'Signed by', 'Date'], rows: recRows(k === badRec, recStart[k]) }; }) });
    P('P4', 'D6', ['8.6', '8.5.1'], 'major', 'Released with the final check unsigned', 'Record ' + recIds[badRec] + ': "' + st[4] + '" has no signature, yet the ' + term + ' was released.',
      'Release must not proceed until the planned checks are complete and the release record identifies the person who authorized it. Record ' + recIds[badRec] + ' shows "' + st[4] + '" unsigned, and the ' + term + ' was released to the customer.', 'S007');

    // D7 Nonconformance log (one open past due; one open with an approved extension)
    var ncs = pr.ncs.slice(0, 4), bad7 = pick(r, ncs.length), ext7 = (bad7 + 2) % ncs.length;
    var rows7 = ncs.map(function (n, i) {
      var raised = addDays(A, -(90 - i * 18)), due = addDays(raised, 30);
      if (i === bad7) { raised = addDays(A, -(60 + pick(r, 15))); due = addDays(raised, 30); return ['NC-' + (311 + i), fmt(raised), n, 'Correction done; cause analysis pending', 'Manager ' + 'BCDE'[i], fmt(due), 'Open']; }
      if (i === ext7) { raised = addDays(A, -40); due = addDays(raised, 30); return ['NC-' + (311 + i), fmt(raised), n, 'Correction done; cause found; action in progress', 'Manager ' + 'BCDE'[i], fmt(due) + '. Extended to ' + fmt(addDays(A, 21)) + '; reason recorded and approved', 'Open']; }
      return ['NC-' + (311 + i), fmt(raised), n, 'Correction, cause, and action complete; effectiveness checked', 'Manager ' + 'BCDE'[i], fmt(due), 'Closed ' + fmt(addDays(due, -5))];
    });
    docs.push({ id: 'D7', code: 'NC-LOG', title: 'Nonconformance and corrective action log', intro: 'Audit date: ' + fmt(A) + '. Actions must be completed by the due date or extended with a recorded reason.',
      head: ['No.', 'Raised', 'Description', 'Progress', 'Owner', 'Due', 'Status'], rows: rows7 });
    var d7 = rows7[bad7];
    P('P5', 'D7', ['10.2', '8.7'], 'minor', 'Corrective action open past its due date', d7[0] + ' "' + d7[2] + '": due ' + d7[5] + ', still open, no extension recorded.',
      'Corrective action must be taken to remove the cause of a nonconformity, and its effectiveness reviewed. ' + d7[0] + ' was due on ' + d7[5] + ' and remains open with the cause analysis pending and no recorded extension.', 'S009');
    traps.push({ docId: 'D7', text: rows7[ext7][0] + ' is open past its original date, but the extension is recorded and approved.', why: 'A justified, approved extension shows the action is still being managed.' });

    // D8 Approved provider list (one in use but not approved; one not approved and not used)
    var prov = pr.providers.slice(0, 5), bad8 = pick(r, prov.length), idle8 = (bad8 + 1 + pick(r, prov.length - 1)) % prov.length;
    var rows8 = prov.map(function (p, i) {
      var code = 'PRV-0' + (i + 1);
      if (i === bad8) return [code, p, 'Not approved (evaluation pending since ' + fmt(addDays(A, -75)) + ')', 'None', 'Not set', String(4 + pick(r, 6))];
      if (i === idle8) return [code, p, 'Not approved (evaluation pending)', 'None', 'Not set', '0'];
      var last = addDays(A, -(30 + i * 40));
      return [code, p, 'Approved', fmt(last), fmt(addDays(last, 365)), String(2 + pick(r, 12))];
    });
    docs.push({ id: 'D8', code: 'APL-01', title: 'Approved provider list', intro: 'Only approved providers may be used. The last column shows purchase orders issued this quarter.',
      head: ['Code', 'Provider', 'Approval status', 'Last evaluation', 'Next evaluation', 'Orders this quarter'], rows: rows8 });
    var d8 = rows8[bad8];
    P('P6', 'D8', ['8.4'], 'minor', 'Provider used without approval', d8[0] + ' ' + d8[1] + ': not approved, ' + d8[5] + ' orders this quarter.',
      'External providers must be evaluated and selected against defined criteria before use. ' + d8[0] + ' ' + d8[1] + ' is not approved, yet ' + d8[5] + ' orders were placed this quarter.', 'S014');
    traps.push({ docId: 'D8', text: rows8[idle8][0] + ' is not approved but has no orders.', why: 'A provider awaiting evaluation that is not used is not a nonconformity.' });

    // D9 Internal audit schedule (one skipped with no reason; one rescheduled with a reason)
    var procs = pr.processes.slice(0, 6), pastIdx = [], months = [];
    procs.forEach(function (p, i) { var m = (1 + i * 2) % 12; months.push(m); if (m < auditMonth) pastIdx.push(i); });
    var bad9 = pastIdx[pick(r, pastIdx.length)], moved9 = pastIdx.filter(function (x) { return x !== bad9; })[0];
    var rows9 = procs.map(function (p, i) {
      var m = MONTHS_LONG[months[i]] + ' ' + year;
      if (i === bad9) return [p, m, 'Not done', '(none)', '(blank)'];
      if (i === moved9) return [p, m, 'Rescheduled to ' + MONTHS_LONG[(auditMonth + 1) % 12] + ' ' + year, '(pending)', 'Process relocated; change approved by the quality manager'];
      if (months[i] < auditMonth) return [p, m, 'Done', 'IA-' + year + '-0' + (i + 1), 'None'];
      return [p, m, 'Planned', '(pending)', 'None'];
    });
    docs.push({ id: 'D9', code: 'IAP-' + year, title: 'Internal audit schedule, ' + year, intro: 'The schedule covers every process at least once a year. Changes must be justified and approved.',
      head: ['Process', 'Planned', 'Status', 'Report', 'Reason for change'], rows: rows9 });
    var d9 = rows9[bad9];
    P('P7', 'D9', ['9.2'], 'minor', 'Planned internal audit skipped', 'Audit of "' + d9[0] + '" planned for ' + d9[1] + ': not done, no reason or new date.',
      'Internal audits must be carried out at planned intervals according to the audit program. The audit of "' + d9[0] + '" planned for ' + d9[1] + ' was not done, and no reason or new date is recorded.', 'S010');
    if (moved9 != null) traps.push({ docId: 'D9', text: 'The audit of "' + rows9[moved9][0] + '" was rescheduled with a recorded and approved reason.', why: 'A justified program change is part of managing the program.' });
    traps.push({ docId: 'D1', text: 'The policy is approved, dated, and reviewed.', why: 'No gap is shown; do not report preferences as findings.' });

    return { company: co, packId: pack.id, packName: pack.name, term: term, terms: terms, auditDate: A, seed: o.seed, docs: docs, planted: planted, traps: traps };
  }

  // Scoring per spec 8.2. A finding links to a planted item by facilitator choice or, by default, by the dossier document.
  function linkOf(f, d) {
    if (f.link === 'none') return null;
    if (f.link) return f.link;
    var p = d.planted.filter(function (x) { return x.docId === f.doc; })[0];
    return p ? p.id : null;
  }
  function scoreTeam(team, d, pts) {
    var found = {}, worded = {}, unsupported = 0, rows = [];
    (team.findings || []).forEach(function (f, i) {
      var lid = linkOf(f, d), p = lid ? d.planted.filter(function (x) { return x.id === lid; })[0] : null;
      var correct = !!(p && clauseMatch(f.clause, p.clauses));
      var uns = f.unsupported != null ? !!f.unsupported : !p;
      if (correct) { found[p.id] = true; if (f.wellWorded) worded[p.id] = true; }
      if (uns) unsupported++;
      rows.push({ index: i, link: lid, correct: correct, unsupported: uns });
    });
    var obs = (team.observer || []).reduce(function (a, b) { return a + (+b || 0); }, 0);
    var nf = Object.keys(found).length, nw = Object.keys(worded).length;
    var total = nf * pts.found + nw * pts.wordingBonus - unsupported * pts.unsupportedPenalty + obs * pts.observerWeight;
    return { found: nf, foundIds: Object.keys(found), worded: nw, unsupported: unsupported, observer: obs, total: total, rows: rows };
  }

  function docHtml(doc) {
    var h = '<section class="doc" aria-labelledby="doc-' + doc.id + '"><h3 id="doc-' + doc.id + '">' + esc(doc.id + '  ' + doc.title) + ' <span class="docref">(' + esc(doc.code) + ')</span></h3>';
    if (doc.intro) h += '<p class="muted">' + esc(doc.intro) + '</p>';
    if (doc.paras) h += doc.paras.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    function tbl(head, rows) { return '<div class="tw"><table><thead><tr>' + head.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (rw) { return '<tr>' + rw.map(function (c, ci) { return ci === 0 ? '<th scope="row">' + esc(c) + '</th>' : '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>'; }
    if (doc.head) h += tbl(doc.head, doc.rows);
    if (doc.sub) h += doc.sub.map(function (s) { return '<h4>' + esc(s.title) + '</h4>' + tbl(s.head, s.rows); }).join('');
    return h + '</section>';
  }

  var OBSERVER = [
    ['Open questions', 'Asks "show me" and "how do you" questions instead of yes or no questions.'],
    ['Evidence over opinion', 'Bases each statement on a record, an observation, or an interview answer.'],
    ['Impartiality', 'Treats auditees with respect, does not lead or blame, and does not audit own work.'],
    ['Clear finding statements', 'Each finding states the requirement, the evidence, and what was not met.']
  ];
  var ROUNDS = [
    ['Planning', 'Choose three processes to sample. Assign the lead auditor, auditors, auditees, and observer. Prepare questions.'],
    ['Evidence gathering', 'Interview the auditees and review the dossier records. Auditees answer from the dossier only and may not invent evidence.'],
    ['Findings', 'Write each finding with the clause, the evidence, and the category: major, minor, or observation.'],
    ['Closing meeting', 'Present findings. Auditees may ask clarifying questions. Do not argue the classification.'],
    ['Corrective action planning', 'Auditees draft a response for each finding: correction, cause, corrective action, and effectiveness check.']
  ];
  var DEBRIEF = [
    'Which findings were easiest to detect, and which were hardest? Why?',
    'Which items looked like problems but were under control? What evidence showed that?',
    'How should an auditee respond to a finding?',
    'What distinguishes a finding from an observation?',
    'Which clause does each planted issue relate to, and who in your workplace owns that control?'
  ];

  // Printable sections, shared by the in-game print view and the static printable file.
  function printSections(d, o) {
    var teams = o.teams || 4, mins = o.minutes || [10, 25, 15, 10, 15], pts = o.points, out = [];
    function page(h) { out.push('<div class="page">' + h + '</div>'); }
    page('<h1>Audit Day: ' + esc(d.company) + '</h1><p><b>Pack:</b> ' + esc(d.packName) + '. <b>Audit date in the dossier:</b> ' + esc(fmt(d.auditDate)) + '. <b>Dossier seed:</b> ' + esc(d.seed) + '.</p>' +
      '<h2>Roles</h2><ul><li><b>Lead auditor:</b> plans the sample, leads questions, writes findings.</li><li><b>Auditors:</b> gather evidence by interview and record review.</li><li><b>Auditees:</b> answer using the dossier only; they may not invent evidence.</li><li><b>Observer:</b> scores audit technique with the observer checklist.</li></ul>' +
      '<h2>Rounds</h2><table><thead><tr><th>Round</th><th>Minutes</th><th>Task</th></tr></thead><tbody>' + ROUNDS.map(function (rd, i) { return '<tr><td>' + (i + 1) + '. ' + esc(rd[0]) + '</td><td class="num">' + (mins[i] || '') + '</td><td>' + esc(rd[1]) + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<h2>Scoring</h2><ul><li>' + pts.found + ' point for each planted nonconformity found with the correct clause.</li><li>' + pts.wordingBonus + ' bonus point for each of those findings that is properly worded (requirement, evidence, statement of what was not met).</li><li>Minus ' + pts.unsupportedPenalty + ' point for each finding not supported by dossier evidence.</li><li>Observer checklist: 0 to 2 points on each of four criteria (maximum 8).</li></ul>' + o.notice);
    var dh = '<h1>Mini-organization dossier: ' + esc(d.company) + '</h1>';
    d.docs.forEach(function (doc, i) { dh += docHtml(doc); if (i === 3) { page(dh + o.notice); dh = '<h1>Dossier (continued)</h1>'; } });
    page(dh + o.notice);
    var form = function (t) {
      var b = '<h1>Finding form: Team ' + t + '</h1><p>Team members: ____________________________________________</p>';
      for (var k = 1; k <= 4; k++) b += '<table class="form"><tbody><tr><th style="width:22%">Finding ' + k + '</th><td>Document or area: ____________ Clause: ________ Category: major / minor / observation</td></tr><tr><th>Evidence</th><td class="blank2"></td></tr><tr><th>Finding statement</th><td class="blank2"></td></tr></tbody></table>';
      return b + o.notice;
    };
    for (var t = 1; t <= teams; t++) page(form(t));
    page('<h1>Corrective action response (round 5)</h1><p>Team: ________ Finding responded to: ________________</p><table class="form"><tbody>' +
      [['Correction', 'What will you do now to fix the problem found?'], ['Cause', 'Why did it happen? Go beyond the person to the process.'], ['Corrective action', 'What will stop it happening again?'], ['Effectiveness check', 'How and when will you confirm the action worked?']].map(function (x) { return '<tr><th style="width:22%">' + x[0] + '<br><small>' + x[1] + '</small></th><td class="blank3"></td></tr>'; }).join('') + '</tbody></table>' + o.notice);
    var oc = '<h1>Observer checklist</h1><p>Score each criterion 0 (not shown), 1 (partly shown), or 2 (shown consistently). Circle the score and note an example.</p>';
    oc += '<table><thead><tr><th>Criterion</th><th>What to look for</th><th>Score</th><th>Example heard or seen</th></tr></thead><tbody>' + OBSERVER.map(function (c) { return '<tr><td><b>' + esc(c[0]) + '</b></td><td>' + esc(c[1]) + '</td><td>0 &nbsp; 1 &nbsp; 2</td><td class="blank2"></td></tr>'; }).join('') + '<tr><td colspan="2"><b>Total (maximum 8)</b></td><td></td><td></td></tr></tbody></table><p>Team observed: ________ Observer: ________</p>' + o.notice;
    page(oc);
    var sh = '<h1>Scoring sheet</h1><table><thead><tr><th>Item</th>';
    for (t = 1; t <= teams; t++) sh += '<th>Team ' + t + '</th>';
    sh += '</tr></thead><tbody>' + d.planted.map(function (p) { var c = '<tr><td>' + esc(p.id + ' (' + p.docId + ') found with correct clause') + '</td>'; for (var k = 1; k <= teams; k++) c += '<td></td>'; return c + '</tr>'; }).join('');
    [['Wording bonus (well-worded findings)'], ['Unsupported findings (minus)'], ['Observer checklist (0 to 8)'], ['Total']].forEach(function (x) { sh += '<tr><td><b>' + x[0] + '</b></td>'; for (var k = 1; k <= teams; k++) sh += '<td></td>'; sh += '</tr>'; });
    page(sh + '</tbody></table><p class="muted">Keep the item list hidden from teams until the closing meeting: it is part of the answer key.</p>' + o.notice);
    var ak = '<h1>Facilitator answer key</h1><p>Seed ' + esc(d.seed) + ', pack ' + esc(d.packName) + '. Accept the clauses listed. Classification shown is illustrative; a certification body decides actual categories.</p>' +
      '<table><thead><tr><th>Item</th><th>Where</th><th>Clause</th><th>Category</th><th>Model finding</th><th>Scenario</th></tr></thead><tbody>' +
      d.planted.map(function (p) { return '<tr><td><b>' + esc(p.id) + '</b> ' + esc(p.title) + '</td><td>' + esc(p.docId + ': ' + p.where) + '</td><td>' + esc(p.clauses.join(' or ')) + '</td><td>' + esc(p.category) + '</td><td>' + esc(p.model) + '</td><td>' + esc(p.scenarioId) + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<h2>Items under control (do not report)</h2><ul>' + d.traps.map(function (x) { return '<li><b>' + esc(x.docId) + ':</b> ' + esc(x.text) + ' ' + esc(x.why) + '</li>'; }).join('') + '</ul>' +
      '<h2>Debrief questions</h2><ol>' + DEBRIEF.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol>' + o.notice;
    page(ak);
    return out.join('');
  }

  return { rng: rng, fmt: fmt, addDays: addDays, esc: esc, clauseList: clauseList, clauseMatch: clauseMatch, makeDossier: makeDossier, scoreTeam: scoreTeam, linkOf: linkOf, docHtml: docHtml, printSections: printSections, OBSERVER: OBSERVER, ROUNDS: ROUNDS, DEBRIEF: DEBRIEF };
}

/* ======================================================================
   Dossier vocabulary per pack (pack wording; generic is the fallback)
   instruments: [id, name, location, interval days]; objectives: [name, measure, target, [Q1,Q2,Q3], Q3 below target]
   ====================================================================== */
const PROFILES = {
  generic: {
    policyFocus: 'Managers provide the people, equipment, and time that quality work needs.',
    instructions: [['WI-210', 'Core process setup', 'Core process area'], ['WI-410', 'Final check method', 'Final check station'], ['WI-510', 'Packing and handover', 'Delivery area']],
    instruments: [['MR-01', 'Measuring gauge', 'Final check', 365], ['MR-02', 'Test tool', 'Core process', 180], ['MR-03', 'Scale', 'Delivery area', 365], ['MR-04', 'Condition monitor', 'Core process area', 180], ['MR-05', 'Reference standard', 'Quality office', 365]],
    tasks: ['Intake check', 'Core process setup', 'Final check', 'Release approval'], roles: ['Team member', 'Technician', 'Team member', 'Checker'],
    providers: ['Input materials supplier', 'Outsourced finishing service', 'Calibration service', 'Transport provider', 'Software tool provider'],
    processes: ['Intake', 'Core process', 'Purchasing', 'Final check and release', 'Training', 'Customer service'],
    objectives: [['On-time delivery', 'Work items delivered by the agreed date', '95%', ['96%', '95%', '97%'], '91%'], ['First-pass yield', 'Work items passing the final check first time', '97%', ['97%', '98%', '97%'], '94%'], ['Complaint closure', 'Complaints closed within 30 days', '90%', ['92%', '90%', '93%'], '84%']],
    ncs: ['Work item failed the final check', 'Input lot rejected at intake', 'Customer complaint: incomplete delivery', 'Process record missing entries']
  },
  'discrete-manufacturing': {
    policyFocus: 'We machine and assemble to the current drawing and measure with calibrated tools.',
    instructions: [['WI-M220', 'Lathe setup and first-off check', 'Cutting and machining'], ['WI-M330', 'Torque sequence for housing assembly', 'Assembly'], ['WI-M510', 'Final dimensional inspection', 'Final inspection']],
    instruments: [['TW-04', 'Torque wrench', 'Assembly', 180], ['MIC-12', 'Micrometer', 'Final inspection', 365], ['CAL-07', 'Caliper', 'Cutting and machining', 365], ['CMM-01', 'Coordinate measuring machine', 'Inspection room', 365], ['SC-02', 'Scale', 'Pack and ship', 365]],
    tasks: ['Lathe setup', 'Torque assembly', 'Final inspection', 'Batch release'], roles: ['Machinist', 'Assembler', 'Inspector', 'Machinist'],
    providers: ['Bar stock supplier', 'Heat-treatment subcontractor', 'Plating subcontractor', 'Calibration laboratory', 'Freight carrier'],
    processes: ['Receiving inspection', 'Cutting and machining', 'Purchasing', 'Assembly', 'Final inspection and release', 'Customer complaints'],
    objectives: [['On-time delivery', 'Batches shipped by the agreed date', '95%', ['95%', '96%', '96%'], '92%'], ['First-pass yield', 'Batches passing final inspection first time', '97%', ['97%', '98%', '98%'], '95%'], ['Scrap cost', 'Scrap cost as a share of sales', 'Below 1.5%', ['1.2%', '1.4%', '1.3%'], '1.9%']],
    ncs: ['Diameter out of tolerance on six parts', 'Bar stock lot received without a certificate', 'Customer report: fit failure on two parts', 'Mixed batch found at pack and ship']
  },
  'process-food': {
    policyFocus: 'We release a production batch only when every check and laboratory result is complete.',
    instructions: [['WI-F220', 'Weighing and batching', 'Preparation and weighing'], ['WI-F330', 'Cook step temperature check', 'Cooking or processing'], ['WI-F410', 'Label verification at packaging', 'Packaging and labeling']],
    instruments: [['TP-03', 'Temperature probe', 'Cooking or processing', 30], ['SC-05', 'Batching scale', 'Preparation and weighing', 180], ['PH-01', 'pH meter', 'Laboratory', 90], ['MD-02', 'Metal detector test pieces', 'Packaging and labeling', 365], ['LV-01', 'Label verification scanner', 'Packaging and labeling', 180]],
    tasks: ['Batching', 'Cook step monitoring', 'Label verification', 'Batch release'], roles: ['Process operator', 'Packing operator', 'Process operator', 'Line technician'],
    providers: ['Ingredient supplier', 'Packaging supplier', 'External testing laboratory', 'Pest control provider', 'Cold chain transport'],
    processes: ['Receiving and ingredient check', 'Cooking or processing', 'Purchasing', 'Packaging and labeling', 'Final check and release', 'Customer complaints'],
    objectives: [['On-time dispatch', 'Production batches dispatched by the agreed date', '96%', ['97%', '96%', '97%'], '93%'], ['Right-first-time labeling', 'Packs with correct labels at final check', '99.5%', ['99.6%', '99.7%', '99.5%'], '99.1%'], ['Complaint rate', 'Complaints per million units', 'Below 5', ['4.1', '3.8', '4.4'], '6.2']],
    ncs: ['Label and content mismatch on 40 packs', 'Missing temperature record for one production batch', 'Expired ingredient found in the store', 'Customer report: seal failure']
  },
  electronics: {
    policyFocus: 'We protect every lot from contamination, damage, and mix-ups from receipt to shipment.',
    instructions: [['WI-E220', 'Film strip process', 'Preparation or film strip'], ['WI-E330', 'Polish recipe selection', 'Polish or main process'], ['WI-E440', 'Final clean and dry', 'Final clean']],
    instruments: [['TG-02', 'Thickness gauge', 'Final inspection', 180], ['PC-01', 'Particle counter', 'Cleanroom', 365], ['OI-03', 'Optical inspection station', 'Final inspection', 365], ['TG-05', 'Thickness gauge (backup)', 'Metrology', 180], ['ESD-01', 'Wrist strap tester', 'Cleanroom entry', 365]],
    tasks: ['Polish recipe setup', 'Final clean', 'Final inspection', 'Lot disposition'], roles: ['Process operator', 'Process technician', 'Inspector', 'Process operator'],
    providers: ['Chemical supplier', 'Consumables supplier', 'External metrology service', 'Calibration service', 'Specialist courier'],
    processes: ['Incoming inspection', 'Polish or main process', 'Purchasing', 'Final clean', 'Final inspection and release', 'Customer complaints'],
    objectives: [['Lot yield', 'Lots passing final inspection', '98%', ['98%', '99%', '98%'], '96%'], ['On-time shipment', 'Lots shipped by the agreed date', '96%', ['96%', '97%', '96%'], '93%'], ['Particle excursions', 'Excursions per month', 'At most 2', ['1', '2', '1'], '4']],
    ncs: ['Thickness out of limit on one lot', 'Scratch defects found at final inspection', 'Wrong lot label found at pack', 'Customer report: particle defects']
  },
  construction: {
    policyFocus: 'We build to the current drawing and never cover work before its hold point is signed.',
    instructions: [['PR-C220', 'Setting out procedure', 'Site execution'], ['PR-C330', 'Concrete placement and hold points', 'Site execution'], ['PR-C440', 'Handover inspection', 'Handover review']],
    instruments: [['SV-01', 'Total station survey instrument', 'Site', 365], ['LV-02', 'Survey level', 'Site', 365], ['CT-03', 'Concrete test kit', 'Site laboratory', 180], ['PG-01', 'Pressure test gauge', 'Inspection and testing', 365], ['TW-02', 'Torque wrench', 'Steelwork', 180]],
    tasks: ['Setting out', 'Concrete placement', 'Pressure testing', 'Hold point sign-off'], roles: ['Site operative', 'Site engineer', 'Site operative', 'Inspector'],
    providers: ['Groundworks subcontractor', 'Ready-mix concrete supplier', 'Testing laboratory', 'Plant hire provider', 'Steel fixing subcontractor'],
    processes: ['Tender and requirements review', 'Design and planning', 'Subcontractor management', 'Site execution', 'Inspection and testing', 'Handover review'],
    objectives: [['Inspections passed first time', 'Inspections passed at the first attempt', '95%', ['95%', '96%', '95%'], '90%'], ['Handover on the planned date', 'Work packages handed over on the planned date', '90%', ['91%', '92%', '90%'], '85%'], ['Defects at handover', 'Defects per work package at handover', 'At most 5', ['4', '3', '4'], '7']],
    ncs: ['Opening set out in the wrong position', 'Test certificate missing for a steel delivery', 'Client report: water ingress after handover', 'Pressure test result not recorded']
  },
  'it-software': {
    policyFocus: 'We deploy a release only after recorded test sign-off and we protect customer data.',
    instructions: [['PR-D220', 'Code review procedure', 'Build'], ['PR-D330', 'Deployment procedure', 'Deploy and support'], ['PR-D440', 'Incident handling', 'Deploy and support']],
    instruments: [['TS-01', 'Regression test suite', 'Test', 90], ['MON-02', 'Monitoring dashboard thresholds', 'Deploy and support', 180], ['PB-01', 'Performance benchmark', 'Test', 180], ['TE-01', 'Test environment configuration baseline', 'Test', 90], ['SV-01', 'Customer survey tool', 'Customer success', 365]],
    tasks: ['Code review', 'Deployment', 'Test sign-off', 'Incident response'], roles: ['Developer', 'Test engineer', 'Developer', 'Operations engineer'],
    providers: ['Cloud hosting provider', 'Third-party library vendor', 'Contract developer agency', 'Monitoring service provider', 'Ticketing tool provider'],
    processes: ['Requirements intake', 'Design', 'Supplier management', 'Build', 'Test and release review', 'Deploy and support'],
    objectives: [['Successful releases', 'Releases with no rollback', '98%', ['98%', '99%', '98%'], '95%'], ['Incident resolution', 'Incidents resolved within the agreed time', '95%', ['96%', '95%', '96%'], '91%'], ['Customer satisfaction', 'Average survey score out of 5', 'At least 4.2', ['4.3', '4.3', '4.4'], '4.0']],
    ncs: ['Release rolled back after a failed health check', 'Production change made without a ticket', 'Customer report: export function defect', 'Excessive data access found in an access review']
  },
  healthcare: {
    policyFocus: 'This dossier covers management system topics only and gives no clinical guidance.',
    instructions: [['PR-H110', 'Referral intake checklist', 'Referral and intake'], ['PR-H220', 'Handover form completion', 'Discharge or handover check'], ['PR-H440', 'Records access and filing', 'Documentation and results review']],
    instruments: [['MD-01', 'Clinical measuring device', 'Assessment room', 365], ['SC-02', 'Weighing scale', 'Assessment room', 365], ['TH-03', 'Thermometer', 'Treatment area', 365], ['FR-01', 'Storage fridge temperature logger', 'Treatment area', 180], ['PF-01', 'Patient feedback survey tool', 'Quality office', 365]],
    tasks: ['Intake checklist', 'Handover completion', 'Equipment check before use', 'Discharge checklist'], roles: ['Care assistant', 'Nurse', 'Administrator', 'Care assistant'],
    providers: ['Supply vendor', 'External laboratory', 'Equipment service provider', 'Agency staffing provider', 'Records storage provider'],
    processes: ['Referral and intake', 'Assessment', 'Purchasing', 'Documentation and results review', 'Discharge or handover check', 'Feedback and complaints'],
    objectives: [['Referral processing', 'Referrals processed within two working days', '95%', ['96%', '95%', '97%'], '90%'], ['Complete handover records', 'Handover records with every section complete', '98%', ['98%', '99%', '98%'], '94%'], ['Patient feedback', 'Feedback rated good or better', '90%', ['91%', '92%', '90%'], '86%']],
    ncs: ['Handover record incomplete for one case', 'Referral processed late', 'Appointment letter sent with an error', 'Gap in the storage fridge temperature record']
  },
  logistics: {
    policyFocus: 'We dispatch an order only when the count, labels, and condition are confirmed.',
    instructions: [['WI-L220', 'Put-away and slotting', 'Put-away and storage'], ['WI-L330', 'Pick and pack for fragile goods', 'Picking and packing'], ['WI-L440', 'Loading check', 'Loading check']],
    instruments: [['SC-03', 'Platform scale', 'Receiving', 365], ['SN-07', 'Handheld scanner', 'Picking and packing', 180], ['TL-02', 'Temperature logger (cold store)', 'Put-away and storage', 365], ['TL-04', 'Temperature logger (vehicle)', 'Loading check', 365], ['WB-01', 'Weighbridge', 'Gatehouse', 365]],
    tasks: ['Receiving check', 'Fragile goods packing', 'Loading check', 'Dispatch release'], roles: ['Warehouse operative', 'Picker', 'Loader', 'Warehouse operative'],
    providers: ['Contract carrier', 'Subcontracted drivers', 'Forklift hire provider', 'Warehouse system provider', 'Pallet supplier'],
    processes: ['Receiving', 'Put-away and storage', 'Carrier management', 'Picking and packing', 'Loading and dispatch', 'Customer complaints'],
    objectives: [['Order accuracy', 'Orders delivered with the correct items and quantities', '99.5%', ['99.6%', '99.5%', '99.7%'], '99.0%'], ['On-time delivery', 'Orders delivered in the agreed window', '97%', ['97%', '98%', '97%'], '94%'], ['Damage claims', 'Claims as a share of orders', 'Below 0.2%', ['0.15%', '0.12%', '0.18%'], '0.3%']],
    ncs: ['Wrong item picked on an order', 'Gap in the cold store temperature log', 'Unreported damage found at loading', 'Mislabeled pallet found at dispatch']
  },
  'professional-services': {
    policyFocus: 'Every deliverable is peer reviewed before it reaches the client.',
    instructions: [['PR-A220', 'Report template and style guide', 'Delivery or analysis'], ['PR-A330', 'Peer review procedure', 'Peer review'], ['PR-A440', 'Client file handling', 'Client sign-off']],
    instruments: [['CM-01', 'Valuation calculation model', 'Analysis team', 180], ['CM-02', 'Forecast model', 'Analysis team', 180], ['RC-01', 'Peer review checklist', 'Peer review', 365], ['AR-01', 'Assessment rubric', 'Education team', 365], ['FS-01', 'Client feedback survey', 'Client service', 365]],
    tasks: ['Engagement scoping', 'Analysis with models', 'Peer review', 'Client sign-off'], roles: ['Consultant', 'Analyst', 'Consultant', 'Senior consultant'],
    providers: ['Subcontracted specialist', 'Market data provider', 'Training venue', 'Document platform provider', 'Translation service'],
    processes: ['Enquiry and scoping', 'Planning', 'Supplier management', 'Delivery or analysis', 'Peer review and client sign-off', 'Feedback and complaints'],
    objectives: [['On-time deliverables', 'Deliverables issued by the agreed date', '95%', ['95%', '96%', '95%'], '91%'], ['Peer review before issue', 'Deliverables peer reviewed before issue', '100%', ['100%', '100%', '100%'], '97%'], ['Client feedback', 'Feedback rated good or better', '90%', ['92%', '91%', '93%'], '87%']],
    ncs: ['Report sent with a calculation error', 'Outdated template used for a client report', 'Client document misfiled', 'Scope change made without written agreement']
  }
};

/* ======================================================================
   Build
   ====================================================================== */
const DEFAULT_CONFIG = {
  industryPack: null, teams: 4, seed: 2026, auditDate: '2026-10-14', company: '',
  roundMinutes: [10, 25, 15, 10, 15],
  points: { found: 1, wordingBonus: 1, unsupportedPenalty: 1, observerWeight: 1 }
};
const NOTICE_TEXT = 'This material is an original training aid. It is not a substitute for the standard. Obtain ISO 9001 from ISO or a national standards body. Fictional organization. Examples are illustrative. Sector-specific legal, clinical, safety, and food safety requirements are outside this program. Clause references use the 2015 edition numbering.';

function build(argv) {
  const company = json('config/company.json');
  const packs = json('data/packs.json');
  const scenarios = json('data/scenarios.json');
  const clauseMap = json('data/clause-map.json');
  const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
  const cfg = Object.assign({}, DEFAULT_CONFIG, { industryPack: company.industryPack || 'generic' });
  packs.forEach(p => { if (!PROFILES[p.id]) console.warn('No dossier profile for pack ' + p.id + '; the generic profile is used.'); });
  const clauses = clauseMap.clauses.map(c => [c.id, c.title2015]);

  let html = read('games/audit-day/template.html');
  html = html.replace('__CONFIG_JSON__', () => safe(cfg))
    .replace('__DATA_JSON__', () => safe({ packs, scenarios, profiles: PROFILES, clauses }))
    .replace('/*__ENGINE__*/', () => 'var AD = (' + adEngine.toString() + ')();');
  fs.mkdirSync(path.join(root, 'games/audit-day'), { recursive: true });
  fs.writeFileSync(path.join(root, 'games/audit-day/index.html'), html);
  console.log('Built games/audit-day/index.html (' + Math.round(html.length / 1024) + ' KB)');

  // Printable pack
  const AD = adEngine();
  const packId = arg('pack', cfg.industryPack);
  const pack = packs.find(p => p.id === packId);
  if (!pack) throw new Error('Unknown pack ' + packId);
  const seed = parseInt(arg('seed', cfg.seed), 10);
  const d = AD.makeDossier({ pack, profile: PROFILES[pack.id] || PROFILES.generic, scenarios, seed, auditDate: cfg.auditDate, company: pack.id === 'generic' ? company.company : pack.company });
  const body = AD.printSections(d, { teams: cfg.teams, minutes: cfg.roundMinutes, points: cfg.points, notice: '<div class="note">' + NOTICE_TEXT + '</div>' });
  const CSS = '@page{size:letter;margin:12mm}*{box-sizing:border-box}body{font:11pt/1.35 system-ui,-apple-system,"Segoe UI",Arial,sans-serif;color:#000;background:#fff;margin:0}' +
    '.page{page-break-after:always;padding:2mm}.page:last-child{page-break-after:auto}h1{font-size:18pt;margin:0 0 4mm}h2{font-size:14pt;margin:4mm 0 2mm;border-bottom:2px solid #000}h3{font-size:12pt;margin:3mm 0 1mm}h4{font-size:11pt;margin:2mm 0 1mm}' +
    'table{border-collapse:collapse;width:100%;margin:2mm 0;page-break-inside:avoid}th,td{border:1.5px solid #000;padding:1.5mm 2mm;text-align:left;vertical-align:top;font-size:9.5pt}thead th{background:#e6e6e6}tbody th{font-weight:600}' +
    '.num{text-align:right}.muted{color:#333}.docref{font-weight:400}.doc{page-break-inside:avoid;margin-bottom:3mm}.blank2{height:16mm}.blank3{height:38mm}table.form{margin-bottom:4mm}.note{font-size:9pt;margin-top:6mm;border-top:1px solid #000;padding-top:2mm}';
  const out = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Audit Day printable pack: ' + AD.esc(pack.name) + '</title><style>' + CSS + '</style></head><body>' + body + '</body></html>';
  fs.writeFileSync(path.join(root, 'games/printables/audit-day-dossier.html'), out);
  console.log('Built games/printables/audit-day-dossier.html (pack ' + pack.id + ', seed ' + seed + ', ' + Math.round(out.length / 1024) + ' KB)');
}

if (require.main === module) build(process.argv.slice(2));
module.exports = { adEngine, PROFILES, DEFAULT_CONFIG };
