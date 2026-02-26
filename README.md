# tracker-multichain

Single-service app for ERC20 + TRC20 operations.

## URL base
All routes start with:

`/pre-is-the-greatest`

## Stack
- Node.js + Express
- Google OAuth
- PostgreSQL (Render)
- TRC20 provider: TronScan API only

## Env vars
Required in Render:
- `DATABASE_URL`
- `SESSION_SECRET`
- `ETHERSCAN_API_KEY`
- `TRONSCAN_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ADMIN_EMAIL` (e.g. Prepregardo@gmail.com)

## Run local
```bash
npm install
npm run dev
```
Open: `http://localhost:3000/pre-is-the-greatest`

## Render
- Build command: `npm install`
- Start command: `npm start`
- Add PostgreSQL and all env vars above.
