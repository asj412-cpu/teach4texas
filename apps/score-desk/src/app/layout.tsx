import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Teach4Texas Score Desk",
  description: "Score STAAR ECR/SCR, RACE, and 4-level rubrics in one tap. Scores stay on this device.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
