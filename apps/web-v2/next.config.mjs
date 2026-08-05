/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next's file-tracing normally auto-detects fs.readFileSync() calls with a
  // literal path, but this makes it explicit so the bundled "Control Maestro
  // de Componentes" template (read by lib/component-export-template.ts) is
  // guaranteed to ship with the Vercel serverless function that exports it —
  // without this, the export route would 404/500 in production while
  // working fine locally.
  outputFileTracingIncludes: {
    "/helicopters/**": ["./data/templates/*.xlsx"]
  },
  // pdf-parse (used by lib/bulletin-verification.ts to read Robinson
  // bulletin PDFs) ships its own worker file and native-module fallbacks
  // that Next's default server bundling silently drops — the package's own
  // docs call this out explicitly for Vercel/serverless deployments. Without
  // this, the route works locally (plain `node`/`next dev` load the real
  // node_modules files directly) but crashes at import time once deployed,
  // producing Next's generic HTML error page instead of the route's JSON
  // response — exactly the "Unexpected token '<'" Adolfo hit.
  serverExternalPackages: ["pdf-parse"]
};

export default nextConfig;
