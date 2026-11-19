# Table for Two 🍜💕

A shared food diary for two: places you've eaten together (with both of your scores,
notes and date memories) and places you're dying to try.

## Features
- **Been together / Want to try** status, with a "We went!" button that turns a wishlist spot into a memory
- **Two scores per place** (one each, out of 10) and a combined score
- **Notes from each of you**, must-order dishes, Google Maps link, date visited, and a **date memory**
- **"Me too" hearts** on wishlist spots, so you can see which ones you *both* want
- **Our spots ♥** for your forever favourites
- **🎲 Where should we eat tonight?** picks from the wishlist (spots you both want get extra chances)
- Stats: dates eaten, taste-match %, and who's the tougher critic
- Search, filter by area / cuisine / who added it, sort by newest, top rated, recent, or biggest disagreement
- Names and "together since" date are editable in the app (**us ⚙︎**)
- Private: protected by one shared secret word; each phone remembers who's who

## Deploy on Vercel (free)
1. Push this folder to a GitHub repo, then on vercel.com: **Add New → Project → import the repo**.
2. In the project: **Storage → Create Database → Upstash for Redis** (free tier) → connect it to the project.
   This adds `KV_REST_API_URL` / `KV_REST_API_TOKEN` automatically.
3. **Settings → Environment Variables**: add `APP_PASSCODE` = your shared secret word.
4. **Redeploy**. Open the site, type the secret word, pick who you are, and start adding spots.

## Run locally
```bash
npm install
npm run dev          # no database needed; saves to .data/db.json
```
Set `APP_PASSCODE` to test the lock screen locally.
