import type { Metadata } from "next";
import Script from "next/script";
import { headers } from "next/headers";
import { SessionProvider } from "next-auth/react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { AuthProvider } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { CommandPaletteProvider } from "@/context/CommandPaletteContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { CommandPalette } from "@/components/CommandPalette";
import { getSubdomainLabel } from "@/lib/subdomains";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Utilio — Online Media & Utility Tools",
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Privacy-first media utilities for images, audio, video, PDFs, and more. Many tools run in your browser; Pro adds batch processing and power features.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const host = (await headers()).get("host") ?? "";
  const isSwimSubdomain = getSubdomainLabel(host) === "swim";

  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <SessionProvider>
          <AuthProvider>
            <CommandPaletteProvider>
              <FavoritesProvider>
                <SiteHeader isSwimSubdomain={isSwimSubdomain} />
                {children}
                <SiteFooter />
                <AuthModal />
                <CommandPalette />
              </FavoritesProvider>
            </CommandPaletteProvider>
          </AuthProvider>
        </SessionProvider>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">{`
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
    `}</Script>
          </>
        )}
        {process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        {process.env.NEXT_PUBLIC_POSTHOG_KEY && (
          <Script id="posthog-init" strategy="afterInteractive">{`
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]);t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+" (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getNextSurveyStep onSessionId setPersonPropertiesForFlags".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('${process.env.NEXT_PUBLIC_POSTHOG_KEY}', {api_host: '${process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'}', person_profiles: 'identified_only'});
  `}</Script>
        )}
      </body>
    </html>
  );
}
