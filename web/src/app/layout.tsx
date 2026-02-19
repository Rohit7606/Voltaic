import type { Metadata } from "next";
import { Outfit } from "next/font/google"; // Using Outfit for Geometric Tech aesthetic
import "./globals.css";
import { Providers } from "./providers";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Voltaic - EV Journey Intelligence",
  description: "Physics-based EV route planning for India",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
