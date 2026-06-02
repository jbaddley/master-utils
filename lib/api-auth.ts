import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type ApiAuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

function todayString(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function validateApiKey(req: Request): Promise<ApiAuthResult> {
  const auth = req.headers.get("Authorization");
  const xApiKey = req.headers.get("X-API-Key");

  let key: string;
  if (auth?.startsWith("Bearer ")) {
    key = auth.slice(7).trim();
  } else if (xApiKey?.trim()) {
    key = xApiKey.trim();
  } else {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing API key. Use Authorization: Bearer <key> or X-API-Key: <key>" },
        { status: 401 },
      ),
    };
  }
  if (!key) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Empty API key" }, { status: 401 }),
    };
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { key },
    select: { id: true, userId: true, requestsToday: true, dailyLimit: true, active: true, resetDate: true },
  });

  if (!apiKey || !apiKey.active) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid API key" }, { status: 401 }),
    };
  }

  const today = todayString();
  const isNewDay = apiKey.resetDate !== today;
  const currentCount = isNewDay ? 0 : apiKey.requestsToday;

  if (currentCount >= apiKey.dailyLimit) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Daily rate limit exceeded", limit: apiKey.dailyLimit },
        { status: 429 },
      ),
    };
  }

  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { requestsToday: currentCount + 1, resetDate: today },
    })
    .catch(() => {});

  return { ok: true, userId: apiKey.userId };
}
