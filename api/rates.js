// api/rates.js — Vercel Edge Function (runs on-demand, cached for 6 hours)
// Scrapes Delhi + Malaysia retail 22KT gold rates + live FX rates

export const config = { runtime: 'edge' };

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ---------- DELHI 22KT retail rate ----------
async function scrapeDelhi() {
  const sources = [
    {
      url: 'https://www.goodreturns.in/gold-rates/delhi.html',
      name: 'goodreturns.in',
      patterns: [
        /₹\s*([\d,]+(?:\.\d+)?)\s*per\s*gram\s*for\s*22\s*karat/i,
        /22\s*karat[^₹]{0,80}₹\s*([\d,]+(?:\.\d+)?)\s*per\s*gram/i,
        /22k\s*Gold[^₹]*₹\s*([\d,]+(?:\.\d+)?)/i,
      ],
    },
    {
      url: 'https://www.policybazaar.com/gold-rate/delhi/',
      name: 'policybazaar.com',
      patterns: [
        /Rs\.?\s*([\d,]+(?:\.\d+)?)\s*per\s*gram\s*for\s*22\s*karat/i,
        /22\s*karat\s*gold.*?Rs\.?\s*([\d,]+(?:\.\d+)?)\s*per\s*gram/is,
      ],
    },
  ];

  for (const src of sources) {
    try {
      const res = await fetch(src.url, { headers: BROWSER_HEADERS });
      if (!res.ok) continue;
      const html = await res.text();
      for (const pattern of src.patterns) {
        const match = html.match(pattern);
        if (match) {
          const value = parseFloat(match[1].replace(/,/g, ''));
          if (value > 5000 && value < 30000) {
            return { value, source: src.name, url: src.url };
          }
        }
      }
    } catch (e) { continue; }
  }
  throw new Error('Delhi rate unavailable from all sources');
}

// ---------- MALAYSIA 22KT retail rate ----------
async function scrapeMalaysia() {
  const sources = [
    {
      url: 'https://rates.goldenchennai.com/malaysia-gold-rate-today/',
      name: 'goldenchennai.com',
      patterns: [
        // Table row: "<td>1g</td><td>MYR 579.00</td>" — match across HTML tags
        /1g[\s\S]{0,150}?MYR\s*([\d,]+(?:\.\d+)?)/i,
        // Trend text: "Market 22 Carat Gold rate today in Malaysia is MYR 579.00 per Gram"
        /22\s*Carat\s*Gold\s*rate\s*today\s*in\s*Malaysia\s*is\s*MYR\s*([\d,]+(?:\.\d+)?)/i,
      ],
    },
    {
      url: 'https://www.goodreturns.in/gold-rates/malaysia.html',
      name: 'goodreturns.in',
      patterns: [
        /22\s*(?:Carat|Karat|K)\s*Gold.*?MYR\s*([\d,]+(?:\.\d+)?)\s*(?:per\s*gram)?/i,
        /MYR\s*([\d,]+(?:\.\d+)?)\s*per\s*gram.*?22\s*(?:Carat|Karat)/is,
      ],
    },
    {
      url: 'https://www.livepriceofgold.com/22k-gold-price-malaysia.html',
      name: 'livepriceofgold.com (spot)',
      patterns: [
        /Malaysia\s*22K\s*gold\s*price\s*per\s*gram[:\s]*([\d,]+(?:\.\d+)?)/i,
        /22K[^0-9]{0,40}([\d,]+(?:\.\d+)?)\s*Malaysian\s*ringgit/i,
      ],
    },
  ];

  for (const src of sources) {
    try {
      const res = await fetch(src.url, { headers: BROWSER_HEADERS });
      if (!res.ok) continue;
      const html = await res.text();
      for (const pattern of src.patterns) {
        const match = html.match(pattern);
        if (match) {
          const value = parseFloat(match[1].replace(/,/g, ''));
          if (value > 100 && value < 2000) {
            return { value, source: src.name, url: src.url };
          }
        }
      }
    } catch (e) { continue; }
  }
  throw new Error('Malaysia rate unavailable from all sources');
}

// ---------- FX rates (USD → MYR, INR) ----------
async function fetchFX() {
  const sources = [
    { url: 'https://open.er-api.com/v6/latest/USD',
      name: 'er-api.com',
      parse: (j) => ({ myr: j.rates.MYR, inr: j.rates.INR }) },
    { url: 'https://api.frankfurter.app/latest?from=USD&to=MYR,INR',
      name: 'frankfurter.app',
      parse: (j) => ({ myr: j.rates.MYR, inr: j.rates.INR }) },
    { url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
      name: 'fawazahmed0',
      parse: (j) => ({ myr: j.usd.myr, inr: j.usd.inr }) },
  ];

  for (const src of sources) {
    try {
      const res = await fetch(src.url);
      if (!res.ok) continue;
      const j = await res.json();
      const fx = src.parse(j);
      if (fx.myr > 0 && fx.inr > 0) {
        return { ...fx, source: src.name };
      }
    } catch (e) { continue; }
  }
  return { myr: 3.97, inr: 92.61, source: 'cached-fallback' };
}

export default async function handler(request) {
  const url = new URL(request.url);
  const noCache = url.searchParams.has('nocache');

  const [delhi, malaysia, fx] = await Promise.allSettled([
    scrapeDelhi(),
    scrapeMalaysia(),
    fetchFX(),
  ]);

  const delhiData = delhi.status === 'fulfilled'
    ? delhi.value
    : { value: 14295, source: 'cached (19 Apr 2026)', url: null };

  const malaysiaData = malaysia.status === 'fulfilled'
    ? malaysia.value
    : { value: 581.00, source: 'cached (19 Apr 2026)', url: null };

  const fxData = fx.status === 'fulfilled'
    ? fx.value
    : { myr: 3.97, inr: 92.61, source: 'cached' };

  const payload = {
    success: delhi.status === 'fulfilled' && malaysia.status === 'fulfilled',
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    delhi: {
      city: 'Delhi',
      perGramINR: delhiData.value,
      source: delhiData.source,
    },
    malaysia: {
      country: 'Malaysia',
      perGramMYR: malaysiaData.value,
      source: malaysiaData.source,
    },
    fx: {
      usdToMyr: Number(fxData.myr.toFixed(4)),
      usdToInr: Number(fxData.inr.toFixed(4)),
      inrToMyr: Number((fxData.myr / fxData.inr).toFixed(6)),
      source: fxData.source,
    },
    errors: {
      delhi: delhi.status === 'rejected' ? String(delhi.reason) : null,
      malaysia: malaysia.status === 'rejected' ? String(malaysia.reason) : null,
    },
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': noCache
        ? 'no-cache, no-store, must-revalidate'
        : 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  });
}
