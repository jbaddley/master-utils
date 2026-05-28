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
    return NextResponse.json({ error: "Pro plan required for AI denoising" }, { status: 403 });
  }

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken) {
    return NextResponse.json({ error: "AI denoising is not configured on this server" }, { status: 503 });
  }

  // Expect multipart form: image file
  const form = await req.formData();
  const imageFile = form.get("image");

  if (!(imageFile instanceof File)) {
    return NextResponse.json({ error: "image file required" }, { status: 400 });
  }

  // Convert file to base64 data URL for Replicate input
  const buf = await imageFile.arrayBuffer();
  const b64 = Buffer.from(buf).toString("base64");
  const dataUrl = `data:${imageFile.type || "image/png"};base64,${b64}`;

  const { default: Replicate } = await import("replicate");
  const replicate = new Replicate({ auth: replicateToken });

  // sczhou/codeformer: face restoration and enhancement model
  const output = await replicate.run(
    "sczhou/codeformer:7de2ea26c616d5bf2245ad0d5e24f0ff9a6204578a5c876db53142efe8d5bbe6",
    {
      input: {
        image: dataUrl,
        codeformer_fidelity: 0.7,
        upscale: 1,
        has_aligned: false,
        only_aligned_face: false,
        detection_model: "retinaface_resnet50",
        bg_upsampler: "realesrgan",
        bg_tile: 400,
        face_upsample: false,
      },
    },
  );

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
