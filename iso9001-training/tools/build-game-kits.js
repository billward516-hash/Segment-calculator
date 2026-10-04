'use strict';
// Generates print-ready facilitator kits for the classroom games that have no digital version:
// Root Cause Relay, Document Control Relay, Traceability Challenge, Management Review Boardroom,
// Workplace Evidence Hunt, and Change Control Challenge.
// Run: node tools/build-game-kits.js [--seed 12345] [--pack generic]
// The traceability records are generated from the seed, and the facilitator key is derived from
// those same records, so a different seed gives a different week with a matching key.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const json = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const packs = json('data/packs.json');
const events = json('data/events.json');
const DEFAULT_SEED = 12345;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- Shared page furniture (matches tools/build-printables.js) ---------- */
const CSS = `
@page{size:letter;margin:12mm}
*{box-sizing:border-box}
body{font:11pt/1.35 system-ui,-apple-system,"Segoe UI",Arial,sans-serif;color:#000;background:#fff;margin:0}
.page{page-break-after:always;break-after:page;padding:2mm}
.page:last-child{page-break-after:auto;break-after:auto}
h1{font-size:18pt;margin:0 0 3mm}
h2{font-size:14pt;margin:4mm 0 2mm;border-bottom:2px solid #000}
h3{font-size:12pt;margin:3mm 0 1mm}
p{margin:1.5mm 0}
ul,ol{margin:1mm 0 2mm;padding-left:6mm}
table{border-collapse:collapse;width:100%;margin:2mm 0}
tr{page-break-inside:avoid;break-inside:avoid}
th,td{border:1.5px solid #000;padding:1.6mm 2mm;text-align:left;vertical-align:top}
th{background:#e6e6e6}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:0}
.card{border:1.5px dashed #000;padding:3mm;height:52mm;overflow:hidden;page-break-inside:avoid;break-inside:avoid}
.card .id{font-weight:800;font-size:12pt}
.card .t{font-size:11pt;margin:2mm 0}
.card small{display:block;font-size:9pt}
.card.tall{height:60mm}
.num{text-align:right}
.note{font-size:8.5pt;margin-top:4mm;border-top:1px solid #000;padding-top:1.5mm}
.blank td{height:9mm}
.tall-row td{height:16mm}
.mid-row td{height:12mm}
.tight th,.tight td{padding:.7mm 1.5mm;font-size:9pt}
.box{border:2px solid #000;padding:3mm;margin:2mm 0}
.keybox{border:3px double #000;padding:3mm;margin:2mm 0}
.label{font-weight:700;text-transform:uppercase;font-size:9pt;letter-spacing:.04em}
.form{border:2px solid #000;padding:3mm;height:60mm;page-break-inside:avoid;break-inside:avoid;position:relative}
.form table td{height:8mm;padding:1mm 2mm;font-size:10pt}
.fold{border-top:1.5px dashed #000;position:absolute;left:0;right:0;top:50%;font-size:7pt;text-align:right;padding-right:2mm}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.slip{border:1.5px dashed #000;padding:2mm;font-size:10pt;page-break-inside:avoid;break-inside:avoid}
.small{font-size:9pt}
.lines div{border-bottom:1px solid #000;height:8mm}
`;
const NOTICE = '<div class="note">This material is an original training aid. It is not a substitute for the standard. Obtain ISO 9001 from ISO or a national standards body. Fictional organization. Examples are illustrative. Sector-specific legal, clinical, safety, and food safety requirements are outside this program. Clause numbers use the 2015 edition.</div>';
const wrap = (title, body) => '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(title) + '</title><style>' + CSS + '</style></head><body>' + body + '</body></html>';
const page = (title, body) => '<div class="page"><h1>' + esc(title) + '</h1>' + body + NOTICE + '</div>';
const table = (head, rows, cls) => '<table' + (cls ? ' class="' + cls + '"' : '') + '><thead><tr>' + head.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
const blankRows = (n, cols, cls) => Array.from({ length: n }, () => '<tr class="' + (cls || 'blank') + '">' + '<td></td>'.repeat(cols) + '</tr>').join('');
const debrief = qs => '<h2>Debrief</h2><table class="tight"><thead><tr><th>Question</th><th>Expected answer</th></tr></thead><tbody>' + qs.map(q => '<tr><td>' + esc(q[0]) + '</td><td>' + esc(q[1]) + '</td></tr>').join('') + '</tbody></table>';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function getPack(id) { return packs.find(p => p.id === id) || packs.find(p => p.id === 'generic'); }
function skin(pack, id) { return (pack.skins && pack.skins[id]) || events.find(e => e.id === id).text; }

/* ---------- Pack vocabulary used by the kits ---------- */
const VOCAB = {
  'generic': { input: 'input batch', idPre: 'IB', unit: ['Unit 1', 'Unit 2'], line: 'line', defect: 'does not meet its specification' },
  'discrete-manufacturing': { input: 'bar stock lot', idPre: 'BS', unit: ['Lathe 1', 'Lathe 2'], line: 'cell', defect: 'fails fit at the customer\'s assembly' },
  'process-food': { input: 'ingredient lot', idPre: 'IL', unit: ['Cooker 1', 'Cooker 2'], line: 'line', defect: 'has a texture fault reported by the customer' },
  'electronics': { input: 'chemical lot', idPre: 'CL', unit: ['Polisher 1', 'Polisher 2'], line: 'tool group', defect: 'shows surface particle defects' },
  'construction': { input: 'material delivery', idPre: 'MD', unit: ['Crew A', 'Crew B'], line: 'crew', defect: 'shows cracking found at a client walk-down' },
  'it-software': { input: 'library version', idPre: 'LV', unit: ['Pipeline 1', 'Pipeline 2'], line: 'pipeline', defect: 'fails a customer acceptance test' },
  'healthcare': { input: 'supply lot', idPre: 'SL', unit: ['Room 1', 'Room 2'], line: 'room', defect: 'has a documentation fault reported at follow-up' },
  'logistics': { input: 'packaging lot', idPre: 'PL', unit: ['Bench 1', 'Bench 2'], line: 'bench', defect: 'arrived with failed packaging' },
  'professional-services': { input: 'dataset version', idPre: 'DS', unit: ['Team 1', 'Team 2'], line: 'team', defect: 'contains a calculation error' }
};
const vocab = pack => VOCAB[pack.id] || VOCAB.generic;

/* =====================================================================================
   1. Root Cause Relay
   ===================================================================================== */
function rootCauseProblems(pack) {
  const it = pack.term[0], its = pack.term[1], st = pack.stages;
  return [
    {
      id: 'P1', title: 'Repeat defect at the ' + st[2] + ' stage',
      text: 'The same defect appears on three consecutive ' + its + ' leaving the ' + st[2] + ' stage. Each was caught at ' + st[4] + '.',
      evidence: [
        ['The set-up record shows that the setting at ' + st[2] + ' was adjusted on the night shift. It was not returned to the documented value.', true],
        ['The work instruction for ' + st[2] + ' says "set as required". It gives no value or tolerance.', true],
        ['Two of the three people involved learned the set-up from a colleague. No qualification record exists for the set-up step.', true],
        ['No check is required after a set-up change. The first sign of the defect came from ' + st[4] + '.', true],
        ['The area was repainted the week before the defects appeared. The paint work did not touch the equipment or the ' + its + '.', false],
        ['One person returned from leave on the day the first defect appeared. The defect also occurred on a shift when that person was absent.', false]
      ],
      chain: ['The ' + it + ' was outside its requirement because the setting at ' + st[2] + ' was wrong.', 'The setting was wrong because it was adjusted on the night shift and not restored.', 'It was not restored because no documented value exists to restore it to.', 'No value exists because the instruction was issued without a defined setting and tolerance.', 'Nothing detected the change because no check is required after a set-up change.'],
      cause: 'The setting value and tolerance are not defined in the controlled instruction, and no verification is required after a set-up change.',
      action: 'Revise the instruction to state the setting and tolerance. Require a first-' + it + ' check after any set-up change. Qualify everyone who performs the set-up.',
      check: 'No recurrence of the defect in the next 20 ' + its + ' or four weeks, whichever is longer; a sample of set-up records shows the first-' + it + ' check completed every time.',
      clauses: '7.5.3, 8.5.1, 7.2, 10.2'
    },
    {
      id: 'P2', title: 'Wrong identification on delivered ' + its,
      text: 'A customer reports that two delivered ' + its + ' carried the wrong identification. The identifications had been swapped.',
      evidence: [
        ['Labels or system identifiers are prepared in advance for the whole shift.', true],
        ['Two ' + its + ' changed order after one was held. The pre-prepared identifications were not reassigned.', true],
        ['The ' + st[4] + ' checklist asks whether an identification is present. It does not ask whether it matches the record.', true],
        ['The instruction permits advance preparation of identifications. No risk assessment was made when this was allowed.', true],
        ['The printer was low on ink that day. All labels were legible.', false],
        ['A new customer service person took the complaint call.', false]
      ],
      chain: ['The ' + its + ' carried each other\'s identification.', 'The identifications were prepared before the order of work was final.', 'The order changed after a hold and nobody reassigned them.', 'The final check confirmed presence, not match to the record.', 'The method allowing advance preparation was approved without considering a change of order.'],
      cause: 'Identification is prepared separately from the work item record, and the final check does not verify the match.',
      action: 'Produce the identification at completion from the record. Add a check at ' + st[4] + ' that compares the identification with the record.',
      check: 'No identification mix-ups for three months; a monthly sample of 30 ' + its + ' shows identification matches the record in every case.',
      clauses: '8.5.2, 8.6, 6.1'
    },
    {
      id: 'P3', title: 'A rejected input reached ' + st[1],
      text: 'An ' + vocab(pack).input + ' that failed its check at ' + st[0] + ' was used at ' + st[1] + '.',
      evidence: [
        ['The rejected ' + vocab(pack).input + ' was placed next to accepted stock with a handwritten note. The note was later found on the floor.', true],
        ['There is no designated hold location or hold status at ' + st[0] + '.', true],
        ['The status in the system was not updated. The person responsible was absent and no deputy was named.', true],
        ['The person at ' + st[1] + ' saw no hold sign and no hold status, and used the input as normal.', true],
        ['The provider used a new format for its delivery paperwork. The check at ' + st[0] + ' still detected the failure.', false],
        ['The delivery arrived late in the afternoon. The check was completed on time.', false]
      ],
      chain: ['A rejected input was used at ' + st[1] + '.', 'Nothing showed that it was rejected at the point of use.', 'The only sign was a loose note, and the system status was not changed.', 'There is no segregated hold location or hold status.', 'No deputy is named for status updates when the responsible person is absent.'],
      cause: 'No segregated, labeled hold location or system hold exists for rejected inputs, and no deputy covers status updates.',
      action: 'Create a marked hold location and a system hold that blocks use. Name a deputy for status updates. Brief all staff at ' + st[0] + ' and ' + st[1] + '.',
      check: 'Weekly hold area audit for eight weeks finds every rejected input segregated and blocked; no rejected input is used in three months.',
      clauses: '8.4.2, 8.5.2, 8.7'
    },
    {
      id: 'P4', title: 'Release before the final check',
      text: 'A ' + it + ' was released before the ' + st[4] + ' record was signed, to meet a delivery date.',
      evidence: [
        ['The release authorization list names one person. That person was on leave.', true],
        ['The plan for Fridays leaves no time for ' + st[4] + ' on the last ' + its + ' of the week.', true],
        ['The system allows ' + st[5] + ' to proceed when the sign-off field is empty.', true],
        ['Two similar early releases occurred last quarter. Both were treated as one-off events.', true],
        ['The customer had changed its delivery address that month.', false],
        ['Weather delayed the vehicle by one hour after release.', false]
      ],
      chain: ['The ' + it + ' was released without sign-off.', 'Nobody with authority was available and the date was close.', 'Only one person is authorized and no deputy is named.', 'The system does not stop release without sign-off.', 'Earlier early releases were corrected but never investigated for cause.'],
      cause: 'Release is not blocked without authorization, only one person is authorized, and planning does not allow time for the final check.',
      action: 'Add a system block on release without sign-off. Authorize and train deputies. Include final check time in the plan. Investigate repeat events as corrective action.',
      check: 'Record review shows no release without sign-off for three months; planning records show final check time on every Friday.',
      clauses: '8.6, 5.3, 8.1, 10.2'
    }
  ];
}

