import { createOpenAI } from "@ai-sdk/openai";

/**
 * Creates an OpenAI-compatible provider pointed at the configured local LLM server.
 * Works with both Ollama (default: localhost:11434/v1) and LM Studio (localhost:1234/v1).
 * Configure via .env.local:
 *   LLM_BASE_URL=http://localhost:11434/v1
 *   LLM_API_KEY=ollama
 *   LLM_DEFAULT_MODEL=llama3.2
 */
export function createLLMProvider() {
  return createOpenAI({
    baseURL: process.env.LLM_BASE_URL ?? "http://localhost:11434/v1",
    apiKey:  process.env.LLM_API_KEY  ?? "ollama",
  });
}

export const DEFAULT_MODEL = process.env.LLM_DEFAULT_MODEL ?? "llama3.2";
