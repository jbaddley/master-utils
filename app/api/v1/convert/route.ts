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

  const to = ((form.get("to") as string | null) ?? "").toLowerCase();
  if (!to) return NextResponse.json({ error: "Missing required field: to" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  const FORMAT_MAP: Record<string, { fn: (s: sharp.Sharp) => sharp.Sharp; mime: string; ext: string }> = {
    webp:  { fn: (s) => s.webp({ quality: 90 }),  mime: "image/webp",  ext: "webp"  },
    jpeg:  { fn: (s) => s.jpeg({ quality: 90 }), mime: "image/jpeg", ext: "jpg"   },
    jpg:   { fn: (s) => s.jpeg({ quality: 90 }), mime: "image/jpeg", ext: "jpg"   },
    png:   { fn: (s) => s.png(),                  mime: "image/png",  ext: "png"   },
    avif:  { fn: (s) => s.avif({ quality: 80 }), mime: "image/avif", ext: "avif"  },
  };

  const target = FORMAT_MAP[to];
  if (!target) return NextResponse.json({ error: `Unsupported target format: ${to}` }, { status: 400 });

  try {
    const output = await target.fn(sharp(buffer)).toBuffer();
    return new NextResponse(new Uint8Array(output), {
      headers: {
        "Content-Type": target.mime,
        "Content-Disposition": `attachment; filename="converted.${target.ext}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to convert image" }, { status: 422 });
  }
}
