// Unit tests for the calculation core. Expected values are worked by hand
// (or from independent geometry), not copied from the code under test.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCore } = require('./load-core');

const C = loadCore();
const near = (a, b, tol = 1e-4, msg) => assert.ok(Math.abs(a - b) <= tol, (msg || '') + ` expected ${b}, got ${a}`);
const DEG = Math.PI / 180;
// Values built inside the vm sandbox have a different Array/Object prototype; compare as plain data.
const plain = (x) => JSON.parse(JSON.stringify(x));

function ring(over) { return Object.assign(C.defaultRing('maple'), over); }
function design(over) {
  return Object.assign({
    units: 'in',
    settings: { tool: 'miter', kerf: 0.125, safety: 5, turnAllow: 0.125, sandAllow: 0.0625, maxStrip: 48, denom: 16, wall: 0.25, stripRound: 1 / 32 },
    base: { type: 'none' },
    rings: []
  }, over);
}

// ---------- Units ----------
test('parseLength reads decimals, fractions, mixed numbers and units', () => {
  near(C.parseLength('3', 'in'), 3);
  near(C.parseLength('3.5', 'in'), 3.5);
  near(C.parseLength('.5', 'in'), 0.5);
  near(C.parseLength('3 1/2', 'in'), 3.5);
  near(C.parseLength('3-1/2', 'in'), 3.5);
  near(C.parseLength('3 - 1/2', 'in'), 3.5);
  near(C.parseLength('1/8', 'in'), 0.125);
  near(C.parseLength('2"', 'in'), 2);
  near(C.parseLength('2 in', 'mm'), 2, 1e-9, 'explicit in overrides mm');
  near(C.parseLength('25.4mm', 'in'), 1, 1e-9, 'explicit mm overrides in');
  near(C.parseLength('2.54 cm', 'in'), 1, 1e-9);
  near(C.parseLength('50.8', 'mm'), 2, 1e-9, 'bare number uses current units');
  near(C.parseLength('-1/8', 'in'), -0.125);
  near(C.parseLength('1 3/16″', 'in'), 1.1875);
  for (const bad of ['', 'abc', '1/0', '3 1/', '1..2', null, undefined]) assert.ok(Number.isNaN(C.parseLength(bad, 'in')), 'should reject ' + bad);
});

test('formatLength shows reduced fractions, decimals and mm', () => {
  assert.equal(C.formatLength(3.307, 'in', 16), '3 5/16″');
  assert.equal(C.formatLength(0.0625, 'in', 16), '1/16″');
  assert.equal(C.formatLength(2, 'in', 16), '2″');
  assert.equal(C.formatLength(2.5, 'in', 32), '2 1/2″');
  assert.equal(C.formatLength(0.01, 'in', 16), '1/64″');
  assert.equal(C.formatLength(1 / 32, 'in', 16), '1/32″', 'small values get finer fractions');
  assert.equal(C.formatLength(0.125, 'in', 16), '1/8″');
  assert.equal(C.formatLength(0, 'in', 16), '0″');
  assert.equal(C.formatLength(1.2345, 'in', 0), '1.235″'.replace('1.235', String(+1.2345.toFixed(3))));
  assert.equal(C.formatLength(1, 'mm', 16), '25.4 mm');
  assert.equal(C.formatLength(5, 'mm', 16), '127 mm');
  assert.equal(C.formatLength(3.5, 'in', 16, { plain: true }), '3 1/2');
  assert.equal(C.formatLength(NaN, 'in', 16), '—');
  assert.equal(C.toFraction(-0.375, 8), '-3/8');
});

test('fractions shown in inputs read back to the same value', () => {
  for (let k = 0; k <= 640; k++) {
    const v = k / 64;
    near(C.parseLength(C.toFraction(v, 64), 'in'), v, 1e-12);
  }
});

