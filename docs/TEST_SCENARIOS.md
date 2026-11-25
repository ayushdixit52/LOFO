# BLUE — Test Scenarios & Execution Matrix

**Owner:** Member 5 (QA Engineer)  
**Contract Reference:** [API_CONTRACT.md](API_CONTRACT.md) | [shared/report.js](../shared/report.js)  
**Automated API/Matching/Data/E2E Utility:** `node qa/verify-api.mjs` (use `--read-only` on a clean demo database)

---

## A. Backend API Test Scenarios

| ID | Scenario | Endpoint / Method | Expected Result | Current Status |
| --- | --- | --- | --- | --- |
| BE-01 | Lost report creation | `POST /api/reports/lost` | HTTP `201`, `{ data }` with `_id`, `type: "LOST"`, `status: "ACTIVE"`, timestamps | BLOCKED (`QA-001`) |
| BE-02 | Found report creation | `POST /api/reports/found` | HTTP `201`, `{ data }` with `_id`, `type: "FOUND"`, `status: "ACTIVE"`, timestamps | BLOCKED (`QA-001`) |
| BE-03 | Report listing & filters | `GET /api/reports?type=&status=&category=&q=&page=&limit=` | HTTP `200`, `{ data: [...], pagination: { page, limit, total, pages } }` | BLOCKED (`QA-001`) |
| BE-04 | Report details | `GET /api/reports/:id` | HTTP `200`, `{ data: <report> }`; missing ID returns `404` `{ error }` | BLOCKED (`QA-001`) |
| BE-05 | Match API | `GET /api/reports/:id/matches` | HTTP `200`, `{ data: [...] }` opposite-type `ACTIVE` reports with numeric `score` in `[0, 1]` sorted descending + explanation | BLOCKED (`QA-001`) |
| BE-06 | Reunited status update | `PATCH /api/reports/:id/status` | HTTP `200`, `{ status: "REUNITED" }` persisted; invalid status returns `400` | BLOCKED (`QA-001`) |
| BE-07 | Invalid requests | `POST` / `PATCH` malformed payloads | HTTP `400` `{ error: { code, message, details } }` (missing fields, conflicting `type`, bad date/time); no stack trace | BLOCKED (`QA-001`) |
| BE-08 | Missing optional fields | `POST` with `brand: ""` | HTTP `201`, report stored with empty `brand` without validation failure | BLOCKED (`QA-001`) |

---

## B. Matching Engine Test Scenarios

| ID | Scenario | Input Pair / Condition | Expected Score & Explanation Behavior | Current Status |
| --- | --- | --- | --- | --- |
| MT-01 | Navy Bottle vs Blue Water Bottle | LOST: `Navy Bottle`, color `Navy`, category `Bottle` vs FOUND: `Blue Water Bottle`, color `Blue`, category `Bottle` | High match score (`>= 0.5`), explanation highlights category, color family, and item name similarity | BLOCKED (`QA-001`) |
| MT-02 | Grey Hoodie vs Gray Sweatshirt | LOST: `Grey Hoodie`, color `Grey` vs FOUND: `Gray Sweatshirt`, color `Gray` | High match score (`>= 0.5`), handles `Grey`/`Gray` spelling and `Hoodie`/`Sweatshirt` synonym/category similarity | BLOCKED (`QA-001`) |
| MT-03 | Black Backpack vs Black Bag | LOST: `Black Backpack`, category `Bag` vs FOUND: `Black Bag`, category `Bag` | High match score (`>= 0.5`), explanation cites category, color, and keyword match | BLOCKED (`QA-001`) |
| MT-04 | Unrelated items | LOST: `Silver MacBook Pro` vs FOUND: `Red Umbrella` | Very low score (`< 0.3`) or omitted from matches | BLOCKED (`QA-001`) |
| MT-05 | Different locations | Same item/color/date in `Gym` vs `Parking Lot D` | Same-location pair scores strictly higher than different-location pair; explanation reflects location match/mismatch | BLOCKED (`QA-001`) |
| MT-06 | Different dates | Same item/location on `2026-11-23` vs `2026-09-01` | Close-date pair scores strictly higher than distant-date pair | BLOCKED (`QA-001`) |
| MT-07 | Missing brand | LOST `brand: ""` vs FOUND `brand: "Milton"` (same item/category/color/location) | Matches gracefully (`>= 0.5`) without penalizing missing brand as a hard mismatch or crashing | BLOCKED (`QA-001`) |
| MT-08 | Reunited reports | Mark candidate FOUND report `status: "REUNITED"` | Reunited report is completely excluded from `GET /api/reports/:id/matches` | BLOCKED (`QA-001`) |

