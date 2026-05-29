"use client";

import { useEffect, useState } from "react";

export const RECOMMENDED_MODELS: { id: string; label: string; desc: string }[] = [
  { id: "llama3.2",       label: "Llama 3.2 (3B)",    desc: "2 GB · fast, light tasks"          },
  { id: "llama3.1:8b",   label: "Llama 3.1 (8B)",    desc: "4.7 GB · best balance"              },
  { id: "mistral",        label: "Mistral (7B)",       desc: "4.1 GB · reasoning & rewriting"    },
  { id: "phi4",           label: "Phi-4 (14B)",        desc: "8.5 GB · highest quality 14B"      },
  { id: "gemma3:9b",     label: "Gemma 3 (9B)",       desc: "5.4 GB · Google's model"           },
  { id: "qwen2.5",        label: "Qwen 2.5 (7B)",      desc: "4.4 GB · great for translation"   },
  { id: "codellama",      label: "Code Llama (7B)",    desc: "3.8 GB · code-focused"             },
  { id: "deepseek-r1:8b", label: "DeepSeek R1 (8B)",  desc: "4.9 GB · chain-of-thought"         },
];

const LS_KEY = "llm:model";

type Props = {
  value: string;
  onChange: (model: string) => void;
};

export function ModelPicker({ value, onChange }: Props) {
  const [models, setModels]   = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    fetch("/api/ai/models/")
      .then((r) => r.json() as Promise<string[]>)
      .then((list) => {
        setModels(list);
        setOffline(list.length === 0);
        // If current value not in list, pick the first available
        if (list.length > 0 && !list.includes(value)) {
          const saved = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
          const pick  = (saved && list.includes(saved) ? saved : list[0]) ?? list[0]!;
          onChange(pick);
        }
      })
      .catch(() => setOffline(true))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (id: string) => {
    onChange(id);
    if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id);
  };

  if (loading) {
    return (
      <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
        Loading models…
      </span>
    );
  }

  if (offline) {
    return (
      <details
        style={{
          fontSize: "13px",
          color: "var(--muted-foreground)",
          cursor: "pointer",
        }}
      >
        <summary style={{ color: "var(--destructive)", fontWeight: 500 }}>
          Ollama not running — click for setup
        </summary>
        <div
          style={{
            marginTop: "0.5rem",
            padding: "0.75rem",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            lineHeight: 1.6,
          }}
        >
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>1. Install Ollama</strong>{" "}
            <a href="https://ollama.com" target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>
              ollama.com
            </a>
          </p>
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>2. Start it:</strong>{" "}
            <code
              style={{
                background: "var(--muted)",
                padding: "0.1rem 0.35rem",
                borderRadius: "3px",
                fontFamily: "monospace",
              }}
            >
              ollama serve
            </code>
          </p>
          <p style={{ margin: "0 0 0.5rem" }}>
            <strong>3. Pull a model</strong> (pick one):
          </p>
          <ul style={{ margin: "0 0 0 1.25rem", padding: 0 }}>
            {RECOMMENDED_MODELS.map((m) => (
              <li key={m.id} style={{ marginBottom: "0.2rem" }}>
                <code
                  style={{
                    background: "var(--muted)",
                    padding: "0.1rem 0.35rem",
                    borderRadius: "3px",
                    fontFamily: "monospace",
                  }}
                >
                  ollama pull {m.id}
                </code>{" "}
                <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>
                  — {m.desc}
                </span>
              </li>
            ))}
          </ul>
          <p style={{ margin: "0.5rem 0 0", fontSize: "12px" }}>
            Then refresh this page.
          </p>
        </div>
      </details>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <label
        htmlFor="model-picker"
        style={{ fontSize: "13px", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}
      >
        Model
      </label>
      <select
        id="model-picker"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        style={{
          fontSize: "13px",
          height: "2rem",
          padding: "0 0.5rem",
          background: "var(--card)",
          color: "var(--foreground)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
          minWidth: "10rem",
          maxWidth: "18rem",
        }}
      >
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
