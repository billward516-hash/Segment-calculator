# Sector Primer: Electronics and Semiconductor

*This material is an original training aid. It is not a substitute for the standard. Obtain ISO 9001 from ISO or a national standards body.*

> **Status:** verifyStatus2015: unverified. Clause references use ISO 9001:2015 numbering and were written from general knowledge of the standard. Confirm them against the purchased standard. **[VERIFY]**

This primer is part of the optional Industry Deep-Dive Track. It assumes the core modules and the neutral terms used there (work item, output, measuring and monitoring resource, point of use, hold, customer property). It shows how the same requirements appear in electronics and semiconductor manufacturing. Sector content never changes what a requirement means. The fictional organization used throughout is Meridian Microworks. 

**How to use this primer.** Read it before or after the Electronics and semiconductor cases in the Sector Casebook (case codes start with **ELX**). Each section ends where a Casebook case begins: records you will review, people you will ask, and nonconformities you may find. Allow 30 to 40 minutes.

## 1. The sector at a glance

Electronics and semiconductor work processes wafers, boards, or components in lots through cleanroom steps such as polishing, cleaning, and inspection. Quality depends on controlled environments, capable measurement at very small tolerances, lot identity through splits and merges, protection of customer-supplied wafers, and controlled recipes and process changes.

**Process map (Meridian Microworks).** Incoming inspection → Preparation or film strip → Polish or main process → Final clean → Final inspection → Pack and ship. The work item is the **lot**. The constraint stage, where work most often queues, is polish or main process.

| Stage | Typical inputs | Typical outputs | Typical owner |
|---|---|---|---|
| 1. Incoming inspection | Customer wafers, chemicals, consumables, certificates | Accepted lots and materials | Incoming inspector |
| 2. Preparation or film strip | Accepted wafers, film strip recipe, chemicals | Prepared lots | Process technician |
| 3. Polish or main process | Prepared lots, polish recipe, pads, slurry | Polished lots with tool logs | Polish engineer |
| 4. Final clean | Polished lots, clean chemistry, carriers | Cleaned lots | Clean technician |
| 5. Final inspection | Cleaned lots, thickness and particle gauges, sampling plan | Released or held lots | Metrology and quality |
| 6. Pack and ship | Released lots, customer packaging, shipping documents | Shipped lots with genealogy | Shipping lead |

Lot genealogy records every split, merge, tool, and gauge. It is the first record to read in a records trail.

## 2. Where the clauses show up

The table gives one sector-specific example for each clause group. The wording is an original summary, not text from the standard.

| Clause | In electronics and semiconductor manufacturing |
|---|---|
| 4 Context | The scope names cleanroom processes, customer-supplied material handling, and outsourced metrology. |
| 5 Leadership | Leaders keep month-end targets from overriding material review and release. |
| 6 Planning | Process risks such as pressure or chemistry changes are assessed; objectives cover yield and escapes. |
| 7 Support | Cleanroom conditions, gauge calibration and capability, current instructions, and qualified technicians. |
| 8 Operation | Customer specifications reviewed, chemicals verified, recipes controlled, lots traced, customer wafers protected, release by sampling plan. |
| 9 Performance evaluation | Excursions, yields, and customer returns are analyzed; audits cover each bay. |
| 10 Improvement | Recurring defects such as scratches are traced to equipment and change control. |

**The five clauses that most often matter in this sector.** This list is an informed estimate from general knowledge of the sector, not data from audit results. Validate it with a sector subject-matter reviewer and, where possible, with nonconformity data from the certification body. **[VERIFY]**

1. **7.1.4 Environment for the operation of processes.** Cleanroom classification, particles, and electrostatic controls.
2. **7.1.5 Monitoring and measuring resources.** Thickness gauges, particle counters, and optical tools at fine tolerances.
3. **8.5.2 Identification and traceability.** Lot identity through splits, merges, and rework.
4. **8.5.3 Property belonging to customers.** Customer wafers, carriers, and masks.
5. **8.5.6 Control of changes.** Recipe and process changes, including supplier part substitutions.

## 3. Records an auditor typically asks for

Records are listed by clause in the vocabulary of the sector. Retention periods and the system of record are set by the organization. **[OWNER INPUT]**

- **7.1.4:** particle monitor logs, alarm responses, filter maintenance
- **7.1.5:** calibration records, capability studies, look-back reviews
- **7.2:** qualification matrix
- **7.5.3:** instruction revisions, recipe version history
- **8.2:** customer specifications and change notice terms
- **8.4:** chemical certificates, supplier change notices
- **8.5.1:** tool logs, pad change records, recipe settings
- **8.5.2:** lot histories, split and merge records
- **8.5.3:** customer wafer register
- **8.5.6:** engineering change notices
- **8.6:** outgoing inspection and sampling records
- **8.7 and 10.2:** hold records, material review, corrective actions

