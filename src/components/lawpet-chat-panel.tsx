"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, Sparkles, X } from "lucide-react";
import { DRAFT_WARNING } from "@/lib/constants";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type LawpetChatPanelProps = {
  pathname: string;
  onClose: () => void;
};

const defaultAssistantMessage =
  "Hi, I’m Lawpet. I’m the court bear on this page. Ask me what to review here, how the workflow works, or where a case update will land. Anything AI-generated still requires attorney review.";

const quickPrompts = [
  "What should I review first on this page?",
  "Summarize the attorney approval rule.",
  "How does automatic email-to-case updating work?"
];

export function LawpetChatPanel({ pathname, onClose }: LawpetChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: defaultAssistantMessage
    }
  ]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("lawpet-chat-state");
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as {
        messages?: ChatMessage[];
      };

      if (parsed.messages?.length) {
        setMessages(parsed.messages.slice(-12));
      }
    } catch {
      window.localStorage.removeItem("lawpet-chat-state");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "lawpet-chat-state",
      JSON.stringify({
        messages: messages.slice(-12)
      })
    );
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages]);

  function sendMessage(content: string) {
    const nextMessage = content.trim();
    if (!nextMessage) return;

    setError("");

    const nextMessages = [...messages, { role: "user" as const, content: nextMessage }];
    setMessages(nextMessages);
    setDraft("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            pathname,
            mascot: "bear",
            messages: nextMessages
          })
        });

        const payload = (await response.json()) as { reply?: string; error?: unknown };

        if (!response.ok || !payload.reply) {
          throw new Error("Lawpet could not respond just now.");
        }

        const assistantReply = payload.reply;

        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: assistantReply
          }
        ]);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Lawpet could not respond just now.");
      }
    });
  }

  return (
    <section className="lawpet-panel">
      <header className="lawpet-panel-header">
        <div className="lawpet-panel-title">
          <span className="lawpet-avatar large pixel">
            <span className="lawpet-avatar-pixel-sprite" aria-hidden="true" />
          </span>
          <div>
            <strong>Lawpet Assistant</strong>
            <p>Pixel court bear companion</p>
          </div>
        </div>

        <div className="lawpet-panel-actions">
          <button type="button" className="lawpet-close" onClick={onClose} aria-label="Close Lawpet">
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="lawpet-messages" ref={scrollRef}>
        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`lawpet-message ${message.role}`}>
            <span className="lawpet-message-badge">{message.role === "assistant" ? "Lawpet" : "You"}</span>
            <p>{message.content}</p>
          </article>
        ))}
      </div>

      <div className="lawpet-quick-prompts">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="lawpet-chip"
            disabled={isPending}
            onClick={() => sendMessage(prompt)}
          >
            <Sparkles size={14} />
            {prompt}
          </button>
        ))}
      </div>

      <form
        className="lawpet-composer"
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage(draft);
        }}
      >
        <textarea
          className="lawpet-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask Lawpet for help with this page or case workflow..."
          rows={3}
        />
        <div className="lawpet-composer-footer">
          <span className="lawpet-disclaimer">{DRAFT_WARNING}</span>
          <button type="submit" className="button" disabled={isPending || !draft.trim()}>
            <Send size={15} />
            {isPending ? "Thinking..." : "Send"}
          </button>
        </div>
      </form>

      {error ? <div className="form-error lawpet-error">{error}</div> : null}
    </section>
  );
}
