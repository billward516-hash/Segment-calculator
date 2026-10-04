# Sector Primer: Discrete Manufacturing

*This material is an original training aid. It is not a substitute for the standard. Obtain ISO 9001 from ISO or a national standards body.*

> **Status:** verifyStatus2015: unverified. Clause references use ISO 9001:2015 numbering and were written from general knowledge of the standard. Confirm them against the purchased standard. **[VERIFY]**

This primer is part of the optional Industry Deep-Dive Track. It assumes the core modules and the neutral terms used there (work item, output, measuring and monitoring resource, point of use, hold, customer property). It shows how the same requirements appear in discrete manufacturing. Sector content never changes what a requirement means. The fictional organization used throughout is Meridian Works. 

**How to use this primer.** Read it before or after the Discrete manufacturing cases in the Sector Casebook (case codes start with **MFG**). Each section ends where a Casebook case begins: records you will review, people you will ask, and nonconformities you may find. Allow 30 to 40 minutes.

## 1. The sector at a glance

Discrete manufacturing makes countable items: brackets, shafts, housings, assemblies. Work moves in batches or job orders through receiving, machining, assembly, test, inspection, and dispatch. Quality depends on the right drawing at the machine, measurements that can be trusted, materials that stay identified, and changes that are reviewed before they reach the shop floor.

**Process map (Meridian Works).** Receiving inspection → Cutting and machining → Assembly → Finishing and test → Final inspection → Pack and ship. The work item is the **batch**. The constraint stage, where work most often queues, is assembly.

| Stage | Typical inputs | Typical outputs | Typical owner |
|---|---|---|---|
| 1. Receiving inspection | Bar stock, castings, bought-in parts, material certificates, purchase orders | Accepted material with lot labels; rejected lots in quarantine | Goods-in inspector |
| 2. Cutting and machining | Accepted material, drawings, process sheets, programs, tools | Machined parts with traveler and first-off record | Cell lead and setter |
| 3. Assembly | Machined parts, bought-in components, customer free-issue parts, work instructions | Assemblies with build record | Assembly team leader |
| 4. Finishing and test | Assemblies, finishing specification, test procedures | Finished and tested items with test results | Test technician |
| 5. Final inspection | Finished items, inspection plan, calibrated gauges | Released batch or a hold with nonconformance record | Authorized inspector |
| 6. Pack and ship | Released batch, packing instruction, delivery note | Packed and labeled shipment, pack-out record | Dispatch lead |

The traveler (route card) follows the batch through every stage. It is the first record to read in a records trail, because it names the material lot, the machine, and the instruments used.

## 2. Where the clauses show up

The table gives one sector-specific example for each clause group. The wording is an original summary, not text from the standard.

| Clause | In discrete manufacturing |
|---|---|
| 4 Context | Customer sectors served, key processes such as machining and assembly, and outsourced processes such as plating are named in the scope. |
| 5 Leadership | Managers make sure shipment targets never override release rules, and give inspectors clear authority to hold a batch. |
| 6 Planning | Risks such as single-source castings or a key machine are assessed; objectives cover scrap rate and on-time delivery; changes to the line are planned. |
| 7 Support | Gauges are calibrated, drawings are controlled, setters and inspectors are competent, and the shop environment suits precision work. |
| 8 Operation | Orders are reviewed, designs controlled where the company designs, suppliers and subcontractors controlled, production done to process sheets, batches identified and traced, and nonconforming parts held. |
| 9 Performance evaluation | Scrap, rework, and delivery data are analyzed; customer returns are tracked; internal audits cover each cell; management reviews the results. |
| 10 Improvement | Recurring defects such as burrs lead to corrective action that removes the cause, with an effectiveness check. |

**The five clauses that most often matter in this sector.** This list is an informed estimate from general knowledge of the sector, not data from audit results. Validate it with a sector subject-matter reviewer and, where possible, with nonconformity data from the certification body. **[VERIFY]**

