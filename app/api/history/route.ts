import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const exports = await prisma.exportHistory.findMany({
    where: { userId: user.id, createdAt: { gte: cutoff } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ exports });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json() as { toolName?: string; fileName?: string; fileSize?: number };
  const { toolName, fileName, fileSize } = body;

  if (!toolName || !fileName || typeof fileSize !== "number") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await prisma.exportHistory.create({
    data: { userId: user.id, toolName, fileName, fileSize },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
