# Sector Deep-Dive Track: Case Room Facilitation and Badge Review

*This material is an original training aid. It is not a substitute for the standard. Obtain ISO 9001 from ISO or a national standards body.*

This chapter supports instructors who run the optional Industry Deep-Dive Track for {{COMPANY}}. The track follows the core modules. It shows how the same ISO 9001:2015 requirements appear in one sector. Clause tags in the casebook, primers, and drills carry `verifyStatus2015: unverified` until confirmed against the purchased standard. **[VERIFY]**

## 1. What the track contains

| Component | Where to find it | Time |
|---|---|---|
| Sector primer | Sector Deep-Dive Track book (`sector-tracks.html`), one chapter per sector | 30 to 40 minutes |
| Sector drills | Sector Casebook, Drills button; printable version in the same book | 20 minutes |
| Six cases (types A to F) | Sector Casebook (`games/casebook/index.html`) | 15 to 25 minutes each |
| Sector capstone | Sector Casebook, "Open a capstone" | 30 minutes |
| Reflection | Sector Casebook, three questions | 10 minutes |
| Results Reader | `games/casebook/results-reader.html` | As needed |
| Placement check (optional) | Sector Casebook, case shelf, "Take the placement check" | About 5 minutes |
| 2026 variant case (optional, preliminary) | Sector Casebook, below the six cases in each sector | About 15 minutes |

Nothing is locked. A learner may begin at the casebook and read the primer afterward. The core modules are recommended first. The eight sectors match the industry packs: discrete manufacturing (case code MFG), process, food, and consumer goods (FOD), electronics and semiconductor (ELX), construction and engineering projects (CON), IT and software services (ITS), healthcare and clinical services, management system topics only (HCS), logistics, warehousing, and distribution (LOG), and professional, financial, and education services (PRO).

**Scope limit.** The track teaches the quality management system only. It gives no clinical, food safety, safety, legal, or security instructions. In healthcare cases the investigator never makes a clinical decision; the correct answer is always to make sure the organization's own process is followed and the named person decides. If a learner raises a clinical, safety, or legal question, record it and refer it to the responsible function.

## 1a. Placement check (optional)

The placement check is for learners who skip the general instruction (core Modules 0 to 12) and go straight to the track. It has eight sector-neutral questions on the core modules (context, leadership, planning of changes, measuring resources, document control, traceability, nonconforming output, and corrective action). It uses the ISO 9001:2015 baseline and contains no 2026 content.

- **It advises; it never blocks.** Nothing in the track is locked by the result. A learner may skip the check entirely.
- **Pass rule.** The learner passes when the share answered correctly meets the pass mark, 80 percent by default, so at least 7 of 8. The pass mark is set in `data/casebook/placement.json` (`passMark`) and may be changed by the program owner. **[OWNER INPUT]**
- **Outcome.** At or above the pass mark the learner sees "Ready for the track". Below it the learner sees "Review advised" with the core modules linked to the questions missed, and may still start a sector.
- **Order.** The question and option order come from a seed. The check code (for example `PLC-P-16J0`) reproduces the same order; entering it in "Open a case by code" opens the check.
- **Results code.** After checking, the learner receives a placement results code, for example `PLC-P-16J0.1782G010ZF.X6 ~ J. Lee`. It records the score, the total, the pass mark, which questions were missed, and the date, with two check characters. Like case codes, it is a training aid, not an assessment record. It does not count toward the badge.
- **Results Reader.** Paste placement codes with case codes. They appear in a separate "Placement checks" table showing the score, the pass mark (and the number of correct answers it requires), the outcome under the pass rule, and the core modules to review. The CSV export includes them.

Use the check to plan coaching: a learner below the pass mark may still take a Case Room session, but should review the listed modules first or pair with a learner who has completed them.

## 2. How a case works

Each case is a visit to a fictional Meridian organization. The learner is an investigator (internal auditor, consultant, or quality representative). The case folder has five tabs: Brief, Site, Notebook, Findings, and Debrief.

