import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMember, requireOrgAdmin, jsonAuthError } from "@/lib/swim/authz";
import { generateMeetSlug } from "@/lib/swim/slug";

type Params = { params: Promise<{ orgId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgMember(orgId);
    const meets = await prisma.swimMeet.findMany({
      where: { orgId },
      orderBy: { startsAt: "desc" },
    });
    return NextResponse.json({ meets });
  } catch (err) {
    return jsonAuthError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgAdmin(orgId);
    const body = (await req.json()) as {
      name?: string;
      startsAt?: string;
      location?: string;
    };
    if (!body.name?.trim() || !body.startsAt || !body.location?.trim()) {
      return NextResponse.json({ error: "Name, date, and location required" }, { status: 400 });
    }

    const org = await prisma.swimOrganization.findUnique({ where: { id: orgId } });
    if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

    const startsAt = new Date(body.startsAt);
    const slug = generateMeetSlug(org.slug, startsAt, body.name);

    const meet = await prisma.swimMeet.create({
      data: {
        orgId,
        name: body.name.trim(),
        startsAt,
        location: body.location.trim(),
        slug,
      },
    });
    return NextResponse.json({ meet }, { status: 201 });
  } catch (err) {
    return jsonAuthError(err);
  }
}