function rootCauseRelay(pack) {
  const P = rootCauseProblems(pack);
  let h = '';
  h += page('Root Cause Relay: facilitator sheet', '<p><b>' + esc(pack.company) + '</b> (' + esc(pack.name) + '). Teams of 4 to 5. 30 to 40 minutes. Module 9 (Clause 10.2).</p>' +
    '<h2>Materials per team</h2><ul><li>One problem card (a different problem for each team, or the same problem for every team for comparison).</li><li>The six evidence cards for that problem, kept by the facilitator and injected in the order shown.</li><li>One why-chain sheet, one fishbone sheet, and one scoring sheet.</li></ul>' +
    '<h2>Timing</h2>' + table(['Minute', 'Step'], [['0 to 3', 'Read the problem card aloud. Explain the relay: each member in turn adds one why and one because.'], ['3', 'Inject evidence cards 1 and 2.'], ['8', 'Inject evidence cards 3 and 4 (card 4 is relevant).'], ['13', 'Inject evidence cards 5 and 6 (both red herrings in the key).'], ['13 to 20', 'Complete the why chain. Mark any evidence the team rejects and say why.'], ['20 to 27', 'Build the fishbone. Select one root cause.'], ['27 to 32', 'Write the corrective action and the effectiveness check.'], ['32 to 40', 'Score and debrief.']], 'tight') +
    '<p class="small">Evidence cards are shuffled on the printed sheet so that red herrings are not always last. Inject them in card number order.</p>' +
    '<h2>Scoring (maximum 12)</h2>' + table(['Criterion', 'Points'], [['Depth of the causal chain: one point per valid why, each supported by evidence', 'up to 5'], ['Correct rejection of each red herring, with a reason', '1 each, up to 2'], ['Corrective action addresses the cause, not the symptom', '3'], ['Effectiveness check is measurable (what, how many, by when)', '2']], 'tight'));

  // Problem cards
  h += page('Problem cards', '<div class="cards">' + P.map(p => '<div class="card"><div class="id">Problem ' + p.id + '</div><div class="t"><b>' + esc(p.title) + '</b></div><div class="t">' + esc(p.text) + '</div><small>Find the cause in the system. "Human error" is not accepted as a root cause without asking why the system allowed it.</small></div>').join('') + '</div>');

  // Evidence cards: 6 per problem, fixed interleaving so red herrings are not last
  const ORDER = [0, 4, 1, 2, 5, 3];
  P.forEach(p => {
    h += page('Evidence cards: problem ' + p.id, '<div class="cards">' + ORDER.map((ei, k) => '<div class="card"><div class="id">' + p.id + ' evidence ' + (k + 1) + '</div><div class="t">' + esc(p.evidence[ei][0]) + '</div><small>Inject at minute ' + (k < 2 ? 3 : k < 4 ? 8 : 13) + '.</small></div>').join('') + '</div>');
  });

  // Why chain sheet
  h += page('Why-chain sheet', '<p>Team: ____________________ &nbsp; Problem: ______ &nbsp; Each member adds one row in turn.</p><table><thead><tr><th style="width:6%">#</th><th style="width:38%">Why did this happen?</th><th style="width:38%">Because (state a fact)</th><th style="width:10%">Evidence card</th><th style="width:8%">Initials</th></tr></thead><tbody>' +
    [1, 2, 3, 4, 5].map(n => '<tr class="tall-row"><td>' + n + '</td><td></td><td></td><td></td><td></td></tr>').join('') + '</tbody></table>' +
    '<h2>Evidence rejected</h2><table><thead><tr><th>Card</th><th>Why the team rejected it</th></tr></thead><tbody>' + blankRows(2, 2) + '</tbody></table>' +
    '<h2>Corrective action</h2><table><tbody><tr class="mid-row"><td style="width:30%"><b>Root cause selected</b></td><td></td></tr><tr class="mid-row"><td><b>Correction (immediate)</b></td><td></td></tr><tr class="mid-row"><td><b>Corrective action (removes the cause)</b></td><td></td></tr><tr class="mid-row"><td><b>Effectiveness check (what, how many, by when, who)</b></td><td></td></tr></tbody></table>');

  // Fishbone sheet (inline SVG)
  const cats = ['People and competence', 'Method and instructions', 'Equipment and systems', 'Inputs and providers', 'Measurement and checks', 'Environment and conditions'];
  let svg = '<svg viewBox="0 0 760 430" width="100%" role="img" aria-label="Fishbone diagram with six cause categories"><g stroke="#000" stroke-width="2" fill="none">' +
    '<line x1="20" y1="215" x2="600" y2="215" stroke-width="3"/><rect x="600" y="175" width="150" height="80"/>';
  [0, 1, 2].forEach(i => { const x = 90 + i * 180; svg += '<line x1="' + x + '" y1="40" x2="' + (x + 110) + '" y2="215"/><line x1="' + x + '" y1="390" x2="' + (x + 110) + '" y2="215"/>'; });
  svg += '</g><g font-size="13" font-family="system-ui,Arial,sans-serif" font-weight="700">';
  [0, 1, 2].forEach(i => { const x = 40 + i * 180; svg += '<text x="' + x + '" y="28">' + esc(cats[i]) + '</text><text x="' + x + '" y="412">' + esc(cats[i + 3]) + '</text>'; });
  svg += '<text x="610" y="200">Problem:</text></g></svg>';
  h += page('Fishbone sheet', '<p>Team: ____________________ &nbsp; Problem: ______. Write causes on each branch. Circle the root cause. Mark rejected evidence with a cross.</p>' + svg +
    '<p>Selected root cause: _____________________________________________________________________</p><p>Category: ____________________ &nbsp; Supported by evidence cards: ____________</p>');

  // Scoring sheet
  h += page('Scoring sheet', '<table><thead><tr><th>Team</th><th>Problem</th><th>Chain depth (0 to 5)</th><th>Red herrings rejected (0 to 2)</th><th>Action addresses cause (0 or 3)</th><th>Check measurable (0 or 2)</th><th>Total (12)</th></tr></thead><tbody>' + blankRows(6, 7, 'tall-row') + '</tbody></table>' +
    '<h3>Scoring rules</h3><ul><li>A why counts only if it is a fact, follows from the previous line, and is supported by an evidence card or the problem card.</li><li>A chain that ends in "the operator made a mistake" stops scoring at that line.</li><li>An action that only repeats training or reminds people scores 0 for the cause criterion unless it changes the method, the system, or the check.</li><li>An effectiveness check scores 2 only if it states what is measured, the sample or period, and the pass condition.</li></ul>');

  // Key
  P.forEach(p => {
    h += page('Instructor key: problem ' + p.id, '<div class="keybox"><b>' + esc(p.title) + '.</b> ' + esc(p.text) + '</div>' +
      '<h3>Evidence cards</h3>' + table(['Card', 'Status', 'Text'], ORDER.map((ei, k) => [String(k + 1), p.evidence[ei][1] ? 'Relevant' : '<b>Red herring</b>', esc(p.evidence[ei][0])]), 'tight') +
      '<h3>Model why chain</h3><ol>' + p.chain.map(c => '<li>' + esc(c) + '</li>').join('') + '</ol>' +
      table(['Element', 'Model answer'], [['Root cause', esc(p.cause)], ['Corrective action', esc(p.action)], ['Effectiveness check', esc(p.check)], ['Clauses', esc(p.clauses)]], 'tight'));
  });

  h += page('Root Cause Relay: debrief', debrief([
    ['Why is "operator error" a weak conclusion?', 'It names a person, not a cause. It does not explain why the system allowed the error, so retraining alone rarely prevents recurrence. Ask why the error was possible and why it was not detected.'],
    ['What changed in the system after your corrective action?', 'A concrete change to a method, instruction, check, system block, or resource. Reminders and retraining alone do not change the system.'],
    ['How did you decide that a card was a red herring?', 'The card did not explain the timing or pattern of the problem, or the defect occurred without that factor present.'],
    ['What is the difference between the correction and the corrective action?', 'The correction deals with the affected work items now (hold, redo, scrap). The corrective action removes the cause so the problem does not recur (Clause 10.2).'],
    ['How would you know the action worked?', 'A measurable check over a stated period or sample, reviewed by a named person, before the action is closed.'],
    ['Which requirement does this exercise relate to?', 'Clause 10.2 (nonconformity and corrective action), with links to 8.7 (control of nonconforming outputs) and 9.1.3 (analysis).']
  ]));
  return wrap('Root Cause Relay kit', h);
}

/* =====================================================================================
   2. Document Control Relay
   ===================================================================================== */
