'use strict';
// Renders the Markdown content into print-ready single-file HTML books.
// Run: node tools/build-guide.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const company = JSON.parse(fs.readFileSync(path.join(root, 'config/company.json'), 'utf8'));
const packs = JSON.parse(fs.readFileSync(path.join(root, 'data/packs.json'), 'utf8'));

/* ---------- Markdown conversion (the subset used by the content files) ---------- */
function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function inline(text) {
  const codes = [];
  let t = text.replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
  t = esc(t);
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, label, url) => '<a href="' + url + '">' + label + '</a>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>');
  t = t.replace(/\[(VERIFY|OWNER INPUT)\]/g, '<mark class="flag">$1</mark>');
  t = t.replace(/\u0000(\d+)\u0000/g, (m, i) => '<code>' + esc(codes[+i]) + '</code>');
  return t;
}

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map(c => c.trim());
}

function parseList(lines, i) {
  // Returns [html, nextIndex]. Handles nesting by indentation.
  const itemRe = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
  const first = itemRe.exec(lines[i]);
  const baseIndent = first[1].length;
  const ordered = /\d+\./.test(first[2]);
  let html = ordered ? '<ol>' : '<ul>';
  while (i < lines.length) {
    const m = itemRe.exec(lines[i]);
    if (!m || m[1].length < baseIndent) break;
    if (m[1].length > baseIndent) {
      const [sub, next] = parseList(lines, i);
      html = html.replace(/<\/li>$/, sub + '</li>');
      i = next; continue;
    }
    let body = m[3];
    i++;
    // continuation lines (indented, not list items)
    while (i < lines.length && lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && !itemRe.test(lines[i])) { body += ' ' + lines[i].trim(); i++; }
    html += '<li>' + inline(body) + '</li>';
  }
  html += ordered ? '</ol>' : '</ul>';
  return [html, i];
}

function md(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  let html = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = /^(#{1,6})\s+(.*)$/.exec(line))) {
      const lvl = m[1].length;
      html += '<h' + lvl + '>' + inline(m[2]) + '</h' + lvl + '>\n'; i++; continue;
    }
    if (/^---+\s*$/.test(line)) { html += '<hr>\n'; i++; continue; }
    if (line.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('>')) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
      const inner = md(buf.join('\n'));
      const caution = /CAUTION: PRELIMINARY 2026 INFORMATION/.test(buf.join(' '));
      html += caution ? '<aside class="caution" role="note"><div class="caution-label">Preliminary 2026 information</div>' + inner + '</aside>\n' : '<blockquote>' + inner + '</blockquote>\n';
      continue;
    }
    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const head = splitRow(line); i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(splitRow(lines[i])); i++; }
      html += '<div class="tablewrap"><table><thead><tr>' + head.map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' +
        rows.map(r => '<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>\n';
      continue;
    }
    if (/^(\s*)([-*]|\d+\.)\s+/.test(line)) {
      const [h, next] = parseList(lines, i); html += h + '\n'; i = next; continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|>|---+\s*$|\s*\|)/.test(lines[i]) && !/^(\s*)([-*]|\d+\.)\s+/.test(lines[i])) { buf.push(lines[i].trim()); i++; }
    if (!buf.length) { buf.push(line.trim()); i++; }
    html += '<p>' + inline(buf.join(' ')) + '</p>\n';
  }
  return html;
}

