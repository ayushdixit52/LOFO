# BLUE — 3-Minute Hackathon Pitch Script

**Presenter:** Member 5 (Pitch Lead & QA Engineer)  
**Target Duration:** 3:00 minutes (~390–430 spoken words + live demo)  
**Realism Rule:** Every claim in this script corresponds strictly to the architecture in [ARCHITECTURE.md](ARCHITECTURE.md) and [API_CONTRACT.md](API_CONTRACT.md). Do **not** claim AI/ML models, unverified accuracy percentages, automated email/SMS/push notifications, or image recognition unless implemented and verified before demo time.

> **Pre-Pitch Blocker Notice:** Fields marked `[PENDING ...]` require Member 2 (matching weights) and Member 3 (seeded dataset output) to be merged and verified with `node qa/verify-api.mjs` before presenting.

---

## 1. Problem Statement (0:00 – 0:25)
Every week on campuses and in public venues, dozens of everyday items—water bottles, hoodies, backpacks, keys, and chargers—go missing. Today, recovery depends on fragmented chat groups, bulletin boards, or manual lost-and-found logbooks. Even when one person reports losing a **"Grey Hoodie"** and another turns in a **"Gray Sweatshirt"** at the same building, those two records never meet because nobody is comparing structured attributes across opposite report streams.

## 2. The BLUE Solution (0:25 – 0:50)
**BLUE** is a full-stack lost-and-found web application built with React, Tailwind CSS, Express, and MongoDB. Instead of burying reports in an unsearchable feed, BLUE captures structured attributes—item name, category, color, brand, location, date, time, and description—separately for **Lost** and **Found** reports, automatically ranks compatible active matches of the opposite type, surfaces a transparent match score and explanation, and closes the loop when an item is marked **Reunited**.

## 3. One Real Dataset Insight (0:50 – 1:10)
To test BLUE under realistic conditions, we populated MongoDB with a fictional dataset of **150+ reports** spanning campus locations and everyday categories.
- **Verified Insight:** `[PENDING Member 3 seed + /api/analytics/items & /api/analytics/hotspots verification — insert exact Top #1 most-lost item, Top #1 hotspot location, and percentage/count observed from GET /api/analytics/*]`
- Why it matters: Hotspot and item-frequency aggregations turn lost-and-found from a passive inbox into actionable campus operations data—showing where collection desks or signage are needed most.

## 4. Matching Algorithm Explanation (1:10 – 1:40)
BLUE's matching engine (`GET /api/reports/:id/matches`) compares each `ACTIVE` report only against `ACTIVE` reports of the **opposite type** (`LOST` vs `FOUND`), guaranteeing that already `REUNITED` items never pollute active results.
- Each candidate pair is scored on a normalized **0 to 1** scale and sorted descending.
- `[PENDING Member 2 implementation inspection — insert exact implemented scoring factors, e.g., item name/synonym overlap, category match, color normalization such as Grey/Gray or Navy/Blue, location proximity, date difference, and optional brand handling]`
- Crucially, every match returns a clear **explanation** showing *why* two reports matched—so users can judge a match in seconds rather than trusting a black box.

## 5. Live Demo Script (1:40 – 2:30)
*(Total: ~50 seconds; keep browser zoomed cleanly and pre-seed the matching Found `Grey Hoodie`)*
1. **Open BLUE** (`0:00` of demo): Show the landing page and active report feed.
2. **Submit Lost Report** (`0:10`): Open **Report Lost**, enter `Grey Hoodie` (Category: Clothing, Color: Grey, Location: Library, Date/Time: today), and submit.
3. **Show Match Results** (`0:22`): BLUE persists the report to MongoDB and opens compatible active `FOUND` candidates—highlighting the matching found hoodie/sweatshirt with its **0–1 match score** and **attribute-level explanation**.
4. **Mark Reunited** (`0:38`): Click **Mark Reunited**, triggering `PATCH /api/reports/:id/status` -> `REUNITED`, immediately removing it from active matching.
5. **Show Live Analytics** (`0:45`): Switch to the **Analytics Dashboard** and refresh to show the live MongoDB counts—Top 3 lost items, Top 3 hotspots, and the updated reunited total.

## 6. Innovation & Social Impact (2:30 – 2:45)
- **Innovation:** Transparent, explainable attribute matching combined with live hotspot analytics over a single unified Lost/Found lifecycle (`ACTIVE` -> `REUNITED`).
- **Social Impact:** Reduces financial loss for students and commuters, cuts down duplicate replacement waste (especially bottles, chargers, and apparel), and lowers administrative workload for campus staff.

## 7. Future Scope (2:45 – 3:00)
*(Clearly framed as post-hackathon roadmap—not current features)*
- Opt-in email/push alerts when a high-scoring opposite-type match is submitted.
- Secure ownership verification questions before sharing contact details.
- Photo upload support and multi-campus / transit-hub deployment.
