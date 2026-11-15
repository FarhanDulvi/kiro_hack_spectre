import type { Metadata } from "next";
import {
  Instrument_Serif,
  Noto_Naskh_Arabic,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_Myanmar,
  Space_Grotesk,
} from "next/font/google";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const ui = Space_Grotesk({ variable: "--font-ui", weight: ["400", "500", "700"], subsets: ["latin"] });
const display = Instrument_Serif({ variable: "--font-display", weight: "400", style: ["normal", "italic"], subsets: ["latin"] });
const bn = Noto_Sans_Bengali({ variable: "--font-bn", weight: ["400", "700"], preload: false });
const deva = Noto_Sans_Devanagari({ variable: "--font-deva", weight: ["400", "700"], preload: false });
const mya = Noto_Sans_Myanmar({ variable: "--font-mya", weight: ["400", "700"], preload: false });
const urdu = Noto_Naskh_Arabic({ variable: "--font-urdu", weight: ["400", "700"], preload: false });

export const metadata: Metadata = {
  title: "Perisai: disaster response for Malaysia",
  description:
    "Perisai detects official Malaysian disaster warnings, verifies them, and responds: warnings in the languages migrant workers speak, sirens in worker dormitories, and relief payouts on a public ledger.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${ui.variable} ${display.variable} ${bn.variable} ${deva.variable} ${mya.variable} ${urdu.variable} h-full`}
    >
      <body className="min-h-full">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
