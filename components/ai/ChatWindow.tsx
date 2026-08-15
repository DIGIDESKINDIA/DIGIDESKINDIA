"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, User, X } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

type Props = {
  onClose: () => void;
};

type Message = {
  role: "user" | "assistant";
  text: string;
};

export default function ChatWindow({ onClose }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text:
        "Hello. I am Manish, the DigiDesk India AI Assistant.\n\nI can help with Government Services, PDF Tools, Image Tools, CSC Services, and digital form guidance.\n\nHow can I help you today?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function sendMessage(text?: string) {
    const message = (text ?? input).trim();

    if (!message || loading) return;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: message,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.reply ||
            data?.message ||
            "Unable to connect with AI."
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.reply || "No response received.",
        },
      ]);
    } catch (error: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            error instanceof Error ? error.message :
            "⚠️ Sorry, AI service is currently unavailable.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`flex h-[min(650px,calc(100vh-7.5rem))] w-[calc(100vw-1.5rem)] max-w-[380px] flex-col overflow-hidden rounded-3xl border sm:w-[380px] ${
      isDark
        ? "border-white/10 bg-[#081225]/95 shadow-[0_30px_80px_rgba(2,6,23,0.55)]"
        : "border-slate-200 bg-white shadow-2xl"
    }`}>

      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <Bot />
          <div>
            <h2 className="font-bold">Manish</h2>
            <p className="text-xs opacity-90">
              Your DigiDesk India Assistant
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="hover:opacity-80"
        >
          <X />
        </button>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isDark ? "bg-[#050B18]" : "bg-slate-50"}`}>
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.role === "user"
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-line ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : isDark
                  ? "border border-white/10 bg-white/6 text-slate-100"
                  : "bg-white border border-slate-200"
              }`}
            >
              <div className="mb-2 flex items-center gap-2 text-xs opacity-70">
                {msg.role === "assistant" ? (
                  <>
                    <Bot size={14} />
                    Manish
                  </>
                ) : (
                  <>
                    <User size={14} />
                    You
                  </>
                )}
              </div>

              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 ${isDark ? "border-white/10 bg-white/6 text-slate-100" : "bg-white"}`}>
            <Bot size={16} />
            <span>Manish is typing...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggested Questions */}
      <div className={`border-t px-3 py-3 ${isDark ? "border-white/10 bg-[#081225]" : "bg-white"}`}>
        <div className="flex flex-wrap gap-2">
          {[
            "PAN Card",
            "Aadhaar Services",
            "Passport",
            "Compress PDF",
          ].map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className={`rounded-full border px-3 py-1 text-sm ${isDark ? "border-white/10 bg-white/6 text-slate-100 hover:bg-white/10" : "hover:bg-blue-50"}`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className={`border-t p-3 flex gap-2 ${isDark ? "border-white/10 bg-[#081225]" : "bg-white"}`}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
          placeholder="Ask Manish anything..."
          className={`flex-1 rounded-xl border px-4 py-3 outline-none focus:border-blue-500 ${isDark ? "border-white/10 bg-white/6 text-slate-100 placeholder:text-slate-500" : ""}`}
        />

        <button
          onClick={() => sendMessage()}
          disabled={loading}
          className="rounded-xl bg-blue-600 px-4 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Send size={20} />
        </button>
      </div>

    </div>
  );
}