---

## C. Frontend UI Test Scenarios

| ID | Scenario | User Action | Expected Result | Current Status |
| --- | --- | --- | --- | --- |
| FE-01 | Landing page | Open `http://localhost:5173` | Clean branding, clear CTAs to Report Lost, Report Found, Browse Reports, and Analytics | BLOCKED (`QA-003`) |
| FE-02 | Report Lost form | Fill all fields + submit Lost form | Sends `POST /api/reports/lost`, shows confirmation and transitions to details/matches | BLOCKED (`QA-003`) |
| FE-03 | Report Found form | Fill all fields + submit Found form | Sends `POST /api/reports/found`, shows confirmation and transitions to details/matches | BLOCKED (`QA-003`) |
| FE-04 | Form validation | Submit empty/incomplete fields or invalid date/time | Clear inline validation errors; no unhandled exceptions or blank screens | BLOCKED (`QA-003`) |
| FE-05 | Match results | View matches for a submitted report | Opposite-type active candidates rendered sorted by score with human-readable explanation | BLOCKED (`QA-003`) |
| FE-06 | Analytics dashboard | Open Analytics section/page | Displays live totals, Top 3 lost items, Top 3 hotspots from `/api/analytics/*` | BLOCKED (`QA-003`) |
| FE-07 | Search and filtering | Filter by `type`, `status`, `category`, and keyword `q` | Updates visible list cleanly via `/api/reports` query parameters | BLOCKED (`QA-003`) |
| FE-08 | Reunited button | Click "Mark Reunited" on a report | Calls `PATCH /api/reports/:id/status` with `REUNITED`, updates UI badge, removes from active matches | BLOCKED (`QA-003`) |
| FE-09 | Mobile responsiveness | Test at `375x812` viewport in browser DevTools | No horizontal overflow, readable cards/tables, usable forms and navigation | BLOCKED (`QA-003`) |

---

## D. End-to-End Critical Path (Demo Flow)

| Step | Action | Verification Point | Current Status |
| --- | --- | --- | --- |
| E2E-01 | Open BLUE | Web app loads cleanly with zero console/network errors | BLOCKED (`QA-003`) |
| E2E-02 | Submit a lost `Grey Hoodie` report | UI form submits `POST /api/reports/lost` and returns `201` | BLOCKED (`QA-001`, `QA-003`) |
| E2E-03 | Verify MongoDB storage | `GET /api/reports/:id` (and DB record) returns persisted `Grey Hoodie` document (`ACTIVE`, `LOST`) | BLOCKED (`QA-001`) |
| E2E-04 | Verify the match API | `GET /api/reports/:id/matches` returns compatible active `FOUND` item(s) | BLOCKED (`QA-001`) |
| E2E-05 | Display matching found item | UI renders matching found item card from match API response | BLOCKED (`QA-003`) |
| E2E-06 | Show match score and explanation | Score (`0..1` or `%`) and reason breakdown are visibly displayed | BLOCKED (`QA-001`, `QA-003`) |
| E2E-07 | Mark Reunited | Clicking Reunited calls `PATCH /api/reports/:id/status` -> `REUNITED` and removes from active matches | BLOCKED (`QA-001`, `QA-003`) |
| E2E-08 | Verify dashboard updates | Reloading Analytics shows incremented reunited count / updated active count from persisted data | BLOCKED (`QA-002`, `QA-003`) |

---

## E. Data & Analytics Test Scenarios

| ID | Scenario | Verification Method | Expected Result | Current Status |
| --- | --- | --- | --- | --- |
| DA-01 | Report volume | `GET /api/reports?limit=1` (`pagination.total`) | At least `150` persisted reports exist after seeding | BLOCKED (`QA-002`) |
| DA-02 | Fictional data check | Inspect seeded reports | Names, descriptions, and locations are clearly fictional campus/demo items (no PII) | BLOCKED (`QA-002`) |
| DA-03 | Matching pairs present | Query `/api/reports/:id/matches` on seeded lost items | Intentional seeded pairs (e.g., Bottle, Hoodie, Backpack) return valid matches | BLOCKED (`QA-002`) |
| DA-04 | Top 3 most-lost items | Cross-check `/api/analytics/items` against raw `LOST` reports | Exact Top 3 items/categories and counts match persisted database records | BLOCKED (`QA-002`) |
| DA-05 | Top 3 hotspots | Cross-check `/api/analytics/hotspots` against raw report locations | Exact Top 3 locations and counts match persisted database records | BLOCKED (`QA-002`) |