## 4. Typical nonconformities and their usual causes

Each likely cause is a system condition, not a person. When a cause names a person ("careless", "forgot"), ask what in the system allowed the event and what would prevent it for anyone in that role.

| No. | Nonconformity | Clause | Likely root cause (system condition) | Preventive control |
|---|---|---|---|---|
| 1 | Particle alarm with no response recorded | 7.1.4 | Alarms can be muted without a response | Response required before mute |
| 2 | Gauge past calibration in use | 7.1.5 | No due-date alert | Alerts and pre-use checks |
| 3 | No look-back after a gauge failed calibration | 7.1.5 | Procedure has no look-back step | Automatic look-back |
| 4 | Hand-written lot number after an unrecorded split | 8.5.2 | Splits can be done outside the system | System-enforced splits |
| 5 | Merged lot loses child identity | 8.5.2 | Merge function drops genealogy | Block identity loss in merges |
| 6 | Two customers' wafers staged together | 8.5.3 | No staging rule | Separate, labeled staging |
| 7 | Obsolete instruction at a station | 7.5.3 | Revisions not pushed to stations | Controlled point-of-use issue |
| 8 | Recipe edited by operators without approval | 8.5.6 | Recipe system allows edits | Approval enforced in the system |
| 9 | Cheaper part substituted without trial | 8.5.6 | Substitutions not routed to change control | Change review for substitutions |
| 10 | Release sampling not tightened after an excursion | 8.6 | Sampling plan has no triggers | Excursion trigger in sampling plan |
| 11 | Recurring scratch closed as handling | 10.2 | Cause not tested against data | Pattern analysis before closure |

## 5. Sector specifics

### Customer property

Customer property includes customer-supplied wafers or components, carriers, customer specifications, and masks. Keep each customer's material identified and separate, record it, and report loss or damage.

### External providers

Chemicals and consumables suppliers, spare parts suppliers, calibration services, and external metrology laboratories. A part substitution or chemical change is a change to review.

### Measuring and monitoring resources

Thickness gauges, flatness gauges, particle counters, and optical inspection tools. At fine tolerances, capability matters as much as calibration.

### Work environment

Cleanroom classification, particle levels, temperature and humidity, electrostatic discharge controls, and gowning. These are part of the conditions for conformity; respond to and record excursions.

## 6. Sector vocabulary

| Term | Meaning in this primer |
|---|---|
| Lot | A group of wafers or units processed together; the work item |
| Child lot | A lot created by splitting another |
| Merge | Combining lots |
| Genealogy | The full history of a lot, including splits and merges |
| Wafer | A thin slice of semiconductor material |
| Carrier | A container that holds wafers |
| Cassette slot | A position in a carrier |
| Recipe | The controlled set of process settings for a tool |
| Polish | A process that makes the wafer flat and smooth |
| Pad | A consumable used in polishing |
| Slurry | An abrasive liquid used in polishing |
| Cleanroom | An area where particles are controlled |
| Particle excursion | Particle counts above the action limit |
| Gowning | Putting on cleanroom clothing |
| ESD | Electrostatic discharge; a sudden flow of static electricity |
| Metrology | Measurement |
| Capability study | A study of whether a process or gauge meets the tolerance |
| Engineering change notice | The record that requests and approves a change |
| Material review | The process that decides what to do with nonconforming material |
| End effector | The part of a robot that holds the wafer |
| Sampling plan | Rules for how many items to check |
| Month-end | The close of a reporting month, often a source of pressure |

## 7. Sector schemes and local rules

Electronics firms may work under automotive, aerospace, or medical device schemes, and environmental or product compliance rules. These are not taught here. This program covers the ISO 9001 quality management system only. Where a scheme or legal requirement applies, the organization remains responsible for it; consult the certification body and the relevant authority. **[VERIFY]**

## 8. Further reading

A reading list for this sector is to be supplied by the program owner or a sector subject-matter reviewer. **[OWNER INPUT]**

- Internal procedures of {{COMPANY}} that apply to this sector. **[OWNER INPUT]**
- Guidance published by the certification body. **[OWNER INPUT]**
- Sector scheme documents, where the organization operates under one. **[OWNER INPUT]**

## 9. Check your understanding

Each question links this primer to a Casebook case. Model answers are in the instructor guide chapter on the Sector Deep-Dive Track.

1. In *Lot Genealogy* (ELX-B), which two records widened the scope beyond the reported lot?
2. In *The Repeating Scratch* (ELX-C), what did the scratch position tell you about the cause?
3. In *The Pressure Recipe* (ELX-D), why does recipe access control belong in a change review?
4. In *The Particle Report* (ELX-E), why did containment follow a time window?
5. In *The Month-End Lot* (ELX-F), how could conforming wafers still ship by month-end?

---

*Fictional organization. Examples are illustrative. Sector-specific legal, clinical, safety, and food safety requirements are outside this program.*
