# Game Facilitation

*This material is an original training aid. It is not a substitute for the standard. Obtain ISO 9001 from ISO or a national standards body.*

This chapter explains how to run every classroom game in the {{COMPANY}} program. Each game has a purpose, a summary of players, time, and modules, a materials list, setup steps, a timed script, scoring, an instructor key, debrief questions with expected answers, and variants. Clause numbers follow ISO 9001:2015. Items marked **[OWNER INPUT]** need company information.

The printable kits are in `games/printables/`. Rebuild them after any change with `node tools/build-game-kits.js`. Add `--pack <id>` to use the wording of an industry pack (for example `--pack logistics`) and `--seed <number>` to generate a different week of traceability records. The generic pack and seed 12345 are the defaults.

## 1. Principles for every game

1. **Teach by consequence.** Let players feel the cost of a missing control, then name the clause.
2. **Compete on score, learn together.** Teams compete during play. The debrief is collaborative.
3. **Keep rounds short and results visible.** Post scores on a board or the projector after each round.
4. **Use the same data in print and on screen.** The digital games and the printables are built from the same files.
5. **End with a clause-mapping debrief.** Always ask: "Which requirement does this event relate to?"
6. **Keep it safe.** The organization is fictional. Assign no blame. Use a real incident only if the instructor decides to, and only after preparing it with quality.
7. **Link to the constraint.** Show, wherever it applies, that protecting the constraint with the right controls improves both throughput and quality. This connects the program to the Theory of Constraints factory game.

### General facilitation rules

- Read the timing aloud at the start and keep a visible timer.
- Give every team member a role. Rotate the spokesperson each round so that no one dominates.
- When a team is stuck, ask a question rather than giving the answer: "What record would show that?"
- Accept answers in the participant's own words when the key idea is correct.
- Collect the completed sheets. They are useful examples for later sessions and show participants that records matter.

## 2. Game selection by format

| Format | Recommended games |
|---|---|
| A: Operators, 3 hours | Quality Flow short form (6 rounds) or Workplace Evidence Hunt; Clause Sprint warm-up |
| B: Core, 6 hours | Document Control Relay, Root Cause Relay, Quality Flow (full, 12 rounds) |
| C: Full program, 2 days | All games except one chosen to fit the time; always include Audit Day and Management Review Boardroom |
| D: Micro-sessions | Clause Sprint (one 5-minute round), Workplace Evidence Hunt (a single checklist item), sector quiz exit ticket |

### Games at a glance

| Game | Players | Time | Modules | Main clauses | Materials |
|---|---|---|---|---|---|
| Quality Flow | 3 to 6 teams of 3 to 5 | 40 to 90 minutes | 2 to 7, 9, 10 | 6, 7, 8, 9, 10 | `games/quality-flow/index.html`; `quality-flow-<pack>.html` |
| Audit Day | Teams of 4 to 6 | 75 to 90 minutes | 8, 10 | 9.2 and all clauses | `games/audit-day/index.html`; `audit-day-dossier.html` |
| Clause Sprint | 2 to 6 teams | 20 to 30 minutes | Any | 4 to 10 | `games/quiz/index.html`; `clause-sprint-cards.html` |
| Root Cause Relay | Teams of 4 to 5 | 30 to 40 minutes | 9 | 10.2 | `root-cause-relay.html` |
| Document Control Relay | Teams of 5 to 6 | 25 to 30 minutes | 4 | 7.5 | `document-control-relay.html` |
| Traceability Challenge | Teams of 3 to 5 | 30 to 40 minutes | 6, 7 | 8.5.2, 8.7 | `traceability-challenge.html` |
| Management Review Boardroom | Teams of 4 to 6 | 45 to 60 minutes | 2, 3, 8, 9 | 9.3 | `management-review-boardroom.html` |
| Workplace Evidence Hunt | Pairs | 20 to 30 minutes | 4, 6, 7 | 7.1.5, 7.5.3, 8.5.2, 8.7 | `workplace-evidence-hunt.html` |
| Change Control Challenge | Teams of 4 | 30 minutes | 3, 6 | 6.3, 8.5.6 | `change-control-challenge.html` |

