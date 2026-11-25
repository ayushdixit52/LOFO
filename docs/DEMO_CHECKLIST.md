# BLUE — Judge Demonstration Checklist

**Owner:** Member 5 (QA & Pitch Lead)  
**Purpose:** Ensure BLUE is genuinely running, verified, and fault-tolerant before stepping in front of judges.

---

## 1. Pre-Demo Technical Readiness Gate (30 Minutes Before Pitch)

- [ ] **All team branches merged & pulled:** Confirm `server/`, `client/`, and seed utilities are integrated on the demo branch (no `.gitkeep`-only directories).
- [ ] **Environment configured:** `.env` exists at project root with valid `MONGODB_URI`, `PORT=5000`, `CLIENT_ORIGIN=http://localhost:5173`, and `VITE_API_BASE_URL=http://localhost:5000/api`.
- [ ] **MongoDB running:** Local `mongod` service is active and reachable.
- [ ] **Fresh seed loaded:** Seed script executed so `>= 150` fictional reports exist, including a pre-seeded `ACTIVE` `FOUND` `Grey Hoodie` (or `Gray Sweatshirt`) at the demo location.
- [ ] **Automated QA gate passed:**
  - `node qa/verify-api.mjs` passes on staging DB (all Backend, Matching 1–8, Analytics, and Grey Hoodie E2E checks green).
  - Re-seed clean demo DB, then run `node qa/verify-api.mjs --read-only` to confirm `>= 150` reports and `/api/health` `200` without mutating demo data.
- [ ] **Frontend build & UI checked:**
  - `http://localhost:5173` loads with zero browser DevTools console errors or failed network calls.
  - Tested at desktop (`1280x800`) and mobile (`375x812`) viewports.

---

## 2. Live Judge Demo Verification Sequence

| Step | What Judges Should See | Behind-the-Scenes Endpoint | Verified? |
| --- | --- | --- | --- |
| 1 | Clean BLUE landing page & navigation | Client (`:5173`) | [ ] |
| 2 | Submit Lost `Grey Hoodie` form with validation | `POST /api/reports/lost` (`201`) | [ ] |
| 3 | Persisted report viewable in list/details | `GET /api/reports/:id` (`200`) | [ ] |
| 4 | Matching `FOUND` item displayed automatically | `GET /api/reports/:id/matches` (`200`) | [ ] |
| 5 | Numeric match score (`0..1` / `%`) + human explanation visible | Match payload `score` + explanation | [ ] |
| 6 | Click **Mark Reunited** -> status updates & excluded from active matches | `PATCH /api/reports/:id/status` (`200`) | [ ] |
| 7 | Analytics Dashboard shows updated live counts, Top 3 items, Top 3 hotspots | `GET /api/analytics/{overview,items,hotspots}` (`200`) | [ ] |

---

## 3. Judge Q&A Realism Guardrails

- **If asked "Does it use AI/ML?"** -> Answer honestly: *"No—we intentionally use deterministic, explainable attribute matching over structured fields so every score has a clear reason and predictable behavior without hallucination."*
- **If asked "Do users get real-time notifications?"** -> Answer honestly: *"Not in this hackathon build; notifications are on our post-hackathon roadmap. Today users see matches immediately upon submitting a report or checking report details."*
- **If asked "What is your matching accuracy?"** -> Answer honestly: *"We do not claim a production accuracy percentage; instead we validated 8 structured matching scenarios (synonyms, color variants, unrelated items, location/date sensitivity, missing brand, and reunited exclusion) in our QA suite."*
- **If asked "Is the analytics data real?"** -> Answer honestly: *"It is live MongoDB aggregation over a 150+ report fictional campus dataset—and you just saw the reunited counter update live when we marked the Grey Hoodie reunited."*

---

## 4. Demo Fallback Plan

1. Keep one terminal tab running the API server and one running Vite (`npm run dev`), visible on a second workspace for quick log checks.
2. Do not run `node qa/verify-api.mjs` (full mutating mode) right before the pitch without re-seeding afterward; use `--read-only` for final pre-stage check.
3. Keep `docs/QA_REPORT.md` and `docs/PROMPT_LOG.md` open in another tab if judges ask about engineering rigor and testing process.
