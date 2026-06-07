import { NextRequest, NextResponse } from "next/server";
import type { SwimOrgRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrgMember, ORG_INVITE_OPERATIONAL_ROLES, jsonAuthError } from "@/lib/swim/authz";

type Params = { params: Promise<{ orgId: string; inviteId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { orgId, inviteId } = await params;
    await requireOrgMember(orgId, ORG_INVITE_OPERATIONAL_ROLES);
    const body = (await req.json()) as {
      role?: SwimOrgRole;
      status?: "revoked";
    };

    const invite = await prisma.swimOrgInvite.update({
      where: { id: inviteId, orgId },
      data: {
        ...(body.role ? { role: body.role } : {}),
        ...(body.status === "revoked" ? { status: "revoked" } : {}),
      },
    });
    return NextResponse.json({ invite });
  } catch (err) {
    return jsonAuthError(err);
  }
}
