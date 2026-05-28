import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import JSZip from "jszip";
import { validateApiKey } from "@/lib/api-auth";

const SIZES = [16, 32, 48, 64, 128, 180, 192, 512] as const;

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.ok) return auth.response;

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "Request must be multipart/form-data" }, { status: 400 }); }

  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Missing required field: file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const zip = new JSZip();

    await Promise.all(
      SIZES.map(async (size) => {
        const png = await sharp(buffer)
          .resize(size, size, { fit: "cover", position: "centre" })
          .png()
          .toBuffer();
        const label = size === 180 ? "apple-touch-icon" : `favicon-${size}`;
        zip.file(`${label}.png`, png);
      }),
    );

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="favicons.zip"',
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate favicons" }, { status: 422 });
  }
}
