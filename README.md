# V3-Lite (Full) — Text + Image + Voice + Code Runner

## যা আছে
- **Frontend**: React + Tailwind (Vite) → Vercel-এ deploy হবে
- **Backend**: 1টা Cloudflare Worker (`worker.js`), 4টা route:
  - `/chat` → Groq (Llama 3.3 70B) দিয়ে টেক্সট চ্যাট
  - `/vision` → Gemini 1.5 Flash দিয়ে ছবি বোঝা
  - `/stt` → Groq Whisper দিয়ে ভয়েস → টেক্সট
  - `/tts` → ElevenLabs দিয়ে টেক্সট → ভয়েস
- **Code Runner**: চ্যাটে যেকোনো code block-এর পাশে "▶ Run" বাটন — সরাসরি ফ্রি Piston API কল করে (key লাগে না)

---

## STEP 1 — API Keys সংগ্রহ করো
| Key | কোথা থেকে |
|---|---|
| `GROQ_API_KEY` | console.groq.com (ফ্রি, কার্ড লাগবে না) |
| `GEMINI_API_KEY` | aistudio.google.com/apikey (ফ্রি, দিনে ১৫০০ রিকোয়েস্ট) |
| `ELEVENLABS_API_KEY` | elevenlabs.io (ফ্রি টিয়ার: মাসে ১০,০০০ ক্যারেক্টার) |

---

## STEP 2 — Backend Deploy (Cloudflare Workers)
1. `dash.cloudflare.com` → **Workers & Pages** → **Create Worker** → নাম দাও (যেমন `v3-lite-api`) → Deploy
2. **Edit Code** → পুরনো কোড মুছে `worker.js`-এর কনটেন্ট পেস্ট করো → Save and Deploy
3. **Settings → Variables and Secrets** এ গিয়ে ৩টা Secret যোগ করো (Encrypt টিক দিয়ে):
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY`
   - `ELEVENLABS_API_KEY`
4. উপরের Worker URL কপি করে রাখো (যেমন `https://v3-lite-api.xxxx.workers.dev`)

---

## STEP 3 — Frontend Deploy (Vercel)
1. এই পুরো ফোল্ডার (`package.json`, `src/`, `index.html`, ইত্যাদি) একটা নতুন GitHub repo-তে push করো
   - মোবাইল থেকে হলে: GitHub app দিয়ে repo বানিয়ে ফাইলগুলো "Add file → Upload files" দিয়ে আপলোড করো
2. `vercel.com` → **Add New Project** → GitHub repo সিলেক্ট করো
3. Framework auto-detect হবে "Vite" — কিছু বদলাতে হবে না
4. **Environment Variables** সেকশনে যোগ করো:
   - `VITE_WORKER_URL` = STEP 2-এর Worker URL
5. **Deploy** চাপো — ২-৩ মিনিটে লিংক পাবে (যেমন `https://v3-lite.vercel.app`)

---

## নিরাপত্তা নোট
- কোনো API key কখনো frontend কোডে (`src/`) বসাবে না — শুধু Worker Secrets-এ থাকবে।
- `VITE_WORKER_URL` frontend-এ থাকা নিরাপদ কারণ এটা শুধু তোমার Worker-এর ঠিকানা, কোনো সিক্রেট কী না।
- Free tier limits: Groq (~৩০ req/min), Gemini (১৫০০ req/day), ElevenLabs (১০k char/month)। একা ব্যবহারে যথেষ্ট।

---

## লোকাল টেস্ট (যদি PC/টার্মিনাল থাকে)
```
npm install
npm run dev
```
`.env` ফাইলে `.env.example`-এর মতো `VITE_WORKER_URL` বসিয়ে নাও।

মোবাইল থেকে শুধু deploy করলেও চলবে — লোকাল রান করার দরকার নেই।
