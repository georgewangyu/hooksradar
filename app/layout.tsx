import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hooksradar.snackoverflowgeorge.com"),
  title: "Hooks Radar",
  description:
    "A searchable catalog of reusable short-form video hook patterns.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Hooks Radar",
    description:
      "A searchable catalog of reusable short-form video hook patterns.",
    url: "https://hooksradar.snackoverflowgeorge.com",
    type: "website",
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
