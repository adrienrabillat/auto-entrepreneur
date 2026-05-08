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
  // Google Search Console — preuve de propriété d'asthia.fr.
  // Ajoute la balise <meta name="google-site-verification" content="..."> dans <head>.
  verification: {
    google: "7RigPVZvnQIFWSy0ZmsewuSxefizCv2fN3zzFXI-SU8",
  },
};

// Deux couleurs selon le thème : iOS ajuste la status bar dynamiquement
// si on déclare les deux medias.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F5F7" },
    { media: "(prefers-color-scheme: dark)",  color: "#0B0D12" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// Applique le thème ET l'accent choisis AVANT le render React pour éviter
// un flash au premier paint.
//  - ae-theme  : "dark" | "light" (défaut = préférence système)
//  - ae-accent : id d'accent (blue, purple, teal, rose, amber, slate)
const themeBootScript = `
(function(){try{
  var t=localStorage.getItem('ae-theme');
  if(!t){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
  if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}
  var a=localStorage.getItem('ae-accent');
  var VALID=['blue','purple','green','rose','orange','red'];
  if(a&&VALID.indexOf(a)>=0&&a!=='blue'){document.documentElement.setAttribute('data-accent',a);}
}catch(e){}})();
`;

// NOTE — Splash screen retiré le 8 mai 2026.
//
// L'ancien splash (logo Asthia + spinner) était injecté en SSR avant le
// montage React et masqué via un MutationObserver qui cherchait
// `document.getElementById('__next')`. Or App Router Next.js 13+ ne crée
// plus ce wrapper (c'était spécifique au Pages Router), donc le sélecteur
// matchait rarement et seul le fallback `setTimeout(..., 4000)` finissait
// par retirer le splash.
//
// Combiné au `Cache-Control: no-store, must-revalidate` du middleware
// (qui force des hard navigations), le splash se ré-injectait à chaque
// changement de page et restait 4 secondes avant de disparaître — d'où
// la sensation de "boucle infinie" obligeant à un Cmd+R.
//
// Décision : on retire complètement ce splash en attendant la review URSSAF.
// Si on veut le re-mettre plus tard, il faudra l'écrire avec un sélecteur
// App-Router-compatible (par ex. cibler `[data-app-mounted]` posé via un
// useEffect dans le RootLayout client).

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
