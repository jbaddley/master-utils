import { streamText } from "ai";
import { createLLMProvider, DEFAULT_MODEL } from "@/lib/llm";

export const maxDuration = 120;

type SimpleMessage = { role: "user" | "assistant" | "system"; content: string };

/**
 * Streaming chat endpoint. Accepts simple {role, content}[] messages,
 * returns a plain text stream (compatible with the custom useStreamingChat hook).
 * Body: { messages: SimpleMessage[], model?: string, system?: string }
 */
export async function POST(req: Request) {
  try {
    const { messages, model, system } = (await req.json()) as {
      messages: SimpleMessage[];
      model?: string;
      system?: string;
    };

    if (!messages?.length) {
      return new Response("messages is required", { status: 400 });
    }

    const provider = createLLMProvider();
    type ModelMessages = NonNullable<Parameters<typeof streamText>[0]["messages"]>;
    const result = streamText({
      model:    provider(model ?? DEFAULT_MODEL),
      messages: messages as ModelMessages,
      ...(system ? { system } : {}),
    });

    return result.toTextStreamResponse();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "LLM request failed";
    return new Response(msg, { status: 502 });
  }
}
