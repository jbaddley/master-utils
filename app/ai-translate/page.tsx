import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/ToolPage";
import AiTranslateTool from "@/features/llm/AiTranslateTool";

export const metadata: Metadata = buildMetadata({
  title: "AI Translator — Translate Text Privately with Local LLM",
  description:
    "Translate text to 20+ languages using a locally-running AI model. No API keys, no data sent to the cloud — powered by Ollama.",
  path: "ai-translate",
});

export default function Page() {
  return (
    <ToolPage
      slug="ai-translate"
      h1="AI Translator"
      appName="AI Translator"
      lede="Translate text into 20+ languages using a local AI model. Fully private — no cloud API required."
      steps={[
        "Install Ollama (ollama.com) and pull a multilingual model: ollama pull qwen2.5",
        "Paste your source text into the left pane.",
        "Select the target language from the dropdown.",
        "Click Translate and copy the result.",
      ]}
      faqs={[
        {
          q: "Which model is best for translation?",
          a: "Qwen 2.5 (7B) excels at multilingual tasks and is specifically trained on many languages. Llama 3.1 and Mistral also perform well for European languages.",
        },
        {
          q: "How accurate is local AI translation compared to DeepL or Google Translate?",
          a: "For common languages like Spanish, French, and German, modern 7B+ models are very good. For less common languages, cloud services may still be more accurate.",
        },
        {
          q: "Can it translate into languages with non-Latin scripts?",
          a: "Yes — Japanese, Chinese, Arabic, Hebrew, Hindi, Korean, Russian, and Greek are all supported. Make sure you use a model trained on multilingual data like Qwen 2.5.",
        },
      ]}
      related={[
        { href: "/ai-rewrite/",   label: "AI Rewriter"  },
        { href: "/ai-grammar/",   label: "Grammar Fixer" },
        { href: "/ai-chat/",      label: "Local AI Chat" },
      ]}
      privacyNote="All processing runs on your local machine via Ollama. Your text is never uploaded anywhere."
    >
      <AiTranslateTool />
    </ToolPage>
  );
}
