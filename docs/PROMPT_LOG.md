# BLUE — AI Prompt & Verification Log

**Maintained by:** Member 5 (QA Engineer & Pitch Lead)  
**Purpose:** Track key AI prompts used during development and QA, verify actual vs. expected outputs, catch inaccuracies early, and record corrections.

---

## Logged Sessions

### Entry 01 — Initial Repository & Contract Audit for QA Setup
- **Prompt given:** Inspect the BLUE repository, read the architecture and API contract, test all modules (backend, matching, frontend, E2E, data), create `docs/QA_REPORT.md`, `docs/PROMPT_LOG.md`, `docs/PITCH.md`, and prepare a demo-ready pitch without recreating teammate modules or claiming unimplemented features.
- **Expected result:** Repository has implemented `server/`, `client/`, seed data, and analytics ready for full QA testing and realistic pitch preparation.
- **Actual result:** Initial workspace inspection and `git fetch --all --prune` showed that `main`, `member5`, `origin/main`, and `origin/feature/backend` are all at commit `05875a5`, where `client/` and `server/` contain only `.gitkeep`. Baseline execution of `node qa/verify-api.mjs` reported `BLOCKED` for server, client, and `GET /api/health`.
- **What AI got wrong / Initial risk avoided:** Without checking remote branches (`git fetch --all --prune`) and runtime tools (`node`, `mongod`, `mongosh`), it would have been easy to assume `origin/feature/backend` had code or to fabricate passing test results and dataset statistics for the pitch.
- **How it was corrected:** Verified remote branches with `git fetch --all --prune`, built a zero-dependency automated QA verification runner (`qa/verify-api.mjs`) strictly matching `docs/API_CONTRACT.md`, recorded all actual blockers (`QA-001` through `QA-004`) in `docs/QA_REPORT.md`, and marked unverified dataset/algorithm metrics as `[PENDING]` in `docs/PITCH.md` rather than inventing numbers.

---

## Template for Team Additions (Members 1–4 & Integration Follow-Ups)

Copy this block for each significant AI prompt used during backend, matching, data/analytics, frontend, and integration fixes:

```markdown
### Entry XX — <Short Title> (<Owner / Module>)
- **Prompt given:** <Exact prompt or summary of instruction given to AI>
- **Expected result:** <What the module/output needed to satisfy per docs/API_CONTRACT.md>
- **Actual result:** <What the AI actually generated or executed>
- **What AI got wrong:** <Contract mismatch, missing validation, hallucinated field, UI bug, etc. — or "None">
- **How it was corrected:** <Exact fix applied and verified>
```
