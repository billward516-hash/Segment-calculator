'use strict';
// Builds the single-file HTML games from templates, the engine and the JSON data.
// Run: node tools/build-games.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const json = f => JSON.parse(read(f));
// Prevents "</script>" or "<!--" inside embedded JSON from ending the script block early.
const safe = o => JSON.stringify(o).replace(/</g, '\\u003c');

const QF = require(path.join(root, 'games/quality-flow/engine.js'));
const company = json('config/company.json');
const controls = json('data/controls.json');
const events = json('data/events.json');
const packs = json('data/packs.json');
// Preliminary 2026 decks, used only when the game edition is "2026" or "bridge".
const controls2026 = json('data/controls-2026.json');
const events2026 = json('data/events-2026.json');

// Quality Flow
const cfg = Object.assign({}, QF.DEFAULT_CONFIG, { company: company.company, industryPack: company.industryPack, edition: company.edition });
let html = read('games/quality-flow/template.html');
html = html.replace('__CONFIG_JSON__', () => safe(cfg))
  .replace('__DATA_JSON__', () => safe({ controls, events, packs, controls2026, events2026 }))
  .replace('/*__ENGINE__*/', () => read('games/quality-flow/engine.js'));
fs.writeFileSync(path.join(root, 'games/quality-flow/index.html'), html);
console.log('Built games/quality-flow/index.html (' + Math.round(html.length / 1024) + ' KB)');

// Quiz (only if its template exists)
const qt = path.join(root, 'games/quiz/template.html');
if (fs.existsSync(qt)) {
  const questions = json('data/questions.json');
  // Sector quiz banks (Appendix C): every data/quizzes/<pack>.json, keyed by pack id.
  const quizDir = path.join(root, 'data/quizzes');
  const sectorQuizzes = {};
  if (fs.existsSync(quizDir)) {
    fs.readdirSync(quizDir).filter(f => f.endsWith('.json')).sort().forEach(f => {
      const bank = json('data/quizzes/' + f);
      sectorQuizzes[bank.pack || path.basename(f, '.json')] = bank;
    });
  }
  // Sector drills (Appendix D.10): content/sector-tracks/<pack>/drills.md, parsed by the Casebook builder's parser
  // so the quiz app's "Sector drill" mode and the Casebook use the same items.
  const { loadCatalog } = require(path.join(root, 'tools/build-casebook.js'));
  const { catalog, errors: drillErrors } = loadCatalog();
  if (drillErrors.length) {
    console.error('Quiz build stopped. ' + drillErrors.length + ' drill or casebook problem(s):\n' + drillErrors.map(e => ' - ' + e).join('\n'));
    process.exit(1);
  }
  const sectorDrills = {};
  catalog.sectors.forEach(s => {
    if ((catalog.drills[s.pack] || []).length) sectorDrills[s.pack] = { name: s.name, items: catalog.drills[s.pack] };
  });
  let q = fs.readFileSync(qt, 'utf8');
  q = q.replace('__QUESTIONS_JSON__', () => safe(questions)).replace('__SECTOR_QUIZZES_JSON__', () => safe(sectorQuizzes))
    .replace('__SECTOR_DRILLS_JSON__', () => safe(sectorDrills)).replace('__COMPANY__', () => company.company);
  fs.writeFileSync(path.join(root, 'games/quiz/index.html'), q);
  console.log('Built games/quiz/index.html (' + Math.round(q.length / 1024) + ' KB)');
}
