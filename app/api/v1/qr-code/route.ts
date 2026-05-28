import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { validateApiKey } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.ok) return auth.response;

  let text: string | null = null;
  let size = 256;
  let errorCorrectionLevel: "L" | "M" | "Q" | "H" = "M";
  let margin = 2;

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: "Failed to parse multipart/form-data" }, { status: 400 });
    }
    text = form.get("text") as string | null;
    const rawSize = form.get("size");
    if (rawSize !== null) size = Number(rawSize);
    const rawEc = form.get("error_correction") as string | null;
    if (rawEc !== null) errorCorrectionLevel = rawEc as "L" | "M" | "Q" | "H";
    const rawMargin = form.get("margin");
    if (rawMargin !== null) margin = Number(rawMargin);
  } else {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Request must be multipart/form-data or JSON" }, { status: 400 });
    }
    text = typeof body.text === "string" ? body.text : null;
    if (body.size !== undefined) size = Number(body.size);
    if (body.error_correction !== undefined) errorCorrectionLevel = body.error_correction as "L" | "M" | "Q" | "H";
    if (body.margin !== undefined) margin = Number(body.margin);
  }

  if (!text) {
    return NextResponse.json({ error: "Missing required field: text" }, { status: 400 });
  }

  if (!Number.isInteger(size) || size < 64 || size > 2048) {
    return NextResponse.json({ error: "size must be an integer between 64 and 2048" }, { status: 400 });
  }

  if (!["L", "M", "Q", "H"].includes(errorCorrectionLevel)) {
    return NextResponse.json({ error: 'error_correction must be "L", "M", "Q", or "H"' }, { status: 400 });
  }

  if (!Number.isInteger(margin) || margin < 1 || margin > 10) {
    return NextResponse.json({ error: "margin must be an integer between 1 and 10" }, { status: 400 });
  }

  try {
    const buffer = await QRCode.toBuffer(text, {
      width: size,
      errorCorrectionLevel,
      margin,
      type: "png",
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'attachment; filename="qrcode.png"',
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 422 });
  }
}
