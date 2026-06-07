import { NextRequest, NextResponse } from "next/server";
import type { SwimOrgRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireOrgMember,
  canInviteRole,
  ORG_INVITE_OPERATIONAL_ROLES,
  jsonAuthError,
} from "@/lib/swim/authz";
import { generateInviteToken } from "@/lib/swim/slug";
import { sendSwimEmail, swimInviteEmail } from "@/lib/email/swim";

type Params = { params: Promise<{ orgId: string }> };

const ALL_ROLES: SwimOrgRole[] = ["admin", "manager", "director", "coach", "guardian", "student"];

function parseEmails(text: string): string[] {
  return [...new Set(
    text
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
  )];
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgMember(orgId, ORG_INVITE_OPERATIONAL_ROLES);
    const invites = await prisma.swimOrgInvite.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ invites });
  } catch (err) {
    return jsonAuthError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { orgId } = await params;
    const { member } = await requireOrgMember(orgId, ORG_INVITE_OPERATIONAL_ROLES);
    const body = (await req.json()) as {
      emails?: string;
      role?: SwimOrgRole;
      sendEmail?: boolean;
    };

    const emails = parseEmails(body.emails ?? "");
    if (emails.length === 0) {
      return NextResponse.json({ error: "No valid emails" }, { status: 400 });
    }
    const role = body.role ?? "manager";

    if (!ALL_ROLES.includes(role) || !canInviteRole(member.role, role)) {
      return NextResponse.json({ error: "Cannot invite with this role" }, { status: 403 });
    }

    const org = await prisma.swimOrganization.findUnique({ where: { id: orgId } });
    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const baseUrl = process.env.NEXT_PUBLIC_SWIM_URL ?? "http://localhost:3742/swim";
    const created = [];

    for (const email of emails) {
      const existingMember = await prisma.swimOrgMember.findFirst({
        where: { orgId, user: { email } },
      });
      if (existingMember) continue;

      const token = generateInviteToken();
      const invite = await prisma.swimOrgInvite.upsert({
        where: { orgId_email: { orgId, email } },
        create: { orgId, email, role, token, status: "pending" },
        update: { role, token, status: "pending", sentAt: null, acceptedAt: null },
      });

      const inviteUrl = `${baseUrl}/invite/${token}/`;
      if (body.sendEmail !== false) {
        const { subject, text, html } = swimInviteEmail({
          orgName: org.name,
          role,
          inviteUrl,
        });
        await sendSwimEmail({ to: email, subject, text, html });
        await prisma.swimOrgInvite.update({
          where: { id: invite.id },
          data: { sentAt: new Date() },
        });
      }
      created.push({ ...invite, inviteUrl });
    }

    return NextResponse.json({ invites: created }, { status: 201 });
  } catch (err) {
    return jsonAuthError(err);
  }
}
