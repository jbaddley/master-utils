"use client";

import { useEffect, useRef, useState } from "react";
import { LuSend, LuSquare, LuCopy, LuCheck, LuUser, LuCpu } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "./shared/ModelPicker";
import { useStreamingChat, type ChatMessage } from "./shared/useStreamingChat";
import { getSavedModel, saveModel } from "./shared/useLLM";

export default function AiChatTool() {
  const [model, setModel] = useState(getSavedModel);
  const [input, setInput] = useState("");

  const { messages, isLoading, error, sendMessage, stop, clear } = useStreamingChat({ model });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleModelChange = (m: string) => {
    setModel(m);
    saveModel(m);
  };

  const submit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    void sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.key === "Enter" && (e.metaKey || e.ctrlKey)) && !isLoading) submit();
  };

  const copyMessage = async (msg: ChatMessage) => {
    await navigator.clipboard.writeText(msg.content);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="tool-ui" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Toolbar */}
      <div className="toolbar">
        <ModelPicker value={model} onChange={handleModelChange} />
        <div className="toolbar-spacer" />
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={clear}>
            Clear
          </Button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {/* Message list */}
      <div
        className="card"
        style={{
          minHeight: "20rem",
          maxHeight: "60vh",
          overflowY: "auto",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted-foreground)",
              fontSize: "14px",
              textAlign: "center",
              gap: "0.25rem",
            }}
          >
            <span>Start a conversation — type a message below.</span>
            <span style={{ fontSize: "12px" }}>⌘ + Enter to send</span>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                gap: "0.25rem",
              }}
            >
              {/* Role badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "11px",
                  color: "var(--muted-foreground)",
                }}
              >
                {msg.role === "user" ? <LuUser size={11} /> : <LuCpu size={11} />}
                {msg.role === "user" ? "You" : model}
              </div>
              {/* Bubble */}
              <div
                style={{
                  maxWidth: "80%",
                  padding: "0.6rem 0.875rem",
                  borderRadius: msg.role === "user"
                    ? "1rem 1rem 0.25rem 1rem"
                    : "1rem 1rem 1rem 0.25rem",
                  background: msg.role === "user" ? "var(--primary)" : "var(--muted)",
                  color: msg.role === "user" ? "var(--primary-foreground)" : "var(--foreground)",
                  fontSize: "14px",
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {msg.content}
                {isLoading && msg.role === "assistant" &&
                  msg === messages[messages.length - 1] && (
                    <span className="llm-cursor" />
                  )}
              </div>
              {/* Copy button for assistant messages */}
              {msg.role === "assistant" && msg.content && (
                <button
                  onClick={() => void copyMessage(msg)}
                  style={{
                    fontSize: "11px",
                    color: "var(--muted-foreground)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    padding: "0.15rem 0.3rem",
                  }}
                >
                  {copiedId === msg.id ? <LuCheck size={11} /> : <LuCopy size={11} />}
                  {copiedId === msg.id ? "Copied" : "Copy"}
                </button>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (⌘+Enter to send)"
          rows={2}
          disabled={isLoading}
          style={{
            flex: 1,
            resize: "vertical",
            fontSize: "14px",
            padding: "0.6rem 0.75rem",
            background: "var(--card)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            outline: "none",
            minHeight: "2.75rem",
            fontFamily: "inherit",
          }}
        />
        {isLoading ? (
          <Button type="button" variant="outline" onClick={stop}>
            <LuSquare /> Stop
          </Button>
        ) : (
          <Button type="button" disabled={!input.trim()} onClick={submit}>
            <LuSend /> Send
          </Button>
        )}
      </div>
    </div>
  );
}