/* ---------- Placeholders ---------- */
function sectorExamples() {
  const real = packs.filter(p => p.id !== 'generic');
  const chosen = company.industryPack !== 'generic' ? real.filter(p => p.id === company.industryPack) : ['discrete-manufacturing', 'it-software', 'healthcare'].map(id => real.find(p => p.id === id));
  return '\n\n**Example process maps from industry packs (fictional organizations):**\n\n' +
    chosen.map(p => '- **' + p.company + ' (' + p.name.replace(/ \(management.*$/, '') + '):** ' + p.stages.join(' → ')).join('\n') + '\n';
}
function fill(src) {
  return src.replace(/\{\{COMPANY\}\}/g, company.company).replace(/\{\{SECTOR_EXAMPLES\}\}/g, () => sectorExamples());
}

/* ---------- Page template ---------- */
const CSS = `
:root{--bg:#fff;--fg:#1b1f24;--muted:#46515c;--line:#c3cbd3;--panel:#f3f5f7;--accent:#0b4f9c;--warn:#8a2d00;--warn-bg:#fff4ec}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#10151b;--fg:#e9eef3;--muted:#b0bac4;--line:#3b4651;--panel:#19212a;--accent:#8dbdff;--warn:#ffb88a;--warn-bg:#3a2316}}
:root[data-theme="dark"]{--bg:#10151b;--fg:#e9eef3;--muted:#b0bac4;--line:#3b4651;--panel:#19212a;--accent:#8dbdff;--warn:#ffb88a;--warn-bg:#3a2316}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.6 Georgia,"Times New Roman",serif}
.wrap{max-width:52rem;margin:0 auto;padding:1rem 1.2rem 4rem}
h1,h2,h3,h4,nav,.caution-label,table,.cover .sub{font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
h1{font-size:2rem;line-height:1.2;margin:2rem 0 .6rem;border-bottom:3px solid var(--accent);padding-bottom:.3rem}
h2{font-size:1.35rem;margin:1.8rem 0 .4rem;color:var(--accent)}
h3{font-size:1.1rem;margin:1.2rem 0 .3rem}
p{margin:.6rem 0}
li{margin:.2rem 0}
a{color:var(--accent)}
.cover{padding:3rem 0 2rem;border-bottom:1px solid var(--line)}
.cover h1{border:0;font-size:2.6rem;margin:0}
.cover .sub{color:var(--muted);font-size:1.15rem}
nav.toc{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:1rem 1.4rem;margin:1.5rem 0}
nav.toc ol{margin:.3rem 0;padding-left:1.4rem}
nav.toc a{text-decoration:none}
nav.toc a:hover{text-decoration:underline}
.tablewrap{overflow-x:auto}
table{border-collapse:collapse;width:100%;margin:.8rem 0;font-size:.9rem}
th,td{border:1px solid var(--line);padding:.35rem .5rem;text-align:left;vertical-align:top}
th{background:var(--panel)}
blockquote{margin:1rem 0;padding:.2rem 1rem;border-left:4px solid var(--accent);background:var(--panel)}
aside.caution{border:3px solid var(--warn);background:var(--warn-bg);border-radius:8px;padding:.6rem 1rem;margin:1rem 0}
aside.caution .caution-label{font-weight:800;text-transform:uppercase;font-size:.8rem;letter-spacing:.06em;color:var(--warn)}
mark.flag{background:transparent;color:var(--warn);border:1.5px solid var(--warn);border-radius:4px;padding:0 .25rem;font:700 .75rem system-ui,sans-serif}
code{font-family:ui-monospace,Consolas,monospace;font-size:.9em;background:var(--panel);padding:0 .25rem;border-radius:3px}
section.chapter{margin-top:2rem;scroll-margin-top:3.5rem}
footer{border-top:1px solid var(--line);margin-top:3rem;padding-top:1rem;color:var(--muted);font:.85rem system-ui,sans-serif}
.tools{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);padding:.4rem 1.2rem;display:flex;gap:.6rem;justify-content:flex-end;font-family:system-ui,sans-serif}
.tools button{font:inherit;background:var(--panel);color:var(--fg);border:2px solid var(--line);border-radius:6px;padding:.25rem .7rem;cursor:pointer}
:focus-visible{outline:3px solid #b85c00;outline-offset:2px}
@media print{.tools{display:none}body{font-size:11pt;background:#fff;color:#000}section.chapter{page-break-before:always}.cover{page-break-after:always}a{color:#000;text-decoration:none}aside.caution{border-color:#000;background:#fff;color:#000}aside.caution .caution-label{color:#000}table,blockquote,aside{page-break-inside:avoid}}
`;

function page(title, subtitle, chapters, extraNote) {
  const toc = chapters.map(c => '<li><a href="#' + c.id + '">' + esc(c.title) + '</a></li>').join('');
  const body = chapters.map(c => '<section class="chapter" id="' + c.id + '">' + c.html + '</section>').join('\n');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(title) + '</title><style>' + CSS + '</style></head><body>' +
    '<div class="tools"><button type="button" onclick="window.print()">Print</button><a href="index.html" style="align-self:center">Training home</a></div>' +
    '<div class="wrap"><header class="cover"><h1>' + esc(title) + '</h1><p class="sub">' + esc(subtitle) + '</p><p class="sub">Prepared for ' + esc(company.company) + '</p></header>' +
    (extraNote || '') +
    '<nav class="toc" aria-label="Contents"><strong>Contents</strong><ol>' + toc + '</ol></nav>' + body +
    '<footer><p>This material is an original training aid. It is not a substitute for the standard. Obtain ISO 9001 from ISO or a national standards body. Core content teaches ISO 9001:2015 (with Amendment 1:2024). Sections marked as 2026 contain preliminary, unverified information.</p>' +
    '<p>Fictional organizations appear in examples and are illustrative. Sector-specific legal, clinical, safety, and food safety requirements are outside this program.</p></footer></div></body></html>';
}

function chaptersFrom(dir, files) {
  return files.map(f => {
    const src = fill(fs.readFileSync(path.join(root, dir, f), 'utf8'));
    const html = md(src);
    const h1 = /<h1>(.*?)<\/h1>/.exec(html);
    const title = h1 ? h1[1].replace(/<[^>]+>/g, '') : f;
    return { id: f.replace(/\.md$/, '').replace(/[^a-z0-9]+/gi, '-'), title: title.replace(/&amp;/g, '&'), html };
  });
}

function list(dir) { return fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith('.md')).sort(); }

