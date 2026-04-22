import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Auto-entrepreneur",
  description: "Factures, encaissements et déclarations URSSAF — simplement.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Inter (closest free match to Notion's custom font) */}
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
