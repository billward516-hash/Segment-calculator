'use strict';
// Content checks: structure, copyright notice, 2026 caution rules, banned phrases,
// lettered Clause 5 citations, clause references, and (optionally) long word runs copied from
// a denylist of ISO sentences supplied by the owner (tools/iso-denylist.txt, one sentence per line).
// Run: node tools/validate-content.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const CAUTION = 'CAUTION: PRELIMINARY 2026 INFORMATION. This section describes the 2026 edition of ISO 9001 using the best available secondary commentary and informed estimates. It has not been verified against the published standard and may contain errors, omissions, or incorrect clause references. Do not use it as a substitute for the standard in audit preparation, certification decisions, procedure revisions, or training records. Always consult the published ISO 9001:2026 text and your certification body.';
const COPYRIGHT = 'This material is an original training aid. It is not a substitute for the standard. Obtain ISO 9001 from ISO or a national standards body.';
const banned = JSON.parse(read('tools/banned-phrases.json'));
const clauseMap = JSON.parse(read('data/clause-map.json'));
const validClauses = new Set(clauseMap.clauses.map(c => c.id));
const ISO_PARENTS = new Set(['4', '5', '6', '7', '8', '9', '10']);
const BRIDGE_MODULES = ['00', '01', '02', '03', '04', '09']; // modules that carry a 2026 Bridge box

const problems = [];
const warn = (f, m) => problems.push(f + ': ' + m);
const norm = s => s.replace(/\s+/g, ' ').replace(/[>*_]/g, '').trim();

function listMd(dir, deep) {
  if (!fs.existsSync(path.join(root, dir))) return [];
  return fs.readdirSync(path.join(root, dir)).flatMap(f => {
    const rel = dir + '/' + f;
    if (deep && fs.statSync(path.join(root, rel)).isDirectory()) return listMd(rel, true);
    return f.endsWith('.md') ? [rel] : [];
  });
}
const pgFiles = listMd('content/participant-guide');
const allFiles = pgFiles.concat(listMd('content/instructor-guide', true), listMd('content/handouts', true), listMd('content/sector-tracks', true));

allFiles.forEach(f => {
  const text = read(f);
  const lower = ' ' + text.toLowerCase().replace(/\s+/g, ' ') + ' ';
  banned.forEach(b => {
    const re = new RegExp('(^|[^a-z])' + b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').toLowerCase() + '($|[^a-z])');
    if (re.test(lower)) warn(f, 'banned phrase "' + b.trim() + '"');
  });
  // Lettered Clause 5 sub-items must not be cited
  if (/\b5\.\d(\.\d)?\s*\(?[a-h]\)/.test(text) || /\b5\.\d\.\d[a-h]\b/.test(text)) warn(f, 'lettered Clause 5 sub-item cited');
  // Best estimate content confined to bridge boxes, module 11, appendix, handouts for 2026
  const base = path.basename(f);
  if (f.startsWith('content/participant-guide/') && /^\d\d-/.test(base) && !base.startsWith('11-')) {
    text.split('\n').forEach((line, i) => { if (/best estimate/i.test(line) && !line.startsWith('>')) warn(f + ':' + (i + 1), '"Best estimate" outside a 2026 Bridge box'); });
  }
});

// Participant modules
pgFiles.forEach(f => {
  const base = path.basename(f);
  if (!/^\d\d-/.test(base)) return;
  const text = read(f), n = base.slice(0, 2);
  if (!/^# Module \d+:/m.test(text)) warn(f, 'missing "# Module N:" title');
  if (!text.includes(COPYRIGHT)) warn(f, 'copyright notice missing or altered');
  if (n !== '11' && n !== '12') {
    ['## Learning objectives', '## Why it matters', '## Key concepts', '## Common mistakes', '## Quick check', '## Clause reference'].forEach(h => { if (!text.includes(h)) warn(f, 'missing section "' + h + '"'); });
  } else {
    ['## Learning objectives'].forEach(h => { if (!text.includes(h)) warn(f, 'missing section "' + h + '"'); });
  }
  if (BRIDGE_MODULES.includes(n) || n === '11') {
    if (!norm(text).includes(norm(CAUTION))) warn(f, 'exact 2026 caution text missing');
  }
  if (n === '11') { if (!/^>\s*\*\*CAUTION/m.test(text.split('\n').slice(0, 4).join('\n'))) warn(f, 'caution box must open the page'); }
  // Bridge box length (max 120 words excluding caution) for modules 0-4 and 9
  if (BRIDGE_MODULES.includes(n)) {
    const m = /## 2026 Bridge[^\n]*\n([\s\S]*)$/.exec(text);
    if (m) {
      const box = norm(m[1]).replace(norm(CAUTION), '');
      const words = box.split(' ').filter(Boolean).length;
      if (words > 120) warn(f, '2026 Bridge box has ' + words + ' words (limit 120 excluding caution)');
    } else warn(f, 'missing "## 2026 Bridge" section');
  }
  // Clause references: 2015 numbering only, must exist in the clause map
  const cr = /## Clause reference\s*\n([\s\S]*?)(\n## |$)/.exec(text);
  if (cr) {
    (cr[1].match(/\b(4|5|6|7|8|9|10)(\.\d+){1,2}\b/g) || []).forEach(c => {
      if (!validClauses.has(c) && ![...validClauses].some(v => v.startsWith(c + '.'))) warn(f, 'clause reference ' + c + ' not found in data/clause-map.json');
    });
  }
});

// 2026 pages elsewhere must show the caution box when they discuss 2026 changes in depth
['content/participant-guide/11-new-edition-changes.md'].forEach(f => { if (!fs.existsSync(path.join(root, f))) warn(f, 'missing'); });

// Optional denylist: no run of 12 or more consecutive words from any listed ISO sentence
const dl = path.join(root, 'tools/iso-denylist.txt');
if (fs.existsSync(dl)) {
  const runs = fs.readFileSync(dl, 'utf8').split('\n').map(s => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)).filter(w => w.length >= 12);
  allFiles.forEach(f => {
    const words = read(f).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).join(' ');
    runs.forEach(w => { for (let i = 0; i + 12 <= w.length; i++) if (words.includes(w.slice(i, i + 12).join(' '))) { warn(f, 'contains a 12-word run from the ISO denylist: "' + w.slice(i, i + 12).join(' ') + '"'); break; } });
  });
}

// Data files: no real-looking names (all companies must be prefixed Meridian)
const packs = JSON.parse(read('data/packs.json'));
packs.forEach(p => { if (!/^Meridian/.test(p.company)) warn('data/packs.json', 'company "' + p.company + '" is not prefixed Meridian'); });

if (problems.length) { console.log(problems.length + ' problem(s):\n' + problems.map(p => ' - ' + p).join('\n')); process.exit(1); }
console.log('Content validation passed (' + allFiles.length + ' Markdown files checked).');