1. **Brief.** Purpose, scope, visit points (12 by default; 16 for the capstone), and the goal for the case type.
2. **Site.** Each Observe, Ask, or Review costs one visit point. Some cards appear only after a related card is collected (for example, an instrument record after the traveler that names it).
3. **Notebook.** The learner classifies each card as Conforming, Nonconformity, Observation, or Need more evidence, and links it to a clause.
4. **Findings.** The learner writes findings, chooses an action plan (containment, correction, cause, corrective action, effectiveness check), and makes any decisions.
5. **Debrief.** Every planted issue and red herring is revealed, with the reasoning, the five measures, the skill map, margin notes, and a results code.

**No hard fail.** When visit points run out, the visit ends and the learner continues with the evidence gathered. Hints are always available, are logged, and never change a measure. There is no pass or fail score for a case.

**Case codes.** A case code has the form `<SECTOR>-<TYPE>-<SEED>`, for example `MFG-B-7K3Q`. Type X is the sector capstone. The same code produces the same case on any device. Seed `0000` of MFG-B is the worked example from the specification (The Shifted Batch), with four expected findings: 7.5.3, 7.1.5, 8.5.2, and 8.7.

## 2a. 2026 variant cases (optional, preliminary)

> **CAUTION: PRELIMINARY 2026 INFORMATION.** This section describes the 2026 edition of ISO 9001 using the best available secondary commentary and informed estimates. It has not been verified against the published standard and may contain errors, omissions, or incorrect clause references. Do not use it as a substitute for the standard in audit preparation, certification decisions, procedure revisions, or training records. Always consult the published ISO 9001:2026 text and your certification body.

Each sector has one 2026 variant of its Pressure Decision (Type F) case, centered on quality culture and speaking up. The case file carries `edition: "2026"` and `variantOf` (the Type F case it varies), and the case code uses the variant number, for example `MFG-F2-7K3Q`. The casebook shows the caution above on the sector track section that lists the variant, on every tab of the case folder, in the Case Room view when a variant is loaded, in the Results Reader when a variant code is pasted, and at the top of the saved findings and track record text.

- **Confidence labels.** Every 2026 statement carries a label: each evidence card's requirement link, each decision rationale, and each 2026 note in the brief. Labels are High, Medium, Single, Unclear, or Best estimate, consistent with `data/clause-map.json`. A best estimate states its reasoning and what to check in the standard.
- **What the variant teaches (as reported).** Top management promoting and demonstrating a quality culture and ethical behavior (5.1.1, High); awareness of culture and ethics (7.3, High); culture as an influence on the environment for operation of processes (7.1.4, Medium). Controls on nonconforming output and release are reported as carried forward in intent (Unclear). Clause tags use 2015 numbering from the clause map. No lettered sub-item within Clause 5 is cited, and no requirement wording is quoted.
- **Observations, not new audit criteria.** Silence after an earlier report and review minutes that never discuss concerns are planted as observations. Commentary says no separate culture program is required, so do not turn these into nonconformities against wording that has not been verified.
- **Excluded from the badge and the capstone.** Variant attempts are not counted toward "All six cases attempted", are never drawn into a capstone, and do not change the overall skill map or the recommended next case. Their results codes are listed separately in the track record.
- **Facilitation.** Run a variant in a Case Room only after the core Type F case, so learners compare the 2015 decision with the culture questions the variant adds. Keep discussion on fictional people; stop discussion that turns to real individuals. Ethics content is reviewed by Human Resources or Legal before delivery. **[OWNER INPUT]**
- **Verification.** Confirm each 2026 statement against the purchased ISO 9001:2026 text and update the confidence labels, or remove the variants, before any authoritative use. **[VERIFY]**

## 3. Running a Case Room (60 minutes)

### Before the session

