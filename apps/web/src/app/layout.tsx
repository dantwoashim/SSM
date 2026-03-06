import type { Metadata } from "next";
import { Space_Grotesk, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Identity Go-Live Assurance",
  description:
    "Close enterprise deals faster with buyer-shareable assurance reports for SSO, SCIM, and identity rollout readiness.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <header className="site-shell">
          <div className="topbar">
            <Link className="brand" href="/">
              Identity Go-Live Assurance
            </Link>
            <nav className="nav">
              <Link href="/how-it-works">How it works</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="/security">Security</Link>
              <Link href="/resources/top-10-failures">Top 10 failures</Link>
              <Link href="/resources/sample-report">Sample report</Link>
              <Link href="/login" className="nav-cta">
                Portal
              </Link>
            </nav>
          </div>
        </header>
        <main className="site-shell">{children}</main>
      </body>
    </html>
  );
}
