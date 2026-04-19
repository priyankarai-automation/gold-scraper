
# Gold Scraper — Delhi vs Malaysia (Vercel-ready)

## Project structure
```
gold-scraper/
├── api/
│   └── rates.js       ← Scraper endpoint (/api/rates)
├── index.html         ← Dashboard UI (served at /)
├── package.json
└── vercel.json
```

## Re-deploy steps (if you already deployed and got 404)

### Option A — Re-upload files to GitHub (easiest)
1. Go to your existing GitHub repo `gold-scraper`
2. Delete old files (click each file → trash icon)
3. Upload the new files from this zip:
   - `api/rates.js` (keep in api folder)
   - `index.html` (at root, NOT inside public/)
   - `package.json`
   - `vercel.json`
4. Commit changes
5. Vercel auto-redeploys in ~30 seconds
6. Visit your URL — it should work!

### Option B — Fresh deploy
1. Create new GitHub repo
2. Upload all these files
3. vercel.com/new → import → deploy

## Endpoints

- `/` → the dashboard
- `/api/rates` → raw JSON
