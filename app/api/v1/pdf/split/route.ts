import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { validateApiKey } from "@/lib/api-auth";

function parsePageRanges(param: string, total: number): number[] {
  const indices: number[] = [];
  for (const part of param.split(",")) {
    const range = part.trim();
    if (!range) continue;
    if (range.includes("-")) {
      const [a, b] = range.split("-").map(Number);
      for (let i = a; i <= b; i++) indices.push(i - 1);
    } else {
      indices.push(Number(range) - 1);
    }
  }
  return [...new Set(indices)].filter((i) => i >= 0 && i < total).sort((a, b) => a - b);
}

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

  const pagesParam = (form.get("pages") as string | null) ?? "";

  try {
    const buffer = await file.arrayBuffer();
    const doc = await PDFDocument.load(buffer);
    const total = doc.getPageCount();

    const indices = pagesParam
      ? parsePageRanges(pagesParam, total)
      : Array.from({ length: total }, (_, i) => i);

    if (!indices.length) {
      return NextResponse.json({ error: "No valid pages in the specified range" }, { status: 400 });
    }

    const pages: Array<{ page: number; base64: string }> = [];
    for (const idx of indices) {
      const single = await PDFDocument.create();
      const [copied] = await single.copyPages(doc, [idx]);
      single.addPage(copied);
      const bytes = await single.save();
      pages.push({ page: idx + 1, base64: Buffer.from(bytes).toString("base64") });
    }

    return NextResponse.json({ pages, total: pages.length, source_pages: total });
  } catch {
    return NextResponse.json({ error: "Failed to split PDF — ensure the file is a valid PDF" }, { status: 422 });
  }
}