## 3. Quality Flow (summary)

**Purpose.** Show that quality controls cost resources but prevent larger losses, and connect events to clauses through nonconformance, containment, corrective action, and audit.

**At a glance.** Three to six teams of three to five. Twelve rounds take 60 to 90 minutes; six rounds take about 40 minutes. Modules 2 to 7, 9, and 10.

**How to run it.** Use the digital game at `games/quality-flow/index.html`. The setup screen, round controller, team view, scoring, mock audit, and mandatory debrief are built in, and the README explains each step. If the digital game fails, print `quality-flow-<pack>.html` and run the same game with two dice; the facilitator key in that file gives the event order for the seed.

**Script outline.**

| Minute (12 rounds) | Step |
|---|---|
| 0 to 5 | Explain the workflow, the constraint, Quality Points, and scoring. Show the control cards. |
| 5 to 70 | Run the rounds: invest (2 minutes), reveal the event, process, disposition, score. Every third round, teams that own corrective action choose a past event. |
| 70 to 75 | Final audit and quality cost display. |
| 75 to 90 | Debrief. |

**Debrief questions (mandatory) with expected answers.**

1. *Which control had the largest effect on your score? Which clause does it relate to?* Usually final release criteria (8.6), measuring resource control (7.1.5), or the in-process check at the constraint (8.1, 8.6). Accept any answer backed by the team log.
2. *Which event caught you without a mitigating control? What did it cost?* Teams name the event and quote the revenue or reputation lost from their tracking sheet.
3. *Was checking at the constraint a good investment? Why?* Yes in most runs. A defect found at the constraint stops wasted capacity and expensive escapes.
4. *What did you do when under pressure to deliver?* Strong answers: held the work item and used release authorization (8.6, 8.7). Discuss any team that yielded.
5. *Which records would you show an auditor? Which were missing?* The disposition sheet and log; missing records lost audit points.
6. *How does this compare with the factory game on the Theory of Constraints?* Both show that protecting the constraint protects the whole system's output.
7. *(Mixed-sector groups) Which controls looked different in your sector, and which looked identical?* The wording changes; the control and the clause do not.

**Variants.** Constraint focus, budget shock, silent audit, supervisor edition, and cross-sector swap. Set them in the configuration box (see the README).

## 4. Audit Day (summary)

**Purpose.** Practice an internal audit from both sides: planning a sample, gathering evidence, writing findings, and responding as an auditee.

**At a glance.** Teams of four to six. 75 to 90 minutes. Modules 8 and 10, drawing on all clauses.

**Materials.** A mini-organization dossier for each team, prepared by the instructor from the selected pack: a quality policy, an objectives chart, three work instructions (one outdated), a calibration or verification log (one item overdue), a training matrix (with gaps), two completed work item records (one missing a sign-off), a nonconformance log (one entry open past its due date), an approved provider list (one provider not approved), and an internal audit schedule (one audit skipped). Add an observer checklist and a findings form. Use the digital version in `games/audit-day/index.html` or the printed dossier, finding forms, observer checklist, scoring sheet, and answer key in `games/printables/audit-day-dossier.html`. Where the printed answer key differs from the summary below, follow the printed key, because it matches the dossier. **[OWNER INPUT]** Real procedures may be substituted where permitted.

**Roles.** Lead auditor (plans the sample, leads questions, writes findings). Auditors (gather evidence by interview and record review). Auditees (answer using the dossier only; they may not invent evidence). Observer (scores audit technique: open questions, evidence over opinion, impartiality, clear finding statements).

**Script.**

| Minute | Step |
|---|---|
| 0 to 10 | Planning: each audit team chooses three processes to sample and writes its questions. |
| 10 to 35 | Evidence gathering by interview and record review. |
| 35 to 50 | Findings: each finding states the requirement, the evidence, and the category (major, minor, observation). |
| 50 to 60 | Closing meeting: present findings; auditees ask clarifying questions. |
| 60 to 75 | Corrective action planning: auditees draft correction, cause, corrective action, and effectiveness check. |
| 75 to 90 | Debrief. |

