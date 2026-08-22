import { useState } from "react";

export default function App() {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://v3-lite-api.xxx.workers.dev";

  const sendMsg = async () => {
    if (!input.trim()) return;
    const newChat = [...chat, { role: "user", content: input }];
    setChat(newChat);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${WORKER_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newChat }),
      });
      const data = await res.json();
      setChat([...newChat, { role: "assistant", content: data.reply || "No reply" }]);
    } catch (e) {
      setChat([...newChat, { role: "assistant", content: "Error: " + e.message }]);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex-col">
      <h1 className="text-3xl font-bold text-center p-4 border-b border-gray-700">V3-Lite</h1>
      
      <div className="flex-1 overflow-y-auto p-4 max-w-3xl w-full mx-auto">
        {chat.length === 0 && <p className="text-center text-gray-400 mt-10">hi V3 লিখে Send করো</p>}
        {chat.map((m, i) => (
          <div key={i} className={`p-3 my-2 rounded-lg ${m.role === "user" ? "bg-blue-600 ml-12" : "bg-gray-700 mr-12"}`}>
            <b>{m.role === "user" ? "You" : "V3"}:</b> {m.content}
          </div>
        ))}
        {loading && <p className="text-gray-400">V3 typing...</p>}
      </div>

      <div className="p-4 border-t border-gray-700 max-w-3xl w-full mx-auto flex gap-2">
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMsg()}
          placeholder="Message V3..." 
          className="flex-1 p-3 rounded-lg bg-gray-800 outline-none"
        />
        <button onClick={sendMsg} className="px-6 py-3 bg-blue-600 rounded-lg font-bold hover:bg-blue-700">Send</button>
      </div>
    </div>
  );
}
