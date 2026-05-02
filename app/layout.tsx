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

// Écran de chargement initial — affiché AVANT React pour éviter un flash
// noir/blanc. Le conteneur est masqué dès que le body a des enfants React
// rendus (via un MutationObserver léger).
const splashScript = `
(function(){try{
  var el=document.getElementById('__splash');
  if(!el) return;
  var obs=new MutationObserver(function(){
    if(document.getElementById('__next')||document.querySelector('main')){
      el.style.opacity='0';
      setTimeout(function(){el.remove();},300);
      obs.disconnect();
    }
  });
  obs.observe(document.body,{childList:true,subtree:true});
  setTimeout(function(){if(el&&el.parentNode){el.style.opacity='0';setTimeout(function(){el.remove();},300);}},4000);
}catch(e){}})();
`;

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
        {/* Splash screen — visible pendant le chargement initial, disparaît
            quand React est monté. Couleur de fond = CSS variable (respecte
            le thème choisi). */}
        <div
          id="__splash"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "16px",
            background: "rgb(var(--c-bg, 244 245 247))",
            transition: "opacity 300ms ease",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192.png"
            alt="Asthia"
            width={56}
            height={56}
            style={{ borderRadius: "16px" }}
          />
          <div
            style={{
              width: "32px",
              height: "32px",
              border: "3px solid rgb(var(--c-ink-4, 194 198 208))",
              borderTopColor: "rgb(var(--c-accent, 47 107 255))",
              borderRadius: "50%",
              animation: "asthia-spin 0.7s linear infinite",
            }}
          />
          <style dangerouslySetInnerHTML={{ __html: "@keyframes asthia-spin { to { transform: rotate(360deg); } }" }} />
        </div>
        <script dangerouslySetInnerHTML={{ __html: splashScript }} />
        {children}
      </body>
    </html>
  );
}
