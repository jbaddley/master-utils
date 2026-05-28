import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const qr = await prisma.qRCode.findUnique({ where: { code } });
  if (!qr || !qr.active) {
    return NextResponse.json({ error: "QR code not found or inactive" }, { status: 404 });
  }
  // Log scan (fire and forget)
  prisma.qRScan.create({ data: { qrCodeId: qr.id } }).catch(() => {});
  return NextResponse.redirect(qr.destination);
}