**Scoring.** One point for each planted nonconformity found with the correct clause. One bonus point for each finding worded with requirement, evidence, and gap. Minus one for each unsupported finding. Observer scores are added to the team total.

**Instructor key.** The seven planted items and their clauses: outdated instruction (7.5.3), overdue calibration (7.1.5), training gaps (7.2), missing sign-off (8.6 or 7.5.3), overdue nonconformance (8.7, 10.2), unapproved provider (8.4), skipped audit (9.2). The policy and objectives chart conform; teams that report them as nonconformities without evidence lose the point.

**Debrief questions with expected answers.**

1. *Which findings were easiest or hardest to detect?* Missing signatures and overdue dates are easy. The skipped audit and the unapproved provider need a comparison between two records, so they are harder.
2. *How should an auditee respond?* Answer the question asked, show the record, say "I do not know, but I can find out" when needed, and never invent evidence.
3. *What distinguishes a finding from an observation?* A finding is a demonstrated failure to meet a requirement, supported by evidence. An observation notes a weakness or a risk that is not yet a nonconformity.

**Variants.** Run a conforming dossier for one team to practice not over-reporting. Use the audit response card from the handouts for a five-minute interview drill.

## 5. Clause Sprint

**Purpose.** Recall the structure of the standard quickly and link everyday situations to the right clause and the right immediate action.

**At a glance.** Two to six teams. 20 to 30 minutes, or one 5-minute round in a micro-session. Any module; best as a warm-up or review.

**Materials.** The digital version in `games/quiz/index.html` (Clause Sprint mode, with timer and scores), or `clause-sprint-cards.html`: one set of clause cards (4 to 10) per team, scenario cards for the facilitator, and the scenario key.

**Setup.** Give each team a set of clause cards. Place the score table on the projector or a whiteboard. Choose the number of scenarios: about eight per round.

**Script.**

| Minute | Step |
|---|---|
| 0 to 3 | Explain the rules. Teams raise one clause card per scenario. The first correct team scores. |
| 3 to 10 | Round 1, clause level: the facilitator reads a scenario; teams raise the clause card (4 to 10). |
| 10 to 18 | Round 2, sub-clause level (technicians and supervisors): teams also call the sub-clause. |
| 18 to 25 | Round 3, "fix it": teams raise the clause and state the immediate action. |
| 25 to 30 | Debrief. |

**Scoring.** One point for each correct match. One bonus point for the first correct team that also states the right action. In Round 2, accept the sub-clause in the key or any sub-clause that clearly applies; explain the difference.

**Instructor key.** Use the scenario key printed with the cards, or the answer shown by the digital game. Common confusions to resolve: 7.1.5 (measuring resources) versus 8.6 (release); 8.7 (nonconforming output) versus 10.2 (corrective action); 7.5.3 (document control) versus 8.5.1 (controlled conditions).

**Debrief questions with expected answers.**

1. *Which clause was hardest to identify?* Usually Clause 6 or Clause 9, because their activities happen away from the workstation.
2. *Why does the immediate action matter more than the clause number?* The customer is protected by the action (stop, hold, report). The clause helps explain why the action is required.
3. *Which scenario could fit two clauses?* Many do; for example, an unapproved provider (8.4) whose input reaches production (8.5). Discuss why the key chose one.

**Variants.** Individual play with mini whiteboards. A sector round using pack scenarios. A reverse round: the facilitator names a clause and teams give a workplace example.

## 6. Root Cause Relay

**Purpose.** Practice finding a system cause rather than blaming a person, rejecting irrelevant evidence, and writing a corrective action with a measurable effectiveness check.

**At a glance.** Teams of four to five. 30 to 40 minutes. Module 9 (Clause 10.2).

**Materials.** From `root-cause-relay.html`: four problem cards (P1 repeat defect at the constraint, P2 wrong identification, P3 rejected input used, P4 release before final check), six evidence cards per problem (four relevant, two red herrings), a why-chain sheet, a fishbone sheet, a scoring sheet, and an instructor key for each problem. Each team needs one problem card, one why-chain sheet, one fishbone sheet, and pens.

