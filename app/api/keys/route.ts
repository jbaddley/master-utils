import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { dailyLimitForPlan } from "@/lib/pro-plan";
import { randomBytes } from "crypto";

function generateKey(): string {
  return "mu_" + randomBytes(24).toString("hex");
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const keys = await prisma.apiKey.findMany({
    where: { user: { email: session.user.email } },
    select: { id: true, label: true, key: true, dailyLimit: true, requestsToday: true, resetDate: true, active: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const today = new Date().toISOString().slice(0, 10);
  return NextResponse.json({
    keys: keys.map((k) => ({
      ...k,
      requestsToday: k.resetDate === today ? k.requestsToday : 0,
      key: k.key.slice(0, 10) + "••••••••••••••••••••••••••••••••••••••••",
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await prisma.apiKey.count({ where: { userId: user.id, active: true } });
  if (existing >= 5) return NextResponse.json({ error: "Maximum 5 active API keys per account" }, { status: 400 });

  const body = await req.json().catch(() => ({})) as { label?: string };
  const label = (body.label ?? "").trim() || "Default";
  const key = generateKey();

  await prisma.apiKey.create({
    data: { key, label, userId: user.id, dailyLimit: dailyLimitForPlan(user.plan) },
  });

  return NextResponse.json({ key, label }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const apiKey = await prisma.apiKey.findFirst({
    where: { id, user: { email: session.user.email } },
  });
  if (!apiKey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.apiKey.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
