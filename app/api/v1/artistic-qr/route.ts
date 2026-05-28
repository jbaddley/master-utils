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
    return NextResponse.json({ error: "Pro plan required for AI artistic QR codes" }, { status: 403 });
  }

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken) {
    return NextResponse.json({ error: "AI artistic QR is not configured on this server" }, { status: 503 });
  }

  // Expect multipart form: qr_content, prompt, optional negative_prompt
  const form = await req.formData();
  const qr_content = form.get("qr_content");
  const prompt = form.get("prompt");
  const negative_prompt = form.get("negative_prompt");

  if (typeof qr_content !== "string" || !qr_content.trim()) {
    return NextResponse.json({ error: "qr_content is required" }, { status: 400 });
  }
  if (typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const { default: Replicate } = await import("replicate");
  const replicate = new Replicate({ auth: replicateToken });

  const output = await replicate.run(
    "zylim0702/qr_code_controlnet:628578d54bc4e002d68b93f9bcf44f5660e408af6c23dd1e93b86c68cd33b75f",
    {
      input: {
        qr_code_content: qr_content,
        prompt,
        negative_prompt: typeof negative_prompt === "string" && negative_prompt.trim() ? negative_prompt : "ugly, blurry",
        seed: -1,
        denoising_strength: 0.85,
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