// ---------- Closed ring geometry ----------
test('12-segment closed ring: angles, lengths and width (hand-worked)', () => {
  // R = 4, width 1, turning allowance 1/8:  Ro = 4.125, ri = 2.875, theta = 15°
  const g = C.ringGeometry(ring({ segments: 12, outerR: 4, width: 1, thickness: 0.75 }), { turnAllow: 0.125, sandAllow: 0.0625 });
  assert.deepEqual(plain(g.errors), []);
  assert.equal(g.segs.length, 12);
  for (const s of g.segs) near(s.theta, 15, 1e-9);
  near(g.segs[0].lOut, 2.210581, 1e-5);  // 2 * 4.125 * tan 15°
  near(g.segs[0].lIn, 1.488209, 1e-5);   // 2 * (2.875 cos 15°) * tan 15°
  near(g.W, 1.347963, 1e-5);             // 4.125 − 2.875 cos 15°
  near(g.roughT, 0.8125);
  near(g.centerR, 3.5);
});

test('ring polygon fully contains the turned ring (geometry property)', () => {
  for (const n of [6, 8, 12, 16, 24, 36]) {
    for (const [R, w] of [[2, 0.5], [4, 1], [6, 0.375]]) {
      const ta = 0.125;
      const g = C.ringGeometry(ring({ segments: n, outerR: R, width: w, thickness: 0.75 }), { turnAllow: ta });
      const s = g.segs[0];
      const th = Math.PI / n;
      const aOut = (s.lOut / 2) / Math.tan(th);   // distance from center to the outer flat
      const aIn = g.Ro - g.W;
      const innerCorner = Math.hypot(aIn, s.lIn / 2);
      near(aOut, R + ta, 1e-9, `outer flat n=${n}`);          // flats just touch the outside + allowance
      near(innerCorner, R - w - ta, 1e-9, `inner corner n=${n}`); // corners just touch the hole − allowance
      near(g.segs.reduce((a, x) => a + 2 * x.theta, 0), 360, 1e-9, 'angles close the ring');
      near(n * s.lOut, 2 * n * g.Ro * Math.tan(th), 1e-9, 'perimeter of circumscribed polygon');
    }
  }
});

test('common miter angles', () => {
  const ang = (n) => C.ringGeometry(ring({ segments: n, outerR: 4, width: 1 }), { turnAllow: 0.125 }).segs[0].theta;
  near(ang(8), 22.5, 1e-9);
  near(ang(12), 15, 1e-9);
  near(ang(16), 11.25, 1e-9);
  near(ang(24), 7.5, 1e-9);
});

test('ring errors: too few segments, solid middle, bad sizes', () => {
  const ctx = { turnAllow: 0.125 };
  assert.ok(C.ringGeometry(ring({ segments: 2 }), ctx).errors.length);
  assert.ok(C.ringGeometry(ring({ outerR: 1, width: 1 }), ctx).errors[0].includes('inside radius'));
  assert.ok(C.ringGeometry(ring({ outerR: 1, width: 0.9 }), ctx).errors.length, 'hole smaller than allowance');
  assert.ok(C.ringGeometry(ring({ width: 0 }), ctx).errors.length);
  assert.ok(C.ringGeometry(ring({ thickness: 0 }), ctx).errors.length);
  assert.ok(C.ringGeometry(ring({ outerR: -1 }), ctx).errors.length);
});

// ---------- Open rings, veneer, unequal segments ----------
test('open ring by gap and by length give matching results', () => {
  const ctx = { turnAllow: 0.125 };
  const g1 = C.ringGeometry(ring({ segments: 12, outerR: 4, width: 1, type: 'open', openBy: 'gap', gap: 0.25 }), ctx);
  near(g1.segs[0].lOut, 2.210581 - 0.25, 1e-5);
  near(g1.segs[0].lIn, 1.488209 - 0.25, 1e-5);
  near(g1.gapPerp, 0.25 * Math.cos(15 * DEG), 1e-9);
  const g2 = C.ringGeometry(ring({ segments: 12, outerR: 4, width: 1, type: 'open', openBy: 'length', segLen: 2.210581 - 0.25 }), ctx);
  near(g2.gap, 0.25, 1e-5);
  assert.ok(g1.open);
  const tooLong = C.ringGeometry(ring({ segments: 12, outerR: 4, width: 1, type: 'open', openBy: 'length', segLen: 3 }), ctx);
  assert.ok(tooLong.errors.length);
  const tooWide = C.ringGeometry(ring({ segments: 12, outerR: 4, width: 1, type: 'open', gap: 2 }), ctx);
  assert.ok(tooWide.errors.some((e) => e.includes('wider than the segments')));
});

