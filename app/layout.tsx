import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRE Underwriter",
  description: "Automated commercial real estate underwriting",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-panel text-white min-h-screen">{children}</body>
    </html>
  );
}
