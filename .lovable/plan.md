# Fix `www.cleanmykicks.com` SSL error (GoDaddy DNS)

The SSL error happens because `www` was never added as its own domain in Lovable, so no certificate was issued for it. We fix it in two places: add `www` in Lovable, then add the matching A record at GoDaddy.

## Step 1 — Add `www` in Lovable

1. Open **Project Settings → Project → Domains**.
2. Click **Connect Domain**.
3. Enter exactly: `www.cleanmykicks.com`
4. Lovable will show the DNS record it expects (an A record for host `www` → `185.158.133.1`).
5. Leave this tab open — you'll come back to verify.

Do not remove the existing apex `cleanmykicks.com` entry.

## Step 2 — Add the A record in GoDaddy

1. Sign in to GoDaddy → **My Products → Domains → cleanmykicks.com → DNS** (or "Manage DNS").
2. Before adding anything, look in the DNS records list for any existing record where **Type = A or CNAME** and **Name = www**.
   - If one exists (often a parked GoDaddy CNAME like `www → @`), **delete it**. A conflicting record will block verification and SSL.
3. Click **Add New Record** and enter:
   - **Type:** A
   - **Name / Host:** `www`
   - **Value / Points to:** `185.158.133.1`
   - **TTL:** 1 Hour (default is fine)
4. Save.

## Step 3 — Check CAA (only if present)

In the same GoDaddy DNS list, look for any **CAA** records.
- If there are none, skip this step (default is "any CA allowed", which is fine).
- If there are CAA records, make sure at least one allows Let's Encrypt:
  - Type: CAA, Name: `@`, Flag: `0`, Tag: `issue`, Value: `letsencrypt.org`
  - Without this, Lovable cannot issue the SSL cert.

## Step 4 — Wait and verify

1. DNS usually propagates in 5–30 minutes on GoDaddy (can take up to 72h).
2. Check propagation at https://dnschecker.org → enter `www.cleanmykicks.com`, type **A**, expect `185.158.133.1` worldwide.
3. Back in **Lovable → Domains**, the `www` entry should move: Verifying → Setting up → Active.
4. Once Active, visit `https://www.cleanmykicks.com` — the SSL error should be gone.

## Step 5 — Pick a primary (recommended)

In **Lovable → Domains**, set one of the two (apex or www) as **Primary**. The other will redirect to it. This keeps SEO clean and avoids duplicate-content issues. Most stores use the apex `cleanmykicks.com` as primary.

## Notes

- I am not making any code changes for this — it is purely a DNS + Lovable Domains configuration task you do in the GoDaddy and Lovable dashboards.
- If after ~1 hour the Lovable status is still **Verifying** or **Failed**, send me a screenshot of your GoDaddy DNS records and the Lovable Domains panel and I'll diagnose further.
- Once `www` is Active, I can optionally add an in-app `<link rel="canonical">` and a small redirect helper so search engines consistently see your chosen primary domain — say the word and I'll plan that as a follow-up.
