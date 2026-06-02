import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
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

  const files = form.getAll("files") as File[];
  if (files.length < 2) {
    return NextResponse.json({ error: "Provide at least 2 PDF files in the 'files' field" }, { status: 400 });
  }

  try {
    const merged = await PDFDocument.create();

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }

    const output = await merged.save();
    return new NextResponse(new Uint8Array(output), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="merged.pdf"',
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to merge PDFs — ensure all files are valid PDFs" }, { status: 422 });
  }
}
