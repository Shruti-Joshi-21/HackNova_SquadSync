import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import Landing from "@/components/landing/Landing";

// Landing page at "/". It sits outside the (shell) group, so it has no top
// bar; the mentor list is at /mentor. Its fonts are used on this page only.

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic", variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "SquadSync — Spot merge conflicts before they happen",
  description: "SquadSync reads a team's Git history and task board and shows each collaboration risk with its evidence and one next step.",
};

export default function HomePage() {
  return (
    <div className={`${inter.variable} ${serif.variable}`}>
      <Landing />
    </div>
  );
}
