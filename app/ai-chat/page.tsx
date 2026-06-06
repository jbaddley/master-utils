import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/ToolPage";
import AiChatTool from "@/features/llm/AiChatTool";

export const metadata: Metadata = buildMetadata({
  title: "Local AI Chat — Private LLM Conversations",
  description:
    "Chat with local AI models like Llama, Mistral, Phi-4, and Gemma via Ollama on your own machine.",
  path: "ai-chat",
});

export default function Page() {
  return (
    <ToolPage
      slug="ai-chat"
      h1="Local AI Chat"
      appName="Local AI Chat"
      lede="Have a private conversation with a locally-running LLM via Ollama — messages are not sent to Utilio servers."
      steps={[
        "Install Ollama from ollama.com and run: ollama pull llama3.1:8b",
        "Start the Ollama server: ollama serve",
        "Pick a model from the dropdown above the chat.",
        "Type your message and press Send or ⌘+Enter.",
      ]}
      faqs={[
        {
          q: "Is this chat private?",
          a: "When using a local Ollama server, the LLM runs on your machine. Messages are not sent to Utilio or external AI APIs.",
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
      privacyNote="Conversations stay on your machine when using a local Ollama server — nothing is uploaded to Utilio."
    >
      <AiChatTool />
    </ToolPage>
  );
}
