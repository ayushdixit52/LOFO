# BLUE — Lost & Found, Reinvented

BLUE connects people who have lost or found an item. This repository is the shared application workspace for the five-person team.

## Stack

- **Client:** React, Vite, Tailwind CSS
- **Server:** Node.js, Express, Mongoose
- **Database:** MongoDB

## Project layout

```text
client/   React and Vite application (Member 4)
server/   Express API, persistence, and matching (Member 2)
shared/   Contracts used by both client and server
docs/     API, architecture, and collaboration documentation
```

## Getting started

1. Copy `.env.example` to `.env` and set `MONGODB_URI` and `CLIENT_ORIGIN`.
2. Install dependencies in the client and server packages once their package manifests are added.
3. Start the API and Vite development server using the scripts in those package manifests.

The API listens on `/api`; the Vite client should use `VITE_API_BASE_URL` to reach it. See [the API contract](docs/API_CONTRACT.md) before implementing or consuming endpoints.

## Team ownership

See [Team Guidelines](docs/TEAM_GUIDELINES.md) for module ownership and integration expectations, and [Architecture](docs/ARCHITECTURE.md) for the shared design.
# LOFO
