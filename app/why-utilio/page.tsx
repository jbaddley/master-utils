import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { RaisingBostonProgress } from "@/components/RaisingBostonProgress";
import { Button } from "@/components/ui/button";
import { DonateButtonSlot } from "@/components/DonateButtonSlot";
import { getDonationProductId } from "@/lib/donation";
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
  title: "About Me — Raising Boston",
  description:
    "Jason Baddley builds privacy-first tools and community utilities like Utilio Swim. Support publishing Raising Boston — a family story about Boston Mack and Darnay Wiggins.",
  path: "/why-utilio",
});

export default function WhyUtilioPage() {
  const donationsConfigured = Boolean(getDonationProductId());

  return (
    <main className="page why-utilio-page">
      <div className="hero">
        <h1>About Me</h1>
        <p className="lede">
          I build privacy-first tools — from in-browser image utilities to
          community software like a swim meet manager — so people and local
          groups can get real work done without surprise fees or unclear data
          handling. Utilio is also how I create sustainable side income for my
          family.
        </p>
      </div>

      <div className="prose why-utilio-section">
        <h2>Background</h2>
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
          that&apos;s enterprise scheduling software for 27,000+ users or image
          tools designed to keep processing as local as possible.
        </p>
      </div>

      <div className="prose why-utilio-section">
        <h2>Community tools</h2>
        <p>
          Not everything I build is a personal productivity app. I also create
          free utilities for communities that are often stuck paying for software
          they barely use — swim leagues, clubs, and volunteer-run organizations
          that deserve capable tools without a subscription bill.
        </p>
        <p>
          <strong>Utilio Swim</strong>{" "}
          is a swim meet manager that lets leagues import meet programs, edit
          entries, publish heat sheets, and share public links with families.
          It&apos;s free to use: no per-athlete fees, no paywall on the basics
          communities actually need.
        </p>
        <p>
          <Link href="/swim/">Explore Utilio Swim</Link>
        </p>
      </div>

      <div className="prose why-utilio-section">
        <h2>My Why</h2>
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
          {donationsConfigured && (
            <Card>
              <CardHeader>
                <CardTitle>Support the book</CardTitle>
                <CardDescription>
                  Every contribution moves us closer to the {formatUsd(GOAL_CENTS)}{" "}
                  we need to publish independently.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DonateButtonSlot variant="default" size="default" />
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
