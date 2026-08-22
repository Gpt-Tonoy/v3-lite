import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import hljs from "highlight.js";

// Backend Worker URL — .env এ VITE_WORKER_URL সেট করো (deploy করার পর)
const WORKER_URL = import.meta.env.VITE_WORKER_URL || "http://localhost:8787";

marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
});

// Piston এর ভাষার নাম আমাদের markdown ট্যাগের সাথে ম্যাপ করা
const PISTON_LANG_MAP = {
  javascript: "javascript",
  js: "javascript",
  python: "python",
  py: "python",
  cpp: "cpp",
  "c++": "cpp",
  c: "c",
  java: "java",
  bash: "bash",
  sh: "bash",
  typescript: "typescript",
  ts: "typescript",
};

function CodeBlock({ lang, code }) {
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const runnable = PISTON_LANG_MAP[(lang || "").toLowerCase()];

  async function runCode() {
    setRunning(true);
    setOutput(null);
    try {
      const res = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: runnable,
          version: "*",
          files: [{ content: code }],
        }),
      });
      const data = await res.json();
      setOutput(data.run?.output || data.message || "কোনো আউটপুট নেই");
    } catch (err) {
      setOutput("Run error: " + err.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="my-2 rounded-lg overflow-hidden border border-line">
      <div className="flex items-center justify-between bg-[#0b0d12] px-3 py-1.5 text-xs text-gray-400 font-mono">
        <span>{lang || "code"}</span>
        {runnable && (
          <button
            onClick={runCode}
            disabled={running}
            className="text-accent hover:text-white transition disabled:opacity-50"
          >
            {running ? "চলছে..." : "▶ Run"}
          </button>
        )}
      </div>
      <pre className="!m-0 p-3 overflow-x-auto text-sm">
        <code
          className="font-mono"
          dangerouslySetInnerHTML={{
            __html: hljs.getLanguage(lang || "")
              ? hljs.highlight(code, { language: lang }).value
              : hljs.highlightAuto(code).value,
          }}
        />
      </pre>
      {output !== null && (
        <div className="bg-black/40 border-t border-line px-3 py-2 text-xs font-mono whitespace-pre-wrap text-green-300">
          {output}
        </div>
      )}
    </div>
  );
}

function MessageContent({ text }) {
  // markdown কে টুকরো করে code block গুলো আলাদা কম্পোনেন্ট হিসেবে রেন্ডার করা,
  // যাতে প্রতিটার নিজের Run বাটন থাকে
  const parts = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const chunk = text.slice(lastIndex, match.index);
      parts.push(
        <div
          key={key++}
          className="prose prose-invert prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: marked.parse(chunk) }}
        />
      );
    }
    parts.push(<CodeBlock key={key++} lang={match[1]} code={match[2]} />);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(
      <div
        key={key++}
        className="prose prose-invert prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: marked.parse(text.slice(lastIndex)) }}
      />
    );
  }
  return <>{parts}</>;
}

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "হাই! আমি **V3-Lite** 👋 টেক্সট, ছবি, বা ভয়েস — যেকোনোভাবে জিজ্ঞেস করো।",
    },
  ]);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState(null); // { file, previewUrl, base64 }
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleImagePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setPendingImage({ file, previewUrl: URL.createObjectURL(file), base64, mime: file.type });
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text && !pendingImage) return;

    setInput("");
    setLoading(true);

    const userMsg = { role: "user", content: text || "(ছবি পাঠানো হয়েছে)" };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);

    try {
      let reply;

      if (pendingImage) {
        // Vision endpoint — Gemini দিয়ে ছবি বিশ্লেষণ
        const res = await fetch(`${WORKER_URL}/vision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: text || "এই ছবিতে কী আছে ব্যাখ্যা করো",
            imageBase64: pendingImage.base64,
            mimeType: pendingImage.mime,
          }),
        });
        const data = await res.json();
        reply = data.reply || "⚠️ " + (data.error || "এরর হয়েছে");
        setPendingImage(null);
      } else {
        // সাধারণ টেক্সট চ্যাট — Groq
        const res = await fetch(`${WORKER_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await res.json();
        reply = data.reply || "⚠️ " + (data.error || "এরর হয়েছে");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Connection এরর: " + err.message },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const base64 = await fileToBase64(blob);
        setLoading(true);
        try {
          const res = await fetch(`${WORKER_URL}/stt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audioBase64: base64, mimeType: "audio/webm" }),
          });
          const data = await res.json();
          if (data.text) setInput((prev) => (prev ? prev + " " + data.text : data.text));
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      alert("মাইক্রোফোন এক্সেস দরকার: " + err.message);
    }
  }

  async function speakMessage(text, index) {
    setSpeakingIndex(index);
    try {
      const res = await fetch(`${WORKER_URL}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("TTS ব্যর্থ হয়েছে");
      const audioBlob = await res.blob();
      const url = URL.createObjectURL(audioBlob);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = url;
        audioPlayerRef.current.play();
        audioPlayerRef.current.onended = () => setSpeakingIndex(null);
      }
    } catch (err) {
      alert(err.message);
      setSpeakingIndex(null);
    }
  }

  return (
    <div className="h-screen flex flex-col max-w-2xl mx-auto">
      <header className="px-4 py-3 border-b border-line flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <h1 className="font-display font-semibold tracking-tight">V3-Lite</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 font-body text-[15px] leading-relaxed ${
                m.role === "user"
                  ? "bg-accent text-white rounded-br-sm"
                  : "bg-panel border border-line rounded-bl-sm"
              }`}
            >
              <MessageContent text={m.content} />
              {m.role === "assistant" && (
                <button
                  onClick={() => speakMessage(m.content, i)}
                  className="mt-1 text-xs text-gray-400 hover:text-accent transition"
                >
                  {speakingIndex === i ? "🔊 বলছে..." : "🔈 শোনো"}
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-xs text-gray-500 font-mono pl-1">V3-Lite ভাবছে...</div>
        )}
        <div ref={chatEndRef} />
      </div>

      {pendingImage && (
        <div className="px-4 py-2 border-t border-line flex items-center gap-2">
          <img src={pendingImage.previewUrl} className="w-10 h-10 object-cover rounded-lg" />
          <span className="text-xs text-gray-400">ছবি সংযুক্ত — মেসেজ লিখে Send চাপো</span>
          <button
            onClick={() => setPendingImage(null)}
            className="ml-auto text-xs text-gray-500 hover:text-red-400"
          >
            ✕
          </button>
        </div>
      )}

      <div className="px-3 py-3 border-t border-line flex items-end gap-2 bg-panel/50">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={handleImagePick}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 shrink-0 rounded-full border border-line flex items-center justify-center hover:border-accent transition"
          title="ছবি যোগ করো"
        >
          📷
        </button>
        <button
          onClick={toggleRecording}
          className={`w-10 h-10 shrink-0 rounded-full border flex items-center justify-center transition ${
            recording ? "border-red-500 bg-red-500/20 animate-pulse" : "border-line hover:border-accent"
          }`}
          title="ভয়েস ইনপুট"
        >
          🎙️
        </button>
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="কিছু জিজ্ঞেস করো..."
          className="flex-1 bg-ink border border-line rounded-2xl px-4 py-2.5 text-[15px] outline-none focus:border-accent resize-none max-h-32"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="w-10 h-10 shrink-0 rounded-full bg-accent flex items-center justify-center disabled:opacity-40"
          title="পাঠাও"
        >
          ➤
        </button>
      </div>
      <audio ref={audioPlayerRef} className="hidden" />
    </div>
  );
}
