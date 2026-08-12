import type { Metadata } from "next";
import { VT323 } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
});

export const metadata: Metadata = {
  title: "Kanban Board",
  description: "Kanban Board",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={vt323.variable}>
      <body className={vt323.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
