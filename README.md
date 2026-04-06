# Errolian Club

Minimal private members app for the Errolian Club.

Current priority: a clean Google sign-in flow where only approved members in Supabase can enter.

## Stack

- Vite + React
- Supabase Auth for Google login
- Existing Supabase `users` table for access control

## Principle

Keep the app small.

- No custom auth server
- No complex routing yet
- No Tailwind yet
- One clear gate: Google sign-in, then check `users`

Tailwind can come later if we genuinely need a design system. Right now, plain CSS keeps the codebase smaller and easier to reason about.

## How Access Works

1. Member clicks `Continue with Google`
2. Supabase handles Google OAuth
3. App receives the signed-in session
4. App checks `public.users` for the signed-in email
5. Access is granted only if:
   - the email exists
   - `is_active = true`

## Required Environment Variables

Create `.env` from `.env.example`.

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase Setup

### 1. Existing `users` table

The app assumes your `users` table already exists with this shape:

| column | type | notes |
| --- | --- | --- |
| id | bigint | identity primary key |
| email | text | unique, required |
| first_name | text | optional |
| last_name | text | optional |
| role | text | optional |
| boc | boolean | board of command flag |
| is_active | boolean | access gate |
| created_at | timestamptz | defaults to now |

### 2. Add your Google OAuth provider in Supabase

In Supabase:

- Go to `Authentication` -> `Providers` -> `Google`
- Enable Google
- Paste your Google OAuth `Client ID`
- Paste your Google OAuth `Client Secret`

The client ID you shared is only half of what Supabase needs. You also need the matching client secret from Google Cloud.

### 3. Configure redirect URLs

In Supabase Auth URL settings, add:

- `http://localhost:5173`
- your future production URL, for example `https://your-app.vercel.app`

In Google Cloud, add the same app URL(s) where appropriate, plus the Supabase callback URL shown in the Google provider setup screen.

## What You Need From Google

You asked whether the client ID is enough.

You need:

- Google OAuth Client ID
- Google OAuth Client Secret
- Supabase project URL
- Supabase anon key

You do not need to put the Google client ID directly in the React app when using Supabase Auth this way. Supabase manages the OAuth exchange.

## Local Development

```bash
npm install
npm run dev
```

## Deploying Cheaply

Vercel is a sensible first choice.

Simple deployment shape:

1. Push repo to GitHub
2. Import project into Vercel
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. Add your Vercel URL to Supabase redirect URLs
5. Add the same production URL to Google OAuth settings if needed

That keeps hosting simple and cheap while Supabase handles auth.

## Current App Behaviour

- Signed-out users see a Google sign-in screen
- Signed-in users are checked against `users`
- Approved members see the app shell
- Unknown or inactive users are denied

## Google Sheets

Your edge function approach is still fine for later, but it is not the first thing to solve.

First milestone:

- secure sign-in
- membership check
- working shell

Then we can connect the rest of the app behind that gate.
