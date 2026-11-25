# Team Guidelines

## Ownership

- **Member 1 — architecture and integration:** shared structure, API contract, integration review, and cross-module fixes.
- **Member 2 — backend and matching:** Express API, Mongoose persistence, report matching, and health checks.
- **Member 3 — sample data and analytics:** seed dataset and analytics calculations against stored reports.
- **Member 4 — frontend:** React/Vite/Tailwind UI and API integration.
- **Member 5 — testing, documentation, and pitch:** test coverage, user/developer documentation, and pitch materials.

Owners should make implementation changes within their module. Shared contracts and cross-module files require coordination in the team channel/PR before changing them. Do not overwrite another member's in-progress work or independently recreate their module.

## Collaboration and integration

- Read and follow `docs/API_CONTRACT.md`; propose contract edits there first and notify all affected owners.
- Keep changes focused and commit frequently so integration can happen incrementally.
- Open reviewable pull requests; review for contract compatibility, clear setup instructions, and working integration.
- Resolve conflicts with the file owner. Never force-push or delete teammates' branches.
- Keep secrets in local `.env` files; commit only `.env.example` with placeholder values.
- Report the exact commands and checks run with each integration change.

## Module boundaries

- `shared/` contains cross-module types/constants and must remain implementation-light.
- `client/` owns presentation and API consumption; it does not connect directly to MongoDB.
- `server/` owns validation, business rules, matching, and persistence.
- Analytics and seed data should use the same report model and database as the API.