const out = [];
function write(name, html) { fs.writeFileSync(path.join(root, name), html); out.push(name + ' (' + Math.round(html.length / 1024) + ' KB)'); }

// Participant guide: modules in order, then glossary
const pg = list('content/participant-guide');
const order = pg.filter(f => /^\d/.test(f)).concat(pg.filter(f => f.startsWith('appendix')), pg.filter(f => !/^\d/.test(f) && !f.startsWith('appendix')));
write('participant-guide.html', page('ISO 9001 Participant Guide', 'Quality management system training for frontline staff, technical staff, and supervisors', chaptersFrom('content/participant-guide', order)));
write('instructor-guide.html', page('ISO 9001 Instructor Guide', 'Facilitation, agendas, assessment, and answer keys', chaptersFrom('content/instructor-guide', list('content/instructor-guide'))));
write('handouts.html', page('ISO 9001 Handouts', 'Cards and reference sheets for printing', chaptersFrom('content/handouts', list('content/handouts'))));
const exists = d => fs.existsSync(path.join(root, d));
if (exists('content/handouts/one-page-summaries')) {
  write('module-summaries.html', page('ISO 9001 Module Summaries', 'One printed page per module', chaptersFrom('content/handouts/one-page-summaries', list('content/handouts/one-page-summaries'))));
}
if (exists('content/sector-tracks')) {
  const chapters = [];
  fs.readdirSync(path.join(root, 'content/sector-tracks')).sort().forEach(id => {
    const dir = 'content/sector-tracks/' + id;
    if (!fs.statSync(path.join(root, dir)).isDirectory()) return;
    chaptersFrom(dir, list(dir)).forEach(c => { c.id = id + '-' + c.id; chapters.push(c); });
  });
  if (chapters.length) write('sector-tracks.html', page('ISO 9001 Sector Deep-Dive Track', 'Sector primers and drills (optional, after the general instruction)', chapters));
}