1. **7.1.5 Monitoring and measuring resources.** Dimensional conformity depends on calipers, micrometers, gauges, and coordinate measuring machines that are calibrated and suitable.
2. **7.5.3 Control of documented information.** Drawing revisions change often; an obsolete revision at the machine is one of the most common findings.
3. **8.5.1 Control of production.** Process sheets, setup checks, first-off inspection, and defined tool life keep output conforming.
4. **8.5.2 Identification and traceability.** Batch identity links parts to material lots, machines, and instruments, and defines the scope of any recall.
5. **8.4 Externally provided processes, products and services.** Bar stock, castings, plating, and heat treatment come from outside and must be verified.

## 3. Records an auditor typically asks for

Records are listed by clause in the vocabulary of the sector. Retention periods and the system of record are set by the organization. **[OWNER INPUT]**

- **7.1.5:** calibration certificates, gauge register, out-of-tolerance reviews of earlier results
- **7.2:** skills matrix for setters, operators, and inspectors; training records; inspector authorizations
- **7.5.3:** drawing register, revision history, withdrawal of obsolete prints
- **8.2:** contract and order review records, customer drawing and tolerance changes
- **8.4:** approved supplier list, supplier evaluations, material certificates, subcontractor records
- **8.5.1:** process sheets, setup sheets, first-off inspection records, in-process check sheets, tool change logs
- **8.5.2:** travelers, lot labels, pack-out records
- **8.5.3:** customer property register for free-issue parts, tooling, and drawings
- **8.5.6:** change requests, trial results, approvals
- **8.6:** final inspection records, release signatures, concessions
- **8.7:** nonconformance log, quarantine records, disposition approvals
- **9.2 and 9.3:** audit reports, management review minutes
- **10.2:** corrective action records with cause, action, and effectiveness check

## 4. Typical nonconformities and their usual causes

Each likely cause is a system condition, not a person. When a cause names a person ("careless", "forgot"), ask what in the system allowed the event and what would prevent it for anyone in that role.

| No. | Nonconformity | Clause | Likely root cause (system condition) | Preventive control |
|---|---|---|---|---|
| 1 | Obsolete drawing revision at the machine | 7.5.3 | Revisions are released in the office but not pushed to the cell; old prints are not withdrawn | Issue drawings through a controlled point-of-use list and collect superseded copies |
| 2 | Gauge in use past its calibration date | 7.1.5 | No due-date alert; the register is checked monthly only | Due-date alerts and a pre-use status check |
| 3 | Earlier results not reviewed after a gauge failed calibration | 7.1.5 | Calibration procedure has no look-back step | Automatic look-back review when a gauge is found out of tolerance |
| 4 | Mixed batches on one pallet without separation | 8.5.2 | Pack-out practice allows shared pallets | Separation labels and one batch per pallet unless authorized |
| 5 | Untagged material in the rack | 8.5.2 | Offcuts are returned to stock without a relabeling step | Offcut return procedure with tagging |
| 6 | Customer free-issue parts mixed with own stock | 8.5.3 | No defined storage location or register for customer property | Dedicated location and register |
| 7 | Material certificate not compared with the purchase order | 8.4 | Receiving check is a stamp, not a comparison | Checklist that compares grade, heat lot, and quantity |
| 8 | Process change made without review | 8.5.6 | Change requests are optional for "small" changes | Defined change thresholds and a review form |
| 9 | Batch shipped with an open discrepancy | 8.6 | Release status can be set while a nonconformance is open | System block on release with open records |
| 10 | Nonconforming parts in an unlocked quarantine area without disposition | 8.7 | No owner and no time limit for dispositions | Named owner and a weekly disposition review |
| 11 | Recurring defect closed as "operator reminded" | 10.2 | Corrective action form accepts a person as the cause | Cause analysis prompts and a required effectiveness check |

## 5. Sector specifics

### Customer property

Customer property includes free-issue components, customer tooling and fixtures, customer drawings and models, and returnable packaging. Each item needs an owner label, a place in the register, protection, and a report to the customer if it is lost or damaged. In the Casebook, look for customer fixtures on shared shelves.

