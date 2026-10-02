// Browser tests: drive the real index.html in Chromium at phone size.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

function loadPlaywright() {
  try { return require('playwright'); } catch (e) {
    return require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
  }
}
const { chromium } = loadPlaywright();
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

let browser;
test.before(async () => {
  const opts = {};
  if (fs.existsSync('/opt/pw-browsers/chromium')) opts.executablePath = undefined; // PLAYWRIGHT_BROWSERS_PATH handles it
  browser = await chromium.launch(opts);
});
test.after(async () => { if (browser) await browser.close(); });

// Opens a fresh page (fresh storage) and records any script errors.
async function open(ctxOpts) {
  const context = await browser.newContext(Object.assign({}, PHONE, ctxOpts || {}));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', (d) => d.accept());
  await page.goto(URL);
  await page.waitForSelector('#secCutList');
  return { context, page, errors };
}
const design = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__segApp.design)));
const result = (page) => page.evaluate(() => {
  const r = window.__segApp.result;
  return { strips: r.cut.strips.map((s) => ({ label: s.label, total: s.total, safety: s.safety, pieces: s.pieces })),
    messages: r.messages, totalPieces: r.cut.totalPieces };
});
async function typeInto(page, sel, text) {
  const el = page.locator(sel).first();
  await el.fill(text);
  await el.dispatchEvent('change');
}

test('loads the sample bowl with no script errors and a full cut list', async () => {
  const { context, page, errors } = await open();
  const d = await design(page);
  assert.equal(d.name, '12-segment bowl');
  assert.equal(d.rings.length, 4);
  const r = await result(page);
  assert.ok(r.strips.length >= 2);
  assert.equal(r.totalPieces, 48);
  assert.ok(!r.messages.some((m) => m.level === 'error'), JSON.stringify(r.messages));
  // Every strip formula states the safety length explicitly
  const formulas = await page.locator('#secCutList .formula').allTextContents();
  assert.equal(formulas.length, r.strips.length);
  for (const f of formulas) assert.match(f, /safety 5″/);
  await page.locator('#safetyNote').waitFor();
  assert.match(await page.locator('#safetyNote').textContent(), /5″/);
  // Tally lists pieces by wood, angle and length
  const tallyRows = await page.locator('#tallyTable tbody tr').count();
  assert.ok(tallyRows >= 3);
  assert.match(await page.locator('#tallyTable').textContent(), /15\.00°/);
  // Top-view diagram draws one polygon per segment
  const polys = await page.locator('#secDiagram svg').nth(1).locator('polygon').count();
  assert.equal(polys, 12);
  assert.deepEqual(errors, []);
  await context.close();
});

test('phone layout has no sideways scrolling, in light and dark mode', async () => {
  for (const scheme of ['light', 'dark']) {
    const { context, page, errors } = await open({ colorScheme: scheme });
    for (const mode of ['beginner', 'advanced']) {
      await page.click('#mode' + mode[0].toUpperCase() + mode.slice(1));
      await page.locator('details.ring').first().locator('summary').click();
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(over <= 0, `${scheme}/${mode}: page is ${over}px too wide`);
    }
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert.equal(bg, scheme === 'dark' ? 'rgb(23, 18, 14)' : 'rgb(247, 243, 238)');
    assert.deepEqual(errors, []);
    await context.close();
  }
});

