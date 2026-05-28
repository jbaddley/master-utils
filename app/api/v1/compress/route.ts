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

  const format = ((form.get("format") as string | null) ?? "webp").toLowerCase();
  const quality = Math.min(100, Math.max(1, Number(form.get("quality") ?? "80")));

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let pipeline = sharp(buffer);
    let mime: string;

    if (format === "webp") { pipeline = pipeline.webp({ quality }); mime = "image/webp"; }
    else if (format === "jpeg" || format === "jpg") { pipeline = pipeline.jpeg({ quality }); mime = "image/jpeg"; }
    else if (format === "png") { pipeline = pipeline.png(); mime = "image/png"; }
    else if (format === "avif") { pipeline = pipeline.avif({ quality }); mime = "image/avif"; }
    else return NextResponse.json({ error: `Unsupported format: ${format}` }, { status: 400 });

    const output = await pipeline.toBuffer({ resolveWithObject: true });

    return new NextResponse(new Uint8Array(output.data), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="compressed.${format}"`,
        "X-Original-Size": String(file.size),
        "X-Output-Size": String(output.info.size),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to process image" }, { status: 422 });
  }
}
