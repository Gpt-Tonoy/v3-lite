# V3-Lite (Full) — Text + Image + Voice + Code Runner
### (100% Cloudflare — Frontend + Backend একই Worker-এ, একই ডোমেইনে)

## Architecture
এখন একটাই Cloudflare Worker সব কিছু করে:
- `env.ASSETS.fetch(request)` → React build (`dist/`) serve করে (তোমার চ্যাট UI)
- `/chat`, `/vision`, `/stt`, `/tts` পাথে রিকোয়েস্ট এলে → API হ্যান্ডেল করে (`worker.js`-এর ভিতরে)

Frontend আর Backend এক domain-এ থাকায় আলাদা কোনো URL বসাতে হয় না, CORS ঝামেলাও নেই।

---

## STEP 1 — API Keys সংগ্রহ করো
| Key | কোথা থেকে |
|---|---|
| `GROQ_API_KEY` | console.groq.com (ফ্রি) |
| `GEMINI_API_KEY` | aistudio.google.com/apikey (ফ্রি, দিনে ১৫০০ রিকোয়েস্ট) |
| `ELEVENLABS_API_KEY` | elevenlabs.io (ফ্রি টিয়ার: মাসে ১০,০০০ ক্যারেক্টার) |

---

## STEP 2 — GitHub-এ পুরো ফোল্ডার push করো
এই repo-তে `wrangler.jsonc` ফাইলটা **repo root**-এ থাকতে হবে (এটাই আগের এররের আসল ফিক্স — এই ফাইল ছাড়া Cloudflare ভুল ধরনের deploy কমান্ড অটো-জেনারেট করে ফেলে)।

```
your-repo/
├── wrangler.jsonc      ← নতুন, গুরুত্বপূর্ণ
├── worker.js
├── package.json
├── vite.config.js
├── index.html
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   └── index.css
└── ...
```

---

## STEP 3 — Cloudflare Workers Builds প্রজেক্ট সেটআপ / ফিক্স করো

তোমার আগের প্রজেক্ট থাকলে সেটাই ব্যবহার করবে, শুধু Settings ঠিক করে দাও:

1. `dash.cloudflare.com` → **Workers & Pages** → তোমার প্রজেক্টে ঢোকো
2. **Settings → Build** এ যাও, এই ৩টা ফিল্ড চেক করো:
   - **Build command**: `npm install && npm run build`
   - **Deploy command**: `npx wrangler deploy` ← **এখান থেকে `--x-versions` বাদ দিয়ে দাও।** এটাই এররের কারণ ছিল, নতুন wrangler ভার্সনে এই flag নেই।
   - **Build output directory**: `dist` (auto-detect হয়ে যাবে যেহেতু `wrangler.jsonc`-তে assets directory বলা আছে)
3. **Settings → Variables and Secrets** এ গিয়ে ৩টা Secret যোগ করো (Encrypt টিক দিয়ে):
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY`
   - `ELEVENLABS_API_KEY`
4. **Save** করো, তারপর **Retry deployment** বা নতুন commit push করো

---

## STEP 4 — টেস্ট করো
Deploy হয়ে গেলে যে URL পাবে (যেমন `https://v3-lite.xxxx.workers.dev`) সেটা খুললেই সরাসরি চ্যাট UI দেখাবে — কোনো আলাদা `VITE_WORKER_URL` সেট করার দরকার নেই, কারণ Frontend নিজেই নিজের origin-এ (`/chat`, `/vision` ইত্যাদি) রিকোয়েস্ট পাঠায়।

---

## নিরাপত্তা নোট
- কোনো API key কখনো frontend কোডে (`src/`) বসাবে না — শুধু Worker Secrets-এ থাকবে।
- Free tier limits: Groq (~৩০ req/min), Gemini (১৫০০ req/day), ElevenLabs (১০k char/month)। একা ব্যবহারে যথেষ্ট।

---

## যদি আবার এরর আসে
Build log-এর পুরো টেক্সট পেস্ট করো — লাইন ধরে দেখে ফিক্স বলে দেব।