1. Choose the sector and the case type. Open the casebook, select **Case Room facilitator view**, choose the case, and select **Make a new code for this case**. Write the code on the board.
2. Test the casebook on the projector and on one learner device. It runs offline from a folder or intranet share.
3. Print one Case Room record sheet (section 7) per learner or pair, for groups without devices.
4. Decide whether learners will enter names or initials for results codes. Results codes may carry a name only if the program owner allows it. **[OWNER INPUT]**

### Session plan

| Time | Activity | Facilitator notes |
|---|---|---|
| 0:00 to 0:05 | Introduce the sector and the case type; give the case code | State the goal for the case type. Remind learners that hints are free and there is no fail state |
| 0:05 to 0:30 | Learners investigate individually or in pairs | Start the timer in the facilitator view. Do not reveal the key. Answer questions about the tool, not about the evidence |
| 0:30 to 0:45 | Compare findings; reveal the coverage map | Collect results codes in the tally box. Reveal the answer key with one click |
| 0:45 to 0:55 | Discuss missed evidence, false findings, and the best actions | Use the tally to start with the issue found by the fewest learners |
| 0:55 to 1:00 | Reflection: one change to make at work | Ask each learner to name one record they will now check at their own workplace |

### Facilitator prompts

- What did you notice first?
- What made you look at that record?
- Which evidence looked suspicious but was conforming? Why did it conform?
- What system condition allowed the issue? What would stop it for anyone in that role?
- What would you check at your own workplace tomorrow?

### Other modes

| Mode | How to run it |
|---|---|
| Pairs | One learner investigates. The partner acts as the organization and reads the card for each action from the printed answer key (Case Room view, printed). Roles swap on the next case |
| Individual | Each learner plays alone and pastes the results code into a shared list or sends it to the instructor |
| Jigsaw | Teams take different case types in one sector, then each team presents its planted issues and system causes |
| Cross-sector | Teams from different sectors open **Compare two sectors**, choose the same clause, and present how the requirement appears in each sector. Then each team translates one finding into the other sector's language |

## 4. Measures and rubrics

The debrief shows five measures. Each is explained on screen. No measure is a pass mark.

| Measure | How it is calculated | What to discuss |
|---|---|---|
| Coverage | Planted issues found divided by planted issues present. An issue is found when one of its cards is classified as a nonconformity or observation, or cited in a finding | Where the learner looked and where they did not |
| Precision | Valid findings divided by findings submitted. Written findings and cards recorded as observations both count as submitted. A finding that cites only conforming cards is not valid | Over-reporting; why the red herrings conformed |
| Mapping accuracy | Correct clause links divided by links made in the Notebook | The difference between the broad topic and the specific requirement |
| Statement quality | Average rubric score per finding, 0 to 4 (rubric below) | Whether a person outside the visit would understand and accept the finding |
| Action soundness | Share of the five action elements chosen soundly. Only sound options score 1; a mix of sound and weak options scores 0.5; nothing sound scores 0 | Proportion; cause stated as a system condition; an effectiveness check with a time frame |

Decisions are reported separately, with the best-supported answer and its rationale, and feed the Judgment branch of the skill map.

### Finding statement rubric (0 to 4)

The casebook gives an automatic estimate. The instructor confirms it during review.

| Criterion | Scores 1 point when | Common gap |
|---|---|---|
| States the requirement | The clause chosen matches the evidence cited | Choosing a clause for the topic rather than the requirement |
| Cites specific evidence | The statement names the record, item, or reference number seen | "Records were poor" with no reference |
| Factual and neutral | No blame, opinion, or emphasis words; no exclamation marks | "The operator was careless" |
| Understandable | A complete sentence of 12 to 90 words with no placeholders left | Fragments; unfilled template brackets |

**Model finding (reference case).** "Caliper CAL-12 was used to measure batch 4417 although its calibration was overdue by 11 days, so the measurement results cannot be relied on." Requirement: 7.1.5. Evidence: card E4, with the traveler E1. This statement scores 4.

