// V3-Lite Backend — Cloudflare Worker
// সবগুলো API key এখানে (Worker Secrets) লুকানো থাকে। Frontend কখনো সরাসরি
// Groq/Gemini/ElevenLabs কল করে না।

const SYSTEM_PROMPT = `You are V3-Lite, a helpful and expert coding assistant.
- Reply in the same language the user used (Bangla or English).
- Use markdown code blocks with correct language tags for code.
- Explain briefly, step by step, after showing code.
- Keep answers concise unless asked for detail.`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function handleChat(request, env) {
  const { messages } = await request.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: "messages array লাগবে" }, 400);
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.2,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) return json({ error: "Groq error", detail: await res.text() }, res.status);
  const data = await res.json();
  return json({ reply: data.choices?.[0]?.message?.content ?? "" });
}

async function handleVision(request, env) {
  const { prompt, imageBase64, mimeType } = await request.json();
  if (!imageBase64) return json({ error: "imageBase64 লাগবে" }, 400);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt || "এই ছবিতে কী আছে ব্যাখ্যা করো" },
              { inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } },
            ],
          },
        ],
      }),
    }
  );

  if (!res.ok) return json({ error: "Gemini error", detail: await res.text() }, res.status);
  const data = await res.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return json({ reply });
}

async function handleSTT(request, env) {
  const { audioBase64, mimeType } = await request.json();
  if (!audioBase64) return json({ error: "audioBase64 লাগবে" }, 400);

  const bytes = base64ToBytes(audioBase64);
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mimeType || "audio/webm" }), "audio.webm");
  form.append("model", "whisper-large-v3-turbo");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: form,
  });

  if (!res.ok) return json({ error: "Whisper error", detail: await res.text() }, res.status);
  const data = await res.json();
  return json({ text: data.text ?? "" });
}

async function handleTTS(request, env) {
  const { text } = await request.json();
  if (!text) return json({ error: "text লাগবে" }, 400);

  // ElevenLabs default voice ID (Rachel) — চাইলে নিজের পছন্দের voice ID বসাও
  const VOICE_ID = env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    return json({ error: "ElevenLabs error", detail: await res.text() }, res.status);
  }

  return new Response(res.body, {
    headers: { "Content-Type": "audio/mpeg", ...CORS_HEADERS },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    try {
      if (request.method === "POST" && url.pathname === "/chat") return await handleChat(request, env);
      if (request.method === "POST" && url.pathname === "/vision") return await handleVision(request, env);
      if (request.method === "POST" && url.pathname === "/stt") return await handleSTT(request, env);
      if (request.method === "POST" && url.pathname === "/tts") return await handleTTS(request, env);
      return json({ error: "Not found. Use /chat, /vision, /stt, or /tts" }, 404);
    } catch (err) {
      return json({ error: "Server error", detail: String(err) }, 500);
    }
  },
};