// Landing page
const printFiles = fs.existsSync(path.join(root, 'games/printables')) ? fs.readdirSync(path.join(root, 'games/printables')).filter(f => f.endsWith('.html')).sort() : [];
const packLinks = printFiles.filter(f => f.startsWith('quality-flow-')).map(f => {
  const id = f.replace(/^quality-flow-|\.html$/g, ''); const p = packs.find(x => x.id === id);
  return '<li><a href="games/printables/' + f + '">' + esc(p ? p.name : id) + '</a></li>';
}).join('');
const card = (href, title, text) => '<a class="card" href="' + href + '"><h2>' + title + '</h2><p>' + text + '</p></a>';
const landing = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ISO 9001 Training Program</title><style>' + CSS +
  '.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;margin:1.5rem 0}a.card{display:block;border:2px solid var(--line);border-radius:10px;padding:1rem 1.2rem;text-decoration:none;color:var(--fg);background:var(--panel)}a.card:hover{border-color:var(--accent)}a.card h2{margin:0 0 .3rem;font-size:1.2rem}a.card p{margin:0;font-family:system-ui,sans-serif;font-size:.95rem;color:var(--muted)}details{margin:1rem 0;font-family:system-ui,sans-serif}</style></head><body><div class="wrap">' +
  '<header class="cover"><h1>ISO 9001 Training Program</h1><p class="sub">Participant guide, instructor guide, handouts, and classroom games</p><p class="sub">Prepared for ' + esc(company.company) + '</p></header>' +
  '<div class="cards">' +
  card('participant-guide.html', 'Participant guide', 'Modules 0 to 12 and glossary. Core content teaches ISO 9001:2015. Module 11 and the Bridge boxes cover preliminary 2026 information.') +
  card('instructor-guide.html', 'Instructor guide', 'Preparation, room setup, agendas, assessment, troubleshooting, and answer keys.') +
  card('handouts.html', 'Handouts', 'STOP, FLAG, HOLD, REPORT card, audit response card, and the clause-to-role map.') +
  card('games/quality-flow/index.html', 'Game: Quality Flow', 'Round-based workflow simulation. Invest in controls, meet random events, and face a mock audit. Works offline.') +
  card('games/quiz/index.html', 'Game: Quiz and Clause Sprint', 'Knowledge checks, module quizzes, and a team race to name the clause. ' + 'Question bank with answers and rationale.') +
  (exists('games/audit-day/index.html') ? card('games/audit-day/index.html', 'Game: Audit Day', 'Role-play audit with a planted-finding dossier, finding entry, and scoring.') : '') +
  (exists('games/casebook/index.html') ? card('games/casebook/index.html', 'Sector Casebook', 'Optional deep-dive investigation cases for each industry. Instructors read results with the results reader.') : '') +
  (exists('games/bridge/index.html') ? card('games/bridge/index.html', '2026 Bridge games', 'Culture Under Pressure and Bridge Sprint. Preliminary, unverified 2026 information.') : '') +
  (exists('module-summaries.html') ? card('module-summaries.html', 'Module summaries', 'One printed page per module.') : '') +
  (exists('sector-tracks.html') ? card('sector-tracks.html', 'Sector Deep-Dive Track', 'Sector primers and drills for each industry pack.') : '') +
  '</div><h2>Printable versions</h2><p>Cards, boards, record sheets, and dice tables generated from the same data as the games.</p><details open><summary>Quality Flow printables by industry pack</summary><ul>' + packLinks + '</ul></details>' +
  '<details open><summary>Other printables</summary><ul>' + printFiles.filter(f => !f.startsWith('quality-flow-')).map(f => '<li><a href="games/printables/' + f + '">' + esc(f.replace(/\.html$/, '').replace(/-/g, ' ').replace(/^./, c => c.toUpperCase())) + '</a></li>').join('') + '</ul></details>' +
  '<footer><p>This material is an original training aid. It is not a substitute for the standard. Obtain ISO 9001 from ISO or a national standards body.</p><p>All 2026 content is preliminary and unverified. Confirm it against the published ISO 9001:2026 text and your certification body before relying on it.</p></footer></div></body></html>';
write('index.html', landing);
console.log('Built: ' + out.join(', '));
