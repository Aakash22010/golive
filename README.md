# MeetNotes

A secure, self-hostable web app with **video calls (with recording)**, **private notes**, and **admin/user roles**.

- **Frontend + API:** Next.js 14 (App Router), TypeScript, Tailwind — deploys on **Vercel**
- **Auth + Database + Storage:** Supabase (Postgres + Auth + S3-compatible Storage)
- **Video + Recording:** LiveKit (WebRTC SFU + server-side Egress recording)

The browser never sees any secret. Media flows through LiveKit, not through your server, so this runs fine on Vercel's serverless platform.

---

## Architecture at a glance

```
Browser ──login──────────────▶ Supabase Auth (cookie session)
   │
   ├─ POST /api/livekit/token ─▶ Next.js (verifies session) ─▶ mints LiveKit JWT
   │                                                            (API secret stays server-side)
   ├─ WebRTC media ────────────▶ LiveKit Cloud  (SFU; never touches your server)
   │
   ├─ start/stop recording ────▶ Next.js ─▶ LiveKit Egress ─▶ records to Supabase Storage (S3)
   │                                          │
   │                          LiveKit webhook ─▶ /api/livekit/webhook ─▶ updates recordings row
   │
   ├─ notes  (direct, RLS) ────▶ Supabase Postgres  (owner-only Row Level Security)
   └─ watch recording ─────────▶ Next.js generates a signed Storage URL (1h)
```

Why these choices, briefly: a hand-rolled WebRTC stack needs a signaling server (which Vercel can't host persistently) plus your own TURN server, and server-side recording of a group call is hard to get right. LiveKit handles the SFU, NAT traversal, and recording, and is open-source so you can move it onto your own server later without changing app code.

---

## Prerequisites

- Node.js 18.18+ (or 20+) and npm
- A free **Supabase** project — https://supabase.com
- A free **LiveKit Cloud** project (the "Build" tier needs no card) — https://cloud.livekit.io

---

## 1. Install

```bash
npm install
cp .env.example .env.local
```

## 2. Supabase setup

1. Create a project. From **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` *(secret — server only)*
2. **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the tables, RLS policies, and the trigger that auto-creates a profile on signup.
3. **Storage → Create bucket** named `recordings`. Keep it **Private**.
4. **Project Settings → Storage → S3 Connection**: enable it and create access keys. Copy:
   - endpoint → `S3_ENDPOINT` (looks like `https://<project>.supabase.co/storage/v1/s3`)
   - region → `S3_REGION` (e.g. `us-east-1`)
   - access key id → `S3_ACCESS_KEY`
   - secret access key → `S3_SECRET_KEY`
   - `S3_BUCKET=recordings`
5. **Auth → Providers → Email**: for quick local testing you can turn **"Confirm email" off**. Leave it **on** for production.

## 3. LiveKit setup

1. Create a project at https://cloud.livekit.io.
2. **Settings → Keys**: copy the API Key/Secret and the WebSocket URL.
   - `NEXT_PUBLIC_LIVEKIT_URL` = `wss://<your-project>.livekit.cloud`
   - `LIVEKIT_HOST` = `https://<your-project>.livekit.cloud`
   - `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
3. **Settings → Webhooks**: add a webhook pointing to
   `https://YOUR_DOMAIN/api/livekit/webhook` *(set this after you deploy; for local testing you can use a tunnel like `cloudflared` or `ngrok`).*

## 4. Run

```bash
npm run dev
```

Open http://localhost:3000, create an account, and you're in as a normal **user**.

### Make yourself an admin

The first admin is promoted manually (so nobody can self-promote). In Supabase **SQL Editor**:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Reload the app — you'll now see the **Admin** tab and can promote others from the UI.

---

## Deploying to Vercel

1. Push this folder to a **GitHub** repo (`.env.local` is gitignored, so no secrets leak).
2. Import the repo at https://vercel.com.
3. In **Project Settings → Environment Variables**, add **every** variable from `.env.example` with your real values. Set `NEXT_PUBLIC_SITE_URL` to your Vercel domain.
4. Deploy. Then update the LiveKit webhook URL to your live domain.

> Render works too (Web Service, build `npm run build`, start `npm run start`). The app is platform-agnostic — anywhere that runs Next.js will do.

---

## How the features work

- **Roles** — `profiles.role` is `user` or `admin`. Enforced three ways: Postgres RLS, server-side guards (`requireAdmin`), and the admin route uses the service-role key only *after* an admin check.
- **Video** — `/rooms` lists/creates rooms; `/room/[slug]` joins. The client asks `/api/livekit/token`, which verifies the session and mints a 1-hour scoped JWT. Admins additionally get `roomAdmin` (mute/remove participants).
- **Notes** — `/notes`, owner-only via RLS. Even an admin can't read another user's notes (by design — change the policy if you want otherwise).
- **Recording** — "Record call" starts a LiveKit Egress composite that writes an MP4 to your `recordings` bucket. When egress ends, LiveKit calls the webhook, which updates the row to `completed` with the file key and duration. `/recordings/[id]` plays it via a short-lived signed URL.

---

## Security notes & hardening checklist

Built-in:
- Secrets are server-only; the client uses just the anon key + minted tokens.
- Row Level Security on every table; recordings are written only by the server.
- LiveKit webhook is signature-verified, not cookie-authed.
- Session validated with `getUser()` (not just `getSession()`) in guards and middleware.
- Inputs validated with zod; room names are restricted to a safe charset.
- Admins can't demote themselves and lock everyone out.

Before you trust it in production, also do:
- [ ] Keep email confirmation **on** in Supabase Auth.
- [ ] Add **rate limiting** to `/api/livekit/token` and the recording routes (e.g. Upstash Ratelimit) to prevent token/recording abuse.
- [ ] Decide who may start recordings — currently any authenticated user can. To restrict to admins, change `requireUser()` to `requireAdmin()` in `recordings/start/route.ts` and hide the button for non-admins.
- [ ] Tighten the `recordings` and `profiles` SELECT policies if your group isn't fully trusted.
- [ ] Set security headers / CSP in `next.config.mjs`.
- [ ] Rotate the LiveKit and Supabase keys if they were ever pasted anywhere shared.
- [ ] Review LiveKit free-tier limits (minutes/egress) so recordings don't silently stop.

---

## Notes on versions

The **Egress S3 output** in `src/lib/livekit.ts` is the most version-sensitive code. If `npm install` pulls a `livekit-server-sdk` whose API differs, check the current Egress docs: https://docs.livekit.io/home/egress/ . Everything else is stable across recent versions.

This is a solid, secure-by-design starting point — not a substitute for testing with your own credentials. I couldn't run it in your environment, so do a local smoke test of each feature before deploying.
