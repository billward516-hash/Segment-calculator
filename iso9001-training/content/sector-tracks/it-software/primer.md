# Sector Primer: IT and Software Services

*This material is an original training aid. It is not a substitute for the standard. Obtain ISO 9001 from ISO or a national standards body.*

> **Status:** verifyStatus2015: unverified. Clause references use ISO 9001:2015 numbering and were written from general knowledge of the standard. Confirm them against the purchased standard. **[VERIFY]**

This primer is part of the optional Industry Deep-Dive Track. It assumes the core modules and the neutral terms used there (work item, output, measuring and monitoring resource, point of use, hold, customer property). It shows how the same requirements appear in IT and software services. Sector content never changes what a requirement means. The fictional organization used throughout is Meridian Digital. Information security management is addressed by separate schemes; this primer gives no security instructions.

**How to use this primer.** Read it before or after the IT and software services cases in the Sector Casebook (case codes start with **ITS**). Each section ends where a Casebook case begins: records you will review, people you will ask, and nonconformities you may find. Allow 30 to 40 minutes.

## 1. The sector at a glance

IT and software services deliver changes, releases, and support to customers. The work item is the ticket, change, or release. Quality depends on clear requirements with acceptance criteria, independent review, test environments that represent production, controlled release, protection of customer data, and changes that are reviewed, including urgent ones.

**Process map (Meridian Digital).** Requirements intake → Design → Build → Test → Release review → Deploy and support. The work item is the **release**. The constraint stage, where work most often queues, is build.

| Stage | Typical inputs | Typical outputs | Typical owner |
|---|---|---|---|
| 1. Requirements intake | Customer requests, contracts, service levels, backlog | Stories with acceptance criteria, agreed scope | Product owner |
| 2. Design | Stories, architecture standards, risks | Design records and design review actions | Technical lead |
| 3. Build | Designs, coding standard, libraries, repository | Merged code with peer review records | Developers |
| 4. Test | Builds, test cases, test environment | Test results and defect records | Test lead |
| 5. Release review | Test summary, open defects, release checklist | Release sign-off or documented risk acceptance | Release manager |
| 6. Deploy and support | Approved release, deployment plan, rollback plan, monitoring | Deployed release, incidents, customer feedback | Operations and support lead |

The release record is the first record to read in a records trail: it names the build number, the changes included, and the approver. Compare it with the deployment log region by region.

## 2. Where the clauses show up

The table gives one sector-specific example for each clause group. The wording is an original summary, not text from the standard.

| Clause | In IT and software services |
|---|---|
| 4 Context | The scope names the services delivered, hosting arrangements, and outsourced activities such as cloud hosting or contractors. |
| 5 Leadership | Leaders support release controls under date pressure and assign owners for test suites and support queues. |
| 6 Planning | Risks such as single points of failure or shared components are assessed; objectives cover escaped defects and response times; pipeline changes are planned. |
| 7 Support | Test environments are verified, coding standards are current, people are competent for on-call work, and knowledge is retained. |
| 8 Operation | Requirements are agreed, development is controlled, providers and libraries are evaluated, releases are traceable, customer data is protected, and releases follow verification. |
| 9 Performance evaluation | Ticket age, escaped defects, and customer feedback are analyzed; internal audits cover delivery teams; management reviews trends. |
| 10 Improvement | Recurring regressions lead to problem records that find the system cause and check effectiveness. |

**The five clauses that most often matter in this sector.** This list is an informed estimate from general knowledge of the sector, not data from audit results. Validate it with a sector subject-matter reviewer and, where possible, with nonconformity data from the certification body. **[VERIFY]**

1. **8.3 Design and development.** Development control: requirements, reviews, verification, and validation.
2. **8.5.6 Control of changes.** Changes, hotfixes, and pipeline changes need review and approval, including urgent ones.
3. **8.6 Release of products and services.** Release follows test sign-off or documented risk acceptance by the defined authority.
4. **8.5.3 Property belonging to customers.** Customer data, credentials, and code are customer property.
5. **7.1.6 Organizational knowledge.** Knowledge of shared components and systems must not rest with one person.

## 3. Records an auditor typically asks for

Records are listed by clause in the vocabulary of the sector. Retention periods and the system of record are set by the organization. **[OWNER INPUT]**

- **7.1.5:** test environment configuration records and comparisons with production
- **7.1.6:** design notes, runbooks, onboarding material
- **7.2:** competence matrix, on-call training records
- **7.5.3:** current coding standard and deployment procedure, version history
- **8.2:** backlog items with acceptance criteria, contract and service level reviews
- **8.3:** design reviews, test coverage against requirements, validation records
- **8.4:** provider evaluations, library update reviews, contractor records
- **8.5.1:** pipeline configuration, peer review records
- **8.5.2:** release register, build numbers, deployment logs
- **8.5.3:** authorizations for access to or export of customer data
- **8.5.6:** change tickets, emergency change records
- **8.6:** test summaries, sign-offs, risk acceptances
- **8.7 and 10.2:** incident and problem records, corrective actions

## 4. Typical nonconformities and their usual causes

