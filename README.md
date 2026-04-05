# Ygdrassil Dungeon (Co-op Dungeon Crawler MVP)

Browser-based co-op turn-based dungeon crawler inspired by Etrian-style party runs.

## MVP Features

- Room-based co-op (create/join, ready check, host starts run)
- 4 classes (`Guardian`, `Ranger`, `Mystic`, `Rogue`)
- Server-authoritative turn-based combat over Socket.IO
- Dungeon run with 5 floors and 2 boss encounters
- Reward + profile progression loop (currency, XP, unlocks)
- Reconnect-friendly sessions via `playerId` persistence

## Tech Stack

- `client/`: Phaser + Vite + Socket.IO client
- `server/`: Express + Socket.IO + TypeScript
- `shared/`: shared domain/protocol/combat types
- Optional PostgreSQL (`server/src/db/schema.sql`) for persistence

## Local Development

1. Install dependencies:
   - `npm install`
2. Start server:
   - `npm run dev:server`
3. Start client:
   - `npm run dev:client`
4. Open the client URL shown by Vite.

Copy environment templates if needed:

- `server/.env.example` -> `server/.env`
- `client/.env.example` -> `client/.env`

## Controls (Current Client)

- Login scene:
  - `N` choose display name
  - `Enter` continue
- Party setup:
  - `1/2/3/4` select class
  - `Enter` continue
- Lobby:
  - `C` create room
  - `J` join room by ID
  - `R` toggle ready
  - `S` start run (host)
- Combat:
  - `A` submit basic attack

## Quality Checks

- `npm run typecheck`
- `npm run lint`
- `npm run test`

## Online Deployment

### Option A: Docker Compose (single host)

- `docker compose up --build`
- Client: `http://localhost:8080`
- Server: `http://localhost:3000`

### Option B: Managed cloud split

- Deploy `server/` container to Railway/Render/Fly with env vars:
  - `PORT`
  - `CORS_ORIGIN`
  - `DATABASE_URL` (optional but recommended)
- Deploy `client/` static bundle to Netlify/Vercel/Cloudflare Pages with:
  - `VITE_SERVER_URL=https://<your-server-domain>`

## Important Code Locations

- Shared protocol: `shared/src/protocol.ts`
- Combat model helpers: `shared/src/combat.ts`
- Combat engine: `server/src/game/combatEngine.ts`
- Dungeon generation: `server/src/game/dungeonGenerator.ts`
- Room lifecycle: `server/src/net/roomManager.ts`
- Socket gateway: `server/src/net/socketGateway.ts`
