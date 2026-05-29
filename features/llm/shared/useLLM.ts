import { useCompletion } from "@ai-sdk/react";

const LS_KEY = "llm:model";

/** Reads the persisted model from localStorage (safe for SSR). */
export function getSavedModel(fallback = "llama3.2"): string {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(LS_KEY) ?? fallback;
}

/** Saves the selected model to localStorage. */
export function saveModel(model: string): void {
  if (typeof window !== "undefined") localStorage.setItem(LS_KEY, model);
}

/**
 * Thin wrapper around AI SDK's useCompletion.
 * Points at /api/ai/complete with model + system injected into the body.
 */
export function useLLM(options: { model: string; system: string }) {
  return useCompletion({
    api: "/api/ai/complete",
    streamProtocol: "text",
    body: {
      model:  options.model,
      system: options.system,
    },
  });
}
