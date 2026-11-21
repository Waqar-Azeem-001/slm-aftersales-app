# SLM After-Sales App

Next.js app for SLM Tyres after-sales work — Phase 1: **claims, dealers/distributors, customers, Claim Summary and claim file reports**.

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000  (phone on same Wi-Fi: http://<your-pc-ip>:3000)
```

## Deploy on Vercel

1. vercel.com → **Add New → Project** → import `Waqar-Azeem-001/slm-aftersales-app`
2. Framework: Next.js (auto). No environment variables needed in Phase 1.
3. Deploy → you get `https://slm-aftersales-app.vercel.app` (or similar).

## What Phase 1 does

| Screen | Path | |
|---|---|---|
| Dashboard | `/` | totals, month/brand filters, by month / distributor / size, drafts banner |
| Claims | `/claims` | search + filters, Confirmed / Drafts tabs, Excel export (26-column format) |
| New claim | `/claims/new` | step 1 claim data: 6 photos + 4 extra, barcode + text reading fills fields (yellow = check), voice entry, duplicate warning · step 2: city, dealer checked, distributor by rule, customer, truck, driver → **Confirm** |
| Claim detail | `/claims/[id]` | photos, all fields, edit |
| Dealers | `/dealers` | by city, roles, brands each distributor covers, add/edit |
| Customers | `/customers` | details, vehicles, drivers, linked claims |
| Reports | `/reports` | Claim Summary PDF (claimable only), brand claim file Excel, backup |

### Rules built in (`lib/rules.ts`)
- ROADLUX anywhere → MYCO Corporation
- SUPERCARGO / LONGMARCH = SLM; Lahore SLM → Z & H Enterprises; Lahore STARLUX → Asif Brothers; S116 = STARLUX
- other cities → that city's distributor from the dealer list; asks when several or none
- Shoulder crack = Shoulder Separation = Claimable by default; other damages suggest Nonclaimable
- Happened Date = inspection date; Inspected By defaults to Waseem Akhtar
- Claim Summary lists only claimable tyres

### No AI service
Photo reading uses the browser's BarcodeDetector (Chrome/Android) and Tesseract.js OCR; voice uses the browser's speech recognition with keyword rules (`lib/voice.ts`). Nothing is final until **Confirm**.

## Data (Phase 1)

- Seed: `data/seed/*.json` — 244 claims from *Claim detail 30-10-2026*, dealers and customers from *User Details – Master*. Repo is private because this includes contact numbers.
- Changes are saved in the browser (localStorage, photos in IndexedDB). **Reports → Backup** downloads everything. Clearing browser data clears it.

## Phase 2: database on the hosting

`prisma/schema.prisma` is ready for MySQL. Steps when ready:
1. cPanel → MySQL Databases → create DB + user; enable **Remote MySQL** (Vercel's IPs change, so `%` or a proxy API)
2. `.env`: `DATABASE_URL="mysql://USER:PASS@HOST:3306/DB"` (also in Vercel → Settings → Environment Variables)
3. `npm i prisma @prisma/client && npx prisma db push`, import the seed, swap `lib/store.tsx` functions to API routes
4. Photos to hosting storage (or R2) instead of IndexedDB