### External providers

External providers include bar stock and casting suppliers, plating and heat-treatment subcontractors, calibration laboratories, tooling suppliers, and freight carriers. Controls range from certificate checks to first-article inspection and subcontractor audits. A change notice from a supplier, such as a new insert grade, is a change to review, not a document to file.

### Measuring and monitoring resources

Calipers, micrometers, height gauges, bore gauges, air gauges, coordinate measuring machines, torque tools, and scales. Calibration shows an instrument is accurate; a capability study shows it is suitable for the tolerance. When an instrument fails calibration, the earlier results it produced must be assessed.

### Work environment

Temperature for precision measurement, cleanliness, lighting for inspection, and orderly workstations. Machine guarding and ergonomics are safety matters managed by the safety system; they are outside this program.

## 6. Sector vocabulary

| Term | Meaning in this primer |
|---|---|
| Batch | A quantity of parts made together under the same conditions; the work item in this sector |
| Job order | An instruction to make a quantity of a part for an order |
| Traveler | The route card that follows a batch and records material, machines, instruments, and sign-offs |
| Drawing revision | The letter or number identifying the current version of a drawing |
| Process sheet | The document that sets the operations, settings, and checks for a part |
| Setup sheet | The record of how a machine was set for a job |
| First-off inspection | Check of the first part after setup before the batch continues |
| In-process check | A measurement made during production at a set frequency |
| Tolerance | The allowed variation of a dimension |
| Gauge | A measuring instrument or a fixed check device |
| Calibration | Comparison of an instrument with a reference of known accuracy |
| Capability study | A study showing whether a process or gauge can meet the tolerance reliably |
| Heat lot | The melt identity of a material, shown on its certificate |
| Material certificate | The supplier document stating the material grade and test results |
| Free-issue parts | Parts supplied by the customer for use in their order |
| Quarantine | A controlled area or status for material that must not be used |
| Concession | An authorized decision to use or release nonconforming output, where permitted |
| Rework | Action that makes a nonconforming part conform |
| Pack-out record | The record of what was packed, in which container, for which order |
| Tool life | The number of parts or time after which a cutting tool is changed |
| Burr | A small raised edge left by machining |
| Deviation request | A request to the customer to accept a departure from the drawing |

## 7. Sector schemes and local rules

Some manufacturers also work to sector schemes that build on ISO 9001, for example in automotive, aerospace, rail, or medical devices. Those schemes add requirements, such as specific planning methods and customer-specific requirements, that this primer does not teach. This program covers the ISO 9001 quality management system only. Where a scheme or legal requirement applies, the organization remains responsible for it; consult the certification body and the relevant authority. **[VERIFY]**

## 8. Further reading

A reading list for this sector is to be supplied by the program owner or a sector subject-matter reviewer. **[OWNER INPUT]**

- Internal procedures of {{COMPANY}} that apply to this sector. **[OWNER INPUT]**
- Guidance published by the certification body. **[OWNER INPUT]**
- Sector scheme documents, where the organization operates under one. **[OWNER INPUT]**

## 9. Check your understanding

Each question links this primer to a Casebook case. Model answers are in the instructor guide chapter on the Sector Deep-Dive Track.

1. In *The Shifted Batch* (MFG-B), which record told you which caliper to check, and why is that card often missed?
2. In *The Recurring Burr* (MFG-C), why is "operator reminded" not a corrective action? Name the system conditions you found.
3. In *The Faster Spindle* (MFG-D), list four questions a change review should answer before a new spindle speed is used.
4. In *The Fit Complaint* (MFG-E), why does containment follow the grinding run rather than the reported delivery?
5. In *The Friday Shipment* (MFG-F), who may authorize release of a batch with an open discrepancy, and what does the customer agreement add?

---

*Fictional organization. Examples are illustrative. Sector-specific legal, clinical, safety, and food safety requirements are outside this program.*
