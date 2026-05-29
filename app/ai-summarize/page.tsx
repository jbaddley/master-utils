import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/ToolPage";
import AiSummarizeTool from "@/features/llm/AiSummarizeTool";

export const metadata: Metadata = buildMetadata({
  title: "AI Text Summarizer — Local LLM, 100% Private",
  description:
    "Summarize long articles, documents, and reports into concise bullet points using a local AI model. Runs on your machine via Ollama.",
  path: "ai-summarize",
});

export default function Page() {
  return (
    <ToolPage
      slug="ai-summarize"
      h1="AI Summarizer"
      appName="AI Summarizer"
      lede="Turn long text into concise bullet points using a local LLM — your text never leaves your machine."
      steps={[
        "Install Ollama (ollama.com) and pull a model: ollama pull llama3.1:8b",
        "Paste your article or document into the left pane.",
        "Pick a model from the toolbar and click Summarize.",
        "Copy the bullet summary from the right pane.",
      ]}
      faqs={[
        {
          q: "How long can the input text be?",
          a: "It depends on the model's context window. Most 7B+ models support 8k–128k tokens. For very long documents, split them into sections.",
        },
        {
          q: "Which model is best for summarization?",
          a: "Mistral 7B and Llama 3.1 8B are excellent. For maximum quality, try phi4:14b if you have the RAM.",
        },
        {
          q: "Is my text private?",
          a: "Yes — the model runs locally. Your text is sent only to your own Ollama server, never to any external API.",
        },
      ]}
      related={[
        { href: "/ai-extract/",   label: "Key Point Extractor" },
        { href: "/ai-rewrite/",   label: "AI Rewriter"          },
        { href: "/ai-chat/",      label: "Local AI Chat"         },
      ]}
      privacyNote="All processing runs on your local machine via Ollama. Your text is never uploaded anywhere."
    >
      <AiSummarizeTool />
    </ToolPage>
  );
}
