# BLUE Architecture

## System shape

```text
Browser (React + Vite + Tailwind)
        │ JSON over HTTP, VITE_API_BASE_URL
        ▼
Express API (/api)
  ├─ report validation and status workflow
  ├─ matching service (active reports, opposite type)
  ├─ analytics service (aggregations over stored reports)
  └─ Mongoose models and seed tooling
        │
        ▼
     MongoDB
```

The browser talks only to the API. The API owns validation and business rules; MongoDB is the source of truth for reports, matches, and analytics. The API contract in `API_CONTRACT.md` is the boundary shared by the client, server, analytics, and integration work.

## Shared report model

The common report is defined in `shared/report.js`. The server should mirror its fields and enum constraints in the Mongoose schema and validate untrusted input at the API boundary. The lost/found creation routes set the type. Reports start `ACTIVE`; marking a successful reunion sets `REUNITED` and removes the report from active matching.

## Runtime configuration

The server reads `PORT`, `MONGODB_URI`, and `CLIENT_ORIGIN`. The client reads `VITE_API_BASE_URL`. `.env.example` documents local defaults; actual credentials belong only in an ignored `.env` file.

## Integration sequence

1. Backend establishes health and report routes against MongoDB.
2. Frontend consumes the documented report and status endpoints.
3. Matching and analytics operate on the same persisted report collection.
4. Seed data populates that collection through server-side tooling.
5. End-to-end review checks create → find match → reunite and refreshed analytics.
