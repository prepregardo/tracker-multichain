import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pg from 'pg';

const app = express();
const PORT = process.env.PORT || 3000;
const BASE = '/pre-is-the-greatest';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();

app.use(express.json());
app.use(session({ secret: process.env.SESSION_SECRET || 'dev-secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser((u, cb) => cb(null, u));
passport.deserializeUser((u, cb) => cb(null, u));

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${BASE}/auth/google/callback`
  }, (_at, _rt, profile, cb) => {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    cb(null, { id: profile.id, email, role: email === ADMIN_EMAIL ? 'admin' : 'user' });
  }));
}

const hasDb = !!process.env.DATABASE_URL;
const pool = hasDb ? new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }) : null;
const mem = { wallets: [], tokens: [], txs: [] };

async function initDb() {
  if (!pool) return;
  await pool.query(`
    create table if not exists wallets (id serial primary key, network text not null, address text not null, label text, unique(network,address));
    create table if not exists tokens (id serial primary key, network text not null, contract text not null, symbol text not null, unique(network,contract));
  `);
}

function authRequired(req, res, next) {
  if (!process.env.GOOGLE_CLIENT_ID) return next();
  if (!req.user) return res.status(401).json({ error: 'login required' });
  next();
}

app.get(BASE + '/health', (_req, res) => res.json({ ok: true, base: BASE, trcProvider: 'tronscan', ercProvider: 'etherscan-v2' }));
app.get(BASE + '/api/me', (req, res) => res.json({ email: req.user?.email || null, role: req.user?.role || 'guest' }));

app.get(BASE + '/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get(BASE + '/auth/google/callback', passport.authenticate('google', { failureRedirect: BASE + '/' }), (_req, res) => res.redirect(BASE + '/'));
app.get(BASE + '/auth/logout', (req, res) => req.logout(() => res.redirect(BASE + '/')));

app.get(BASE + '/api/wallets', authRequired, async (_req, res) => {
  if (!pool) return res.json(mem.wallets);
  const r = await pool.query('select network,address,label from wallets order by id desc limit 200');
  res.json(r.rows);
});
app.post(BASE + '/api/wallets', authRequired, async (req, res) => {
  const { network, address, label } = req.body || {};
  if (!network || !address) return res.status(400).json({ error: 'network/address required' });
  if (!pool) { mem.wallets.unshift({ network, address, label }); return res.json({ ok: true }); }
  await pool.query('insert into wallets(network,address,label) values($1,$2,$3) on conflict do nothing', [network, address, label || null]);
  res.json({ ok: true });
});

app.get(BASE + '/api/tokens', authRequired, async (_req, res) => {
  if (!pool) return res.json(mem.tokens);
  const r = await pool.query('select network,contract,symbol from tokens order by id desc limit 200');
  res.json(r.rows);
});
app.post(BASE + '/api/tokens', authRequired, async (req, res) => {
  const { network, contract, symbol } = req.body || {};
  if (!network || !contract || !symbol) return res.status(400).json({ error: 'network/contract/symbol required' });
  if (!pool) { mem.tokens.unshift({ network, contract, symbol }); return res.json({ ok: true }); }
  await pool.query('insert into tokens(network,contract,symbol) values($1,$2,$3) on conflict do nothing', [network, contract, symbol]);
  res.json({ ok: true });
});

app.get(BASE + '/api/transactions', authRequired, async (_req, res) => {
  res.json(mem.txs.slice(0, 100));
});

app.get(BASE + '/api/reconciliation/run', authRequired, async (_req, res) => {
  res.json({ ok: true, status: 'stub', message: 'Reconciliation endpoint wired. Full logic in next iteration.' });
});

app.use(BASE, express.static('public'));
app.get(BASE + '/*', (_req, res) => res.sendFile(process.cwd() + '/public/index.html'));
app.get('/', (_req, res) => res.redirect(BASE + '/'));

await initDb();
app.listen(PORT, () => console.log(`tracker running on :${PORT}${BASE}`));
