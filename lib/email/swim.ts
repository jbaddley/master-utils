import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function swimEmailFrom(): string {
  const address = process.env.SWIM_EMAIL_FROM ?? "meets@utilio.solutions";
  const name = process.env.SWIM_EMAIL_FROM_NAME ?? "Utilio Swim";
  return `${name} <${address}>`;
}

function hasSesCredentials(): boolean {
  return Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

let sesClient: SESClient | null = null;

function getSesClient(): SESClient {
  if (!sesClient) {
    sesClient = new SESClient({
      region: process.env.AWS_SES_REGION ?? process.env.AWS_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return sesClient;
}

export async function sendSwimEmail({ to, subject, html, text }: SendEmailParams): Promise<boolean> {
  if (!hasSesCredentials()) {
    console.info("[swim-email stub] missing AWS credentials", { to, subject });
    return false;
  }

  try {
    await getSesClient().send(
      new SendEmailCommand({
        Source: swimEmailFrom(),
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: text, Charset: "UTF-8" },
            Html: { Data: html, Charset: "UTF-8" },
          },
        },
      }),
    );
    return true;
  } catch (err) {
    console.error("[swim-email failed]", err instanceof Error ? err.message : err);
    return false;
  }
}

export function swimInviteEmail(params: {
  orgName: string;
  role: string;
  inviteUrl: string;
}) {
  const subject = `You're invited to ${params.orgName} on Utilio Swim`;
  const text = `You've been invited as ${params.role} for ${params.orgName}.\n\nAccept: ${params.inviteUrl}`;
  const html = `<p>You've been invited as <strong>${params.role}</strong> for <strong>${params.orgName}</strong>.</p><p><a href="${params.inviteUrl}">Accept invitation</a></p>`;
  return { subject, text, html };
}

export function swimMeetUpdateEmail(params: {
  orgName: string;
  meetName: string;
  meetDate: string;
  publicUrl: string;
  isNew: boolean;
}) {
  const subject = params.isNew
    ? `New meet: ${params.meetName}`
    : `Meet updated: ${params.meetName}`;
  const text = `${params.orgName} — ${params.meetName} on ${params.meetDate}\n\nView: ${params.publicUrl}`;
  const html = `<p><strong>${params.orgName}</strong></p><p>${params.isNew ? "New meet" : "Updated meet"}: <strong>${params.meetName}</strong></p><p>${params.meetDate}</p><p><a href="${params.publicUrl}">View meet program</a></p>`;
  return { subject, text, html };
}

const meetNotifyDebounce = new Map<string, NodeJS.Timeout>();

export function debouncedMeetNotification(
  meetId: string,
  fn: () => Promise<void>,
  delayMs = 5 * 60 * 1000,
) {
  const existing = meetNotifyDebounce.get(meetId);
  if (existing) clearTimeout(existing);
  meetNotifyDebounce.set(
    meetId,
    setTimeout(() => {
      meetNotifyDebounce.delete(meetId);
      void fn();
    }, delayMs),
  );
}

export async function notifyMeetFollowers(meetId: string, isNew: boolean) {
  const meet = await import("@/lib/prisma").then((m) =>
    m.prisma.swimMeet.findUnique({
      where: { id: meetId },
      include: { org: { include: { followers: { include: { user: true } } } } },
    }),
  );
  if (!meet?.publishedAt) return;

  const publicUrl = `${process.env.NEXT_PUBLIC_SWIM_URL ?? "https://swim.utilio.solutions"}/m/${meet.slug}/`;
  const meetDate = meet.startsAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const { subject, text, html } = swimMeetUpdateEmail({
    orgName: meet.org.name,
    meetName: meet.name,
    meetDate,
    publicUrl,
    isNew,
  });

  for (const follower of meet.org.followers) {
    if (!follower.emailMeetUpdates) continue;
    await sendSwimEmail({ to: follower.user.email, subject, html, text });
  }
}