const DC_SLIPS = [
  ['WI-301', 12, 4.8, 5.0], ['WI-302', 7, 5.3, 5.0], ['WI-303', 20, 4.1, 5.0], ['WI-304', 15, 4.9, 5.0],
  ['WI-305', 3, 5.6, 5.0], ['WI-306', 9, 3.7, 5.0], ['WI-307', 11, 5.1, 5.0], ['WI-308', 14, 4.4, 5.0],
  ['WI-309', 6, 4.95, 5.0], ['WI-310', 18, 6.2, 5.0], ['WI-311', 8, 2.9, 5.0], ['WI-312', 16, 5.0, 5.0]
];
const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const DC_DATE = [5, 10, 2026];
function dcExpected(slip, rev) {
  const [id, qty, val, lim] = slip;
  const pass = val <= lim;
  const d = DC_DATE;
  const pad = n => String(n).padStart(2, '0');
  return {
    id,
    date: rev === 'A' ? pad(d[0]) + '/' + pad(d[1]) + '/' + d[2] : d[2] + '-' + pad(d[1]) + '-' + pad(d[0]),
    qty: rev === 'A' ? String(qty) : qty + ' (' + NUM_WORDS[qty].toUpperCase() + ')',
    result: pass ? 'PASS' : 'FAIL',
    remarks: pass ? '(blank)' : (rev === 'A' ? 'HOLD' : 'HOLD ' + val),
    verified: rev === 'A' ? 'Blank' : 'Second person initials',
    handling: rev === 'A' ? 'Folded in half, printed side out' : 'Flat, not folded'
  };
}
function documentControlRelay(pack) {
  const it = pack.term[0];
  const steps = rev => {
    const A = rev === 'A';
    return [
      'Use a blue or black pen. Write in capital letters.',
      A ? 'Write the date as DD/MM/YYYY. Use the exercise date given by the facilitator.' : '<b>Write the date as YYYY-MM-DD.</b> Use the exercise date given by the facilitator.',
      'Copy the ' + esc(it) + ' ID exactly from the data slip.',
      A ? 'Write the quantity in figures.' : '<b>Write the quantity in figures, then in words in brackets. Example: 12 (TWELVE).</b>',
      'Compare the measured value on the data slip with the limit. A value equal to or below the limit is within the limit. Circle PASS if it is within the limit. Circle FAIL if it is above the limit.',
      A ? 'If FAIL, write HOLD in the Remarks box.' : '<b>If FAIL, write HOLD and the measured value in the Remarks box. Example: HOLD 5.6.</b>',
      'Initial the Inspector box. Write the time completed as hh:mm.',
      A ? 'Leave the Verified box blank.' : '<b>Ask a second team member to check the card against the data slip and initial the Verified box.</b>',
      A ? 'Fold the card in half along the dashed line, printed side out. Place it in the outbox.' : '<b>Do not fold the card.</b> Place it flat in the outbox.'
    ];
  };
  const wi = rev => '<table class="tight"><tbody><tr><th>Document</th><td>WI-DC-01 Completing the ' + esc(it) + ' record card</td><th>Revision</th><td><b>' + rev + '</b></td></tr><tr><th>Owner</th><td>Quality coordinator, ' + esc(pack.company) + '</td><th>Effective</th><td>' + (rev === 'A' ? 'Start of exercise' : 'On issue (time: ________ )') + '</td></tr><tr><th>Approved by</th><td>' + (rev === 'A' ? 'J. Doe (fictional)' : 'J. Doe (fictional)') + '</td><th>Status</th><td>CONTROLLED COPY</td></tr></tbody></table>' +
    '<h2>Purpose</h2><p>To record the check result for each ' + esc(it) + ' in the same way every time.</p><h2>Steps</h2><ol>' + steps(rev).map(s => '<li>' + s + '</li>').join('') + '</ol>' +
    (rev === 'B' ? '<div class="box"><b>Changes from revision A:</b> steps 2, 4, 6, 8, and 9 (shown in bold). Withdraw all copies of revision A when this revision is received.</div>' : '');

  let h = '';
  h += page('Document Control Relay: facilitator sheet', '<p><b>' + esc(pack.company) + '</b>. Teams of 5 to 6. 25 to 30 minutes. Module 4 (Clause 7.5).</p>' +
    '<h2>Materials per team</h2><ul><li>One copy of work instruction revision A for every member.</li><li>Two copies of revision B and one revision notice, held by the facilitator.</li><li>Twelve data slips (cut apart), twelve blank record cards, one revision log, one outbox (an envelope or tray).</li></ul>' +
    '<h2>Timing</h2>' + table(['Minute', 'Step'], [['0 to 3', 'Brief the task. State the exercise date: 5 October 2026. Teams may organize themselves as they wish. Do not mention revisions.'], ['3 to 10', 'Teams complete cards to revision A.'], ['10', 'Hand revision B and the revision notice to two members of each team only, quietly. Say nothing to the rest of the team.'], ['10 to 18', 'Teams continue. Observe whether the two members tell the others, record the change, and remove revision A copies.'], ['18', 'Stop. Teams hand in the outbox, the revision log, and all copies of the instruction.'], ['18 to 30', 'Score and debrief.']], 'tight') +
    '<h2>Scoring</h2>' + table(['Criterion', 'Points'], [['Each card that is fully correct for the revision in force when it was completed (time on card)', '2 each'], ['Revision log entry made for revision B (revision, date, change, issued to)', '3'], ['All revision A copies withdrawn or marked obsolete at the end', '3'], ['Time bonus: first, second, and third team to finish all twelve cards', '3, 2, 1'], ['Penalty: card completed after the issue time but to revision A', 'minus 1 each']], 'tight'));
  h += page('Work instruction WI-DC-01, revision A', wi('A'));
  h += page('Work instruction WI-DC-01, revision B', wi('B'));
  h += page('Revision notice', '<div class="box" style="font-size:13pt"><p><b>REVISION NOTICE RN-DC-01</b></p><p>Document: WI-DC-01 Completing the ' + esc(it) + ' record card.</p><p>New revision: <b>B</b>. Effective: <b>immediately on issue</b>.</p><p>Changes: date format, quantity in figures and words, Remarks content for FAIL, second-person verification, and no folding.</p><p>Action for the holder: tell every person who uses this instruction. Record the revision in the team revision log. Withdraw every copy of revision A and mark it OBSOLETE.</p><p>Issued by: Quality coordinator. Time of issue: ________</p></div>' +
    '<div class="box" style="font-size:13pt;margin-top:10mm"><p><b>REVISION NOTICE RN-DC-01</b> (second copy)</p><p>Document: WI-DC-01. New revision: <b>B</b>. Effective immediately on issue. Tell every user, record the revision, and withdraw revision A.</p><p>Time of issue: ________</p></div>');
  h += page('Team revision log', '<p>Team: ____________________</p><table><thead><tr><th>Document</th><th>Revision</th><th>Date and time received</th><th>Description of change</th><th>Copies issued to</th><th>Old copies withdrawn (Yes / No)</th><th>Initials</th></tr></thead><tbody><tr class="tall-row"><td>WI-DC-01</td><td>A</td><td>Start of exercise</td><td>First issue</td><td>All members</td><td>n/a</td><td></td></tr>' + blankRows(4, 7, 'tall-row') + '</tbody></table>' +
    '<h2>Copy register</h2><table><thead><tr><th>Copy number</th><th>Held by</th><th>Revision</th><th>Withdrawn (time)</th></tr></thead><tbody>' + blankRows(7, 4) + '</tbody></table>');
  // Data slips: 12 per page
  h += page('Data slips (cut apart, one set per team)', '<div class="grid2">' + DC_SLIPS.map((s, i) => '<div class="slip"><b>Slip ' + (i + 1) + '</b> &nbsp; ' + esc(it) + ' ID: <b>' + s[0] + '</b><br>Quantity: ' + s[1] + ' &nbsp; Measured value: ' + s[2] + ' &nbsp; Limit: ' + s[3].toFixed(1) + ' maximum</div>').join('') + '</div><p class="small">Exercise date: 5 October 2026. The measured value is a fictional result in arbitrary units.</p>');
  // Blank cards: 4 per page, 3 pages
  const card = '<div class="form"><div class="label">' + esc(pack.company) + ' &nbsp; ' + esc(it) + ' record card &nbsp; Form F-DC-01</div><table><tbody><tr><td style="width:30%">' + esc(it) + ' ID</td><td></td><td style="width:22%">Date</td><td></td></tr><tr><td>Quantity</td><td colspan="3"></td></tr><tr><td>Result</td><td colspan="3">PASS &nbsp;&nbsp;&nbsp; FAIL</td></tr><tr><td>Remarks</td><td colspan="3"></td></tr><tr><td>Inspector</td><td></td><td>Time</td><td></td></tr><tr><td>Verified</td><td colspan="3"></td></tr></tbody></table><div class="fold">fold line</div></div>';
  for (let p = 0; p < 3; p++) h += page('Record cards (' + (p * 4 + 1) + ' to ' + (p * 4 + 4) + ')', '<div class="grid2">' + card.repeat(4) + '</div>');
  // Key
  const keyRows = rev => DC_SLIPS.map(s => { const e = dcExpected(s, rev); return [e.id, e.date, esc(e.qty), e.result, e.remarks, e.verified, e.handling]; });
  h += page('Instructor key: expected cards', '<p>Score each card against the revision in force at the time written on the card. Revision B applies to every card completed after the time of issue.</p><h3>Revision A</h3>' + table(['ID', 'Date', 'Quantity', 'Result', 'Remarks', 'Verified', 'Handling'], keyRows('A'), 'tight') + '<h3>Revision B</h3>' + table(['ID', 'Date', 'Quantity', 'Result', 'Remarks', 'Verified', 'Handling'], keyRows('B'), 'tight') + '<p class="small">Note slips 9 and 12: a value equal to the limit is within the limit (PASS). Slip 9 tests careful reading of 4.95 against 5.0.</p>');
  h += page('Document Control Relay: scoring sheet and debrief', '<table><thead><tr><th>Team</th><th>Correct cards (×2)</th><th>Revision A after issue (−1 each)</th><th>Revision log (0 or 3)</th><th>Old copies withdrawn (0 or 3)</th><th>Time bonus</th><th>Total</th></tr></thead><tbody>' + blankRows(5, 7) + '</tbody></table>' +
    debrief([
      ['Where were the uncontrolled copies?', 'Revision A copies still in the hands of members who never saw the notice, and any copy that was not withdrawn or marked obsolete at the end.'],
      ['How would this occur on the floor?', 'Printed copies kept at a workstation, personal notes, downloaded files, or a change briefed to one shift only. Clause 7.5.3 expects the current version at the point of use and prevention of unintended use of obsolete documents.'],
      ['What did the revision log give your team?', 'A record of what changed, when, and who received it. It allows anyone to confirm that they hold the current revision.'],
      ['What is the cost?', 'Mixed output that must be checked and reworked, held work, possible escapes to the customer, and lost time. Compare correct card counts between teams.'],
      ['Which requirement does this exercise relate to?', 'Clause 7.5 (documented information), mainly 7.5.3 (control), with links to 7.4 (communication) and 8.5.6 (control of changes).']
    ]));
  return wrap('Document Control Relay kit', h);
}

/* =====================================================================================
   3. Traceability Challenge
   ===================================================================================== */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const PERIODS = 10; // five days, shifts A and B
const periodName = p => DAYS[Math.floor(p / 2)] + ' ' + (p % 2 ? 'B' : 'A');
const OPS = [['A.K.', 'R.M.'], ['T.S.', 'L.P.']]; // [line][shift]
const CHECKERS = ['J.N.', 'C.V.'];