### Skill map

The skill map shows five branches: Evidence, Mapping, Cause, Control, and Judgment. Markers are Emerging (below 50 percent), Competent (50 to 79 percent), and Strong (80 percent or more), based on the latest attempt at each case. The casebook suggests the next case from the weakest branch. Use the skill map to plan coaching, not to grade.

## 5. Results codes and the Results Reader

At the end of each case the learner receives a results code, for example `MFG-B-7K3Q.1341J340M0A000ZF0F4.CG ~ J. Lee`. It encodes the case code, the five measures, the decision result, which planted issues were found, and the date, with two check characters that catch most typing errors. A name or initials after the `~` is optional.

Results codes are a training aid, not an assessment record. They are not tamper-proof. Paste codes into the Results Reader to see a table by learner, sector, case type, and measure, a summary by case code, and a tally of how many learners found each planted issue. The table can be saved as a CSV file for the training record. Nothing is sent over a network.

## 6. Badge review: Sector Practitioner

The badge is "Sector Practitioner: <sector>". The casebook shows a checklist, but it never awards the badge. A person decides.

### Completion criteria

1. Sector primer read.
2. Sector drills passed at 80 percent on the first try.
3. All six cases attempted.
4. The sector capstone attempted.
5. Reflection submitted.
6. Instructor review of the capstone findings, and preferably a short oral or on-the-job demonstration.

No score threshold decides the badge on its own. The aim is demonstrated understanding. A learner who repeats cases to improve is encouraged.

### Review procedure (about 20 minutes per learner)

1. Ask the learner for the track record text file (Save my track record as text) and the capstone findings file (Save my findings as text).
2. Paste the results codes into the Results Reader. Confirm that each case type and the capstone appear.
3. Read the capstone findings. For at least two findings, apply the statement rubric yourself.
4. Ask the learner to explain one finding: the requirement, the evidence, and the system cause.
5. Preferably, observe a short demonstration: the learner reviews one real record at their workplace and states whether it conforms and why.
6. Read the reflection.
7. Record the outcome.

### Review questions

- Which evidence would you look for first in this sector, and why?
- Show me one card you classified as conforming that looked suspicious. Why does it conform?
- State the cause of one issue as a system condition.
- What effectiveness check would show the corrective action worked, and when?
- In a pressure decision, who held the authority, and what did the customer agreement add?

### Training record

Record name, role, sector, cases completed, dates, instructor, and outcome (awarded, or further practice agreed). Retain as evidence of competence (Cl. 7.2). The system of record, who may award the badge, and the retention period are set by the program owner. **[OWNER INPUT]**

## 7. Printable Case Room record sheet

Use this sheet when learners have no device, or as a record for pairs. Copy it onto one page.

| Field | Entry |
|---|---|
| Learner or pair | |
| Case code | |
| Cards collected (number and area) | |
| Cards classified as nonconformity, with clause | |
| Cards classified as observation, with clause | |
| Cards judged conforming that looked suspicious | |
| Finding 1: requirement, evidence, statement | |
| Finding 2: requirement, evidence, statement | |
| Containment | |
| Correction | |
| Cause (system condition) | |
| Corrective action | |
| Effectiveness check (what, by whom, when) | |
| Decision and justification | |

The facilitator answer key for any case code can be printed from the Case Room view after **Reveal the answer key** is selected.

## 8. Model answers: primer check questions

Each primer ends with five questions that link it to the casebook. These model answers give the main points.