test('safety length can be changed, and every strip updates', async () => {
  const { context, page, errors } = await open();
  const before = await result(page);
  await typeInto(page, '[data-bind="settings.safety"]', '2');
  const after = await result(page);
  assert.equal(after.strips.length, before.strips.length);
  after.strips.forEach((s, i) => { assert.ok(Math.abs(before.strips[i].total - s.total - 3) < 1e-9); assert.equal(s.safety, 2); });
  for (const f of await page.locator('#secCutList .formula').allTextContents()) assert.match(f, /safety 2″/);
  await typeInto(page, '[data-bind="settings.safety"]', '0');
  for (const f of await page.locator('#secCutList .formula').allTextContents()) assert.match(f, /safety 0″/);
  assert.match(await page.locator('#secCut .safety-note').textContent(), /0″/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('changing the shape rebuilds the rings', async () => {
  const { context, page, errors } = await open();
  await page.selectOption('[data-bind="profile.shape"]', 'vase');
  await typeInto(page, '[data-bind="profile.height"]', '9');
  let d = await design(page);
  assert.equal(d.profile.shape, 'vase');
  assert.equal(d.rings.length, 12);
  assert.equal(await page.locator('details.ring').count(), 12);
  await typeInto(page, '[data-bind="profile.ringT"]', '1/2');
  d = await design(page);
  assert.equal(d.rings.length, 18);
  await page.click('[data-action="suggest"]');
  d = await design(page);
  assert.ok(d.profile.segments >= 8);
  await page.selectOption('[data-bind="profile.shape"]', 'custom');
  await page.locator('[data-bind="profile.points"]').fill('0, 3\n2, 6\n4, 5');
  d = await design(page);
  assert.equal(d.rings.length, 8);
  await page.locator('[data-bind="profile.points"]').fill('junk');
  assert.match(await page.locator('#shapeErr').textContent(), /at least two/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('mm toggle converts the display, and values survive the round trip', async () => {
  const { context, page, errors } = await open();
  const d0 = await design(page);
  await page.click('#unitsMm');
  assert.match(await page.locator('#secSummary').textContent(), /mm/);
  assert.equal(await page.locator('[data-bind="profile.maxDia"]').inputValue(), '203');
  await typeInto(page, '[data-bind="profile.maxDia"]', '254');
  let d = await design(page);
  assert.ok(Math.abs(d.profile.maxDia - 10) < 1e-9);
  await page.click('#unitsIn');
  assert.equal(await page.locator('[data-bind="profile.maxDia"]').inputValue(), '10');
  assert.ok(Math.abs(d0.profile.maxDia - 8) < 1e-9);
  assert.deepEqual(errors, []);
  await context.close();
});

test('ring-by-ring mode: add, edit, color pattern, brick lay, delete', async () => {
  const { context, page, errors } = await open();
  await page.check('input[name="src"][value="manual"]');
  await page.click('[data-action="add-ring"]');
  let d = await design(page);
  assert.equal(d.source, 'manual');
  assert.equal(d.rings.length, 5);
  const top = page.locator('details.ring[data-ring="4"]');
  assert.equal(await top.getAttribute('open'), '');
  await typeInto(page, '[data-bind="rings.4.segments"]', '16');
  await typeInto(page, '[data-bind="rings.4.thickness"]', '1 1/4');
  d = await design(page);
  assert.equal(d.rings[4].segments, 16);
  assert.equal(d.rings[4].thickness, 1.25);
  assert.match(await top.locator('summary').textContent(), /16 seg/);
  // pattern: add a third color -> uneven repeat warning
  const colorsBefore = await top.locator('.chip select').count();
  await top.locator('[data-action="pat-add"]').click();
  await page.locator('details.ring[data-ring="4"] .chip select').nth(colorsBefore).selectOption('padauk');
  d = await design(page);
  assert.equal(d.rings[4].pattern[colorsBefore], 'padauk');
  if (d.rings[4].pattern.length === 3) {
    const r = await result(page);
    assert.ok(r.messages.some((m) => m.text.includes('does not divide 16')));
  }
  await page.locator('[data-bind="rings.4.offsetHalf"]').check();
  d = await design(page);
  assert.equal(d.rings[4].offsetHalf, true);
  await page.locator('details.ring[data-ring="4"] [data-action="ring-del"]').click();
  d = await design(page);
  assert.equal(d.rings.length, 4);
  assert.deepEqual(errors, []);
  await context.close();
});

test('bad input is flagged and ignored; fractions are accepted', async () => {
  const { context, page, errors } = await open();
  const k0 = (await design(page)).settings.kerf;
  await typeInto(page, '[data-bind="settings.kerf"]', 'abc');
  assert.ok(await page.locator('[data-bind="settings.kerf"]').evaluate((el) => el.classList.contains('bad')));
  assert.equal((await design(page)).settings.kerf, k0);
  await typeInto(page, '[data-bind="settings.kerf"]', '3/32');
  assert.ok(!(await page.locator('[data-bind="settings.kerf"]').evaluate((el) => el.classList.contains('bad'))));
  assert.equal((await design(page)).settings.kerf, 3 / 32);
  assert.deepEqual(errors, []);
  await context.close();
});

test('tool choice sets kerf and the cutting instructions', async () => {
  const { context, page, errors } = await open();
  await page.selectOption('[data-bind="settings.tool"]', 'bandsaw');
  assert.equal((await design(page)).settings.kerf, 0.04);
  assert.match(await page.locator('#secCutList').textContent(), /disc sander/);
  assert.match(await page.locator('#secCutList .formula').first().textContent(), /sanding cleanup/);
  await page.selectOption('[data-bind="settings.tool"]', 'sled');
  assert.match(await page.locator('#secCutList').textContent(), /sled fence/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('every sample design loads without errors', async () => {
  const { context, page, errors } = await open();
  for (const s of ['bowl', 'vase', 'brick', 'open', 'progressive']) {
    await page.selectOption('#samplePick', s);
    const r = await result(page);
    assert.ok(r.strips.length > 0, s);
    assert.ok(!r.messages.some((m) => m.level === 'error'), s + ': ' + JSON.stringify(r.messages.filter((m) => m.level === 'error')));
    const d = await design(page);
    if (s === 'open') {
      assert.ok(d.rings.some((x) => x.type === 'open'));
      assert.match(await page.locator('#secCutList').textContent(), /will not hold water/);
    }
    if (s === 'vase') assert.ok(r.strips.some((x) => x.label) && (await page.locator('#secCutList').textContent()).includes('Veneer'));
  }
  const names = await page.locator('#designPick option').allTextContents();
  assert.ok(names.length >= 6, 'samples saved as separate designs');
  assert.deepEqual(errors, []);
  await context.close();
});

test('designs, checklist and custom species are remembered after reload', async () => {
  const { context, page, errors } = await open();
  await page.locator('[data-bind="name"]').fill('Grandma bowl');
  await page.locator('#secBuild [data-check]').first().check();
  await page.locator('#secSpecies summary').click();
  await page.fill('#newSpecName', 'Bocote');
  await page.click('[data-action="spec-add"]');
  await page.evaluate(() => window.__segApp.saveNow());
  await page.reload();
  await page.waitForSelector('#secCutList');
  const d = await design(page);
  assert.equal(d.name, 'Grandma bowl');
  assert.ok(await page.locator('#secBuild [data-check]').first().isChecked());
  assert.ok((await page.locator('[data-bind="profile.species"] option').allTextContents()).includes('Bocote'));
  assert.deepEqual(errors, []);
  await context.close();
});

test('share link opens a copy of the design in a fresh browser', async () => {
  const { context, page, errors } = await open({ permissions: ['clipboard-read', 'clipboard-write'] });
  await page.selectOption('#samplePick', 'vase');
  await page.locator('[data-bind="name"]').fill('Shared vase');
  await page.click('[data-action="share"]');
  const url = await page.evaluate(() => window.__lastShareUrl);
  assert.match(url, /#d=[A-Za-z0-9_-]+$/);
  const src = await design(page);
  const other = await browser.newContext(PHONE);
  const p2 = await other.newPage();
  const errs2 = [];
  p2.on('pageerror', (e) => errs2.push(String(e)));
  await p2.goto(url);
  await p2.waitForSelector('#secCutList');
  const got = await design(p2);
  assert.equal(got.name, 'Shared vase');
  assert.equal(got.rings.length, src.rings.length);
  assert.deepEqual(got.rings[4].pattern, src.rings[4].pattern);
  assert.ok(!(await p2.evaluate(() => location.hash)), 'hash cleared after loading');
  assert.deepEqual(errs2, []);
  assert.deepEqual(errors, []);
  await other.close();
  await context.close();
});

test('export file can be imported in a fresh browser', async () => {
  const { context, page, errors } = await open({ acceptDownloads: true });
  await page.locator('[data-bind="name"]').fill('Export me');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="export"]')]);
  const file = path.join(os.tmpdir(), 'segcalc-test-' + Date.now() + '.json');
  await dl.saveAs(file);
  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(obj.design.name, 'Export me');
  const other = await open();
  await other.page.setInputFiles('#importFile', file);
  await other.page.waitForFunction(() => window.__segApp.design.name === 'Export me');
  assert.deepEqual(other.errors, []);
  assert.deepEqual(errors, []);
  fs.unlinkSync(file);
  await other.context.close();
  await context.close();
});

test('printout shows results and safety note, hides the editor', async () => {
  const { context, page, errors } = await open();
  await page.locator('[data-bind="settings.template"]').check();
  await page.emulateMedia({ media: 'print' });
  assert.ok(await page.locator('#secCutList').isVisible());
  assert.ok(await page.locator('#safetyNote').isVisible());
  assert.ok(await page.locator('#secBuild').isVisible());
  assert.ok(!(await page.locator('#secShape').isVisible()));
  assert.ok(!(await page.locator('header.top').isVisible()));
  const tpl = page.locator('.tpl svg').nth(1);
  assert.ok(await tpl.isVisible());
  assert.match(await tpl.getAttribute('width'), /in$/);
  const pdf = await page.pdf({ format: 'Letter' });
  assert.ok(pdf.length > 10000);
  assert.deepEqual(errors, []);
  await context.close();
});

test('beginner mode hides advanced fields; advanced shows them', async () => {
  const { context, page } = await open();
  await page.locator('details.ring').first().locator('summary').click();
  const adv = page.locator('[data-bind="settings.maxStrip"]');
  assert.ok(!(await adv.isVisible()));
  await page.click('#modeAdvanced');
  assert.ok(await page.locator('[data-bind="settings.maxStrip"]').isVisible());
  assert.ok(await page.locator('[data-bind="profile.step"]').isVisible());
  // The ring opened above stays open after switching modes.
  const ringOpen = page.locator('details.ring[open]').first();
  assert.ok(await ringOpen.locator('[data-bind$=".type"]').isVisible());
  assert.ok(await ringOpen.locator('[data-bind$=".veneer.t"]').isVisible());
  await page.click('#modeBeginner');
  assert.ok(!(await page.locator('details.ring[open] [data-bind$=".type"]').first().isVisible()));
  await context.close();
});

test('open ring in advanced mode shows the not-watertight note and gap', async () => {
  const { context, page, errors } = await open();
  await page.click('#modeAdvanced');
  await page.locator('details.ring[data-ring="2"] summary').click();
  await page.selectOption('[data-bind="rings.2.type"]', 'open');
  assert.ok(await page.locator('details.ring[data-ring="2"] .open-note').isVisible());
  assert.match(await page.locator('#secCutList').textContent(), /will not hold water/);
  await page.selectOption('[data-bind="rings.2.openBy"]', 'length');
  await typeInto(page, '[data-bind="rings.2.segLen"]', '1');
  const r = await page.evaluate(() => window.__segApp.result.rings[2]);
  assert.equal(r.segs[0].lOut, 1);
  assert.ok(r.gap > 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test('with scripts blocked the page says why instead of going blank', async () => {
  const context = await browser.newContext(Object.assign({}, PHONE, { javaScriptEnabled: false }));
  const page = await context.newPage();
  await page.goto(URL);
  assert.match(await page.locator('#fallback').textContent(), /blocking scripts/);
  await context.close();
});

test('works inside a sandboxed frame with no storage access, and survives corrupt saved data', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const context = await browser.newContext(PHONE);
  const page = await context.newPage();
  await page.setContent('<iframe id="f" style="width:390px;height:800px" sandbox="allow-scripts"></iframe>');
  await page.evaluate((h) => { document.getElementById('f').srcdoc = h; }, html);
  await page.waitForFunction(() => { const f = document.getElementById('f'); return f.contentDocument === null || true; });
  const frame = await (async () => { for (let i = 0; i < 50; i++) { const f = page.frames()[1]; if (f) { try { if (await f.locator('#secCutList').count()) return f; } catch (e) { /* retry */ } } await page.waitForTimeout(100); } throw new Error('frame did not render'); })();
  assert.equal(await frame.locator('#fallback').count(), 0);
  await frame.selectOption('#samplePick', 'vase');
  assert.equal(await frame.locator('[data-bind="name"]').inputValue(), 'Vase with feature ring');
  await frame.click('#modeAdvanced');
  assert.ok(await frame.locator('[data-bind="settings.maxStrip"]').isVisible());
  await context.close();

  const c2 = await browser.newContext(PHONE);
  const p2 = await c2.newPage();
  await p2.addInitScript(() => { try { localStorage.setItem('segcalc.v1', '{"designs":{"x":{"rings":"oops"}},"currentId":"x"}'); } catch (e) { /* ignore */ } });
  await p2.goto(URL);
  await p2.waitForSelector('#secCutList');
  assert.equal(await p2.locator('[data-bind="name"]').inputValue(), '12-segment bowl', 'unreadable saved design replaced by the sample');
  assert.ok(await p2.locator('#secCutList').count());
  await c2.close();
});

test('share code: make it, open it in a fresh browser, and bad codes are refused', async () => {
  const { context, page, errors } = await open({ permissions: ['clipboard-read', 'clipboard-write'] });
  await page.selectOption('#samplePick', 'brick');
  await page.locator('[data-bind="name"]').fill('Code test');
  await page.locator('#secDesign summary').click();
  await page.click('[data-action="code-make"]');
  const code = await page.locator('#shareBox').inputValue();
  assert.match(code, /^[A-Za-z0-9_-]{100,}$/);
  const other = await open();
  await other.page.locator('#secDesign summary').click();
  await other.page.fill('#shareBox', 'not a real code!!');
  await other.page.click('[data-action="code-open"]');
  assert.match(await other.page.locator('.toast').first().textContent(), /could not be read/);
  await other.page.fill('#shareBox', code);
  await other.page.click('[data-action="code-open"]');
  await other.page.waitForFunction(() => window.__segApp.design.name === 'Code test');
  assert.equal((await design(other.page)).rings.length, (await design(page)).rings.length);
  assert.deepEqual(other.errors, []);
  assert.deepEqual(errors, []);
  await other.context.close();
  await context.close();
});

test('hosted mode: no print/export/download buttons, delete asks for a second tap', async () => {
  const context = await browser.newContext(PHONE);
  await context.addInitScript(() => { window.SEG_HOSTED = true; window.confirm = () => { throw new Error('confirm must not be used when hosted'); }; });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL);
  await page.waitForSelector('#secCutList');
  for (const a of ['print', 'export', 'share']) assert.ok(!(await page.locator('[data-action="' + a + '"]').isVisible()), a + ' should be hidden');
  assert.ok(!(await page.locator('[data-bind="settings.template"]').isVisible()));
  assert.ok(await page.locator('[data-action="code-make"]').count());
  await page.check('input[name="src"][value="manual"]');
  const before = (await design(page)).rings.length;
  await page.locator('details.ring[data-ring="0"] summary').click();
  await page.locator('details.ring[data-ring="0"] [data-action="ring-del"]').click();
  assert.equal((await design(page)).rings.length, before, 'first tap does not delete');
  assert.match(await page.locator('.toast').last().textContent(), /Tap the same button again/);
  await page.locator('details.ring[data-ring="0"] [data-action="ring-del"]').click();
  assert.equal((await design(page)).rings.length, before - 1, 'second tap deletes');
  assert.deepEqual(errors, []);
  await context.close();
});

test('species list shows hardness, and custom woods can set and edit it', async () => {
  const { context, page, errors } = await open();
  await page.locator('#secSpecies summary').click();
  const head = await page.locator('#secSpecies thead').textContent();
  assert.match(head, /Janka \(lbf\)/);
  const rows = await page.locator('#secSpecies tbody tr').allTextContents();
  const maple = rows.find((r) => r.includes('Hard maple'));
  assert.match(maple, /1450/);
  assert.match(rows.find((r) => r.includes('Ebony')), /3080/);
  assert.match(rows.find((r) => r.includes('Black veneer')), /—/);
  await page.fill('#newSpecName', 'Bocote');
  await page.fill('#newSpecHard', '1980');
  await page.click('[data-action="spec-add"]');
  assert.ok(await page.locator('#secSpecies details').evaluate((d) => d.open), 'list stays open after adding');
  assert.equal(await page.locator('[data-spec="0"][data-field="hardness"]').inputValue(), '1980');
  await page.locator('[data-spec="0"][data-field="hardness"]').fill('2000');
  await page.locator('[data-spec="0"][data-field="hardness"]').dispatchEvent('change');
  assert.equal((await page.evaluate(() => window.__segApp.state.customSpecies[0].hardness)), 2000);
  // the table fits a phone: no sideways scroll, and the delete button is on screen
  assert.ok((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0);
  const fit = await page.evaluate(() => { const w = document.querySelector('#secSpecies .tbl-wrap'); const b = document.querySelector('#secSpecies [data-action="spec-del"]'); return { scrolls: w.scrollWidth > w.clientWidth, inside: b.getBoundingClientRect().right <= w.getBoundingClientRect().right + 1 }; });
  assert.deepEqual(fit, { scrolls: false, inside: true });
  // every built-in row shows its full hardness number (not clipped)
  const clipped = await page.evaluate(() => [...document.querySelectorAll('#secSpecies tbody tr td:nth-child(3)')].filter((td) => td.scrollWidth > td.clientWidth).length);
  assert.equal(clipped, 0);
  assert.deepEqual(errors, []);
  await context.close();
});
