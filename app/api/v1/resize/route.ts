import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { validateApiKey } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.ok) return auth.response;

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "Request must be multipart/form-data" }, { status: 400 }); }

  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Missing required field: file" }, { status: 400 });

  const widthRaw  = form.get("width");
  const heightRaw = form.get("height");
  const width  = widthRaw  ? Math.max(1, Math.round(Number(widthRaw)))  : undefined;
  const height = heightRaw ? Math.max(1, Math.round(Number(heightRaw))) : undefined;

  if (!width && !height) {
    return NextResponse.json({ error: "Provide at least one of: width, height" }, { status: 400 });
  }

  const fitParam = (form.get("fit") as string | null) ?? "inside";
  const fits = ["cover", "contain", "fill", "inside", "outside"] as const;
  const fit = (fits as readonly string[]).includes(fitParam)
    ? (fitParam as typeof fits[number])
    : "inside";

  const format = ((form.get("format") as string | null) ?? "").toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let pipeline = sharp(buffer).resize({ width, height, fit });

    let mime = "image/jpeg";
    let ext  = "jpg";
    if (format === "webp")      { pipeline = pipeline.webp({ quality: 92 }); mime = "image/webp"; ext = "webp"; }
    else if (format === "png")  { pipeline = pipeline.png();                 mime = "image/png";  ext = "png";  }
    else if (format === "avif") { pipeline = pipeline.avif({ quality: 80 }); mime = "image/avif"; ext = "avif"; }
    else                        { pipeline = pipeline.jpeg({ quality: 92 }); }

    const output = await pipeline.toBuffer();
    return new NextResponse(new Uint8Array(output), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="resized.${ext}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to resize image" }, { status: 422 });
  }
}
