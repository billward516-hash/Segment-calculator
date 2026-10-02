# Segment Calculator

A free calculator for woodturners building **segmented bowls, vases, and other turned forms**. Describe the shape and the woods; it gives you miter angles, segment sizes, a cut list with explicit safety lengths, a shopping list, a build checklist, and a printable shop sheet.

Everything is in one file, **`index.html`**. It needs no install, no account, and no internet once opened. Designs are saved on your device.

## Use it

- **Easiest:** open `index.html` in any browser (double-click it, or email it to yourself and open it on your phone).
- **As a phone "app":** host it with GitHub Pages (repo **Settings → Pages → Deploy from branch → `main` / root**). Open the link on your phone and choose **Add to Home Screen**.

## What it does

- Beginner and Advanced modes
- Build from a shape (bowl, vase, cylinder, or your own profile points), or ring by ring
- Outside-radius based, flat miters, inches with fractions (mm available)
- Progressive ring thickness, sanding and 1/8″ turning allowances
- Closed and open-segment rings (open rings are flagged as not watertight)
- Color patterns of any length, brick lay, unequal segment sizes, veneer between segments, laminated blanks
- Choose your cutting tool (miter saw, sled, chop saw, band saw, hand saw); kerf and instructions follow
- Cut list grouped by wood, thickness, and width, with **every strip showing its safety length (default 5″) as its own line**, adjustable to suit your method
- Checks for thin walls, poor ring overlap, small pieces, uneven patterns, and wood mixing: warns when woods in one ring (or in stacked rings) shrink very differently (more than 5 percentage points) or differ a lot in hardness (800+ Janka lbf)
- Test-fit gap estimate, shopping list in board feet with optional prices, build checklist, glue-up tips
- Print shop sheet with an optional full-size ring template; share links and export/import files

## Develop

```
npm test        # core math (Node) + browser tests (Playwright/Chromium)
```

The calculation code lives between `// ===CORE-START===` and `// ===CORE-END===` in `index.html`; `tests/load-core.js` loads it for the Node tests. See `SPEC.md` for the design decisions and formulas.

Free to use and share.
