import { streamText } from "ai";
import { createLLMProvider, DEFAULT_MODEL } from "@/lib/llm";

export const maxDuration = 120;

/**
 * Streaming completion endpoint — used by all utility tools (useCompletion).
 * Body: { prompt: string, model?: string, system?: string }
 * Returns plain text stream compatible with streamProtocol: 'text'.
 */
export async function POST(req: Request) {
  try {
    const { prompt, model, system } = (await req.json()) as {
      prompt: string;
      model?: string;
      system?: string;
    };

    if (!prompt?.trim()) {
      return new Response("prompt is required", { status: 400 });
    }

    const provider = createLLMProvider();
    const result = streamText({
      model: provider(model ?? DEFAULT_MODEL),
      prompt,
      ...(system ? { system } : {}),
    });

    return result.toTextStreamResponse();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "LLM request failed";
    return new Response(msg, { status: 502 });
  }
}