function generateTrace(seed, packId) {
  const pack = getPack(packId || 'generic');
  const V = vocab(pack);
  const rng = mulberry32((seed >>> 0) ^ 0x7ACE);
  const r = n => Math.floor(rng() * n);
  let batchNo = 2400 + r(500);
  // Batch issue segments per line
  const segs = [[], []];
  [0, 1].forEach(line => {
    let p = 0;
    while (p < PERIODS) {
      const len = Math.min(2 + r(3), PERIODS - p);
      segs[line].push({ line, batch: V.idPre + '-' + (batchNo++), from: p, to: p + len - 1 });
      p += len;
    }
  });
  // Suspect batch: second segment on line 1 (index 0); it is split to line 2 for one segment
  const suspectSeg = segs[0][1];
  const suspect = suspectSeg.batch;
  const l2 = segs[1].find(s => s.from <= suspectSeg.to && s.to >= suspectSeg.from) || segs[1][1];
  l2.batch = suspect;
  // The issue log entry for the segment after the suspect on line 1 is missing (record gap)
  const gapSeg = segs[0][2];
  const log = segs[0].concat(segs[1]).filter(s => s !== gapSeg).sort((a, b) => a.from - b.from || a.line - b.line);

  // Work items: two per line per period
  const items = [];
  let n = 101;
  for (let p = 0; p < PERIODS; p++) for (let line = 0; line < 2; line++) for (let k = 0; k < 2; k++) {
    const seg = segs[line].find(s => p >= s.from && p <= s.to);
    let status, customer = '', note = '';
    if (p <= 6 || (p <= 8 && rng() < 0.5)) { status = 'delivered'; customer = ['A', 'B', 'C'][r(3)]; } else status = p === 9 ? 'awaiting check' : 'in stock';
    items.push({ id: 'W-' + (n++), period: p, line: line + 1, unit: V.unit[line], trueBatch: seg.batch, batch: seg.batch, op: OPS[line][p % 2], checker: status === 'awaiting check' ? '' : CHECKERS[p % 2], status, customer, note });
  }
  // Delivery notes: one per customer per day
  items.forEach(i => { if (i.status === 'delivered') i.note = 'DN-' + (500 + Math.floor(i.period / 2) * 3 + 'ABC'.indexOf(i.customer)); });
  // Record gaps: blank batch fields. Force teaching cases, then add one at random.
  const pick = list => list.length ? list[r(list.length)] : null;
  const blank = new Set();
  const inSeg = (i, s) => i.line === s.line + 1 && i.period >= s.from && i.period <= s.to;
  const gapItems = items.filter(i => inSeg(i, gapSeg));
  const g1 = pick(gapItems); if (g1) blank.add(g1);
  const g2 = pick(gapItems.filter(i => !blank.has(i))); if (g2) blank.add(g2);
  const sItems = items.filter(i => i.batch === suspect && i.line === 2);
  const s1 = pick(sItems); if (s1) blank.add(s1);
  const other = items.filter(i => i.batch !== suspect && !inSeg(i, gapSeg));
  const o1 = pick(other); if (o1) blank.add(o1);
  const o2 = pick(other.filter(i => !blank.has(i))); if (o2) blank.add(o2);
  blank.forEach(i => { i.batch = ''; });
  // A missing checker initial (record quality gap, not relevant to containment)
  const mi = pick(items.filter(i => i.checker && !blank.has(i))); if (mi) mi.checker = '';
  // Complaint: a delivered work item with the suspect batch recorded
  const cands = items.filter(i => i.status === 'delivered' && i.batch === suspect);
  const complaint = cands[r(cands.length)];

  // Equipment and system log (context and one red herring)
  const eqlog = [
    [0, V.unit[0], 'Start-up verification completed. Within limits.', OPS[0][0]],
    [0, V.unit[1], 'Start-up verification completed. Within limits.', OPS[1][0]],
    [4, V.unit[1], 'Planned maintenance. Verification after maintenance within limits.', 'M.H.'],
    [5, V.unit[0], 'Measuring device verification in date. No adjustment.', 'C.V.'],
    [7, V.unit[0], 'Brief stop for cleaning. Restart verification within limits.', OPS[0][1]],
    [8, V.unit[1], 'Software or setting backup taken. No change to settings.', 'M.H.']
  ];
  return { pack, V, seed, suspect, segs, gapSeg, log, items, complaint, eqlog };
}

// Key: a work item can be excluded only if a record shows that it used a different batch.
function traceKey(d) {
  const key = [];
  d.items.forEach(i => {
    let basis = null;
    if (i.batch === d.suspect) basis = 'Batch recorded';
    else if (i.batch === '') {
      const e = d.log.find(s => s.line + 1 === i.line && i.period >= s.from && i.period <= s.to);
      if (!e) basis = 'No record: cannot exclude';
      else if (e.batch === d.suspect) basis = 'Issue log (field blank)';
    }
    if (basis) key.push({ item: i, basis, unnecessary: i.trueBatch !== d.suspect });
  });
  return key;
}

function traceabilityChallenge(seed, packId) {
  const d = generateTrace(seed, packId);
  const { pack, V } = d;
  const it = pack.term[0], its = pack.term[1];
  const key = traceKey(d);
  const shortStatus = i => i.status === 'delivered' ? 'Delivered' : i.status === 'in stock' ? 'In finished stock' : 'Awaiting check';
  const statusText = i => i.status === 'delivered' ? 'Delivered to Customer ' + i.customer + ' (' + i.note + ')' : i.status === 'in stock' ? 'In finished stock' : 'Awaiting ' + pack.stages[4];
  let h = '';
  h += page('Traceability Challenge: facilitator sheet', '<p><b>' + esc(pack.company) + '</b> (' + esc(pack.name) + '). Seed ' + d.seed + '. Teams of 3 to 5. 30 to 40 minutes. Modules 6 and 7 (Clauses 8.5.2 and 8.7).</p>' +
    '<h2>Materials per team</h2><ul><li>The week of records: ' + esc(its) + ' register, ' + esc(V.input) + ' issue log, and equipment and system log.</li><li>One complaint card (issue at minute 5).</li><li>One containment worksheet.</li></ul>' +
    '<h2>Timing</h2>' + table(['Minute', 'Step'], [['0 to 5', 'Teams read the records. Explain that the records are all the information they will have.'], ['5', 'Issue the complaint card. Start the clock.'], ['5 to 10', 'Backward trace: what did the failing ' + esc(it) + ' pass through?'], ['10 to 25', 'Forward trace: which other ' + esc(its) + ' used the suspect ' + esc(V.input) + ', and where are they now?'], ['25', 'Teams hand in the containment worksheet. Record the finishing time.'], ['25 to 40', 'Score against the key and debrief.']], 'tight') +
    '<h2>Rule given to teams</h2><div class="box">A ' + esc(it) + ' may be left out of the containment list only if a record shows that it used a different ' + esc(V.input) + '. If the records cannot show which ' + esc(V.input) + ' was used, the ' + esc(it) + ' must be contained.</div>' +
    '<h2>Scoring</h2>' + table(['Criterion', 'Points'], [['Each ' + esc(it) + ' on the key that is on the team list', '+2'], ['Each ' + esc(it) + ' on the team list that is not on the key (unnecessary recall)', '−1'], ['Correct action for each listed ' + esc(it) + ' (customer notification and recall, or hold in house)', '+1'], ['Backward trace complete (date, shift, ' + esc(V.line) + ', ' + esc(V.input) + ', people, delivery note)', '+3'], ['Speed: first, second, and third correct list', '+3, +2, +1']], 'tight'));

  // Records: work item register
  const regRows = d.items.map(i => '<tr data-item="' + i.id + '" data-line="' + i.line + '" data-period="' + i.period + '" data-batch="' + esc(i.batch) + '" data-status="' + esc(i.status) + '"><td>' + i.id + '</td><td>' + periodName(i.period) + '</td><td style="white-space:nowrap">' + esc(i.unit) + '</td><td>' + (i.batch ? esc(i.batch) : '&nbsp;') + '</td><td>' + i.op + '</td><td>' + (i.checker || '&nbsp;') + '</td><td>' + esc(shortStatus(i)) + '</td><td>' + (i.customer || '&nbsp;') + '</td><td>' + (i.note || '&nbsp;') + '</td></tr>');
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const head = '<thead><tr><th>' + esc(cap(it)) + ' ID</th><th>Day and shift</th><th>' + esc(cap(V.line)) + '</th><th>' + esc(cap(V.input)) + '</th><th>Made by</th><th>Checked by</th><th>Status</th><th>Customer</th><th>Delivery note</th></tr></thead>';
  const per = Math.ceil(regRows.length / 3);
  for (let k = 0; k < 3; k++) {
    h += page('Records: ' + its + ' register (part ' + (k + 1) + ' of 3)', (k === 0 ? '<p>' + esc(pack.company) + ', week 41. Shift A is the day shift; shift B is the late shift. A blank cell means the record was not completed.</p>' : '') + '<table class="tight">' + head + '<tbody>' + regRows.slice(k * per, (k + 1) * per).join('') + '</tbody></table>');
  }
  // Issue log and equipment log
  h += page('Records: ' + V.input + ' issue log and equipment log', '<h2>' + esc(V.input.charAt(0).toUpperCase() + V.input.slice(1)) + ' issue log</h2><p>Each entry records the ' + esc(V.input) + ' issued to a ' + esc(V.line) + ' and the shift on which it was used up.</p><table class="tight"><thead><tr><th>' + esc(V.line.charAt(0).toUpperCase() + V.line.slice(1)) + '</th><th>' + esc(V.input) + '</th><th>First shift used</th><th>Last shift used</th><th>Issued by</th></tr></thead><tbody>' +
    d.log.map(s => '<tr data-log-line="' + (s.line + 1) + '" data-log-batch="' + esc(s.batch) + '" data-log-from="' + s.from + '" data-log-to="' + s.to + '"><td>' + esc(V.unit[s.line]) + '</td><td>' + esc(s.batch) + '</td><td>' + periodName(s.from) + '</td><td>' + periodName(s.to) + '</td><td>Stores (K.B.)</td></tr>').join('') + '</tbody></table>' +
    '<h2>Equipment and system log</h2>' + table(['Day and shift', 'Equipment or system', 'Entry', 'Initials'], d.eqlog.map(e => [periodName(e[0]), esc(e[1]), esc(e[2]), e[3]]), 'tight') +
    '<h2>Staff and initials</h2>' + table(['Initials', 'Role'], [[OPS[0][0] + ', ' + OPS[0][1], esc(V.unit[0]) + ' shifts A and B'], [OPS[1][0] + ', ' + OPS[1][1], esc(V.unit[1]) + ' shifts A and B'], [CHECKERS.join(', '), pack.stages[4] + ' (shifts A and B)'], ['K.B.', 'Stores'], ['M.H.', 'Maintenance']].map(r => r.map(esc)), 'tight'));
  // Complaint card
  const c = d.complaint;
  h += page('Complaint card', '<div class="box" style="font-size:13pt" data-suspect="' + esc(d.suspect) + '" data-complaint-item="' + c.id + '"><p><b>CUSTOMER COMPLAINT CC-' + (100 + (d.seed % 900)) + '</b></p><p>Customer ' + c.customer + ' reports that ' + esc(it) + ' <b>' + c.id + '</b>, delivered on ' + c.note + ', ' + esc(V.defect) + '.</p><p>Quality has received a notice from the provider: ' + esc(V.input) + ' <b>' + esc(d.suspect) + '</b> is suspected. (' + esc(skin(pack, 'E04')) + ')</p><p><b>Your task.</b> Trace backward from ' + c.id + '. Trace forward from ' + esc(d.suspect) + '. List every ' + esc(it) + ' that must be contained, state where it is, and state the action: notify the customer and recall, or hold in house.</p></div>' +
    '<h2>Containment worksheet</h2><p>Team: ____________________ &nbsp; Finish time: ________</p><p>Backward trace of ' + c.id + ': day and shift ________ ' + esc(V.line) + ' ________ ' + esc(V.input) + ' ________ made by ____ checked by ____ delivery note ________</p><table class="tight"><thead><tr><th>' + esc(it) + ' ID</th><th>Where is it now</th><th>Reason for containment</th><th>Action</th></tr></thead><tbody>' + blankRows(10, 4) + '</tbody></table>');
  // Key
  const keyRows = key.map(k => '<tr data-key-item="' + k.item.id + '"><td>' + k.item.id + '</td><td>' + periodName(k.item.period) + '</td><td>' + esc(k.item.unit) + '</td><td>' + esc(shortStatus(k.item) + (k.item.customer ? ', ' + k.item.customer : '')) + '</td><td>' + esc(k.basis) + '</td><td>' + (k.item.status === 'delivered' ? 'Notify Customer ' + k.item.customer + '; recall' : 'Hold in house; flag') + '</td></tr>').join('');
  const unnecessary = key.filter(k => k.unnecessary);
  const excludedBlank = d.items.filter(i => i.batch === '' && !key.some(k => k.item === i));
  h += page('Facilitator key: containment list', '<p>Suspect ' + esc(V.input) + ': <b>' + esc(d.suspect) + '</b>. Complaint ' + esc(it) + ': <b>' + c.id + '</b>. Seed ' + d.seed + '. This key is derived from the records printed in this kit.</p>' +
    '<h3>Backward trace of ' + c.id + '</h3><p>' + periodName(c.period) + ', ' + esc(c.unit) + ', ' + esc(V.input) + ' ' + esc(c.batch) + ', made by ' + c.op + ', checked by ' + (c.checker || '(blank)') + ', ' + esc(statusText(c)) + '.</p>' +
    '<h3>Correct containment list (' + key.length + ' ' + esc(its) + ')</h3><table class="tight"><thead><tr><th>ID</th><th>Shift</th><th>' + esc(V.line) + '</th><th>Where</th><th>Basis</th><th>Action</th></tr></thead><tbody>' + keyRows + '</tbody></table>');
  h += page('Facilitator key: notes', '<h3>What the record gaps cost</h3><p>' + unnecessary.length + ' ' + esc(its) + ' on the list (' + (unnecessary.map(k => k.item.id).join(', ') || 'none') + ') did not use the suspect ' + esc(V.input) + '. The facilitator knows this; the teams cannot, because the batch field is blank and the issue log has no entry for ' + esc(d.V.unit[0]) + ' from ' + periodName(d.gapSeg.from) + ' to ' + periodName(d.gapSeg.to) + ' (the missing entry was ' + esc(d.gapSeg.batch) + '). These are unnecessary recalls caused by record gaps. ' +
    (excludedBlank.length ? 'Blank batch fields that the issue log resolves to another ' + esc(V.input) + ' (' + excludedBlank.map(i => i.id).join(', ') + ') may be excluded; a team that contains them loses 1 point each.' : '') + '</p>' +
    '<p class="small">Red herring: the planned maintenance on ' + esc(V.unit[1]) + ' (' + periodName(4) + ') does not affect the containment list. The suspect ' + esc(V.input) + ' was split between both ' + esc(V.line) + 's, so a team that traces only ' + esc(c.unit) + ' will miss part of the list.</p>');
  h += page('Traceability Challenge: debrief', debrief([
    ['Which record gaps expanded the recall?', 'The blank ' + V.input + ' fields in the register and the missing issue log entry. Without them the team cannot prove that a ' + it + ' used a different ' + V.input + ', so it must be contained.'],
    ['What does this imply for the floor?', 'Complete the identification fields at the time of the activity, every time (Clauses 8.5.2 and 7.5). A blank field costs far more later than it saves now.'],
    ['Why did some teams miss part of the list?', 'They traced only the line on the complaint record. The suspect ' + V.input + ' was split between two lines. Forward tracing must follow the input, not the line.'],
    ['What is the difference between the backward and the forward trace?', 'Backward: from the failing ' + it + ' to its inputs, equipment, people, and records. Forward: from the suspect input to every ' + it + ' that used it and where each one is now.'],
    ['Who decides to notify the customer, and when?', 'The person with that authority under the company procedure, without delay once delivered ' + its + ' may be affected [OWNER INPUT]. Clause 8.7 covers the control of nonconforming outputs, including those detected after delivery.'],
    ['Which requirements does this exercise relate to?', 'Clause 8.5.2 (identification and traceability), 8.7 (nonconforming outputs), 7.5 (records), and 10.2 (corrective action for the cause).']
  ]));
  return wrap('Traceability Challenge kit', h);
}

