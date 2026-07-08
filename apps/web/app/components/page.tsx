import { execSync } from "node:child_process";
import { FleetOSClient } from "@/components/fleet/fleet-os-client";

const currentComponentPath = "/Users/adolfospinali/Documents/Codex/2026-07-07/github-plugin-github-openai-curated-remote/work/heliservix-sales-os/apps/web/app/components/page.tsx";

function gitValue(command: string) {
  try {
    return execSync(command, { cwd: process.cwd(), encoding: "utf8" }).trim();
  } catch {
    return "unavailable";
  }
}

export default function ComponentsPage() {
  const currentCommit = gitValue("git rev-parse --short HEAD");
  const currentBranch = gitValue("git rev-parse --abbrev-ref HEAD");
  const buildTime = new Date().toISOString();

  return (
    <>
      <section className="border-b border-aviation-amber/30 bg-aviation-amber/10 px-4 py-3 font-mono text-xs text-ink">
        <div className="mx-auto grid max-w-[1500px] gap-1">
          <p><span className="font-semibold">CURRENT COMPONENT</span> {currentComponentPath}</p>
          <p><span className="font-semibold">CURRENT COMMIT</span> {currentCommit}</p>
          <p><span className="font-semibold">CURRENT BRANCH</span> {currentBranch}</p>
          <p><span className="font-semibold">BUILD TIME</span> {buildTime}</p>
        </div>
      </section>
      <FleetOSClient view="components" />
    </>
  );
}
