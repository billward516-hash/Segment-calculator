// Loads the pure calculation block out of index.html so it can be tested in Node.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadCore() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const m = html.match(/\/\/ ===CORE-START===([\s\S]*?)\/\/ ===CORE-END===/);
  if (!m) throw new Error('core block not found in index.html');
  const sandbox = { btoa, atob, escape, unescape, encodeURIComponent, decodeURIComponent };
  vm.createContext(sandbox);
  vm.runInContext(m[1], sandbox, { filename: 'index.html#core' });
  return sandbox.SegCore;
}
module.exports = { loadCore };