test('veneer shortens each closed segment by t / cos(theta)', () => {
  const g = C.ringGeometry(ring({ segments: 12, outerR: 4, width: 1, veneer: { t: 1 / 32, species: 'veneer-black' } }), { turnAllow: 0.125 });
  near(g.segs[0].lOut, 2.210581 - (1 / 32) / Math.cos(15 * DEG), 1e-5);
  near(g.veneerT, 1 / 32);
  // Veneer is ignored (with a note) on open rings
  const o = C.ringGeometry(ring({ type: 'open', gap: 0.2, veneer: { t: 0.05, species: 'veneer-black' } }), { turnAllow: 0.125 });
  assert.equal(o.veneerT, 0);
  assert.ok(o.warnings.some((w) => w.includes('Veneer')));
});

test('unequal segment sizes: 2,1 pattern on 12 segments', () => {
  const g = C.ringGeometry(ring({ segments: 12, outerR: 4, width: 1, spans: [2, 1] }), { turnAllow: 0.125 });
  assert.deepEqual(plain(g.errors), []);
  near(g.segs[0].theta, 20, 1e-9); // 2/18 of 360 = 40°, so 20° each end
  near(g.segs[1].theta, 10, 1e-9);
  near(g.segs.reduce((a, s) => a + 2 * s.theta, 0), 360, 1e-9);
  near(g.segs[0].lOut, 2 * 4.125 * Math.tan(20 * DEG), 1e-9);
  // Width is set by the widest segment so every inner corner stays inside the hole
  for (const s of g.segs) {
    const aIn = g.Ro - g.W;
    assert.ok(Math.hypot(aIn, s.lIn / 2) <= 2.875 + 1e-9);
  }
});

// ---------- Patterns ----------
test('pattern expansion and counts', () => {
  assert.deepEqual(plain(C.expandPattern(['a', 'b'], 5)), ['a', 'b', 'a', 'b', 'a']);
  assert.deepEqual(plain(C.patternCounts(['a', 'b', 'c'], 16)), { a: 6, b: 5, c: 5 });
  assert.deepEqual(plain(C.patternCounts(['walnut', 'maple'], 12)), { walnut: 6, maple: 6 });
});

// ---------- Cut list ----------
test('one ring: strip length shows safety as its own line (hand-worked)', () => {
  const d = design({ rings: [ring({ segments: 12, outerR: 4, width: 1, thickness: 0.75, pattern: ['maple'] })] });
  const R = C.computeDesign(d, []);
  assert.equal(R.cut.strips.length, 1);
  const st = R.cut.strips[0];
  near(st.W, 1.375, 1e-12);                         // 1.347963 rounded up to 1/32
  near(st.T, 0.8125, 1e-12);
  near(st.piecesLen, 12 * (2.210581 + 1.488209) / 2, 1e-4);
  near(st.kerfWaste, 12 * 0.125 / Math.cos(15 * DEG), 1e-9);
  near(st.trim, 1.375 * Math.tan(15 * DEG), 1e-9);
  assert.equal(st.safety, 5);
  near(st.total, st.piecesLen + st.kerfWaste + st.trim + 5, 1e-9);
  near(st.total, 29.11408, 1e-4);
  near(st.bf, 0.8125 * 1.375 * st.total / 144, 1e-9);
  assert.equal(R.cut.totalPieces, 12);
});

