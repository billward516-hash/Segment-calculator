# ISO 9001 Training Program

A participant guide, instructor guide, handouts, and classroom games for ISO 9001 quality management system training. Built from `ISO9001_Training_Program_Spec.md`. Core content teaches ISO 9001:2015 (with Amendment 1:2024). All 2026 content is preliminary and unverified.

This material is an original training aid. It is not a substitute for the standard. Obtain ISO 9001 from ISO or a national standards body.

## Open the program

Open `index.html` in any browser. Everything runs offline from a folder, USB drive, or intranet share. There are no dependencies and no network calls.

| File | What it is |
|---|---|
| `index.html` | Landing page linking everything below |
| `participant-guide.html` | Modules 0 to 12 and glossary, print-ready |
| `instructor-guide.html` | Preparation, agendas, assessment, troubleshooting, answer keys |
| `handouts.html` | STOP, FLAG, HOLD, REPORT card; audit response card; clause-to-role map |
| `games/quality-flow/index.html` | Flagship simulation (single file, seeded, facilitator and team views) |
| `games/quiz/index.html` | Quick round, knowledge check, module quiz, and the Clause Sprint team race |
| `games/printables/` | Printable equivalents: cards, boards, dice tables, record sheets, quiz sheets |

## Running Quality Flow

1. Open `games/quality-flow/index.html` on the projector laptop.
2. On the setup screen choose an industry pack, the number of teams (1 to 6), rounds (6 or 12), and a seed. The configuration box shows every parameter and can be edited.
3. Each round has three steps, driven from the **Facilitator view**: invest, reveal the event and run the round, then confirm dispositions and score. Teams use their **Team view** tab to buy controls and choose redo or scrap for held work items.
4. At the end the game shows final scores, quality cost, the mock audit, a clause-mapping debrief, and the mandatory debrief questions.
5. Use **Replay with the same seed** to run the same event deck with different choices. Dice are keyed to the seed, team, round, and work item, so a different purchase changes outcomes only where the control applies.
6. Export the log as CSV or the full game record as JSON. The game saves progress in the browser and offers to resume after a refresh.

Variants through the configuration box: set `budgetShockRound` to halve unspent QP in that round; raise the core stage `capacity` for the constraint-focus variant; change `rounds`, `workItemsReleasedPerRound`, `startingQP`, or any value in `economics`. Stage names, the work item term, and event wording come from the selected pack.

If a viewer blocks downloads, the log text appears in a box that can be copied. If the digital game fails, print the matching pack from `games/printables/` and run the same game with dice.

## Customize

- `config/company.json`: company name, default industry pack, and owner statements (policy, stop-work authority, non-punitive reporting). Items marked **[OWNER INPUT]** in the content need your real wording.
- `data/packs.json`: the industry packs. Copy an entry, give it six stages, a work item term, and event wording for E01, E02, E04, E05, E07, and E08. Company names must start with "Meridian".
- `data/controls.json`, `data/events.json`: the Quality Flow decks.
- `data/questions.json`: 120 questions (49 scenario). Answer positions are shuffled each time they are shown.
- `data/clause-map.json`: the single mapping of 2015 clauses to the reported 2026 changes, with confidence and `verifyStatus`. Update numbering here.
- `content/**/*.md`: the guide text. `{{COMPANY}}` is replaced at build time.

After any change run:

```
npm run build   # rebuilds the games, printables, and HTML books
npm test        # schema tests, simulation tests, content validation
```

`npm run balance` writes `BALANCE.md`, a report on how parameters and purchase orders affect scores (1,000 seeded runs).

## Printing

Open a file in `games/printables/` and print at Letter size with margins as set by the page. Each pack has its own file (`quality-flow-<pack>.html`) with control cards, event cards, a facilitator key with the event order for the chosen seed, stage board, disposition sheet, tracking sheet, final audit sheet, hold flags, and a two-dice lookup table that replaces the percentages. Rebuild with a different seed using `node tools/build-printables.js --seed 777`.

## What is included and what is not

Included: participant guide Modules 0 to 12 with 2026 Bridge boxes, glossary, three handouts, instructor overview with agendas for Formats A and B, answer keys for every quick check, the 120-question bank, Quality Flow with all eight industry packs, the quiz and Clause Sprint, printables, tests, and a content validator.

Not built (listed in the specification and available to add): the other classroom games (Audit Day, Root Cause Relay, Document Control Relay, Traceability Challenge, Management Review Boardroom, Workplace Evidence Hunt, Change Control Challenge), the Sector Deep-Dive Track and casebook, the sector quiz banks, the 40-scenario library, the per-module one-page summaries and instructor facilitation notes beyond the Module 7 model, the Quality Flow 2026 mode and edition toggle, and the 2026 bridge session materials. The 2026 content that exists is in Module 11 and the Bridge boxes.

## Points to confirm

1. **Control costs.** The specification says the 15 controls cost 37 QP in total, but its own table sums to 36. The table values are used. Change `data/controls.json` if 37 was intended.
2. **Quality Flow interpretation.** Where the specification is silent the game uses these defaults, all editable in `economics`: a redone work item is not re-checked and has a 15 percent chance of escaping (`redoEscape`); a held work item without control C09 has a 25 percent chance of release in error (`erroneousRelease`); a complaint review costs 2 per work item (`reviewCost`); under release pressure without C12 a team yields half the time (`pressureYield`); an unmitigated surprise audit and the other events apply the penalties described in `data/events.json`.
3. **Balance.** A controlled team beats an uncontrolled team in every seeded run, by a wide margin, because escapes are expensive. See `BALANCE.md` for the controls that matter most and for tuning suggestions (control C07 is the weakest purchase under the defaults).
4. **Verification.** Every 2026 item and every 2015 clause tag and answer must be confirmed against the purchased standard. `data/clause-map.json` marks all 2026 rows `unverified`. Question rationales were written from general knowledge of the standard.
5. **Owner inputs.** Quality policy, objectives, stop-work authority, non-punitive reporting statement, pass mark, retention period, and scope of design and development are marked **[OWNER INPUT]**.
6. **Open specification items** (Section 15) remain with the program owner, including the certification body's transition plan.