| Sector | Model answers |
|---|---|
| Discrete manufacturing | 1. The traveler (E1) names caliper CAL-12; the card is missed because the instrument number must be carried to the calibration cabinet. 2. A reminder addresses a person; the conditions were an untrialed insert change, no defined tool life, and no in-process edge check. 3. Will output still conform (trial with criteria)? Can we measure the effect (capability)? Are risks and documents updated, and people trained? Does the customer need notice? 4. The same conditions applied to the whole run, including deliveries to another customer. 5. A person with defined concession authority; the customer agreement requires written approval before shipping parts outside limits |
| Process, food, and consumer goods | 1. Missing lot codes on other batches the same day, the rework log, and mixed dispatch pallets. 2. The cause was master data, a software change, and an unchecked manual step; training was already current. 3. The food safety team; its review is a required step on the change form even though its content is outside this program. 4. A board-grade change notice was filed without review and receiving tests were skipped, so weaker cartons were used. 5. The result was due well inside the customer's delivery window; hold, escalate, and dispatch after the result |
| Electronics and semiconductor | 1. The merge record that dropped child lot identity, and the gauge that failed calibration after the lot ran. 2. All scratches were at one position on wafers from one slot, which points to the robot, not handling. 3. If anyone can edit a recipe, an approved change can be altered or bypassed. 4. The excursion affected every lot processed in that window, not only the reported lot. 5. Segregate the three wafers under material review and release the 22 conforming wafers |
| Construction and engineering | 1. Delivery tickets, the other pour from the same mix and day, and the curing tank log. 2. No one owned the interface between steel and concrete drawings, and pours went ahead before steel drawings were final. 3. A full supplier evaluation, design review, certificates for the specified product, client approval, method statement update, and training. 4. Defects found after handover must still be corrected; the contract and the system require it. 5. The supplier could move the pour to 1 p.m. at no cost, after the engineer's noon inspection |
| IT and software services | 1. Two builds shipped under one release name; scope follows the build number in each region. 2. Export tests ran after merge, had no owner, and covered two of nine formats. 3. It keeps peer review, testing, approval, and rollback; it can shorten timing and the number of reviewers. 4. Similar tickets closed as user error showed other affected customers. 5. Switching the feature off removes two defects from use and narrows the decision to the remaining one |
| Healthcare (management system only) | 1. The handover did not carry the task; a system change sent rejected requests to an unmonitored inbox, which affected other cases. 2. The gap came from a transfer screen added without the mandatory rule; reminders did not change the form. 3. The pending tasks section; removing content can remove a control. 4. The printer delivered one-sided packs and there was no receipt check. 5. Clinical decisions belong to the responsible clinician; the investigator makes sure the organization's process is followed and the right person decides |
| Logistics, warehousing, and distribution | 1. An unexplained stock adjustment, keyed picks, and a released weight variance; other pallets keyed in the same hour widened scope. 2. Labels for many pallets were printed onto one tray and picked by hand. 3. Otherwise picks use old locations between the physical move and the system update. 4. A location scan confirms the place, not the product; a look-alike in the wrong place passes. 5. Fetch the three cases from reserve within the driver's 30 minutes; otherwise authorize a short shipment and send notice |
| Professional, financial, and education | 1. The data source log named the superseded rate table; other engagements used the same model and table. 2. Summary figures were typed by hand and tables changed after review without re-review. 3. It produces results that the deliverable depends on; changes must be verified like an instrument. 4. Review was dated after the report was sent, so release came before review. 5. Send a clearly marked draft with the client's agreement, or send the reviewed final by 6 p.m. |

## 9. Points to confirm

1. The two sectors to pilot first and a sector subject-matter reviewer for each. **[OWNER INPUT]**
2. Whether results codes may include names, and how they will be collected. **[OWNER INPUT]**
3. Whether the track is offered to people outside the company. **[OWNER INPUT]**
4. Approval of the names "Sector Casebook" and "Sector Practitioner". **[OWNER INPUT]**
5. The placement check pass mark (80 percent by default, 7 of 8) and whether placement codes are kept with the training record. **[OWNER INPUT]**
6. The 2026 variant cases remain preliminary and excluded from badge scoring until each 2026 statement is verified. **[VERIFY]**
7. The clause emphasis table in each primer is an informed estimate and must be validated with the sector reviewer and, where possible, certification body data. **[VERIFY]**
