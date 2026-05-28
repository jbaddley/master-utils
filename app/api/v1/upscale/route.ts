import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60; // Replicate can take up to 60s

export async function POST(req: NextRequest) {
  // Auth — Pro users only
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.plan !== "pro") {
    return NextResponse.json({ error: "Pro plan required for AI upscaling" }, { status: 403 });
  }

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken) {
    return NextResponse.json({ error: "AI upscaling is not configured on this server" }, { status: 503 });
  }

  // Expect multipart form: image file + scale factor
  const form = await req.formData();
  const imageFile = form.get("image");
  const scale = Number(form.get("scale") ?? 4);

  if (!(imageFile instanceof File)) {
    return NextResponse.json({ error: "image file required" }, { status: 400 });
  }
  if (![2, 4].includes(scale)) {
    return NextResponse.json({ error: "scale must be 2 or 4" }, { status: 400 });
  }

  // Convert file to base64 data URL for Replicate input
  const buf = await imageFile.arrayBuffer();
  const b64 = Buffer.from(buf).toString("base64");
  const dataUrl = `data:${imageFile.type || "image/png"};base64,${b64}`;

  const { default: Replicate } = await import("replicate");
  const replicate = new Replicate({ auth: replicateToken });

  // nightmareai/real-esrgan: well-known ESRGAN upscaler on Replicate
  const output = await replicate.run("nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa", {
    input: {
      image: dataUrl,
      scale,
      face_enhance: false,
    },
  });

  // Replicate returns a URL string for the output image
  const outputUrl = Array.isArray(output) ? output[0] : output;
  if (typeof outputUrl !== "string") {
    return NextResponse.json({ error: "Unexpected Replicate response" }, { status: 502 });
  }

  // Proxy the image bytes back to the client so we don't leak the Replicate URL
  const imgRes = await fetch(outputUrl);
  const imgBuf = await imgRes.arrayBuffer();
  const contentType = imgRes.headers.get("content-type") ?? "image/png";

  return new NextResponse(imgBuf, {
    status: 200,
    headers: { "Content-Type": contentType },
  });
}
