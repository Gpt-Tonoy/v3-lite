import { useState } from "react";

export default function App() {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMsg = async () => {
    if (!input.trim()) return;
    const newChat = [...chat, { role: "user", content: input }];
    setChat(newChat);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_WORKER_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newChat }),
      });
      const data = await res.json();
      setChat([...newChat, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setChat([...newChat, { role: "assistant", content: "Error: " + e.message }]);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-3xl font-bold text-center mb-4">V3-Lite</h1>
      <div className="max