test('safety length is adjustable, including zero', () => {
  const mk = (safety) => C.computeDesign(design({ settings: Object.assign(design().settings, { safety }), rings: [ring({ pattern: ['maple'] })] }), []).cut.strips[0];
  const a = mk(5), b = mk(2), z = mk(0);
  near(a.total - b.total, 3, 1e-9);
  near(a.total - z.total, 5, 1e-9);
  assert.equal(z.safety, 0);
  const neg = mk(-1);
  assert.equal(neg.safety, 0, 'negative safety is treated as 0');
});

test('same wood on several rings is grouped into shared strips', () => {
  const r = { segments: 12, outerR: 4, width: 1, thickness: 0.75, pattern: ['maple'] };
  const d = design({ rings: [ring(r), ring(r)] });
  const cut = C.computeDesign(d, []).cut;
  // 24 pieces need ~52.9" with one safety length, which is over 48", so 2 strips, each with its own safety length.
  assert.equal(cut.strips.length, 2);
  assert.ok(cut.strips.every((s) => s.safety === 5 && s.total <= 48));
  assert.equal(cut.strips.reduce((a, s) => a + s.pieces, 0), 24);
  assert.deepEqual(plain(cut.strips.map((s) => s.label)), ['A1', 'A2']);
  assert.equal(cut.tally.length, 1, 'one piece size');
  assert.equal(cut.tally[0].count, 24);
  assert.deepEqual(plain([...cut.tally[0].rings]), [1, 2]);
  // With a long maximum strip, they share one strip
  const d2 = design({ settings: Object.assign(design().settings, { maxStrip: 96 }), rings: [ring(r), ring(r)] });
  const cut2 = C.computeDesign(d2, []).cut;
  assert.equal(cut2.strips.length, 1);
  assert.equal(cut2.strips[0].pieces, 24);
});

test('different widths or thicknesses get separate strips; alternating colors count correctly', () => {
  const d = design({ rings: [
    ring({ segments: 12, outerR: 4, width: 1, thickness: 0.75, pattern: ['walnut', 'maple'] }),
    ring({ segments: 12, outerR: 4, width: 1, thickness: 0.5, pattern: ['walnut'] })
  ] });
  const cut = C.computeDesign(d, []).cut;
  const walnut = cut.tally.filter((t) => t.species === 'walnut');
  const maple = cut.tally.filter((t) => t.species === 'maple');
  assert.equal(walnut.reduce((a, t) => a + t.count, 0), 18);
  assert.equal(maple.reduce((a, t) => a + t.count, 0), 6);
  assert.equal(walnut.length, 2, 'two walnut thicknesses');
  assert.equal(cut.strips.length, 3);
});

test('tool choice changes kerf and adds cleanup allowance for band saw', () => {
  const base = { rings: [ring({ pattern: ['maple'] })] };
  const band = C.computeDesign(design(Object.assign({}, base, { settings: Object.assign(design().settings, { tool: 'bandsaw', kerf: C.TOOLS.bandsaw.kerf }) })), []).cut;
  const st = band.strips[0];
  near(st.cleanWaste, 12 * C.TOOLS.bandsaw.cleanup, 1e-9);
  near(st.kerfWaste, 12 * 0.04 / Math.cos(15 * DEG), 1e-9);
  for (const k of Object.keys(C.TOOLS)) {
    assert.ok(C.TOOLS[k].kerf > 0);
    assert.ok(C.TOOLS[k].how.includes('{angle}'));
  }
});

test('veneer strips are listed with square-cut pieces', () => {
  const d = design({ rings: [ring({ segments: 12, outerR: 4, width: 1, pattern: ['maple'], veneer: { t: 1 / 32, species: 'veneer-black' } })] });
  const cut = C.computeDesign(d, []).cut;
  const v = cut.strips.find((s) => s.kind === 'veneer');
  assert.ok(v);
  assert.equal(v.pieces, 12);
  near(v.T, 1 / 32);
  assert.equal(v.trim, 0);
  assert.equal(v.safety, 5);
});

