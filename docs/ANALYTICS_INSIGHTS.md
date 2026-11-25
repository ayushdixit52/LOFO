# BLUE Analytics Insights

All figures below are calculated from `server/seed/reports.json`.

## Dashboard overview

| Metric | Count |
|---|---:|
| Total reports | 150 |
| LOST reports | 75 |
| FOUND reports | 75 |
| ACTIVE reports | 150 |
| REUNITED reports | 0 |

## Top 3 most-lost categories

Method: filter `type === 'LOST'`, group by `category`, count, sort descending (alphabetically for ties), and take three.

| Rank | Category | LOST reports |
|---:|---|---:|
| 1 | Bottle | 18 |
| 2 | ID Card | 15 |
| 3 | Charger | 13 |

## Top 3 campus hotspots

Method: group all reports by `location`, count LOST and FOUND separately, then rank by LOST count descending (alphabetically for ties).

| Rank | Location | LOST | FOUND | Total reports |
|---:|---|---:|---:|---:|
| 1 | Library | 16 | 14 | 30 |
| 2 | Main Canteen | 13 | 12 | 25 |
| 3 | Computer Science Block | 10 | 10 | 20 |

## Reproducibility

Parse `reports.json`; filter LOST reports for category ranking; group all reports by location and count LOST/FOUND separately for hotspot ranking. Dashboard totals are counts over the same array.

## Interpretation

Hotspots are ranked by LOST reports. FOUND counts are shown for context and do not affect the ranking. These are synthetic demo insights, not claims about a real campus.
