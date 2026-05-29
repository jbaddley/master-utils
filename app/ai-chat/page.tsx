import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/ToolPage";
import AiChatTool from "@/features/llm/AiChatTool";

export const metadata: Metadata = buildMetadata({
  title: "Local AI Chat — Private LLM Conversations",
  description:
    "Chat with local AI models like Llama, Mistral, Phi-4, and Gemma — all running on your own machine via Ollama. 100% private.",
  path: "ai-chat",
});

export default function Page() {
  return (
    <ToolPage
      slug="ai-chat"
      h1="Local AI Chat"
      appName="Local AI Chat"
      lede="Have a private conversation with a locally-running LLM. No data leaves your machine."
      steps={[
        "Install Ollama from ollama.com and run: ollama pull llama3.1:8b",
        "Start the Ollama server: ollama serve",
        "Pick a model from the dropdown above the chat.",
        "Type your message and press Send or ⌘+Enter.",
      ]}
      faqs={[
        {
          q: "Is this chat private?",
          a: "Yes — the LLM runs entirely on your machine. No messages are sent to any external server.",
        },
        {
          q: "Which model should I start with?",
          a: "llama3.1:8b is an excellent all-rounder (4.7 GB). For a lighter option try llama3.2:3b (2 GB).",
        },
        {
          q: "Why is Ollama not showing models?",
          a: "Make sure Ollama is running (ollama serve) and you have pulled at least one model (ollama pull llama3.2).",
        },
        {
          q: "Can I use LM Studio instead of Ollama?",
          a: "Yes — set LLM_BASE_URL=http://localhost:1234/v1 in your .env.local and restart the dev server.",
        },
      ]}
      related={[
        { href: "/ai-summarize/", label: "AI Summarizer" },
        { href: "/ai-rewrite/",   label: "AI Rewriter"   },
        { href: "/ai-translate/", label: "AI Translator"  },
      ]}
      privacyNote="All conversations stay on your machine. The LLM runs locally via Ollama — nothing is uploaded."
    >
      <AiChatTool />
    </ToolPage>
  );
}
