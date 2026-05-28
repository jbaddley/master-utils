import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type ApiAuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export async function validateApiKey(req: NextRequest): Promise<ApiAuthResult> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Missing or malformed Authorization header. Use: Bearer <api_key>",
        },
        { status: 401 },
      ),
    };
  }
  const key = auth.slice(7).trim();
  if (!key) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Empty API key" }, { status: 401 }),
    };
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { key },
    select: {
      id: true,
      userId: true,
      requestsToday: true,
      dailyLimit: true,
      active: true,
    },
  });

  if (!apiKey || !apiKey.active) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 },
      ),
    };
  }

  if (apiKey.requestsToday >= apiKey.dailyLimit) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Daily rate limit exceeded", limit: apiKey.dailyLimit },
        { status: 429 },
      ),
    };
  }

  // Fire-and-forget usage increment
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { requestsToday: { increment: 1 } },
    })
    .catch(() => {});

  return { ok: true, userId: apiKey.userId };
}