/* =====================================================================================
   4. Management Review Boardroom
   ===================================================================================== */
function managementReview(pack) {
  const it = pack.term[0], its = pack.term[1], st = pack.stages, co = pack.company;
  let h = '';
  h += page('Management Review Boardroom: facilitator sheet', '<p><b>' + esc(co) + '</b> (' + esc(pack.name) + '). Teams of 4 to 6 acting as top management. 45 to 60 minutes. Modules 2, 3, 8, and 9 (Clause 9.3).</p>' +
    '<h2>Materials per team</h2><ul><li>One data packet (pages 2 to 5) per member, or one per pair.</li><li>One minutes template.</li><li>A role card for each member: managing director (chair), operations manager, quality coordinator, purchasing lead, people and training lead, and customer service lead (optional).</li></ul>' +
    '<h2>Timing</h2>' + table(['Minute', 'Step'], [['0 to 5', 'Brief: the team is top management. The review must reach decisions and record them. The budget available for this review is 15,000 units.'], ['5 to 15', 'Members read the packet. Each member prepares one point from the area of the role card.'], ['15 to 45', 'The review meeting. The chair keeps time. The quality coordinator records minutes on the template.'], ['45 to 50', 'Hand in the minutes. The facilitator scores with the checklist.'], ['50 to 60', 'Debrief and compare decisions across teams.']], 'tight') +
    '<h2>Scoring</h2><p>Use the scoring checklist. Inputs considered (up to 10), outputs recorded (up to 3), decision quality (up to 8), action quality (up to 6). Maximum 27.</p>');
  // Data packet
  h += page('Data packet 1: objectives and customers', '<p>' + esc(co) + '. Management review for the year to date. All data are fictional.</p>' +
    '<h2>Quality objectives (quarterly results)</h2>' + table(['Objective', 'Target', 'Q1', 'Q2', 'Q3', 'Q4', 'Trend'], [
      ['On-time delivery of ' + esc(its), '95%', '96%', '94%', '92%', '90%', 'Falling three quarters'],
      ['First-pass yield at ' + esc(st[4]), '92%', '90%', '91%', '89%', '88%', 'Below target all year'],
      ['Complaints per 100 ' + esc(its) + ' delivered', '1.0 or fewer', '0.8', '1.1', '1.4', '1.9', 'Rising'],
      ['Training plan completion', '100%', '85%', '88%', '80%', '72%', 'Falling'],
      ['Customer satisfaction survey (score out of 10)', '7.5 or more', '7.8', '7.6', '7.4', '7.1', 'Falling']]) +
    '<h2>Complaint summary (Q4: 12 complaints)</h2>' + table(['Category', 'Count', 'Notes'], [
      ['Defect traced to an input from provider P-03', '6', 'Repeat of the Q3 complaint type. Two customers affected.'],
      ['Late delivery', '3', 'All in the last two weeks of the quarter.'],
      ['Wrong identification on a delivered ' + esc(it), '2', 'Contained. Corrective action open.'],
      ['Documentation missing at handover', '1', 'Corrected the same day.']]) +
    '<h2>Changes in context</h2><ul><li>A new customer contract starts next quarter and adds about 20 percent to volume at ' + esc(st[2]) + ', the constraint.</li><li>Two experienced staff at ' + esc(st[2]) + ' retire within six months.</li><li>A heat wave in the summer raised temperatures in the work area above the documented limit on four days (a climate-related external issue).</li></ul>');
  h += page('Data packet 2: audits and providers', '<h2>Internal audit results (this year)</h2>' + table(['Audit', 'Result'], [
    ['' + esc(st[4]) + ' (Clause 7.1.5)', 'Minor nonconformity: one measuring device past its verification date and still in use.'],
    ['' + esc(st[2]) + ' (Clause 7.2)', 'Minor nonconformity: two people working without a qualification record.'],
    ['Purchasing (Clause 8.4)', 'Observation: provider P-04 in use before its evaluation was complete.'],
    ['' + esc(st[5]) + ' (planned Q3)', 'Not performed. No reason recorded.']]) +
    '<p>External surveillance audit by the certification body: due in four months.</p>' +
    '<h2>External provider performance</h2>' + table(['Provider', 'Supplies', 'On time', 'Accepted at ' + esc(st[0]), 'Trend', 'Status'], [
      ['P-01', 'Main input', '98%', '99.5%', 'Stable', 'Approved'],
      ['P-02', 'Consumables', '95%', '99.0%', 'Stable', 'Approved'],
      ['P-03', 'Critical input', '88%', '94.0%', 'Falling two quarters', 'Approved; evaluation overdue'],
      ['P-04', 'Packaging or secondary input', '100%', '100% (3 deliveries)', 'New', 'Not yet evaluated']]));
  h += page('Data packet 3: risks and resources', '<h2>Risk and opportunity register (extract)</h2>' + table(['ID', 'Risk or opportunity', 'Likelihood', 'Impact', 'Current control', 'Owner'], [
    ['R1', 'Only one qualified person for set-up at ' + esc(st[2]) + ' (the constraint)', 'High', 'High', 'None recorded', 'Not assigned'],
    ['R2', 'Dependence on provider P-03 for a critical input', 'High', 'High', '"Monitor"', 'Purchasing lead'],
    ['R3', 'Ageing measuring devices at ' + esc(st[4]), 'Medium', 'High', 'Calibration schedule', 'Quality coordinator'],
    ['R4', 'System or power outage', 'Low', 'Medium', 'Backup and recovery plan tested in Q2', 'Operations manager'],
    ['O1', 'Produce identification automatically from the ' + esc(it) + ' record', 'n/a', 'Medium benefit', 'Idea only', 'Not assigned']], 'tight') +
    '<h2>Resource requests (budget available: 15,000 units)</h2>' + table(['ID', 'Request', 'Cost', 'Requested by', 'Stated reason'], [
      ['RR1', 'Train and qualify two more people for set-up at ' + esc(st[2]), '6,000', 'Operations manager', 'Retirements and new contract'],
      ['RR2', 'Replace two measuring devices at ' + esc(st[4]), '4,500', 'Quality coordinator', 'Audit finding and device age'],
      ['RR3', 'New furniture for the staff break room', '5,000', 'People and training lead', 'Staff request'],
      ['RR4', 'Upgrade the customer portal', '12,000', 'Customer service lead', 'Customer convenience'],
      ['RR5', 'Second-source evaluation for the critical input', '2,000', 'Purchasing lead', 'Provider P-03 performance']], 'tight'));
  h += page('Data packet 4: previous actions', '<h2>Actions from the previous management review</h2>' + table(['ID', 'Action', 'Owner', 'Due', 'Status'], [
    ['A1', 'Evaluate provider P-03 and agree an improvement plan', 'Purchasing lead', 'Q3', 'Open. Overdue.'],
    ['A2', 'Revise the ' + esc(st[4]) + ' instruction after a missed defect', 'Quality coordinator', 'Q2', 'Closed. No effectiveness check recorded.'],
    ['A3', 'Recover the training plan', 'People and training lead', 'Q3', 'In progress. Completion falling.'],
    ['A4', 'Mark the hold area at ' + esc(st[0]), 'Operations manager', 'Q2', 'Closed. Verified effective in Q3 audit.'],
    ['A5', 'Review the quality objectives for next year', 'Managing director', 'Q4', 'Not started.']]) +
    '<h2>Role cards (cut apart)</h2><div class="cards">' + [
      ['Managing director (chair)', 'Keep to time. Make sure every decision has an owner and a date. Decide on resources within the budget.'],
      ['Operations manager', 'Present delivery performance, the new contract, and the constraint at ' + st[2] + '.'],
      ['Quality coordinator', 'Present audit results, complaints, and previous actions. Record the minutes.'],
      ['Purchasing lead', 'Present provider performance. Explain the status of action A1.'],
      ['People and training lead', 'Present training completion and the retirements. Present request RR3.'],
      ['Customer service lead', 'Present complaints and satisfaction. Present request RR4.']
    ].map(r => '<div class="card" style="height:34mm"><div class="id">' + esc(r[0]) + '</div><div class="t">' + esc(r[1]) + '</div></div>').join('') + '</div>');
  // Minutes template
  const inputs = ['Status of actions from previous reviews', 'Changes in external and internal issues', 'Customer satisfaction and feedback from interested parties', 'Extent to which quality objectives are met', 'Process performance and conformity of ' + its, 'Nonconformities and corrective actions', 'Monitoring and measurement results', 'Audit results', 'Performance of external providers', 'Adequacy of resources', 'Effectiveness of actions taken for risks and opportunities', 'Opportunities for improvement'];
  h += page('Management review minutes template', '<p>Date: ____________ &nbsp; Chair: ____________________ &nbsp; Attendees: ______________________________________</p>' +
    '<table class="tight"><thead><tr><th style="width:40%">Input reviewed</th><th>Key points and conclusion</th></tr></thead><tbody>' + inputs.map(i => '<tr><td>' + esc(i) + '</td><td style="height:9mm"></td></tr>').join('') + '</tbody></table>' +
    '<h3>Decisions</h3><table class="tight"><thead><tr><th>Decision</th><th>Improvement, change to the QMS, or resource</th><th>Linked data</th></tr></thead><tbody>' + blankRows(4, 3) + '</tbody></table>');
  h += page('Management review minutes template (continued)', '<h3>Actions</h3><table><thead><tr><th>Action</th><th>Owner</th><th>Due date</th><th>Measure of success</th></tr></thead><tbody>' + blankRows(8, 4) + '</tbody></table>' +
    '<h3>Resource allocation (budget 15,000 units)</h3><table><thead><tr><th>Request</th><th>Approved / Deferred / Rejected</th><th>Amount</th><th>Reason</th></tr></thead><tbody>' + ['RR1', 'RR2', 'RR3', 'RR4', 'RR5'].map(r => '<tr class="blank"><td>' + r + '</td><td></td><td></td><td></td></tr>').join('') + '<tr class="blank"><td><b>Total</b></td><td></td><td></td><td></td></tr></tbody></table><p>Next review date: ____________ &nbsp; Minutes approved by: ____________________</p>');
  // Scoring checklist
  h += page('Scoring checklist', '<p>Team: ____________________. Tick each item that the minutes show. One point each unless stated.</p>' +
    '<h3>Inputs considered (up to 10)</h3>' + table(['Item', 'Point'], [['Previous action status, including overdue A1 and A2 without an effectiveness check', ''], ['Changes in context: new contract, retirements, heat events', ''], ['Customer satisfaction and complaint trend', ''], ['Objectives: at least two trends identified', ''], ['Process performance (first-pass yield)', ''], ['Nonconformities and corrective actions (repeat complaint type)', ''], ['Audit results, including the skipped audit', ''], ['External provider performance (P-03 and P-04)', ''], ['Adequacy of resources', ''], ['Effectiveness of risk actions (R1 and R2 have no effective control)', '']], 'tight') +
    '<h3>Outputs recorded (up to 3)</h3>' + table(['Item', 'Point'], [['Improvement opportunities identified', ''], ['Changes needed to the QMS identified (for example, objectives, provider controls, audit program)', ''], ['Resource needs decided', '']], 'tight') +
    '<h3>Decision quality (up to 8)</h3>' + table(['Item', 'Points'], [['Funds RR1 (constraint competence risk R1)', '2'], ['Funds RR2 (audit finding and risk R3)', '2'], ['Acts on P-03: funds RR5 or sets a dated improvement plan or alternative source', '2'], ['Defers or rejects RR3 and RR4 with a reason, or funds them only within budget after the quality-critical items', '1'], ['Stays within the 15,000 budget', '1']], 'tight') +
    '<h3>Action quality (up to 6)</h3>' + table(['Item', 'Points'], [['Every action has a named owner', '2'], ['Every action has a due date', '2'], ['At least two actions have a measurable measure of success', '2']], 'tight') +
    '<p><b>Total: ______ / 27</b></p>');
  h += page('Facilitator key', '<h3>Trends a strong team identifies</h3><ul><li>Complaints rising and satisfaction falling, driven mainly by provider P-03 (six of twelve complaints, a repeat type).</li><li>On-time delivery falling while the constraint at ' + esc(st[2]) + ' depends on one qualified person, before a 20 percent volume increase and two retirements.</li><li>Training completion falling, which links to the ' + esc(st[2]) + ' audit finding.</li><li>Measurement weakness at ' + esc(st[4]) + ': audit finding, ageing devices, first-pass yield below target.</li><li>Control gaps: overdue action A1, A2 closed without an effectiveness check, a skipped audit, and P-04 used before evaluation.</li></ul>' +
    '<h3>Model decisions</h3><ol><li>Approve RR1 (6,000), RR2 (4,500), and RR5 (2,000): total 12,500, matched to risks R1, R2, and R3 and to audit findings.</li><li>Defer RR4 to next year\'s plan; it does not address the main causes of dissatisfaction. Refer RR3 to the facilities budget, or approve part of it within the remaining 2,500 with a stated reason.</li><li>Assign owners to R1 and O1. Replace "monitor" for R2 with a dated control.</li><li>Reopen A2 for an effectiveness check. Reschedule the skipped audit before the surveillance audit. Complete the P-04 evaluation.</li><li>Review the work environment limits and controls for heat events.</li><li>Set the next review date and review objectives for next year (action A5).</li></ol>' +
    debrief([
      ['Which data changed your decision?', 'Usually the link between P-03 and the complaints, and the single qualified person at the constraint before the new contract. Strong teams cite the data that justified each resource decision.'],
      ['Which decisions had no owner or date?', 'Compare the action tables. An action with no owner or date is rarely completed and gives an auditor nothing to verify (Clause 9.3.3).'],
      ['Why fund competence at the constraint before customer-facing items?', 'The constraint limits the output of the whole system. Losing its only qualified person stops delivery and raises defects where capacity is most expensive.'],
      ['What would an auditor look for in your minutes?', 'Evidence that the required inputs were considered and that the outputs include decisions on improvement, changes to the QMS, and resources, with actions followed up at the next review.'],
      ['Which requirements does this exercise relate to?', 'Clause 9.3 (management review), with links to 5.1 (leadership), 6.1 (risks and opportunities), 6.2 (objectives), 8.4 (external providers), 9.1.3 (analysis), and 9.2 (internal audit).']
    ]));
  return wrap('Management Review Boardroom kit', h);
}

