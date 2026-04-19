# Gold Rate Scraper — Delhi vs Malaysia

A live gold rate comparison app that **scrapes actual retail jeweller rates** from:

- **Delhi**: goodreturns.in, policybazaar.com (22KT per gram in INR)
- **Malaysia**: goldenchennai.com, livepriceofgold.com (22KT per gram in MYR)
- **FX rates**: open.er-api.com, frankfurter.app (USD→MYR, USD→INR)

All 3 sources have fallback chains — if one fails, the next is tried. If all fail, cached values from 19 April 2026 are shown.

## Project structure

```
gold-scraper/
├── api/
│   └── rates.js         ← Vercel Edge Function (scraper)
├── public/
│   └── index.html       ← Frontend (reads /api/rates)
├── package.json
├── vercel.json
└── README.md
```

## Deploy to Vercel (5 minutes, free)

### Step 1 — Install Vercel CLI (one time)
```bash
npm install -g vercel
```

### Step 2 — Deploy
```bash
cd gold-scraper
vercel
```
Follow the prompts:
- Log in with GitHub/Google/email
- When asked "Set up and deploy?" → Yes
- "Which scope?" → your account
- "Link to existing project?" → No
- "Project name?" → gold-scraper (or whatever)
- "In which directory?" → `.` (current)
- Vercel auto-detects everything

After ~30 seconds you'll get a URL like `https://gold-scraper-abc123.vercel.app`

### Step 3 — Open it
Visit the URL in any browser. The scraper runs, returns JSON, and the HTML displays the comparison. Every page load triggers a fresh scrape (but Vercel caches responses for 6 hours to avoid hammering source sites).

### Step 4 — Redeploy for updates
```bash
vercel --prod
```

## Alternative: Deploy via GitHub

1. Push this folder to a GitHub repo
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repo → Deploy

Vercel auto-deploys on every push after that.

## Endpoints

- **`/`** — The dashboard UI
- **`/api/rates`** — Raw JSON endpoint you can use from anywhere:

```json
{
  "success": true,
  "timestamp": "2026-04-19T18:30:00.000Z",
  "date": "19 Apr 2026",
  "delhi":    { "city": "Delhi", "perGramINR": 14295, "source": "goodreturns.in" },
  "malaysia": { "country": "Malaysia", "perGramMYR": 581.0, "source": "goldenchennai.com" },
  "fx": { "usdToMyr": 3.97, "usdToInr": 92.61, "inrToMyr": 0.04288, "source": "er-api.com" },
  "errors": { "delhi": null, "malaysia": null }
}
```

You can call this from your iOS app too — just replace the hardcoded rates with a single fetch to `https://your-vercel-url.vercel.app/api/rates`.

## Caching

The Edge Function sets:
```
Cache-Control: public, s-maxage=21600, stale-while-revalidate=86400
```

Meaning: Vercel's CDN caches the JSON for 6 hours. After that, a background refresh happens while the user still gets stale data instantly. This stays within free tier limits.

## Cost

**Free forever** on Vercel Hobby plan:
- 100 GB bandwidth/month (plenty for personal use)
- 1 million edge function invocations/month
- Your app uses < 1 MB/month

## If scraping breaks

Source websites occasionally change their HTML. If the page shows cached values with a warning, open `api/rates.js` and update the regex patterns to match the new HTML structure. The patterns are clearly labeled under each source.