**Setup.** Cut the problem and evidence cards. Keep the evidence cards for each problem in a separate envelope in card-number order. Decide whether each team gets a different problem (variety) or all teams get the same one (comparison). Print one scoring sheet for the facilitator.

**Script.**

| Minute | Step |
|---|---|
| 0 to 3 | Read the problem card aloud. Explain the relay: each member in turn adds one "why" and one "because" to the sheet and initials it. The because must be a fact. |
| 3 | Inject evidence cards 1 and 2. |
| 8 | Inject evidence cards 3 and 4. |
| 13 | Inject evidence cards 5 and 6. |
| 13 to 20 | Complete the why chain. Record any evidence the team rejects and the reason. |
| 20 to 27 | Build the fishbone across six categories. Circle one root cause. |
| 27 to 32 | Write the correction, the corrective action, and the effectiveness check. |
| 32 to 40 | Score and debrief. |

**Facilitator prompts.** If a chain ends at "the operator made a mistake", ask: "Why was the mistake possible, and why was it not detected?" If a team accepts a red herring, ask: "Does that explain the timing? Did the problem happen without it?"

**Scoring (maximum 12).** Depth of the causal chain: one point per valid why, up to five. Correct rejection of each red herring with a reason: one point each, up to two. Corrective action addresses the cause rather than the symptom: three points. Effectiveness check measurable: two points. An action that only retrains or reminds people scores zero for the cause criterion unless it also changes a method, a check, or the system.

**Instructor key.** Each problem has a printed key with the card status, a model why chain, the root cause, the corrective action, and the effectiveness check. Model for P1: the setting value and tolerance are not defined in the controlled instruction, and no verification is required after a set-up change. The red herrings are the repainting of the area and the person returning from leave (the defect also occurred when that person was absent).

**Debrief questions with expected answers.**

1. *Why is "operator error" a weak conclusion?* It names a person, not a cause. It does not explain why the system allowed the error or why it was not caught, so retraining alone rarely prevents recurrence.
2. *What changed in the system after your corrective action?* A concrete change to an instruction, a check, a system block, or a resource. Reminders alone do not change the system.
3. *How did you recognize a red herring?* It did not explain the pattern or the timing, or the problem occurred without it.
4. *What is the difference between the correction and the corrective action?* The correction deals with the affected work items now. The corrective action removes the cause so the problem does not recur (Clause 10.2).
5. *How will you know the action worked?* A measurable check over a stated period or sample, reviewed by a named person before closure.

