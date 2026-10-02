# Segmented Glue-Up Calculator — Spec (Draft)

A calculator for woodturners building segmented bowls, vases, and similar forms from stacked rings of wood segments.

## Decisions

- **Delivery:** a single self-contained `index.html` (inline CSS/JS, no build step, no dependencies, works offline). Distribute by emailing/sharing the file, or host it on GitHub Pages so it can be bookmarked or added to a phone's home screen like an app. A web app manifest can be added later for a true "install" experience, but is not required.
- **Audience:** beginners and advanced segmenters.
  - *Beginner mode:* presets (e.g. 12-segment bowl), guided steps, plain-language explanations, warnings for unsafe or unbuildable choices.
  - *Advanced mode:* full manual control of every ring, progressive thickness, custom rings, open segments, kerf and tilt options.

- **Devices:** phone (used in the shop) and printout. Mobile-first layout plus a print stylesheet.
- **Cost / license:** free to use.
- **Persistence:** designs are remembered on the user's device (localStorage), with export/import so they can move between devices.
- **Safety note:** a short, visible disclaimer next to the safety length (cutting small pieces is hazardous; use your own judgment).

## Goals

Given a design (rings, radii, thicknesses, species), output everything needed to cut and glue it up: segment count, miter angle, segment dimensions, board stock required, and a layout of colors/species per ring.

## Inputs

### Global
- Units: inches / mm (toggle)
- Saw kerf (for cut-list and stock estimates)

### Per ring
| Input | Notes |
|---|---|
| Segments per ring | Integer, typically 6–24 |
| Radius | Specify as inside, outside, or centerline (see open questions) |
| Finished thickness | Target thickness after sanding |
| Sanding allowance | Extra thickness to mill in, so the ring reaches the finished thickness after flattening/sanding |
| Rough (cut) thickness | Computed = finished + allowance |
| Segment type | **Closed** (segments meet edge to edge) or **Open** (spaced gaps between segments) |
| Species / color layout | Per-segment or repeating pattern (e.g. A-B-A-B) |

### Progressive thickness
- Option to set a base thickness and a step so each successive ring is thicker (or thinner), or enter each ring's thickness by hand.
- Per-ring overrides always allowed.

### Custom rings
- User-defined rings with arbitrary segment counts, widths, and species/color sequences (e.g. feature rings, accent strips, alternating patterns).
- Reusable ring templates.

### Base and top ring features
- **Base:** solid disc, ring with solid center, or stacked disc; thickness and species.
- **Top / rim:** rim ring options (thicker lip, accent ring, flat rim); thickness and species.

## Outputs
- Miter angle per ring (`180° / n` for a closed ring)
- Segment length (outside and inside edge), width, thickness
- Closed ring: segment length from radius and count
- Open ring: segment length plus gap size (from segment count and radius)
- Rough-cut dimensions with sanding allowance
- Total height of the stack (rough and finished)
- Board feet / stock length per species, including kerf and waste
- Cut list and a simple layout diagram (ring-by-ring species/color view)

## Cut list and safety length

Every strip on the cut list includes a **safety length of 5 in (127 mm) added to the strip**, on top of the segment lengths and miter-angle waste.

- The safety length is **shown as its own explicit line item** in the cut list, e.g. `Strip length = (segments per strip × segment length) + kerf/miter waste + 5.00 in safety`. Nothing is hidden in the total.
- It is a **user-adjustable setting** (default 5 in; can be set to 0). Users who have their own safe cutting method (sled, stop block, clamp-on jig) that wastes less material can lower it.
- The cut list notes why it exists: keeping hands away from the blade while cutting short pieces.
- Stock and board-foot totals are calculated using the adjusted strip lengths.

## Core formulas (closed ring, n segments)
- Miter angle (each end): `θ = 180° / n`
- Segment outside edge length: `L_out = 2 · R_out · sin(180°/n)`
- Segment inside edge length: `L_in = 2 · R_in · sin(180°/n)`
- Segment width (radial): `R_out − R_in` (measured at the centerline, accounting for the miter)
- Open ring: segment length is shortened by the gap; gap = `2 · R · sin(180°/n) − L_seg`

## Additional decisions

### Tools and cutting method
- The user chooses the tools they have (e.g. miter saw, table saw with sled, chop saw with stop block, bandsaw) and the cut list adapts its instructions and waste allowances to that choice.

### Strips and grouping
- If the user assigns the same species/color to more than one ring, the cut list groups strips of matching width and thickness so material is shared.
- Rings may be built from multiple pieces per segment (brick, stave, mosaic looks). The user chooses the number of pieces; patterns can alternate two colors or use many colors.
- Veneer/accent strips between wedges are supported, and segments within a ring may have different lengths.
- The cut list states **how many of each piece to cut, by length and angle**, per species.
- Rings can be rotated half a segment against the ring below (brick lay).
- Pattern repeat check: shows counts per species (e.g. 4 maple, 8 walnut) and flags counts that do not divide evenly.

### Design
- Ring count can be set from a target height, or rings can be added one at a time (both options).
- Vase profiles that curve in and out are supported.
- Reverse mode: given a target diameter and height, the tool suggests a design.
- Turning allowance of 1/8 in per side by default (adjustable).
- Wall-thickness check against the finished inside and outside curves.
- Base ring supports recess, tenon, or chuck-mount allowances.

### Glue-up and checks
- Glue-up notes (clamping, flattening between rings, reference marks).
- Test-fit check showing the expected gap for a given miter-angle error (e.g. 0.1 degree).
- Wood-movement warnings (mixed end-grain and long-grain rings, large species differences).
- Printable page with cut list, ring diagram, and the safety note.

## Open questions
- Radius reference (inside / outside / centerline)
- Flat miters only vs. tilted (compound-angle) rings
- Open-ring definition (gap size, segment count, or segment length)
- Species list: built-in vs. user-entered; color swatches
- Default units