test('laminated segments list each layer and count board feet per layer wood', () => {
  const r = ring({ segments: 12, outerR: 4, width: 1, thickness: 0.6875, pattern: ['lam', 'walnut'],
    lam: { on: true, layers: [{ species: 'maple', t: 0.375 }, { species: 'padauk', t: 0.375 }] } });
  const R = C.computeDesign(design({ rings: [r] }), []);
  const lam = R.cut.strips.find((s) => s.kind === 'lam');
  assert.ok(lam);
  assert.equal(lam.pieces, 6);
  assert.deepEqual(plain(lam.layers.map((l) => l.species)), ['maple', 'padauk']);
  assert.ok(R.cut.bySpecies.maple.bf > 0 && R.cut.bySpecies.padauk.bf > 0 && R.cut.bySpecies.walnut.bf > 0);
  assert.ok(!R.messages.some((m) => m.text.includes('laminated layers')), 'layers match rough thickness');
  r.lam.layers[0].t = 0.25;
  const R2 = C.computeDesign(design({ rings: [r] }), []);
  assert.ok(R2.messages.some((m) => m.text.includes('laminated layers')));
});

test('board feet', () => {
  near(C.boardFeet(1, 12, 12), 1);
  near(C.boardFeet(0.75, 2, 48), 0.5);
});

// ---------- Base ----------
test('base blank thickness includes sanding and tenon; recess check', () => {
  const d = design({ base: { type: 'disc', autoDia: true, thickness: 0.5, species: 'walnut', mount: 'tenon', mountDepth: null },
    rings: [ring({ outerR: 3, width: 0.75 })] });
  const b = C.computeDesign(d, []).base;
  near(b.R, 3);
  near(b.side, 6.25);
  near(b.blankT, 0.5 + 0.0625 + 0.25);
  const d2 = design({ base: { type: 'disc', autoDia: false, diameter: 4, thickness: 0.25, species: 'walnut', mount: 'recess', mountDepth: 0.1875 },
    rings: [ring({ outerR: 3, width: 0.75 })] });
  const R2 = C.computeDesign(d2, []);
  near(R2.base.R, 2);
  near(R2.base.blankT, 0.25 + 0.0625, 1e-12, 'recess does not add height');
  assert.ok(R2.messages.some((m) => m.text.includes('too thin for')));
});

test('heights: finished and rough', () => {
  const d = design({ base: { type: 'disc', autoDia: true, thickness: 0.5, species: 'walnut', mount: 'none' },
    rings: [ring({ thickness: 0.75 }), ring({ thickness: 0.75, sand: 0.125 })] });
  const R = C.computeDesign(d, []);
  near(R.finishedH, 2.0);
  near(R.roughH, 0.5625 + 0.8125 + 0.875);
});

// ---------- Checks ----------
test('checks: ring overlap, pattern repeat, short pieces, movement, odd count, open ring note', () => {
  const d = design({ rings: [
    ring({ outerR: 4, width: 0.5, pattern: ['maple'] }),
    ring({ outerR: 6, width: 0.5, pattern: ['a', 'b', 'c'], segments: 16 }),
    ring({ outerR: 1.5, width: 0.5, segments: 24, pattern: ['mahogany', 'beech'] }),
    ring({ outerR: 3, width: 0.75, segments: 11, type: 'open', gap: 0.1, grain: 'end' })
  ] });
  const msgs = C.computeDesign(d, []).messages.map((m) => m.level + ': ' + m.text);
  const has = (s) => assert.ok(msgs.some((m) => m.includes(s)), 'missing message: ' + s + '\n' + msgs.join('\n'));
  has('Rings 1 and 2 overlap by only');
  has('does not divide 16 segments evenly');
  has('dangerous to cut');
  has('Fewer segments');
  has('move very differently');
  has('end-grain');
  has('will not hold water');
  const odd = C.computeDesign(design({ rings: [ring({ segments: 11 })] }), []).messages;
  assert.ok(odd.some((m) => m.text.includes('odd segment count')));
  const clean = C.computeDesign(design({ rings: [ring({ outerR: 4, width: 1, pattern: ['walnut', 'maple'] })] }), []).messages;
  assert.deepEqual(plain(clean), [], 'a sensible ring has no warnings');
});

