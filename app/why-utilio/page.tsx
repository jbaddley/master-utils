import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { RaisingBostonProgress } from "@/components/RaisingBostonProgress";
import { Button } from "@/components/ui/button";
import { getDonationLink } from "@/lib/donation";
import {
  BETA_READ_URL,
  GOAL_CENTS,
  PROFESSIONALS_URL,
  PUBLISHERS_URL,
  formatUsd,
} from "@/lib/raising-boston";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Why Utilio — Raising Boston",
  description:
    "Utilio is free, privacy-first tools built by Jason Baddley. Support publishing Raising Boston — a family story about Boston Mack and Darnay Wiggins.",
  path: "/why-utilio",
});

export default function WhyUtilioPage() {
  const donationLink = getDonationLink();

  return (
    <main className="page why-utilio-page">
      <div className="hero">
        <h1>Why Utilio</h1>
        <p className="lede">
          Utilio is a collection of free, privacy-first tools that run entirely in
          your browser. I built them to help people get things done without
          uploading files to strangers — and to create sustainable side income
          for my family.
        </p>
      </div>

      <div className="prose why-utilio-section">
        <h2>About Jason</h2>
        <p>
          I&apos;m Jason Baddley, a fullstack engineering leader based in Lehi,
          Utah. I&apos;ve spent more than a decade building with React, TypeScript,
          Node.js, and Postgres — helping small businesses solve real problems
          with software.
        </p>
        <p>
          Today I&apos;m a Senior Software Engineer at SchoolAI and the founder of
          Real Growth Media, where I help small businesses get off the ground with
          modern web tools. Before that I led frontend teams at Weave HQ and
          Angel Studios, and I&apos;ve taught React development at Mountainland
          Technical College.
        </p>
        <p>
          I love building things that make people&apos;s lives easier — whether
          that&apos;s enterprise scheduling software for 27,000+ users or a free
          image compressor that never sees your files.
        </p>
      </div>

      <div className="prose why-utilio-section">
        <h2>Raising Boston</h2>
        <p>
          For years, my four kids grew up listening to bedtime stories about the
          adventures of <strong>Boston Mack</strong> and{" "}
          <strong>Darnay Wiggins</strong>. With the help of my wife and our
          children, those stories became a book: <em>Raising Boston</em>.
        </p>
        <p>
          It&apos;s a family project in the truest sense — written together,
          shaped by the voices around our dinner table, and rooted in the kind of
          imagination that only happens when parents tell stories to kids who keep
          asking &ldquo;what happens next?&rdquo;
        </p>
        <p>
          The hope behind Utilio is simple: create enough extra income to hire a
          professional editor, cover artist, and audiobook narrator so we can
          publish <em>Raising Boston</em> independently — on our terms, without
          giving up the heart of the story.
        </p>
      </div>

      <RaisingBostonProgress />

      <section className="why-utilio-cta-grid" aria-labelledby="help-us-publish">
        <h2 id="help-us-publish">Help us publish</h2>
        <div className="why-utilio-cta-cards">
          {donationLink && (
            <Card>
              <CardHeader>
                <CardTitle>Support the book</CardTitle>
                <CardDescription>
                  Every contribution moves us closer to the {formatUsd(GOAL_CENTS)}{" "}
                  we need to publish independently.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  render={
                    <a
                      href={donationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  Donate via Stripe
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Become a beta reader</CardTitle>
              <CardDescription>
                Read early chapters of <em>Raising Boston</em> and share your
                feedback before we publish.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                render={
                  <a
                    href={BETA_READ_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                Sign up at BetaRead
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Publishing professionals</CardTitle>
              <CardDescription>
                Editors, cover artists, audiobook narrators, and other
                publishing professionals — we&apos;re building a team for{" "}
                <em>Raising Boston</em>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                render={
                  <a
                    href={PROFESSIONALS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                Apply to collaborate
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Publishers &amp; agents</CardTitle>
              <CardDescription>
                Literary agents and publishers interested in acquiring{" "}
                <em>Raising Boston</em> can request the full manuscript.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                render={
                  <a
                    href={PUBLISHERS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                Request the manuscript
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="prose why-utilio-section">
        <p>
          Thank you for using Utilio — and for being part of this story.{" "}
          <Link href="/">Explore the tools</Link> or{" "}
          <Link href="/pricing/">see Pro plans</Link> if you want to go further.
        </p>
      </div>
    </main>
  );
}
