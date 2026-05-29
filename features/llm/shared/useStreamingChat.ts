"use client";

import { useState, useRef, useCallback } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

/**
 * Custom streaming chat hook that works with /api/ai/chat.
 * Uses raw fetch + ReadableStream instead of AI SDK's useChat,
 * which has breaking API changes in v6.
 */
export function useStreamingChat(options: { model: string; system?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Keep a stable ref to messages for the sendMessage closure
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const sendMessage = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };
      const asstId = crypto.randomUUID();
      const asstMsg: ChatMessage = { id: asstId, role: "assistant", content: "" };

      setMessages((prev) => [...prev, userMsg, asstMsg]);
      setIsLoading(true);
      setError(null);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const payload = {
          model:    options.model,
          system:   options.system,
          messages: [...messagesRef.current, userMsg].map((m) => ({
            role:    m.role,
            content: m.content,
          })),
        };

        const res = await fetch("/api/ai/chat/", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
          signal:  ctrl.signal,
        });

        if (!res.ok) {
          const msg = await res.text().catch(() => `HTTP ${res.status}`);
          throw new Error(msg || `HTTP ${res.status}`);
        }

        const reader  = res.body!.getReader();
        const decoder = new TextDecoder();

        // Stream chunks into the assistant message
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstId ? { ...m, content: m.content + chunk } : m,
            ),
          );
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          // User stopped — keep whatever was streamed, just end loading
        } else {
          setError(e instanceof Error ? e.message : "Request failed.");
          // Remove the empty assistant placeholder on real errors
          setMessages((prev) => prev.filter((m) => m.id !== asstId));
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [options.model, options.system],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, stop, clear };
}
