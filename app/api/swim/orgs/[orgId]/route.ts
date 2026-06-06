import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMember, jsonAuthError } from "@/lib/swim/authz";

type Params = { params: Promise<{ orgId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgMember(orgId);
    const org = await prisma.swimOrganization.findUnique({
      where: { id: orgId },
      include: {
        members: { include: { user: { select: { id: true, email: true, name: true } } } },
        _count: { select: { meets: true, invites: true } },
      },
    });
    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ org });
  } catch (err) {
    return jsonAuthError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgMember(orgId, ["admin"]);
    const body = (await req.json()) as { name?: string; location?: string; website?: string };
    const org = await prisma.swimOrganization.update({
      where: { id: orgId },
      data: {
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.location ? { location: body.location.trim() } : {}),
        ...(body.website !== undefined ? { website: body.website?.trim() || null } : {}),
      },
    });
    return NextResponse.json({ org });
  } catch (err) {
    return jsonAuthError(err);
  }
}
