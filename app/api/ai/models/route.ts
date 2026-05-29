/**
 * Returns the list of model IDs available on the local LLM server.
 * Works with both Ollama (/v1/models) and LM Studio (/v1/models).
 * Returns [] if the server is not running — client shows setup instructions.
 */
export async function GET() {
  const base = process.env.LLM_BASE_URL ?? "http://localhost:11434/v1";
  try {
    const res = await fetch(`${base}/models`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000), // fail fast if Ollama is off
    });
    if (!res.ok) return Response.json([]);
    const data = (await res.json()) as { data?: { id: string }[] };
    const ids = (data.data ?? []).map((m) => m.id).sort();
    return Response.json(ids);
  } catch {
    return Response.json([]); // Ollama not running — surface to client
  }
}
