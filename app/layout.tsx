import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NCS MIS",
  description: "NCS India — Management Information System",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
