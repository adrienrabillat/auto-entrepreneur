/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
  // Force le bundling du profil ICC sRGB dans les serverless functions
  // Vercel — par défaut Next ne sait pas qu'on accède à ce binaire au
  // runtime via fs.readFileSync, donc il l'exclut du tracing. On le
  // déclare explicitement.
  outputFileTracingIncludes: {
    "/api/**": ["./lib/assets/sRGB.icc"],
    "/api/invoices/**": ["./lib/assets/sRGB.icc"],
    "/api/quotes/**": ["./lib/assets/sRGB.icc"],
  },
};

module.exports = nextConfig;
