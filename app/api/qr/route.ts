import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const codes = await prisma.qRCode.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { scans: true } } },
  });
  return NextResponse.json({ codes });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.plan !== "pro") return NextResponse.json({ error: "Pro plan required" }, { status: 403 });

  const body = await req.json() as { destination?: string; label?: string };
  if (!body.destination) return NextResponse.json({ error: "destination required" }, { status: 400 });

  // Generate short code without nanoid
  const code = Math.random().toString(36).slice(2, 8);
  const qr = await prisma.qRCode.create({
    data: { userId: user.id, code, destination: body.destination, label: body.label ?? "" },
  });
  return NextResponse.json({ code: qr }, { status: 201 });
}
