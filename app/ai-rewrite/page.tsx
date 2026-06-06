import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/ToolPage";
import AiRewriteTool from "@/features/llm/AiRewriteTool";

export const metadata: Metadata = buildMetadata({
  title: "AI Text Rewriter — Improve, Shorten, Formalize with Local LLM",
  description:
    "Rewrite text to be clearer, shorter, more formal, or more casual using a local AI model. Runs privately via Ollama.",
  path: "ai-rewrite",
});

export default function Page() {
  return (
    <ToolPage
      slug="ai-rewrite"
      h1="AI Rewriter"
      appName="AI Rewriter"
      lede="Improve, shorten, formalize, or expand any text using a local LLM. Five rewrite modes, all private."
      steps={[
        "Install Ollama (ollama.com) and pull a model: ollama pull mistral",
        "Paste your text into the left pane.",
        "Choose a rewrite style: Improve, Shorten, Formal, Casual, or Expand.",
        "Click the rewrite button and copy the result.",
      ]}
      faqs={[
        {
          q: "What's the difference between Improve and Formal?",
          a: "Improve fixes clarity and flow while preserving tone. Formal specifically shifts the register to professional/academic language.",
        },
        {
          q: "Which model rewrites best?",
          a: "Mistral 7B and Llama 3.1 8B are both strong. For nuanced formal writing, phi4:14b gives the best results.",
        },
        {
          q: "Can I rewrite code comments or documentation?",
          a: "Yes — paste any text. For code-specific rewriting, the AI Code Helper tool is more specialized.",
        },
      ]}
      related={[
        { href: "/ai-grammar/",   label: "Grammar Fixer"   },
        { href: "/ai-summarize/", label: "AI Summarizer"   },
        { href: "/ai-translate/", label: "AI Translator"   },
      ]}
      privacyNote="Processing runs on your local Ollama server — your text is not uploaded to Utilio."
    >
      <AiRewriteTool />
    </ToolPage>
  );
}
