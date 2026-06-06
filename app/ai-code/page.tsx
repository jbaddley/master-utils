import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { ToolPage } from "@/components/ToolPage";
import AiCodeTool from "@/features/llm/AiCodeTool";

export const metadata: Metadata = buildMetadata({
  title: "AI Code Helper — Explain, Fix, Generate & Convert Code Locally",
  description:
    "Explain, debug, generate, and convert code using a local AI model. Supports 13 languages. Runs privately via Ollama — no cloud.",
  path: "ai-code",
});

export default function Page() {
  return (
    <ToolPage
      slug="ai-code"
      h1="AI Code Helper"
      appName="AI Code Helper"
      lede="Explain, fix, generate, convert, or review code using a local LLM. Five modes, 13 languages, fully private."
      steps={[
        "Install Ollama and pull a code-focused model: ollama pull codellama or ollama pull phi4",
        "Choose a mode: Explain, Fix, Generate, Convert, or Review.",
        "For Generate: describe what you want in the left pane. For others: paste your code.",
        "Click the action button and copy the output.",
      ]}
      faqs={[
        {
          q: "Which model is best for code tasks?",
          a: "Code Llama (codellama:7b) is purpose-built for code. Phi-4 (phi4:14b) and Qwen 2.5 Coder are also excellent. For general code questions, llama3.1:8b works well.",
        },
        {
          q: "What languages are supported?",
          a: "TypeScript, JavaScript, Python, Rust, Go, Java, C#, C++, Swift, Kotlin, Ruby, PHP, and SQL. The model can handle many others too — just mention the language in your prompt.",
        },
        {
          q: "Can it fix TypeScript type errors?",
          a: "Yes — paste your code with the error message and use Fix mode. Including the compiler output in the input gives the model more context.",
        },
      ]}
      related={[
        { href: "/code-formatter/",  label: "Code Formatter"  },
        { href: "/json-formatter/",  label: "JSON Formatter"  },
        { href: "/ai-chat/",         label: "Local AI Chat"   },
      ]}
      privacyNote="Processing runs on your local Ollama server — your code is not uploaded to Utilio."
    >
      <AiCodeTool />
    </ToolPage>
  );
}
