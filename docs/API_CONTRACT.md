# BLUE API Contract

Base path: `/api`. JSON request and response bodies use `Content-Type: application/json`.

## Common report model

```json
{
  "_id": "<server-generated id>",
  "itemName": "Water Bottle",
  "category": "Bottle",
  "color": "Navy Blue",
  "brand": "Milton",
  "location": "Library",
  "date": "2026-11-24",
  "time": "16:00",
  "description": "Bottle left near reading table",
  "type": "LOST",
  "status": "ACTIVE",
  "createdAt": "<ISO-8601 timestamp>",
  "updatedAt": "<ISO-8601 timestamp>"
}
```

`_id`, `createdAt`, and `updatedAt` are assigned by the server. `type` is `LOST` or `FOUND`; `status` is `ACTIVE` or `REUNITED`. `date` is a calendar date (`YYYY-MM-DD`); `time` is local 24-hour time (`HH:mm`). All other listed fields are required strings; `brand` may be an empty string when unknown. Do not send server-managed fields when creating reports.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/reports/lost` | Create a `LOST` report; body is the common report fields (type is inferred as `LOST`). |
| `POST` | `/api/reports/found` | Create a `FOUND` report; body is the common report fields (type is inferred as `FOUND`). |
| `GET` | `/api/reports` | List reports. Optional query: `type`, `status`, `category`, `q`, `page`, `limit`. |
| `GET` | `/api/reports/:id` | Fetch one report. |
| `GET` | `/api/reports/:id/matches` | Find compatible active reports of the opposite type, ranked by match score. |
| `PATCH` | `/api/reports/:id/status` | Update status; body: `{ "status": "REUNITED" }` (or `ACTIVE`). |
| `GET` | `/api/analytics/overview` | Aggregate overview metrics from persisted reports. |
| `GET` | `/api/analytics/hotspots` | Location-level report counts for hotspot visualization. |
| `GET` | `/api/analytics/items` | Item/category-level analytics. |
| `GET` | `/api/health` | Service and database readiness. |

## Response envelope and errors

Successful single-resource responses use `{ "data": <resource> }`; collections use `{ "data": [...], "pagination": { "page": 1, "limit": 20, "total": 0, "pages": 0 } }`. Match resources include `report` and a numeric `score` from 0 to 1, sorted descending. Analytics responses use `{ "data": <endpoint-specific object or array> }`.

Errors use `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }`. Use standard HTTP status codes: `400` invalid input, `404` missing report, `500` unexpected server error, `503` dependency unavailable. Keep messages safe for client display; never return stack traces.

## Integration invariants

- Creation route determines `type`; reject conflicting client-supplied `type`.
- A report match must be opposite-type and `ACTIVE`; a `REUNITED` report cannot be offered as an active match.
- Status changes are persisted. Analytics must aggregate persisted reports rather than hard-coded demo values.
- Every module should use this contract; coordinate changes in `docs/API_CONTRACT.md` before changing payload shapes.
