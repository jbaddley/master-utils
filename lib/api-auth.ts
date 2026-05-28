import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export type ApiAuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export async function validateApiKey(req: NextRequest): Promise<ApiAuthResult> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing or malformed Authorization header. Use: Bearer <api_key>" },
        { status: 401 },
      ),
    };
  }
  const key = auth.slice(7).trim();
  if (!key) {
    return { ok: false, response: NextResponse.json({ error: "Empty API key" }, { status: 401 }) };
  }

  const sb = getSupabase();
  const { data, error } = await sb
    .from("api_keys")
    .select("id, user_id, requests_today, daily_limit, active")
    .eq("key", key)
    .single();

  if (error || !data || !data.active) {
    return { ok: false, response: NextResponse.json({ error: "Invalid API key" }, { status: 401 }) };
  }

  if (data.requests_today >= data.daily_limit) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Daily rate limit exceeded", limit: data.daily_limit },
        { status: 429 },
      ),
    };
  }

  // Fire-and-forget usage increment
  sb.rpc("increment_api_key_usage", { p_key_id: data.id }).then(() => {});

  return { ok: true, userId: data.user_id };
}
