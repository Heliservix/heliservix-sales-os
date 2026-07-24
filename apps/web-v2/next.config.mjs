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
  }
};

export default nextConfig;
