import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Student Evidence Upload | Criterion 4.7.2",
  description:
    "Upload supporting evidence for fixed student participation records.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
