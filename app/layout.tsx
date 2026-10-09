import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "citysignal - normalized Toronto building permits",
  description:
    "One clean API over Toronto's messy open data. Search 202,779 active building permits by postal code or street, with honest provenance on every record.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white text-[#0a0a0a]">
        {children}
      </body>
    </html>
  );
}