**Variants.** Use a real, closed nonconformance with names removed (with quality's agreement). Give one team a problem with no red herrings and compare chain depth. For supervisors, add a step: decide whether the issue must be reported to the customer.

## 7. Document Control Relay

**Purpose.** Show how uncontrolled copies arise when a revision reaches only part of a team, and why a revision log and withdrawal of old copies protect output.

**At a glance.** Teams of five to six. 25 to 30 minutes. Module 4 (Clause 7.5).

**Materials.** From `document-control-relay.html`: work instruction WI-DC-01 revision A (one copy per member), revision B and a revision notice (two copies per team, held by the facilitator), the team revision log and copy register, twelve data slips per team, twelve blank record cards per team, an instructor key, and a scoring sheet. Each team also needs an outbox (an envelope or tray) and pens.

**The task.** Each member takes a data slip and completes a work item record card exactly as the instruction says. Revision B changes five steps: the date format, the quantity in figures and words, the Remarks content for a failed result, a second-person verification, and no folding.

**Setup.** Cut the data slips. Place on each table the revision A copies, the slips, the cards, the revision log, and the outbox. Do not mention that a revision will be issued. Write the exercise date (5 October 2026) on the board.

**Script.**

| Minute | Step |
|---|---|
| 0 to 3 | Brief the task. Teams may organize themselves as they wish. |
| 3 to 10 | Teams complete cards to revision A. |
| 10 | Quietly hand revision B and the revision notice to two members of each team only. Write the time of issue on the notice. Say nothing to the rest. |
| 10 to 18 | Teams continue. Observe whether the two members tell the others, record the revision in the log, and remove revision A copies. |
| 18 | Stop. Collect the outbox, the revision log, and every copy of the instruction from each table. |
| 18 to 30 | Score and debrief. |

**Scoring.** Two points for each card fully correct for the revision in force at the time written on it. Minus one for each card completed after the issue time to revision A. Three points for a revision log entry for revision B. Three points if every revision A copy has been withdrawn or marked obsolete. Time bonus of three, two, and one point for the first three teams to finish all twelve cards.

**Instructor key.** The printed key lists the expected card for each slip under both revisions. A value equal to the limit is within the limit (PASS). Slips 9 (4.95 against 5.0) and 12 (5.0 against 5.0) test careful reading.

**Debrief questions with expected answers.**

1. *Where were the uncontrolled copies?* With the members who never saw the notice, and in any revision A copy left on the table at the end.
2. *How would this occur on the floor?* Printed copies kept at a workstation, personal notes, downloaded files, or a change briefed to one shift only. Clause 7.5.3 expects the current version at the point of use and protection against unintended use of obsolete documents.
3. *What did the revision log give your team?* A record of what changed, when, and who received it, so anyone can confirm they hold the current revision.
4. *What is the cost?* Mixed output that must be checked and corrected, held work, possible escapes, and lost time.

**Variants.** Use a paper box folding task instead of the form (write your own revision A and revision B with one changed fold). Issue the revision verbally only, then discuss the result. For technicians, add a third revision that withdraws a step.

## 8. Traceability Challenge

**Purpose.** Practice tracing backward from a failing work item and forward from a suspect input, and show how record gaps enlarge a recall.

**At a glance.** Teams of three to five. 30 to 40 minutes. Modules 6 and 7 (Clauses 8.5.2 and 8.7).

**Materials.** From `traceability-challenge.html`: a facilitator sheet, a work item register for one week (three pages, two lines, two shifts a day), an input batch issue log, an equipment and system log, a staff initials list, a complaint card with a containment worksheet, and a facilitator key. The records are generated from a seed. The key is derived from the same printed records, so always print the records and the key from the same build.

**Setup.** Print one set of records per team. Keep the complaint card face down until minute 5. Write the rule on the board: *A work item may be left out of the containment list only if a record shows that it used a different input batch.*

**Script.**

| Minute | Step |
|---|---|
| 0 to 5 | Teams read the records. Explain that these are all the records available. |
| 5 | Issue the complaint card. Start the clock. |
| 5 to 10 | Backward trace: date, shift, line, input batch, people, and delivery note of the failing work item. |
| 10 to 25 | Forward trace: every work item that used the suspect batch, or that cannot be shown to have used a different one, and where each is now. |
| 25 | Teams hand in the worksheet. Record the finishing time. |
| 25 to 40 | Score and debrief. |

**Scoring.** Plus two for each work item on the key that is on the team list. Minus one for each item on the list that is not on the key (unnecessary recall). Plus one for each correct action: notify the customer and recall a delivered item, or hold an item still in house. Plus three for a complete backward trace. Speed bonus of three, two, and one for the first three correct lists.

**Instructor key.** The key lists every work item to contain, its location, the basis (batch recorded, issue log, or no record), and the action. It also names the items that are on the list only because of record gaps and shows which batch they used in fact. Three features are built into every seed: the suspect batch was split across both lines, some batch fields are blank, and one issue log entry is missing. The planned maintenance entry in the equipment log is a red herring.

**Debrief questions with expected answers.**

1. *What record gaps expanded the recall?* The blank batch fields and the missing issue log entry. Without them the team cannot prove that a work item used a different batch.
2. *What does this imply for the floor?* Complete identification fields at the time of the activity, every time (Clauses 8.5.2 and 7.5). A blank field costs far more later than it saves now.
3. *Why did some teams miss part of the list?* They traced only the line shown on the complaint record. Forward tracing must follow the input, not the line.
4. *Who decides to notify the customer?* The person authorized by the company procedure, without delay. **[OWNER INPUT]** Clause 8.7 also covers nonconforming outputs found after delivery.

**Variants.** Rebuild with another seed for a second round (`--seed 777`), or with a pack's wording (`--pack process-food`). Give one team a complete set of records (fill in the blanks from the key) and compare the size of the recall. For operators, run only the backward trace.

## 9. Management Review Boardroom

**Purpose.** Let supervisors act as top management: read performance data, decide on improvement, changes, and resources, and record actions with owners and dates.

**At a glance.** Teams of four to six. 45 to 60 minutes. Modules 2, 3, 8, and 9 (Clause 9.3). Intended for supervisors.

**Materials.** From `management-review-boardroom.html`: a four-page data packet (objective trends, complaint summary, changes in context, internal audit results, external provider performance, risk and opportunity register, resource requests, and the status of previous actions), role cards, a two-page minutes template, a scoring checklist, and a facilitator key.

**Setup.** Print one packet per member or per pair, one minutes template per team, and one scoring checklist per team. Cut the role cards. Tell teams that the budget for this review is 15,000 units.

**Script.**

| Minute | Step |
|---|---|
| 0 to 5 | Brief: the team is top management. The meeting must reach decisions and record them. Hand out role cards. |
| 5 to 15 | Members read the packet. Each prepares one point from the area on the role card. |
| 15 to 45 | The review meeting. The chair keeps time. The quality coordinator writes the minutes. |
| 45 to 50 | Hand in the minutes. Score with the checklist. |
| 50 to 60 | Debrief. Compare the decisions of each team. |

**Scoring (maximum 27).** Inputs considered (up to 10), outputs recorded (up to 3), decision quality (up to 8: resources matched to risk and within budget), and action quality (up to 6: owner, date, and a measure of success).

**Instructor key.** Strong teams identify that complaints are rising, mainly because of provider P-03; that delivery is falling while the constraint depends on one qualified person before a volume increase and two retirements; and that control gaps exist (an overdue action, an action closed without an effectiveness check, a skipped audit, a provider used before evaluation). The model resource decision approves the competence request for the constraint, the measuring device replacement, and the second-source evaluation (12,500 units), and defers the customer portal and the furniture with a stated reason.

**Debrief questions with expected answers.**

1. *Which data changed your decision?* Usually the link between P-03 and the complaints, and the single qualified person at the constraint. Strong teams cite the data behind each decision.
2. *Which decisions had no owner or date?* Compare action tables. An action without an owner or a date is rarely completed and gives an auditor nothing to verify (Clause 9.3.3).
3. *Why fund competence at the constraint first?* The constraint limits the output of the whole system; losing its only qualified person stops delivery.
4. *What would an auditor look for in the minutes?* Evidence that the required inputs were considered, and outputs that cover improvement, changes to the QMS, and resources, followed up at the next review.

**Variants.** Reduce the budget to 8,000 units to force harder choices. Add a late item at minute 30 (for example, a new complaint) to test how the team adapts. Run with the supervisor edition of Quality Flow, using the team's own game data as the packet.

## 10. Workplace Evidence Hunt

**Purpose.** Show operators and technicians what evidence of a working QMS looks like at their own workplace, and practice recording gaps as facts without blame.

**At a glance.** Pairs. 20 to 30 minutes. Modules 4, 6, and 7. Operators and technicians.

**Safety rule.** Participants observe only. They do not touch equipment, open systems, or enter restricted zones.

**Materials.** From `workplace-evidence-hunt.html`: a facilitator sheet with an area assignment table, the 15-item evidence checklist (one per pair), a page of what to look for by role, sector notes for each industry pack, a group report-back sheet, and the debrief. Each pair needs a clipboard and a pen.

**Setup.** Agree areas and times with each area supervisor in advance. Record the approval on the assignment table. For digital areas, arrange for the system owner to show the screens. Assign each pair an area and, for short sessions, a subset of items. Operators focus on items 1, 3, 4, 5, 7, 8, 12, 13, and 15.

**Script.**

| Minute | Step |
|---|---|
| 0 to 3 | Read the safety rule aloud. Assign areas and items. Remind pairs to record facts, not names. |
| 3 to 18 | Pairs observe and record evidence of conformity and any gaps. |
| 18 to 25 | Pairs report back. The group sorts gaps by clause on the report-back sheet. |
| 25 to 30 | The group selects two gaps for immediate improvement, with an owner and a date for each. |

**Scoring (optional).** One point for each item with specific evidence recorded (what and where), and one point for each gap stated as a fact without blame. The aim is accurate observation, not a high number of gaps.

**Instructor key.** There is no fixed answer; the evidence depends on the area. Check each entry for specificity. A good entry: "Instruction at station 3 shows revision C; the document system shows revision D (7.5.3)." A weak entry: "Documents not good."

**Debrief questions with expected answers.**

1. *Which items had clear evidence of conformity?* Accept specific evidence such as a label, a revision number, or a record entry. Recognize good practice first.
2. *Which gaps were found most often, and which clause do they relate to?* Typical groups are document currency (7.5.3), measuring status (7.1.5), and identification and hold status (8.5.2, 8.7).
3. *How did you record a gap without blame?* By stating what was seen and where, not who was responsible.
4. *Why select only two gaps?* Two actions with owners and dates are more likely to be completed. The rest go to the area supervisor through the normal process.

**Variants.** In a micro-session, check a single item across the whole site. Run a digital-only hunt for office or IT teams. Repeat the hunt after three months as part of the effectiveness review.

## 11. Change Control Challenge

**Purpose.** Recognize changes that need review, name who approves them, and decide what verification and records are needed, including a change that looks minor but affects the constraint.

**At a glance.** Teams of four. 30 minutes. Modules 3 and 6 (Clauses 6.3 and 8.5.6).

**Materials.** From `change-control-challenge.html`: a facilitator sheet, a page of five change cards for each industry pack, a decision sheet, and an instructor key for each pack. Each pack's set covers a new external provider, a process setting, a measuring tool or software version, a template or label, and a handoff method, with one of them replaced by the trap.

**Setup.** Choose the pack that matches the group (the generic pack by default). Cut one set of five cards per team. Do not tell teams which stage is the constraint until the debrief.

**Script.**

| Minute | Step |
|---|---|
| 0 to 3 | Brief: for each change, decide whether it needs review, who approves, what verification is needed before use, and what records are kept. |
| 3 to 20 | Teams complete the decision sheet, about three minutes per change. |
| 20 to 25 | Score against the pack key. |
| 25 to 30 | Debrief. Reveal the trap and the constraint. |

**Scoring (maximum 22).** For each change, one point each for a correct review decision, an appropriate approver, specific verification before use, and named records. Two points for identifying the trap with the reason.

**Instructor key.** Every change in the set needs some form of review. The printed key gives an approver, the verification, and the records for each change, and a short explanation of the trap. Example (generic pack): shortening the set-up step at the Core process "as housekeeping" can raise the defect rate at the constraint, where lost capacity cannot be recovered. Accept equivalent approvers and records that match the {{COMPANY}} change procedure. **[OWNER INPUT]**

**Debrief questions with expected answers.**

1. *Which unreviewed changes caused unexpected results?* Changes described as minor, such as the trap, and informal methods that leave no record. Quality Flow event E06 shows the same effect.
2. *Who owns the decision?* The process owner, with the people the change procedure names (quality, purchasing, engineering, or the customer where required). The person proposing a change does not approve it alone.
3. *Why does a change at the constraint matter more?* The constraint sets the output of the whole workflow. Time or quality lost there cannot be recovered elsewhere.
4. *What is the minimum record for a change?* What changed, why, the review result, who authorized it, and the verification before use (Clause 8.5.6).

**Variants.** Mixed-sector groups: give each team a different pack and compare the keys to show that the controls are the same. Ask supervisors to write a one-paragraph change request for the trap. Link to Quality Flow by replaying a round with event E06 and control C06.
