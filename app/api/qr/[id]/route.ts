import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json() as { destination?: string; label?: string; active?: boolean };
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const qr = await prisma.qRCode.findFirst({ where: { id, userId: user.id } });
  if (!qr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await prisma.qRCode.update({
    where: { id },
    data: {
      ...(body.destination && { destination: body.destination }),
      ...(body.label !== undefined && { label: body.label }),
      ...(body.active !== undefined && { active: body.active }),
    },
  });
  return NextResponse.json({ code: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.qRCode.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true });
}