Each likely cause is a system condition, not a person. When a cause names a person ("careless", "forgot"), ask what in the system allowed the event and what would prevent it for anyone in that role.

| No. | Nonconformity | Clause | Likely root cause (system condition) | Preventive control |
|---|---|---|---|---|
| 1 | Release deployed without test sign-off or documented risk acceptance | 8.6 | Release tool allows "approved" status with open high defects | Block approval until sign-off or recorded acceptance |
| 2 | Story without acceptance criteria accepted into a sprint | 8.2.2 | Definition of ready not enforced | Readiness check before sprint planning |
| 3 | Test environment differs from production | 7.1.5 | No scheduled comparison of configuration | Periodic parity check with record |
| 4 | Hotfix deployed without a ticket | 8.5.6 | Emergency route treated as optional | Every build linked to a ticket; pipeline enforces it |
| 5 | Change ticket edited after approval | 8.5.6 | Tool allows edits without re-approval | Lock approved tickets |
| 6 | Peer review approved by the author's second account | 8.5.1 | Linked accounts not detected | Block approvals by linked identities |
| 7 | Customer data exported to a laptop without authorization | 8.5.3 | No defined handling for support analysis | Authorized handling route for diagnostics |
| 8 | Outdated coding standard linked from the repository | 7.5.3 | Links point to copies, not the controlled document | Link to the controlled source |
| 9 | Tests skipped as "flaky" at release | 8.6 | No rule for skipped tests | Skipped tests need authorized acceptance |
| 10 | Third-party library upgraded without review | 8.4 | Library updates treated as routine | Review change notes for major updates |
| 11 | Recurring regression closed as developer oversight | 10.2 | Problem form accepts a person as cause | Cause prompts and effectiveness check |

## 5. Sector specifics

### Customer property

Customer property includes customer data, credentials, source code owned by the customer, and intellectual property. It is protected, used only as authorized, and the customer is told if it is lost or compromised. Security methods belong to the information security scheme, which is outside this program.

### External providers

External providers include cloud hosting, software libraries, contractors, and software-as-a-service tools. Controls include evaluation, review of significant updates, and monitoring of service levels.

### Measuring and monitoring resources

Measuring and monitoring resources include test scripts, automated test suites, monitoring dashboards, performance benchmarks, and survey tools. A test suite is valid only if it covers the requirements and runs in an environment that represents production.

### Work environment

Remote working conditions, workload and on-call load, and a respectful climate affect the quality of work. Security of the workspace is addressed by separate schemes.

## 6. Sector vocabulary

| Term | Meaning in this primer |
|---|---|
| Release | A set of changes deployed together; one work item in this sector |
| Ticket | A recorded request, incident, or task |
| Change | A modification to software, configuration, or infrastructure |
| Hotfix | An urgent change outside the normal release cycle |
| Backlog | The ordered list of work waiting to be done |
| Story | A requirement written from the user's view |
| Acceptance criteria | Conditions a story must meet to be accepted |
| Definition of ready | The checks a story must pass before work starts |
| Pull request | A request to merge a change, with review |
| Peer review | Review of a change by someone other than the author |
| Pipeline | The automated steps that build, test, and deploy software |
| Build number | The unique identity of a build |
| Regression | A defect in something that worked before |
| Test environment | A system used for testing; should represent production |
| Production | The live system customers use |
| Rollback | Return to the previous version |
| Feature flag | A switch that turns a feature on or off without redeploying |
| Incident | An unplanned interruption or reduction in service |
| Problem record | A record used to find and remove the cause of incidents |
| Service level | An agreed target for a service, such as response time |
| Escaped defect | A defect found by the customer after release |
| Risk acceptance | A recorded decision by an authorized person to release with a known risk |

## 7. Sector schemes and local rules

Information security management, privacy, and IT service management are addressed by separate schemes and laws that may apply alongside ISO 9001. This program covers the ISO 9001 quality management system only. Where a scheme or legal requirement applies, the organization remains responsible for it; consult the certification body and the relevant authority. **[VERIFY]**

## 8. Further reading

A reading list for this sector is to be supplied by the program owner or a sector subject-matter reviewer. **[OWNER INPUT]**

- Internal procedures of {{COMPANY}} that apply to this sector. **[OWNER INPUT]**
- Guidance published by the certification body. **[OWNER INPUT]**
- Sector scheme documents, where the organization operates under one. **[OWNER INPUT]**

## 9. Check your understanding

Each question links this primer to a Casebook case. Model answers are in the instructor guide chapter on the Sector Deep-Dive Track.

1. In *Release Trail* (ITS-B), why does the build number matter more than the release name when you define scope?
2. In *The Third Regression* (ITS-C), which three system conditions let regressions reach release?
3. In *The Hotfix* (ITS-D), what does an emergency change procedure keep, and what can it shorten?
4. In *The Production Defect* (ITS-E), why were the other customers' tickets important for containment?
5. In *The Launch Date* (ITS-F), how can a feature flag change the options for a release decision?

---

*Fictional organization. Examples are illustrative. Sector-specific legal, clinical, safety, and food safety requirements are outside this program.*
