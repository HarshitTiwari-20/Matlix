# HTTP backend

Express 5 API for registration, login, and the authenticated `/me` endpoint.
See the [root README](../../README.md) for architecture, environment setup, and
the full API contract.

```bash
cp .env.example .env
bun run dev      # http://localhost:3001
bun run test
bun run check-types
```