test('test-fit gap: 0.1° per cut on 12 segments adds up to 2.4°', () => {
  const t = C.testFitGap(12, 1.5, 0.1);
  near(t.totalDeg, 2.4, 1e-12);
  near(t.gap, 1.5 * Math.tan(2.4 * DEG), 1e-12);
  near(t.gap, 0.06288, 1e-4);
  assert.equal(C.testFitGap(12, 1.5, 0).gap, 0);
});

// ---------- Profile ----------
test('ring thicknesses fill the height, uniform and progressive', () => {
  assert.deepEqual(plain(C.ringThicknesses(3, 0.75, 0)), [0.75, 0.75, 0.75, 0.75]);
  const p = C.ringThicknesses(4, 0.5, 0.125);
  near(p.reduce((a, b) => a + b, 0), 4, 1e-9);
  near(p[0], 0.5); near(p[1], 0.625); near(p[2], 0.75);
  const small = C.ringThicknesses(3.1, 0.75, 0);
  assert.equal(small.length, 4, 'tiny remainder joins the last ring');
  near(small[3], 0.85, 1e-9);
  const thinner = C.ringThicknesses(3, 1, -0.5);
  assert.ok(thinner.every((t) => t >= 0.125));
  near(thinner.reduce((a, b) => a + b, 0), 3, 1e-9);
});

test('cylinder profile gives equal rings with width = wall', () => {
  const res = C.generateRings({ shape: 'cylinder', height: 3, maxDia: 6, wall: 0.25, ringT: 0.75, step: 0, segments: 12, species: 'maple' }, [], 'in');
  assert.equal(res.rings.length, 4);
  for (const r of res.rings) { near(r.outerR, 3, 1e-9); near(r.width, 0.25, 1e-6); assert.equal(r.segments, 12); }
});

test('sloped wall is measured square to the surface', () => {
  // Straight cone R = 1 + z (45°): horizontal wall must be wall * sqrt(2)
  const pts = []; for (let i = 0; i <= 10; i++) pts.push([i * 0.4, 1 + i * 0.4]);
  near(C.profileInner(pts, 2, 0.25), 3 - 0.25 * Math.SQRT2, 1e-6);
});

test('bowl profile: rings flare out, each ring covers the curve over its full height', () => {
  const P = { shape: 'bowl', height: 3, maxDia: 8, baseDia: 3.5, wall: 0.3125, ringT: 0.75, step: 0, segments: 12, species: 'walnut' };
  const res = C.generateRings(P, [], 'in');
  const pts = res.pts;
  assert.equal(res.rings.length, 4);
  for (let i = 1; i < res.rings.length; i++) assert.ok(res.rings[i].outerR > res.rings[i - 1].outerR);
  near(res.rings[3].outerR, 4, 1e-9, 'top ring reaches the rim');
  for (const r of res.rings) {
    for (let k = 0; k <= 30; k++) {
      const z = r.z0 + r.thickness * k / 30;
      assert.ok(C.profileOuter(pts, z) <= r.outerR + 1e-9, 'outside covered');
      assert.ok(C.profileInner(pts, z, P.wall) >= r.outerR - r.width - 1e-9, 'inside covered');
    }
  }
  const R = C.computeDesign(design({ settings: Object.assign(design().settings, { wall: 0.3125 }), rings: res.rings, base: { type: 'disc', autoDia: true, thickness: 0.5, species: 'walnut', mount: 'tenon' } }), []);
  assert.ok(!R.messages.some((m) => m.level === 'error'), JSON.stringify(R.messages));
  assert.ok(!R.messages.some((m) => m.text.includes('overlap')), 'generated rings overlap enough');
});

