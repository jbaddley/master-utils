import { NextRequest } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";
import { validateApiKey } from "@/lib/api-auth";

// Allow up to 50 MB request bodies (base64 inflates ~33%)
export const maxDuration = 60;

function base64ToBuffer(b64: string): Buffer {
  return Buffer.from(b64, "base64");
}

function bufferToBase64(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString("base64");
}

function buildMcpServer(): McpServer {
  const server = new McpServer({ name: "utilio", version: "1.0.0" });

  // ── Image tools ─────────────────────────────────────────────────────────

  server.registerTool(
    "compress_image",
    {
      title: "Compress Image",
      description:
        "Compress an image with quality and format control. Returns base64-encoded output.",
      inputSchema: {
        file_base64: z.string().describe("Base64-encoded image file"),
        filename: z.string().describe("Original filename (e.g. photo.jpg)"),
        format: z
          .enum(["webp", "jpeg", "jpg", "png", "avif"])
          .optional()
          .describe("Output format (default: webp)"),
        quality: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("Compression quality 1-100 (default: 80)"),
      },
    },
    async ({ file_base64, format = "webp", quality = 80 }) => {
      const buffer = base64ToBuffer(file_base64);
      const fmt = format === "jpg" ? "jpeg" : format;

      const FORMAT_MAP: Record<string, { fn: (s: sharp.Sharp) => sharp.Sharp; mime: string; ext: string }> = {
        webp:  { fn: (s) => s.webp({ quality }),  mime: "image/webp",  ext: "webp" },
        jpeg:  { fn: (s) => s.jpeg({ quality }), mime: "image/jpeg", ext: "jpg"  },
        png:   { fn: (s) => s.png(),              mime: "image/png",  ext: "png"  },
        avif:  { fn: (s) => s.avif({ quality }), mime: "image/avif", ext: "avif" },
      };

      const target = FORMAT_MAP[fmt];
      if (!target) throw new Error(`Unsupported format: ${format}`);

      const { data, info } = await target.fn(sharp(buffer)).toBuffer({ resolveWithObject: true });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              result_base64: bufferToBase64(data),
              format: target.ext,
              mime_type: target.mime,
              original_size: buffer.length,
              output_size: info.size,
            }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "resize_image",
    {
      title: "Resize Image",
      description:
        "Resize an image to specified dimensions. Returns base64-encoded output.",
      inputSchema: {
        file_base64: z.string().describe("Base64-encoded image file"),
        filename: z.string().describe("Original filename"),
        width: z.number().int().min(1).optional().describe("Target width in pixels"),
        height: z.number().int().min(1).optional().describe("Target height in pixels"),
        fit: z
          .enum(["cover", "contain", "fill", "inside", "outside"])
          .optional()
          .describe("Resize fit mode (default: inside)"),
        format: z
          .enum(["webp", "jpeg", "jpg", "png", "avif"])
          .optional()
          .describe("Output format (default: jpeg)"),
      },
    },
    async ({ file_base64, width, height, fit = "inside", format }) => {
      if (!width && !height) throw new Error("Provide at least one of: width, height");

      const buffer = base64ToBuffer(file_base64);
      const fits = ["cover", "contain", "fill", "inside", "outside"] as const;
      const fitValue = (fits as readonly string[]).includes(fit)
        ? (fit as (typeof fits)[number])
        : "inside";

      let pipeline = sharp(buffer).resize({ width, height, fit: fitValue });

      let mime = "image/jpeg";
      let ext = "jpg";
      if (format === "webp")       { pipeline = pipeline.webp({ quality: 92 }); mime = "image/webp"; ext = "webp"; }
      else if (format === "png")   { pipeline = pipeline.png();                 mime = "image/png";  ext = "png";  }
      else if (format === "avif")  { pipeline = pipeline.avif({ quality: 80 }); mime = "image/avif"; ext = "avif"; }
      else                         { pipeline = pipeline.jpeg({ quality: 92 }); }

      const output = await pipeline.toBuffer();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              result_base64: bufferToBase64(output),
              format: ext,
              mime_type: mime,
            }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "convert_image",
    {
      title: "Convert Image",
      description: "Convert an image to a different format. Returns base64-encoded output.",
      inputSchema: {
        file_base64: z.string().describe("Base64-encoded image file"),
        filename: z.string().describe("Original filename"),
        to: z
          .enum(["webp", "jpeg", "jpg", "png", "avif"])
          .describe("Target format"),
      },
    },
    async ({ file_base64, to }) => {
      const buffer = base64ToBuffer(file_base64);
      const FORMAT_MAP: Record<string, { fn: (s: sharp.Sharp) => sharp.Sharp; mime: string; ext: string }> = {
        webp: { fn: (s) => s.webp({ quality: 90 }), mime: "image/webp",  ext: "webp" },
        jpeg: { fn: (s) => s.jpeg({ quality: 90 }), mime: "image/jpeg", ext: "jpg"  },
        jpg:  { fn: (s) => s.jpeg({ quality: 90 }), mime: "image/jpeg", ext: "jpg"  },
        png:  { fn: (s) => s.png(),                 mime: "image/png",  ext: "png"  },
        avif: { fn: (s) => s.avif({ quality: 80 }), mime: "image/avif", ext: "avif" },
      };

      const target = FORMAT_MAP[to];
      if (!target) throw new Error(`Unsupported format: ${to}`);

      const output = await target.fn(sharp(buffer)).toBuffer();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              result_base64: bufferToBase64(output),
              format: target.ext,
              mime_type: target.mime,
            }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "crop_image",
    {
      title: "Crop Image",
      description:
        "Crop a region from an image using pixel coordinates. Returns base64-encoded output.",
      inputSchema: {
        file_base64: z.string().describe("Base64-encoded image file"),
        filename: z.string().describe("Original filename"),
        x: z.number().int().min(0).describe("Left offset in pixels"),
        y: z.number().int().min(0).describe("Top offset in pixels"),
        width: z.number().int().min(1).describe("Crop width in pixels"),
        height: z.number().int().min(1).describe("Crop height in pixels"),
        format: z
          .enum(["webp", "jpeg", "png", "avif"])
          .optional()
          .describe("Output format (default: jpeg)"),
      },
    },
    async ({ file_base64, x, y, width, height, format }) => {
      const buffer = base64ToBuffer(file_base64);
      let pipeline = sharp(buffer).extract({ left: x, top: y, width, height });

      let mime = "image/jpeg";
      let ext = "jpg";
      if (format === "webp")      { pipeline = pipeline.webp({ quality: 92 }); mime = "image/webp"; ext = "webp"; }
      else if (format === "png")  { pipeline = pipeline.png();                 mime = "image/png";  ext = "png";  }
      else if (format === "avif") { pipeline = pipeline.avif({ quality: 80 }); mime = "image/avif"; ext = "avif"; }
      else                        { pipeline = pipeline.jpeg({ quality: 92 }); }

      const output = await pipeline.toBuffer();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              result_base64: bufferToBase64(output),
              format: ext,
              mime_type: mime,
            }),
          },
        ],
      };
    },
  );

  // ── QR code ─────────────────────────────────────────────────────────────

  server.registerTool(
    "generate_qr_code",
    {
      title: "Generate QR Code",
      description: "Generate a QR code PNG from text or URL. Returns base64-encoded PNG.",
      inputSchema: {
        text: z.string().min(1).describe("Text or URL to encode"),
        size: z
          .number()
          .int()
          .min(64)
          .max(2048)
          .optional()
          .describe("Output size in pixels (default: 256)"),
        error_correction: z
          .enum(["L", "M", "Q", "H"])
          .optional()
          .describe("Error correction level (default: M)"),
        margin: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .describe("Quiet zone size in modules (default: 2)"),
      },
    },
    async ({ text, size = 256, error_correction = "M", margin = 2 }) => {
      const buffer = await QRCode.toBuffer(text, {
        width: size,
        errorCorrectionLevel: error_correction as "L" | "M" | "Q" | "H",
        margin,
        type: "png",
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              result_base64: bufferToBase64(buffer),
              format: "png",
              mime_type: "image/png",
              size,
            }),
          },
        ],
      };
    },
  );

  // ── PDF tools ────────────────────────────────────────────────────────────

  server.registerTool(
    "merge_pdfs",
    {
      title: "Merge PDFs",
      description:
        "Merge multiple PDF files into a single PDF. Returns base64-encoded result.",
      inputSchema: {
        files_base64: z
          .array(z.string())
          .min(2)
          .describe("Array of base64-encoded PDF files (minimum 2)"),
      },
    },
    async ({ files_base64 }) => {
      const merged = await PDFDocument.create();

      for (const b64 of files_base64) {
        const doc = await PDFDocument.load(base64ToBuffer(b64));
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }

      const output = await merged.save();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              result_base64: bufferToBase64(output),
              format: "pdf",
              mime_type: "application/pdf",
              page_count: merged.getPageCount(),
            }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "split_pdf",
    {
      title: "Split PDF",
      description:
        "Split a PDF into individual pages or a page range. Returns an array of base64-encoded single-page PDFs.",
      inputSchema: {
        file_base64: z.string().describe("Base64-encoded PDF file"),
        pages: z
          .string()
          .optional()
          .describe(
            'Page range string, e.g. "1-3,5,7-9" (1-based). Omit to split all pages.',
          ),
      },
    },
    async ({ file_base64, pages: pagesParam }) => {
      const doc = await PDFDocument.load(base64ToBuffer(file_base64));
      const total = doc.getPageCount();

      let indices: number[];
      if (!pagesParam) {
        indices = Array.from({ length: total }, (_, i) => i);
      } else {
        const raw: number[] = [];
        for (const part of pagesParam.split(",")) {
          const range = part.trim();
          if (!range) continue;
          if (range.includes("-")) {
            const [a, b] = range.split("-").map(Number);
            for (let i = a; i <= b; i++) raw.push(i - 1);
          } else {
            raw.push(Number(range) - 1);
          }
        }
        indices = [...new Set(raw)].filter((i) => i >= 0 && i < total).sort((a, b) => a - b);
      }

      if (!indices.length) throw new Error("No valid pages in the specified range");

      const resultPages: Array<{ page: number; base64: string }> = [];
      for (const idx of indices) {
        const single = await PDFDocument.create();
        const [copied] = await single.copyPages(doc, [idx]);
        single.addPage(copied);
        const bytes = await single.save();
        resultPages.push({ page: idx + 1, base64: bufferToBase64(bytes) });
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              pages: resultPages,
              total: resultPages.length,
              source_page_count: total,
            }),
          },
        ],
      };
    },
  );

  return server;
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.ok) return auth.response;

  const server = buildMcpServer();

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  return transport.handleRequest(req);
}

// MCP clients may also send GET (for SSE) and DELETE (session teardown)
export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.ok) return auth.response;

  const server = buildMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  return transport.handleRequest(req);
}

export async function DELETE(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.ok) return auth.response;

  const server = buildMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  return transport.handleRequest(req);
}
