# WebSocket backend

Matchmaking and live 1v1 math battles over WebSockets, backed by an in-memory
game engine. See the [root README](../../README.md) for the protocol and setup.

```bash
cp .env.example .env
bun run dev      # ws://localhost:8080
bun run test
bun run check-types
```
