# Lawncare Lead Capture Page

A mobile-first quote request page for QR flyers and door knocking.

## Setup

1. Run the SQL you created for the `lawncare_leads` table in Supabase.
2. Copy `.env.example` to `.env`.
3. Add your Supabase project URL and anon key.
4. Install and run:

```bash
npm install
npm run dev
```

## Deploy

Deploy to Vercel or Netlify as a Vite app.

## QR tracking examples

Use URLs like:

```txt
https://yourdomain.com/?source=qr_flyer&campaign=june_route&route=racetrack
https://yourdomain.com/?source=door_knock&campaign=june_2026&neighborhood=green_acres
```

These values are saved with the lead.
