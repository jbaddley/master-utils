import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/ToolPage";
import AiExtractTool from "@/features/llm/AiExtractTool";

export const metadata: Metadata = buildMetadata({
  title: "AI Key Point Extractor — Extract Facts & Insights Locally",
  description:
    "Extract key points, facts, and insights from any text as a bullet list using a local AI model. Private, no cloud, powered by Ollama.",
  path: "ai-extract",
});

export default function Page() {
  return (
    <ToolPage
      slug="ai-extract"
      h1="Key Point Extractor"
      appName="Key Point Extractor"
      lede="Extract the most important facts and insights from any document as a structured bullet list — runs locally."
      steps={[
        "Install Ollama (ollama.com) and pull a model: ollama pull llama3.1:8b",
        "Paste your article, report, or document into the left pane.",
        "Click Extract Key Points.",
        "Copy the bullet list from the right pane.",
      ]}
      faqs={[
        {
          q: "How is this different from the AI Summarizer?",
          a: "The Summarizer gives a concise narrative summary. The Key Point Extractor focuses on pulling out discrete facts, data points, and actionable items as standalone bullets.",
        },
        {
          q: "Can I use this for meeting notes or transcripts?",
          a: "Yes — paste a meeting transcript and the model will pull out decisions, action items, and key discussion points.",
        },
        {
          q: "What's the maximum text length?",
          a: "It depends on your model's context window. Most modern 7B+ models support at least 8,000 tokens (~6,000 words).",
        },
      ]}
      related={[
        { href: "/ai-summarize/", label: "AI Summarizer" },
        { href: "/ai-qa/",        label: "Document Q&A"  },
        { href: "/ai-chat/",      label: "Local AI Chat" },
      ]}
      privacyNote="Processing runs on your local Ollama server — your text is not uploaded to Utilio."
    >
      <AiExtractTool />
    </ToolPage>
  );
}
