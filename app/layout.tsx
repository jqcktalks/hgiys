import type { Metadata } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { Wrap } from "./ui";
import { Heart } from 'lucide-react';
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HGIYS? How good is your station?",
    template: "%s · HGIYS?",
  },
  description:
    "Every railway station in Great Britain, ranked against every other, from the ORR's published punctuality and cancellation figures.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <header className="sticky top-0 z-50 border-b border-line bg-white/[0.88] backdrop-blur-xl backdrop-saturate-[1.8]">
          <Wrap className="flex h-[58px] items-center justify-between gap-5">
            <Link href="/" className="text-base font-bold tracking-[-0.02em]">
              HGIYS
            </Link>
            <nav className="flex gap-5 text-sm text-ink-2">
              <Link href="/stations" className="hover:text-ink">
                Stations
              </Link>
              <Link href="/method" className="hover:text-ink">
                Method
              </Link>
            </nav>
          </Wrap>
        </header>

        <main>{children}</main>

        <footer className="mt-14 border-t border-line pt-7 pb-12 text-[13px] text-ink-3">
          <Wrap className="flex flex-wrap justify-between gap-5">
            <div>Data: ORR (Open Government Licence v3.0)</div>
            <div className="flex items-center gap-1.5">
              Made with
              <Heart className="size-3.5 fill-red-500 text-red-500" aria-label="love" />
              by{" "}
              <a
                href="https://github.com/jqcktalks"
                rel="noreferrer"
                className="text-ink-2 hover:text-accent hover:underline"
              >
                Jack Dawson
              </a>
            </div>
          </Wrap>
        </footer>

        <Analytics />
      </body>
    </html>
  );
}
