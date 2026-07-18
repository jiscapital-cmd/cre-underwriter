"use client";

import { useState, useRef, useEffect } from "react";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const QUICK_PROMPT =
  "Review this underwriting model end to end. Identify the key issues — unrealistic assumptions, internal inconsistencies, anything that would raise a flag with an investment committee or lender — and give specific, actionable suggestions to improve the model or the deal terms.";

function formatReply(text: string) {
  // Lightweight markdown: **bold** and leading "- " bullets, nothing fancier.
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={j}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={j}>{part}</span>
      )
    );
    const isBullet = /^\s*[-•]\s/.test(line);
    return (
      <div key={i} className={isBullet ? "pl-4 -indent-4" : ""}>
        {parts}
        {line === "" && <br />}
      </div>
    );
  });
}

export default function AiAssistantTab({
  snapshot,
  messages,
  setMessages,
}: {
  snapshot: unknown;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!loading) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [loading]);

  async function send(userText: string) {
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: userText }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot, messages: nextMessages }),
        signal: controller.signal,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Assistant request failed");
      setMessages((prev) => [...prev, { role: "assistant", content: json.reply }]);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("The assistant took longer than 90 seconds and the request was cancelled. Try a shorter/more specific question, or try again.");
      } else {
        setError(err instanceof Error ? err.message : "Assistant request failed");
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    send(input.trim());
  }

  return (
    <div className="card flex flex-col h-[calc(100vh-140px)]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold">AI Underwriting Assistant</h2>
          <p className="text-sm text-silver">
            Has full visibility into your current inputs, proforma, returns, scorecard, and waterfall. Ask it anything,
            or run a quick pass below.
          </p>
        </div>
        {messages.length === 0 && (
          <button
            onClick={() => send(QUICK_PROMPT)}
            disabled={loading}
            className="bg-ink text-navy font-semibold text-sm px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
          >
            Analyze This Deal
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto border border-cardBorder rounded-lg p-4 space-y-4 bg-panel/30">
        {messages.length === 0 && !loading && (
          <p className="text-sm text-silver italic">
            No messages yet. Click "Analyze This Deal" for a full review, or ask a specific question below — e.g. "Is my
            exit cap rate assumption reasonable given my going-in cap?" or "Why is my DSCR so low in Year 1?"
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user" ? "bg-ink text-navy font-medium" : "bg-card border border-cardBorder text-white"
              }`}
            >
              {m.role === "assistant" ? formatReply(m.content) : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-cardBorder rounded-lg px-4 py-2.5 text-sm text-silver">
              Analyzing your model... ({elapsed}s — full deal reviews typically take 20-40s)
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-300">{error}</p>}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
        <input
          className="input flex-1"
          placeholder="Ask about this deal..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-ink text-navy font-semibold text-sm px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
        >
          Send
        </button>
      </form>
    </div>
  );
}
