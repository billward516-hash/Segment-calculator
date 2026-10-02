# Segmented Glue-Up Calculator — Spec (Draft)

A calculator for woodturners building segmented bowls, vases, and similar forms from stacked rings of wood segments.

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

## Core formulas (closed ring, n segments)
- Miter angle (each end): `θ = 180° / n`
- Segment outside edge length: `L_out = 2 · R_out · sin(180°/n)`
- Segment inside edge length: `L_in = 2 · R_in · sin(180°/n)`
- Segment width (radial): `R_out − R_in` (measured at the centerline, accounting for the miter)
- Open ring: segment length is shortened by the gap; gap = `2 · R · sin(180°/n) − L_seg`

## Open questions

Answering these will pin down the design. See the list the assistant sent with this draft.
