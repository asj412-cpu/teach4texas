import type { Metadata } from "next";
import "./globals.css";
import { productName } from "@/lib/brand";

export const metadata: Metadata = {
  title: productName,
  description:
    "Live classroom game shows for Texas teachers — project the board, students join with a code.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
