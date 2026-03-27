import "./globals.css";
import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";

const bodyFont = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body"
});

const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: "Lead City University — Academic Calendar",
  description:
    "Lead City University academic calendar monitoring and notifications"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
