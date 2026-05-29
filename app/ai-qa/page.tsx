import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/ToolPage";
import AiQaTool from "@/features/llm/AiQaTool";

export const metadata: Metadata = buildMetadata({
  title: "AI Document Q&A — Ask Questions About Any Text Locally",
  description:
    "Paste any document and ask questions about it using a local AI model. No cloud, no API keys — powered by Ollama.",
  path: "ai-qa",
});

export default function Page() {
  return (
    <ToolPage
      slug="ai-qa"
      h1="Document Q&A"
      appName="Document Q&A"
      lede="Paste any document and ask questions about it — the AI answers based only on what's in the text. Fully private."
      steps={[
        "Install Ollama (ollama.com) and pull a model: ollama pull llama3.1:8b",
        "Paste your document, article, or report into the top pane.",
        "Type a question in the input field and press Enter or Ask.",
        "The AI answers based only on the document content.",
      ]}
      faqs={[
        {
          q: "Will it make things up if the answer isn't in the document?",
          a: "The system prompt instructs the model to only answer from the document and say so if the answer isn't there. Modern models generally follow this well, but always verify important facts.",
        },
        {
          q: "How large a document can I paste?",
          a: "Depends on the model's context window. Llama 3.1 (8B) supports up to 128k tokens. For very large documents, split them into sections.",
        },
        {
          q: "Can I ask follow-up questions?",
          a: "Each question is independent — the document context is always re-sent. For conversational Q&A, use the AI Chat tool with the document pasted in at the start.",
        },
      ]}
      related={[
        { href: "/ai-summarize/", label: "AI Summarizer"       },
        { href: "/ai-extract/",   label: "Key Point Extractor" },
        { href: "/ai-chat/",      label: "Local AI Chat"        },
      ]}
      privacyNote="All processing runs on your local machine via Ollama. Your text is never uploaded anywhere."
    >
      <AiQaTool />
    </ToolPage>
  );
}