/* =====================================================================================
   5. Workplace Evidence Hunt
   ===================================================================================== */
const HUNT = [
  ['Policy displayed and understandable', '5.2.2', 'The current policy is visible or easy to reach. A person nearby can explain it in their own words.'],
  ['Current objectives visible with recent data', '6.2', 'Objectives for the area are shown with data from the last period, not last year.'],
  ['Instructions, procedures, or templates at point of use are current', '7.5.3', 'Compare the revision at the point of use with the revision in the document system.'],
  ['No uncontrolled copies or personal notes in use', '7.5.3', 'Look for photocopies, handwritten notes, or saved files used in place of the controlled document.'],
  ['Measuring and testing resources show valid status', '7.1.5', 'Calibration or verification labels or system status are in date and legible.'],
  ['Training and qualification matrix posted and current', '7.2', 'The matrix shows the people working today as qualified for their tasks.'],
  ['Work items show unique identification and status', '8.5.2', 'Each work item has an identifier and a visible status: physical label or system status.'],
  ['Hold area or hold status segregated, labeled, and flagged', '8.7', 'Held items are separate, marked, and recorded. Nothing on hold can be used by mistake.'],
  ['Customer property identified and protected', '8.5.3', 'Customer material, equipment, or data is marked and protected from loss or damage.'],
  ['Inputs and consumables labeled, controlled, and in date or valid version', '8.5.2, 8.4.2', 'Labels show identity and expiry or version. Expired or superseded inputs are removed.'],
  ['Environmental or operating conditions recorded and within limits', '7.1.4', 'Conditions that matter (temperature, cleanliness, system availability, or similar) are recorded and within limits.'],
  ['Records completed at the time, legible, and attributed', '7.5.2, 7.5.3', 'Entries are made as the work is done, readable, and initialed or attributed to a user.'],
  ['Handling, packaging, storage, or handover follow instructions', '8.5.4', 'Work items are handled and stored as the instruction says, and handovers are recorded.'],
  ['Nonconformance log current and dispositions assigned', '8.7, 10.2', 'Open entries have an owner and a disposition. Nothing is open without action.'],
  ['People can state their authority to stop a process', '5.3, 7.3', 'Ask: "If you saw a problem, could you stop the process? Whom would you tell?"']
];
const HUNT_SECTOR = {
  'generic': ['Instruction revision on the workstation copy or screen', 'Label or system status on measuring tools', 'Work item label or record status', 'Temperature or system availability log'],
  'discrete-manufacturing': ['Drawing and routing revision at the machine', 'Calibration label on micrometers, gauges, and torque tools', 'Batch traveler and part marking', 'Shop temperature where tolerances are tight'],
  'process-food': ['Recipe and label artwork version on the line', 'Verification status of temperature probes and scales', 'Production batch code and status tags', 'Room and cold store temperature records'],
  'electronics': ['Recipe or instruction revision on the tool screen', 'Gauge verification status and software version', 'Lot traveler and system lot status', 'Cleanroom particle and humidity records'],
  'construction': ['Drawing revision on site and in the site office', 'Survey instrument calibration certificate', 'Work package inspection and test plan status', 'Weather and curing condition records'],
  'it-software': ['Runbook or procedure version in the repository', 'Test tool and monitoring configuration version', 'Release identifier and ticket status', 'System availability and monitoring alerts'],
  'healthcare': ['Protocol sheet version at the point of care', 'Device verification label or asset status', 'Case identification and status on the record', 'Equipment readiness and room condition records'],
  'logistics': ['Slotting and handling instruction version', 'Scale and scanner verification status', 'Order and pallet labels; system order status', 'Cold store and vehicle temperature records'],
  'professional-services': ['Report template and methodology version in use', 'Calculation model version and change record', 'Engagement file reference and review status', 'System access and backup status']
};
function evidenceHunt(pack) {
  let h = '';
  h += page('Workplace Evidence Hunt: facilitator sheet', '<p><b>' + esc(pack.company) + '</b>. Pairs. 20 to 30 minutes. Modules 4, 6, and 7. Operators and technicians.</p>' +
    '<div class="box"><b>Safety rule.</b> Participants observe only. They do not touch equipment, open systems, or enter restricted zones. Areas are visited only with the area supervisor\'s approval, arranged in advance. Digital areas are viewed with the system owner present.</div>' +
    '<div class="box"><b>No blame.</b> Record what is seen, not who did it. Do not write names on the checklist. Gaps are system findings.</div>' +
    '<h2>Timing</h2>' + table(['Minute', 'Step'], [['0 to 3', 'Assign areas and items. Read the safety rule aloud.'], ['3 to 18', 'Pairs observe and record evidence of conformity and gaps.'], ['18 to 25', 'Pairs report back. The group sorts gaps by clause on the report-back sheet.'], ['25 to 30', 'The group selects two gaps for immediate improvement and names an owner for each.']], 'tight') +
    '<h2>Area assignment</h2><table><thead><tr><th>Pair</th><th>Area (physical or digital)</th><th>Items to check</th><th>Supervisor approval (initials)</th></tr></thead><tbody>' + blankRows(6, 4) + '</tbody></table>' +
    '<h2>Scoring (optional)</h2><p>One point for each item with specific evidence recorded (what was seen, where). One point for each gap stated as a fact without blame. The aim is accurate observation, not the number of gaps.</p>');
  h += page('Evidence checklist (one per pair)', '<p>Pair: ____________________ &nbsp; Area: ____________________ &nbsp; Time: ________</p><table class="tight"><thead><tr><th>#</th><th style="width:28%">Item</th><th>Clause</th><th style="width:30%">Evidence seen (what and where)</th><th>Conforms</th><th>Gap</th><th>Not seen</th></tr></thead><tbody>' +
    HUNT.map((x, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(x[0]) + '</td><td>' + x[1] + '</td><td style="height:11mm"></td><td></td><td></td><td></td></tr>').join('') + '</tbody></table>');
  h += page('What to look for, by role and sector', table(['#', 'Item', 'What to look for'], HUNT.map((x, i) => [String(i + 1), esc(x[0]), esc(x[2])]), 'tight') +
    '<h3>Role notes</h3>' + table(['Role', 'Focus'], [['Operator', 'Items 1, 3, 4, 5, 7, 8, 12, 13, and 15. Check the things used every shift.'], ['Technician', 'All items. Give extra attention to 5, 10, and 11, and to how a measuring status is confirmed.'], ['Supervisor (as observer)', 'Items 2, 6, and 14, and how each gap could arise in the system.']], 'tight'));
  h += page('Sector notes (adjust items 3, 5, 7, and 11)', table(['Pack', 'Item 3: current instruction', 'Item 5: measuring status', 'Item 7: identification', 'Item 11: conditions'], packs.map(p => { const s = HUNT_SECTOR[p.id] || HUNT_SECTOR.generic; return ['<b>' + esc(p.name) + '</b>'].concat(s.map(esc)); }), 'tight') +
    '<p class="small">Healthcare: management system topics only. Clinical and safety requirements are outside this program. Digital areas: check the status shown in the system with the system owner; do not change any record.</p>');
  h += page('Report-back sheet (group)', '<table><thead><tr><th>Clause</th><th>Gaps reported (item number and fact)</th><th>Pairs reporting</th></tr></thead><tbody>' +
    ['5 Leadership', '6 Planning', '7 Support', '8 Operation', '9 and 10 Evaluation and improvement'].map(c => '<tr class="tall-row"><td>' + c + '</td><td></td><td></td></tr>').join('') + '</tbody></table>' +
    '<h3>Two gaps selected for immediate improvement</h3><table><thead><tr><th>Gap</th><th>Improvement</th><th>Owner</th><th>Due</th><th>How we will know it worked</th></tr></thead><tbody>' + blankRows(2, 5, 'tall-row') + '</tbody></table>' +
    '<h3>Good practice observed</h3><div class="lines"><div></div><div></div></div>');
  h += page('Workplace Evidence Hunt: debrief', debrief([
    ['Which items had clear evidence of conformity?', 'Accept specific evidence: a label, a revision number, a record entry. Recognize good practice before discussing gaps.'],
    ['Which gaps were found most often, and which clause do they relate to?', 'Typical groupings: document currency (7.5.3), measuring status (7.1.5), identification and hold status (8.5.2, 8.7). Sorting by clause shows where the system is weak.'],
    ['How did you record a gap without blame?', 'State what was seen and where, not who. Example: "Instruction at station 3 shows revision C; the system shows revision D."'],
    ['Why select only two gaps?', 'Two actions with an owner and a date are more likely to be completed than a long list. The remaining gaps go to the area supervisor for the normal process.'],
    ['What would an auditor ask about these items?', 'To see the evidence, and to ask the person at the workstation to explain it. Item 15 is a common audit question.']
  ]));
  return wrap('Workplace Evidence Hunt kit', h);
}

/* =====================================================================================
   6. Change Control Challenge
   ===================================================================================== */
const CC_KEY = {
  provider: { label: 'New external provider', clauses: '8.4, 8.5.6', review: 'Yes', approve: 'Purchasing with quality; the owner of the receiving stage', verify: 'Evaluate and approve the provider against criteria. Verify the first deliveries at {S0} (inspection or certificate check). Confirm the specification is unchanged.', records: 'Provider evaluation and approval; approved provider list updated; first-delivery verification record.' },
  setting: { label: 'Adjusted process setting', clauses: '8.5.6, 8.5.1', review: 'Yes', approve: 'Process owner and quality (engineering where applicable)', verify: 'Trial under controlled conditions with increased checks. Compare the output with requirements before normal use.', records: 'Change request; review results; person authorizing; trial results; revised instruction.' },
  tool: { label: 'New measuring tool or software version', clauses: '7.1.5, 8.5.6', review: 'Yes', approve: 'Owner of measuring resources (quality or metrology) and the process owner', verify: 'Calibrate or verify before use. Compare results with the existing tool or version. Train the users. Update the instruction.', records: 'Calibration or verification record; equipment or software register entry; comparison results; training record.' },
  template: { label: 'Revised template, label, or packaging', clauses: '7.5.3, 8.5.2, 8.2', review: 'Yes', approve: 'Document owner; the customer where the item is customer-specified', verify: 'Check against customer and product requirements. Trial before use. Withdraw obsolete stock and versions.', records: 'Revision log and approved revision; customer approval if required; record of withdrawal of the old version.' },
  handoff: { label: 'Changed handoff or communication method', clauses: '7.4, 8.5.6', review: 'Yes', approve: 'Area supervisor or process owner', verify: 'Trial period. Sample handoffs to confirm that all required information is passed and retained.', records: 'Revised procedure; briefing record; a retained handoff record (a method that leaves no record should not be approved).' }
};
// Five changes per pack: [category, text]; the trap is [text, key fields].
const CC = {
  'generic': { changes: [['provider', 'Purchasing proposes a new external provider for a routine input received at Intake. The current provider has raised its price.'], ['tool', 'The Final check team proposes replacing its measuring tool with a newer model of the same type.'], ['template', 'Finishing proposes a revised form layout that moves the work item number to the reverse side.'], ['handoff', 'Delivery proposes replacing the written handoff sheet between shifts with a verbal briefing.']],
    trap: { cat: 'setting', pos: 1, text: 'A team leader proposes shortening the set-up step at the Core process by five minutes per shift. The request describes it as minor housekeeping.', why: 'The Core process is the constraint. A shorter set-up may raise the defect rate where every defect consumes capacity that cannot be recovered. It needs change review, a controlled trial, and an in-process check.' } },
  'discrete-manufacturing': { changes: [['provider', 'Purchasing proposes a new bar stock provider with a shorter lead time. The material grade is unchanged.'], ['setting', 'Cutting and machining proposes raising the spindle speed on one machine to reduce cycle time.'], ['tool', 'Final inspection proposes replacing a dial caliper with a digital caliper of the same range.'], ['template', 'Pack and ship proposes a new carton label layout to reduce printing cost.']],
    trap: { cat: 'setting', pos: 4, text: 'Assembly proposes checking the torque tool at the start of each week instead of each shift. The request is described as a paperwork reduction.', why: 'Assembly is the constraint. A drifting torque tool could produce a week of defective assemblies, each consuming constraint time and possibly escaping. Reducing a verification frequency is a change to the measuring control (7.1.5) and needs review and data on tool stability.' } },
  'process-food': { changes: [['provider', 'Purchasing proposes a new provider for a dry ingredient. The specification sheet appears identical.'], ['tool', 'The laboratory proposes a new version of the software that records temperature probe results.'], ['template', 'Packaging and labeling proposes revised label artwork with a new layout for the allergen panel.'], ['handoff', 'Dispatch proposes a shared electronic message in place of the signed dispatch handover sheet.']],
    trap: { cat: 'setting', pos: 2, text: 'Cooking or processing proposes a shorter hold time for the last production batch of each shift so that cleaning can start on time. The request is described as a scheduling adjustment.', why: 'Cooking or processing is the constraint. A shorter hold time is a process parameter change, not a scheduling matter. An under-processed batch is lost constraint capacity or an escape. It needs change review and verification against product requirements (food safety requirements are outside this program).' } },
  'electronics': { changes: [['provider', 'Purchasing proposes a new provider for the shipping containers used at Pack and ship.'], ['setting', 'Final clean proposes raising the rinse temperature by two degrees.'], ['tool', 'Final inspection proposes a software update to the thickness gauge.'], ['handoff', 'Incoming inspection proposes moving the shift handoff from a paper log to an online form.']],
    trap: { cat: 'template', pos: 0, text: 'Polish or main process proposes a revised run sheet that removes the field for the pad change count, because operators find it repetitive.', why: 'Polish or main process is the constraint. The pad change count triggers pad replacement. Removing it removes the control on a cause of defects at the constraint. A document change that removes a control needs review by the process owner.' } },
  'construction': { changes: [['provider', 'The project team proposes a new provider of ready-mixed concrete for the next phase.'], ['tool', 'The survey team proposes using a new survey instrument of a different make.'], ['template', 'Handover review proposes a revised handover checklist template with fewer fields.'], ['handoff', 'Close-out and warranty proposes taking defect reports by telephone instead of the written defect form.']],
    trap: { cat: 'setting', pos: 3, text: 'Site execution proposes letting a crew start the next work package before the previous hold point inspection is booked. The request is described as sequencing.', why: 'Site execution is the constraint. Work built over an uninspected hold point may have to be removed and rebuilt, consuming crew capacity. A change to the inspection sequence needs review (8.5.6) and agreement with the inspection and test plan.' } },
  'it-software': { changes: [['provider', 'The team proposes a new cloud hosting provider for the test environment.'], ['tool', 'Test proposes upgrading the automated test framework to a new major version.'], ['template', 'Release review proposes a shorter release note template.'], ['handoff', 'Deploy and support proposes moving the on-call handoff from a written log to a chat channel.']],
    trap: { cat: 'setting', pos: 2, text: 'Build proposes changing a default build setting to make builds faster. The request is described as a configuration tidy-up.', why: 'Build is the constraint. A changed build setting can change the released output. Defects found later return to Build as rework and consume its capacity. It needs change review, a regression test, and a configuration record.' } },
  'healthcare': { changes: [['provider', 'Purchasing proposes a new provider of single-use dressing packs.'], ['tool', 'Assessment proposes replacing a blood pressure monitor with a newer model.'], ['template', 'Documentation and results review proposes a revised results review form.'], ['handoff', 'Discharge or handover check proposes a verbal handover in place of the written handover checklist at weekends.']],
    trap: { cat: 'setting', pos: 1, text: 'Treatment or procedure proposes moving the equipment readiness check from before each session to the start of each day. The request is described as removing duplication.', why: 'Treatment or procedure is the constraint. Equipment found not ready mid-day stops sessions and delays every later case. A change to a check frequency needs review by the process owner (management system topics only; clinical requirements are outside this program).' } },
  'logistics': { changes: [['provider', 'Transport planning proposes a new haulage provider for regional deliveries.'], ['tool', 'Receiving proposes a new handheld scanner model with updated firmware.'], ['template', 'Final dispatch check proposes a new dispatch label format.'], ['handoff', 'Delivery and proof of delivery proposes accepting a photograph in place of a signature as proof of delivery.']],
    trap: { cat: 'setting', pos: 0, text: 'Picking and packing proposes changing the pick path in the warehouse system to start from the far aisle. The request is described as a layout preference.', why: 'Picking and packing is the constraint. The pick path changes pick rate and the risk of mis-picks. A wrong pick found later costs constraint time to correct. It is a system configuration change and needs review and a trial.' } },
  'professional-services': { changes: [['provider', 'The practice proposes a new external data provider for market statistics.'], ['tool', 'Peer review proposes using a new version of the spreadsheet model used for checks.'], ['template', 'Client sign-off proposes a revised engagement acceptance form.'], ['handoff', 'Aftercare and feedback proposes collecting client feedback by informal call instead of the written survey.']],
    trap: { cat: 'setting', pos: 4, text: 'Delivery or analysis proposes updating a shared calculation macro so that values are rounded to whole numbers. The request is described as formatting.', why: 'Delivery or analysis is the constraint. Rounding changes results, not only their appearance. Errors return to the analysts as rework. A change to a calculation tool needs review and validation before use (7.1.5 and 8.5.6).' } }
};
function ccChanges(pack) {
  const def = CC[pack.id] || CC.generic;
  const list = def.changes.map(c => ({ cat: c[0], text: c[1], trap: false }));
  list.splice(def.trap.pos, 0, { cat: def.trap.cat, text: def.trap.text, trap: true, why: def.trap.why });
  return list;
}
function changeControl() {
  let h = '';
  h += page('Change Control Challenge: facilitator sheet', '<p>Teams of 4. 30 minutes. Modules 3 and 6 (Clauses 6.3 and 8.5.6). One page of change cards for each industry pack follows. Use the pack that matches the group; the generic pack is the default.</p>' +
    '<h2>Timing</h2>' + table(['Minute', 'Step'], [['0 to 3', 'Brief: for each proposed change, decide whether it needs review, who approves, what verification is needed before use, and what records are kept.'], ['3 to 20', 'Teams complete the decision sheet. Allow about three minutes per change.'], ['20 to 25', 'Score against the instructor key for the pack.'], ['25 to 30', 'Debrief. Reveal the trap.']], 'tight') +
    '<h2>Scoring (maximum 22)</h2>' + table(['Criterion', 'Points'], [['For each change: review decision correct', '1'], ['For each change: an appropriate approver named', '1'], ['For each change: verification before use is specific', '1'], ['For each change: records named', '1'], ['Trap identified as affecting the constraint, with the reason', '2']], 'tight') +
    '<p class="small">Every change in the set needs some form of review. Teams that answer "no review needed" for a change described as minor have found the lesson of the game. Accept equivalent approvers and records that match the company change procedure [OWNER INPUT].</p>');
  packs.forEach(p => {
    const list = ccChanges(p);
    h += page('Change cards: ' + p.name, '<p><b>' + esc(p.company) + '.</b> Stages: ' + p.stages.map(esc).join(', ') + '. The constraint is <b>' + esc(p.stages[2]) + '</b> (not shown to teams until the debrief).</p><div class="cards">' +
      list.map((c, i) => '<div class="card" style="height:46mm"><div class="id">Change ' + (i + 1) + '</div><div class="t">' + esc(c.text) + '</div></div>').join('') + '</div>');
  });
  h += page('Decision sheet', '<p>Team: ____________________ &nbsp; Pack: ____________________</p><table><thead><tr><th>Change</th><th>Needs review? (Yes / No) and why</th><th>Who must approve?</th><th>Verification before use</th><th>Records</th></tr></thead><tbody>' +
    [1, 2, 3, 4, 5].map(n => '<tr style="height:30mm"><td>' + n + '</td><td></td><td></td><td></td><td></td></tr>').join('') + '</tbody></table><p>Which change looks minor but could affect the constraint? Change ____ because ______________________________________</p>');
  packs.forEach(p => {
    const list = ccChanges(p);
    h += page('Instructor key: ' + p.name, '<table class="tight"><thead><tr><th>#</th><th>Change</th><th>Review</th><th>Approver</th><th>Verification before use</th><th>Records</th></tr></thead><tbody>' +
      list.map((c, i) => { const k = CC_KEY[c.cat]; return '<tr' + (c.trap ? ' data-trap="1"' : '') + '><td>' + (i + 1) + '</td><td>' + (c.trap ? '<b>TRAP.</b> ' : '') + esc(k.label) + ' (' + k.clauses + (c.trap ? ', 6.3' : '') + ')</td><td>' + k.review + (c.trap ? ', despite being described as minor' : '') + '</td><td>' + esc(k.approve) + '</td><td>' + esc(k.verify.replace('{S0}', p.stages[0])) + '</td><td>' + esc(k.records) + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<div class="keybox"><b>Trap (change ' + (list.findIndex(c => c.trap) + 1) + ').</b> ' + esc(list.find(c => c.trap).why) + '</div>');
  });
  h += page('Change Control Challenge: debrief', debrief([
    ['Which unreviewed changes caused unexpected results?', 'Changes described as minor: the trap at the constraint, and verbal or informal methods that leave no record. In Quality Flow, event E06 (an unreviewed change at the core process) shows the same effect.'],
    ['Who owns the decision?', 'The process owner, with the people named in the change procedure (quality, purchasing, engineering, or the customer where required). The person proposing the change does not approve it alone.'],
    ['Why does a change at the constraint matter more?', 'The constraint sets the output of the whole workflow. Lost time or defects there cannot be recovered elsewhere. This is the link to the Theory of Constraints game.'],
    ['What is the minimum record for a change?', 'What changed, why, the review result, who authorized it, and the verification before use (Clause 8.5.6).'],
    ['Which requirements does this exercise relate to?', 'Clause 6.3 (planning of changes to the QMS) and 8.5.6 (control of changes to production and service provision), with links to 7.1.5, 7.5.3, and 8.4.']
  ]));
  return wrap('Change Control Challenge kit', h);
}

/* ---------- Main ---------- */
function buildAll(opts) {
  const seed = opts && opts.seed != null ? opts.seed : DEFAULT_SEED;
  const pack = getPack(opts && opts.pack || 'generic');
  return {
    'root-cause-relay.html': rootCauseRelay(pack),
    'document-control-relay.html': documentControlRelay(pack),
    'traceability-challenge.html': traceabilityChallenge(seed, pack.id),
    'management-review-boardroom.html': managementReview(pack),
    'workplace-evidence-hunt.html': evidenceHunt(pack),
    'change-control-challenge.html': changeControl()
  };
}

module.exports = { buildAll, generateTrace, traceKey, traceabilityChallenge, ccChanges, DC_SLIPS, dcExpected, NOTICE };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const val = k => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : undefined; };
  const seed = val('seed') ? parseInt(val('seed'), 10) : DEFAULT_SEED;
  const packId = val('pack') || 'generic';
  if (!packs.some(p => p.id === packId)) { console.error('Unknown pack "' + packId + '". Choose one of: ' + packs.map(p => p.id).join(', ')); process.exit(1); }
  const outDir = path.join(root, 'games/printables');
  fs.mkdirSync(outDir, { recursive: true });
  const files = buildAll({ seed, pack: packId });
  Object.keys(files).forEach(f => fs.writeFileSync(path.join(outDir, f), files[f]));
  console.log('Wrote ' + Object.keys(files).length + ' game kits to games/printables/ (seed ' + seed + ', pack ' + packId + ')');
}
