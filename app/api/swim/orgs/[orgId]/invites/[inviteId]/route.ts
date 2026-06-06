import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin, jsonAuthError } from "@/lib/swim/authz";

type Params = { params: Promise<{ orgId: string; inviteId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { orgId, inviteId } = await params;
    await requireOrgAdmin(orgId);
    const body = (await req.json()) as {
      role?: "admin" | "manager";
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
