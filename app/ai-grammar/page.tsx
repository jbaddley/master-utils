import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/ToolPage";
import AiGrammarTool from "@/features/llm/AiGrammarTool";

export const metadata: Metadata = buildMetadata({
  title: "AI Grammar Fixer — Fix Grammar & Spelling with Local LLM",
  description:
    "Correct grammar, spelling, and punctuation errors in any text using a local AI model. Private, no cloud, powered by Ollama.",
  path: "ai-grammar",
});

export default function Page() {
  return (
    <ToolPage
      slug="ai-grammar"
      h1="Grammar Fixer"
      appName="Grammar Fixer"
      lede="Fix grammar, spelling, and punctuation without changing your voice — using a local AI model."
      steps={[
        "Install Ollama (ollama.com) and pull a model: ollama pull llama3.1:8b",
        "Paste your text into the left pane.",
        "Click Fix Grammar.",
        "Copy the corrected text from the right pane.",
      ]}
      faqs={[
        {
          q: "Will it change my writing style?",
          a: "No — the prompt instructs the model to preserve your voice and only fix clear errors. It won't rephrase sentences unless they're truly incomprehensible. For style improvements, use the AI Rewriter.",
        },
        {
          q: "Does it handle non-English text?",
          a: "Yes — modern models support many languages. For best results on non-English text, use Qwen 2.5 or a model specifically trained on that language.",
        },
        {
          q: "Which model is best for grammar correction?",
          a: "Llama 3.1 8B and Mistral 7B are both excellent. Phi-4 (14B) gives the most nuanced corrections if you have the RAM.",
        },
      ]}
      related={[
        { href: "/ai-rewrite/",   label: "AI Rewriter"    },
        { href: "/ai-translate/", label: "AI Translator"   },
        { href: "/ai-chat/",      label: "Local AI Chat"   },
      ]}
      privacyNote="Processing runs on your local Ollama server — your text is not uploaded to Utilio."
    >
      <AiGrammarTool />
    </ToolPage>
  );
}
