import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSwimSession, jsonAuthError } from "@/lib/swim/authz";
import { slugify } from "@/lib/swim/slug";

export async function GET() {
  try {
    const user = await requireSwimSession();
    const memberships = await prisma.swimOrgMember.findMany({
      where: { userId: user.id },
      include: { org: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ orgs: memberships.map((m) => ({ ...m.org, role: m.role })) });
  } catch (err) {
    return jsonAuthError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSwimSession();
    const body = (await req.json()) as { name?: string; location?: string; website?: string };
    if (!body.name?.trim() || !body.location?.trim()) {
      return NextResponse.json({ error: "Name and location required" }, { status: 400 });
    }

    let slug = slugify(body.name);
    const existing = await prisma.swimOrganization.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.swimOrganization.create({
        data: {
          name: body.name!.trim(),
          location: body.location!.trim(),
          website: body.website?.trim() || null,
          slug,
        },
      });
      await tx.swimOrgMember.create({
        data: { orgId: created.id, userId: user.id, role: "admin" },
      });
      return created;
    });

    return NextResponse.json({ org }, { status: 201 });
  } catch (err) {
    return jsonAuthError(err);
  }
}