test('vase profile goes in and out; regenerating keeps ring styles', () => {
  const P = { shape: 'vase', height: 9, maxDia: 6, baseDia: 3, neckDia: 2.5, lipDia: 3, bellyAt: 0.4, wall: 0.3125, ringT: 0.75, step: 0, segments: 16, species: 'cherry' };
  const res = C.generateRings(P, [], 'in');
  assert.equal(res.rings.length, 12);
  const Rs = res.rings.map((r) => r.outerR);
  const iMax = Rs.indexOf(Math.max(...Rs));
  assert.ok(iMax > 0 && iMax < Rs.length - 1, 'widest ring is in the middle');
  assert.ok(Rs[Rs.length - 3] < Rs[iMax], 'narrows toward the neck');
  res.rings[4].pattern = ['padauk', 'maple'];
  res.rings[4].segments = 24; res.rings[4].customSeg = true;
  const again = C.generateRings(Object.assign({}, P, { segments: 12 }), res.rings, 'in');
  assert.deepEqual(plain(again.rings[4].pattern), ['padauk', 'maple']);
  assert.equal(again.rings[4].segments, 24, 'custom segment count kept');
  assert.equal(again.rings[0].segments, 12, 'others follow the profile');
});

test('custom profile from text points', () => {
  const pts = C.parseProfilePoints('0, 3\n2, 6\n4 1/2, 5', 'in');
  assert.deepEqual(plain(pts), [[0, 1.5], [2, 3], [4.5, 2.5]]);
  assert.equal(C.parseProfilePoints('0, 3', 'in'), null, 'needs two points');
  assert.equal(C.parseProfilePoints('0, x\n1, 2', 'in'), null);
  const mm = C.parseProfilePoints('0, 76.2\n50.8, 152.4', 'mm');
  near(mm[1][0], 2); near(mm[1][1], 3);
  const res = C.generateRings({ shape: 'custom', points: '0, 3\n2, 6\n4, 5', wall: 0.25, ringT: 1, step: 0, segments: 12 }, [], 'in');
  assert.equal(res.rings.length, 4);
  assert.ok(C.generateRings({ shape: 'custom', points: 'nope', wall: 0.25, ringT: 1, segments: 12 }, [], 'in').error);
});

test('segment suggestion aims for about 2" long points', () => {
  assert.equal(C.suggestSegments(4, 0.125), 14);
  const n = C.suggestSegments(2, 0.125);
  const L = 2 * 2.125 * Math.tan(Math.PI / n);
  assert.ok(Math.abs(L - 2) < 0.6);
});

// ---------- Species & sharing ----------
test('species list: unique ids, valid colors, custom species merge', () => {
  const ids = new Set();
  for (const s of C.SPECIES) {
    assert.ok(!ids.has(s.id), 'duplicate ' + s.id); ids.add(s.id);
    assert.match(s.color, /^#[0-9a-f]{6}$/i);
  }
  assert.ok(C.SPECIES.length >= 25);
  // Janka hardness (lbf): present for every real wood, absent for veneers, and in a believable range
  const byId = Object.fromEntries(C.SPECIES.map((x) => [x.id, x]));
  for (const x of C.SPECIES) {
    if (x.id.startsWith('veneer')) assert.equal(x.hardness, null);
    else assert.ok(x.hardness >= 300 && x.hardness <= 3500, x.id + ' hardness ' + x.hardness);
  }
  assert.ok(byId.basswood.hardness < byId.poplar.hardness && byId.poplar.hardness < byId.walnut.hardness);
  assert.ok(byId.walnut.hardness < byId.maple.hardness && byId.maple.hardness < byId.padauk.hardness);
  assert.ok(byId.padauk.hardness < byId.ebony.hardness);
  assert.equal(byId.maple.hardness, 1450);
  const map = C.speciesMap([{ id: 'c-bocote', name: 'Bocote', color: '#8a6a2a' }]);
  assert.equal(map['c-bocote'].name, 'Bocote');
  assert.equal(map.walnut.name, 'Black walnut');
});

test('share encoding round-trips, including non-ASCII names', () => {
  const obj = { design: { name: 'Maple ‘bowl’ ½ — test', rings: [{ outerR: 3.25 }] }, species: [] };
  const s = C.encodeDesign(obj);
  assert.match(s, /^[A-Za-z0-9_-]+$/, 'URL-safe');
  assert.deepEqual(plain(C.decodeDesign(s)), obj);
});
