import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { validateApiKey } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.ok) return auth.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Request must be multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Missing required field: file" }, { status: 400 });

  const x = Math.max(0, Math.round(Number(form.get("x") ?? "0")));
  const y = Math.max(0, Math.round(Number(form.get("y") ?? "0")));
  const width = Math.max(1, Math.round(Number(form.get("width") ?? "0")));
  const height = Math.max(1, Math.round(Number(form.get("height") ?? "0")));

  if (!Number(form.get("width")) || !Number(form.get("height"))) {
    return NextResponse.json({ error: "width and height are required" }, { status: 400 });
  }

  const format = ((form.get("format") as string | null) ?? "").toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let pipeline = sharp(buffer).extract({ left: x, top: y, width, height });

    let mime = "image/jpeg";
    let ext = "jpg";
    if (format === "webp")      { pipeline = pipeline.webp({ quality: 92 }); mime = "image/webp"; ext = "webp"; }
    else if (format === "png")  { pipeline = pipeline.png();                 mime = "image/png";  ext = "png";  }
    else if (format === "avif") { pipeline = pipeline.avif({ quality: 80 }); mime = "image/avif"; ext = "avif"; }
    else                        { pipeline = pipeline.jpeg({ quality: 92 }); }

    const output = await pipeline.toBuffer();
    return new NextResponse(new Uint8Array(output), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="cropped.${ext}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to crop image — check that crop region is within image bounds" }, { status: 422 });
  }
}
