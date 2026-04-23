import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asthia",
  description: "Factures, encaissements et déclarations URSSAF — simplement.",
  icons: {
    icon: [
      { url: "/logo.webp", type: "image/webp" },
    ],
    shortcut: "/logo.webp",
    apple: "/logo.webp",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Inter — match the Notion-esque typography. */}
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
