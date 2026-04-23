import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asthia",
  description: "Factures, encaissements et déclarations URSSAF — simplement.",
  manifest: "/manifest.webmanifest",
  applicationName: "Asthia",
  appleWebApp: {
    capable: true,
    title: "Asthia",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icon-192.png",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  formatDetection: {
    telephone: false,
  },
};

// Fixe le thème iOS pour la barre de statut + empêche le zoom accidentel
// par pincement sur un formulaire (UX PWA typique).
export const viewport: Viewport = {
  themeColor: "#0F172A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Inter — match the Notion-esque typography. */}
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        {/* Balise iOS historique (support < iOS 15) en plus de l'API
            appleWebApp du metadata Next — ceinture + bretelles. */}
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}
